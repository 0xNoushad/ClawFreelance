import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  createAuditLog,
  getRecentAuditLogs,
  getAuditLogsForActor,
  logSecurityEvent,
  logAuthAttempt,
  logRateLimitExceeded,
  type AuditLogEntry,
} from '../audit';

// Helper to create mock NextRequest
function createMockRequest(options: {
  headers?: Record<string, string>;
  url?: string;
} = {}): NextRequest {
  const headers = new Headers({
    'x-forwarded-for': '192.168.1.100',
    'user-agent': 'Mozilla/5.0 Test Agent',
    ...options.headers,
  });
  return {
    headers,
    url: options.url || 'http://localhost/api/test',
  } as unknown as NextRequest;
}

describe('Audit Module', () => {
  // ============================================
  // AUDIT LOG CREATION TESTS
  // ============================================
  describe('createAuditLog', () => {
    it('should create a basic audit log entry', () => {
      const request = createMockRequest();
      const entry = createAuditLog(request, 'agent.register', {
        resourceType: 'agent',
      });

      expect(entry).toBeDefined();
      expect(entry.action).toBe('agent.register');
      expect(entry.resourceType).toBe('agent');
      expect(entry.timestamp).toBeDefined();
    });

    it('should capture IP address from x-forwarded-for', () => {
      const request = createMockRequest({
        headers: { 'x-forwarded-for': '10.0.0.1' },
      });
      const entry = createAuditLog(request, 'auth.success', {
        resourceType: 'auth',
      });

      expect(entry.ipAddress).toBe('10.0.0.1');
    });

    it('should capture user agent', () => {
      const request = createMockRequest({
        headers: { 'user-agent': 'TestBot/1.0' },
      });
      const entry = createAuditLog(request, 'task.create', {
        resourceType: 'task',
      });

      expect(entry.userAgent).toBe('TestBot/1.0');
    });

    it('should include actor information', () => {
      const request = createMockRequest();
      const entry = createAuditLog(request, 'task.claim', {
        actorId: 'agent-123',
        actorType: 'agent',
        resourceType: 'task',
        resourceId: 'task-456',
      });

      expect(entry.actorId).toBe('agent-123');
      expect(entry.actorType).toBe('agent');
      expect(entry.resourceId).toBe('task-456');
    });

    it('should include metadata', () => {
      const request = createMockRequest();
      const entry = createAuditLog(request, 'payment.initiate', {
        resourceType: 'payment',
        metadata: {
          amount: 100,
          currency: 'USDC',
        },
      });

      expect(entry.metadata.amount).toBe(100);
      expect(entry.metadata.currency).toBe('USDC');
    });

    it('should track success status', () => {
      const request = createMockRequest();

      const successEntry = createAuditLog(request, 'auth.success', {
        resourceType: 'auth',
        success: true,
      });
      expect(successEntry.success).toBe(true);

      const failEntry = createAuditLog(request, 'auth.failure', {
        resourceType: 'auth',
        success: false,
        errorMessage: 'Invalid credentials',
      });
      expect(failEntry.success).toBe(false);
      expect(failEntry.errorMessage).toBe('Invalid credentials');
    });

    it('should capture request ID header', () => {
      const request = createMockRequest({
        headers: { 'x-request-id': 'req-abc-123' },
      });
      const entry = createAuditLog(request, 'task.update', {
        resourceType: 'task',
      });

      expect(entry.requestId).toBe('req-abc-123');
    });
  });

  // ============================================
  // AUDIT LOG RETRIEVAL TESTS
  // ============================================
  describe('getRecentAuditLogs', () => {
    it('should return recent logs', () => {
      const request = createMockRequest();

      // Create some logs
      createAuditLog(request, 'agent.register', { resourceType: 'agent' });
      createAuditLog(request, 'task.create', { resourceType: 'task' });

      const logs = getRecentAuditLogs(10);

      expect(logs).toBeDefined();
      expect(logs.length).toBeGreaterThan(0);
    });

    it('should respect limit parameter', () => {
      const logs = getRecentAuditLogs(5);
      expect(logs.length).toBeLessThanOrEqual(5);
    });
  });

  describe('getAuditLogsForActor', () => {
    it('should filter logs by actor ID', () => {
      const request = createMockRequest();
      const actorId = `test-actor-${Date.now()}`;

      createAuditLog(request, 'task.claim', {
        actorId,
        actorType: 'agent',
        resourceType: 'task',
      });

      const logs = getAuditLogsForActor(actorId);

      expect(logs.length).toBeGreaterThan(0);
      logs.forEach(log => {
        expect(log.actorId).toBe(actorId);
      });
    });
  });

  // ============================================
  // CONVENIENCE LOGGING FUNCTIONS TESTS
  // ============================================
  describe('logSecurityEvent', () => {
    it('should create security event log for suspicious activity', () => {
      const request = createMockRequest();

      logSecurityEvent(request, 'suspicious_activity', 'Rate limit exceeded');

      const logs = getRecentAuditLogs(1);
      const lastLog = logs[logs.length - 1];

      expect(lastLog.action).toBe('security.suspicious_activity');
      expect(lastLog.metadata.reason).toBe('Rate limit exceeded');
      expect(lastLog.success).toBe(false);
    });

    it('should create security event log for blocked requests', () => {
      const request = createMockRequest();

      logSecurityEvent(request, 'blocked_request', 'IP blocked');

      const logs = getRecentAuditLogs(1);
      const lastLog = logs[logs.length - 1];

      expect(lastLog.action).toBe('security.blocked_request');
    });

    it('should include additional metadata', () => {
      const request = createMockRequest();

      logSecurityEvent(request, 'suspicious_activity', 'Injection attempt', {
        type: 'sql',
        pattern: 'DROP TABLE',
      });

      const logs = getRecentAuditLogs(1);
      const lastLog = logs[logs.length - 1];

      expect(lastLog.metadata.type).toBe('sql');
    });
  });

  describe('logAuthAttempt', () => {
    it('should log successful auth attempts', () => {
      const request = createMockRequest();

      logAuthAttempt(request, true, 'agent-auth-test');

      const logs = getRecentAuditLogs(1);
      const lastLog = logs[logs.length - 1];

      expect(lastLog.action).toBe('auth.success');
      expect(lastLog.success).toBe(true);
      expect(lastLog.actorId).toBe('agent-auth-test');
    });

    it('should log failed auth attempts', () => {
      const request = createMockRequest();

      logAuthAttempt(request, false, undefined, 'Invalid API key');

      const logs = getRecentAuditLogs(1);
      const lastLog = logs[logs.length - 1];

      expect(lastLog.action).toBe('auth.failure');
      expect(lastLog.success).toBe(false);
      expect(lastLog.errorMessage).toBe('Invalid API key');
    });
  });

  describe('logRateLimitExceeded', () => {
    it('should log rate limit events', () => {
      const request = createMockRequest();

      logRateLimitExceeded(request, '/api/tasks', 'agent-rate-test');

      const logs = getRecentAuditLogs(1);
      const lastLog = logs[logs.length - 1];

      expect(lastLog.action).toBe('rate_limit.exceeded');
      expect(lastLog.metadata.endpoint).toBe('/api/tasks');
      expect(lastLog.success).toBe(false);
    });

    it('should log anonymous rate limit events', () => {
      const request = createMockRequest();

      logRateLimitExceeded(request, '/api/register');

      const logs = getRecentAuditLogs(1);
      const lastLog = logs[logs.length - 1];

      expect(lastLog.actorType).toBe('anonymous');
    });
  });

  // ============================================
  // AUDIT LOG ENTRY STRUCTURE TESTS
  // ============================================
  describe('AuditLogEntry structure', () => {
    it('should have all required fields', () => {
      const request = createMockRequest();
      const entry = createAuditLog(request, 'task.complete', {
        resourceType: 'task',
        resourceId: 'task-789',
      });

      // Check all required fields exist
      expect(entry.timestamp).toBeDefined();
      expect(entry.action).toBeDefined();
      expect(typeof entry.actorId === 'string' || entry.actorId === null).toBe(true);
      expect(entry.actorType).toBeDefined();
      expect(entry.resourceType).toBeDefined();
      expect(typeof entry.resourceId === 'string' || entry.resourceId === null).toBe(true);
      expect(entry.metadata).toBeDefined();
      expect(entry.ipAddress).toBeDefined();
      expect(typeof entry.success === 'boolean').toBe(true);
    });

    it('should have valid timestamp format', () => {
      const request = createMockRequest();
      const entry = createAuditLog(request, 'agent.update', {
        resourceType: 'agent',
      });

      // Should be ISO 8601 format
      expect(new Date(entry.timestamp).toISOString()).toBe(entry.timestamp);
    });
  });
});
