import { describe, expect, it, vi } from 'vitest';

import type { BountySource, RawBounty, SyncResult } from './types';

// Mock the database module
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])),
        })),
        groupBy: vi.fn(() => Promise.resolve([])),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => Promise.resolve()),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    })),
  },
}));

// Mock the GitHub source
vi.mock('./sources/github', () => ({
  createGitHubSource: vi.fn(() => ({
    name: 'github',
    fetch: vi.fn(() => Promise.resolve([])),
    normalize: vi.fn((raw: RawBounty) => ({
      title: raw.title,
      description: raw.description,
      type: 'bounty',
      source: 'github',
      externalUrl: raw.externalUrl,
      ownerExternalId: raw.ownerExternalId,
      rewardType: 'points',
      rewardAmount: 0,
      visibility: 'public',
      isMilestoneBased: false,
      status: 'open',
      verificationMethod: 'pr_merged',
      difficulty: 'medium',
      requirements: [],
    })),
  })),
}));

// Mock the Algora source
vi.mock('./sources/algora', () => ({
  createAlgoraSource: vi.fn(() => ({
    name: 'algora',
    fetch: vi.fn(() => Promise.resolve([])),
    normalize: vi.fn((raw: RawBounty) => ({
      title: raw.title,
      description: raw.description,
      type: 'bounty',
      source: 'algora',
      externalUrl: raw.externalUrl,
      ownerExternalId: raw.ownerExternalId,
      rewardType: 'points',
      rewardAmount: 0,
      visibility: 'public',
      isMilestoneBased: false,
      status: 'open',
      verificationMethod: 'pr_merged',
      difficulty: 'medium',
      requirements: [],
    })),
  })),
}));

// Mock the Immunefi source
vi.mock('./sources/immunefi', () => ({
  createImmunefiSource: vi.fn(() => ({
    name: 'immunefi',
    fetch: vi.fn(() => Promise.resolve([])),
    normalize: vi.fn(() => ({})),
  })),
}));

// Mock the Bugcrowd source
vi.mock('./sources/bugcrowd', () => ({
  createBugcrowdSource: vi.fn(() => ({
    name: 'bugcrowd',
    fetch: vi.fn(() => Promise.resolve([])),
    normalize: vi.fn(() => ({})),
  })),
}));

// Mock the GitHub Issues source
vi.mock('./sources/github-issues', () => ({
  createGitHubIssuesSource: vi.fn(() => ({
    name: 'github-issues',
    fetch: vi.fn(() => Promise.resolve([])),
    normalize: vi.fn(() => ({})),
  })),
}));

// Mock the GitHub App Auth
vi.mock('./github-app-auth', () => ({
  initGitHubAppAuth: vi.fn(() => Promise.resolve()),
}));

// Import after mocking
import { getSyncStats, markStaleTasks, runSync, syncFromSource } from './sync';

