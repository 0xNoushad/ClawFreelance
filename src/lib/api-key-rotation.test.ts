import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock DB to prevent connection errors when importing api-key-rotation
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    transaction: vi.fn(),
  },
}));

import { isKeyValid } from './api-key-rotation';

describe('api-key-rotation', () => {
  describe('isKeyValid', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-05T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return true for an active, non-expired key with no grace period', () => {
      expect(
        isKeyValid({
          revoked: false,
          expiresAt: null,
          gracePeriodEndsAt: null,
        })
      ).toBe(true);
    });

    it('should return false for a revoked key', () => {
      expect(
        isKeyValid({
          revoked: true,
          expiresAt: null,
          gracePeriodEndsAt: null,
        })
      ).toBe(false);
    });

    it('should return false for an expired key', () => {
      expect(
        isKeyValid({
          revoked: false,
          expiresAt: new Date('2026-02-04T12:00:00Z'),
          gracePeriodEndsAt: null,
        })
      ).toBe(false);
    });

    it('should return true for a key that has not yet expired', () => {
      expect(
        isKeyValid({
          revoked: false,
          expiresAt: new Date('2026-02-06T12:00:00Z'),
          gracePeriodEndsAt: null,
        })
      ).toBe(true);
    });

    it('should return true for a key within its grace period', () => {
      expect(
        isKeyValid({
          revoked: false,
          expiresAt: null,
          gracePeriodEndsAt: new Date('2026-02-06T12:00:00Z'),
        })
      ).toBe(true);
    });

    it('should return false for a key past its grace period', () => {
      expect(
        isKeyValid({
          revoked: false,
          expiresAt: null,
          gracePeriodEndsAt: new Date('2026-02-04T12:00:00Z'),
        })
      ).toBe(false);
    });

    it('should return false for a revoked key even with future expiry', () => {
      expect(
        isKeyValid({
          revoked: true,
          expiresAt: new Date('2026-12-31T00:00:00Z'),
          gracePeriodEndsAt: null,
        })
      ).toBe(false);
    });

    it('should return false when both expired and past grace period', () => {
      expect(
        isKeyValid({
          revoked: false,
          expiresAt: new Date('2026-01-01T00:00:00Z'),
          gracePeriodEndsAt: new Date('2026-01-15T00:00:00Z'),
        })
      ).toBe(false);
    });
  });
});
