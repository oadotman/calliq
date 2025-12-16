// =====================================================
// ADMIN PARTNER APPLICATIONS API
// Review and manage partner applications
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: userOrg, error: userOrgError } = await supabase
      .from('user_organizations')
      .select('role')
      .eq('user_id', user.id)
      .single();

    console.log('Admin check:', {
      userId: user.id,
      userEmail: user.email,
      userOrg,
      userOrgError,
      role: userOrg?.role
    });

    if (userOrgError || !userOrg) {
      console.error('Failed to fetch user organization:', userOrgError);
      return NextResponse.json(
        { error: 'Failed to verify admin access' },
        { status: 500 }
      );
    }

    if (userOrg.role !== 'owner' && userOrg.role !== 'admin') {
      console.log('Access denied - user role:', userOrg.role);
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get filter parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'pending';

    // Get applications
    const { data: applications, error } = await supabase
      .from('partner_applications')
      .select('*')
      .eq('status', status)
      .order('submitted_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      applications: applications || [],
    });
  } catch (error) {
    console.error('Applications GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}