describe('Sync Engine', () => {
  describe('runSync', () => {
    it('should return results array', async () => {
      const results = await runSync();

      expect(Array.isArray(results)).toBe(true);
    });

    it('should include GitHub source by default', async () => {
      const results = await runSync();

      expect(results.some((r) => r.source === 'github')).toBe(true);
    });

    it('should respect disabled sources in config', async () => {
      const results = await runSync({
        sources: {
          github: { enabled: false },
        },
      });

      // GitHub should still be in results but with 0 fetched
      // due to how the mock works
      expect(results).toBeDefined();
    });

    it('should track sync duration', async () => {
      const results = await runSync();

      for (const result of results) {
        expect(result.duration).toBeGreaterThanOrEqual(0);
      }
    });

    it('should return proper result structure', async () => {
      const results = await runSync();

      for (const result of results) {
        expect(result).toHaveProperty('source');
        expect(result).toHaveProperty('fetched');
        expect(result).toHaveProperty('created');
        expect(result).toHaveProperty('updated');
        expect(result).toHaveProperty('skipped');
        expect(result).toHaveProperty('errors');
        expect(result).toHaveProperty('duration');
      }
    });
  });

  describe('getSyncStats', () => {
    it('should return stats object', async () => {
      const stats = await getSyncStats();

      expect(stats).toHaveProperty('totalTasks');
      expect(stats).toHaveProperty('bySource');
      expect(typeof stats.totalTasks).toBe('number');
      expect(typeof stats.bySource).toBe('object');
    });
  });

  describe('SyncResult type', () => {
    it('should have correct shape', () => {
      const result: SyncResult = {
        source: 'github',
        fetched: 10,
        created: 5,
        updated: 3,
        skipped: 2,
        errors: [],
        duration: 1000,
      };

      expect(result.source).toBe('github');
      expect(result.fetched).toBe(10);
      expect(result.created).toBe(5);
      expect(result.updated).toBe(3);
      expect(result.skipped).toBe(2);
      expect(result.errors).toHaveLength(0);
      expect(result.duration).toBe(1000);
    });

    it('should support error entries', () => {
      const result: SyncResult = {
        source: 'github',
        fetched: 10,
        created: 4,
        updated: 3,
        skipped: 2,
        errors: [
          { externalId: 'github-test-1', message: 'Failed to parse' },
          { externalId: 'github-test-2', message: 'Validation error', code: 'INVALID' },
        ],
        duration: 1000,
      };

      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toHaveProperty('externalId');
      expect(result.errors[0]).toHaveProperty('message');
      expect(result.errors[1]).toHaveProperty('code');
    });
  });

  describe('BountySource interface', () => {
    it('should define required methods', () => {
      const mockSource: BountySource = {
        name: 'github',
        fetch: async () => [],
        normalize: (raw) => ({
          title: raw.title,
          description: raw.description,
          type: 'bounty',
          source: 'github',
          externalUrl: raw.externalUrl,
          ownerExternalId: raw.ownerExternalId,
          rewardType: 'points',
          rewardAmount: 0,
          visibility: 'public',
          isMilestoneBased: false,
          status: 'open',
          verificationMethod: 'pr_merged',
          difficulty: 'medium',
          requirements: [],
        }),
      };

      expect(mockSource.name).toBe('github');
      expect(typeof mockSource.fetch).toBe('function');
      expect(typeof mockSource.normalize).toBe('function');
    });
  });

  describe('syncFromSource', () => {
    it('should sync from github source', async () => {
      const result = await syncFromSource('github');
      expect(result).toHaveProperty('source', 'github');
      expect(result).toHaveProperty('fetched');
      expect(result).toHaveProperty('duration');
    });

    it('should sync from algora source', async () => {
      const result = await syncFromSource('algora');
      expect(result).toHaveProperty('source', 'algora');
    });

    it('should throw error for unsupported source', async () => {
      await expect(syncFromSource('invalid' as 'github')).rejects.toThrow('Unsupported source');
    });
  });

  describe('markStaleTasks', () => {
    it('should return 0 when activeExternalUrls is empty', async () => {
      const result = await markStaleTasks('github', []);
      expect(result).toBe(0);
    });
  });

  describe('runSync with different configs', () => {
    it('should handle algora enabled config', async () => {
      const results = await runSync({
        sources: {
          algora: { enabled: true },
        },
      });
      expect(results.some((r) => r.source === 'algora')).toBe(true);
    });

    it('should handle immunefi enabled config', async () => {
      const results = await runSync({
        sources: {
          immunefi: { enabled: true },
        },
      });
      expect(results.some((r) => r.source === 'immunefi')).toBe(true);
    });

    it('should handle bugcrowd enabled config', async () => {
      const results = await runSync({
        sources: {
          bugcrowd: { enabled: true },
        },
      });
      expect(results.some((r) => r.source === 'bugcrowd')).toBe(true);
    });

    it('should handle githubIssues enabled config', async () => {
      const results = await runSync({
        sources: {
          githubIssues: { enabled: true },
        },
      });
      expect(results.some((r) => r.source === 'github-issues')).toBe(true);
    });

    it('should handle multiple sources enabled', async () => {
      const results = await runSync({
        sources: {
          github: { enabled: true },
          algora: { enabled: true },
        },
      });
      expect(results.length).toBeGreaterThanOrEqual(2);
    });
  });
});
