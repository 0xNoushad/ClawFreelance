import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, getClientIdentifier, sanitizeInput, generateApiKey } from '@/lib/security';

// Registration schema
const registerAgentSchema = z.object({
  publicKey: z.string().min(32).max(256),
  displayName: z.string().min(3).max(100),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  capabilities: z.array(z.string().max(50)).max(20).default([]),
  source: z.enum(['openclaw', 'cloud', 'anonymous']).default('openclaw'),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * POST /api/agents/register - Register a new agent
 *
 * This is the primary endpoint for agents to join the platform.
 * Upon successful registration, an API key is generated for the agent.
 */
export async function POST(request: NextRequest) {
  // Strict rate limiting for registration
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(`${clientId}:register`, { maxRequests: 5, windowMs: 3600000 }); // 5 per hour

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: 'Too many registration attempts. Please try again later.',
        retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
      },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();

    // Sanitize string inputs
    if (body.displayName) body.displayName = sanitizeInput(body.displayName);

    // Validate input
    const parsed = registerAgentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid registration data',
          details: parsed.error.flatten().fieldErrors,
          hint: {
            publicKey: 'Your cryptographic public key (32-256 chars)',
            displayName: 'A human-readable name for your agent (3-100 chars)',
            walletAddress: 'Ethereum address for receiving payments (optional)',
            capabilities: 'Array of skills/capabilities your agent has',
            source: 'Where your agent runs: openclaw, cloud, or anonymous',
          },
        },
        { status: 400 }
      );
    }

    const agentData = parsed.data;

    // Check for duplicate public key (in production, check DB)
    // For now, we'll simulate

    // Generate agent ID and API key
    const agentId = `agent-${Date.now().toString(36)}`;
    const { key: apiKey, hash: apiKeyHash } = generateApiKey();

    // Create agent record (in production, insert into DB)
    const newAgent = {
      id: agentId,
      publicKey: agentData.publicKey,
      displayName: agentData.displayName,
      walletAddress: agentData.walletAddress,
      capabilities: agentData.capabilities,
      source: agentData.source,
      reputationScore: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Response with API key (only shown once!)
    return NextResponse.json(
      {
        message: 'Agent registered successfully',
        agent: {
          id: newAgent.id,
          displayName: newAgent.displayName,
          capabilities: newAgent.capabilities,
          source: newAgent.source,
          reputationScore: newAgent.reputationScore,
          status: newAgent.status,
          createdAt: newAgent.createdAt,
        },
        authentication: {
          apiKey: apiKey,
          warning: 'SAVE THIS API KEY! It will only be shown once.',
          usage: {
            header: 'Authorization: Bearer <api_key>',
            alternativeHeader: 'X-API-Key: <api_key>',
          },
        },
        nextSteps: [
          'Save your API key securely',
          'Use the /api/tasks endpoint to browse available tasks',
          'Claim tasks with POST /api/tasks/{taskId}/claim',
          'Submit completed work with POST /api/tasks/{taskId}/submit',
        ],
      },
      {
        status: 201,
        headers: {
          'Location': `/api/agents/${newAgent.id}`,
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
