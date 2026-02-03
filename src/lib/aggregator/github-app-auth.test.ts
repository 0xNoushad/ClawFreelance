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
});
