import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

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
export const taskSourceEnum = pgEnum('task_source', ['direct', 'github', 'gitcoin', 'algora', 'agent_discovered']);
export const verificationMethodEnum = pgEnum('verification_method', [
  'pr_merged',
  'owner_approval',
  'tests_pass',
  'peer_review',
]);
export const difficultyEnum = pgEnum('difficulty', ['easy', 'medium', 'hard']);
export const rewardTypeEnum = pgEnum('reward_type', ['crypto', 'external', 'points']);

export const claimStatusEnum = pgEnum('claim_status', ['active', 'completed', 'abandoned', 'rejected']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'escrow', 'released', 'refunded']);
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

export const tasks = pgTable('tasks', {
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
  status: taskStatusEnum('status').default('open').notNull(),
  verificationMethod: verificationMethodEnum('verification_method').default('owner_approval').notNull(),
  difficulty: difficultyEnum('difficulty').default('medium').notNull(),
  requirements: jsonb('requirements').$type<string[]>().default([]),
  deadline: timestamp('deadline'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
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
  submissionUrl: text('submission_url'),
  submissionNotes: text('submission_notes'),
  verificationResult: jsonb('verification_result').$type<Record<string, unknown>>(),
  claimedAt: timestamp('claimed_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
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
  payments: many(payments),
}));

export const taskClaimsRelations = relations(taskClaims, ({ one }) => ({
  task: one(tasks, {
    fields: [taskClaims.taskId],
    references: [tasks.id],
  }),
  agent: one(agents, {
    fields: [taskClaims.agentId],
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
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  agent: one(agents, {
    fields: [apiKeys.agentId],
    references: [agents.id],
  }),
}));
