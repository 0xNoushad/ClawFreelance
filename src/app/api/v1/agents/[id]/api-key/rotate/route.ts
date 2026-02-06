import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { rotateApiKey } from '@/lib/api-key-rotation';
import { createAuditLog } from '@/lib/audit';
import { authenticateRequest, validateBodySize, validateContentType } from '@/lib/auth';
import { checkRateLimit, getClientIdentifier, isIpBlocked } from '@/lib/security';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const rotateSchema = z.object({
  immediate: z.boolean().default(false),
  gracePeriodHours: z.number().min(0).max(168).default(24),
});

/**
 * POST /api/v1/agents/[id]/api-key/rotate - Rotate an agent's API key
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const clientId = getClientIdentifier(request);

  if (isIpBlocked(clientId)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const contentTypeCheck = validateContentType(request);
  if (!contentTypeCheck.valid) {
    return NextResponse.json({ error: contentTypeCheck.error }, { status: 415 });
  }

  const bodySizeCheck = validateBodySize(request.headers.get('content-length'), 10 * 1024);
  if (!bodySizeCheck.valid) {
    return NextResponse.json({ error: bodySizeCheck.error }, { status: 413 });
  }

  const rateLimit = checkRateLimit(`${clientId}:rotate`, {
    maxRequests: 5,
    windowMs: 3600000,
  });

  if (!rateLimit.allowed) {
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

  const authResult = await authenticateRequest(request);
  if (!authResult.authenticated || !authResult.agent) {
    createAuditLog(request, 'auth.failure', {
      resourceType: 'api_key',
      success: false,
      errorMessage: authResult.error,
    });
    return NextResponse.json(
      { error: authResult.error || 'Authentication required' },
      { status: 401 }
    );
  }

  const { id } = await params;

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: 'Invalid agent ID format' }, { status: 400 });
  }

  if (authResult.agent.id !== id) {
    return NextResponse.json(
      { error: 'Forbidden: you can only rotate your own API key' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const parsed = rotateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const result = await rotateApiKey({
      agentId: id,
      currentKeyHash: authResult.agent.keyHash,
      immediate: parsed.data.immediate,
      gracePeriodHours: parsed.data.gracePeriodHours,
    });

    createAuditLog(request, 'api_key.rotate', {
      actorId: id,
      actorType: 'agent',
      resourceType: 'api_key',
      success: true,
      metadata: {
        immediate: parsed.data.immediate,
        gracePeriodHours: parsed.data.gracePeriodHours,
      },
    });

    return NextResponse.json(
      {
        message: 'API key rotated successfully',
        authentication: {
          apiKey: result.newKey,
          warning: 'SAVE THIS API KEY SECURELY! It will only be shown once.',
        },
        previousKey: {
          status: result.oldKeyRevokedAt ? 'revoked' : 'grace_period',
          gracePeriodEndsAt: result.gracePeriodEndsAt?.toISOString() ?? null,
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, private',
          'X-RateLimit-Remaining': String(rateLimit.remaining),
        },
      }
    );
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
}
