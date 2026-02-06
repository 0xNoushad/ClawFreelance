import { and, eq, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { db } from '@/db';
import { taskClaims, tasks } from '@/db/schema';
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

const claimTaskSchema = z.object({
  proposal: z.string().max(5000).optional(),
});

/**
 * POST /api/v1/tasks/[id]/claim - Claim a task
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  // Validate body size (256KB max)
  const bodySizeCheck = validateBodySize(request.headers.get('content-length'), 256 * 1024);
  if (!bodySizeCheck.valid) {
    return NextResponse.json({ error: bodySizeCheck.error }, { status: 413 });
  }

  // Rate limiting (10 per minute for writes)
  const rateLimit = checkRateLimit(`${clientId}:write:claim`, { maxRequests: 10, windowMs: 60000 });

  if (!rateLimit.allowed) {
    logRateLimitExceeded(request, '/api/v1/tasks/:id/claim:POST', undefined);
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

    // Sanitize proposal text if provided
    if (body.proposal) {
      body.proposal = sanitizeMarkdown(body.proposal);

      const proposalInjection = detectInjection(body.proposal);
      if (proposalInjection.detected) {
        logSecurityEvent(request, 'suspicious_activity', 'Injection attempt in claim proposal', {
          types: proposalInjection.types,
          agentId: authResult.agent.id,
        });
        return NextResponse.json({ error: 'Invalid content detected' }, { status: 400 });
      }
    }

    // Validate against schema
    const parsed = claimTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid claim data',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const claimData = parsed.data;

    // Fetch the task
    const taskResult = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);

    if (taskResult.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const task = taskResult[0];

    // Validate task is claimable
    if (
      task.status !== 'open' &&
      !(task.claimMode === 'competitive' && task.status === 'claimed')
    ) {
      return NextResponse.json(
        { error: 'Task is not available for claiming', taskStatus: task.status },
        { status: 409 }
      );
    }

    // Check if agent already has an active claim on this task
    const existingClaim = await db
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

    if (existingClaim.length > 0) {
      return NextResponse.json(
        { error: 'You already have an active claim on this task' },
        { status: 409 }
      );
    }

    // Check claim mode constraints
    if (task.claimMode === 'exclusive') {
      // Exclusive: fail if any active claim exists
      const activeClaims = await db
        .select({ count: sql<number>`count(*)` })
        .from(taskClaims)
        .where(and(eq(taskClaims.taskId, taskId), eq(taskClaims.status, 'active')));

      const activeCount = Number(activeClaims[0]?.count || 0);

      if (activeCount > 0) {
        return NextResponse.json(
          { error: 'Task has already been claimed (exclusive mode)' },
          { status: 409 }
        );
      }
    } else if (task.claimMode === 'competitive') {
      // Competitive: fail if active claims >= maxClaims (when maxClaims is set)
      if (task.maxClaims !== null) {
        const activeClaims = await db
          .select({ count: sql<number>`count(*)` })
          .from(taskClaims)
          .where(and(eq(taskClaims.taskId, taskId), eq(taskClaims.status, 'active')));

        const activeCount = Number(activeClaims[0]?.count || 0);

        if (activeCount >= task.maxClaims) {
          return NextResponse.json(
            { error: 'Maximum number of claims reached for this task' },
            { status: 409 }
          );
        }
      }
    }

    // Create the claim
    const [newClaim] = await db
      .insert(taskClaims)
      .values({
        taskId,
        agentId: authResult.agent.id,
        status: 'active',
        proposal: claimData.proposal,
      })
      .returning();

    // Update task status for exclusive mode
    if (task.claimMode === 'exclusive') {
      await db
        .update(tasks)
        .set({ status: 'claimed', updatedAt: new Date() })
        .where(eq(tasks.id, taskId));
    } else if (task.status === 'open') {
      // For competitive, set to 'claimed' if it was 'open'
      await db
        .update(tasks)
        .set({ status: 'claimed', updatedAt: new Date() })
        .where(eq(tasks.id, taskId));
    }

    // Audit log
    createAuditLog(request, 'task.claim', {
      actorId: authResult.agent.id,
      actorType: 'agent',
      resourceType: 'task',
      resourceId: taskId,
      success: true,
      metadata: {
        claimId: newClaim.id,
        claimMode: task.claimMode,
        hasProposal: !!claimData.proposal,
      },
    });

    return NextResponse.json(
      {
        message: 'Task claimed successfully',
        claim: newClaim,
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
