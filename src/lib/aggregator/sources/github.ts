/**
 * GitHub Issues Bounty Fetcher
 *
 * Fetches issues from GitHub repositories that are labeled as bounties.
 * Supports configurable repositories and bounty label detection.
 */

import type { BountySource, GitHubSourceConfig, NormalizedTask, RawBounty } from '../types';

const GITHUB_API_BASE = 'https://api.github.com';

// Common bounty label patterns (case-insensitive matching)
const DEFAULT_BOUNTY_LABELS = [
  'bounty',
  'help wanted',
  'good first issue',
  'paid',
  'reward',
  'money',
  'gitcoin',
  'funding',
];

// Well-known repositories with bounty programs
export const POPULAR_BOUNTY_REPOS = [
  'anthropics/anthropic-cookbook',
  'ethereum/go-ethereum',
  'bitcoin/bitcoin',
  'NomicFoundation/hardhat',
  'foundry-rs/foundry',
  'paradigmxyz/reth',
  'matter-labs/zksync-era',
  'scroll-tech/scroll',
  'base-org/node',
  'solana-labs/solana',
  'aptos-labs/aptos-core',
];

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
  milestone?: {
    due_on: string | null;
  };
}

interface GitHubSearchResponse {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubIssue[];
}

/**
 * Extracts reward amount from issue body or labels
 * Looks for patterns like "$100", "100 USD", "0.1 ETH", etc.
 */
function extractReward(
  body: string | null,
  labels: Array<{ name: string }>
): { amount: number; currency: string } | null {
  if (!body) return null;

  // Check labels first for explicit reward amounts
  for (const label of labels) {
    const labelMatch = label.name.match(/\$?(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(USD|USDC|ETH|BTC)?/i);
    if (labelMatch) {
      return {
        amount: parseFloat(labelMatch[1].replace(/,/g, '')),
        currency: labelMatch[2]?.toUpperCase() || 'USD',
      };
    }
  }

  // Patterns to match in body (crypto first since they're more specific)
  const patterns = [
    /(\d+(?:\.\d+)?)\s*(ETH|BTC|SOL)/i,
    /reward[:\s]*\$?(\d+(?:,\d{3})*(?:\.\d+)?)\s*(USD|USDC|USDT)?/i,
    /bounty[:\s]*\$?(\d+(?:,\d{3})*(?:\.\d+)?)\s*(USD|USDC|USDT)?/i,
    /\$(\d+(?:,\d{3})*(?:\.\d+)?)\s*(USD|USDC|USDT)?/i,
  ];

  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match) {
      return {
        amount: parseFloat(match[1].replace(/,/g, '')),
        currency: match[2]?.toUpperCase() || 'USD',
      };
    }
  }

  return null;
}

/**
 * Infers difficulty from labels and issue content
 */
function inferDifficulty(
  labels: Array<{ name: string }>,
  body: string | null
): 'easy' | 'medium' | 'hard' {
  const labelNames = labels.map((l) => l.name.toLowerCase());

  if (
    labelNames.some((l) =>
      ['good first issue', 'beginner', 'easy', 'starter', 'trivial'].includes(l)
    )
  ) {
    return 'easy';
  }

  if (labelNames.some((l) => ['hard', 'difficult', 'complex', 'expert', 'advanced'].includes(l))) {
    return 'hard';
  }

  // Check body for complexity indicators
  if (body) {
    const lowerBody = body.toLowerCase();
    if (
      lowerBody.includes('simple fix') ||
      lowerBody.includes('quick fix') ||
      lowerBody.includes('typo')
    ) {
      return 'easy';
    }
    if (
      lowerBody.includes('architecture') ||
      lowerBody.includes('refactor') ||
      lowerBody.includes('redesign')
    ) {
      return 'hard';
    }
  }

  return 'medium';
}

/**
 * Extracts requirements from labels
 */
