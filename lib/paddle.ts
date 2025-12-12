// =====================================================
// PADDLE CLIENT
// Payment processing via Paddle (Merchant of Record)
// =====================================================

/**
 * Paddle Configuration
 *
 * Paddle is used as the payment processor and Merchant of Record.
 * This means Paddle handles:
 * - Payment processing
 * - VAT/Sales tax collection
 * - Invoicing and receipts
 * - Subscription management
 *
 * Environment Variables Required:
 * - NEXT_PUBLIC_PADDLE_VENDOR_ID - Your Paddle vendor ID (public)
 * - NEXT_PUBLIC_PADDLE_ENVIRONMENT - 'sandbox' or 'production'
 * - PADDLE_API_KEY - Server-side API key (secret)
 */

export const paddleConfig = {
  vendorId: process.env.NEXT_PUBLIC_PADDLE_VENDOR_ID || '',
  environment: (process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production',
  apiKey: process.env.PADDLE_API_KEY || '',
};

// Plan ID mapping
export const paddlePlanIds = {
  sandbox: {
    // Monthly plans
    solo_monthly: 'pri_sandbox_solo_monthly',  // Replace with actual sandbox IDs
    starter_monthly: 'pri_sandbox_starter_monthly',
    professional_monthly: 'pri_sandbox_professional_monthly',
    enterprise_monthly: 'pri_sandbox_enterprise_monthly',
    // Annual plans
    solo_annual: 'pri_sandbox_solo_annual',
    starter_annual: 'pri_sandbox_starter_annual',
    professional_annual: 'pri_sandbox_professional_annual',
    enterprise_annual: 'pri_sandbox_enterprise_annual',
    // Overage packs
    overage_500: 'pri_sandbox_overage_500',
    overage_1000: 'pri_sandbox_overage_1000',
    overage_2500: 'pri_sandbox_overage_2500',
    overage_5000: 'pri_sandbox_overage_5000',
  },
  production: {
    // Monthly plans
    solo_monthly: process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_SOLO_MONTHLY || '',
    starter_monthly: process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_STARTER_MONTHLY || '',
    professional_monthly: process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_PROFESSIONAL_MONTHLY || '',
    enterprise_monthly: process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_ENTERPRISE_MONTHLY || '',
    // Annual plans (17% discount)
    solo_annual: process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_SOLO_ANNUAL || '',
    starter_annual: process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_STARTER_ANNUAL || '',
    professional_annual: process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_PROFESSIONAL_ANNUAL || '',
    enterprise_annual: process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_ENTERPRISE_ANNUAL || '',
    // Overage packs
    overage_500: process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_OVERAGE_500 || '',
    overage_1000: process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_OVERAGE_1000 || '',
    overage_2500: process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_OVERAGE_2500 || '',
    overage_5000: process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_OVERAGE_5000 || '',
  },
};

// Overage pack details for easy display
export const OVERAGE_PACKS = [
  {
    id: 'overage_500',
    minutes: 500,
    price: 10, // $10 for 500 minutes = $0.02/min
    pricePerMinute: 0.02,
    name: '500 Minutes',
    description: 'Add 500 extra minutes to your monthly allowance'
  },
  {
    id: 'overage_1000',
    minutes: 1000,
    price: 20, // $20 for 1000 minutes = $0.02/min
    pricePerMinute: 0.02,
    name: '1,000 Minutes',
    description: 'Add 1,000 extra minutes to your monthly allowance'
  },
  {
    id: 'overage_2500',
    minutes: 2500,
    price: 50, // $50 for 2500 minutes = $0.02/min
    pricePerMinute: 0.02,
    name: '2,500 Minutes',
    description: 'Add 2,500 extra minutes to your monthly allowance',
    popular: true
  },
  {
    id: 'overage_5000',
    minutes: 5000,
    price: 100, // $100 for 5000 minutes = $0.02/min
    pricePerMinute: 0.02,
    name: '5,000 Minutes',
    description: 'Add 5,000 extra minutes to your monthly allowance'
  }
];

export function getPaddlePlanId(planType: string, billingPeriod: 'monthly' | 'annual' = 'monthly'): string {
  const env = paddleConfig.environment;
  const plans = paddlePlanIds[env] as any;
  const planKey = `${planType}_${billingPeriod}`;
  return plans[planKey] || '';
}

/**
 * Get Paddle price ID for overage packs
 */
export function getPaddleOverageId(minutes: 500 | 1000 | 2500 | 5000): string {
  const env = paddleConfig.environment;
  const plans = paddlePlanIds[env] as any;
  const overageKey = `overage_${minutes}`;
  return plans[overageKey] || '';
}

/**
 * Initialize Paddle.js on the client side
 * This should be called in a useEffect hook
 */
export function initializePaddle(callback?: () => void) {
  if (typeof window === 'undefined') return;

  // Check if already loaded
  if ((window as any).Paddle) {
    callback?.();
    return;
  }

  // For Paddle v2, always use the production CDN
  // The environment (sandbox vs production) is determined by the vendor/seller ID
  const script = document.createElement('script');
  script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
  script.async = true;

  script.onload = () => {
    if ((window as any).Paddle) {
      // For v2 API, use Initialize method with seller ID
      // The vendor ID itself determines if it's sandbox or production
      if (paddleConfig.vendorId) {
        try {
          (window as any).Paddle.Initialize({
            seller: parseInt(paddleConfig.vendorId),
          });
          console.log('Paddle initialized with vendor ID:', paddleConfig.vendorId);
          callback?.();
        } catch (error) {
          console.error('Failed to initialize Paddle:', error);
        }
      } else {
        console.error('Paddle Vendor ID not configured');
      }
    }
  };

  script.onerror = () => {
    console.error('Failed to load Paddle.js');
  };

  document.head.appendChild(script);
}

/**
 * Open Paddle checkout for a specific plan
 */
export function openPaddleCheckout(params: {
  planId: string;
  email?: string;
  customData?: Record<string, any>;
  successCallback?: () => void;
  closeCallback?: () => void;
}) {
  if (typeof window === 'undefined' || !(window as any).Paddle) {
    console.error('Paddle not initialized');
    return;
  }

  try {
    // Paddle v2 checkout configuration
    const checkoutConfig: any = {
      items: [{ priceId: params.planId, quantity: 1 }],
    };

    // Add customer email if provided
    if (params.email) {
      checkoutConfig.customer = { email: params.email };
    }

    // Add custom data if provided
    if (params.customData) {
      checkoutConfig.customData = params.customData;
    }

    // Add callbacks
    if (params.successCallback) {
      checkoutConfig.eventCallback = function(event: any) {
        if (event.name === 'checkout.completed') {
          params.successCallback!();
        }
        if (event.name === 'checkout.closed' && params.closeCallback) {
          params.closeCallback();
        }
      };
    } else if (params.closeCallback) {
      checkoutConfig.eventCallback = function(event: any) {
        if (event.name === 'checkout.closed') {
          params.closeCallback!();
        }
      };
    }

    console.log('Opening Paddle checkout with config:', { priceId: params.planId, email: params.email });
    (window as any).Paddle.Checkout.open(checkoutConfig);
  } catch (error) {
    console.error('Failed to open Paddle checkout:', error);
  }
}

/**
 * Verify Paddle webhook signature (server-side only)
 * Implements proper HMAC-SHA256 signature verification
 * See: https://developer.paddle.com/webhook-reference/verifying-webhooks
 */
export function verifyPaddleWebhook(
  signature: string,
  payload: string | Buffer,
  webhookSecret?: string
): boolean {
  // Use provided secret or fallback to env variable
  const secret = webhookSecret || process.env.PADDLE_WEBHOOK_SECRET;

  if (!secret) {
    console.error('Paddle webhook secret not configured');
    return false;
  }

  if (!signature || !payload) {
    console.error('Missing signature or payload for webhook verification');
    return false;
  }

  try {
    const crypto = require('crypto');

    // Convert payload to string if it's a Buffer
    const payloadString = typeof payload === 'string' ? payload : payload.toString('utf8');

    // Parse the Paddle signature header
    // Format: "ts=timestamp;h1=signature"
    const signatureParts = signature.split(';');
    const timestamp = signatureParts.find(part => part.startsWith('ts='))?.substring(3);
    const receivedSignature = signatureParts.find(part => part.startsWith('h1='))?.substring(3);

    if (!timestamp || !receivedSignature) {
      console.error('Invalid Paddle signature format');
      return false;
    }

    // Check timestamp to prevent replay attacks (5 minute tolerance)
    const currentTime = Math.floor(Date.now() / 1000);
    const signatureTime = parseInt(timestamp, 10);
    const timeDifference = currentTime - signatureTime;

    if (timeDifference > 300) { // 5 minutes
      console.error('Paddle webhook timestamp too old (possible replay attack)');
      return false;
    }

    // Construct the signed payload
    // Paddle signs: timestamp + ':' + raw_payload
    const signedPayload = `${timestamp}:${payloadString}`;

    // Calculate expected signature using HMAC-SHA256
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    // Compare signatures using timing-safe comparison
    const signatureBuffer = Buffer.from(receivedSignature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }

    // Use crypto.timingSafeEqual to prevent timing attacks
    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);

  } catch (error) {
    console.error('Error verifying Paddle webhook signature:', error);
    return false;
  }
}
