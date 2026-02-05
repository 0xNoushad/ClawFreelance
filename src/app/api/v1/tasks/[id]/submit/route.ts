import { and, eq, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { db } from '@/db';
import { agents, reputationEvents, taskClaims, taskSubmissions, tasks } from '@/db/schema';
import { createAuditLog, logRateLimitExceeded, logSecurityEvent } from '@/lib/audit';
import { authenticateRequest, validateBodySize, validateContentType } from '@/lib/auth';
import {
  checkRateLimit,
  detectInjection,
  getClientIdentifier,
  isIpBlocked,
  sanitizeInputStrict,
  sanitizeMarkdown,
} from '@/lib/security';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const GITHUB_PR_REGEX = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)\/?$/;
const GITHUB_COMMIT_REGEX =
  /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/commit\/([0-9a-f]{7,40})\/?$/;

const DIFFICULTY_POINTS: Record<string, number> = {
  easy: 10,
  medium: 25,
  hard: 50,
};

const submitWorkSchema = z.object({
  submissionUrl: z.string().url().max(2000),
  submissionNotes: z.string().max(10000).optional(),
  artifacts: z.record(z.string(), z.string().max(2000)).optional(),
});

interface GitHubPrResponse {
  merged: boolean;
  state: string;
  merged_at: string | null;
}

interface GitHubCheckRun {
  conclusion: string | null;
  status: string;
  name: string;
}

interface GitHubCheckRunsResponse {
  total_count: number;
  check_runs: GitHubCheckRun[];
}

/**
 * Fetch from GitHub API with optional auth token and timeout
 */
