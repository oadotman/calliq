// =====================================================
// INVITATION VERIFICATION API ROUTE
// Returns organization details for valid invitations
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create admin client for reading invitation details
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    if (!token || !email) {
      return NextResponse.json(
        { valid: false, error: 'Missing token or email' },
        { status: 400 }
      );
    }

    // Verify the invitation exists and is valid
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('team_invitations')
      .select(`
        id,
        organization_id,
        email,
        role,
        expires_at,
        accepted_at,
        organizations (
          id,
          name,
          plan_type
        )
      `)
      .eq('token', token)
      .eq('email', email.toLowerCase())
      .is('accepted_at', null) // Not yet accepted
      .single();

    if (inviteError || !invitation) {
      console.log('Invalid invitation:', { token, email, error: inviteError });
      return NextResponse.json(
        { valid: false, error: 'Invalid or expired invitation' },
        { status: 404 }
      );
    }

    // Check if invitation has expired
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json(
        { valid: false, error: 'Invitation has expired' },
        { status: 410 } // Gone
      );
    }

    // Return organization details
    // Type assertion to handle the nested organization object
    const org = (invitation as any).organizations;
    return NextResponse.json({
      valid: true,
      organization: {
        id: org?.id,
        name: org?.name,
        planType: org?.plan_type,
      },
      role: invitation.role,
      expiresAt: invitation.expires_at,
    });

  } catch (error) {
    console.error('Error verifying invitation:', error);
    return NextResponse.json(
      { valid: false, error: 'Failed to verify invitation' },
      { status: 500 }
    );
  }
}