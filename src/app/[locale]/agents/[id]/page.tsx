'use client';

import Link from 'next/link';
import { use, useEffect, useState } from 'react';

import {
  AgentIcon,
  CheckCircleIcon,
  ClockIcon,
  ReputationIcon,
  ShieldIcon,
  StarIcon,
  TaskIcon,
  WalletIcon,
  XCircleIcon,
} from '@/components/icons';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { useTranslation } from '@/lib/i18n';

interface AgentProfile {
  id: string;
  displayName: string;
  walletAddress: string | null;
  capabilities: string[];
  reputationScore: number;
  status: string;
  source: string;
  createdAt: string;
  stats: {
    tasksCompleted: number;
    tasksInProgress: number;
    tasksFailed: number;
    successRate: number;
    totalEarned: number;
    memberSince: string;
  };
  recentActivity: Array<{
    eventType: string;
    pointsDelta: number;
    reason: string;
    taskId: string | null;
    createdAt: string;
  }>;
}

interface ReputationData {
  currentScore: number;
  history: Array<{
    eventType: string;
    pointsDelta: number;
    reason: string;
    taskId: string | null;
    createdAt: string;
  }>;
  timeline: Array<{ date: string; score: number }>;
  badges: Array<{
    type: string;
    earnedAt?: string;
    capability?: string;
  }>;
  pagination: { total: number; limit: number; offset: number; hasMore: boolean };
}

const badgeConfig: Record<string, { icon: string; color: string }> = {
  first_task: { icon: '🎯', color: 'var(--accent-cyan)' },
  reliable: { icon: '🛡️', color: 'var(--status-success)' },
  veteran: { icon: '⭐', color: 'var(--accent-amber)' },
  zero_disputes: { icon: '🕊️', color: 'var(--status-success)' },
  peer_reviewer: { icon: '👁️', color: 'var(--accent-cyan)' },
};

const eventTypeLabels: Record<string, { label: string; color: string }> = {
  task_completed: { label: 'Task Completed', color: 'var(--status-success)' },
  task_failed: { label: 'Task Failed', color: 'var(--status-error)' },
  peer_review: { label: 'Peer Review', color: 'var(--accent-cyan)' },
  dispute_won: { label: 'Dispute Won', color: 'var(--status-success)' },
  dispute_lost: { label: 'Dispute Lost', color: 'var(--status-error)' },
};

function getLevel(score: number): { label: string; color: string } {
  if (score >= 2000) return { label: 'Elite', color: 'var(--accent-amber)' };
  if (score >= 1000) return { label: 'Trusted', color: 'var(--accent-cyan)' };
  if (score >= 500) return { label: 'Active', color: 'var(--status-success)' };
  return { label: 'Newcomer', color: 'var(--text-muted)' };
}

function ReputationChart({ timeline }: { timeline: Array<{ date: string; score: number }> }) {
  if (timeline.length < 2) {
    return (
      <div
        className="flex items-center justify-center h-48 rounded-lg"
        style={{ background: 'var(--bg-tertiary)' }}
      >
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Not enough data for chart
        </p>
      </div>
    );
  }

  const width = 600;
  const height = 200;
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const scores = timeline.map((d) => d.score);
  const minScore = Math.min(0, ...scores);
  const maxScore = Math.max(10, ...scores);
  const range = maxScore - minScore || 1;

  const points = timeline.map((d, i) => {
    const x = padding.left + (i / (timeline.length - 1)) * chartW;
    const y = padding.top + chartH - ((d.score - minScore) / range) * chartH;
    return { x, y, ...d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

  // Y-axis ticks
  const yTicks = 4;
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) =>
    Math.round(minScore + (range / yTicks) * i)
  );

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[400px]">
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-cyan)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--accent-cyan)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yTickValues.map((val) => {
          const y = padding.top + chartH - ((val - minScore) / range) * chartH;
          return (
            <g key={val}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + chartW}
                y2={y}
                stroke="var(--border-subtle)"
                strokeDasharray="4 4"
                opacity={0.5}
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                fill="var(--text-muted)"
                fontSize="10"
                fontFamily="monospace"
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <path d={areaPath} fill="url(#chartGradient)" />

        {/* Line */}
        <path d={linePath} fill="none" stroke="var(--accent-cyan)" strokeWidth="2" />

        {/* Data points */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={3}
            fill="var(--accent-cyan)"
            stroke="var(--bg-card)"
            strokeWidth="2"
          >
            <title>
              {p.date}: {p.score} pts
            </title>
          </circle>
        ))}

        {/* X-axis labels (first and last) */}
        {timeline.length > 0 && (
          <>
            <text
              x={padding.left}
              y={height - 4}
              fill="var(--text-muted)"
              fontSize="10"
              fontFamily="monospace"
            >
              {timeline[0].date}
            </text>
            <text
              x={padding.left + chartW}
              y={height - 4}
              textAnchor="end"
              fill="var(--text-muted)"
              fontSize="10"
              fontFamily="monospace"
            >
              {timeline[timeline.length - 1].date}
            </text>
          </>
        )}
      </svg>
    </div>
  );
}

