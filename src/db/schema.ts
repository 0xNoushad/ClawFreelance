import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

// Enums
export const agentStatusEnum = pgEnum('agent_status', ['active', 'suspended', 'banned']);
export const agentSourceEnum = pgEnum('agent_source', ['openclaw', 'cloud', 'anonymous']);

export const taskTypeEnum = pgEnum('task_type', ['code_contribution', 'bounty', 'showcase']);
export const taskStatusEnum = pgEnum('task_status', [
  'open',
  'claimed',
  'in_progress',
  'verification',
  'completed',
  'disputed',
  'cancelled',
]);
export const taskSourceEnum = pgEnum('task_source', [
  'direct',
  'github',
  'gitcoin',
  'algora',
  'immunefi',
  'bugcrowd',
  'agent_discovered',
]);
export const verificationMethodEnum = pgEnum('verification_method', [
  'pr_merged',
  'owner_approval',
  'tests_pass',
  'peer_review',
]);
export const difficultyEnum = pgEnum('difficulty', ['easy', 'medium', 'hard']);
export const rewardTypeEnum = pgEnum('reward_type', ['crypto', 'external', 'points']);
export const taskVisibilityEnum = pgEnum('task_visibility', ['public', 'private', 'unlisted']);

export const claimStatusEnum = pgEnum('claim_status', [
  'active',
  'completed',
  'abandoned',
  'rejected',
]);
export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'escrow',
  'released',
  'refunded',
]);
export const milestoneStatusEnum = pgEnum('milestone_status', [
  'pending',
  'in_progress',
  'verification',
  'completed',
  'disputed',
]);
export const claimModeEnum = pgEnum('claim_mode', ['exclusive', 'competitive']);
export const verificationStatusEnum = pgEnum('verification_status', [
  'pending',
  'approved',
  'rejected',
  'auto_verified',
]);
export const reputationEventTypeEnum = pgEnum('reputation_event_type', [
  'task_completed',
  'task_failed',
  'peer_review',
  'dispute_won',
  'dispute_lost',
]);

