import { eq, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/db';
import { agents, taskClaims, tasks,taskSubmissions } from '@/db/schema';
import { logRateLimitExceeded } from '@/lib/audit';
import { checkRateLimit, getClientIdentifier, isIpBlocked } from '@/lib/security';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/v1/tasks/[id]/claims - List claims for a task (public)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const clientId = getClientIdentifier(request);

  // Check if IP is blocked
  if (isIpBlocked(clientId)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Rate limiting (100 per minute for reads)
  const rateLimit = checkRateLimit(clientId, { maxRequests: 100, windowMs: 60000 });

  if (!rateLimit.allowed) {
    logRateLimitExceeded(request, '/api/v1/tasks/:id/claims:GET', undefined);
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

  const { id: taskId } = await params;

  // Validate UUID format
  if (!UUID_REGEX.test(taskId)) {
    return NextResponse.json({ error: 'Invalid task ID format' }, { status: 400 });
  }

  try {
    // Verify task exists
    const taskResult = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);

    if (taskResult.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const task = taskResult[0];

    // Don't expose claims for private tasks
    if (task.visibility === 'private') {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Fetch claims with agent display name
    const claimsWithAgents = await db
      .select({
        id: taskClaims.id,
        taskId: taskClaims.taskId,
        agentId: taskClaims.agentId,
        status: taskClaims.status,
        proposal: taskClaims.proposal,
        greenlighted: taskClaims.greenlighted,
        claimedAt: taskClaims.claimedAt,
        completedAt: taskClaims.completedAt,
        agentDisplayName: agents.displayName,
      })
      .from(taskClaims)
      .innerJoin(agents, eq(taskClaims.agentId, agents.id))
      .where(eq(taskClaims.taskId, taskId))
      .orderBy(taskClaims.claimedAt);

    // Get submission counts per claim
    const submissionCounts = await db
      .select({
        claimId: taskSubmissions.claimId,
        count: sql<number>`count(*)`,
      })
      .from(taskSubmissions)
      .where(eq(taskSubmissions.taskId, taskId))
      .groupBy(taskSubmissions.claimId);

    // Build a map of claim ID to submission count
    const countMap = new Map<string, number>();
    for (const row of submissionCounts) {
      countMap.set(row.claimId, Number(row.count));
    }

    // Combine claims with submission counts
    const claimsResponse = claimsWithAgents.map((claim) => ({
      ...claim,
      submissionCount: countMap.get(claim.id) ?? 0,
    }));

    return NextResponse.json(
      {
        claims: claimsResponse,
        total: claimsResponse.length,
      },
      {
        headers: {
          'X-RateLimit-Remaining': String(rateLimit.remaining),
          'Cache-Control': 'public, max-age=30',
        },
      }
    );
  } catch (error) {
    console.error('[tasks/[id]/claims] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch claims' },
      { status: 500 }
    );
  }
}
