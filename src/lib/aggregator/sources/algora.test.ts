import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ALGORA_REPOS, AlgoraBountySource } from './algora';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('AlgoraBountySource', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should use default config when none provided', () => {
      const source = new AlgoraBountySource();
      expect(source.name).toBe('algora');
    });

    it('should accept custom repositories', () => {
      const source = new AlgoraBountySource({
        repositories: ['custom/repo1', 'custom/repo2'],
      });
      expect(source.name).toBe('algora');
    });
  });

  describe('fetch', () => {
    it('should return empty array when disabled', async () => {
      const source = new AlgoraBountySource({ enabled: false });
      const result = await source.fetch();
      expect(result).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should fetch Algora bounties from configured repositories', async () => {
      const mockIssue = {
        id: 456,
        number: 101,
        title: 'Implement new feature',
        body: '/bounty $500\n\nPlease implement this feature...',
        html_url: 'https://github.com/zio/zio/issues/101',
        state: 'open',
        labels: [{ name: '💎 Bounty', color: 'ff0000' }],
        user: { login: 'ziodev', id: 2 },
        created_at: '2025-01-15T10:00:00Z',
        updated_at: '2025-01-20T15:00:00Z',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          total_count: 1,
          incomplete_results: false,
          items: [mockIssue],
        }),
      });

      const source = new AlgoraBountySource({
        repositories: ['zio/zio'],
      });

      const result = await source.fetch();

      expect(mockFetch).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        source: 'algora',
        externalId: 'algora-zio/zio-101',
        externalUrl: 'https://github.com/zio/zio/issues/101',
        title: 'Implement new feature',
        ownerExternalId: 'ziodev',
      });
    });

    it('should handle rate limits gracefully', async () => {
      // All label requests return 403
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
      });

      const source = new AlgoraBountySource({
        repositories: ['test/repo'],
      });

      const result = await source.fetch();
      expect(result).toEqual([]);
    });

    it('should handle network errors gracefully', async () => {
      // All label requests fail with network error
      mockFetch.mockRejectedValue(new Error('Network error'));

      const source = new AlgoraBountySource({
        repositories: ['test/repo'],
      });

      const result = await source.fetch();
      expect(result).toEqual([]);
    });
  });

  describe('normalize', () => {
    it('should normalize raw Algora bounty to task format', () => {
      const source = new AlgoraBountySource();
      const raw = {
        source: 'algora' as const,
        externalId: 'algora-zio/zio-101',
        externalUrl: 'https://github.com/zio/zio/issues/101',
        title: 'Implement new feature',
        description: '/bounty $500\n\nPlease implement this feature...',
        ownerExternalId: 'ziodev',
        ownerName: 'ziodev',
        labels: ['💎 Bounty'],
        createdAt: new Date('2025-01-15T10:00:00Z'),
        updatedAt: new Date('2025-01-20T15:00:00Z'),
        raw: {},
      };

      const normalized = source.normalize(raw);

      expect(normalized).toMatchObject({
        title: 'Implement new feature',
        type: 'bounty',
        source: 'algora',
        externalUrl: 'https://github.com/zio/zio/issues/101',
        ownerExternalId: 'ziodev',
        rewardType: 'external',
        rewardAmount: 500,
        rewardCurrency: 'USD',
        visibility: 'public',
        status: 'open',
        verificationMethod: 'pr_merged',
        difficulty: 'medium',
      });
    });

    it('should extract reward from /bounty $X pattern', () => {
      const source = new AlgoraBountySource();
      const raw = {
        source: 'algora' as const,
        externalId: 'test-1',
        externalUrl: 'https://github.com/test/repo/issues/1',
        title: 'Test',
        description: '/bounty $1000\n\nSome description here',
        ownerExternalId: 'user',
        labels: [],
        createdAt: new Date(),
        raw: {},
      };

      const normalized = source.normalize(raw);
      expect(normalized.rewardAmount).toBe(1000);
      expect(normalized.rewardCurrency).toBe('USD');
    });

    it('should extract reward from 💎 emoji pattern', () => {
      const source = new AlgoraBountySource();
      const raw = {
        source: 'algora' as const,
        externalId: 'test-1',
        externalUrl: 'https://github.com/test/repo/issues/1',
        title: 'Test',
        description: '💎 $250 bounty for this task',
        ownerExternalId: 'user',
        labels: [],
        createdAt: new Date(),
        raw: {},
      };

      const normalized = source.normalize(raw);
      expect(normalized.rewardAmount).toBe(250);
      expect(normalized.rewardCurrency).toBe('USD');
    });

    it('should default to points when no Algora reward found', () => {
      const source = new AlgoraBountySource();
      const raw = {
        source: 'algora' as const,
        externalId: 'test-1',
        externalUrl: 'https://github.com/test/repo/issues/1',
        title: 'Test',
        description: 'Simple feature request without bounty info',
        ownerExternalId: 'user',
        labels: ['💎 Bounty'],
        createdAt: new Date(),
        raw: {},
      };

      const normalized = source.normalize(raw);
      expect(normalized.rewardType).toBe('points');
      expect(normalized.rewardAmount).toBe(0);
    });
  });

  describe('ALGORA_REPOS', () => {
    it('should contain well-known Algora-active repositories', () => {
      expect(ALGORA_REPOS).toContain('zio/zio');
      expect(ALGORA_REPOS).toContain('golemcloud/golem-cli');
      expect(ALGORA_REPOS).toContain('omnigres/omnigres');
    });

    it('should have valid repo format (owner/name)', () => {
      for (const repo of ALGORA_REPOS) {
        expect(repo).toMatch(/^[\w-]+\/[\w.-]+$/);
      }
    });
  });
});
