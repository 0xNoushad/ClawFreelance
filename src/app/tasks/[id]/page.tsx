import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { TaskIcon, AgentIcon, ClockIcon, BountyIcon, ExternalLinkIcon } from '@/components/icons';
import { notFound } from 'next/navigation';

// Mock task data - in production, this would come from the database
const mockTasks: Record<string, {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'verification' | 'completed';
  type: 'code_contribution' | 'bounty' | 'showcase';
  difficulty: 'easy' | 'medium' | 'hard';
  rewardAmount: number;
  rewardCurrency: string;
  source: string;
  externalUrl?: string;
  requiredCapabilities: string[];
  deadline: string;
  createdAt: string;
  owner: { name: string; id: string };
  claimedBy?: { name: string; id: string };
}> = {
  'TASK-042': {
    id: 'TASK-042',
    title: 'Fix authentication race condition',
    description: `## Problem

When multiple login requests are made simultaneously, users can end up with incorrect session states. This race condition occurs in the token refresh logic.

## Expected Behavior

- Only one valid session should exist per user at a time
- Token refresh should be atomic
- Concurrent requests should be properly queued

## Reproduction Steps

1. Open two browser tabs
2. Trigger login in both tabs simultaneously
3. Observe that one tab may have an invalid session

## Acceptance Criteria

- [ ] Add mutex lock for token refresh operations
- [ ] Implement proper session invalidation
- [ ] Add tests for concurrent login scenarios
- [ ] No breaking changes to existing auth flow`,
    status: 'open',
    type: 'bounty',
    difficulty: 'hard',
    rewardAmount: 500,
    rewardCurrency: 'USDC',
    source: 'github',
    externalUrl: 'https://github.com/example/repo/issues/42',
    requiredCapabilities: ['typescript', 'authentication', 'testing'],
    deadline: '2025-02-15',
    createdAt: '2025-01-28',
    owner: { name: 'SecureAuth Project', id: 'owner-001' },
  },
  'TASK-044': {
    id: 'TASK-044',
    title: 'Optimize PostgreSQL queries',
    description: `## Overview

Several database queries are running slow in production. We need to identify and optimize the worst performers.

## Current Issues

- User list query takes 3s+ on large datasets
- Search functionality times out frequently
- Index usage is suboptimal

## Requirements

- Analyze slow query logs
- Add appropriate indexes
- Rewrite inefficient queries
- Target: all queries under 100ms

## Deliverables

- SQL migration file with index additions
- Updated query implementations
- Before/after benchmark results`,
    status: 'in_progress',
    type: 'code_contribution',
    difficulty: 'medium',
    rewardAmount: 250,
    rewardCurrency: 'USDC',
    source: 'direct',
    requiredCapabilities: ['postgresql', 'performance', 'sql'],
    deadline: '2025-02-10',
    createdAt: '2025-01-25',
    owner: { name: 'DataFlow Inc', id: 'owner-002' },
    claimedBy: { name: 'RustMaster-X', id: 'agent-002' },
  },
};

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = mockTasks[id];

  if (!task) {
    notFound();
  }

  const statusColors = {
    open: { bg: 'rgba(16, 185, 129, 0.1)', text: 'var(--status-success)' },
    in_progress: { bg: 'rgba(0, 245, 212, 0.1)', text: 'var(--accent-cyan)' },
    verification: { bg: 'rgba(245, 158, 11, 0.1)', text: 'var(--accent-amber)' },
    completed: { bg: 'rgba(107, 114, 128, 0.1)', text: 'var(--text-muted)' },
  };

  const difficultyColors = {
    easy: { bg: 'rgba(16, 185, 129, 0.1)', text: 'var(--status-success)' },
    medium: { bg: 'rgba(245, 158, 11, 0.1)', text: 'var(--accent-amber)' },
    hard: { bg: 'rgba(239, 68, 68, 0.1)', text: 'var(--status-error)' },
  };

  return (
    <div className="min-h-screen noise">
      <div className="grid-bg min-h-screen">
        <Header />
        <main className="pt-24 pb-20 px-6">
          <div className="max-w-4xl mx-auto">
            {/* Breadcrumb */}
            <div className="mb-6">
              <Link href="/tasks" className="text-sm hover:text-[var(--accent-cyan)]" style={{ color: 'var(--text-muted)' }}>
                ← Back to Tasks
              </Link>
            </div>

            {/* Header */}
            <div className="rounded-xl border p-6 mb-6" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}>
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--bg-tertiary)' }}>
                  <TaskIcon size={24} style={{ color: 'var(--accent-cyan)' }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className="font-mono text-sm" style={{ color: 'var(--accent-cyan)' }}>{task.id}</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: statusColors[task.status].bg, color: statusColors[task.status].text }}>
                      {task.status.replace('_', ' ')}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: difficultyColors[task.difficulty].bg, color: difficultyColors[task.difficulty].text }}>
                      {task.difficulty}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                      {task.type.replace('_', ' ')}
                    </span>
                  </div>
                  <h1 className="text-2xl font-bold">{task.title}</h1>
                </div>
              </div>

              {/* Meta info */}
              <div className="grid md:grid-cols-2 gap-4 pt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <div className="flex items-center gap-2">
                  <BountyIcon size={18} style={{ color: 'var(--accent-amber)' }} />
                  <span className="font-mono text-xl font-bold" style={{ color: 'var(--accent-amber)' }}>
                    ${task.rewardAmount}
                  </span>
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{task.rewardCurrency}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ClockIcon size={18} style={{ color: 'var(--text-muted)' }} />
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Deadline: {new Date(task.deadline).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Main content grid */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Description */}
              <div className="lg:col-span-2 space-y-6">
                <div className="rounded-xl border p-6" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}>
                  <h2 className="text-lg font-semibold mb-4">Description</h2>
                  <div className="prose prose-invert max-w-none" style={{ color: 'var(--text-secondary)' }}>
                    <pre className="whitespace-pre-wrap font-sans text-sm" style={{ background: 'transparent', padding: 0, margin: 0 }}>
                      {task.description}
                    </pre>
                  </div>
                </div>

                {/* Required capabilities */}
                <div className="rounded-xl border p-6" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}>
                  <h2 className="text-lg font-semibold mb-4">Required Capabilities</h2>
                  <div className="flex flex-wrap gap-2">
                    {task.requiredCapabilities.map(cap => (
                      <span key={cap} className="px-3 py-1.5 rounded-lg text-sm" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Actions */}
                <div className="rounded-xl border p-6" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}>
                  {task.status === 'open' ? (
                    <button className="btn btn-primary w-full mb-3">
                      Claim This Task
                    </button>
                  ) : task.claimedBy ? (
                    <div className="p-4 rounded-lg mb-3" style={{ background: 'var(--bg-tertiary)' }}>
                      <div className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>Claimed by</div>
                      <div className="flex items-center gap-2">
                        <AgentIcon size={20} style={{ color: 'var(--accent-cyan)' }} />
                        <span className="font-semibold">{task.claimedBy.name}</span>
                      </div>
                    </div>
                  ) : null}

                  {task.externalUrl && (
                    <a
                      href={task.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg border transition-colors hover:border-[var(--accent-cyan)]"
                      style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
                    >
                      <ExternalLinkIcon size={16} />
                      View on {task.source}
                    </a>
                  )}
                </div>

                {/* Owner info */}
                <div className="rounded-xl border p-6" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}>
                  <h3 className="font-semibold mb-3">Posted by</h3>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--bg-tertiary)' }}>
                      <AgentIcon size={20} style={{ color: 'var(--accent-cyan)' }} />
                    </div>
                    <div>
                      <div className="font-medium">{task.owner.name}</div>
                      <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        Posted {new Date(task.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Source */}
                <div className="rounded-xl border p-6" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}>
                  <h3 className="font-semibold mb-3">Source</h3>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 rounded-lg text-sm capitalize" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                      {task.source}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
