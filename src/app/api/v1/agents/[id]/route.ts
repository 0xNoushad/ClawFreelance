import { eq, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { db } from '@/db';
import { agents, payments, reputationEvents, taskClaims } from '@/db/schema';
import { createAuditLog, logRateLimitExceeded, logSecurityEvent } from '@/lib/audit';
import { authenticateRequest, validateBodySize, validateContentType } from '@/lib/auth';
import {
  checkRateLimit,
  detectInjection,
  getClientIdentifier,
  isIpBlocked,
  sanitizeInputStrict,
} from '@/lib/security';

// UUID validation regex
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Zod schema for PATCH update body
const updateAgentSchema = z.object({
  displayName: z
    .string()
    .min(3, 'Display name must be at least 3 characters')
    .max(100, 'Display name must not exceed 100 characters')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Display name can only contain letters, numbers, underscores, and hyphens'
    )
    .optional(),
  capabilities: z
    .array(
      z
        .string()
        .min(2, 'Capability must be at least 2 characters')
        .max(50, 'Capability must not exceed 50 characters')
        .regex(
          /^[a-z0-9-]+$/,
          'Capability can only contain lowercase letters, numbers, and hyphens'
        )
    )
    .max(20, 'Maximum 20 capabilities allowed')
    .optional(),
  walletAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum wallet address')
    .optional()
    .nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Truncate a wallet address for public display (first 6 + last 4 chars)
 */
function truncateWallet(address: string | null): string | null {
  if (!address) return null;
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * GET /api/v1/agents/[id] - Get agent profile (public)
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
    logRateLimitExceeded(request, '/api/v1/agents/[id]', undefined);
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

  try {
    // Fetch agent
    const result = await db.select().from(agents).where(eq(agents.id, id)).limit(1);

    if (result.length === 0) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const agent = result[0];

    // Compute task stats via claim statuses
    const claimStats = await db
      .select({
        completed: sql<number>`count(*) FILTER (WHERE ${taskClaims.status} = 'completed')`,
        active: sql<number>`count(*) FILTER (WHERE ${taskClaims.status} = 'active')`,
        abandoned: sql<number>`count(*) FILTER (WHERE ${taskClaims.status} = 'abandoned')`,
        rejected: sql<number>`count(*) FILTER (WHERE ${taskClaims.status} = 'rejected')`,
      })
      .from(taskClaims)
      .where(eq(taskClaims.agentId, id));

    const stats = claimStats[0];
    const completed = Number(stats?.completed || 0);
    const active = Number(stats?.active || 0);
    const abandoned = Number(stats?.abandoned || 0);
    const rejected = Number(stats?.rejected || 0);
    const totalResolved = completed + abandoned + rejected;
    const successRate = totalResolved > 0 ? Math.round((completed / totalResolved) * 1000) / 10 : 0;

    // Compute total earned from released payments
    const releasedEarnings = await db
      .select({
        totalEarned: sql<number>`coalesce(sum(${payments.amount}), 0)`,
      })
      .from(payments)
      .where(
        sql`${payments.agentId} = ${id} AND ${payments.status} = 'released'`
      );

    const totalEarned = Number(releasedEarnings[0]?.totalEarned || 0);

    // Fetch recent reputation events (last 5)
    const recentActivity = await db
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
      .orderBy(sql`${reputationEvents.createdAt} DESC`)
      .limit(5);

    return NextResponse.json(
      {
        agent: {
          id: agent.id,
          displayName: agent.displayName,
          capabilities: agent.capabilities,
          reputationScore: agent.reputationScore,
          status: agent.status,
          source: agent.source,
          walletAddress: truncateWallet(agent.walletAddress),
          metadata: agent.metadata,
          memberSince: agent.createdAt.toISOString(),
          updatedAt: agent.updatedAt,
        },
        stats: {
          tasksCompleted: completed,
          tasksInProgress: active,
          tasksFailed: abandoned + rejected,
          successRate,
          totalEarned,
        },
        recentActivity,
      },
      {
        headers: {
          'X-RateLimit-Remaining': String(rateLimit.remaining),
          'Cache-Control': 'public, max-age=60',
        },
      }
    );
  } catch (error) {
    console.error('[agents/[id]] Error fetching agent:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch agent',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/v1/agents/[id] - Update agent profile (auth required, self only)
 */
export async function PATCH(
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

  // Validate body size (100KB max)
  const bodySizeCheck = validateBodySize(request.headers.get('content-length'), 100 * 1024);
  if (!bodySizeCheck.valid) {
    return NextResponse.json({ error: bodySizeCheck.error }, { status: 413 });
  }

  // Rate limiting (stricter for writes)
  const rateLimit = checkRateLimit(`${clientId}:write`, { maxRequests: 10, windowMs: 60000 });

  if (!rateLimit.allowed) {
    logRateLimitExceeded(request, '/api/v1/agents/[id]:PATCH', undefined);
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  // Authenticate request
  const authResult = await authenticateRequest(request);
  if (!authResult.authenticated || !authResult.agent) {
    createAuditLog(request, 'auth.failure', {
      resourceType: 'agent',
      success: false,
      errorMessage: authResult.error,
    });
    return NextResponse.json(
      { error: authResult.error || 'Authentication required' },
      { status: 401 }
    );
  }

  const { id } = await params;

  // Validate UUID format
  if (!uuidRegex.test(id)) {
    return NextResponse.json({ error: 'Invalid agent ID format' }, { status: 400 });
  }

  // Authorization: agent can only update their own profile
  if (authResult.agent.id !== id) {
    return NextResponse.json(
      { error: 'Forbidden: you can only update your own profile' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();

    // Sanitize string inputs
    if (body.displayName) {
      body.displayName = sanitizeInputStrict(body.displayName);
    }
    if (body.walletAddress) {
      body.walletAddress = sanitizeInputStrict(body.walletAddress);
    }

    // Check for injection attacks on all string inputs
    const stringsToCheck: Array<{ key: string; value: string }> = [];
    if (typeof body.displayName === 'string') {
      stringsToCheck.push({ key: 'displayName', value: body.displayName });
    }
    if (typeof body.walletAddress === 'string') {
      stringsToCheck.push({ key: 'walletAddress', value: body.walletAddress });
    }
    if (Array.isArray(body.capabilities)) {
      for (const cap of body.capabilities) {
        if (typeof cap === 'string') {
          stringsToCheck.push({ key: 'capabilities', value: cap });
        }
      }
    }

    for (const { key, value } of stringsToCheck) {
      const injection = detectInjection(value);
      if (injection.detected) {
        logSecurityEvent(
          request,
          'suspicious_activity',
          `Injection attempt in agent update field: ${key}`,
          {
            types: injection.types,
            agentId: authResult.agent.id,
          }
        );
        return NextResponse.json({ error: 'Invalid content detected' }, { status: 400 });
      }
    }

    // Validate against schema
    const parsed = updateAgentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid update data',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const updateData = parsed.data;

    // Ensure there's something to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields provided for update' },
        { status: 400 }
      );
    }

    // Verify agent exists
    const existing = await db.select().from(agents).where(eq(agents.id, id)).limit(1);
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Build update values
    const updateValues: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (updateData.displayName !== undefined) {
      updateValues.displayName = updateData.displayName;
    }
    if (updateData.capabilities !== undefined) {
      updateValues.capabilities = updateData.capabilities;
    }
    if (updateData.walletAddress !== undefined) {
      updateValues.walletAddress = updateData.walletAddress;
    }
    if (updateData.metadata !== undefined) {
      updateValues.metadata = updateData.metadata;
    }

    // Perform update
    const [updatedAgent] = await db
      .update(agents)
      .set(updateValues)
      .where(eq(agents.id, id))
      .returning();

    // Audit log
    createAuditLog(request, 'agent.update', {
      actorId: authResult.agent.id,
      actorType: 'agent',
      resourceType: 'agent',
      resourceId: id,
      success: true,
      metadata: {
        updatedFields: Object.keys(updateData),
      },
    });

    return NextResponse.json(
      {
        message: 'Agent profile updated successfully',
        agent: {
          id: updatedAgent.id,
          displayName: updatedAgent.displayName,
          capabilities: updatedAgent.capabilities,
          reputationScore: updatedAgent.reputationScore,
          status: updatedAgent.status,
          source: updatedAgent.source,
          walletAddress: truncateWallet(updatedAgent.walletAddress),
          metadata: updatedAgent.metadata,
          createdAt: updatedAgent.createdAt,
          updatedAt: updatedAgent.updatedAt,
        },
      },
      {
        headers: {
          'X-RateLimit-Remaining': String(rateLimit.remaining),
        },
      }
    );
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
}
