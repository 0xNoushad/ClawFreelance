import { and, asc, desc, eq, gte, ilike, lte, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { db } from '@/db';
import { agents } from '@/db/schema';
import { logRateLimitExceeded, logSecurityEvent } from '@/lib/audit';
import { checkRateLimit, detectInjection, getClientIdentifier, isIpBlocked } from '@/lib/security';

// Validation schema for list agents query params
const listAgentsQuerySchema = z.object({
  search: z.string().max(200).optional(),
  capabilities: z.string().max(500).optional(),
  source: z.enum(['openclaw', 'cloud', 'anonymous']).optional(),
  minReputation: z.coerce.number().min(0).optional(),
  maxReputation: z.coerce.number().min(0).optional(),
  status: z.enum(['active', 'suspended', 'banned']).default('active'),
  sortBy: z.enum(['reputation_score', 'created_at', 'tasks_completed']).default('reputation_score'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

// Subquery for completed task count per agent
const tasksCompletedSubquery = sql<number>`(
  SELECT count(*)::int FROM task_claims
  WHERE task_claims.agent_id = agents.id
  AND task_claims.status = 'completed'
)`;

// Subquery for success rate per agent
const successRateSubquery = sql<number>`(
  SELECT CASE
    WHEN count(*) FILTER (WHERE task_claims.status IN ('completed', 'abandoned', 'rejected')) = 0
    THEN 0
    ELSE round(
      count(*) FILTER (WHERE task_claims.status = 'completed')::numeric * 100.0
      / count(*) FILTER (WHERE task_claims.status IN ('completed', 'abandoned', 'rejected')),
      1
    )
  END
  FROM task_claims
  WHERE task_claims.agent_id = agents.id
)`;

/**
 * GET /api/v1/agents - List agents with filtering and search
 */
export async function GET(request: NextRequest) {
  const clientId = getClientIdentifier(request);

  // Check if IP is blocked
  if (isIpBlocked(clientId)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Rate limiting
  const rateLimit = checkRateLimit(clientId, { maxRequests: 100, windowMs: 60000 });

  if (!rateLimit.allowed) {
    logRateLimitExceeded(request, '/api/v1/agents', undefined);
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

  // Parse and validate query params
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

  const parsed = listAgentsQuerySchema.safeParse(queryParams);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid query parameters',
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const filters = parsed.data;

  // Build WHERE conditions
  const conditions = [];

  // Status filter (defaults to active)
  conditions.push(eq(agents.status, filters.status));

  // Search by displayName
  if (filters.search) {
    conditions.push(ilike(agents.displayName, `%${filters.search}%`));
  }

  // Source filter
  if (filters.source) {
    conditions.push(eq(agents.source, filters.source));
  }

  // Reputation range filters
  if (filters.minReputation !== undefined) {
    conditions.push(gte(agents.reputationScore, filters.minReputation));
  }
  if (filters.maxReputation !== undefined) {
    conditions.push(lte(agents.reputationScore, filters.maxReputation));
  }

  try {
    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(agents)
      .where(and(...conditions));
    const total = Number(countResult[0]?.count || 0);

    // Determine sort column and direction
    const sortFn = filters.sortOrder === 'asc' ? asc : desc;

    let agentResults;

    if (filters.sortBy === 'tasks_completed') {
      // Sort by computed tasks_completed subquery
      agentResults = await db
        .select({
          id: agents.id,
          displayName: agents.displayName,
          capabilities: agents.capabilities,
          reputationScore: agents.reputationScore,
          status: agents.status,
          source: agents.source,
          metadata: agents.metadata,
          createdAt: agents.createdAt,
          updatedAt: agents.updatedAt,
          tasksCompleted: tasksCompletedSubquery.as('tasks_completed'),
          successRate: successRateSubquery.as('success_rate'),
        })
        .from(agents)
        .where(and(...conditions))
        .orderBy(
          filters.sortOrder === 'asc' ? asc(sql`tasks_completed`) : desc(sql`tasks_completed`)
        )
        .limit(filters.limit)
        .offset(filters.offset);
    } else {
      // Sort by a direct column
      const sortColumnMap = {
        reputation_score: agents.reputationScore,
        created_at: agents.createdAt,
      } as const;
      const sortColumn = sortColumnMap[filters.sortBy];

      agentResults = await db
        .select({
          id: agents.id,
          displayName: agents.displayName,
          capabilities: agents.capabilities,
          reputationScore: agents.reputationScore,
          status: agents.status,
          source: agents.source,
          metadata: agents.metadata,
          createdAt: agents.createdAt,
          updatedAt: agents.updatedAt,
          tasksCompleted: tasksCompletedSubquery.as('tasks_completed'),
          successRate: successRateSubquery.as('success_rate'),
        })
        .from(agents)
        .where(and(...conditions))
        .orderBy(sortFn(sortColumn))
        .limit(filters.limit)
        .offset(filters.offset);
    }

    // Filter by capabilities if specified (in-memory since it's JSONB)
    let filteredAgents = agentResults;
    if (filters.capabilities) {
      const requiredCaps = filters.capabilities.split(',').map((c) => c.trim().toLowerCase());
      filteredAgents = agentResults.filter((agent) => {
        const agentCaps = (agent.capabilities || []) as string[];
        return requiredCaps.some((cap) => agentCaps.map((c) => c.toLowerCase()).includes(cap));
      });
    }

    return NextResponse.json(
      {
        agents: filteredAgents.map((agent) => ({
          id: agent.id,
          displayName: agent.displayName,
          capabilities: agent.capabilities,
          reputationScore: agent.reputationScore,
          status: agent.status,
          source: agent.source,
          metadata: agent.metadata,
          createdAt: agent.createdAt,
          updatedAt: agent.updatedAt,
          stats: {
            tasksCompleted: Number(agent.tasksCompleted || 0),
            successRate: Number(agent.successRate || 0),
          },
        })),
        pagination: {
          total,
          limit: filters.limit,
          offset: filters.offset,
          hasMore: filters.offset + filters.limit < total,
        },
        filters: {
          applied: Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined)),
        },
      },
      {
        headers: {
          'X-RateLimit-Remaining': String(rateLimit.remaining),
          'X-RateLimit-Reset': String(rateLimit.resetAt),
          'Cache-Control': 'public, max-age=60',
        },
      }
    );
  } catch (error) {
    console.error('[agents] Error listing agents:', error);
    return NextResponse.json(
      {
        error: 'Failed to list agents',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
