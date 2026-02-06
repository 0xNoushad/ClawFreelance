import { and, asc, desc, eq, gte, lte, or, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { db } from '@/db';
import { taskMilestones, tasks } from '@/db/schema';
import { createAuditLog, logRateLimitExceeded, logSecurityEvent } from '@/lib/audit';
import {
  authenticateRequest,
  optionalAuth,
  validateBodySize,
  validateContentType,
} from '@/lib/auth';
import {
  checkRateLimit,
  detectInjection,
  detectSecrets,
  getClientIdentifier,
  isIpBlocked,
  sanitizeInputStrict,
  sanitizeMarkdown,
  validateTaskContent,
} from '@/lib/security';

// Validation schemas
const listTasksQuerySchema = z.object({
  status: z
    .enum(['open', 'claimed', 'in_progress', 'verification', 'completed', 'disputed', 'cancelled'])
    .optional(),
  type: z.enum(['code_contribution', 'bounty', 'showcase']).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  source: z
    .enum(['direct', 'github', 'gitcoin', 'algora', 'agent_discovered', 'immunefi', 'bugcrowd'])
    .optional(),
  minReward: z.coerce.number().min(0).optional(),
  maxReward: z.coerce.number().min(0).optional(),
  capabilities: z.string().max(500).optional(), // comma-separated, with length limit
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  sortBy: z.enum(['created_at', 'reward_amount', 'difficulty', 'deadline']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const createTaskSchema = z.object({
  title: z.string().min(10).max(500),
  description: z.string().min(50).max(10000),
  type: z.enum(['code_contribution', 'bounty', 'showcase']).default('bounty'),
  source: z.enum(['direct', 'github', 'gitcoin', 'algora', 'agent_discovered']).default('direct'),
  externalUrl: z.string().url().max(2000).optional(),
  rewardType: z.enum(['crypto', 'external', 'points']).default('points'),
  rewardAmount: z.number().min(0).max(1000000).default(0),
  rewardCurrency: z.string().max(50).optional(),
  visibility: z.enum(['public', 'private', 'unlisted']).default('public'),
  isMilestoneBased: z.boolean().default(false),
  milestones: z
    .array(
      z.object({
        title: z.string().min(5).max(255),
        description: z.string().max(1000).optional(),
        percentage: z.number().min(1).max(100),
        order: z.number().min(0),
      })
    )
    .optional(),
  verificationMethod: z
    .enum(['pr_merged', 'owner_approval', 'tests_pass', 'peer_review'])
    .default('owner_approval'),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  requirements: z.array(z.string().max(50)).max(20).default([]),
  deadline: z.string().datetime().optional(),
});

// Sort column mapping
const sortColumnMap = {
  created_at: tasks.createdAt,
  reward_amount: tasks.rewardAmount,
  difficulty: tasks.difficulty,
  deadline: tasks.deadline,
} as const;

/**
 * GET /api/v1/tasks - List tasks with filtering
 */
export async function GET(request: NextRequest) {
  const clientId = getClientIdentifier(request);

  // Check if IP is blocked
  if (isIpBlocked(clientId)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Rate limiting
  const rateLimit = checkRateLimit(clientId, { maxRequests: 100, windowMs: 60000 });

  if (!rateLimit.allowed) {
    logRateLimitExceeded(request, '/api/v1/tasks', undefined);
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(rateLimit.resetAt),
        },
      }
    );
  }

  // Parse and validate query params
  const { searchParams } = new URL(request.url);
  const queryParams = Object.fromEntries(searchParams.entries());

  // Check for injection in query parameters
  for (const [key, value] of Object.entries(queryParams)) {
    const injection = detectInjection(value);
    if (injection.detected) {
      logSecurityEvent(request, 'suspicious_activity', `Injection attempt in query param: ${key}`, {
        types: injection.types,
      });
      return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
    }
  }

  const parsed = listTasksQuerySchema.safeParse(queryParams);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid query parameters',
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const filters = parsed.data;
  const agent = await optionalAuth(request);

  // Build WHERE conditions
  const conditions = [];

  // Visibility filtering
  if (!agent) {
    // Unauthenticated users only see public tasks
    conditions.push(eq(tasks.visibility, 'public'));
  } else {
    // Authenticated users see public tasks or tasks they own
    conditions.push(or(eq(tasks.visibility, 'public'), eq(tasks.ownerId, agent.id)));
  }

  // Apply filters
  if (filters.status) {
    conditions.push(eq(tasks.status, filters.status));
  }
  if (filters.type) {
    conditions.push(eq(tasks.type, filters.type));
  }
  if (filters.difficulty) {
    conditions.push(eq(tasks.difficulty, filters.difficulty));
  }
  if (filters.source) {
    conditions.push(eq(tasks.source, filters.source));
  }
  if (filters.minReward !== undefined) {
    conditions.push(gte(tasks.rewardAmount, filters.minReward));
  }
  if (filters.maxReward !== undefined) {
    conditions.push(lte(tasks.rewardAmount, filters.maxReward));
  }

  // Build query
  const sortColumn = sortColumnMap[filters.sortBy];
  const sortFn = filters.sortOrder === 'asc' ? asc : desc;

  // Get total count
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(tasks)
    .where(and(...conditions));
  const total = Number(countResult[0]?.count || 0);

  // Get paginated tasks
  const taskResults = await db
    .select()
    .from(tasks)
    .where(and(...conditions))
    .orderBy(sortFn(sortColumn))
    .limit(filters.limit)
    .offset(filters.offset);

  // Filter by capabilities if specified (done in-memory since it's JSONB)
  let filteredTasks = taskResults;
  if (filters.capabilities) {
    const requiredCaps = filters.capabilities.split(',').map((c) => c.trim().toLowerCase());
    filteredTasks = taskResults.filter((t) => {
      const requirements = (t.requirements || []) as string[];
      return requiredCaps.some((cap) => requirements.map((r) => r.toLowerCase()).includes(cap));
    });
  }

  return NextResponse.json(
    {
      tasks: filteredTasks,
      pagination: {
        total,
        limit: filters.limit,
        offset: filters.offset,
        hasMore: filters.offset + filters.limit < total,
      },
      filters: {
        applied: Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined)),
      },
    },
    {
      headers: {
        'X-RateLimit-Remaining': String(rateLimit.remaining),
        'X-RateLimit-Reset': String(rateLimit.resetAt),
        'Cache-Control': 'public, max-age=30',
      },
    }
  );
}

