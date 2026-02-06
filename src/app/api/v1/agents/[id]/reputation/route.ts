import { desc, eq, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { db } from '@/db';
import { agents, reputationEvents, taskClaims, tasks } from '@/db/schema';
import { logRateLimitExceeded, logSecurityEvent } from '@/lib/audit';
import { checkRateLimit, detectInjection, getClientIdentifier, isIpBlocked } from '@/lib/security';

// UUID validation regex
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Query params schema for pagination
const reputationQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

/**
 * Badge definitions and their computation logic
 */
interface Badge {
  id: string;
  name: string;
  description: string;
  earnedAt?: string;
}

/**
 * Compute badges from agent history and stats
 */
function computeBadges(
  completedCount: number,
  successRate: number,
  hasDisputeLost: boolean,
  peerReviewCount: number,
  capabilityCompletions: Record<string, number>,
  earliestCompletion: Date | null
): Badge[] {
  const badges: Badge[] = [];

  // "first_task" badge: completed >= 1 task
  if (completedCount >= 1) {
    badges.push({
      id: 'first_task',
      name: 'First Task',
      description: 'Completed your first task',
      earnedAt: earliestCompletion?.toISOString(),
    });
  }

  // "reliable" badge: completed >= 10 tasks AND successRate > 90%
  if (completedCount >= 10 && successRate > 90) {
    badges.push({
      id: 'reliable',
      name: 'Reliable',
      description: 'Completed 10+ tasks with over 90% success rate',
    });
  }

  // "veteran" badge: completed >= 50 tasks
  if (completedCount >= 50) {
    badges.push({
      id: 'veteran',
      name: 'Veteran',
      description: 'Completed 50+ tasks on the platform',
    });
  }

  // "specialist_{capability}" badges: 5+ completed tasks with that capability
  for (const [capability, count] of Object.entries(capabilityCompletions)) {
    if (count >= 5) {
      badges.push({
        id: `specialist_${capability}`,
        name: `${capability.charAt(0).toUpperCase()}${capability.slice(1)} Specialist`,
        description: `Completed 5+ tasks requiring ${capability}`,
      });
    }
  }

  // "zero_disputes" badge: never had a dispute_lost event
  if (completedCount >= 1 && !hasDisputeLost) {
    badges.push({
      id: 'zero_disputes',
      name: 'Zero Disputes',
      description: 'Never lost a dispute',
    });
  }

  // "peer_reviewer" badge: 10+ peer_review reputation events
  if (peerReviewCount >= 10) {
    badges.push({
      id: 'peer_reviewer',
      name: 'Peer Reviewer',
      description: 'Contributed 10+ peer reviews',
    });
  }

  return badges;
}

/**
 * GET /api/v1/agents/[id]/reputation - Get reputation history and badges
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const clientId = getClientIdentifier(request);

  // Check if IP is blocked
  if (isIpBlocked(clientId)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Rate limiting
  const rateLimit = checkRateLimit(clientId, { maxRequests: 100, windowMs: 60000 });

  if (!rateLimit.allowed) {
    logRateLimitExceeded(request, '/api/v1/agents/[id]/reputation', undefined);
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
        },
      }
    );
  }

  const { id } = await params;

  // Validate UUID format
  if (!uuidRegex.test(id)) {
    return NextResponse.json({ error: 'Invalid agent ID format' }, { status: 400 });
  }

  // Parse query params
  const { searchParams } = new URL(request.url);
  const queryParams = Object.fromEntries(searchParams.entries());

  // Check for injection in query parameters
  for (const [key, value] of Object.entries(queryParams)) {
    const injection = detectInjection(value);
    if (injection.detected) {
      logSecurityEvent(request, 'suspicious_activity', `Injection attempt in query param: ${key}`, {
        types: injection.types,
      });
      return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
    }
  }

  const parsed = reputationQuerySchema.safeParse(queryParams);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid query parameters',
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { limit, offset } = parsed.data;

  try {
    // Verify agent exists and get current score
    const agentResult = await db.select().from(agents).where(eq(agents.id, id)).limit(1);

    if (agentResult.length === 0) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const agent = agentResult[0];

    // Get total count of reputation events
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(reputationEvents)
      .where(eq(reputationEvents.agentId, id));
    const totalEvents = Number(countResult[0]?.count || 0);

    // Get paginated reputation history
    const history = await db
      .select({
        id: reputationEvents.id,
        eventType: reputationEvents.eventType,
        pointsDelta: reputationEvents.pointsDelta,
        reason: reputationEvents.reason,
        taskId: reputationEvents.taskId,
        createdAt: reputationEvents.createdAt,
      })
      .from(reputationEvents)
      .where(eq(reputationEvents.agentId, id))
      .orderBy(desc(reputationEvents.createdAt))
      .limit(limit)
      .offset(offset);

    // Get timeline: aggregate reputation score by day
    // Uses a running sum approach over daily deltas
    const timeline = await db
      .select({
        date: sql<string>`date_trunc('day', ${reputationEvents.createdAt})::date::text`,
        dailyDelta: sql<number>`sum(${reputationEvents.pointsDelta})`,
      })
      .from(reputationEvents)
      .where(eq(reputationEvents.agentId, id))
      .groupBy(sql`date_trunc('day', ${reputationEvents.createdAt})`)
      .orderBy(sql`date_trunc('day', ${reputationEvents.createdAt}) ASC`);

    // Compute cumulative score for timeline
    let runningScore = 0;
    const timelineWithScore = timeline.map((entry) => {
      runningScore += Number(entry.dailyDelta || 0);
      return {
        date: entry.date,
        score: runningScore,
      };
    });

    // Compute badge data
    // 1. Completed task count and success rate
    const claimStats = await db
      .select({
        completed: sql<number>`count(*) FILTER (WHERE ${taskClaims.status} = 'completed')`,
        abandoned: sql<number>`count(*) FILTER (WHERE ${taskClaims.status} = 'abandoned')`,
        rejected: sql<number>`count(*) FILTER (WHERE ${taskClaims.status} = 'rejected')`,
        earliestCompletion: sql<string>`min(${taskClaims.completedAt})`,
      })
      .from(taskClaims)
      .where(eq(taskClaims.agentId, id));

    const completedCount = Number(claimStats[0]?.completed || 0);
    const abandonedCount = Number(claimStats[0]?.abandoned || 0);
    const rejectedCount = Number(claimStats[0]?.rejected || 0);
    const totalResolved = completedCount + abandonedCount + rejectedCount;
    const successRate =
      totalResolved > 0 ? Math.round((completedCount / totalResolved) * 1000) / 10 : 0;
    const earliestCompletion = claimStats[0]?.earliestCompletion
      ? new Date(claimStats[0].earliestCompletion)
      : null;

    // 2. Check for dispute_lost events
    const disputeLostResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(reputationEvents)
      .where(
        sql`${reputationEvents.agentId} = ${id} AND ${reputationEvents.eventType} = 'dispute_lost'`
      );
    const hasDisputeLost = Number(disputeLostResult[0]?.count || 0) > 0;

    // 3. Count peer_review events
    const peerReviewResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(reputationEvents)
      .where(
        sql`${reputationEvents.agentId} = ${id} AND ${reputationEvents.eventType} = 'peer_review'`
      );
    const peerReviewCount = Number(peerReviewResult[0]?.count || 0);

    // 4. Capability-specific completions: count completed tasks per capability
    // Get all completed task IDs for this agent
    const completedClaims = await db
      .select({
        taskId: taskClaims.taskId,
      })
      .from(taskClaims)
      .where(sql`${taskClaims.agentId} = ${id} AND ${taskClaims.status} = 'completed'`);

    const capabilityCompletions: Record<string, number> = {};

    if (completedClaims.length > 0) {
      const completedTaskIds = completedClaims.map((c) => c.taskId);

      // Get tasks with their requirements
      const completedTasks = await db
        .select({
          id: tasks.id,
          requirements: tasks.requirements,
        })
        .from(tasks)
        .where(
          sql`${tasks.id} IN (${sql.join(
            completedTaskIds.map((tid) => sql`${tid}`),
            sql`, `
          )})`
        );

      for (const task of completedTasks) {
        const requirements = (task.requirements || []) as string[];
        for (const req of requirements) {
          const normalizedReq = req.toLowerCase();
          capabilityCompletions[normalizedReq] = (capabilityCompletions[normalizedReq] || 0) + 1;
        }
      }
    }

    const badges = computeBadges(
      completedCount,
      successRate,
      hasDisputeLost,
      peerReviewCount,
      capabilityCompletions,
      earliestCompletion
    );

    return NextResponse.json(
      {
        currentScore: agent.reputationScore,
        history,
        pagination: {
          total: totalEvents,
          limit,
          offset,
          hasMore: offset + limit < totalEvents,
        },
        timeline: timelineWithScore,
        badges,
      },
      {
        headers: {
          'X-RateLimit-Remaining': String(rateLimit.remaining),
          'Cache-Control': 'public, max-age=120',
        },
      }
    );
  } catch (error) {
    console.error('[agents/[id]/reputation] Error fetching reputation:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch reputation data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
