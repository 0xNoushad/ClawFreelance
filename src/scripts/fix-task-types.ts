/**
 * Migration script to fix task types
 *
 * Tasks WITHOUT monetary rewards should be type='code_contribution'
 * Tasks WITH monetary rewards should remain type='bounty'
 * Exception: immunefi/bugcrowd are always security bounties
 *
 * Run with: bun db:fix-types
 */

// Load environment variables from .env.local
import { config } from 'dotenv';
config({ path: '.env.local' });

import { and, eq, notInArray, sql } from 'drizzle-orm';

import { db } from '../db';
import { tasks } from '../db/schema';

// These sources are always bounties (security programs)
const ALWAYS_BOUNTY_SOURCES = ['immunefi', 'bugcrowd'];

async function main() {
  console.log('=== Task Type Migration ===\n');

  // Count by type and source
  const distribution = await db
    .select({
      type: tasks.type,
      source: tasks.source,
      count: sql<number>`count(*)`,
    })
    .from(tasks)
    .groupBy(tasks.type, tasks.source);

  console.log('Current distribution by type and source:');
  for (const row of distribution) {
    console.log(`  ${row.source} / ${row.type}: ${row.count}`);
  }

  // Find tasks that should be code_contribution:
  // - rewardAmount = 0 or NULL
  // - rewardType = 'points'
  // - NOT from security bounty platforms (immunefi, bugcrowd)
  const misclassified = await db
    .select({ count: sql<number>`count(*)` })
    .from(tasks)
    .where(
      and(
        eq(tasks.type, 'bounty'),
        notInArray(tasks.source, ALWAYS_BOUNTY_SOURCES),
        sql`(${tasks.rewardAmount} = 0 OR ${tasks.rewardAmount} IS NULL OR ${tasks.rewardType} = 'points')`
      )
    );

  console.log(`\nTasks to update (non-paid, non-security): ${misclassified[0].count}`);

  if (misclassified[0].count > 0) {
    console.log('\nUpdating to type=code_contribution...');

    const result = await db
      .update(tasks)
      .set({ type: 'code_contribution', updatedAt: new Date() })
      .where(
        and(
          eq(tasks.type, 'bounty'),
          notInArray(tasks.source, ALWAYS_BOUNTY_SOURCES),
          sql`(${tasks.rewardAmount} = 0 OR ${tasks.rewardAmount} IS NULL OR ${tasks.rewardType} = 'points')`
        )
      )
      .returning({ id: tasks.id, source: tasks.source });

    console.log(`✓ Updated ${result.length} tasks`);

    // Count by source
    const bySource: Record<string, number> = {};
    for (const r of result) {
      bySource[r.source] = (bySource[r.source] || 0) + 1;
    }
    console.log('\nBy source:');
    for (const [source, count] of Object.entries(bySource)) {
      console.log(`  ${source}: ${count}`);
    }
  } else {
    console.log('No tasks need updating.');
  }

  // Final distribution
  console.log('\n=== Final Distribution ===');
  const finalCount = await db
    .select({
      type: tasks.type,
      count: sql<number>`count(*)`,
    })
    .from(tasks)
    .groupBy(tasks.type);

  for (const row of finalCount) {
    console.log(`  ${row.type}: ${row.count}`);
  }

  const total = await db.select({ count: sql<number>`count(*)` }).from(tasks);
  console.log(`\nTotal: ${total[0].count}`);

  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
