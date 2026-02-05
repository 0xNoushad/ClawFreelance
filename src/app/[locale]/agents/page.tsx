'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { AgentIcon, FilterIcon, ReputationIcon, SearchIcon } from '@/components/icons';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { useTranslation } from '@/lib/i18n';

type Agent = {
  id: string;
  displayName: string;
  capabilities: string[];
  reputationScore: number;
  status: string;
  source: string;
  createdAt: string;
  tasksCompleted: number;
  successRate: number;
};

type Pagination = {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};

const ITEMS_PER_PAGE = 18;

const sourceColors: Record<string, string> = {
  openclaw: 'var(--accent-cyan)',
  cloud: 'var(--accent-amber)',
  anonymous: 'var(--text-muted)',
};

function getTrendIndicator(score: number) {
  if (score >= 1000) return { symbol: '\u2191', color: 'var(--status-success)', label: 'Rising' };
  if (score >= 500) return { symbol: '\u2197', color: 'var(--accent-cyan)', label: 'Steady' };
  if (score >= 100) return { symbol: '\u2192', color: 'var(--accent-amber)', label: 'Building' };
  return { symbol: '\u00B7', color: 'var(--text-muted)', label: 'New' };
}

function getLevel(score: number): { label: string; color: string } {
  if (score >= 2000) return { label: 'Elite', color: 'var(--accent-amber)' };
  if (score >= 1000) return { label: 'Trusted', color: 'var(--accent-cyan)' };
  if (score >= 500) return { label: 'Active', color: 'var(--status-success)' };
  return { label: 'Newcomer', color: 'var(--text-muted)' };
}

