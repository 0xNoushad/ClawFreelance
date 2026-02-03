import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Store original env
const originalEnv = { ...process.env };

describe('GitHub App Auth', () => {
  beforeEach(() => {
    vi.resetModules();
    // Clear env vars before each test
    delete process.env.GITHUB_APP_ID;
    delete process.env.GITHUB_APP_PRIVATE_KEY;
    delete process.env.GITHUB_TOKEN;
  });

  afterEach(() => {
    // Restore original env
    process.env = { ...originalEnv };
  });

  describe('isGitHubAppConfigured', () => {
    it('should return false when no credentials are set', async () => {
      const { isGitHubAppConfigured } = await import('./github-app-auth');
      expect(isGitHubAppConfigured()).toBe(false);
    });

    it('should return false when only app ID is set', async () => {
      process.env.GITHUB_APP_ID = '12345';
      const { isGitHubAppConfigured } = await import('./github-app-auth');
      expect(isGitHubAppConfigured()).toBe(false);
    });

    it('should return false when only private key is set', async () => {
      process.env.GITHUB_APP_PRIVATE_KEY = 'test-key';
      const { isGitHubAppConfigured } = await import('./github-app-auth');
      expect(isGitHubAppConfigured()).toBe(false);
    });

    it('should return true when both credentials are set', async () => {
      process.env.GITHUB_APP_ID = '12345';
      process.env.GITHUB_APP_PRIVATE_KEY = 'test-key';
      const { isGitHubAppConfigured } = await import('./github-app-auth');
      expect(isGitHubAppConfigured()).toBe(true);
    });
  });

  describe('getGitHubHeaders', () => {
    it('should return headers without auth when no credentials', async () => {
      const { getGitHubHeaders } = await import('./github-app-auth');
      const headers = getGitHubHeaders();

      expect(headers).toHaveProperty('Accept', 'application/vnd.github+json');
      expect(headers).toHaveProperty('X-GitHub-Api-Version', '2022-11-28');
      expect(headers).not.toHaveProperty('Authorization');
    });

    it('should use PAT when GITHUB_TOKEN is set', async () => {
      process.env.GITHUB_TOKEN = 'ghp_test123';
      const { getGitHubHeaders } = await import('./github-app-auth');
      const headers = getGitHubHeaders();

      expect(headers).toHaveProperty('Authorization', 'Bearer ghp_test123');
    });
  });

  describe('generateAppJwt', () => {
    it('should return null when no app credentials', async () => {
      const { generateAppJwt } = await import('./github-app-auth');
      expect(generateAppJwt()).toBeNull();
    });

    it('should return null with invalid private key', async () => {
      process.env.GITHUB_APP_ID = '12345';
      process.env.GITHUB_APP_PRIVATE_KEY = 'invalid-key';
      const { generateAppJwt } = await import('./github-app-auth');
      expect(generateAppJwt()).toBeNull();
    });
  });

  describe('getGitHubAuthHeader', () => {
    it('should return null when no auth configured', async () => {
      const { getGitHubAuthHeader } = await import('./github-app-auth');
      expect(getGitHubAuthHeader()).toBeNull();
    });

    it('should return PAT bearer token when GITHUB_TOKEN set', async () => {
      process.env.GITHUB_TOKEN = 'ghp_testtoken';
      const { getGitHubAuthHeader } = await import('./github-app-auth');
      expect(getGitHubAuthHeader()).toBe('Bearer ghp_testtoken');
    });
  });

  describe('getGitHubAuthHeaderAsync', () => {
    it('should return PAT auth when no app configured', async () => {
      process.env.GITHUB_TOKEN = 'ghp_testtoken';
      const { getGitHubAuthHeaderAsync } = await import('./github-app-auth');
      const result = await getGitHubAuthHeaderAsync();
      expect(result).toBe('Bearer ghp_testtoken');
    });

    it('should return null when no auth available', async () => {
      const { getGitHubAuthHeaderAsync } = await import('./github-app-auth');
      const result = await getGitHubAuthHeaderAsync();
      expect(result).toBeNull();
    });
  });

  describe('initGitHubAppAuth', () => {
    it('should return false when not configured', async () => {
      const { initGitHubAppAuth } = await import('./github-app-auth');
      const result = await initGitHubAppAuth();
      expect(result).toBe(false);
    });
  });

  describe('checkRateLimit', () => {
    const mockFetch = vi.fn();
    const originalFetch = global.fetch;

    beforeEach(() => {
      global.fetch = mockFetch;
      mockFetch.mockClear();
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('should return rate limit info on success', async () => {
      process.env.GITHUB_TOKEN = 'ghp_testtoken';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          resources: {
            core: {
              limit: 5000,
              remaining: 4999,
              reset: 1700000000,
            },
          },
        }),
      });

      const { checkRateLimit } = await import('./github-app-auth');
      const result = await checkRateLimit();

      expect(result).toEqual({
        limit: 5000,
        remaining: 4999,
        reset: new Date(1700000000 * 1000),
        resource: 'core',
      });
    });

    it('should return null on API error', async () => {
      process.env.GITHUB_TOKEN = 'ghp_testtoken';

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
      });

      const { checkRateLimit } = await import('./github-app-auth');
      const result = await checkRateLimit();

      expect(result).toBeNull();
    });

    it('should return null on network error', async () => {
      process.env.GITHUB_TOKEN = 'ghp_testtoken';

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { checkRateLimit } = await import('./github-app-auth');
      const result = await checkRateLimit();

      expect(result).toBeNull();
    });
  });
});
