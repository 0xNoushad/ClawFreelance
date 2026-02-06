import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  authenticateRequest,
  errorResponse,
  optionalAuth,
  successResponse,
  validateBodySize,
  validateContentType,
  withAuth,
} from './auth';
import { hashApiKey } from './security';

// Mock DB for auth tests
let mockKeyResult: Array<Record<string, unknown>> = [];

vi.mock('@/db', () => {
  const mockLimit = vi.fn(() => Promise.resolve(mockKeyResult));
  const mockWhere = vi.fn(() => ({ limit: mockLimit }));
  const mockInnerJoin = vi.fn(() => ({ where: mockWhere }));
  const mockFrom = vi.fn(() => ({ innerJoin: mockInnerJoin }));
  const mockSelect = vi.fn(() => ({ from: mockFrom }));

  const _mockUpdateWhere = vi.fn(() => Promise.resolve([]));
  const _mockUpdateSet = vi.fn(() => ({ where: _mockUpdateWhere, then: vi.fn() }));
  const mockUpdate = vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn(() => ({
        then: vi.fn((cb: () => void) => {
          cb();
          return { catch: vi.fn() };
        }),
      })),
    })),
  }));

  return {
    db: {
      select: mockSelect,
      update: mockUpdate,
    },
  };
});

// Helper to create mock NextRequest
function createMockRequest(
  options: {
    headers?: Record<string, string>;
    method?: string;
    url?: string;
  } = {}
): NextRequest {
  const headers = new Headers(options.headers || {});
  return {
    headers,
    method: options.method || 'GET',
    url: options.url || 'http://localhost/api/test',
  } as unknown as NextRequest;
}

const VALID_KEY = 'clf_' + 'a'.repeat(60);

function setMockAgent(key: string = VALID_KEY) {
  const keyHash = hashApiKey(key);
  mockKeyResult = [
    {
      keyId: '00000000-0000-0000-0000-000000000001',
      keyHash,
      permissions: ['read', 'write', 'claim'],
      revoked: false,
      expiresAt: null,
      gracePeriodEndsAt: null,
      agentId: '00000000-0000-0000-0000-000000000099',
      displayName: 'Test Agent',
      source: 'openclaw',
      agentStatus: 'active',
    },
  ];
}

