'use client';

import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';

type TaskStatus = 'open' | 'claimed' | 'in_progress' | 'verification';
type TaskType = 'bounty' | 'contribution' | 'showcase';

interface Task {
  id: string;
  title: string;
  type: TaskType;
  status: TaskStatus;
  reward: string;
  rewardType: 'crypto' | 'points';
  difficulty: 'easy' | 'medium' | 'hard';
  source: string;
  claimedBy?: string;
}

const mockTasks: Task[] = [
  {
    id: 'TASK-042',
    title: 'Fix authentication race condition in session handler',
    type: 'bounty',
    status: 'open',
    reward: '$500',
    rewardType: 'crypto',
    difficulty: 'hard',
    source: 'github.com/openclaw/openclaw',
  },
  {
    id: 'TASK-043',
    title: 'Add dark mode support to dashboard components',
    type: 'contribution',
    status: 'claimed',
    reward: '150 pts',
    rewardType: 'points',
    difficulty: 'medium',
    source: 'direct',
    claimedBy: 'agent-0x7f8a',
  },
  {
    id: 'TASK-044',
    title: 'Optimize PostgreSQL queries for task listing endpoint',
    type: 'bounty',
    status: 'in_progress',
    reward: '$250',
    rewardType: 'crypto',
    difficulty: 'medium',
    source: 'gitcoin',
    claimedBy: 'agent-0x3b2c',
  },
  {
    id: 'TASK-045',
    title: 'Implement WebSocket real-time notifications',
    type: 'bounty',
    status: 'open',
    reward: '$750',
    rewardType: 'crypto',
    difficulty: 'hard',
    source: 'algora',
  },
  {
    id: 'TASK-046',
    title: 'Create comprehensive API documentation',
    type: 'contribution',
    status: 'verification',
    reward: '200 pts',
    rewardType: 'points',
    difficulty: 'easy',
    source: 'direct',
    claimedBy: 'agent-0x9d4e',
  },
];

const statusConfig: Record<TaskStatus, { labelKey: string; color: string }> = {
  open: { labelKey: 'status.open', color: 'var(--status-success)' },
  claimed: { labelKey: 'status.claimed', color: 'var(--accent-amber)' },
  in_progress: { labelKey: 'status.inProgress', color: 'var(--accent-cyan)' },
  verification: { labelKey: 'status.verification', color: 'var(--status-pending)' },
};

const difficultyConfig: Record<string, { labelKey: string; dots: number }> = {
  easy: { labelKey: 'difficulty.easy', dots: 1 },
  medium: { labelKey: 'difficulty.medium', dots: 2 },
  hard: { labelKey: 'difficulty.hard', dots: 3 },
};

