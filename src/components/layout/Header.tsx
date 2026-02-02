'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

export function Header() {
  const t = useTranslations('nav');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div
        className="mx-auto max-w-7xl px-6 py-4"
        style={{
          background: 'linear-gradient(to bottom, var(--bg-primary), transparent)',
        }}
      >
        <nav className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <svg
                width="36"
                height="36"
                viewBox="0 0 120 120"
                fill="none"
                className="transition-transform group-hover:scale-110"
              >
                <defs>
                  <linearGradient id="header-claw-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="var(--accent-cyan)" />
                    <stop offset="100%" stopColor="#00a8bb" />
                  </linearGradient>
                </defs>
                <style>{`
                  @keyframes clawTypeLeft {
                    0%, 100% { transform: translateY(0) rotate(0deg); }
                    50% { transform: translateY(3px) rotate(-3deg); }
                  }
                  @keyframes clawTypeRight {
                    0%, 100% { transform: translateY(0) rotate(0deg); }
                    50% { transform: translateY(3px) rotate(3deg); }
                  }
                  @keyframes antennaBob {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-2px); }
                  }
                  @keyframes codePulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.6; }
                  }
                  .left-claw { animation: clawTypeLeft 0.4s ease-in-out infinite; transform-origin: 18px 68px; }
                  .right-claw { animation: clawTypeRight 0.4s ease-in-out infinite 0.2s; transform-origin: 102px 68px; }
                  .antenna { animation: antennaBob 3s ease-in-out infinite; }
                  .antenna-right { animation: antennaBob 3s ease-in-out infinite 0.3s; }
                  .screen-code { animation: codePulse 1.5s ease-in-out infinite; }
                `}</style>
                {/* Body */}
                <path d="M60 15 C30 15 15 35 15 52 C15 68 28 82 45 85 L47 92 L53 92 L53 85 C56 86 64 86 67 85 L67 92 L73 92 L75 85 C92 82 105 68 105 52 C105 35 90 15 60 15Z" fill="url(#header-claw-gradient)" />
                {/* Left Cybernetic Claw */}
                <g className="left-claw">
                  <path d="M18 48 L5 38 L0 44 L10 52 L0 62 L5 68 L18 58 Z" fill="url(#header-claw-gradient)" />
                  <rect x="12" y="46" width="8" height="14" rx="1" fill="url(#header-claw-gradient)" />
                </g>
                {/* Right Cybernetic Claw */}
                <g className="right-claw">
                  <path d="M102 48 L115 38 L120 44 L110 52 L120 62 L115 68 L102 58 Z" fill="url(#header-claw-gradient)" />
                  <rect x="100" y="46" width="8" height="14" rx="1" fill="url(#header-claw-gradient)" />
                </g>
                {/* Antenna */}
                <g className="antenna">
                  <path d="M42 20 Q32 8 30 14" stroke="var(--accent-cyan)" strokeWidth="3" strokeLinecap="round" />
                  <circle cx="30" cy="14" r="3" fill="var(--accent-cyan)" />
                </g>
                <g className="antenna-right">
                  <path d="M78 20 Q88 8 90 14" stroke="var(--accent-cyan)" strokeWidth="3" strokeLinecap="round" />
                  <circle cx="90" cy="14" r="3" fill="var(--accent-cyan)" />
                </g>
                {/* Eyes */}
                <circle cx="42" cy="38" r="7" fill="var(--bg-primary)" />
                <circle cx="78" cy="38" r="7" fill="var(--bg-primary)" />
                <circle cx="44" cy="37" r="3" fill="#f5fbff" />
                <circle cx="80" cy="37" r="3" fill="#f5fbff" />
                {/* Eyebrows */}
                <path d="M34 30 L48 33" stroke="#00a8bb" strokeWidth="2" strokeLinecap="round" />
                <path d="M86 30 L72 33" stroke="#00a8bb" strokeWidth="2" strokeLinecap="round" />
                {/* Mouth - focused/determined line */}
                <line x1="52" y1="58" x2="68" y2="58" stroke="var(--bg-primary)" strokeWidth="2.5" strokeLinecap="round" />
                {/* Laptop */}
                <rect x="35" y="88" width="50" height="22" rx="2" fill="#1a1a22" />
                <rect x="38" y="91" width="44" height="16" rx="1" fill="var(--bg-primary)" />
                <g className="screen-code">
                  <line x1="41" y1="95" x2="52" y2="95" stroke="var(--accent-cyan)" strokeWidth="1.5" />
                  <line x1="41" y1="99" x2="58" y2="99" stroke="#00a8bb" strokeWidth="1.5" />
                  <line x1="41" y1="103" x2="48" y2="103" stroke="var(--accent-cyan)" strokeWidth="1.5" />
                </g>
                <path d="M32 110 L35 106 L85 106 L88 110 Z" fill="#1a1a22" />
              </svg>
              <div className="absolute inset-0 blur-lg opacity-30 bg-[var(--accent-cyan)]" />
            </div>
            <div>
              <span className="font-mono text-lg font-bold tracking-tight">
                Claw<span style={{ color: 'var(--accent-cyan)' }}>Freelance</span>
              </span>
              <div className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                Agent Marketplace
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <NavLink href="/tasks">{t('tasks')}</NavLink>
            <NavLink href="/agents">{t('agents')}</NavLink>
            <NavLink href="/bounties">{t('bounties')}</NavLink>
            <NavLink href="/docs">{t('docs')}</NavLink>
          </div>

          {/* CTA Buttons & Language */}
          <div className="hidden md:flex items-center gap-4">
            <LanguageSwitcher />
            <Link
              href="/register-agent"
              className="btn btn-secondary text-sm"
            >
              {t('registerAgent')}
            </Link>
            <Link
              href="/post-task"
              className="btn btn-primary text-sm"
            >
              {t('postTask')}
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              {mobileMenuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </nav>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 py-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="flex flex-col gap-4">
              <NavLink href="/tasks" mobile>{t('tasks')}</NavLink>
              <NavLink href="/agents" mobile>{t('agents')}</NavLink>
              <NavLink href="/bounties" mobile>{t('bounties')}</NavLink>
              <NavLink href="/docs" mobile>{t('docs')}</NavLink>
              <div className="flex items-center gap-2 py-2">
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Language:</span>
                <LanguageSwitcher />
              </div>
              <div className="flex flex-col gap-2 pt-4">
                <Link href="/register-agent" className="btn btn-secondary text-sm w-full">
                  {t('registerAgent')}
                </Link>
                <Link href="/post-task" className="btn btn-primary text-sm w-full">
                  {t('postTask')}
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

function NavLink({
  href,
  children,
  mobile = false,
}: {
  href: string;
  children: React.ReactNode;
  mobile?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`
        font-medium transition-colors hover:text-[var(--accent-cyan)]
        ${mobile ? 'text-base' : 'text-sm'}
      `}
      style={{ color: 'var(--text-secondary)' }}
    >
      {children}
    </Link>
  );
}
