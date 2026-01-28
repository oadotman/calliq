// Script to check and fix a specific call by ID
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

async function checkCall(callId) {
  console.log(`\n🔍 Checking call: ${callId}\n`);

  // Get call details
  const { data: call, error } = await supabase.from('calls').select('*').eq('id', callId).single();

  if (error || !call) {
    console.error('❌ Call not found:', error);
    return;
  }

  // Display call info
  console.log('📞 Call Details:');
  console.log('   Customer:', call.customer_name || 'Unknown');
  console.log('   File:', call.file_name);
  console.log('   Status:', call.status);
  console.log('   Progress:', call.processing_progress || 0, '%');
  console.log('   Message:', call.processing_message || 'None');
  console.log('   Created:', new Date(call.created_at).toLocaleString());
  console.log('   Updated:', new Date(call.updated_at).toLocaleString());

  const minutesSinceCreation = Math.round(
    (Date.now() - new Date(call.created_at).getTime()) / 1000 / 60
  );
  console.log('   Age:', minutesSinceCreation, 'minutes');
  console.log('   Duration:', call.duration_minutes || 'Unknown', 'minutes');
  console.log('');

  // Check transcript
  const { data: transcript } = await supabase
    .from('transcripts')
    .select('id, text, audio_duration')
    .eq('call_id', callId)
    .single();

  if (transcript) {
    console.log('✅ Transcript exists');
    console.log('   Length:', transcript.text ? transcript.text.length : 0, 'characters');
    console.log('   Audio duration:', transcript.audio_duration, 'seconds');
  } else {
    console.log('❌ No transcript found');
  }

  // Check extracted fields
  const { data: fields } = await supabase
    .from('call_fields')
    .select('field_name')
    .eq('call_id', callId);

  if (fields && fields.length > 0) {
    console.log('✅ Extracted fields:', fields.length);
  } else {
    console.log('❌ No extracted fields');
  }

  console.log('');

  // Fix if needed
  if (
    call.status === 'processing' ||
    call.status === 'transcribing' ||
    call.status === 'extracting'
  ) {
    console.log('⚠️  Call is stuck in', call.status, 'state');

    if (transcript && transcript.text) {
      console.log('🔧 Transcript exists - marking as completed');
      await supabase
        .from('calls')
        .update({
          status: 'completed',
          processing_progress: 100,
          processing_message: 'Recovered - transcript already exists',
          processed_at: new Date().toISOString(),
        })
        .eq('id', callId);
      console.log('✅ Call marked as completed');
    } else {
      console.log('🔄 Attempting to reprocess...');

      // Reset to uploaded
      await supabase
        .from('calls')
        .update({
          status: 'uploaded',
          processing_progress: 0,
          processing_message: 'Queued for reprocessing',
          processing_attempts: (call.processing_attempts || 0) + 1,
        })
        .eq('id', callId);

      // Trigger processing
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const response = await fetch(`${baseUrl}/api/calls/${callId}/process`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-processing': 'true',
          },
        });

        if (response.ok) {
          console.log('✅ Reprocessing triggered successfully');
        } else {
          console.log('⚠️  Processing request made, check status in a few minutes');
        }
      } catch (err) {
        console.log('⚠️  Could not reach API, but call has been reset for retry');
      }
    }
  } else if (call.status === 'completed') {
    console.log('✅ Call is already completed');
  } else if (call.status === 'failed') {
    console.log('❌ Call is marked as failed');
    if (call.processing_attempts < 3) {
      console.log('   Eligible for retry (attempts:', call.processing_attempts, '/ 3)');
      console.log('   Run: node scripts/recover-stuck-calls.js to retry failed calls');
    }
  } else {
    console.log('ℹ️  Call status:', call.status);
  }
}

// Get call ID from command line argument
const callId = process.argv[2];

if (!callId) {
  console.log('Usage: node scripts/check-specific-call.js <call-id>');
  console.log('Example: node scripts/check-specific-call.js 22a9a1ab-420e-4d01-9685-6dba3a314e83');
  process.exit(1);
}

checkCall(callId).catch(console.error);
