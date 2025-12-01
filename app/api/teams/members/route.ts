// =====================================================
// TEAM MEMBERS API ROUTE
// Fetches team members with user details
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, requireAuth, createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Verify user has access to this organization
    const { data: userMembership } = await supabase
      .from('user_organizations')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!userMembership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get all members of the organization
    const { data: members, error: membersError } = await supabase
      .from('user_organizations')
      .select('*')
      .eq('organization_id', organizationId);

    if (membersError) {
      console.error('Error fetching members:', membersError);
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
    }

    // Create admin client for fetching user details
    const adminClient = createAdminClient();

    // Fetch user details for each member
    const membersWithDetails = await Promise.all(
      (members || []).map(async (member) => {
        try {
          // Use admin client to get user details
          const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(
            member.user_id
          );

          if (userError || !userData?.user) {
            // If user doesn't exist or there's an error, return placeholder data
            console.warn(`Could not fetch user details for ${member.user_id}:`, userError?.message);
            return {
              ...member,
              user: {
                email: 'User removed',
                user_metadata: {
                  full_name: 'Former member'
                }
              }
            };
          }

          return {
            ...member,
            user: {
              email: userData.user.email || 'No email',
              user_metadata: userData.user.user_metadata || {}
            }
          };
        } catch (error) {
          console.error(`Error processing member ${member.user_id}:`, error);
          return {
            ...member,
            user: {
              email: 'Error loading',
              user_metadata: {}
            }
          };
        }
      })
    );

    return NextResponse.json({ members: membersWithDetails });

  } catch (error: any) {
    console.error('Error in members API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
