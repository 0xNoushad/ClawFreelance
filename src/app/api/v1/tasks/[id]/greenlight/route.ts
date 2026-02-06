import { and, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { db } from '@/db';
import { taskClaims, tasks } from '@/db/schema';
import { createAuditLog, logRateLimitExceeded } from '@/lib/audit';
import { authenticateRequest, validateBodySize, validateContentType } from '@/lib/auth';
import { checkRateLimit, getClientIdentifier, isIpBlocked } from '@/lib/security';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const greenlightSchema = z.object({
  claimId: z.string().uuid(),
});

/**
 * POST /api/v1/tasks/[id]/greenlight - Owner greenlights a claim (competitive mode only)
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

  // Validate body size (64KB max)
  const bodySizeCheck = validateBodySize(request.headers.get('content-length'), 64 * 1024);
  if (!bodySizeCheck.valid) {
    return NextResponse.json({ error: bodySizeCheck.error }, { status: 413 });
  }

  // Rate limiting (20 per minute for writes)
  const rateLimit = checkRateLimit(`${clientId}:write:greenlight`, {
    maxRequests: 20,
    windowMs: 60000,
  });

  if (!rateLimit.allowed) {
    logRateLimitExceeded(request, '/api/v1/tasks/:id/greenlight:POST', undefined);
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

    // Validate against schema
    const parsed = greenlightSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid greenlight data',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { claimId } = parsed.data;

    // Fetch the task
    const taskResult = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);

    if (taskResult.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const task = taskResult[0];

    // Verify the requester is the task owner
    if (task.ownerId !== authResult.agent.id) {
      return NextResponse.json(
        { error: 'Only the task owner can greenlight claims' },
        { status: 403 }
      );
    }

    // Verify task is competitive mode
    if (task.claimMode !== 'competitive') {
      return NextResponse.json(
        { error: 'Greenlight is only available for competitive mode tasks' },
        { status: 400 }
      );
    }

    // Fetch the claim
    const claimResult = await db
      .select()
      .from(taskClaims)
      .where(
        and(
          eq(taskClaims.id, claimId),
          eq(taskClaims.taskId, taskId),
          eq(taskClaims.status, 'active')
        )
      )
      .limit(1);

    if (claimResult.length === 0) {
      return NextResponse.json({ error: 'Active claim not found for this task' }, { status: 404 });
    }

    const claim = claimResult[0];

    // Check if already greenlighted
    if (claim.greenlighted) {
      return NextResponse.json({ error: 'Claim is already greenlighted' }, { status: 409 });
    }

    // Set greenlighted flag
    await db.update(taskClaims).set({ greenlighted: true }).where(eq(taskClaims.id, claimId));

    // Audit log
    createAuditLog(request, 'task.update', {
      actorId: authResult.agent.id,
      actorType: 'agent',
      resourceType: 'task',
      resourceId: taskId,
      success: true,
      metadata: {
        action: 'greenlight',
        claimId,
        agentId: claim.agentId,
      },
    });

    return NextResponse.json(
      {
        message: 'Claim greenlighted successfully',
        claimId,
      },
      {
        status: 200,
        headers: {
          'X-RateLimit-Remaining': String(rateLimit.remaining),
        },
      }
    );
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
}
