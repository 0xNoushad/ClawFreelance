/**
 * Algora Bounty Fetcher
 *
 * Algora bounties are created on GitHub issues via `/bounty $X` comments.
 * This source tracks known Algora-active repositories and looks for
 * Algora-specific patterns in issues.
 *
 * Algora patterns:
 * - Comment: `/bounty $1000`
 * - Label: `💎 Bounty` or `algora`
 * - Title/body: Contains reward info from Algora bot
 */

import { getGitHubHeaders, isGitHubAppConfigured } from '../github-app-auth';
import type { BountySource, NormalizedTask, RawBounty } from '../types';

const GITHUB_API_BASE = 'https://api.github.com';

// Repositories known to use Algora for bounties
// These repos frequently post bounties via Algora's GitHub integration
export const ALGORA_REPOS = [
  // ZIO ecosystem
  'zio/zio',
  'zio/zio-blocks',

  // Golem Cloud
  'golemcloud/golem-cli',
  'golemcloud/golem-ai',

  // Other active Algora users
  'omnigres/omnigres',
  'Mudlet/Mudlet',
  'archestra-ai/archestra',
  'ether/etherpad-lite',
];

// Algora-specific labels
const ALGORA_LABELS = ['💎 Bounty', 'algora', 'bounty'];

interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  state: string;
  labels: Array<{ name: string; color: string }>;
  user: {
    login: string;
    id: number;
  };
  created_at: string;
  updated_at: string;
}

interface GitHubSearchResponse {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubIssue[];
}

interface AlgoraSourceConfig {
  enabled: boolean;
  repositories: string[];
  token?: string;
}

/**
 * Extract Algora bounty amount from issue body
 * Looks for patterns like:
 * - `/bounty $1000`
 * - `💎 $500 bounty`
 * - Algora bot comments with reward info
 */
function extractAlgoraReward(body: string | null): { amount: number; currency: string } | null {
  if (!body) return null;

  // Pattern: /bounty $X or 💎 $X
  const patterns = [
    /\/bounty\s+\$(\d+(?:,\d{3})*(?:\.\d+)?)/i,
    /💎\s*\$(\d+(?:,\d{3})*(?:\.\d+)?)/i,
    /bounty[:\s]+\$(\d+(?:,\d{3})*(?:\.\d+)?)/i,
    /reward[:\s]+\$(\d+(?:,\d{3})*(?:\.\d+)?)/i,
  ];

  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match) {
      return {
        amount: parseFloat(match[1].replace(/,/g, '')),
        currency: 'USD',
      };
    }
  }

  return null;
}

/**
 * Check if an issue is an Algora bounty
 */
function isAlgoraBounty(issue: GitHubIssue): boolean {
  // Check labels
  const hasAlgoraLabel = issue.labels.some((l) =>
    ALGORA_LABELS.some((al) => l.name.toLowerCase().includes(al.toLowerCase()))
  );

  if (hasAlgoraLabel) return true;

  // Check body for Algora patterns
  if (issue.body) {
    const hasAlgoraPattern =
      issue.body.includes('/bounty') ||
      issue.body.includes('💎') ||
      issue.body.toLowerCase().includes('algora');
    if (hasAlgoraPattern) return true;
  }

  return false;
}

export class AlgoraBountySource implements BountySource {
  readonly name = 'algora' as const;
  private config: AlgoraSourceConfig;

  constructor(config: Partial<AlgoraSourceConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      repositories: config.repositories || ALGORA_REPOS,
      token: config.token || process.env.GITHUB_TOKEN,
    };
  }

  private async fetchWithAuth(url: string): Promise<Response> {
    // Use centralized auth (GitHub App > PAT > unauthenticated)
    const headers = getGitHubHeaders();

    // Allow config token to override if explicitly set
    if (this.config.token && !isGitHubAppConfigured()) {
      headers.Authorization = `Bearer ${this.config.token}`;
    }

    return fetch(url, { headers });
  }

  private async fetchFromRepo(repo: string): Promise<RawBounty[]> {
    const bounties: RawBounty[] = [];
    const seenIssues = new Set<number>();

    for (const label of ALGORA_LABELS) {
      const query = encodeURIComponent(`repo:${repo} is:issue is:open label:"${label}"`);
      const url = `${GITHUB_API_BASE}/search/issues?q=${query}&per_page=50&sort=updated`;

      try {
        const response = await this.fetchWithAuth(url);

        if (!response.ok) {
          if (response.status === 403) {
            console.warn(`[algora] Rate limit hit for ${repo}`);
            return bounties;
          }
          continue;
        }

        const data: GitHubSearchResponse = await response.json();

        for (const issue of data.items) {
          if (seenIssues.has(issue.number)) continue;
          if (!isAlgoraBounty(issue)) continue;

          seenIssues.add(issue.number);

          bounties.push({
            source: 'algora',
            externalId: `algora-${repo}-${issue.number}`,
            externalUrl: issue.html_url,
            title: issue.title,
            description: issue.body || '',
            ownerExternalId: issue.user.login,
            ownerName: issue.user.login,
            labels: issue.labels.map((l) => l.name),
            createdAt: new Date(issue.created_at),
            updatedAt: new Date(issue.updated_at),
            raw: issue,
          });
        }

        await new Promise((resolve) => setTimeout(resolve, 50));
      } catch (error) {
        console.error(`[algora] Error fetching ${repo}:`, error);
      }
    }

    return bounties;
  }

  async fetch(): Promise<RawBounty[]> {
    if (!this.config.enabled) {
      return [];
    }

    const allBounties: RawBounty[] = [];

    for (const repo of this.config.repositories) {
      const bounties = await this.fetchFromRepo(repo);
      allBounties.push(...bounties);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return allBounties;
  }

  normalize(raw: RawBounty): NormalizedTask {
    const reward = extractAlgoraReward(raw.description);

    return {
      title: raw.title,
      description: raw.description,
      type: 'bounty',
      source: 'algora',
      externalUrl: raw.externalUrl,
      ownerExternalId: raw.ownerExternalId,
      rewardType: reward ? 'external' : 'points',
      rewardAmount: reward?.amount || 0,
      rewardCurrency: reward?.currency,
      visibility: 'public',
      isMilestoneBased: false,
      status: 'open',
      verificationMethod: 'pr_merged',
      difficulty: 'medium', // Algora doesn't provide difficulty info
      requirements: [],
      deadline: raw.deadline,
    };
  }
}

export function createAlgoraSource(customRepos?: string[]): AlgoraBountySource {
  return new AlgoraBountySource({
    token: process.env.GITHUB_TOKEN,
    repositories: customRepos || ALGORA_REPOS,
  });
}
