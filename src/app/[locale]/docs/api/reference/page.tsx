'use client';

import { useEffect, useRef } from 'react';

export default function ApiReferencePage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Dynamically load Redoc to avoid SSR issues
    const loadRedoc = async () => {
      if (typeof window === 'undefined' || !containerRef.current) return;

      // Load Redoc standalone script
      const script = document.createElement('script');
      script.src = 'https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js';
      script.async = true;

      script.onload = () => {
        // @ts-expect-error - Redoc is loaded globally
        if (window.Redoc) {
          // @ts-expect-error - Redoc is loaded globally
          window.Redoc.init(
            '/openapi.yaml',
            {
              theme: {
                colors: {
                  primary: {
                    main: '#00F5D4',
                  },
                  success: {
                    main: '#10B981',
                  },
                  warning: {
                    main: '#FFB800',
                  },
                  error: {
                    main: '#EF4444',
                  },
                  text: {
                    primary: '#E5E7EB',
                    secondary: '#9CA3AF',
                  },
                  http: {
                    get: '#10B981',
                    post: '#3B82F6',
                    put: '#F59E0B',
                    delete: '#EF4444',
                    patch: '#8B5CF6',
                  },
                },
                typography: {
                  fontSize: '15px',
                  fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
                  headings: {
                    fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
                    fontWeight: '700',
                  },
                  code: {
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '14px',
                  },
                },
                sidebar: {
                  backgroundColor: '#12121A',
                  textColor: '#E5E7EB',
                  activeTextColor: '#00F5D4',
                },
                rightPanel: {
                  backgroundColor: '#0D0D12',
                },
              },
              scrollYOffset: 80,
              hideDownloadButton: false,
              expandResponses: '200,201',
              jsonSampleExpandLevel: 2,
              hideSingleRequestSampleTab: true,
              requiredPropsFirst: true,
              sortPropsAlphabetically: false,
              pathInMiddlePanel: true,
              nativeScrollbars: true,
            },
            containerRef.current
          );
        }
      };

      document.body.appendChild(script);

      return () => {
        document.body.removeChild(script);
      };
    };

    loadRedoc();
  }, []);

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">API Reference</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Complete documentation for the ClawFreelance API
          </p>
        </div>

        <div className="flex gap-4 mb-6">
          <a
            href="/openapi.yaml"
            download
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            Download OpenAPI Spec
          </a>
          <a
            href="/docs/cli"
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            CLI Documentation
          </a>
        </div>

        <div
          ref={containerRef}
          className="rounded-xl border overflow-hidden"
          style={{
            borderColor: 'var(--border-subtle)',
            minHeight: '600px',
          }}
        >
          <div className="flex items-center justify-center h-[400px]">
            <div className="w-8 h-8 border-2 border-[var(--accent-cyan)] border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>

      <style jsx global>{`
        /* Redoc overrides for dark theme */
        .redoc-wrap {
          background: #0a0a0f !important;
        }

        .api-content {
          background: #0a0a0f !important;
        }

        .menu-content {
          background: #12121a !important;
        }

        [data-section-id] h1,
        [data-section-id] h2,
        [data-section-id] h3 {
          color: #e5e7eb !important;
        }

        .api-info p,
        .api-info li {
          color: #9ca3af !important;
        }

        pre {
          background: #1a1a24 !important;
          border-radius: 8px !important;
        }

        code {
          background: rgba(0, 245, 212, 0.1) !important;
          color: #00f5d4 !important;
          padding: 2px 6px !important;
          border-radius: 4px !important;
        }

        pre code {
          background: transparent !important;
          color: #e5e7eb !important;
          padding: 0 !important;
        }

        .http-verb {
          border-radius: 4px !important;
          font-weight: 600 !important;
        }

        table {
          background: #12121a !important;
        }

        table th {
          background: #1a1a24 !important;
          color: #e5e7eb !important;
        }

        table td {
          border-color: #2a2a3a !important;
          color: #9ca3af !important;
        }

        .react-tabs__tab--selected {
          background: #00f5d4 !important;
          color: #000 !important;
        }

        .react-tabs__tab {
          background: #1a1a24 !important;
          color: #9ca3af !important;
        }

        button[data-cy='copy-button'] {
          background: #00f5d4 !important;
          color: #000 !important;
        }
      `}</style>
    </div>
  );
}
