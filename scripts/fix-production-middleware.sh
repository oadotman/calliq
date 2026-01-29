#!/bin/bash
# =====================================================
# FIX PRODUCTION MIDDLEWARE ISSUES
# Patches middleware to prevent infinite loops
# =====================================================

echo "🔧 Fixing Production Middleware Issues"
echo "======================================"
echo ""

# Navigate to project directory
cd /var/www/synqall

echo "1. Creating middleware patch..."
echo "-------------------------------"

# Create a temporary middleware fix
cat > middleware-fix.ts << 'EOF'
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  console.log(`[Middleware] Processing: ${pathname}`);

  // CRITICAL: Define all public paths that should bypass auth
  const publicPaths = [
    '/',
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/pricing',
    '/blog',
    '/partners',
    '/api/health',
    '/api/auth/signup',
    '/api/auth/callback',
    '/invite',
    '/invite-signup',
  ];

  // Check if it's a static file or Next.js internal route
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/_next') ||
    pathname.includes('.') || // Has file extension
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  // Check if it's a public path
  const isPublicPath = publicPaths.some(path => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname === path || pathname.startsWith(path + '/');
  });

  // CRITICAL: For public paths, return immediately without auth check
  if (isPublicPath) {
    console.log(`[Middleware] Public path, allowing: ${pathname}`);
    return NextResponse.next();
  }

  // For protected paths, check authentication
  try {
    const res = NextResponse.next();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            res.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            res.cookies.set({ name, value: '', ...options });
          },
        },
      }
    );

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      console.log(`[Middleware] No session, redirecting to login: ${pathname}`);
      const redirectUrl = new URL('/login', req.url);
      redirectUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(redirectUrl);
    }

    return res;
  } catch (error) {
    console.error('[Middleware] Error:', error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
EOF

echo "✅ Middleware patch created"

echo ""
echo "2. Backing up original middleware..."
echo "-----------------------------------"
if [ -f "middleware.ts" ]; then
  cp middleware.ts middleware.ts.backup.$(date +%Y%m%d_%H%M%S)
  echo "✅ Original middleware backed up"
fi

echo ""
echo "3. Applying simplified middleware..."
echo "-----------------------------------"
read -p "Apply the simplified middleware? This will replace the current one (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  cp middleware-fix.ts middleware.ts
  echo "✅ Simplified middleware applied"

  echo ""
  echo "4. Rebuilding application..."
  echo "---------------------------"
  npm run build

  echo ""
  echo "5. Restarting PM2..."
  echo "-------------------"
  pm2 restart synqall

  echo ""
  echo "✅ Middleware fix applied and application restarted!"
else
  echo "⚠️  Skipped applying middleware fix"
  echo "   You can manually review middleware-fix.ts and apply if needed"
fi

echo ""
echo "6. Testing public pages..."
echo "-------------------------"
sleep 5
curl -I http://localhost:3000/partners 2>/dev/null | head -3
curl -I http://localhost:3000/pricing 2>/dev/null | head -3
curl -I http://localhost:3000/blog 2>/dev/null | head -3

echo ""
echo "Done! Check if public pages are now accessible."