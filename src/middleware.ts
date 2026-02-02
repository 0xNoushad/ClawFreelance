import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Security middleware for ClawFreelance
 *
 * Implements:
 * - Security headers (CSP, HSTS, X-Frame-Options, etc.)
 * - CORS configuration
 * - Request ID generation
 * - Basic request logging
 */

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://clawfreelance.dev',
  'https://www.clawfreelance.dev',
  process.env.NEXT_PUBLIC_APP_URL,
].filter(Boolean);

// In development, allow localhost
if (process.env.NODE_ENV === 'development') {
  ALLOWED_ORIGINS.push('http://localhost:3000');
  ALLOWED_ORIGINS.push('http://127.0.0.1:3000');
}

/**
 * Generate a unique request ID for tracing
 */
function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Check if origin is allowed for CORS
 */
function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return true; // Same-origin requests
  return ALLOWED_ORIGINS.includes(origin);
}

/**
 * Get security headers
 */
function getSecurityHeaders(requestId: string): Record<string, string> {
  return {
    // Request tracing
    'X-Request-ID': requestId,

    // Prevent clickjacking
    'X-Frame-Options': 'DENY',

    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',

    // XSS protection (legacy, but still useful)
    'X-XSS-Protection': '1; mode=block',

    // Referrer policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // Permissions policy (restrict browser features)
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',

    // Content Security Policy
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js requires unsafe-eval in dev
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.github.com https://*.supabase.co wss://*.supabase.co",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join('; '),

    // HSTS - enforce HTTPS (1 year, include subdomains, preload)
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  };
}

/**
 * Handle CORS preflight requests
 */
function handleCorsPreFlight(request: NextRequest, origin: string | null): NextResponse {
  const requestId = generateRequestId();

  const headers: Record<string, string> = {
    ...getSecurityHeaders(requestId),
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-Request-ID',
    'Access-Control-Max-Age': '86400', // 24 hours
    'Access-Control-Allow-Credentials': 'true',
  };

  if (origin && isOriginAllowed(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return new NextResponse(null, { status: 204, headers });
}

export function middleware(request: NextRequest) {
  const requestId = generateRequestId();
  const origin = request.headers.get('origin');
  const { pathname } = request.nextUrl;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return handleCorsPreFlight(request, origin);
  }

  // Clone response for modification
  const response = NextResponse.next();

  // Add security headers
  const securityHeaders = getSecurityHeaders(requestId);
  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value);
  }

  // Add CORS headers for API routes
  if (pathname.startsWith('/api/')) {
    if (origin && isOriginAllowed(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }

    // API-specific headers
    response.headers.set('X-API-Version', 'v1');

    // Prevent caching of authenticated responses
    if (request.headers.has('authorization') || request.headers.has('x-api-key')) {
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    }
  }

  // Block suspicious paths (common attack vectors)
  const blockedPaths = [
    '/wp-admin',
    '/wp-login',
    '/.env',
    '/.git',
    '/phpMyAdmin',
    '/phpmyadmin',
    '/admin.php',
    '/xmlrpc.php',
    '/wp-content',
    '/wp-includes',
    '/.aws',
    '/.docker',
  ];

  const lowerPath = pathname.toLowerCase();
  if (blockedPaths.some(blocked => lowerPath.startsWith(blocked))) {
    return new NextResponse('Not Found', {
      status: 404,
      headers: {
        'X-Request-ID': requestId,
      },
    });
  }

  // Block requests with suspicious query parameters
  const suspiciousParams = ['cmd', 'exec', 'command', 'shell', 'eval'];
  const searchParams = request.nextUrl.searchParams;
  for (const param of suspiciousParams) {
    if (searchParams.has(param)) {
      return new NextResponse('Bad Request', {
        status: 400,
        headers: {
          'X-Request-ID': requestId,
        },
      });
    }
  }

  return response;
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
