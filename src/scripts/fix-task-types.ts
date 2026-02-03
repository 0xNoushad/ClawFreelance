/**
 * Migration script to fix task types
 *
 * GitHub issues WITHOUT monetary rewards should be type='code_contribution'
 * GitHub issues WITH monetary rewards should remain type='bounty'
 *
 * Run with: bunx tsx src/scripts/fix-task-types.ts
 */

import { and, eq, sql } from 'drizzle-orm';

import { db } from '../db';
import { tasks } from '../db/schema';

async function main() {
  console.log('Checking current type distribution...\n');

  // Count by type
  const typeCount = await db
    .select({
      type: tasks.type,
      count: sql<number>`count(*)`,
    })
    .from(tasks)
    .groupBy(tasks.type);

  console.log('Current type distribution:');
  for (const row of typeCount) {
    console.log(`  ${row.type}: ${row.count}`);
  }

  // Count GitHub issues that should be code_contribution
  // (source='github' AND rewardAmount=0 or rewardType='points')
  const misclassified = await db
    .select({ count: sql<number>`count(*)` })
    .from(tasks)
    .where(
      and(
        eq(tasks.source, 'github'),
        eq(tasks.type, 'bounty'),
        sql`(${tasks.rewardAmount} = 0 OR ${tasks.rewardAmount} IS NULL OR ${tasks.rewardType} = 'points')`
      )
    );

  console.log(
    `\nGitHub issues misclassified as 'bounty' (should be 'code_contribution'): ${misclassified[0].count}`
  );

  if (misclassified[0].count > 0) {
    console.log('\nUpdating misclassified tasks...');

    const result = await db
      .update(tasks)
      .set({ type: 'code_contribution' })
      .where(
        and(
          eq(tasks.source, 'github'),
          eq(tasks.type, 'bounty'),
          sql`(${tasks.rewardAmount} = 0 OR ${tasks.rewardAmount} IS NULL OR ${tasks.rewardType} = 'points')`
        )
      )
      .returning({ id: tasks.id });

    console.log(`Updated ${result.length} tasks to type='code_contribution'`);
  }

  // Show updated distribution
  console.log('\nUpdated type distribution:');
  const updatedCount = await db
    .select({
      type: tasks.type,
      count: sql<number>`count(*)`,
    })
    .from(tasks)
    .groupBy(tasks.type);

  for (const row of updatedCount) {
    console.log(`  ${row.type}: ${row.count}`);
  }

  // Total count
  const total = await db.select({ count: sql<number>`count(*)` }).from(tasks);

  console.log(`\nTotal tasks in database: ${total[0].count}`);

  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
