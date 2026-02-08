/**
 * Test script to verify the feedback API endpoint is working
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFeedbackEndpoint() {
  console.log('🧪 Testing feedback endpoint fix...\n');

  try {
    // 1. Sign in as a test user
    console.log('1️⃣ Signing in as test user...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'adeliyitomiwa@yahoo.com',
      password: 'Testing123!',
    });

    if (authError) {
      console.error('❌ Failed to sign in:', authError.message);
      return;
    }

    const session = authData.session;
    console.log('✅ Signed in successfully\n');

    // 2. Test the feedback endpoint
    console.log('2️⃣ Testing feedback submission...');

    const feedbackData = {
      type: 'feedback',
      subject: 'Test feedback after CSRF fix',
      message:
        'This is a test feedback to verify the endpoint works after exempting it from CSRF validation.',
      userEmail: authData.user.email,
      userId: authData.user.id,
      timestamp: new Date().toISOString(),
      url: 'http://localhost:3000/dashboard',
      userAgent: 'Test Script/1.0',
    };

    const response = await fetch('http://localhost:3003/api/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        Cookie: `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token=${session.access_token}`,
      },
      body: JSON.stringify(feedbackData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Feedback submission failed (${response.status}):`, errorText);
      return;
    }

    const result = await response.json();
    console.log('✅ Feedback submitted successfully:', result);

    // 3. Verify the audit log was created
    console.log('\n3️⃣ Checking audit log...');
    const { data: auditLog, error: auditError } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', authData.user.id)
      .eq('action', 'feedback_submitted_feedback')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (auditError) {
      console.error('⚠️ Could not verify audit log:', auditError.message);
    } else {
      console.log('✅ Audit log created:', {
        id: auditLog.id,
        action: auditLog.action,
        created_at: auditLog.created_at,
      });
    }

    console.log('\n🎉 Feedback endpoint is working correctly!');
    console.log('📧 An email should have been sent to adeliyitomiwa@yahoo.com');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testFeedbackEndpoint();
