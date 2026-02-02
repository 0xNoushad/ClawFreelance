import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  checkRateLimit,
  getClientIdentifier,
  sanitizeInputStrict,
  sanitizeMarkdown,
  detectInjection,
  validateTaskContent,
  isIpBlocked,
} from '@/lib/security';
import { authenticateRequest, validateContentType, validateBodySize, optionalAuth } from '@/lib/auth';
import { createAuditLog, logSecurityEvent, logRateLimitExceeded } from '@/lib/audit';
import { getVisibilityFilter } from '@/lib/tasks';

// Validation schemas
const listTasksQuerySchema = z.object({
  status: z.enum(['open', 'claimed', 'in_progress', 'verification', 'completed', 'disputed', 'cancelled']).optional(),
  type: z.enum(['code_contribution', 'bounty', 'showcase']).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  source: z.enum(['direct', 'github', 'gitcoin', 'algora', 'agent_discovered']).optional(),
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
  verificationMethod: z.enum(['pr_merged', 'owner_approval', 'tests_pass', 'peer_review']).default('owner_approval'),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  requirements: z.array(z.string().max(50)).max(20).default([]),
  deadline: z.string().datetime().optional(),
});

// Mock data for demo (replace with DB queries)
const mockTasks = [
  {
    id: 'task-001',
    title: 'Fix authentication race condition in session handler',
    description: 'The session handler has a race condition that causes intermittent authentication failures under high load. Need to implement proper locking mechanism.',
    type: 'bounty',
    source: 'github',
    externalUrl: 'https://github.com/openclaw/openclaw/issues/42',
    ownerId: 'agent-001',
    rewardType: 'crypto',
    rewardAmount: 500,
    rewardCurrency: 'USDC',
    status: 'open',
    verificationMethod: 'pr_merged',
    difficulty: 'hard',
    visibility: 'public',
    requirements: ['typescript', 'authentication', 'concurrency'],
    createdAt: '2025-01-30T10:00:00Z',
    deadline: '2025-02-15T23:59:59Z',
  },
  {
    id: 'task-002',
    title: 'Add dark mode support to dashboard components',
    description: 'Implement dark mode across all dashboard components. Should respect system preferences and allow manual toggle.',
    type: 'code_contribution',
    source: 'direct',
    ownerId: 'agent-001',
    rewardType: 'points',
    rewardAmount: 150,
    status: 'open',
    verificationMethod: 'owner_approval',
    difficulty: 'medium',
    visibility: 'public',
    requirements: ['typescript', 'react', 'css'],
    createdAt: '2025-01-29T14:30:00Z',
  },
  {
    id: 'task-003',
    title: 'Optimize PostgreSQL queries for task listing',
    description: 'The task listing endpoint is slow. Need to add proper indexes and optimize the query structure.',
    type: 'bounty',
    source: 'gitcoin',
    externalUrl: 'https://gitcoin.co/issue/clawfreelance/44',
    ownerId: 'agent-002',
    rewardType: 'crypto',
    rewardAmount: 250,
    rewardCurrency: 'USDC',
    status: 'in_progress',
    claimedBy: 'agent-0x3b2c',
    verificationMethod: 'tests_pass',
    difficulty: 'medium',
    visibility: 'public',
    requirements: ['postgresql', 'database', 'optimization'],
    createdAt: '2025-01-28T09:00:00Z',
  },
  {
    id: 'task-004',
    title: 'Implement WebSocket real-time notifications',
    description: 'Add WebSocket support for real-time task updates. Agents should receive notifications when tasks are created, claimed, or completed.',
    type: 'bounty',
    source: 'algora',
    externalUrl: 'https://algora.io/bounty/clawfreelance/45',
    ownerId: 'agent-003',
    rewardType: 'crypto',
    rewardAmount: 750,
    rewardCurrency: 'USDC',
    status: 'open',
    verificationMethod: 'pr_merged',
    difficulty: 'hard',
    visibility: 'public',
    requirements: ['typescript', 'websocket', 'real-time'],
    createdAt: '2025-01-27T16:00:00Z',
    deadline: '2025-02-20T23:59:59Z',
  },
  {
    id: 'task-005',
    title: 'Create comprehensive API documentation',
    description: 'Write OpenAPI spec and developer documentation for all API endpoints. Include examples and best practices.',
    type: 'code_contribution',
    source: 'direct',
    ownerId: 'agent-001',
    rewardType: 'points',
    rewardAmount: 200,
    status: 'verification',
    claimedBy: 'agent-0x9d4e',
    verificationMethod: 'owner_approval',
    difficulty: 'easy',
    visibility: 'public',
    requirements: ['documentation', 'api', 'openapi'],
    createdAt: '2025-01-26T11:00:00Z',
  },
];

/**
 * GET /api/tasks - List tasks with filtering
 */
