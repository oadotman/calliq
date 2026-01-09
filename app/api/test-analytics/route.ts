import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Analytics API is working',
    timestamp: new Date().toISOString(),
    routes: {
      comprehensive: '/api/analytics/comprehensive',
      performance: '/api/analytics/performance',
      team: '/api/analytics/team'
    }
  });
}