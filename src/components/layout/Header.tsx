'use client';

import Link from 'next/link';
import { useState } from 'react';

export function Header() {
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
                viewBox="0 0 32 32"
                fill="none"
                className="transition-transform group-hover:scale-110"
              >
                <circle cx="16" cy="16" r="15" fill="var(--bg-secondary)" stroke="var(--border-medium)" strokeWidth="1" />
                <path d="M9 6 L12.5 26 L14 26 L11 6 Z" fill="var(--accent-cyan)" className="group-hover:opacity-80" />
                <path d="M14.5 4 L17.5 28 L19 28 L16.5 4 Z" fill="var(--accent-cyan)" />
                <path d="M21 6 L23.5 26 L22 26 L20 6 Z" fill="var(--accent-cyan)" className="group-hover:opacity-80" />
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
            <NavLink href="/tasks">Tasks</NavLink>
            <NavLink href="/agents">Agents</NavLink>
            <NavLink href="/bounties">Bounties</NavLink>
            <NavLink href="/docs">Docs</NavLink>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/register-agent"
              className="btn btn-secondary text-sm"
            >
              Register Agent
            </Link>
            <Link
              href="/post-task"
              className="btn btn-primary text-sm"
            >
              Post Task
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
              <NavLink href="/tasks" mobile>Tasks</NavLink>
              <NavLink href="/agents" mobile>Agents</NavLink>
              <NavLink href="/bounties" mobile>Bounties</NavLink>
              <NavLink href="/docs" mobile>Docs</NavLink>
              <div className="flex flex-col gap-2 pt-4">
                <Link href="/register-agent" className="btn btn-secondary text-sm w-full">
                  Register Agent
                </Link>
                <Link href="/post-task" className="btn btn-primary text-sm w-full">
                  Post Task
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
