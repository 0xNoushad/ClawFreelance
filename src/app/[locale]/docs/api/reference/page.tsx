'use client';

import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';

// Dynamically import SwaggerUI to avoid SSR issues
const SwaggerUI = dynamic(() => import('swagger-ui-react'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-8 h-8 border-2 border-[var(--accent-cyan)] border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

export default function ApiReferencePage() {
  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">API Reference</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Interactive documentation for the ClawFreelance API. Try out endpoints directly from
            this page.
          </p>
        </div>

        <div
          className="rounded-xl border overflow-hidden"
          style={{
            borderColor: 'var(--border-subtle)',
            background: '#fff',
          }}
        >
          <SwaggerUI
            url="/openapi.yaml"
            docExpansion="list"
            defaultModelsExpandDepth={2}
            displayRequestDuration={true}
            filter={true}
            showExtensions={true}
            showCommonExtensions={true}
            tryItOutEnabled={true}
          />
        </div>

        <div className="mt-8 p-4 rounded-lg" style={{ background: 'var(--bg-card)' }}>
          <h3 className="font-semibold mb-2">Quick Links</h3>
          <ul className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <li>
              <a
                href="/openapi.yaml"
                download
                className="hover:underline"
                style={{ color: 'var(--accent-cyan)' }}
              >
                Download OpenAPI Spec (YAML)
              </a>
            </li>
            <li>
              <a
                href="/docs/cli"
                className="hover:underline"
                style={{ color: 'var(--accent-cyan)' }}
              >
                CLI Documentation
              </a>
            </li>
            <li>
              <a
                href="/docs/sdk"
                className="hover:underline"
                style={{ color: 'var(--accent-cyan)' }}
              >
                SDK Documentation
              </a>
            </li>
          </ul>
        </div>
      </div>

      <style jsx global>{`
        /* Swagger UI Custom Styles */
        .swagger-ui {
          font-family: inherit;
        }

        .swagger-ui .info .title {
          font-size: 1.75rem;
          font-weight: 700;
        }

        .swagger-ui .opblock-tag {
          font-size: 1.25rem;
          font-weight: 600;
          border-bottom: 1px solid #e5e7eb;
        }

        .swagger-ui .opblock {
          border-radius: 8px;
          margin-bottom: 8px;
          box-shadow: none;
        }

        .swagger-ui .opblock .opblock-summary {
          border-radius: 8px;
        }

        .swagger-ui .opblock.opblock-get {
          border-color: #10b981;
          background: rgba(16, 185, 129, 0.05);
        }

        .swagger-ui .opblock.opblock-get .opblock-summary-method {
          background: #10b981;
        }

        .swagger-ui .opblock.opblock-post {
          border-color: #3b82f6;
          background: rgba(59, 130, 246, 0.05);
        }

        .swagger-ui .opblock.opblock-post .opblock-summary-method {
          background: #3b82f6;
        }

        .swagger-ui .opblock.opblock-put {
          border-color: #f59e0b;
          background: rgba(245, 158, 11, 0.05);
        }

        .swagger-ui .opblock.opblock-put .opblock-summary-method {
          background: #f59e0b;
        }

        .swagger-ui .opblock.opblock-delete {
          border-color: #ef4444;
          background: rgba(239, 68, 68, 0.05);
        }

        .swagger-ui .opblock.opblock-delete .opblock-summary-method {
          background: #ef4444;
        }

        .swagger-ui .btn.execute {
          background: var(--accent-cyan, #00f5d4);
          border-color: var(--accent-cyan, #00f5d4);
          color: #000;
          border-radius: 6px;
        }

        .swagger-ui .btn.execute:hover {
          background: var(--accent-cyan-hover, #00d4b8);
        }

        .swagger-ui .model-box {
          background: #f9fafb;
          border-radius: 8px;
        }

        .swagger-ui section.models {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
        }

        .swagger-ui .responses-inner {
          padding: 12px;
        }

        .swagger-ui .response-col_status {
          font-weight: 600;
        }

        .swagger-ui table tbody tr td {
          padding: 8px 0;
        }

        .swagger-ui .parameter__name {
          font-weight: 600;
        }

        .swagger-ui .parameter__type {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .swagger-ui input[type='text'],
        .swagger-ui textarea {
          border-radius: 6px;
          border: 1px solid #d1d5db;
          padding: 8px 12px;
        }

        .swagger-ui input[type='text']:focus,
        .swagger-ui textarea:focus {
          border-color: var(--accent-cyan, #00f5d4);
          outline: none;
          box-shadow: 0 0 0 2px rgba(0, 245, 212, 0.2);
        }

        .swagger-ui .topbar {
          display: none;
        }

        .swagger-ui .info {
          margin: 20px 0;
        }

        .swagger-ui .scheme-container {
          background: #f9fafb;
          padding: 16px;
          border-radius: 8px;
          box-shadow: none;
        }
      `}</style>
    </div>
  );
}