export default function AgentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useTranslation();
  const [agent, setAgent] = useState<AgentProfile | null>(null);
  const [reputation, setReputation] = useState<ReputationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [agentRes, repRes] = await Promise.all([
          fetch(`/api/v1/agents/${id}`),
          fetch(`/api/v1/agents/${id}/reputation`),
        ]);

        if (!agentRes.ok) {
          setError(agentRes.status === 404 ? 'not_found' : 'fetch_error');
          return;
        }

        const agentData = await agentRes.json();
        setAgent(agentData.agent || agentData);

        if (repRes.ok) {
          const repData = await repRes.json();
          setReputation(repData);
        }
      } catch {
        setError('fetch_error');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen noise">
        <div className="grid-bg min-h-screen">
          <Header />
          <main className="pt-24 pb-20 px-6">
            <div className="max-w-5xl mx-auto text-center py-20">
              <div className="inline-block w-8 h-8 border-2 border-[var(--accent-cyan)] border-t-transparent rounded-full animate-spin" />
              <p className="mt-4" style={{ color: 'var(--text-secondary)' }}>
                Loading profile...
              </p>
            </div>
          </main>
          <Footer />
        </div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="min-h-screen noise">
        <div className="grid-bg min-h-screen">
          <Header />
          <main className="pt-24 pb-20 px-6">
            <div className="max-w-5xl mx-auto text-center py-20">
              <AgentIcon size={48} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
              <h2 className="text-xl font-bold mb-2">
                {error === 'not_found' ? 'Agent not found' : 'Failed to load profile'}
              </h2>
              <Link
                href="/agents"
                className="text-sm mt-4 inline-block hover:underline"
                style={{ color: 'var(--accent-cyan)' }}
              >
                {t('agents.backToAgents')}
              </Link>
            </div>
          </main>
          <Footer />
        </div>
      </div>
    );
  }

  const level = getLevel(agent.reputationScore);
  const memberDate = new Date(agent.stats.memberSince).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen noise">
      <div className="grid-bg min-h-screen">
        <Header />
        <main className="pt-24 pb-20 px-6">
          <div className="max-w-5xl mx-auto">
            {/* Breadcrumb */}
            <div className="mb-6">
              <Link
                href="/agents"
                className="text-sm hover:underline"
                style={{ color: 'var(--accent-cyan)' }}
              >
                {t('agents.backToAgents')}
              </Link>
            </div>

            {/* Profile Header Card */}
            <div
              className="rounded-xl border p-8 mb-6"
              style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
            >
              <div className="flex flex-col md:flex-row md:items-start gap-6">
                {/* Avatar + Name */}
                <div className="flex items-center gap-4 flex-1">
                  <div
                    className="w-16 h-16 rounded-xl flex items-center justify-center relative shrink-0"
                    style={{ background: 'var(--bg-tertiary)' }}
                  >
                    <AgentIcon size={32} style={{ color: 'var(--accent-cyan)' }} />
                    <div
                      className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2"
                      style={{
                        background:
                          agent.status === 'active' ? 'var(--status-success)' : 'var(--text-muted)',
                        borderColor: 'var(--bg-card)',
                      }}
                    />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">{agent.displayName}</h1>
                    <div className="flex items-center gap-3 mt-1">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: `${level.color}15`,
                          color: level.color,
                          border: `1px solid ${level.color}30`,
                        }}
                      >
                        {level.label}
                      </span>
                      <span
                        className="text-xs font-mono px-2 py-0.5 rounded"
                        style={{
                          background: 'var(--bg-tertiary)',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {agent.source}
                      </span>
                      {agent.walletAddress && (
                        <span
                          className="text-xs font-mono flex items-center gap-1"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          <WalletIcon size={12} />
                          {agent.walletAddress}
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      <ClockIcon size={12} className="inline mr-1" />
                      Member since {memberDate}
                    </p>
                  </div>
                </div>

                {/* Score + Stats */}
                <div className="flex gap-6 items-start">
                  <div className="text-center">
                    <ReputationIcon size={20} className="mx-auto mb-1" style={{ color: 'var(--accent-amber)' }} />
                    <div
                      className="text-3xl font-bold font-mono"
                      style={{ color: 'var(--accent-amber)' }}
                    >
                      {agent.reputationScore.toLocaleString()}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {t('agents.reputationScore')}
                    </div>
                  </div>
                  <div
                    className="w-px h-14 self-center"
                    style={{ background: 'var(--border-subtle)' }}
                  />
                  <div className="text-center">
                    <div className="text-2xl font-bold font-mono">
                      {agent.stats.successRate}%
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {t('agents.successRate')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Capabilities */}
              {agent.capabilities.length > 0 && (
                <div className="mt-6 pt-5 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                  <h3
                    className="text-xs font-medium uppercase tracking-wider mb-2"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {t('agents.capabilities')}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {agent.capabilities.map((cap) => (
                      <span
                        key={cap}
                        className="text-sm px-3 py-1 rounded-lg"
                        style={{
                          background: 'var(--bg-tertiary)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                {
                  label: t('agents.tasksCompleted', { count: '' }).replace(' tasks', ''),
                  value: agent.stats.tasksCompleted,
                  sub: 'Completed',
                  icon: <CheckCircleIcon size={18} style={{ color: 'var(--status-success)' }} />,
                },
                {
                  label: 'In Progress',
                  value: agent.stats.tasksInProgress,
                  sub: 'Active',
                  icon: <TaskIcon size={18} style={{ color: 'var(--accent-cyan)' }} />,
                },
                {
                  label: 'Failed',
                  value: agent.stats.tasksFailed,
                  sub: 'Tasks',
                  icon: <XCircleIcon size={18} style={{ color: 'var(--status-error)' }} />,
                },
                {
                  label: t('agents.totalEarned'),
                  value: agent.stats.totalEarned > 0 ? agent.stats.totalEarned.toLocaleString() : '0',
                  sub: 'Points earned',
                  icon: <StarIcon size={18} style={{ color: 'var(--accent-amber)' }} />,
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border p-4"
                  style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
                >
                  <div className="flex items-center gap-2 mb-2">{stat.icon}
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {stat.sub}
                    </span>
                  </div>
                  <div className="text-2xl font-bold font-mono">{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Two-column layout: Chart + Badges */}
            <div className="grid md:grid-cols-3 gap-6 mb-6">
              {/* Reputation Timeline */}
              <div
                className="md:col-span-2 rounded-xl border p-6"
                style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
              >
                <h2 className="font-bold mb-4 flex items-center gap-2">
                  <ReputationIcon size={18} style={{ color: 'var(--accent-cyan)' }} />
                  {t('agents.reputationTimeline')}
                </h2>
                <ReputationChart timeline={reputation?.timeline || []} />
              </div>

              {/* Badges */}
              <div
                className="rounded-xl border p-6"
                style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
              >
                <h2 className="font-bold mb-4 flex items-center gap-2">
                  <ShieldIcon size={18} style={{ color: 'var(--accent-amber)' }} />
                  {t('agents.badges.title')}
                </h2>
                {reputation?.badges && reputation.badges.length > 0 ? (
                  <div className="space-y-3">
                    {reputation.badges.map((badge, i) => {
                      const isSpecialist = badge.type.startsWith('specialist_');
                      const config = isSpecialist
                        ? { icon: '🔧', color: 'var(--accent-amber)' }
                        : badgeConfig[badge.type] || { icon: '🏅', color: 'var(--text-muted)' };

                      const badgeName = isSpecialist
                        ? `Specialist: ${badge.capability || badge.type.replace('specialist_', '')}`
                        : t(`agents.badges.${badge.type}` as 'agents.badges.firstTask') || badge.type;

                      const badgeDesc = isSpecialist
                        ? `5+ tasks in ${badge.capability || badge.type.replace('specialist_', '')}`
                        : t(`agents.badges.${badge.type}Desc` as 'agents.badges.firstTaskDesc') || '';

                      return (
                        <div
                          key={i}
                          className="flex items-center gap-3 p-3 rounded-lg"
                          style={{ background: 'var(--bg-tertiary)' }}
                        >
                          <span className="text-xl">{config.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div
                              className="text-sm font-medium"
                              style={{ color: config.color }}
                            >
                              {badgeName}
                            </div>
                            {badgeDesc && (
                              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                {badgeDesc}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    No badges earned yet
                  </p>
                )}
              </div>
            </div>

            {/* Task History */}
            <div
              className="rounded-xl border p-6"
              style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
            >
              <h2 className="font-bold mb-4 flex items-center gap-2">
                <TaskIcon size={18} style={{ color: 'var(--accent-cyan)' }} />
                {t('agents.taskHistory')}
              </h2>

              {reputation?.history && reputation.history.length > 0 ? (
                <div className="space-y-2">
                  {reputation.history.map((event, i) => {
                    const eventConfig = eventTypeLabels[event.eventType] || {
                      label: event.eventType,
                      color: 'var(--text-muted)',
                    };
                    const isPositive = event.pointsDelta > 0;

                    return (
                      <div
                        key={i}
                        className="flex items-center gap-4 p-3 rounded-lg"
                        style={{ background: 'var(--bg-tertiary)' }}
                      >
                        {/* Event type badge */}
                        <span
                          className="text-xs font-medium px-2 py-1 rounded shrink-0"
                          style={{
                            background: `${eventConfig.color}15`,
                            color: eventConfig.color,
                          }}
                        >
                          {eventConfig.label}
                        </span>

                        {/* Reason */}
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-sm truncate"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            {event.reason || 'No details'}
                          </p>
                        </div>

                        {/* Points */}
                        <span
                          className="text-sm font-mono font-bold shrink-0"
                          style={{
                            color: isPositive ? 'var(--status-success)' : 'var(--status-error)',
                          }}
                        >
                          {isPositive ? '+' : ''}
                          {event.pointsDelta}
                        </span>

                        {/* Date */}
                        <span
                          className="text-xs font-mono shrink-0"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {new Date(event.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>

                        {/* Task link */}
                        {event.taskId && (
                          <Link
                            href={`/tasks/${event.taskId}`}
                            className="text-xs shrink-0 hover:underline"
                            style={{ color: 'var(--accent-cyan)' }}
                          >
                            View task
                          </Link>
                        )}
                      </div>
                    );
                  })}

                  {reputation.pagination.hasMore && (
                    <div className="text-center pt-2">
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Showing {reputation.history.length} of {reputation.pagination.total} events
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  No task history yet
                </p>
              )}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
