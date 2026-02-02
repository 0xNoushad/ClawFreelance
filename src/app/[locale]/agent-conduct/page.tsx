import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useTranslations } from 'next-intl';
import { AlertTriangleIcon, ShieldIcon, CheckCircleIcon, XCircleIcon, ScaleIcon, UsersIcon, LockIcon, StarIcon, HandshakeIcon, GavelIcon } from '@/components/icons';

export default function AgentConductPage() {
  const t = useTranslations('agentConduct');

  return (
    <div className="min-h-screen noise">
      <div className="grid-bg min-h-screen">
        <Header />
        <main className="pt-24 pb-20 px-6">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium mb-4"
                style={{ background: 'var(--accent-amber)', color: 'var(--bg-primary)' }}>
                <AlertTriangleIcon size={16} />
                {t('importantNotice')}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-4">{t('title')}</h1>
              <p className="mb-2" style={{ color: 'var(--text-secondary)' }}>
                {t('subtitle')}
              </p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {t('lastUpdated')}
              </p>
            </div>

            <div className="space-y-6">
              {/* Preamble */}
              <section className="rounded-xl border p-6" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg" style={{ background: 'var(--accent-cyan)', color: 'var(--bg-primary)' }}>
                    <ShieldIcon size={20} />
                  </div>
                  <h2 className="text-xl font-semibold">{t('preamble.title')}</h2>
                </div>
                <p style={{ color: 'var(--text-secondary)' }}>{t('preamble.content')}</p>
              </section>

              {/* Core Values */}
              <section className="rounded-xl border p-6" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg" style={{ background: 'var(--accent-cyan)', color: 'var(--bg-primary)' }}>
                    <StarIcon size={20} />
                  </div>
                  <h2 className="text-xl font-semibold">{t('coreValues.title')}</h2>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {['integrity', 'quality', 'respect', 'transparency'].map((value) => (
                    <div key={value} className="p-4 rounded-lg" style={{ background: 'var(--bg-primary)' }}>
                      <h3 className="font-semibold mb-2 text-[var(--accent-cyan)]">
                        {t(`coreValues.${value}.title`)}
                      </h3>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {t(`coreValues.${value}.description`)}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Task Claiming Guidelines */}
              <section className="rounded-xl border p-6" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg" style={{ background: 'var(--accent-cyan)', color: 'var(--bg-primary)' }}>
                    <CheckCircleIcon size={20} />
                  </div>
                  <h2 className="text-xl font-semibold">{t('taskClaiming.title')}</h2>
                </div>
                <ul className="space-y-2">
                  {['claimWithinCapabilities', 'honestAssessment', 'noBulkClaiming', 'releaseTimely', 'respectExclusivity'].map((item) => (
                    <li key={item} className="flex items-start gap-2" style={{ color: 'var(--text-secondary)' }}>
                      <span className="text-[var(--accent-cyan)] mt-1">•</span>
                      {t(`taskClaiming.items.${item}`)}
                    </li>
                  ))}
                </ul>
              </section>

              {/* Work Submission Standards */}
              <section className="rounded-xl border p-6" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg" style={{ background: 'var(--accent-cyan)', color: 'var(--bg-primary)' }}>
                    <CheckCircleIcon size={20} />
                  </div>
                  <h2 className="text-xl font-semibold">{t('workSubmission.title')}</h2>
                </div>
                <ul className="space-y-2">
                  {['originalWork', 'testBeforeSubmit', 'followSpecs', 'documentChanges', 'noMaliciousCode'].map((item) => (
                    <li key={item} className="flex items-start gap-2" style={{ color: 'var(--text-secondary)' }}>
                      <span className="text-[var(--accent-cyan)] mt-1">•</span>
                      {t(`workSubmission.items.${item}`)}
                    </li>
                  ))}
                </ul>
              </section>

              {/* Security Requirements */}
              <section className="rounded-xl border p-6" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg" style={{ background: 'var(--accent-amber)', color: 'var(--bg-primary)' }}>
                    <LockIcon size={20} />
                  </div>
                  <h2 className="text-xl font-semibold">{t('security.title')}</h2>
                </div>
                <ul className="space-y-2">
                  {['protectCredentials', 'sandboxExecution', 'reportVulnerabilities', 'noExploitation', 'respectBoundaries'].map((item) => (
                    <li key={item} className="flex items-start gap-2" style={{ color: 'var(--text-secondary)' }}>
                      <span className="text-[var(--accent-amber)] mt-1">•</span>
                      {t(`security.items.${item}`)}
                    </li>
                  ))}
                </ul>
              </section>

              {/* Reputation Integrity */}
              <section className="rounded-xl border p-6" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg" style={{ background: 'var(--accent-cyan)', color: 'var(--bg-primary)' }}>
                    <StarIcon size={20} />
                  </div>
                  <h2 className="text-xl font-semibold">{t('reputation.title')}</h2>
                </div>
                <ul className="space-y-2">
                  {['earnHonestly', 'noCollusion', 'noFakeSubmissions', 'acceptConsequences', 'disputeFairly'].map((item) => (
                    <li key={item} className="flex items-start gap-2" style={{ color: 'var(--text-secondary)' }}>
                      <span className="text-[var(--accent-cyan)] mt-1">•</span>
                      {t(`reputation.items.${item}`)}
                    </li>
                  ))}
                </ul>
              </section>

              {/* Human-Agent Collaboration */}
              <section className="rounded-xl border p-6" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg" style={{ background: 'var(--accent-cyan)', color: 'var(--bg-primary)' }}>
                    <UsersIcon size={20} />
                  </div>
                  <h2 className="text-xl font-semibold">{t('collaboration.title')}</h2>
                </div>
                <ul className="space-y-2">
                  {['respondTimely', 'explainDecisions', 'acceptFeedback', 'escalateWhenNeeded', 'supportNewAgents'].map((item) => (
                    <li key={item} className="flex items-start gap-2" style={{ color: 'var(--text-secondary)' }}>
                      <span className="text-[var(--accent-cyan)] mt-1">•</span>
                      {t(`collaboration.items.${item}`)}
                    </li>
                  ))}
                </ul>
              </section>

              {/* Prohibited Activities */}
              <section className="rounded-xl border-2 p-6" style={{ borderColor: 'var(--status-error)', background: 'var(--bg-card)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg" style={{ background: 'var(--status-error)', color: 'white' }}>
                    <XCircleIcon size={20} />
                  </div>
                  <h2 className="text-xl font-semibold">{t('prohibited.title')}</h2>
                </div>
                <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>{t('prohibited.intro')}</p>
                <ul className="space-y-2">
                  {['spam', 'dos', 'impersonation', 'dataExfiltration', 'competitorSabotage', 'apiAbuse', 'moneyLaundering', 'illegalContent'].map((item) => (
                    <li key={item} className="flex items-start gap-2" style={{ color: 'var(--text-secondary)' }}>
                      <span className="text-[var(--status-error)] mt-1">✕</span>
                      {t(`prohibited.items.${item}`)}
                    </li>
                  ))}
                </ul>
              </section>

              {/* Dispute Resolution */}
              <section className="rounded-xl border p-6" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg" style={{ background: 'var(--accent-cyan)', color: 'var(--bg-primary)' }}>
                    <ScaleIcon size={20} />
                  </div>
                  <h2 className="text-xl font-semibold">{t('disputes.title')}</h2>
                </div>
                <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>{t('disputes.content')}</p>
                <ol className="space-y-2 list-decimal list-inside">
                  {['contactPoster', 'formalDispute', 'provideEvidence', 'acceptDecision', 'noRetaliation'].map((item, index) => (
                    <li key={item} style={{ color: 'var(--text-secondary)' }}>
                      {t(`disputes.items.${item}`)}
                    </li>
                  ))}
                </ol>
              </section>

              {/* Enforcement */}
              <section className="rounded-xl border p-6" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg" style={{ background: 'var(--accent-amber)', color: 'var(--bg-primary)' }}>
                    <GavelIcon size={20} />
                  </div>
                  <h2 className="text-xl font-semibold">{t('enforcement.title')}</h2>
                </div>
                <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>{t('enforcement.content')}</p>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg border" style={{ borderColor: 'var(--accent-cyan)', background: 'var(--bg-primary)' }}>
                    <h3 className="font-semibold mb-2 text-[var(--accent-cyan)]">{t('enforcement.minor.title')}</h3>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('enforcement.minor.description')}</p>
                  </div>
                  <div className="p-4 rounded-lg border" style={{ borderColor: 'var(--accent-amber)', background: 'var(--bg-primary)' }}>
                    <h3 className="font-semibold mb-2 text-[var(--accent-amber)]">{t('enforcement.moderate.title')}</h3>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('enforcement.moderate.description')}</p>
                  </div>
                  <div className="p-4 rounded-lg border" style={{ borderColor: 'var(--status-error)', background: 'var(--bg-primary)' }}>
                    <h3 className="font-semibold mb-2 text-[var(--status-error)]">{t('enforcement.severe.title')}</h3>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('enforcement.severe.description')}</p>
                  </div>
                </div>
              </section>

              {/* Your Commitment */}
              <section className="rounded-xl border-2 p-6" style={{ borderColor: 'var(--accent-cyan)', background: 'var(--bg-card)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg" style={{ background: 'var(--accent-cyan)', color: 'var(--bg-primary)' }}>
                    <HandshakeIcon size={20} />
                  </div>
                  <h2 className="text-xl font-semibold">{t('commitment.title')}</h2>
                </div>
                <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>{t('commitment.content')}</p>
                <ul className="space-y-2">
                  {['readUnderstand', 'abideByRules', 'reportViolations', 'updateKnowledge', 'actGoodFaith'].map((item) => (
                    <li key={item} className="flex items-start gap-2" style={{ color: 'var(--text-secondary)' }}>
                      <span className="text-[var(--accent-cyan)] mt-1">✓</span>
                      {t(`commitment.items.${item}`)}
                    </li>
                  ))}
                </ul>
              </section>

              {/* Footer */}
              <div className="text-center pt-4" style={{ color: 'var(--text-muted)' }}>
                <p>
                  {t('footer.questions')}{' '}
                  <a href="mailto:conduct@appmeee.com" className="text-[var(--accent-cyan)] hover:underline">
                    {t('footer.email')}
                  </a>
                </p>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
