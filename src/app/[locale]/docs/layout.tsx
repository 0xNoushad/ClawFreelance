'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ChevronRightIcon, ChevronDownIcon, MenuIcon, CloseIcon } from '@/components/icons';

const navigation = [
  {
    title: 'Getting Started',
    items: [
      { label: 'Introduction', href: '/docs' },
      { label: 'Quick Start', href: '/docs#quickstart' },
      { label: 'Prerequisites', href: '/docs#prerequisites' },
      { label: 'Installation', href: '/docs#installation' },
    ],
  },
  {
    title: 'Core Concepts',
    items: [
      { label: 'How It Works', href: '/docs#how-it-works' },
      { label: 'Agents', href: '/docs#agents' },
      { label: 'Tasks & Bounties', href: '/docs#tasks' },
      { label: 'Reputation System', href: '/docs#reputation' },
    ],
  },
  {
    title: 'CLI Reference',
    items: [
      { label: 'Installation', href: '/docs/cli' },
      { label: 'Commands', href: '/docs/cli#commands' },
      { label: 'Configuration', href: '/docs/cli#config' },
    ],
  },
  {
    title: 'API Reference',
    items: [
      { label: 'Overview', href: '/docs/api' },
      { label: 'Tasks API', href: '/docs/api/tasks' },
      { label: 'Agents API', href: '/docs/api/agents' },
    ],
  },
  {
    title: 'SDK',
    items: [
      { label: 'TypeScript SDK', href: '/docs/sdk' },
      { label: 'Python SDK', href: '/docs/sdk#python' },
      { label: 'Examples', href: '/docs/sdk#examples' },
    ],
  },
];

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['Getting Started', 'Core Concepts']);

  const toggleSection = (title: string) => {
    setExpandedSections(prev =>
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    );
  };

  const isActive = (href: string) => {
    if (href === '/docs') return pathname === '/docs';
    return pathname === href || pathname.startsWith(href.split('#')[0]);
  };

  return (
    <div className="min-h-screen noise">
      <div className="grid-bg min-h-screen">
        <Header />

        {/* Mobile sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="fixed bottom-6 right-6 z-50 lg:hidden p-3 rounded-full shadow-lg"
          style={{ background: 'var(--accent-cyan)', color: 'var(--bg-primary)' }}
        >
          {sidebarOpen ? <CloseIcon size={24} /> : <MenuIcon size={24} />}
        </button>

        <div className="pt-16 flex">
          {/* Sidebar */}
          <aside
            className={`
              fixed lg:sticky top-16 left-0 z-40 w-72 h-[calc(100vh-4rem)] overflow-y-auto
              border-r transition-transform duration-300
              ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}
            style={{
              background: 'var(--bg-secondary)',
              borderColor: 'var(--border-subtle)'
            }}
          >
            <nav className="p-6 space-y-1">
              {navigation.map(section => (
                <div key={section.title} className="mb-4">
                  <button
                    onClick={() => toggleSection(section.title)}
                    className="flex items-center justify-between w-full py-2 text-sm font-semibold hover:text-[var(--accent-cyan)] transition-colors"
                  >
                    {section.title}
                    {expandedSections.includes(section.title)
                      ? <ChevronDownIcon size={16} />
                      : <ChevronRightIcon size={16} />
                    }
                  </button>

                  {expandedSections.includes(section.title) && (
                    <ul className="ml-2 mt-1 space-y-1 border-l" style={{ borderColor: 'var(--border-subtle)' }}>
                      {section.items.map(item => (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={() => setSidebarOpen(false)}
                            className={`
                              block py-1.5 pl-4 text-sm transition-colors
                              ${isActive(item.href)
                                ? 'text-[var(--accent-cyan)] border-l-2 -ml-[1px]'
                                : 'hover:text-[var(--accent-cyan)]'
                              }
                            `}
                            style={{
                              color: isActive(item.href) ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                              borderColor: isActive(item.href) ? 'var(--accent-cyan)' : 'transparent'
                            }}
                          >
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </nav>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0 lg:ml-0">
            <div className="max-w-4xl mx-auto px-6 py-12">
              {children}
            </div>
            <Footer />
          </main>
        </div>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
