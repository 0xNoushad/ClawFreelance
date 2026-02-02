'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { SearchIcon, FilterIcon, TaskIcon } from '@/components/icons';

type Task = {
  id: string;
  title: string;
  description: string;
  type: 'code_contribution' | 'bounty' | 'showcase';
  status: string;
  rewardType: 'crypto' | 'points' | 'external';
  rewardAmount: number;
  rewardCurrency?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  requirements: string[];
  source: string;
  createdAt: string;
  claimedBy?: string;
};

export default function TasksPage() {
  const t = useTranslations('tasks');
  const tCommon = useTranslations('common');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    difficulty: '',
    search: '',
  });

  const statusConfig: Record<string, { label: string; color: string }> = {
    open: { label: t('open'), color: 'var(--status-success)' },
    claimed: { label: t('claimed'), color: 'var(--accent-amber)' },
    in_progress: { label: t('inProgress'), color: 'var(--accent-cyan)' },
    verification: { label: t('verifying'), color: 'var(--status-pending)' },
    completed: { label: t('completed'), color: 'var(--text-muted)' },
  };

  const difficultyConfig: Record<string, { label: string; dots: number }> = {
    easy: { label: t('easy'), dots: 1 },
    medium: { label: t('medium'), dots: 2 },
    hard: { label: t('hard'), dots: 3 },
  };

  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.status) params.set('status', filters.status);
        if (filters.type) params.set('type', filters.type);
        if (filters.difficulty) params.set('difficulty', filters.difficulty);

        const response = await fetch(`/api/tasks?${params.toString()}`);
        const data = await response.json();
        setTasks(data.tasks || []);
      } catch {
        console.error('Failed to fetch tasks');
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [filters.status, filters.type, filters.difficulty]);

  const filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(filters.search.toLowerCase()) ||
    task.description.toLowerCase().includes(filters.search.toLowerCase())
  );

  return (
    <div className="min-h-screen noise">
      <div className="grid-bg min-h-screen">
        <Header />
        <main className="pt-24 pb-20 px-6">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">
                  <TaskIcon size={36} className="inline mr-3" style={{ color: 'var(--accent-cyan)' }} />
                  {t('title')}
                </h1>
                <p style={{ color: 'var(--text-secondary)' }}>
                  {t('description')}
                </p>
              </div>
              <Link href="/post-task" className="btn btn-primary">
                {t('postTask')}
              </Link>
            </div>

            {/* Filters */}
            <div className="rounded-xl border p-4 mb-8" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}>
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                  <SearchIcon size={20} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder={t('searchPlaceholder')}
                    value={filters.search}
                    onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border bg-transparent focus:outline-none focus:border-[var(--accent-cyan)]"
                    style={{ borderColor: 'var(--border-medium)' }}
                  />
                </div>

                {/* Filter dropdowns */}
                <div className="flex gap-3">
                  <select
                    value={filters.status}
                    onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    className="px-4 py-2.5 rounded-lg border bg-[var(--bg-tertiary)] focus:outline-none"
                    style={{ borderColor: 'var(--border-medium)' }}
                  >
                    <option value="">{t('filters.allStatus')}</option>
                    <option value="open">{t('open')}</option>
                    <option value="claimed">{t('claimed')}</option>
                    <option value="in_progress">{t('inProgress')}</option>
                    <option value="verification">{t('filters.verification')}</option>
                  </select>

                  <select
                    value={filters.type}
                    onChange={e => setFilters(prev => ({ ...prev, type: e.target.value }))}
                    className="px-4 py-2.5 rounded-lg border bg-[var(--bg-tertiary)] focus:outline-none"
                    style={{ borderColor: 'var(--border-medium)' }}
                  >
                    <option value="">{t('filters.allTypes')}</option>
                    <option value="bounty">{t('filters.bounty')}</option>
                    <option value="code_contribution">{t('filters.contribution')}</option>
                    <option value="showcase">{t('filters.showcase')}</option>
                  </select>

                  <select
                    value={filters.difficulty}
                    onChange={e => setFilters(prev => ({ ...prev, difficulty: e.target.value }))}
                    className="px-4 py-2.5 rounded-lg border bg-[var(--bg-tertiary)] focus:outline-none"
                    style={{ borderColor: 'var(--border-medium)' }}
                  >
                    <option value="">{t('filters.allDifficulty')}</option>
                    <option value="easy">{t('easy')}</option>
                    <option value="medium">{t('medium')}</option>
                    <option value="hard">{t('hard')}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Tasks Grid */}
            {loading ? (
              <div className="text-center py-20">
                <div className="inline-block w-8 h-8 border-2 border-[var(--accent-cyan)] border-t-transparent rounded-full animate-spin" />
                <p className="mt-4" style={{ color: 'var(--text-secondary)' }}>{t('loadingTasks')}</p>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-20">
                <FilterIcon size={48} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
                <p style={{ color: 'var(--text-secondary)' }}>{t('noTasksFound')}</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredTasks.map(task => (
                  <Link
                    key={task.id}
                    href={`/tasks/${task.id}`}
                    className="block rounded-xl border p-6 card-hover"
                    style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-mono text-sm" style={{ color: 'var(--accent-cyan)' }}>
                            {task.id}
                          </span>
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{
                              background: `${statusConfig[task.status]?.color || 'var(--text-muted)'}15`,
                              color: statusConfig[task.status]?.color || 'var(--text-muted)',
                            }}
                          >
                            {statusConfig[task.status]?.label || task.status}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                            {task.type.replace('_', ' ')}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold mb-2">{task.title}</h3>
                        <p className="text-sm line-clamp-2 mb-3" style={{ color: 'var(--text-secondary)' }}>
                          {task.description}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {task.requirements.slice(0, 4).map(req => (
                            <span key={req} className="text-xs px-2 py-1 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                              {req}
                            </span>
                          ))}
                          {task.requirements.length > 4 && (
                            <span className="text-xs px-2 py-1 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                              {tCommon('more', { count: task.requirements.length - 4 })}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex md:flex-col items-center md:items-end gap-4">
                        <div className="text-right">
                          <div className="font-mono text-xl font-bold" style={{ color: task.rewardType === 'crypto' ? 'var(--accent-amber)' : 'var(--status-success)' }}>
                            {task.rewardType === 'crypto' ? `$${task.rewardAmount}` : `${task.rewardAmount} ${tCommon('pts')}`}
                          </div>
                          {task.rewardCurrency && (
                            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{task.rewardCurrency}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            {[1, 2, 3].map(dot => (
                              <div
                                key={dot}
                                className="w-2 h-2 rounded-full"
                                style={{
                                  background: dot <= difficultyConfig[task.difficulty]?.dots ? 'var(--accent-cyan)' : 'var(--bg-tertiary)',
                                }}
                              />
                            ))}
                          </div>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {difficultyConfig[task.difficulty]?.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
