import { NextRequest, NextResponse } from 'next/server';

import { revokeAllKeys } from '@/lib/api-key-rotation';
import { createAuditLog } from '@/lib/audit';
import { authenticateRequest } from '@/lib/auth';
import { checkRateLimit, getClientIdentifier, isIpBlocked } from '@/lib/security';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/v1/agents/[id]/api-key/revoke - Emergency revoke all API keys
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const clientId = getClientIdentifier(request);

  if (isIpBlocked(clientId)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const rateLimit = checkRateLimit(`${clientId}:revoke`, {
    maxRequests: 3,
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
      { error: 'Forbidden: you can only revoke your own API keys' },
      { status: 403 }
    );
  }

  try {
    const revokedCount = await revokeAllKeys(id);

    createAuditLog(request, 'api_key.revoke', {
      actorId: id,
      actorType: 'agent',
      resourceType: 'api_key',
      success: true,
      metadata: { revokedCount },
    });

    return NextResponse.json(
      {
        message: 'All API keys revoked',
        revokedCount,
        warning: 'You will need to re-register to obtain a new API key.',
      },
      {
        status: 200,
        headers: {
          'X-RateLimit-Remaining': String(rateLimit.remaining),
        },
      }
    );
  } catch {
    return NextResponse.json({ error: 'Failed to revoke keys' }, { status: 500 });
  }
}
