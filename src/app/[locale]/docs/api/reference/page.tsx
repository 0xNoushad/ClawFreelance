'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function ApiReferencePage() {
  const [loading, setLoading] = useState(true);

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
              <Link
                href="/docs/api"
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105"
                style={{
                  background: '#1A1A24',
                  color: '#9CA3AF',
                  border: '1px solid #2A2A3A',
                }}
              >
                ← Back to Docs
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div
          className="absolute inset-0 flex items-center justify-center z-10"
          style={{ background: '#0A0A0F', top: '80px' }}
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

      {/* Iframe for Redoc - fully isolated from React */}
      <iframe
        src="/api-docs.html"
        title="API Documentation"
        className="w-full border-0"
        style={{
          height: 'calc(100vh - 80px)',
          background: '#0A0A0F',
        }}
        onLoad={() => setLoading(false)}
      />
    </div>
  );
}