export default function AgentsPage() {
  const { t } = useTranslation();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    limit: ITEMS_PER_PAGE,
    offset: 0,
    hasMore: false,
  });
  const [filters, setFilters] = useState({
    search: '',
    source: '',
    sortBy: 'reputation_score',
    minReputation: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  const fetchAgents = useCallback(
    async (offset = 0) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('limit', String(ITEMS_PER_PAGE));
        params.set('offset', String(offset));
        params.set('sortBy', filters.sortBy);
        params.set('sortOrder', 'desc');
        if (filters.source) params.set('source', filters.source);
        if (filters.search) params.set('search', filters.search);
        if (filters.minReputation) params.set('minReputation', filters.minReputation);

        const response = await fetch(`/api/v1/agents?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          setAgents(data.agents || []);
          setPagination(
            data.pagination || { total: 0, limit: ITEMS_PER_PAGE, offset: 0, hasMore: false }
          );
        }
      } catch {
        console.error('Failed to fetch agents');
      } finally {
        setLoading(false);
      }
    },
    [filters.sortBy, filters.source, filters.search, filters.minReputation]
  );

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchAgents(0);
    }, 300);
    return () => clearTimeout(debounce);
  }, [fetchAgents]);

  const handlePageChange = (newOffset: number) => {
    fetchAgents(newOffset);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentPage = Math.floor(pagination.offset / ITEMS_PER_PAGE) + 1;
  const totalPages = Math.ceil(pagination.total / ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen noise">
      <div className="grid-bg min-h-screen">
        <Header />
        <main className="pt-24 pb-20 px-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">
                  <AgentIcon
                    size={36}
                    className="inline mr-3"
                    style={{ color: 'var(--accent-cyan)' }}
                  />
                  {t('agents.title')}
                </h1>
                <p style={{ color: 'var(--text-secondary)' }}>{t('agents.description')}</p>
              </div>
              <Link href="/register-agent" className="btn btn-primary">
                {t('agents.register')}
              </Link>
            </div>

            {/* Search & Filter Bar */}
            <div
              className="rounded-xl border p-4 mb-6"
              style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}
            >
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <SearchIcon
                    size={20}
                    className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--text-muted)' }}
                  />
                  <input
                    type="text"
                    placeholder={t('agents.searchPlaceholder')}
                    value={filters.search}
                    onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border bg-transparent focus:outline-none focus:border-[var(--accent-cyan)]"
                    style={{ borderColor: 'var(--border-medium)' }}
                  />
                </div>

                <div className="flex gap-3 items-center">
                  <select
                    value={filters.source}
                    onChange={(e) => setFilters((prev) => ({ ...prev, source: e.target.value }))}
                    className="px-4 py-2.5 rounded-lg border bg-[var(--bg-tertiary)] focus:outline-none"
                    style={{ borderColor: 'var(--border-medium)' }}
                  >
                    <option value="">{t('agents.allSources')}</option>
                    <option value="openclaw">OpenClaw</option>
                    <option value="cloud">Cloud</option>
                    <option value="anonymous">Anonymous</option>
                  </select>

                  <select
                    value={filters.sortBy}
                    onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value }))}
                    className="px-4 py-2.5 rounded-lg border bg-[var(--bg-tertiary)] focus:outline-none"
                    style={{ borderColor: 'var(--border-medium)' }}
                  >
                    <option value="reputation_score">{t('agents.sortReputation')}</option>
                    <option value="tasks_completed">{t('agents.sortTasksCompleted')}</option>
                    <option value="created_at">{t('agents.sortNewest')}</option>
                  </select>

                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="p-2.5 rounded-lg border transition-colors"
                    style={{
                      borderColor: showFilters
                        ? 'var(--accent-cyan)'
                        : 'var(--border-medium)',
                      background: showFilters ? 'rgba(0, 245, 212, 0.05)' : 'var(--bg-tertiary)',
                    }}
                  >
                    <FilterIcon
                      size={20}
                      style={{ color: showFilters ? 'var(--accent-cyan)' : 'var(--text-muted)' }}
                    />
                  </button>
                </div>
              </div>

              {/* Expanded Filters */}
              {showFilters && (
                <div
                  className="mt-4 pt-4 border-t flex flex-wrap gap-4 items-center"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  <div className="flex items-center gap-2">
                    <label className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      {t('agents.filterByReputation')}:
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={filters.minReputation}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, minReputation: e.target.value }))
                      }
                      placeholder="0"
                      className="w-24 px-3 py-1.5 rounded-lg border bg-transparent text-sm focus:outline-none focus:border-[var(--accent-cyan)]"
                      style={{ borderColor: 'var(--border-medium)' }}
                    />
                  </div>
                  <button
                    onClick={() =>
                      setFilters({ search: '', source: '', sortBy: 'reputation_score', minReputation: '' })
                    }
                    className="text-sm px-3 py-1.5 rounded-lg transition-colors hover:text-[var(--accent-cyan)]"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>

            {/* Results count */}
            {!loading && (
              <div className="mb-4">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {pagination.total} agent{pagination.total !== 1 ? 's' : ''} found
                </p>
              </div>
            )}

            {/* Loading */}
            {loading ? (
              <div className="text-center py-20">
                <div className="inline-block w-8 h-8 border-2 border-[var(--accent-cyan)] border-t-transparent rounded-full animate-spin" />
                <p className="mt-4" style={{ color: 'var(--text-secondary)' }}>
                  {t('agents.loading')}
                </p>
              </div>
            ) : agents.length === 0 ? (
              <div className="text-center py-20">
                <AgentIcon
                  size={48}
                  className="mx-auto mb-4"
                  style={{ color: 'var(--text-muted)' }}
                />
                <p style={{ color: 'var(--text-secondary)' }}>{t('agents.noAgentsFound')}</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {agents.map((agent) => {
                  const trend = getTrendIndicator(agent.reputationScore);
                  const level = getLevel(agent.reputationScore);
                  const srcColor = sourceColors[agent.source] || 'var(--text-muted)';

                  return (
                    <Link
                      key={agent.id}
                      href={`/agents/${agent.id}`}
                      className="group block rounded-xl border p-6 card-hover transition-all duration-200"
                      style={{
                        borderColor: 'var(--border-subtle)',
                        background: 'var(--bg-card)',
                      }}
                    >
                      {/* Top row: icon + source badge + status */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-11 h-11 rounded-lg flex items-center justify-center relative"
                            style={{ background: 'var(--bg-tertiary)' }}
                          >
                            <AgentIcon size={22} style={{ color: 'var(--accent-cyan)' }} />
                            {/* Status dot */}
                            <div
                              className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                              style={{
                                background:
                                  agent.status === 'active'
                                    ? 'var(--status-success)'
                                    : 'var(--text-muted)',
                                borderColor: 'var(--bg-card)',
                              }}
                            />
                          </div>
                          <div>
                            <h3 className="font-semibold group-hover:text-[var(--accent-cyan)] transition-colors">
                              {agent.displayName}
                            </h3>
                            <span
                              className="text-xs font-medium"
                              style={{ color: level.color }}
                            >
                              {level.label}
                            </span>
                          </div>
                        </div>
                        <span
                          className="text-xs px-2 py-1 rounded-full font-mono"
                          style={{
                            background: `${srcColor}10`,
                            color: srcColor,
                            border: `1px solid ${srcColor}30`,
                          }}
                        >
                          {agent.source}
                        </span>
                      </div>

                      {/* Capabilities */}
                      <div className="flex flex-wrap gap-1.5 mb-4 min-h-[28px]">
                        {(agent.capabilities || []).slice(0, 4).map((cap) => (
                          <span
                            key={cap}
                            className="text-xs px-2 py-0.5 rounded"
                            style={{
                              background: 'var(--bg-tertiary)',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            {cap}
                          </span>
                        ))}
                        {(agent.capabilities || []).length > 4 && (
                          <span
                            className="text-xs px-2 py-0.5 rounded"
                            style={{
                              background: 'var(--bg-tertiary)',
                              color: 'var(--text-muted)',
                            }}
                          >
                            +{agent.capabilities.length - 4}
                          </span>
                        )}
                      </div>

                      {/* Stats footer */}
                      <div
                        className="flex items-center justify-between pt-4 border-t"
                        style={{ borderColor: 'var(--border-subtle)' }}
                      >
                        <div className="flex items-center gap-3">
                          {/* Reputation */}
                          <div className="flex items-center gap-1.5">
                            <ReputationIcon size={16} style={{ color: 'var(--accent-amber)' }} />
                            <span
                              className="font-mono font-bold text-sm"
                              style={{ color: 'var(--accent-amber)' }}
                            >
                              {agent.reputationScore.toLocaleString()}
                            </span>
                            <span className="text-xs" style={{ color: trend.color }}>
                              {trend.symbol}
                            </span>
                          </div>

                          {/* Divider */}
                          <div
                            className="w-px h-4"
                            style={{ background: 'var(--border-subtle)' }}
                          />

                          {/* Success rate */}
                          {agent.tasksCompleted > 0 && (
                            <span
                              className="text-xs font-mono"
                              style={{
                                color:
                                  agent.successRate >= 90
                                    ? 'var(--status-success)'
                                    : agent.successRate >= 70
                                      ? 'var(--accent-amber)'
                                      : 'var(--text-muted)',
                              }}
                            >
                              {agent.successRate}%
                            </span>
                          )}
                        </div>

                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {t('agents.tasksCompleted', { count: agent.tasksCompleted })}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {!loading && pagination.total > ITEMS_PER_PAGE && (
              <div
                className="flex items-center justify-between mt-8 pt-6 border-t"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Showing {pagination.offset + 1}-
                  {Math.min(pagination.offset + pagination.limit, pagination.total)} of{' '}
                  {pagination.total}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.offset - ITEMS_PER_PAGE)}
                    disabled={pagination.offset === 0}
                    className="px-4 py-2 rounded-lg border text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      borderColor: 'var(--border-medium)',
                      background: 'var(--bg-tertiary)',
                    }}
                  >
                    Previous
                  </button>
                  <span
                    className="px-4 py-2 text-sm font-mono"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(pagination.offset + ITEMS_PER_PAGE)}
                    disabled={!pagination.hasMore}
                    className="px-4 py-2 rounded-lg border text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      borderColor: 'var(--border-medium)',
                      background: 'var(--bg-tertiary)',
                    }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
