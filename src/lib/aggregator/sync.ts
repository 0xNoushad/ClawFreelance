/**
 * Bounty Sync Engine
 *
 * Handles fetching bounties from all sources, deduplication,
 * and persisting to the database.
 */

import { and, eq, sql } from 'drizzle-orm';

import { db } from '@/db';
import { tasks } from '@/db/schema';

import { createGitHubSource } from './sources/github';
import type { BountySource, SyncResult, TaskSource } from './types';

/**
 * Sync bounties from a single source to the database
 */
async function syncSource(source: BountySource): Promise<SyncResult> {
  const startTime = Date.now();
  const result: SyncResult = {
    source: source.name,
    fetched: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    duration: 0,
  };

  try {
    // Fetch all bounties from source
    const rawBounties = await source.fetch();
    result.fetched = rawBounties.length;

    for (const raw of rawBounties) {
      try {
        const normalized = source.normalize(raw);

        // Check if task already exists by external URL
        const existing = await db
          .select({ id: tasks.id, updatedAt: tasks.updatedAt })
          .from(tasks)
          .where(and(eq(tasks.externalUrl, raw.externalUrl), eq(tasks.source, source.name)))
          .limit(1);

        if (existing.length > 0) {
          // Update existing task if source was updated more recently
          const existingTask = existing[0];
          const sourceUpdated = raw.updatedAt || raw.createdAt;

          if (sourceUpdated > existingTask.updatedAt) {
            await db
              .update(tasks)
              .set({
                title: normalized.title,
                description: normalized.description,
                rewardAmount: normalized.rewardAmount,
                rewardCurrency: normalized.rewardCurrency,
                difficulty: normalized.difficulty,
                requirements: normalized.requirements,
                deadline: normalized.deadline,
                updatedAt: new Date(),
              })
              .where(eq(tasks.id, existingTask.id));
            result.updated++;
          } else {
            result.skipped++;
          }
        } else {
          // Create new task
          await db.insert(tasks).values({
            title: normalized.title,
            description: normalized.description,
            type: normalized.type,
            source: normalized.source,
            externalUrl: normalized.externalUrl,
            ownerExternalId: normalized.ownerExternalId,
            rewardType: normalized.rewardType,
            rewardAmount: normalized.rewardAmount,
            rewardCurrency: normalized.rewardCurrency,
            visibility: normalized.visibility,
            isMilestoneBased: normalized.isMilestoneBased,
            status: normalized.status,
            verificationMethod: normalized.verificationMethod,
            difficulty: normalized.difficulty,
            requirements: normalized.requirements,
            deadline: normalized.deadline,
          });
          result.created++;
        }
      } catch (error) {
        result.errors.push({
          externalId: raw.externalId,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  } catch (error) {
    result.errors.push({
      externalId: 'source-fetch',
      message: error instanceof Error ? error.message : 'Failed to fetch from source',
    });
  }

  result.duration = Date.now() - startTime;
  return result;
}

/**
 * Configuration for the sync engine
 */
export interface SyncConfig {
  sources?: {
    github?: {
      enabled?: boolean;
      repositories?: string[];
    };
    gitcoin?: {
      enabled?: boolean;
    };
    algora?: {
      enabled?: boolean;
    };
  };
}

/**
 * Run a full sync across all enabled sources
 */
export async function runSync(config: SyncConfig = {}): Promise<SyncResult[]> {
  const results: SyncResult[] = [];
  const sources: BountySource[] = [];

  // Initialize GitHub source
  const githubConfig = config.sources?.github;
  if (githubConfig?.enabled !== false) {
    sources.push(createGitHubSource(githubConfig?.repositories));
  }

  // TODO: Add Gitcoin source
  // TODO: Add Algora source

  // Sync each source
  for (const source of sources) {
    const result = await syncSource(source);
    results.push(result);
    console.log(
      `[sync] ${source.name}: fetched=${result.fetched} created=${result.created} updated=${result.updated} errors=${result.errors.length}`
    );
  }

  return results;
}

/**
 * Sync bounties from a specific source only
 */
export async function syncFromSource(
  sourceName: TaskSource,
  config?: SyncConfig
): Promise<SyncResult> {
  let source: BountySource;

  switch (sourceName) {
    case 'github':
      source = createGitHubSource(config?.sources?.github?.repositories);
      break;
    default:
      throw new Error(`Unsupported source: ${sourceName}`);
  }

  return syncSource(source);
}

/**
 * Mark stale external tasks as cancelled
 * (Tasks that no longer exist at the source)
 */
export async function markStaleTasks(
  sourceName: TaskSource,
  activeExternalUrls: string[]
): Promise<void> {
  if (activeExternalUrls.length === 0) {
    return;
  }

  // Find tasks from this source that are not in the active list
  await db
    .update(tasks)
    .set({
      status: 'cancelled',
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(tasks.source, sourceName),
        eq(tasks.status, 'open'),
        sql`${tasks.externalUrl} NOT IN ${activeExternalUrls}`
      )
    );
}

/**
 * Get sync statistics
 */
export async function getSyncStats(): Promise<{
  totalTasks: number;
  bySource: Record<string, number>;
  lastSync?: Date;
}> {
  const sourceStats = await db
    .select({
      source: tasks.source,
      count: sql<number>`count(*)`,
    })
    .from(tasks)
    .groupBy(tasks.source);

  const bySource: Record<string, number> = {};
  let total = 0;

  for (const stat of sourceStats) {
    bySource[stat.source] = Number(stat.count);
    total += Number(stat.count);
  }

  return {
    totalTasks: total,
    bySource,
  };
}
