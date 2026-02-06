import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { middleware } from './middleware';

/**
 * Helper to create a NextRequest for testing the middleware.
 */
function createRequest(
  options: {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
  } = {}
): NextRequest {
  const url = options.url || 'http://localhost:3000/api/v1/tasks';
  return new NextRequest(url, {
    method: options.method || 'GET',
    headers: new Headers(options.headers || {}),
  });
}

// Use an origin that is always in the ALLOWED_ORIGINS list (not env-dependent)
const ALLOWED_ORIGIN = 'https://clawfreelance.com';

describe('Middleware', () => {
  // ============================================
  // SECURITY HEADERS ON API ROUTES
  // ============================================
  describe('Security headers on API routes', () => {
    it('should set X-Frame-Options to DENY', () => {
      const request = createRequest();
      const response = middleware(request);

      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    });

    it('should set X-Content-Type-Options to nosniff', () => {
      const request = createRequest();
      const response = middleware(request);

      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });

    it('should set X-XSS-Protection to block mode', () => {
      const request = createRequest();
      const response = middleware(request);

      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
    });

    it('should set Referrer-Policy to strict-origin-when-cross-origin', () => {
      const request = createRequest();
      const response = middleware(request);

      expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    });

    it('should set Permissions-Policy with restricted browser features', () => {
      const request = createRequest();
      const response = middleware(request);

      const permissionsPolicy = response.headers.get('Permissions-Policy');
      expect(permissionsPolicy).toContain('camera=()');
      expect(permissionsPolicy).toContain('microphone=()');
      expect(permissionsPolicy).toContain('geolocation=()');
    });

    it('should set Strict-Transport-Security with max-age, includeSubDomains, and preload', () => {
      const request = createRequest();
      const response = middleware(request);

      const hsts = response.headers.get('Strict-Transport-Security');
      expect(hsts).toContain('max-age=31536000');
      expect(hsts).toContain('includeSubDomains');
      expect(hsts).toContain('preload');
    });

    it('should set Content-Security-Policy with essential directives', () => {
      const request = createRequest();
      const response = middleware(request);

      const csp = response.headers.get('Content-Security-Policy');
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("base-uri 'self'");
    });

    it('should set X-Request-ID with req_ prefix', () => {
      const request = createRequest();
      const response = middleware(request);

      const requestId = response.headers.get('X-Request-ID');
      expect(requestId).toMatch(/^req_/);
    });
  });

  // ============================================
  // CORS PREFLIGHT
  // ============================================
  describe('CORS preflight', () => {
    it('should return 204 for OPTIONS requests with allowed origin', () => {
      const request = createRequest({
        method: 'OPTIONS',
        headers: { origin: ALLOWED_ORIGIN },
      });
      const response = middleware(request);

      expect(response.status).toBe(204);
    });

    it('should set Access-Control-Allow-Methods containing GET', () => {
      const request = createRequest({
        method: 'OPTIONS',
        headers: { origin: ALLOWED_ORIGIN },
      });
      const response = middleware(request);

      const methods = response.headers.get('Access-Control-Allow-Methods');
      expect(methods).toContain('GET');
    });

    it('should set Access-Control-Allow-Headers containing Authorization', () => {
      const request = createRequest({
        method: 'OPTIONS',
        headers: { origin: ALLOWED_ORIGIN },
      });
      const response = middleware(request);

      const allowedHeaders = response.headers.get('Access-Control-Allow-Headers');
      expect(allowedHeaders).toContain('Authorization');
    });

    it('should NOT set Access-Control-Allow-Origin for disallowed origins', () => {
      const request = createRequest({
        method: 'OPTIONS',
        headers: { origin: 'https://evil.com' },
      });
      const response = middleware(request);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });

    it('should set Access-Control-Allow-Origin for allowed origins', () => {
      const request = createRequest({
        method: 'OPTIONS',
        headers: { origin: ALLOWED_ORIGIN },
      });
      const response = middleware(request);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(ALLOWED_ORIGIN);
    });
  });

  // ============================================
  // BLOCKED PATHS
  // ============================================
  describe('Blocked paths', () => {
    // The middleware checks blocked paths only after locale detection on page routes.
    // Paths containing '.' are classified as static files and skip both locale handling
    // and blocked path checks. Only dot-free paths reach the blocklist check.
    const blockedPathsWithoutDots = [
      '/en/wp-admin',
      '/en/wp-login',
      '/en/phpMyAdmin',
      '/en/phpmyadmin',
      '/en/wp-content',
      '/en/wp-includes',
    ];

    it.each(blockedPathsWithoutDots)('should return 404 for blocked path: %s', (path) => {
      const request = createRequest({
        url: `http://localhost:3000${path}`,
      });
      const response = middleware(request);

      expect(response.status).toBe(404);
    });

    // Paths with dots (e.g., /.env, /.git/config, /admin.php) are treated as static
    // files by the middleware and bypass the blocked path check entirely.
    const dotPaths = ['/en/.env', '/en/.git/config', '/en/admin.php', '/en/.aws', '/en/.docker'];

    it.each(dotPaths)(
      'should treat dot-containing path as static file (bypasses block check): %s',
      (path) => {
        const request = createRequest({
          url: `http://localhost:3000${path}`,
        });
        const response = middleware(request);

        // These paths are treated as static files and get NextResponse.next() (200)
        expect(response.status).toBe(200);
      }
    );
  });

  // ============================================
  // SUSPICIOUS QUERY PARAMETERS
  // ============================================
  describe('Suspicious query parameters', () => {
    // Suspicious params are checked on locale-prefixed page routes (no dots in path).
    const suspiciousParams = ['cmd', 'exec', 'command', 'shell', 'eval'];

    it.each(suspiciousParams)('should return 400 for suspicious query parameter: %s', (param) => {
      const request = createRequest({
        url: `http://localhost:3000/en/tasks?${param}=whoami`,
      });
      const response = middleware(request);

      expect(response.status).toBe(400);
    });
  });

  // ============================================
  // CSP DIRECTIVE COMPLETENESS
  // ============================================
  describe('CSP directive completeness', () => {
    it('should include all required CSP directives', () => {
      const request = createRequest();
      const response = middleware(request);

      const csp = response.headers.get('Content-Security-Policy');
      expect(csp).toBeDefined();

      const requiredDirectives = [
        'default-src',
        'script-src',
        'style-src',
        'img-src',
        'font-src',
        'connect-src',
        'frame-ancestors',
        'base-uri',
        'form-action',
      ];

      for (const directive of requiredDirectives) {
        expect(csp).toContain(directive);
      }
    });
  });

  // ============================================
  // API-SPECIFIC HEADERS
  // ============================================
  describe('API-specific headers', () => {
    it('should set X-API-Version on API routes', () => {
      const request = createRequest({
        url: 'http://localhost:3000/api/v1/tasks',
      });
      const response = middleware(request);

      expect(response.headers.get('X-API-Version')).toBe('v1');
    });

    it('should not set X-API-Version on non-API routes', () => {
      const request = createRequest({
        url: 'http://localhost:3000/en/tasks',
      });
      const response = middleware(request);

      expect(response.headers.get('X-API-Version')).toBeNull();
    });
  });
});