function extractRequirements(labels: Array<{ name: string }>): string[] {
  const requirements: string[] = [];
  const labelNames = labels.map((l) => l.name.toLowerCase());

  // Language/tech requirements
  const techLabels = [
    'typescript',
    'javascript',
    'rust',
    'python',
    'go',
    'solidity',
    'react',
    'node',
    'web3',
  ];
  for (const tech of techLabels) {
    if (labelNames.some((l) => l.includes(tech))) {
      requirements.push(tech);
    }
  }

  // Area requirements
  if (labelNames.some((l) => l.includes('frontend'))) {
    requirements.push('frontend');
  }
  if (labelNames.some((l) => l.includes('backend'))) {
    requirements.push('backend');
  }
  if (labelNames.some((l) => l.includes('smart contract'))) {
    requirements.push('smart-contracts');
  }
  if (labelNames.some((l) => l.includes('documentation') || l.includes('docs'))) {
    requirements.push('documentation');
  }
  if (labelNames.some((l) => l.includes('test'))) {
    requirements.push('testing');
  }

  return requirements;
}

export class GitHubBountySource implements BountySource {
  readonly name = 'github' as const;
  private config: GitHubSourceConfig;

  constructor(config: Partial<GitHubSourceConfig> = {}) {
    this.config = {
      enabled: true,
      repositories: config.repositories || POPULAR_BOUNTY_REPOS,
      bountyLabels: config.bountyLabels || DEFAULT_BOUNTY_LABELS,
      token: config.token || process.env.GITHUB_TOKEN,
      ...config,
    };
  }

  private async fetchWithAuth(url: string): Promise<Response> {
    const headers: HeadersInit = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    if (this.config.token) {
      headers.Authorization = `Bearer ${this.config.token}`;
    }

    return fetch(url, { headers });
  }

  /**
   * Fetch bounty issues from a single repository
   */
  private async fetchFromRepo(repo: string): Promise<RawBounty[]> {
    const bounties: RawBounty[] = [];
    const labelQuery = this.config.bountyLabels.map((l) => `label:"${l}"`).join(' OR ');

    const query = encodeURIComponent(`repo:${repo} is:issue is:open (${labelQuery})`);
    const url = `${GITHUB_API_BASE}/search/issues?q=${query}&per_page=100&sort=updated`;

    try {
      const response = await this.fetchWithAuth(url);

      if (!response.ok) {
        if (response.status === 403) {
          console.warn(`GitHub rate limit hit for ${repo}`);
          return [];
        }
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data: GitHubSearchResponse = await response.json();

      for (const issue of data.items) {
        bounties.push({
          source: 'github',
          externalId: `github-${repo}-${issue.number}`,
          externalUrl: issue.html_url,
          title: issue.title,
          description: issue.body || '',
          ownerExternalId: issue.user.login,
          ownerName: issue.user.login,
          labels: issue.labels.map((l) => l.name),
          createdAt: new Date(issue.created_at),
          updatedAt: new Date(issue.updated_at),
          deadline: issue.milestone?.due_on ? new Date(issue.milestone.due_on) : undefined,
          raw: issue,
        });
      }
    } catch (error) {
      console.error(`Error fetching from ${repo}:`, error);
    }

    return bounties;
  }

  /**
   * Fetch bounties from all configured repositories
   */
  async fetch(): Promise<RawBounty[]> {
    if (!this.config.enabled) {
      return [];
    }

    const allBounties: RawBounty[] = [];

    // Fetch from repositories sequentially to respect rate limits
    for (const repo of this.config.repositories) {
      const bounties = await this.fetchFromRepo(repo);
      allBounties.push(...bounties);

      // Small delay between repos to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return allBounties;
  }

  /**
   * Normalize a raw GitHub bounty into a ClawFreelance task
   */
  normalize(raw: RawBounty): NormalizedTask {
    const labels = raw.labels || [];
    const labelObjects = labels.map((name) => ({ name }));
    const reward = extractReward(raw.description, labelObjects);

    return {
      title: raw.title,
      description: raw.description,
      type: 'bounty',
      source: 'github',
      externalUrl: raw.externalUrl,
      ownerExternalId: raw.ownerExternalId,
      rewardType: reward ? 'external' : 'points',
      rewardAmount: reward?.amount || 0,
      rewardCurrency: reward?.currency,
      visibility: 'public',
      isMilestoneBased: false,
      status: 'open',
      verificationMethod: 'pr_merged',
      difficulty: inferDifficulty(labelObjects, raw.description),
      requirements: extractRequirements(labelObjects),
      deadline: raw.deadline,
    };
  }
}

/**
 * Create a GitHub source with environment-based configuration
 */
export function createGitHubSource(customRepos?: string[]): GitHubBountySource {
  return new GitHubBountySource({
    token: process.env.GITHUB_TOKEN,
    repositories: customRepos || POPULAR_BOUNTY_REPOS,
  });
}
