import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, getClientIdentifier, sanitizeInput } from '@/lib/security';

// Validation schemas
const listTasksQuerySchema = z.object({
  status: z.enum(['open', 'claimed', 'in_progress', 'verification', 'completed', 'disputed', 'cancelled']).optional(),
  type: z.enum(['code_contribution', 'bounty', 'showcase']).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  source: z.enum(['direct', 'github', 'gitcoin', 'algora', 'agent_discovered']).optional(),
  minReward: z.coerce.number().min(0).optional(),
  maxReward: z.coerce.number().min(0).optional(),
  capabilities: z.string().optional(), // comma-separated
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
  externalUrl: z.string().url().optional(),
  rewardType: z.enum(['crypto', 'external', 'points']).default('points'),
  rewardAmount: z.number().min(0).default(0),
  rewardCurrency: z.string().max(50).optional(),
  verificationMethod: z.enum(['pr_merged', 'owner_approval', 'tests_pass', 'peer_review']).default('owner_approval'),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  requirements: z.array(z.string()).default([]),
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
    rewardType: 'crypto',
    rewardAmount: 500,
    rewardCurrency: 'USDC',
    status: 'open',
    verificationMethod: 'pr_merged',
    difficulty: 'hard',
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
    rewardType: 'points',
    rewardAmount: 150,
    status: 'open',
    verificationMethod: 'owner_approval',
    difficulty: 'medium',
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
    rewardType: 'crypto',
    rewardAmount: 250,
    rewardCurrency: 'USDC',
    status: 'in_progress',
    claimedBy: 'agent-0x3b2c',
    verificationMethod: 'tests_pass',
    difficulty: 'medium',
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
    rewardType: 'crypto',
    rewardAmount: 750,
    rewardCurrency: 'USDC',
    status: 'open',
    verificationMethod: 'pr_merged',
    difficulty: 'hard',
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
    rewardType: 'points',
    rewardAmount: 200,
    status: 'verification',
    claimedBy: 'agent-0x9d4e',
    verificationMethod: 'owner_approval',
    difficulty: 'easy',
    requirements: ['documentation', 'api', 'openapi'],
    createdAt: '2025-01-26T11:00:00Z',
  },
];

/**
 * GET /api/tasks - List tasks with filtering
 */
export async function GET(request: NextRequest) {
  // Rate limiting
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(clientId, { maxRequests: 100, windowMs: 60000 });

  if (!rateLimit.allowed) {
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

  // Filter tasks (in production, this would be a DB query)
  let filteredTasks = [...mockTasks];

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
          Object.entries(filters).filter(([_, v]) => v !== undefined)
        ),
      },
    },
    {
      headers: {
        'X-RateLimit-Remaining': String(rateLimit.remaining),
        'X-RateLimit-Reset': String(rateLimit.resetAt),
        'Cache-Control': 'public, max-age=30', // Cache for 30 seconds
      },
    }
  );
}

/**
 * POST /api/tasks - Create a new task
 */
export async function POST(request: NextRequest) {
  // Rate limiting (stricter for writes)
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(`${clientId}:write`, { maxRequests: 20, windowMs: 60000 });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
  }

  // TODO: Authenticate request (require API key or signature)
  // For now, we'll allow unauthenticated task creation for demo

  try {
    const body = await request.json();

    // Sanitize string inputs
    if (body.title) body.title = sanitizeInput(body.title);
    if (body.description) body.description = sanitizeInput(body.description);

    // Validate
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

    // Create task (in production, insert into DB)
    const newTask = {
      id: `task-${Date.now()}`,
      ...taskData,
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json(
      {
        message: 'Task created successfully',
        task: newTask,
      },
      {
        status: 201,
        headers: {
          'Location': `/api/tasks/${newTask.id}`,
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
