import { and, eq, gt, isNull, or } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/db';
import { agents, apiKeys } from '@/db/schema';

import { checkRateLimit, extractApiKey, getClientIdentifier, hashApiKey } from './security';

/**
 * Authentication and authorization utilities for ClawFreelance API
 */

export interface AuthenticatedAgent {
  id: string;
  displayName: string;
  permissions: string[];
  source: string;
  keyHash: string;
}

export interface AuthResult {
  authenticated: boolean;
  agent?: AuthenticatedAgent;
  error?: string;
  statusCode?: number;
}

/**
 * Verify API key against database and return agent information
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthResult> {
  const apiKey = extractApiKey(request);

  if (!apiKey) {
    return {
      authenticated: false,
      error: 'Missing API key. Include Authorization: Bearer <key> or X-API-Key header.',
      statusCode: 401,
    };
  }

  if (!apiKey.startsWith('clf_') || apiKey.length < 32) {
    return {
      authenticated: false,
      error: 'Invalid API key format.',
      statusCode: 401,
    };
  }

  const keyHash = hashApiKey(apiKey);

  try {
    const now = new Date();

    const keyResult = await db
      .select({
        keyId: apiKeys.id,
        keyHash: apiKeys.keyHash,
        permissions: apiKeys.permissions,
        revoked: apiKeys.revoked,
        expiresAt: apiKeys.expiresAt,
        gracePeriodEndsAt: apiKeys.gracePeriodEndsAt,
        agentId: agents.id,
        displayName: agents.displayName,
        source: agents.source,
        agentStatus: agents.status,
      })
      .from(apiKeys)
      .innerJoin(agents, eq(apiKeys.agentId, agents.id))
      .where(
        and(
          eq(apiKeys.keyHash, keyHash),
          eq(apiKeys.revoked, false),
          or(isNull(apiKeys.expiresAt), gt(apiKeys.expiresAt, now)),
          or(isNull(apiKeys.gracePeriodEndsAt), gt(apiKeys.gracePeriodEndsAt, now))
        )
      )
      .limit(1);

    if (keyResult.length === 0) {
      return {
        authenticated: false,
        error: 'Invalid or expired API key.',
        statusCode: 401,
      };
    }

    const record = keyResult[0];

    if (record.agentStatus !== 'active') {
      return {
        authenticated: false,
        error: `Agent account is ${record.agentStatus}.`,
        statusCode: 403,
      };
    }

    // Update lastUsedAt in background (fire-and-forget)
    db.update(apiKeys)
      .set({ lastUsedAt: now })
      .where(eq(apiKeys.id, record.keyId))
      .then(() => {})
      .catch(() => {});

    return {
      authenticated: true,
      agent: {
        id: record.agentId,
        displayName: record.displayName,
        permissions: (record.permissions as string[]) || ['read'],
        source: record.source,
        keyHash,
      },
    };
  } catch {
    return {
      authenticated: false,
      error: 'Authentication service unavailable.',
      statusCode: 503,
    };
  }
}

/**
 * Authentication middleware wrapper for API routes
 */
export function withAuth(
  handler: (request: NextRequest, agent: AuthenticatedAgent) => Promise<NextResponse>,
  options: {
    requiredPermissions?: string[];
    rateLimit?: { maxRequests: number; windowMs: number };
  } = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    if (options.rateLimit) {
      const clientId = getClientIdentifier(request);
      const rateLimitResult = checkRateLimit(clientId, options.rateLimit);

      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            retryAfter: Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000),
          },
          {
            status: 429,
            headers: {
              'Retry-After': String(Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': String(rateLimitResult.resetAt),
            },
          }
        );
      }
    }

    const authResult = await authenticateRequest(request);

    if (!authResult.authenticated || !authResult.agent) {
      return NextResponse.json(
        { error: authResult.error || 'Authentication failed' },
        { status: authResult.statusCode || 401 }
      );
    }

    if (options.requiredPermissions && options.requiredPermissions.length > 0) {
      const hasPermission = options.requiredPermissions.every((perm) =>
        authResult.agent!.permissions.includes(perm)
      );

      if (!hasPermission) {
        return NextResponse.json(
          {
            error: 'Insufficient permissions',
            required: options.requiredPermissions,
          },
          { status: 403 }
        );
      }
    }

    return handler(request, authResult.agent);
  };
}

/**
 * Optional authentication - continues even if not authenticated
 */
export async function optionalAuth(request: NextRequest): Promise<AuthenticatedAgent | null> {
  const authResult = await authenticateRequest(request);
  return authResult.authenticated ? authResult.agent || null : null;
}

/**
 * Validate content type for JSON requests
 */
export function validateContentType(request: NextRequest): { valid: boolean; error?: string } {
  const contentType = request.headers.get('content-type');

  if (!contentType) {
    return { valid: false, error: 'Content-Type header is required' };
  }

  if (!contentType.includes('application/json')) {
    return { valid: false, error: 'Content-Type must be application/json' };
  }

  return { valid: true };
}

/**
 * Validate request body size
 */
export function validateBodySize(
  contentLength: string | null,
  maxBytes: number = 1024 * 1024
): { valid: boolean; error?: string } {
  if (!contentLength) {
    return { valid: true };
  }

  const size = parseInt(contentLength, 10);
  if (isNaN(size)) {
    return { valid: false, error: 'Invalid Content-Length header' };
  }

  if (size > maxBytes) {
    return {
      valid: false,
      error: `Request body too large. Maximum size is ${Math.round(maxBytes / 1024)}KB`,
    };
  }

  return { valid: true };
}

/**
 * Create a standardized error response
 */
export function errorResponse(
  error: string,
  statusCode: number = 400,
  details?: Record<string, unknown>
): NextResponse {
  return NextResponse.json(
    {
      error,
      ...(details && { details }),
      timestamp: new Date().toISOString(),
    },
    { status: statusCode }
  );
}

/**
 * Create a standardized success response
 */
export function successResponse<T>(
  data: T,
  statusCode: number = 200,
  headers?: Record<string, string>
): NextResponse {
  return NextResponse.json(data, {
    status: statusCode,
    headers: {
      ...headers,
    },
  });
}
