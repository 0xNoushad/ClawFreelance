import { and, eq, ne, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { db } from '@/db';
import { agents, reputationEvents, taskClaims, tasks, taskSubmissions } from '@/db/schema';
import { createAuditLog, logRateLimitExceeded, logSecurityEvent } from '@/lib/audit';
import { authenticateRequest, validateBodySize, validateContentType } from '@/lib/auth';
import {
  checkRateLimit,
  detectInjection,
  getClientIdentifier,
  isIpBlocked,
  sanitizeMarkdown,
} from '@/lib/security';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DIFFICULTY_POINTS: Record<string, number> = {
  easy: 10,
  medium: 25,
  hard: 50,
};

const reviewSubmissionSchema = z.object({
  submissionId: z.string().uuid(),
  decision: z.enum(['approved', 'rejected']),
  feedback: z.string().max(5000).optional(),
});

type TaskRow = typeof tasks.$inferSelect;
type SubmissionRow = typeof taskSubmissions.$inferSelect;

async function handleApproval(
  request: NextRequest,
  task: TaskRow,
  submission: SubmissionRow,
  reviewerId: string,
  feedback: string | undefined,
  rateLimit: { remaining: number }
) {
  await db
    .update(taskSubmissions)
    .set({
      verificationStatus: 'approved',
      verificationResult: {
        ...(submission.verificationResult as Record<string, unknown>),
        decision: 'approved',
        feedback,
        reviewedAt: new Date().toISOString(),
      },
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(taskSubmissions.id, submission.id));

  await db
    .update(taskClaims)
    .set({ status: 'completed', completedAt: new Date() })
    .where(eq(taskClaims.id, submission.claimId));

  // Complete task; in competitive mode also reject other active claims
  await db
    .update(tasks)
    .set({ status: 'completed', updatedAt: new Date() })
    .where(eq(tasks.id, task.id));

  if (task.claimMode === 'competitive') {
    await db
      .update(taskClaims)
      .set({ status: 'rejected' })
      .where(
        and(
          eq(taskClaims.taskId, task.id),
          eq(taskClaims.status, 'active'),
          ne(taskClaims.id, submission.claimId)
        )
      );
  }

  const points = DIFFICULTY_POINTS[task.difficulty] ?? 10;

  await db.insert(reputationEvents).values({
    agentId: submission.agentId,
    taskId: task.id,
    eventType: 'task_completed',
    pointsDelta: points,
    reason: `Task approved by owner: ${task.title}`,
  });

  await db
    .update(agents)
    .set({
      reputationScore: sql`${agents.reputationScore} + ${points}`,
      updatedAt: new Date(),
    })
    .where(eq(agents.id, submission.agentId));

  createAuditLog(request, 'task.verify', {
    actorId: reviewerId,
    actorType: 'agent',
    resourceType: 'task',
    resourceId: task.id,
    success: true,
    metadata: {
      submissionId: submission.id,
      decision: 'approved',
      agentId: submission.agentId,
      reputationAwarded: points,
      claimMode: task.claimMode,
    },
  });

  return NextResponse.json(
    {
      message: 'Submission approved successfully',
      submissionId: submission.id,
      decision: 'approved',
      reputationAwarded: points,
    },
    { status: 200, headers: { 'X-RateLimit-Remaining': String(rateLimit.remaining) } }
  );
}

async function handleRejection(
  request: NextRequest,
  task: TaskRow,
  submission: SubmissionRow,
  reviewerId: string,
  feedback: string | undefined,
  rateLimit: { remaining: number }
) {
  await db
    .update(taskSubmissions)
    .set({
      verificationStatus: 'rejected',
      verificationResult: {
        ...(submission.verificationResult as Record<string, unknown>),
        decision: 'rejected',
        feedback,
        reviewedAt: new Date().toISOString(),
      },
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(taskSubmissions.id, submission.id));

  await db
    .update(tasks)
    .set({ status: 'claimed', updatedAt: new Date() })
    .where(eq(tasks.id, task.id));

  createAuditLog(request, 'task.verify', {
    actorId: reviewerId,
    actorType: 'agent',
    resourceType: 'task',
    resourceId: task.id,
    success: true,
    metadata: {
      submissionId: submission.id,
      decision: 'rejected',
      agentId: submission.agentId,
      hasFeedback: !!feedback,
    },
  });

  return NextResponse.json(
    {
      message: 'Submission rejected. Agent may resubmit.',
      submissionId: submission.id,
      decision: 'rejected',
      feedback,
    },
    { status: 200, headers: { 'X-RateLimit-Remaining': String(rateLimit.remaining) } }
  );
}

/**
 * POST /api/v1/tasks/[id]/review - Owner reviews a submission
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const clientId = getClientIdentifier(request);

  if (isIpBlocked(clientId)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const contentTypeCheck = validateContentType(request);
  if (!contentTypeCheck.valid) {
    return NextResponse.json({ error: contentTypeCheck.error }, { status: 415 });
  }

  const bodySizeCheck = validateBodySize(request.headers.get('content-length'), 256 * 1024);
  if (!bodySizeCheck.valid) {
    return NextResponse.json({ error: bodySizeCheck.error }, { status: 413 });
  }

  const rateLimit = checkRateLimit(`${clientId}:write:review`, {
    maxRequests: 20,
    windowMs: 60000,
  });

  if (!rateLimit.allowed) {
    logRateLimitExceeded(request, '/api/v1/tasks/:id/review:POST', undefined);
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

  if (!UUID_REGEX.test(taskId)) {
    return NextResponse.json({ error: 'Invalid task ID format' }, { status: 400 });
  }

  try {
    const body = await request.json();

    if (body.feedback) {
      body.feedback = sanitizeMarkdown(body.feedback);
      const feedbackInjection = detectInjection(body.feedback);
      if (feedbackInjection.detected) {
        logSecurityEvent(request, 'suspicious_activity', 'Injection attempt in review feedback', {
          types: feedbackInjection.types,
          agentId: authResult.agent.id,
        });
        return NextResponse.json({ error: 'Invalid content detected' }, { status: 400 });
      }
    }

    const parsed = reviewSubmissionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid review data', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const reviewData = parsed.data;

    const taskResult = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
    if (taskResult.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    const task = taskResult[0];

    if (task.ownerId !== authResult.agent.id) {
      return NextResponse.json(
        { error: 'Only the task owner can review submissions' },
        { status: 403 }
      );
    }

    const submissionResult = await db
      .select()
      .from(taskSubmissions)
      .where(
        and(eq(taskSubmissions.id, reviewData.submissionId), eq(taskSubmissions.taskId, taskId))
      )
      .limit(1);

    if (submissionResult.length === 0) {
      return NextResponse.json({ error: 'Submission not found for this task' }, { status: 404 });
    }
    const submission = submissionResult[0];

    if (submission.verificationStatus !== 'pending') {
      return NextResponse.json(
        { error: 'Submission has already been reviewed', currentStatus: submission.verificationStatus },
        { status: 409 }
      );
    }

    if (reviewData.decision === 'approved') {
      return handleApproval(request, task, submission, authResult.agent.id, reviewData.feedback, rateLimit);
    }
    return handleRejection(request, task, submission, authResult.agent.id, reviewData.feedback, rateLimit);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
}
