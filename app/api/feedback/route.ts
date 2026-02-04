import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createServerClient } from '@/lib/supabase/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    // Get the current user
    const supabase = createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { type, subject, message, userEmail, userId, timestamp, url, userAgent } = body;

    // Validate required fields
    if (!type || !subject || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get user's organization info for context
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select(
        `
        role,
        organization_id,
        organizations (
          id,
          name,
          plan_type
        )
      `
      )
      .eq('user_id', user.id)
      .single();

    // Handle the organization data properly
    const orgData = userOrg?.organizations as any;
    const orgName = orgData?.name || 'No organization';
    const planType = orgData?.plan_type || 'N/A';
    const userRole = userOrg?.role || 'N/A';
    const orgId = orgData?.id || userOrg?.organization_id;

    // Determine the type emoji and color for the email
    const typeEmoji = type === 'bug' ? '🐛' : type === 'feature' ? '💡' : '💬';
    const typeLabel =
      type === 'bug' ? 'Bug Report' : type === 'feature' ? 'Feature Request' : 'Feedback';
    const priority = type === 'bug' ? 'high' : 'normal';

    // Create the email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 20px;
              border-radius: 10px 10px 0 0;
              margin: -20px -20px 20px -20px;
            }
            .type-badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 14px;
              font-weight: 600;
              margin-bottom: 10px;
            }
            .bug { background: #fee2e2; color: #dc2626; }
            .feature { background: #dbeafe; color: #2563eb; }
            .feedback { background: #f3e8ff; color: #9333ea; }
            .content {
              background: #f9fafb;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .meta {
              background: white;
              padding: 15px;
              border-radius: 8px;
              border: 1px solid #e5e7eb;
              margin: 20px 0;
            }
            .meta-item {
              display: flex;
              padding: 8px 0;
              border-bottom: 1px solid #f3f4f6;
            }
            .meta-item:last-child {
              border-bottom: none;
            }
            .meta-label {
              font-weight: 600;
              color: #6b7280;
              min-width: 120px;
            }
            .meta-value {
              color: #111827;
              word-break: break-word;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 2px solid #e5e7eb;
              font-size: 12px;
              color: #6b7280;
              text-align: center;
            }
            .priority-high {
              color: #dc2626;
              font-weight: bold;
            }
            h1 { margin: 0; font-size: 24px; }
            h2 { color: #374151; font-size: 18px; margin-top: 25px; margin-bottom: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${typeEmoji} New ${typeLabel} from SynQall</h1>
            <div class="type-badge ${type}">${typeLabel}</div>
            ${type === 'bug' ? '<div style="margin-top: 10px; color: #fee2e2;">⚠️ Priority: High</div>' : ''}
          </div>

          <h2>Subject</h2>
          <div class="content">
            <strong>${subject}</strong>
          </div>

          <h2>${type === 'bug' ? 'Bug Description' : 'Message'}</h2>
          <div class="content">
            ${message.replace(/\n/g, '<br>')}
          </div>

          <h2>User Information</h2>
          <div class="meta">
            <div class="meta-item">
              <span class="meta-label">User Email:</span>
              <span class="meta-value">${userEmail || 'Not provided'}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">User ID:</span>
              <span class="meta-value">${userId || 'Not provided'}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Organization:</span>
              <span class="meta-value">${orgName}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Plan Type:</span>
              <span class="meta-value">${planType}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">User Role:</span>
              <span class="meta-value">${userRole}</span>
            </div>
          </div>

          <h2>Technical Details</h2>
          <div class="meta">
            <div class="meta-item">
              <span class="meta-label">Page URL:</span>
              <span class="meta-value">${url || 'Not provided'}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Timestamp:</span>
              <span class="meta-value">${
                timestamp
                  ? new Date(timestamp).toLocaleString('en-US', {
                      dateStyle: 'full',
                      timeStyle: 'long',
                    })
                  : 'Not provided'
              }</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">User Agent:</span>
              <span class="meta-value" style="font-size: 11px;">${userAgent || 'Not provided'}</span>
            </div>
          </div>

          ${
            type === 'bug'
              ? `
            <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 8px; margin-top: 20px;">
              <strong style="color: #b91c1c;">🚨 Action Required:</strong>
              <p style="margin: 10px 0 0 0; color: #7f1d1d;">
                This is a bug report and may require immediate attention.
                Please review and prioritize accordingly.
              </p>
            </div>
          `
              : ''
          }

          ${
            type === 'feature'
              ? `
            <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 15px; border-radius: 8px; margin-top: 20px;">
              <strong style="color: #1e40af;">💡 Feature Request:</strong>
              <p style="margin: 10px 0 0 0; color: #1e3a8a;">
                Consider adding this to the product roadmap.
                Evaluate user demand and technical feasibility.
              </p>
            </div>
          `
              : ''
          }

          <div class="footer">
            <p>This feedback was submitted through the SynQall application.</p>
            <p>To respond, reply directly to: <strong>${userEmail || 'No email provided'}</strong></p>
          </div>
        </body>
      </html>
    `;

    // Send the email
    const { data, error } = await resend.emails.send({
      from: 'SynQall Feedback <feedback@synqall.com>',
      to: 'adeliyitomiwa@yahoo.com',
      replyTo: userEmail || undefined,
      subject: `[${typeLabel}] ${subject}`,
      html: emailHtml,
      headers: {
        'X-Priority': priority === 'high' ? '1' : '3',
        'X-Entity-Ref-ID': userId || 'unknown',
      },
    });

    if (error) {
      console.error('Error sending feedback email:', error);
      return NextResponse.json({ error: 'Failed to send feedback' }, { status: 500 });
    }

    // Also log the feedback to the database for tracking
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      organization_id: orgId,
      action: `feedback_submitted_${type}`,
      details: {
        type,
        subject,
        message,
        url,
        email_id: data?.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Feedback sent successfully',
      emailId: data?.id,
    });
  } catch (error) {
    console.error('Error processing feedback:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
