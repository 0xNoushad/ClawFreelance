import { and, eq, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/db';
import { agents, reputationEvents, taskClaims, tasks } from '@/db/schema';
import { createAuditLog, logRateLimitExceeded } from '@/lib/audit';
import { authenticateRequest, validateContentType } from '@/lib/auth';
import { checkRateLimit, getClientIdentifier, isIpBlocked } from '@/lib/security';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/v1/tasks/[id]/abandon - Abandon a claimed task
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

  // Rate limiting (10 per minute for writes)
  const rateLimit = checkRateLimit(`${clientId}:write:abandon`, {
    maxRequests: 10,
    windowMs: 60000,
  });

  if (!rateLimit.allowed) {
    logRateLimitExceeded(request, '/api/v1/tasks/:id/abandon:POST', undefined);
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

    // Set claim status to abandoned
    await db.update(taskClaims).set({ status: 'abandoned' }).where(eq(taskClaims.id, claim.id));

    // Update task status based on claim mode
    if (task.claimMode === 'exclusive') {
      // Exclusive mode: reopen the task
      await db
        .update(tasks)
        .set({ status: 'open', updatedAt: new Date() })
        .where(eq(tasks.id, taskId));
    } else {
      // Competitive mode: only reopen if no other active claims remain
      const remainingClaims = await db
        .select({ count: sql<number>`count(*)` })
        .from(taskClaims)
        .where(and(eq(taskClaims.taskId, taskId), eq(taskClaims.status, 'active')));

      const remainingCount = Number(remainingClaims[0]?.count || 0);

      if (remainingCount === 0) {
        await db
          .update(tasks)
          .set({ status: 'open', updatedAt: new Date() })
          .where(eq(tasks.id, taskId));
      }
    }

    // Create reputation event (-5 points for abandonment)
    await db.insert(reputationEvents).values({
      agentId: authResult.agent.id,
      taskId,
      eventType: 'task_failed',
      pointsDelta: -5,
      reason: `Abandoned task: ${task.title}`,
    });

    // Update agent reputation score (floor at 0)
    await db
      .update(agents)
      .set({
        reputationScore: sql`GREATEST(${agents.reputationScore} - 5, 0)`,
        updatedAt: new Date(),
      })
      .where(eq(agents.id, authResult.agent.id));

    // Audit log
    createAuditLog(request, 'task.unclaim', {
      actorId: authResult.agent.id,
      actorType: 'agent',
      resourceType: 'task',
      resourceId: taskId,
      success: true,
      metadata: {
        claimId: claim.id,
        claimMode: task.claimMode,
        reputationPenalty: -5,
      },
    });

    return NextResponse.json(
      {
        message: 'Task claim abandoned successfully',
        claimId: claim.id,
        reputationPenalty: -5,
      },
      {
        status: 200,
        headers: {
          'X-RateLimit-Remaining': String(rateLimit.remaining),
        },
      }
    );
  } catch (error) {
    console.error('[tasks/[id]/abandon] Error:', error);
    return NextResponse.json({ error: 'Failed to abandon task claim' }, { status: 500 });
  }
}
