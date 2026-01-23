// =====================================================
// RESOURCE DOWNLOAD TRACKING API
// Track when partners download resources
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { verifyPartnerSession } from '@/lib/partners/auth';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify partner session
    const partner = await verifyPartnerSession();
    if (!partner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resourceId = params.id;

    // Track the download in the database (could be implemented later)
    // For now, just log it
    console.log(`Partner ${partner.id} downloaded resource ${resourceId}`);

    // You could store this in a downloads tracking table
    // await supabase.from('partner_resource_downloads').insert({
    //   partner_id: partner.id,
    //   resource_id: resourceId,
    //   downloaded_at: new Date().toISOString()
    // });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking download:', error);
    return NextResponse.json(
      { error: 'Failed to track download' },
      { status: 500 }
    );
  }
}