async function fetchGitHub(url: string): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'ClawFreelance/1.0',
  };

  const githubToken = process.env.GITHUB_TOKEN;
  if (githubToken) {
    headers.Authorization = `Bearer ${githubToken}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    return await fetch(url, { headers, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Verify a PR is merged via GitHub API
 */
async function verifyPrMerged(
  submissionUrl: string
): Promise<{ verified: boolean; result: Record<string, unknown> }> {
  const match = GITHUB_PR_REGEX.exec(submissionUrl);
  if (!match) {
    return {
      verified: false,
      result: {
        error: 'Invalid GitHub PR URL format',
        expected: 'https://github.com/{owner}/{repo}/pull/{number}',
      },
    };
  }

  const [, owner, repo, number] = match;

  try {
    const response = await fetchGitHub(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${number}`
    );

    if (!response.ok) {
      return {
        verified: false,
        result: { error: 'Failed to fetch PR from GitHub', status: response.status },
      };
    }

    const pr = (await response.json()) as GitHubPrResponse;

    return {
      verified: pr.merged === true,
      result: {
        merged: pr.merged,
        state: pr.state,
        mergedAt: pr.merged_at,
        prUrl: submissionUrl,
      },
    };
  } catch (error) {
    return {
      verified: false,
      result: {
        error: 'GitHub API request failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

/**
 * Check CI status for a specific commit
 */
async function checkCommitStatus(
  owner: string,
  repo: string,
  sha: string,
  submissionUrl: string
): Promise<{ verified: boolean; result: Record<string, unknown> }> {
  try {
    const response = await fetchGitHub(
      `https://api.github.com/repos/${owner}/${repo}/commits/${sha}/check-runs`
    );

    if (!response.ok) {
      return {
        verified: false,
        result: { error: 'Failed to fetch check runs from GitHub', status: response.status },
      };
    }

    const data = (await response.json()) as GitHubCheckRunsResponse;

    if (data.total_count === 0) {
      return {
        verified: false,
        result: { error: 'No check runs found for this commit', sha, submissionUrl },
      };
    }

    const allPassed = data.check_runs.every(
      (run) => run.status === 'completed' && run.conclusion === 'success'
    );

    return {
      verified: allPassed,
      result: {
        totalChecks: data.total_count,
        allPassed,
        checks: data.check_runs.map((run) => ({
          name: run.name,
          status: run.status,
          conclusion: run.conclusion,
        })),
        sha,
        submissionUrl,
      },
    };
  } catch (error) {
    return {
      verified: false,
      result: {
        error: 'GitHub API request failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

/**
 * Verify CI checks pass via GitHub API
 */
async function verifyTestsPass(
  submissionUrl: string
): Promise<{ verified: boolean; result: Record<string, unknown> }> {
  const commitMatch = GITHUB_COMMIT_REGEX.exec(submissionUrl);

  if (commitMatch) {
    const [, owner, repo, sha] = commitMatch;
    return await checkCommitStatus(owner, repo, sha, submissionUrl);
  }

  const prMatch = GITHUB_PR_REGEX.exec(submissionUrl);

  if (prMatch) {
    const [, owner, repo, number] = prMatch;

    try {
      const prResponse = await fetchGitHub(
        `https://api.github.com/repos/${owner}/${repo}/pulls/${number}`
      );

      if (!prResponse.ok) {
        return {
          verified: false,
          result: { error: 'Failed to fetch PR from GitHub', status: prResponse.status },
        };
      }

      const pr = (await prResponse.json()) as { head: { sha: string } };
      return await checkCommitStatus(owner, repo, pr.head.sha, submissionUrl);
    } catch (error) {
      return {
        verified: false,
        result: {
          error: 'GitHub API request failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  return {
    verified: false,
    result: {
      error: 'Invalid URL format for tests_pass verification',
      expected: 'GitHub PR URL or commit URL',
    },
  };
}

/**
 * Award reputation points and update agent score
 */
async function awardReputation(
  agentId: string,
  taskId: string,
  difficulty: string,
  reason: string
): Promise<void> {
  const points = DIFFICULTY_POINTS[difficulty] ?? 10;

  await db.insert(reputationEvents).values({
    agentId,
    taskId,
    eventType: 'task_completed',
    pointsDelta: points,
    reason,
  });

  await db
    .update(agents)
    .set({
      reputationScore: sql`${agents.reputationScore} + ${points}`,
      updatedAt: new Date(),
    })
    .where(eq(agents.id, agentId));
}

/**
 * POST /api/v1/tasks/[id]/submit - Submit work for a claimed task
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const clientId = getClientIdentifier(request);

  // Check if IP is blocked
  if (isIpBlocked(clientId)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Validate content type
  const contentTypeCheck = validateContentType(request);
  if (!contentTypeCheck.valid) {
    return NextResponse.json({ error: contentTypeCheck.error }, { status: 415 });
  }

  // Validate body size (1MB max)
  const bodySizeCheck = validateBodySize(request.headers.get('content-length'), 1024 * 1024);
  if (!bodySizeCheck.valid) {
    return NextResponse.json({ error: bodySizeCheck.error }, { status: 413 });
  }

  // Rate limiting (5 per minute for writes)
  const rateLimit = checkRateLimit(`${clientId}:write:submit`, {
    maxRequests: 5,
    windowMs: 60000,
  });

  if (!rateLimit.allowed) {
    logRateLimitExceeded(request, '/api/v1/tasks/:id/submit:POST', undefined);
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(rateLimit.resetAt),
        },
      }
    );
  }

  // Authenticate request
  const authResult = await authenticateRequest(request);
  if (!authResult.authenticated || !authResult.agent) {
    createAuditLog(request, 'auth.failure', {
      resourceType: 'task',
      success: false,
      errorMessage: authResult.error,
    });
    return NextResponse.json(
      { error: authResult.error || 'Authentication required' },
      { status: 401 }
    );
  }

  const { id: taskId } = await params;

  // Validate UUID format
  if (!UUID_REGEX.test(taskId)) {
    return NextResponse.json({ error: 'Invalid task ID format' }, { status: 400 });
  }

  try {
    const body = await request.json();

    // Sanitize inputs
    if (body.submissionUrl) body.submissionUrl = sanitizeInputStrict(body.submissionUrl);
    if (body.submissionNotes) body.submissionNotes = sanitizeMarkdown(body.submissionNotes);

    // Check for injection in text fields
    const fieldsToCheck: Array<[string, string]> = [];
    if (body.submissionUrl) fieldsToCheck.push(['submissionUrl', body.submissionUrl]);
    if (body.submissionNotes) fieldsToCheck.push(['submissionNotes', body.submissionNotes]);

    // Check artifacts values for injection
    if (body.artifacts && typeof body.artifacts === 'object') {
      for (const [key, value] of Object.entries(body.artifacts)) {
        if (typeof value === 'string') {
          fieldsToCheck.push([`artifacts.${key}`, value]);
        }
      }
    }

    for (const [fieldName, fieldValue] of fieldsToCheck) {
      const injection = detectInjection(fieldValue);
      if (injection.detected) {
        logSecurityEvent(
          request,
          'suspicious_activity',
          `Injection attempt in submission field: ${fieldName}`,
          {
            types: injection.types,
            agentId: authResult.agent.id,
          }
        );
        return NextResponse.json({ error: 'Invalid content detected' }, { status: 400 });
      }
    }

    // Validate against schema
    const parsed = submitWorkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid submission data',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const submissionData = parsed.data;

    // Fetch the task
    const taskResult = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);

    if (taskResult.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const task = taskResult[0];

    // Validate agent has an active claim on this task
    const claimResult = await db
      .select()
      .from(taskClaims)
      .where(
        and(
          eq(taskClaims.taskId, taskId),
          eq(taskClaims.agentId, authResult.agent.id),
          eq(taskClaims.status, 'active')
        )
      )
      .limit(1);

    if (claimResult.length === 0) {
      return NextResponse.json(
        { error: 'You do not have an active claim on this task' },
        { status: 403 }
      );
    }

    const claim = claimResult[0];

    // Run verification based on method
    let verificationStatus: 'pending' | 'auto_verified' = 'pending';
    let verificationResult: Record<string, unknown> = {};

    switch (task.verificationMethod) {
      case 'owner_approval': {
        verificationStatus = 'pending';
        verificationResult = { method: 'owner_approval', awaitingReview: true };
        break;
      }

      case 'pr_merged': {
        const prResult = await verifyPrMerged(submissionData.submissionUrl);
        verificationResult = prResult.result;
        verificationStatus = prResult.verified ? 'auto_verified' : 'pending';
        break;
      }

      case 'tests_pass': {
        const testsResult = await verifyTestsPass(submissionData.submissionUrl);
        verificationResult = testsResult.result;
        verificationStatus = testsResult.verified ? 'auto_verified' : 'pending';
        break;
      }

      case 'peer_review': {
        verificationStatus = 'pending';
        verificationResult = {
          method: 'peer_review',
          reviews: [],
          threshold: 3,
          approvalCount: 0,
        };
        break;
      }
    }

    // Create submission record
    const [newSubmission] = await db
      .insert(taskSubmissions)
      .values({
        claimId: claim.id,
        taskId,
        agentId: authResult.agent.id,
        submissionUrl: submissionData.submissionUrl,
        submissionNotes: submissionData.submissionNotes,
        artifacts: submissionData.artifacts ?? {},
        verificationMethod: task.verificationMethod,
        verificationStatus,
        verificationResult,
      })
      .returning();

    // If auto-verified, complete the task workflow
    if (verificationStatus === 'auto_verified') {
      // Update claim status to completed
      await db
        .update(taskClaims)
        .set({ status: 'completed', completedAt: new Date() })
        .where(eq(taskClaims.id, claim.id));

      // Update task status based on claim mode
      if (task.claimMode === 'exclusive') {
        await db
          .update(tasks)
          .set({ status: 'completed', updatedAt: new Date() })
          .where(eq(tasks.id, taskId));
      }
      // For competitive mode, task stays open/claimed for other claimants

      // Award reputation
      await awardReputation(
        authResult.agent.id,
        taskId,
        task.difficulty,
        `Auto-verified submission for task: ${task.title}`
      );
    } else {
      // Set task to verification status
      await db
        .update(tasks)
        .set({ status: 'verification', updatedAt: new Date() })
        .where(eq(tasks.id, taskId));
    }

    // Audit log
    createAuditLog(request, 'task.submit', {
      actorId: authResult.agent.id,
      actorType: 'agent',
      resourceType: 'task',
      resourceId: taskId,
      success: true,
      metadata: {
        submissionId: newSubmission.id,
        claimId: claim.id,
        verificationMethod: task.verificationMethod,
        verificationStatus,
        autoVerified: verificationStatus === 'auto_verified',
      },
    });

    return NextResponse.json(
      {
        message:
          verificationStatus === 'auto_verified'
            ? 'Submission auto-verified and task completed'
            : 'Submission received and pending verification',
        submission: newSubmission,
        verificationStatus,
      },
      {
        status: 201,
        headers: {
          'X-RateLimit-Remaining': String(rateLimit.remaining),
        },
      }
    );
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
}
