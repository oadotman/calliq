// =====================================================
// PADDLE WEBHOOK HANDLER
// Processes Paddle subscription events
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyPaddleWebhook } from '@/lib/paddle';
import { creditOveragePack, resetOverageMinutes } from '@/lib/overage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Paddle webhook event types
type PaddleEvent =
  | 'subscription.created'
  | 'subscription.updated'
  | 'subscription.cancelled'
  | 'subscription.paused'
  | 'subscription.resumed'
  | 'transaction.completed'
  | 'transaction.updated';

interface PaddleWebhookPayload {
  event_type: PaddleEvent;
  data: {
    id: string;
    status?: string;
    customer_id?: string;
    custom_data?: {
      user_id?: string;
      organization_id?: string;
    };
    items?: Array<{
      price_id: string;
      quantity: number;
    }>;
    billing_period?: {
      starts_at: string;
      ends_at: string;
    };
  };
}

export async function POST(req: NextRequest) {
  try {
    // Get signature from headers
    const signature = req.headers.get('paddle-signature') || '';

    // Get raw body for signature verification
    const body = await req.text();

    // Verify webhook signature
    if (!verifyPaddleWebhook(signature, body)) {
      console.error('[Paddle] Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse payload
    const payload: PaddleWebhookPayload = JSON.parse(body);

    console.log('[Paddle] Received webhook:', payload.event_type);

    const supabase = createAdminClient();

    // Handle different event types
    switch (payload.event_type) {
      case 'subscription.created': {
        // New subscription created
        const customData = payload.data.custom_data;
        const organizationId = customData?.organization_id;

        if (!organizationId) {
          console.error('[Paddle] No organization_id in custom data');
          return NextResponse.json({ error: 'Missing organization_id' }, { status: 400 });
        }

        // Determine plan type from price_id
        const priceId = payload.data.items?.[0]?.price_id;
        const planType = getPlanTypeFromPriceId(priceId);

        // Update organization with subscription details
        const { error } = await supabase
          .from('organizations')
          .update({
            paddle_subscription_id: payload.data.id,
            paddle_customer_id: payload.data.customer_id,
            plan_type: planType,
            subscription_status: 'active',
            current_period_start: payload.data.billing_period?.starts_at,
            current_period_end: payload.data.billing_period?.ends_at,
            updated_at: new Date().toISOString(),
          })
          .eq('id', organizationId);

        if (error) {
          console.error('[Paddle] Error updating organization:', error);
          return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        // Create notification for user
        if (customData?.user_id) {
          await supabase.from('notifications').insert({
            user_id: customData.user_id,
            notification_type: 'subscription_created',
            title: 'Subscription activated!',
            message: `Your ${planType} plan is now active. Thank you for subscribing!`,
            link: '/settings',
          });
        }

        console.log('[Paddle] Subscription created:', payload.data.id);
        break;
      }

      case 'subscription.updated': {
        // Subscription updated (plan change, upgrade/downgrade, etc.)
        const priceId = payload.data.items?.[0]?.price_id;
        const newPlanType = getPlanTypeFromPriceId(priceId);

        // Get the organization to check for plan changes
        const { data: org } = await supabase
          .from('organizations')
          .select('plan_type, id')
          .eq('paddle_subscription_id', payload.data.id)
          .single();

        const isUpgrade = org && isPlanUpgrade(org.plan_type, newPlanType);
        const isDowngrade = org && isPlanDowngrade(org.plan_type, newPlanType);

        const { error } = await supabase
          .from('organizations')
          .update({
            subscription_status: payload.data.status,
            plan_type: newPlanType,
            current_period_start: payload.data.billing_period?.starts_at,
            current_period_end: payload.data.billing_period?.ends_at,
            updated_at: new Date().toISOString(),
          })
          .eq('paddle_subscription_id', payload.data.id);

        if (error) {
          console.error('[Paddle] Error updating subscription:', error);
        }

        // Create notification for plan change
        if (org && payload.data.custom_data?.user_id) {
          let notificationTitle = 'Subscription updated';
          let notificationMessage = `Your subscription has been updated to ${newPlanType} plan.`;

          if (isUpgrade) {
            notificationTitle = 'Plan upgraded successfully!';
            notificationMessage = `You've been upgraded to the ${newPlanType} plan. New features are now available!`;
          } else if (isDowngrade) {
            notificationTitle = 'Plan changed';
            notificationMessage = `Your plan has been changed to ${newPlanType}. Changes will take effect at the end of your current billing period.`;
          }

          await supabase.from('notifications').insert({
            user_id: payload.data.custom_data.user_id,
            notification_type: 'subscription_updated',
            title: notificationTitle,
            message: notificationMessage,
            link: '/settings',
          });
        }

        console.log('[Paddle] Subscription updated:', payload.data.id, 'New plan:', newPlanType);
        break;
      }

      case 'subscription.cancelled': {
        // Subscription cancelled
        const { error } = await supabase
          .from('organizations')
          .update({
            subscription_status: 'cancelled',
            plan_type: 'free', // Downgrade to free plan
            updated_at: new Date().toISOString(),
          })
          .eq('paddle_subscription_id', payload.data.id);

        if (error) {
          console.error('[Paddle] Error cancelling subscription:', error);
        }

        // Get organization to notify user
        const { data: org } = await supabase
          .from('organizations')
          .select('id')
          .eq('paddle_subscription_id', payload.data.id)
          .single();

        if (org) {
          // Notify organization owners
          const { data: owners } = await supabase
            .from('user_organizations')
            .select('user_id')
            .eq('organization_id', org.id)
            .eq('role', 'owner');

          if (owners) {
            for (const owner of owners) {
              await supabase.from('notifications').insert({
                user_id: owner.user_id,
                notification_type: 'subscription_cancelled',
                title: 'Subscription cancelled',
                message: 'Your subscription has been cancelled. You now have access to the Free plan.',
                link: '/settings',
              });
            }
          }
        }

        console.log('[Paddle] Subscription cancelled:', payload.data.id);
        break;
      }

      case 'transaction.completed': {
        // Payment successful
        console.log('[Paddle] Transaction completed:', payload.data.id);

        // Record payment in audit log
        const customData = payload.data.custom_data as {
          user_id?: string;
          organization_id?: string;
          type?: string;
          pack_size?: string;
        };
        if (customData?.organization_id) {
          await supabase.from('audit_logs').insert({
            organization_id: customData.organization_id,
            action: 'payment_completed',
            resource_type: 'subscription',
            resource_id: payload.data.id,
            metadata: {
              paddle_transaction_id: payload.data.id,
              paddle_customer_id: payload.data.customer_id,
              type: customData.type || 'subscription',
            },
          });

          // Check if this is an overage pack purchase
          if (customData.type === 'overage_pack' && customData.pack_size) {
            console.log('[Paddle] Processing overage pack purchase:', customData.pack_size);

            try {
              await creditOveragePack(
                customData.organization_id,
                customData.pack_size as 'small' | 'medium' | 'large' | 'xlarge',
                payload.data.id
              );
              console.log('[Paddle] Overage pack credited successfully');
            } catch (error) {
              console.error('[Paddle] Error crediting overage pack:', error);
            }
          }

          // Check if this is a subscription renewal - reset overage minutes
          if (customData.type === 'subscription' && payload.data.billing_period) {
            console.log('[Paddle] Subscription renewed, resetting overage minutes');
            try {
              await resetOverageMinutes(customData.organization_id);
            } catch (error) {
              console.error('[Paddle] Error resetting overage minutes:', error);
            }
          }
        }
        break;
      }

      default:
        console.log('[Paddle] Unhandled event type:', payload.event_type);
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Paddle] Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to determine plan type from Paddle price ID
 */
function getPlanTypeFromPriceId(priceId?: string): string {
  if (!priceId) return 'free';

  // Map Paddle price IDs to plan types
  // Update these mappings when you create plans in Paddle dashboard
  const priceIdMap: Record<string, string> = {
    // Map actual Paddle price IDs from environment variables
    // Monthly plans
    [process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_SOLO_MONTHLY || '']: 'solo',
    [process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_STARTER_MONTHLY || '']: 'starter',
    [process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_PROFESSIONAL_MONTHLY || '']: 'professional',
    [process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_ENTERPRISE_MONTHLY || '']: 'enterprise',
    // Annual plans (map to same plan type)
    [process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_SOLO_ANNUAL || '']: 'solo',
    [process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_STARTER_ANNUAL || '']: 'starter',
    [process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_PROFESSIONAL_ANNUAL || '']: 'professional',
    [process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_ENTERPRISE_ANNUAL || '']: 'enterprise',
  };

  return priceIdMap[priceId] || 'free';
}

/**
 * Check if a plan change is an upgrade
 */
function isPlanUpgrade(currentPlan: string, newPlan: string): boolean {
  const planHierarchy: Record<string, number> = {
    'free': 0,
    'solo': 1,
    'starter': 2,
    'professional': 3,
    'enterprise': 4,
  };

  const currentLevel = planHierarchy[currentPlan] || 0;
  const newLevel = planHierarchy[newPlan] || 0;

  return newLevel > currentLevel;
}

/**
 * Check if a plan change is a downgrade
 */
function isPlanDowngrade(currentPlan: string, newPlan: string): boolean {
  const planHierarchy: Record<string, number> = {
    'free': 0,
    'solo': 1,
    'starter': 2,
    'professional': 3,
    'enterprise': 4,
  };

  const currentLevel = planHierarchy[currentPlan] || 0;
  const newLevel = planHierarchy[newPlan] || 0;

  return newLevel < currentLevel;
}