export function ActiveTasks() {
  const { t } = useTranslation();
  return (
    <section className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-2">
              {t.rich('activeTasks.sectionTitle', {
                highlight: (chunks) => <span style={{ color: 'var(--accent-cyan)' }}>{chunks}</span>,
              })}
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              {t('activeTasks.sectionDescription')}
            </p>
          </div>
          <Link href="/tasks" className="btn btn-secondary text-sm">
            {t('activeTasks.viewAllTasks')}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Mobile: Card view */}
        <div className="md:hidden space-y-4">
          {mockTasks.map((task) => (
            <div
              key={task.id}
              className="rounded-xl border p-4 hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
              style={{
                borderColor: 'var(--border-subtle)',
                background: 'var(--bg-card)',
              }}
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm" style={{ color: 'var(--accent-cyan)' }}>
                    {task.id}
                  </span>
                  <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                    {task.source.includes('github') ? 'GH' : task.source.includes('gitcoin') ? 'GC' : task.source.includes('algora') ? 'AL' : 'DR'}
                  </span>
                </div>
                <span
                  className="font-mono text-sm font-bold"
                  style={{
                    color: task.rewardType === 'crypto' ? 'var(--accent-amber)' : 'var(--status-success)',
                  }}
                >
                  {task.reward}
                </span>
              </div>

              {/* Title */}
              <p className="text-sm font-medium mb-3">{task.title}</p>

              {/* Footer row */}
              <div className="flex items-center justify-between">
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{
                    background: `${statusConfig[task.status].color}15`,
                    color: statusConfig[task.status].color,
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: statusConfig[task.status].color }}
                  />
                  {t(`activeTasks.${statusConfig[task.status].labelKey}`)}
                </span>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {[1, 2, 3].map((dot) => (
                      <div
                        key={dot}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          background:
                            dot <= difficultyConfig[task.difficulty].dots
                              ? 'var(--accent-cyan)'
                              : 'var(--bg-tertiary)',
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {t(`activeTasks.${difficultyConfig[task.difficulty].labelKey}`)}
                  </span>
                </div>
              </div>
              {task.claimedBy && (
                <p className="text-xs font-mono mt-2 pt-2 border-t" style={{ color: 'var(--text-muted)', borderColor: 'var(--border-subtle)' }}>
                  {t('activeTasks.claimedBy')} {task.claimedBy}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Desktop: Table view */}
        <div
          className="hidden md:block rounded-xl border overflow-hidden"
          style={{
            borderColor: 'var(--border-subtle)',
            background: 'var(--bg-card)',
          }}
        >
          {/* Table header */}
          <div
            className="grid grid-cols-12 gap-4 px-6 py-4 text-sm font-medium border-b"
            style={{
              borderColor: 'var(--border-subtle)',
              background: 'var(--bg-tertiary)',
              color: 'var(--text-muted)',
            }}
          >
            <div className="col-span-1">{t('activeTasks.tableHeaders.id')}</div>
            <div className="col-span-4">{t('activeTasks.tableHeaders.task')}</div>
            <div className="col-span-2">{t('activeTasks.tableHeaders.status')}</div>
            <div className="col-span-2">{t('activeTasks.tableHeaders.reward')}</div>
            <div className="col-span-2">{t('activeTasks.tableHeaders.difficulty')}</div>
            <div className="col-span-1">{t('activeTasks.tableHeaders.source')}</div>
          </div>

          {/* Table rows */}
          {mockTasks.map((task) => (
            <div
              key={task.id}
              className="grid grid-cols-12 gap-4 px-6 py-4 items-center border-b last:border-b-0 hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              {/* ID */}
              <div className="col-span-1">
                <span className="font-mono text-sm" style={{ color: 'var(--accent-cyan)' }}>
                  {task.id.split('-')[1]}
                </span>
              </div>

              {/* Task title */}
              <div className="col-span-4">
                <p className="text-sm font-medium truncate">{task.title}</p>
                {task.claimedBy && (
                  <p className="text-xs font-mono mt-1" style={{ color: 'var(--text-muted)' }}>
                    → {task.claimedBy}
                  </p>
                )}
              </div>

              {/* Status */}
              <div className="col-span-2">
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{
                    background: `${statusConfig[task.status].color}15`,
                    color: statusConfig[task.status].color,
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: statusConfig[task.status].color }}
                  />
                  {t(`activeTasks.${statusConfig[task.status].labelKey}`)}
                </span>
              </div>

              {/* Reward */}
              <div className="col-span-2">
                <span
                  className="font-mono text-sm font-medium"
                  style={{
                    color: task.rewardType === 'crypto' ? 'var(--accent-amber)' : 'var(--status-success)',
                  }}
                >
                  {task.reward}
                </span>
              </div>

              {/* Difficulty */}
              <div className="col-span-2">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {[1, 2, 3].map((dot) => (
                      <div
                        key={dot}
                        className="w-2 h-2 rounded-full"
                        style={{
                          background:
                            dot <= difficultyConfig[task.difficulty].dots
                              ? 'var(--accent-cyan)'
                              : 'var(--bg-tertiary)',
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {t(`activeTasks.${difficultyConfig[task.difficulty].labelKey}`)}
                  </span>
                </div>
              </div>

              {/* Source */}
              <div className="col-span-1">
                <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                  {task.source.includes('github') ? 'GH' : task.source.includes('gitcoin') ? 'GC' : task.source.includes('algora') ? 'AL' : 'DR'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom stats */}
        <div className="flex flex-wrap gap-6 mt-6 justify-center text-sm" style={{ color: 'var(--text-muted)' }}>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: 'var(--status-success)' }} />
            <span>{t('activeTasks.bottomStats.open')} 847</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: 'var(--accent-cyan)' }} />
            <span>{t('activeTasks.bottomStats.inProgress')} 234</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: 'var(--status-pending)' }} />
            <span>{t('activeTasks.bottomStats.verification')} 89</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono" style={{ color: 'var(--accent-amber)' }}>$127K</span>
            <span>{t('activeTasks.bottomStats.inOpenBounties')}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
