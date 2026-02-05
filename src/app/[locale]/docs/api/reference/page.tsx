'use client';

import { useEffect, useRef, useState } from 'react';

export default function ApiReferencePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRedoc = async () => {
      if (typeof window === 'undefined' || !containerRef.current) return;

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
                  primary: { main: '#00F5D4' },
                  success: { main: '#10B981' },
                  warning: { main: '#FFB800' },
                  error: { main: '#EF4444' },
                  text: { primary: '#E5E7EB', secondary: '#9CA3AF' },
                  border: { dark: '#2A2A3A', light: '#1F1F2E' },
                  responses: {
                    success: { color: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.1)' },
                    error: { color: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.1)' },
                    info: { color: '#3B82F6', backgroundColor: 'rgba(59, 130, 246, 0.1)' },
                  },
                  http: {
                    get: '#10B981',
                    post: '#3B82F6',
                    put: '#F59E0B',
                    delete: '#EF4444',
                    patch: '#8B5CF6',
                    options: '#6B7280',
                    head: '#6B7280',
                  },
                },
                schema: {
                  nestedBackground: '#0D0D12',
                  typeNameColor: '#00F5D4',
                  typeTitleColor: '#E5E7EB',
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
                    fontSize: '13px',
                    backgroundColor: 'rgba(0, 245, 212, 0.08)',
                    color: '#00F5D4',
                  },
                  links: { color: '#00F5D4' },
                },
                sidebar: {
                  width: '280px',
                  backgroundColor: '#0A0A0F',
                  textColor: '#9CA3AF',
                  activeTextColor: '#00F5D4',
                  groupItems: { textTransform: 'uppercase' },
                },
                rightPanel: {
                  backgroundColor: '#0A0A0F',
                  width: '45%',
                },
              },
              scrollYOffset: 0,
              hideDownloadButton: true,
              expandResponses: '200,201',
              jsonSampleExpandLevel: 2,
              hideSingleRequestSampleTab: true,
              requiredPropsFirst: true,
              sortPropsAlphabetically: false,
              pathInMiddlePanel: true,
              nativeScrollbars: true,
              hideHostname: false,
              expandDefaultServerVariables: true,
            },
            containerRef.current
          );
          setTimeout(() => setLoading(false), 500);
        }
      };

      document.body.appendChild(script);
    };

    loadRedoc();
  }, []);

  return (
    <div className="min-h-screen" style={{ background: '#0A0A0F' }}>
      {/* Header */}
      <div
        className="border-b"
        style={{
          background: 'linear-gradient(180deg, #0F0F15 0%, #0A0A0F 100%)',
          borderColor: '#1F1F2E',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">API Reference</h1>
              <p className="text-sm" style={{ color: '#6B7280' }}>
                Interactive documentation for the ClawFreelance API
              </p>
            </div>
            <div className="flex gap-3">
              <a
                href="/openapi.yaml"
                download
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105"
                style={{
                  background: 'rgba(0, 245, 212, 0.1)',
                  color: '#00F5D4',
                  border: '1px solid rgba(0, 245, 212, 0.2)',
                }}
              >
                ↓ OpenAPI Spec
              </a>
              <a
                href="/docs/api"
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105"
                style={{
                  background: '#1A1A24',
                  color: '#9CA3AF',
                  border: '1px solid #2A2A3A',
                }}
              >
                ← Back to Docs
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Redoc Container */}
      <div
        ref={containerRef}
        className="redoc-container"
        style={{ minHeight: 'calc(100vh - 100px)' }}
      >
        {loading && (
          <div
            className="flex items-center justify-center"
            style={{ height: 'calc(100vh - 100px)' }}
          >
            <div className="text-center">
              <div
                className="w-10 h-10 border-2 rounded-full animate-spin mx-auto mb-4"
                style={{ borderColor: '#00F5D4', borderTopColor: 'transparent' }}
              />
              <p style={{ color: '#6B7280' }}>Loading API documentation...</p>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        /* === REDOC DARK THEME - COMPREHENSIVE OVERRIDES === */

        /* Root wrapper */
        .redoc-wrap {
          background: #0a0a0f !important;
        }

        /* Hide default search styling issues */
        .redoc-wrap > div > div:first-child {
          background: #0a0a0f !important;
        }

        /* Sidebar / Menu */
        .menu-content,
        [class*='sidebar'],
        [class*='menu-content'] {
          background: #0a0a0f !important;
        }

        .menu-content ul,
        .menu-content li {
          background: transparent !important;
        }

        .menu-content label,
        .menu-content span {
          color: #9ca3af !important;
        }

        .menu-content label[type],
        [class*='menu-item'] {
          color: #9ca3af !important;
        }

        .menu-content label:hover,
        .menu-content a:hover {
          color: #00f5d4 !important;
        }

        /* Active menu item */
        [class*='active'] > label,
        .menu-content .active label {
          color: #00f5d4 !important;
        }

        /* Search box in sidebar */
        [class*='search'] input,
        .menu-content input {
          background: #12121a !important;
          border: 1px solid #2a2a3a !important;
          color: #e5e7eb !important;
        }

        [class*='search'] input::placeholder {
          color: #6b7280 !important;
        }

        /* Main content area */
        .api-content,
        [class*='api-content'],
        [class*='middle-panel'] {
          background: #0a0a0f !important;
        }

        /* All text */
        .redoc-wrap h1,
        .redoc-wrap h2,
        .redoc-wrap h3,
        .redoc-wrap h4,
        .redoc-wrap h5 {
          color: #e5e7eb !important;
        }

        .redoc-wrap p,
        .redoc-wrap li,
        .redoc-wrap span,
        .redoc-wrap div {
          color: #9ca3af;
        }

        /* API info section */
        .api-info,
        [class*='api-info'] {
          background: #0a0a0f !important;
        }

        .api-info h1 {
          color: #ffffff !important;
        }

        .api-info p,
        .api-info a {
          color: #9ca3af !important;
        }

        .api-info a:hover {
          color: #00f5d4 !important;
        }

        /* Download button area */
        [class*='download'] {
          background: rgba(0, 245, 212, 0.1) !important;
          color: #00f5d4 !important;
          border-radius: 6px !important;
        }

        /* Right panel (code samples) */
        [class*='right-panel'],
        [class*='rightPanel'] {
          background: #0a0a0f !important;
        }

        /* Code blocks */
        pre,
        [class*='code-block'],
        [class*='CodeBlock'] {
          background: #12121a !important;
          border-radius: 8px !important;
          border: 1px solid #1f1f2e !important;
        }

        pre code,
        code {
          background: transparent !important;
          color: #e5e7eb !important;
        }

        /* Inline code */
        p code,
        li code,
        td code {
          background: rgba(0, 245, 212, 0.1) !important;
          color: #00f5d4 !important;
          padding: 2px 6px !important;
          border-radius: 4px !important;
          font-size: 13px !important;
        }

        /* Syntax highlighting */
        .token.string {
          color: #10b981 !important;
        }
        .token.number {
          color: #f59e0b !important;
        }
        .token.boolean {
          color: #f59e0b !important;
        }
        .token.null {
          color: #ef4444 !important;
        }
        .token.keyword {
          color: #8b5cf6 !important;
        }
        .token.property {
          color: #00f5d4 !important;
        }
        .token.punctuation {
          color: #6b7280 !important;
        }

        /* HTTP methods */
        .http-verb,
        [class*='http-verb'] {
          border-radius: 4px !important;
          font-weight: 600 !important;
          font-size: 12px !important;
          padding: 4px 8px !important;
        }

        /* Tables */
        table {
          background: #0a0a0f !important;
          border-collapse: collapse !important;
        }

        table th {
          background: #12121a !important;
          color: #e5e7eb !important;
          border-bottom: 1px solid #2a2a3a !important;
          font-weight: 600 !important;
        }

        table td {
          background: #0a0a0f !important;
          border-bottom: 1px solid #1f1f2e !important;
          color: #9ca3af !important;
        }

        table tr:hover td {
          background: #0d0d12 !important;
        }

        /* Properties table */
        [class*='property'] {
          border-color: #1f1f2e !important;
        }

        [class*='property-name'] {
          color: #00f5d4 !important;
        }

        [class*='property-type'] {
          color: #8b5cf6 !important;
        }

        /* Response tabs */
        .react-tabs__tab-list,
        [class*='tab-list'] {
          background: #12121a !important;
          border-radius: 6px !important;
          padding: 4px !important;
        }

        .react-tabs__tab,
        [class*='tab-'] {
          background: transparent !important;
          color: #6b7280 !important;
          border-radius: 4px !important;
        }

        .react-tabs__tab--selected,
        [class*='tab-'][class*='active'],
        [class*='tab-'][class*='selected'] {
          background: #00f5d4 !important;
          color: #000000 !important;
        }

        /* Response status codes */
        [class*='response-code-2'] {
          color: #10b981 !important;
        }

        [class*='response-code-4'],
        [class*='response-code-5'] {
          color: #ef4444 !important;
        }

        /* Expand/collapse buttons */
        button[class*='expand'],
        [class*='collapse-button'] {
          color: #00f5d4 !important;
        }

        /* Copy button */
        button[data-cy='copy-button'],
        [class*='copy-button'] {
          background: rgba(0, 245, 212, 0.2) !important;
          color: #00f5d4 !important;
          border-radius: 4px !important;
        }

        button[data-cy='copy-button']:hover {
          background: #00f5d4 !important;
          color: #000 !important;
        }

        /* Schema section */
        [class*='schema'],
        [class*='Schema'] {
          background: #0d0d12 !important;
          border: 1px solid #1f1f2e !important;
          border-radius: 8px !important;
        }

        /* Required badge */
        [class*='required'] {
          color: #ef4444 !important;
        }

        /* Type badges */
        [class*='type-'] {
          color: #8b5cf6 !important;
        }

        /* Section dividers */
        [class*='section'] {
          border-color: #1f1f2e !important;
        }

        hr {
          border-color: #1f1f2e !important;
        }

        /* Scrollbar styling */
        .redoc-wrap ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        .redoc-wrap ::-webkit-scrollbar-track {
          background: #0a0a0f;
        }

        .redoc-wrap ::-webkit-scrollbar-thumb {
          background: #2a2a3a;
          border-radius: 4px;
        }

        .redoc-wrap ::-webkit-scrollbar-thumb:hover {
          background: #3a3a4a;
        }

        /* Links */
        .redoc-wrap a {
          color: #00f5d4 !important;
        }

        .redoc-wrap a:hover {
          text-decoration: underline !important;
        }

        /* Operation badges */
        [class*='operation-type'] {
          font-weight: 600 !important;
        }

        /* Arrow icons */
        svg,
        [class*='arrow'] {
          fill: #6b7280 !important;
        }

        /* Footer */
        [class*='powered-by'],
        [class*='Redocly'] {
          opacity: 0.5;
        }

        /* Fix any remaining white backgrounds */
        .redoc-wrap * {
          scrollbar-color: #2a2a3a #0a0a0f;
        }

        /* Ensure no white leaks through */
        .redoc-wrap [style*='background: rgb(255'],
        .redoc-wrap [style*='background:#fff'],
        .redoc-wrap [style*='background: #fff'],
        .redoc-wrap [style*='background:white'],
        .redoc-wrap [style*='background: white'] {
          background: #0a0a0f !important;
        }
      `}</style>
    </div>
  );
}