/**
 * POST /api/v1/tasks - Create a new task
 */
export async function POST(request: NextRequest) {
  const clientId = getClientIdentifier(request);

  // Check if IP is blocked
  if (isIpBlocked(clientId)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Validate content type
  const contentTypeCheck = validateContentType(request);
  if (!contentTypeCheck.valid) {
    return NextResponse.json({ error: contentTypeCheck.error }, { status: 415 });
  }

  // Validate body size (1MB max)
  const bodySizeCheck = validateBodySize(request.headers.get('content-length'), 1024 * 1024);
  if (!bodySizeCheck.valid) {
    return NextResponse.json({ error: bodySizeCheck.error }, { status: 413 });
  }

  // Rate limiting (stricter for writes)
  const rateLimit = checkRateLimit(`${clientId}:write`, { maxRequests: 10, windowMs: 60000 });

  if (!rateLimit.allowed) {
    logRateLimitExceeded(request, '/api/v1/tasks:POST', undefined);
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  // Authenticate request
  const authResult = await authenticateRequest(request);
  if (!authResult.authenticated || !authResult.agent) {
    createAuditLog(request, 'auth.failure', {
      resourceType: 'task',
      success: false,
      errorMessage: authResult.error,
    });
    return NextResponse.json(
      { error: authResult.error || 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();

    // Sanitize string inputs
    if (body.title) body.title = sanitizeInputStrict(body.title);
    if (body.description) body.description = sanitizeMarkdown(body.description);
    if (body.externalUrl) body.externalUrl = sanitizeInputStrict(body.externalUrl);

    // Check for injection attacks
    const titleInjection = detectInjection(body.title || '');
    const descInjection = detectInjection(body.description || '');

    if (titleInjection.detected || descInjection.detected) {
      logSecurityEvent(request, 'suspicious_activity', 'Injection attempt in task creation', {
        titleTypes: titleInjection.types,
        descTypes: descInjection.types,
        agentId: authResult.agent.id,
      });
      return NextResponse.json({ error: 'Invalid content detected' }, { status: 400 });
    }

    // Validate against schema
    const parsed = createTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid task data',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const taskData = parsed.data;

    // Handle Milestones if provided - Validate BEFORE creating task
    if (taskData.isMilestoneBased && taskData.milestones) {
      const totalPercentage = taskData.milestones.reduce((sum, m) => sum + m.percentage, 0);
      if (totalPercentage !== 100) {
        return NextResponse.json(
          { error: 'Total milestone percentage must be 100%' },
          { status: 400 }
        );
      }
    }

    // CRITICAL: Validate task content for malicious patterns
    const taskValidation = validateTaskContent(
      taskData.title,
      taskData.description,
      taskData.externalUrl
    );

    if (taskValidation.blocked) {
      logSecurityEvent(request, 'blocked_request', 'Malicious task creation blocked', {
        agentId: authResult.agent.id,
        issues: taskValidation.issues,
        severity: taskValidation.severity,
      });

      createAuditLog(request, 'task.create', {
        actorId: authResult.agent.id,
        actorType: 'agent',
        resourceType: 'task',
        success: false,
        errorMessage: 'Blocked due to malicious content',
        metadata: {
          issues: taskValidation.issues,
          severity: taskValidation.severity,
        },
      });

      return NextResponse.json(
        {
          error: 'Task creation blocked',
          message: 'The task content was flagged for review due to potentially harmful content.',
          severity: taskValidation.severity,
        },
        { status: 422 }
      );
    }

    // Scan for secrets/credentials in task content
    const secretScan = detectSecrets(`${taskData.title} ${taskData.description}`);
    if (secretScan.detected) {
      createAuditLog(request, 'security.suspicious_activity', {
        actorId: authResult.agent.id,
        actorType: 'agent',
        resourceType: 'task',
        success: true,
        metadata: {
          reason: 'Potential secrets detected in task content',
          findings: secretScan.findings.map((f) => ({
            type: f.type,
            description: f.description,
          })),
        },
      });
    }

    // If there are non-blocking issues, flag for review
    const needsReview = !taskValidation.valid;

    // Create task with transaction for task + milestones
    const [newTask] = await db
      .insert(tasks)
      .values({
        title: taskData.title,
        description: taskData.description,
        type: taskData.type,
        source: taskData.source,
        externalUrl: taskData.externalUrl,
        ownerId: authResult.agent.id,
        rewardType: taskData.rewardType,
        rewardAmount: taskData.rewardAmount,
        rewardCurrency: taskData.rewardCurrency,
        visibility: taskData.visibility,
        isMilestoneBased: taskData.isMilestoneBased,
        status: 'open',
        verificationMethod: taskData.verificationMethod,
        difficulty: taskData.difficulty,
        requirements: taskData.requirements,
        deadline: taskData.deadline ? new Date(taskData.deadline) : undefined,
      })
      .returning();

    // Insert milestones if provided
    if (taskData.isMilestoneBased && taskData.milestones && taskData.milestones.length > 0) {
      await db.insert(taskMilestones).values(
        taskData.milestones.map((m) => ({
          taskId: newTask.id,
          title: m.title,
          description: m.description,
          percentage: m.percentage,
          order: m.order,
        }))
      );
    }

    // Audit log
    createAuditLog(request, 'task.create', {
      actorId: authResult.agent.id,
      actorType: 'agent',
      resourceType: 'task',
      resourceId: newTask.id,
      success: true,
      metadata: {
        needsReview,
        severity: taskValidation.severity,
      },
    });

    return NextResponse.json(
      {
        message: 'Task created successfully',
        task: newTask,
        ...(secretScan.detected && {
          warnings: secretScan.findings.map((f) => ({
            type: 'potential_secret',
            secretType: f.type,
            description: f.description,
            message:
              'Your task content may contain a secret or credential. Please review and remove sensitive data.',
          })),
        }),
      },
      {
        status: 201,
        headers: {
          Location: `/api/v1/tasks/${newTask.id}`,
        },
      }
    );
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
}
