// =====================================================
// PARTNER PASSWORD RESET API
// Handles partner password reset for legacy SHA256 migrations
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { PartnerAuth } from '@/lib/partners/auth';
import { validatePassword } from '@/lib/security/validators';
import bcrypt from 'bcryptjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST - Reset partner password with token
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, newPassword, confirmPassword } = body;

    // Validate input
    if (!token || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check passwords match
    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: 'Passwords do not match' },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.error || 'Password does not meet requirements' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Find partner with valid reset token
    const { data: partner, error: fetchError } = await supabase
      .from('partners')
      .select('id, email, password_reset_expires')
      .eq('password_reset_token', token)
      .single();

    if (fetchError || !partner) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (partner.password_reset_expires && new Date(partner.password_reset_expires) < new Date()) {
      return NextResponse.json(
        { error: 'Reset token has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Hash the new password with bcrypt
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update partner password and clear reset fields
    const { error: updateError } = await supabase
      .from('partners')
      .update({
        password_hash: passwordHash,
        requires_password_reset: false,
        password_reset_token: null,
        password_reset_expires: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', partner.id);

    if (updateError) {
      console.error('Error updating partner password:', updateError);
      return NextResponse.json(
        { error: 'Failed to reset password' },
        { status: 500 }
      );
    }

    // Log the password reset
    await supabase.rpc('log_partner_activity', {
      p_partner_id: partner.id,
      p_activity_type: 'password_reset',
      p_metadata: {
        ip: req.headers.get('x-forwarded-for') || req.ip,
        user_agent: req.headers.get('user-agent'),
        reset_reason: 'legacy_migration'
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.'
    });

  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET - Request password reset (sends email)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Find partner by email
    const { data: partner, error: fetchError } = await supabase
      .from('partners')
      .select('id, email, full_name')
      .eq('email', email.toLowerCase())
      .single();

    if (fetchError || !partner) {
      // Don't reveal if email exists
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, you will receive reset instructions.'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomUUID();
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour

    // Update partner with reset token
    const { error: updateError } = await supabase
      .from('partners')
      .update({
        password_reset_token: resetToken,
        password_reset_expires: resetExpires.toISOString()
      })
      .eq('id', partner.id);

    if (updateError) {
      console.error('Error setting reset token:', updateError);
      return NextResponse.json(
        { error: 'Failed to initiate password reset' },
        { status: 500 }
      );
    }

    // TODO: Send email with reset link
    // For now, log the reset link
    const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/partners/reset-password?token=${resetToken}`;
    console.log(`Password reset link for ${partner.email}: ${resetUrl}`);

    // In production, this would send an email
    // await sendEmail({
    //   to: partner.email,
    //   subject: 'Reset Your Partner Password',
    //   template: 'partner-password-reset',
    //   data: {
    //     name: partner.full_name,
    //     resetUrl
    //   }
    // });

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, you will receive reset instructions.'
    });

  } catch (error) {
    console.error('Password reset request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}