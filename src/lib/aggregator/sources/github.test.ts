import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GitHubBountySource, POPULAR_BOUNTY_REPOS } from './github';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('GitHubBountySource', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should use default config when none provided', () => {
      const source = new GitHubBountySource();
      expect(source.name).toBe('github');
    });

    it('should accept custom repositories', () => {
      const source = new GitHubBountySource({
        repositories: ['custom/repo1', 'custom/repo2'],
      });
      expect(source.name).toBe('github');
    });

    it('should accept custom bounty labels', () => {
      const source = new GitHubBountySource({
        bountyLabels: ['custom-bounty', 'reward'],
      });
      expect(source.name).toBe('github');
    });
  });

  describe('fetch', () => {
    it('should return empty array when disabled', async () => {
      const source = new GitHubBountySource({ enabled: false });
      const result = await source.fetch();
      expect(result).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should fetch issues from configured repositories', async () => {
      const mockIssue = {
        id: 123,
        number: 42,
        title: 'Fix authentication bug',
        body: 'This is a bounty worth $500 USD',
        html_url: 'https://github.com/test/repo/issues/42',
        state: 'open',
        labels: [{ name: 'bounty', color: 'ff0000' }],
        user: { login: 'testuser', id: 1 },
        created_at: '2025-01-15T10:00:00Z',
        updated_at: '2025-01-20T15:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          total_count: 1,
          incomplete_results: false,
          items: [mockIssue],
        }),
      });

      const source = new GitHubBountySource({
        repositories: ['test/repo'],
        bountyLabels: ['bounty'],
      });

      const result = await source.fetch();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        source: 'github',
        externalId: 'github-test/repo-42',
        externalUrl: 'https://github.com/test/repo/issues/42',
        title: 'Fix authentication bug',
        ownerExternalId: 'testuser',
      });
    });

    it('should handle API rate limits gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
      });

      const source = new GitHubBountySource({
        repositories: ['test/repo'],
      });

      const result = await source.fetch();
      expect(result).toEqual([]);
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const source = new GitHubBountySource({
        repositories: ['test/repo'],
      });

      const result = await source.fetch();
      expect(result).toEqual([]);
    });

    it('should handle network failures gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const source = new GitHubBountySource({
        repositories: ['test/repo'],
      });

      const result = await source.fetch();
      expect(result).toEqual([]);
    });
  });

  describe('normalize', () => {
    it('should normalize raw bounty to task format', () => {
      const source = new GitHubBountySource();
      const raw = {
        source: 'github' as const,
        externalId: 'github-test/repo-42',
        externalUrl: 'https://github.com/test/repo/issues/42',
        title: 'Fix authentication bug',
        description: 'This is a bounty worth $500 USD for fixing the auth bug',
        ownerExternalId: 'testuser',
        ownerName: 'testuser',
        labels: ['bounty', 'typescript', 'backend'],
        createdAt: new Date('2025-01-15T10:00:00Z'),
        updatedAt: new Date('2025-01-20T15:00:00Z'),
        raw: {},
      };

      const normalized = source.normalize(raw);

      expect(normalized).toMatchObject({
        title: 'Fix authentication bug',
        type: 'bounty',
        source: 'github',
        externalUrl: 'https://github.com/test/repo/issues/42',
        ownerExternalId: 'testuser',
        rewardType: 'external',
        rewardAmount: 500,
        rewardCurrency: 'USD',
        visibility: 'public',
        status: 'open',
        verificationMethod: 'pr_merged',
      });
    });

    it('should extract reward from title bracket format [$250]', () => {
      const source = new GitHubBountySource();
      const raw = {
        source: 'github' as const,
        externalId: 'test-1',
        externalUrl: 'https://github.com/test/repo/issues/1',
        title: '[$250] Fix the authentication bug',
        description: 'Some description without reward info',
        ownerExternalId: 'user',
        labels: [],
        createdAt: new Date(),
        raw: {},
      };

      const normalized = source.normalize(raw);
      expect(normalized.rewardAmount).toBe(250);
      expect(normalized.rewardCurrency).toBe('USD');
    });

    it('should extract USD reward from body', () => {
      const source = new GitHubBountySource();
      const raw = {
        source: 'github' as const,
        externalId: 'test-1',
        externalUrl: 'https://github.com/test/repo/issues/1',
        title: 'Test',
        description: 'Reward: $1,000 USD for completing this task',
        ownerExternalId: 'user',
        labels: [],
        createdAt: new Date(),
        raw: {},
      };

      const normalized = source.normalize(raw);
      expect(normalized.rewardAmount).toBe(1000);
      expect(normalized.rewardCurrency).toBe('USD');
    });

    it('should extract ETH reward from body', () => {
      const source = new GitHubBountySource();
      const raw = {
        source: 'github' as const,
        externalId: 'test-1',
        externalUrl: 'https://github.com/test/repo/issues/1',
        title: 'Test',
        description: 'Bounty: 0.5 ETH for this feature',
        ownerExternalId: 'user',
        labels: [],
        createdAt: new Date(),
        raw: {},
      };

      const normalized = source.normalize(raw);
      expect(normalized.rewardAmount).toBe(0.5);
      expect(normalized.rewardCurrency).toBe('ETH');
    });

    it('should default to points when no reward found', () => {
      const source = new GitHubBountySource();
      const raw = {
        source: 'github' as const,
        externalId: 'test-1',
        externalUrl: 'https://github.com/test/repo/issues/1',
        title: 'Test',
        description: 'Simple feature request',
        ownerExternalId: 'user',
        labels: [],
        createdAt: new Date(),
        raw: {},
      };

      const normalized = source.normalize(raw);
      expect(normalized.rewardType).toBe('points');
      expect(normalized.rewardAmount).toBe(0);
    });

    it('should infer easy difficulty from labels', () => {
      const source = new GitHubBountySource();
      const raw = {
        source: 'github' as const,
        externalId: 'test-1',
        externalUrl: 'https://github.com/test/repo/issues/1',
        title: 'Test',
        description: 'Description',
        ownerExternalId: 'user',
        labels: ['good first issue', 'bounty'],
        createdAt: new Date(),
        raw: {},
      };

      const normalized = source.normalize(raw);
      expect(normalized.difficulty).toBe('easy');
    });

    it('should infer hard difficulty from labels', () => {
      const source = new GitHubBountySource();
      const raw = {
        source: 'github' as const,
        externalId: 'test-1',
        externalUrl: 'https://github.com/test/repo/issues/1',
        title: 'Test',
        description: 'Description',
        ownerExternalId: 'user',
        labels: ['hard', 'expert', 'bounty'],
        createdAt: new Date(),
        raw: {},
      };

      const normalized = source.normalize(raw);
      expect(normalized.difficulty).toBe('hard');
    });

    it('should extract tech requirements from labels', () => {
      const source = new GitHubBountySource();
      const raw = {
        source: 'github' as const,
        externalId: 'test-1',
        externalUrl: 'https://github.com/test/repo/issues/1',
        title: 'Test',
        description: 'Description',
        ownerExternalId: 'user',
        labels: ['typescript', 'react', 'frontend'],
        createdAt: new Date(),
        raw: {},
      };

      const normalized = source.normalize(raw);
      expect(normalized.requirements).toContain('typescript');
      expect(normalized.requirements).toContain('react');
      expect(normalized.requirements).toContain('frontend');
    });
  });

  describe('POPULAR_BOUNTY_REPOS', () => {
    it('should contain well-known bounty repositories', () => {
      // Web3/Blockchain
      expect(POPULAR_BOUNTY_REPOS).toContain('ethereum/go-ethereum');
      expect(POPULAR_BOUNTY_REPOS).toContain('bitcoin/bitcoin');
      expect(POPULAR_BOUNTY_REPOS).toContain('solana-labs/solana');

      // Open source apps (cal.com ecosystem)
      expect(POPULAR_BOUNTY_REPOS).toContain('calcom/cal.com');
      expect(POPULAR_BOUNTY_REPOS).toContain('twentyhq/twenty');
      expect(POPULAR_BOUNTY_REPOS).toContain('supabase/supabase');

      // Developer tools
      expect(POPULAR_BOUNTY_REPOS).toContain('vercel/next.js');

      // Should have significant coverage
      expect(POPULAR_BOUNTY_REPOS.length).toBeGreaterThan(50);
    });

    it('should have valid repo format (owner/name)', () => {
      for (const repo of POPULAR_BOUNTY_REPOS) {
        expect(repo).toMatch(/^[\w-]+\/[\w.-]+$/);
      }
    });
  });
});
