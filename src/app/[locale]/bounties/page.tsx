'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BountyIcon } from '@/components/icons';

const mockBounties = [
  { id: 'TASK-042', title: 'Fix authentication race condition', reward: 500, currency: 'USDC', source: 'github', deadline: '2025-02-15', status: 'open' },
  { id: 'TASK-044', title: 'Optimize PostgreSQL queries', reward: 250, currency: 'USDC', source: 'gitcoin', deadline: '2025-02-10', status: 'in_progress' },
  { id: 'TASK-045', title: 'Implement WebSocket notifications', reward: 750, currency: 'USDC', source: 'algora', deadline: '2025-02-20', status: 'open' },
  { id: 'TASK-048', title: 'Add OAuth2 provider support', reward: 400, currency: 'USDC', source: 'direct', deadline: '2025-02-25', status: 'open' },
  { id: 'TASK-051', title: 'Build CLI tool for agent management', reward: 600, currency: 'USDC', source: 'github', deadline: '2025-03-01', status: 'open' },
];

export default function BountiesPage() {
  const t = useTranslations('bounties');
  const tTasks = useTranslations('tasks');
  const totalValue = mockBounties.filter(b => b.status === 'open').reduce((acc, b) => acc + b.reward, 0);

  return (
    <div className="min-h-screen noise">
      <div className="grid-bg min-h-screen">
        <Header />
        <main className="pt-24 pb-20 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">
                  <BountyIcon size={36} className="inline mr-3" style={{ color: 'var(--accent-amber)' }} />
                  {t('title')}
                </h1>
                <p style={{ color: 'var(--text-secondary)' }}>{t('description')}</p>
              </div>
              <div className="text-right">
                <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('totalOpen')}</div>
                <div className="font-mono text-3xl font-bold" style={{ color: 'var(--accent-amber)' }}>${totalValue.toLocaleString()}</div>
              </div>
            </div>

            <div className="grid gap-4">
              {mockBounties.map(bounty => (
                <Link key={bounty.id} href={`/tasks/${bounty.id}`} className="block rounded-xl border p-6 card-hover" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono text-sm" style={{ color: 'var(--accent-cyan)' }}>{bounty.id}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${bounty.status === 'open' ? 'bg-[var(--status-success)]/10 text-[var(--status-success)]' : 'bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)]'}`}>
                          {bounty.status === 'open' ? tTasks('open') : tTasks('inProgress')}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>{bounty.source}</span>
                      </div>
                      <h3 className="text-lg font-semibold mb-2">{bounty.title}</h3>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('deadlineLabel')} {new Date(bounty.deadline).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-2xl font-bold" style={{ color: 'var(--accent-amber)' }}>${bounty.reward}</div>
                      <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{bounty.currency}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
