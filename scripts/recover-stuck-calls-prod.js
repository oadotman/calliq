// Production recovery script with proper environment loading
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file in production
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach((line) => {
      const [key, value] = line.split('=');
      if (key && value) {
        process.env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
      }
    });
    console.log('✅ Loaded environment from .env file');
  } else {
    console.log('⚠️  No .env file found, using existing environment');
  }
}

// Load environment
loadEnv();

// Validate required env vars
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅' : '❌');
  console.error(
    '   SUPABASE_SERVICE_ROLE_KEY:',
    process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅' : '❌'
  );
  console.error('\nPlease ensure your .env file contains these variables');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function recoverStuckCalls() {
  console.log('\n🔍 Searching for stuck calls...\n');

  // Find calls stuck in processing states
  const { data: stuckCalls, error } = await supabase
    .from('calls')
    .select('*')
    .in('status', ['uploading', 'processing', 'transcribing', 'extracting'])
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ Error fetching calls:', error);
    return;
  }

  if (!stuckCalls || stuckCalls.length === 0) {
    console.log('✅ No stuck calls found!');
    return;
  }

  console.log(`Found ${stuckCalls.length} stuck call(s):\n`);

  for (const call of stuckCalls) {
    const minutesSinceCreation = Math.round(
      (Date.now() - new Date(call.created_at).getTime()) / 1000 / 60
    );

    console.log(`📞 Call: ${call.file_name}`);
    console.log(`   ID: ${call.id}`);
    console.log(`   Customer: ${call.customer_name || 'Unknown'}`);
    console.log(`   Status: ${call.status}`);
    console.log(`   Created: ${minutesSinceCreation} minutes ago`);

    // Check if call has been stuck for more than 5 minutes
    if (minutesSinceCreation > 5) {
      // Check if transcript exists
      const { data: transcript } = await supabase
        .from('transcripts')
        .select('id, text')
        .eq('call_id', call.id)
        .single();

      if (transcript && transcript.text) {
        console.log('   ✅ Transcript exists - marking as completed');

        await supabase
          .from('calls')
          .update({
            status: 'completed',
            processing_progress: 100,
            processing_message: 'Recovered - transcript already exists',
            processed_at: new Date().toISOString(),
          })
          .eq('id', call.id);
      } else if (call.file_url) {
        console.log('   🔄 Resetting for reprocessing...');

        // Update to processing status with proper fields
        const { error: updateError } = await supabase
          .from('calls')
          .update({
            status: 'processing',
            processing_progress: 0,
            processing_message: 'Reprocessing after recovery',
            processing_attempts: (call.processing_attempts || 0) + 1,
          })
          .eq('id', call.id);

        if (updateError) {
          console.error('   ❌ Failed to update:', updateError.message);
          continue;
        }

        // Trigger processing
        console.log('   📤 Triggering processing...');
        try {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.synqall.com';
          const response = await fetch(`${appUrl}/api/calls/${call.id}/process`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-internal-processing': 'true',
            },
          });

          if (response.ok) {
            console.log('   ✅ Processing triggered successfully!');
          } else {
            const text = await response.text();
            console.log('   ⚠️  Processing request sent, response:', response.status);
            if (text.includes('CSRF')) {
              console.log('   ❌ CSRF BLOCKING STILL ACTIVE - Deploy the fix first!');
            }
          }
        } catch (err) {
          console.log('   ⚠️  Error calling API:', err.message);
        }
      } else {
        console.log('   ❌ No file URL - cannot process');
      }
    } else {
      console.log('   ⏳ Recently created, skipping (wait 5 minutes)');
    }

    console.log('');
  }

  console.log('✨ Recovery complete!\n');
}

recoverStuckCalls().catch(console.error);