// Tables
export const agents = pgTable('agents', {
  id: uuid('id').primaryKey().defaultRandom(),
  publicKey: text('public_key').notNull().unique(),
  walletAddress: varchar('wallet_address', { length: 255 }),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  capabilities: jsonb('capabilities').$type<string[]>().default([]),
  reputationScore: integer('reputation_score').default(0).notNull(),
  status: agentStatusEnum('status').default('active').notNull(),
  source: agentSourceEnum('source').default('openclaw').notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: varchar('title', { length: 500 }).notNull(),
    description: text('description').notNull(),
    type: taskTypeEnum('type').default('bounty').notNull(),
    source: taskSourceEnum('source').default('direct').notNull(),
    externalUrl: text('external_url'),
    ownerId: uuid('owner_id').references(() => agents.id),
    ownerExternalId: varchar('owner_external_id', { length: 255 }),
    rewardType: rewardTypeEnum('reward_type').default('points').notNull(),
    rewardAmount: integer('reward_amount').default(0).notNull(),
    rewardCurrency: varchar('reward_currency', { length: 50 }),
    visibility: taskVisibilityEnum('visibility').default('public').notNull(),
    isMilestoneBased: boolean('is_milestone_based').default(false).notNull(),
    status: taskStatusEnum('status').default('open').notNull(),
    verificationMethod: verificationMethodEnum('verification_method')
      .default('owner_approval')
      .notNull(),
    difficulty: difficultyEnum('difficulty').default('medium').notNull(),
    requirements: jsonb('requirements').$type<string[]>().default([]),
    claimMode: claimModeEnum('claim_mode').default('exclusive').notNull(),
    maxClaims: integer('max_claims'),
    deadline: timestamp('deadline'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    // Unique constraint for UPSERT on external tasks
    uniqueIndex('tasks_external_url_source_idx').on(table.externalUrl, table.source),
  ]
);

export const taskMilestones = pgTable('task_milestones', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id')
    .references(() => tasks.id, { onDelete: 'cascade' })
    .notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  percentage: integer('percentage').notNull(), // Percentage of total reward
  status: milestoneStatusEnum('status').default('pending').notNull(),
  order: integer('order').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const taskInvites = pgTable('task_invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id')
    .references(() => tasks.id, { onDelete: 'cascade' })
    .notNull(),
  agentId: uuid('agent_id').references(() => agents.id, { onDelete: 'cascade' }),
  inviteCode: varchar('invite_code', { length: 255 }).unique(),
  expiresAt: timestamp('expires_at'),
  maxUses: integer('max_uses').default(1).notNull(),
  uses: integer('uses').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const taskClaims = pgTable('task_claims', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id')
    .references(() => tasks.id, { onDelete: 'cascade' })
    .notNull(),
  agentId: uuid('agent_id')
    .references(() => agents.id, { onDelete: 'cascade' })
    .notNull(),
  status: claimStatusEnum('status').default('active').notNull(),
  proposal: text('proposal'),
  greenlighted: boolean('greenlighted').default(false).notNull(),
  submissionUrl: text('submission_url'),
  submissionNotes: text('submission_notes'),
  verificationResult: jsonb('verification_result').$type<Record<string, unknown>>(),
  claimedAt: timestamp('claimed_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
});

export const taskSubmissions = pgTable('task_submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  claimId: uuid('claim_id')
    .references(() => taskClaims.id, { onDelete: 'cascade' })
    .notNull(),
  taskId: uuid('task_id')
    .references(() => tasks.id, { onDelete: 'cascade' })
    .notNull(),
  agentId: uuid('agent_id')
    .references(() => agents.id, { onDelete: 'cascade' })
    .notNull(),
  submissionUrl: text('submission_url').notNull(),
  submissionNotes: text('submission_notes'),
  artifacts: jsonb('artifacts').$type<Record<string, string>>().default({}),
  verificationMethod: verificationMethodEnum('verification_method').notNull(),
  verificationStatus: verificationStatusEnum('verification_status').default('pending').notNull(),
  verificationResult: jsonb('verification_result').$type<Record<string, unknown>>().default({}),
  reviewedBy: uuid('reviewed_by').references(() => agents.id, { onDelete: 'set null' }),
  reviewedAt: timestamp('reviewed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const reputationEvents = pgTable('reputation_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id')
    .references(() => agents.id, { onDelete: 'cascade' })
    .notNull(),
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'set null' }),
  eventType: reputationEventTypeEnum('event_type').notNull(),
  pointsDelta: integer('points_delta').notNull(),
  reason: text('reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id')
    .references(() => tasks.id, { onDelete: 'cascade' })
    .notNull(),
  agentId: uuid('agent_id')
    .references(() => agents.id, { onDelete: 'cascade' })
    .notNull(),
  milestoneId: uuid('milestone_id').references(() => taskMilestones.id, { onDelete: 'set null' }),
  amount: integer('amount').notNull(),
  currency: varchar('currency', { length: 50 }).notNull(),
  status: paymentStatusEnum('status').default('pending').notNull(),
  txHash: varchar('tx_hash', { length: 255 }),
  escrowAddress: varchar('escrow_address', { length: 255 }),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id')
    .references(() => agents.id, { onDelete: 'cascade' })
    .notNull(),
  keyHash: varchar('key_hash', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  permissions: jsonb('permissions').$type<string[]>().default(['read']),
  lastUsedAt: timestamp('last_used_at'),
  expiresAt: timestamp('expires_at'),
  revoked: boolean('revoked').default(false).notNull(),
  revokedAt: timestamp('revoked_at'),
  gracePeriodEndsAt: timestamp('grace_period_ends_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorId: uuid('actor_id'),
  actorType: varchar('actor_type', { length: 50 }).notNull(),
  action: varchar('action', { length: 255 }).notNull(),
  resourceType: varchar('resource_type', { length: 100 }).notNull(),
  resourceId: uuid('resource_id'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const agentsRelations = relations(agents, ({ many }) => ({
  tasks: many(tasks),
  claims: many(taskClaims),
  submissions: many(taskSubmissions),
  reputationEvents: many(reputationEvents),
  payments: many(payments),
  apiKeys: many(apiKeys),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  owner: one(agents, {
    fields: [tasks.ownerId],
    references: [agents.id],
  }),
  claims: many(taskClaims),
  submissions: many(taskSubmissions),
  payments: many(payments),
  milestones: many(taskMilestones),
  invites: many(taskInvites),
}));

export const taskMilestonesRelations = relations(taskMilestones, ({ one, many }) => ({
  task: one(tasks, {
    fields: [taskMilestones.taskId],
    references: [tasks.id],
  }),
  payments: many(payments),
}));

export const taskInvitesRelations = relations(taskInvites, ({ one }) => ({
  task: one(tasks, {
    fields: [taskInvites.taskId],
    references: [tasks.id],
  }),
  agent: one(agents, {
    fields: [taskInvites.agentId],
    references: [agents.id],
  }),
}));

export const taskClaimsRelations = relations(taskClaims, ({ one, many }) => ({
  task: one(tasks, {
    fields: [taskClaims.taskId],
    references: [tasks.id],
  }),
  agent: one(agents, {
    fields: [taskClaims.agentId],
    references: [agents.id],
  }),
  submissions: many(taskSubmissions),
}));

export const taskSubmissionsRelations = relations(taskSubmissions, ({ one }) => ({
  claim: one(taskClaims, {
    fields: [taskSubmissions.claimId],
    references: [taskClaims.id],
  }),
  task: one(tasks, {
    fields: [taskSubmissions.taskId],
    references: [tasks.id],
  }),
  agent: one(agents, {
    fields: [taskSubmissions.agentId],
    references: [agents.id],
  }),
  reviewer: one(agents, {
    fields: [taskSubmissions.reviewedBy],
    references: [agents.id],
  }),
}));

export const reputationEventsRelations = relations(reputationEvents, ({ one }) => ({
  agent: one(agents, {
    fields: [reputationEvents.agentId],
    references: [agents.id],
  }),
  task: one(tasks, {
    fields: [reputationEvents.taskId],
    references: [tasks.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  task: one(tasks, {
    fields: [payments.taskId],
    references: [tasks.id],
  }),
  agent: one(agents, {
    fields: [payments.agentId],
    references: [agents.id],
  }),
  milestone: one(taskMilestones, {
    fields: [payments.milestoneId],
    references: [taskMilestones.id],
  }),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  agent: one(agents, {
    fields: [apiKeys.agentId],
    references: [agents.id],
  }),
}));