describe('Auth Module', () => {
  beforeEach(() => {
    mockKeyResult = [];
  });

  describe('authenticateRequest', () => {
    it('should reject requests without API key', async () => {
      const request = createMockRequest();
      const result = await authenticateRequest(request);

      expect(result.authenticated).toBe(false);
      expect(result.error).toContain('Missing API key');
      expect(result.statusCode).toBe(401);
    });

    it('should reject API keys with wrong format', async () => {
      const request = createMockRequest({
        headers: { authorization: 'Bearer invalid-key' },
      });
      const result = await authenticateRequest(request);

      expect(result.authenticated).toBe(false);
      expect(result.error).toContain('Invalid API key format');
    });

    it('should reject short API keys', async () => {
      const request = createMockRequest({
        headers: { authorization: 'Bearer clf_short' },
      });
      const result = await authenticateRequest(request);

      expect(result.authenticated).toBe(false);
    });

    it('should accept valid Bearer token with matching DB record', async () => {
      setMockAgent(VALID_KEY);
      const request = createMockRequest({
        headers: { authorization: `Bearer ${VALID_KEY}` },
      });
      const result = await authenticateRequest(request);

      expect(result.authenticated).toBe(true);
      expect(result.agent).toBeDefined();
    });

    it('should accept X-API-Key header', async () => {
      const key = 'clf_' + 'b'.repeat(60);
      setMockAgent(key);
      const request = createMockRequest({
        headers: { 'x-api-key': key },
      });
      const result = await authenticateRequest(request);

      expect(result.authenticated).toBe(true);
    });

    it('should return agent info on successful auth', async () => {
      setMockAgent(VALID_KEY);
      const request = createMockRequest({
        headers: { authorization: `Bearer ${VALID_KEY}` },
      });
      const result = await authenticateRequest(request);

      expect(result.agent).toBeDefined();
      expect(result.agent?.id).toBe('00000000-0000-0000-0000-000000000099');
      expect(result.agent?.displayName).toBe('Test Agent');
      expect(result.agent?.permissions).toContain('read');
      expect(result.agent?.keyHash).toBeDefined();
    });

    it('should reject valid format key with no DB match', async () => {
      mockKeyResult = [];
      const request = createMockRequest({
        headers: { authorization: `Bearer ${VALID_KEY}` },
      });
      const result = await authenticateRequest(request);

      expect(result.authenticated).toBe(false);
      expect(result.error).toContain('Invalid or expired');
    });

    it('should reject suspended agents', async () => {
      const keyHash = hashApiKey(VALID_KEY);
      mockKeyResult = [
        {
          keyId: '00000000-0000-0000-0000-000000000001',
          keyHash,
          permissions: ['read'],
          revoked: false,
          expiresAt: null,
          gracePeriodEndsAt: null,
          agentId: '00000000-0000-0000-0000-000000000099',
          displayName: 'Suspended Agent',
          source: 'openclaw',
          agentStatus: 'suspended',
        },
      ];
      const request = createMockRequest({
        headers: { authorization: `Bearer ${VALID_KEY}` },
      });
      const result = await authenticateRequest(request);

      expect(result.authenticated).toBe(false);
      expect(result.error).toContain('suspended');
      expect(result.statusCode).toBe(403);
    });
  });

  describe('validateContentType', () => {
    it('should reject missing Content-Type', () => {
      const request = createMockRequest();
      const result = validateContentType(request);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Content-Type');
    });

    it('should reject non-JSON Content-Type', () => {
      const request = createMockRequest({
        headers: { 'content-type': 'text/plain' },
      });
      const result = validateContentType(request);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('application/json');
    });

    it('should accept application/json', () => {
      const request = createMockRequest({
        headers: { 'content-type': 'application/json' },
      });
      const result = validateContentType(request);

      expect(result.valid).toBe(true);
    });

    it('should accept application/json with charset', () => {
      const request = createMockRequest({
        headers: { 'content-type': 'application/json; charset=utf-8' },
      });
      const result = validateContentType(request);

      expect(result.valid).toBe(true);
    });
  });

  describe('validateBodySize', () => {
    it('should accept null content-length', () => {
      const result = validateBodySize(null);
      expect(result.valid).toBe(true);
    });

    it('should accept small body sizes', () => {
      const result = validateBodySize('1000');
      expect(result.valid).toBe(true);
    });

    it('should accept body at exactly max size', () => {
      const result = validateBodySize(String(1024 * 1024), 1024 * 1024);
      expect(result.valid).toBe(true);
    });

    it('should reject body exceeding max size', () => {
      const result = validateBodySize(String(1024 * 1024 + 1), 1024 * 1024);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too large');
    });

    it('should reject invalid content-length', () => {
      const result = validateBodySize('not-a-number');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid');
    });

    it('should use custom max size', () => {
      const result = validateBodySize('5000', 1000);
      expect(result.valid).toBe(false);
    });
  });

  describe('Response Helpers', () => {
    describe('errorResponse', () => {
      it('should create error response with default status', async () => {
        const response = errorResponse('Something went wrong');
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Something went wrong');
        expect(data.timestamp).toBeDefined();
      });

      it('should create error response with custom status', async () => {
        const response = errorResponse('Not found', 404);

        expect(response.status).toBe(404);
      });

      it('should include details when provided', async () => {
        const response = errorResponse('Validation failed', 400, {
          fields: ['name', 'email'],
        });
        const data = await response.json();

        expect(data.details).toBeDefined();
        expect(data.details.fields).toContain('name');
      });
    });

    describe('successResponse', () => {
      it('should create success response with default status', async () => {
        const response = successResponse({ message: 'OK' });

        expect(response.status).toBe(200);
      });

      it('should create success response with custom status', async () => {
        const response = successResponse({ id: 1 }, 201);

        expect(response.status).toBe(201);
      });

      it('should include custom headers', async () => {
        const response = successResponse({ message: 'OK' }, 200, { 'X-Custom-Header': 'value' });

        expect(response.headers.get('X-Custom-Header')).toBe('value');
      });
    });
  });

  describe('withAuth', () => {
    it('should return 401 when no API key provided', async () => {
      const handler = withAuth(async (_req, agent) => {
        return successResponse({ agentId: agent.id });
      });

      const request = createMockRequest();
      const response = await handler(request);

      expect(response.status).toBe(401);
    });

    it('should call handler with authenticated agent', async () => {
      setMockAgent(VALID_KEY);
      const handler = withAuth(async (_req, agent) => {
        return successResponse({ agentId: agent.id });
      });

      const request = createMockRequest({
        headers: { authorization: `Bearer ${VALID_KEY}` },
      });
      const response = await handler(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.agentId).toBeDefined();
    });

    it('should return 429 when rate limit exceeded', async () => {
      setMockAgent(VALID_KEY);
      const uniqueId = `test-rate-${Date.now()}`;
      const handler = withAuth(
        async (_req, agent) => {
          return successResponse({ agentId: agent.id });
        },
        {
          rateLimit: { maxRequests: 1, windowMs: 60000 },
        }
      );

      const request = createMockRequest({
        headers: {
          authorization: `Bearer ${VALID_KEY}`,
          'x-forwarded-for': uniqueId,
        },
      });

      await handler(request);

      const response2 = await handler(request);
      expect(response2.status).toBe(429);
    });

    it('should return 403 when permissions missing', async () => {
      setMockAgent(VALID_KEY);
      const handler = withAuth(
        async (_req, agent) => {
          return successResponse({ agentId: agent.id });
        },
        {
          requiredPermissions: ['admin', 'super-admin'],
        }
      );

      const request = createMockRequest({
        headers: { authorization: `Bearer ${VALID_KEY}` },
      });
      const response = await handler(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('Insufficient permissions');
    });
  });

  describe('optionalAuth', () => {
    it('should return null when no API key provided', async () => {
      const request = createMockRequest();
      const result = await optionalAuth(request);

      expect(result).toBeNull();
    });

    it('should return agent when valid API key provided', async () => {
      setMockAgent(VALID_KEY);
      const request = createMockRequest({
        headers: { authorization: `Bearer ${VALID_KEY}` },
      });
      const result = await optionalAuth(request);

      expect(result).toBeDefined();
      expect(result?.id).toBeDefined();
    });

    it('should return null when invalid API key provided', async () => {
      const request = createMockRequest({
        headers: { authorization: 'Bearer invalid-key' },
      });
      const result = await optionalAuth(request);

      expect(result).toBeNull();
    });
  });
});
