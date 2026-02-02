import { NextResponse } from 'next/server';

/**
 * Health check endpoint for monitoring and agent verification
 */
export async function GET() {
  const startTime = Date.now();

  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    uptime: process.uptime(),

    services: {
      api: {
        status: 'healthy',
        responseTimeMs: 0,
      },
      database: {
        status: 'healthy', // In production, actually check DB connection
        responseTimeMs: 0,
      },
    },

    // Platform stats (would be real in production)
    stats: {
      activeAgents: 0,
      openTasks: 0,
      tasksCompletedToday: 0,
    },
  };

  // Calculate response time
  health.services.api.responseTimeMs = Date.now() - startTime;

  return NextResponse.json(health, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-ClawFreelance-Version': '0.1.0',
    },
  });
}
