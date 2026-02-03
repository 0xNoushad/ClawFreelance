/**
 * GitHub App Authentication
 *
 * Generates JWT tokens for GitHub App authentication, providing
 * 15,000+ requests/hour vs 5,000 with PAT or 60 unauthenticated.
 *
 * Environment variables:
 * - GITHUB_APP_ID: The App ID from GitHub App settings
 * - GITHUB_APP_PRIVATE_KEY: The private key (PEM format, can include \n)
 *
 * Falls back to GITHUB_TOKEN if App credentials aren't configured.
 *
 * @see https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app
 */

import jwt from 'jsonwebtoken';

interface GitHubAppConfig {
  appId: string;
  privateKey: string;
}

// Cache the JWT to avoid regenerating on every request
// JWTs are valid for up to 10 minutes, we regenerate at 9 minutes
let cachedJwt: { token: string; expiresAt: number } | null = null;

/**
 * Check if GitHub App credentials are configured
 */
export function isGitHubAppConfigured(): boolean {
  return !!(process.env.GITHUB_APP_ID && process.env.GITHUB_APP_PRIVATE_KEY);
}

/**
 * Get GitHub App configuration from environment
 */
function getAppConfig(): GitHubAppConfig | null {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;

  if (!appId || !privateKey) {
    return null;
  }

  // Handle escaped newlines in environment variable
  const formattedKey = privateKey.replace(/\\n/g, '\n');

  return { appId, privateKey: formattedKey };
}

/**
 * Generate a JWT for GitHub App authentication
 *
 * The JWT is used to authenticate as the GitHub App itself.
 * For accessing public repos, this JWT alone is sufficient.
 * For private repos, you'd need an installation access token.
 */
export function generateAppJwt(): string | null {
  const config = getAppConfig();
  if (!config) {
    return null;
  }

  // Check cache - reuse if not expired (with 1 minute buffer)
  const now = Math.floor(Date.now() / 1000);
  if (cachedJwt && cachedJwt.expiresAt > now + 60) {
    return cachedJwt.token;
  }

  // GitHub App JWTs are valid for max 10 minutes
  // We set expiry to 9 minutes to be safe
  const payload = {
    iat: now - 60, // Issued 60 seconds ago (clock skew buffer)
    exp: now + 9 * 60, // Expires in 9 minutes
    iss: config.appId,
  };

  try {
    const token = jwt.sign(payload, config.privateKey, { algorithm: 'RS256' });

    // Cache the token
    cachedJwt = {
      token,
      expiresAt: payload.exp,
    };

    return token;
  } catch (error) {
    console.error('[github-app] Failed to generate JWT:', error);
    return null;
  }
}

/**
 * Get the best available authorization header for GitHub API requests
 *
 * Priority:
 * 1. GitHub App JWT (15,000+ req/hr)
 * 2. Personal Access Token (5,000 req/hr)
 * 3. None (60 req/hr)
 */
export function getGitHubAuthHeader(): string | null {
  // Try GitHub App first
  const appJwt = generateAppJwt();
  if (appJwt) {
    return `Bearer ${appJwt}`;
  }

  // Fall back to PAT
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    return `Bearer ${token}`;
  }

  // No auth available
  return null;
}

/**
 * Get headers for GitHub API requests with the best available auth
 */
export function getGitHubHeaders(): HeadersInit {
  const headers: HeadersInit = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  const authHeader = getGitHubAuthHeader();
  if (authHeader) {
    headers.Authorization = authHeader;
  }

  return headers;
}

/**
 * Check current rate limit status
 * Useful for monitoring and debugging
 */
export async function checkRateLimit(): Promise<{
  limit: number;
  remaining: number;
  reset: Date;
  resource: string;
} | null> {
  try {
    const response = await fetch('https://api.github.com/rate_limit', {
      headers: getGitHubHeaders(),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const core = data.resources.core;

    return {
      limit: core.limit,
      remaining: core.remaining,
      reset: new Date(core.reset * 1000),
      resource: 'core',
    };
  } catch {
    return null;
  }
}