export async function GET(request: NextRequest) {
  const clientId = getClientIdentifier(request);

  // Check if IP is blocked
  if (isIpBlocked(clientId)) {
    return NextResponse.json(
      { error: 'Access denied' },
      { status: 403 }
    );
  }

  // Rate limiting
  const rateLimit = checkRateLimit(clientId, { maxRequests: 100, windowMs: 60000 });

  if (!rateLimit.allowed) {
    logRateLimitExceeded(request, '/api/tasks', undefined);
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
      return NextResponse.json(
        { error: 'Invalid query parameters' },
        { status: 400 }
      );
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

  // Filter tasks (in production, this would be a DB query using getVisibilityFilter(agent?.id))
  let filteredTasks = [...mockTasks];

  // Visibility filtering
  if (!agent) {
    // Unauthenticated users only see public tasks
    filteredTasks = filteredTasks.filter(t => t.visibility === 'public');
  } else {
    // Authenticated users see:
    // 1. Public tasks
    // 2. Tasks they own
    // 3. Unlisted tasks ONLY if accessed directly by ID (not in list view)
    // Since this is a list endpoint, unlisted tasks should be hidden unless owned
    filteredTasks = filteredTasks.filter(t => 
      t.visibility === 'public' || 
      t.ownerId === agent.id
    );
  }

  if (filters.status) {
    filteredTasks = filteredTasks.filter((t) => t.status === filters.status);
  }
  if (filters.type) {
    filteredTasks = filteredTasks.filter((t) => t.type === filters.type);
  }
  if (filters.difficulty) {
    filteredTasks = filteredTasks.filter((t) => t.difficulty === filters.difficulty);
  }
  if (filters.source) {
    filteredTasks = filteredTasks.filter((t) => t.source === filters.source);
  }
  if (filters.minReward !== undefined) {
    filteredTasks = filteredTasks.filter((t) => t.rewardAmount >= filters.minReward!);
  }
  if (filters.capabilities) {
    const requiredCaps = filters.capabilities.split(',').map((c) => c.trim().toLowerCase());
    filteredTasks = filteredTasks.filter((t) =>
      requiredCaps.some((cap) => t.requirements.includes(cap))
    );
  }

  // Pagination
  const total = filteredTasks.length;
  const paginatedTasks = filteredTasks.slice(filters.offset, filters.offset + filters.limit);

  return NextResponse.json(
    {
      tasks: paginatedTasks,
      pagination: {
        total,
        limit: filters.limit,
        offset: filters.offset,
        hasMore: filters.offset + filters.limit < total,
      },
      filters: {
        applied: Object.fromEntries(
          Object.entries(filters).filter(([, v]) => v !== undefined)
        ),
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
 * POST /api/tasks - Create a new task
 */
export async function POST(request: NextRequest) {
  const clientId = getClientIdentifier(request);

  // Check if IP is blocked
  if (isIpBlocked(clientId)) {
    return NextResponse.json(
      { error: 'Access denied' },
      { status: 403 }
    );
  }

  // Validate content type
  const contentTypeCheck = validateContentType(request);
  if (!contentTypeCheck.valid) {
    return NextResponse.json(
      { error: contentTypeCheck.error },
      { status: 415 }
    );
  }

  // Validate body size (1MB max)
  const bodySizeCheck = validateBodySize(request.headers.get('content-length'), 1024 * 1024);
  if (!bodySizeCheck.valid) {
    return NextResponse.json(
      { error: bodySizeCheck.error },
      { status: 413 }
    );
  }

  // Rate limiting (stricter for writes)
  const rateLimit = checkRateLimit(`${clientId}:write`, { maxRequests: 10, windowMs: 60000 });

  if (!rateLimit.allowed) {
    logRateLimitExceeded(request, '/api/tasks:POST', undefined);
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
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
      return NextResponse.json(
        { error: 'Invalid content detected' },
        { status: 400 }
      );
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

    // If there are non-blocking issues, flag for review
    const needsReview = !taskValidation.valid;

    // Create task
    // In production, use a transaction for task + milestones
    const newTask = {
      id: `task-${Date.now()}`,
      ...taskData,
      status: needsReview ? 'pending_review' : 'open',
      createdBy: authResult.agent.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(needsReview && {
        reviewFlags: taskValidation.issues,
        reviewSeverity: taskValidation.severity,
      }),
    };

    // Milestones are validated above and would be inserted here in production
    // await db.insert(taskMilestones).values(taskData.milestones.map(m => ({ ...m, taskId: newTask.id })))

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
        message: needsReview
          ? 'Task created and queued for review'
          : 'Task created successfully',
        task: newTask,
        ...(needsReview && {
          notice: 'Your task has been flagged for review and will be visible once approved.',
        }),
      },
      {
        status: 201,
        headers: {
          Location: `/api/tasks/${newTask.id}`,
        },
      }
    );
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }
}
