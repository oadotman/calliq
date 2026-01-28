// Script to fix calls stuck in "uploading" status
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

async function fixUploadingCalls() {
  console.log('\n🔍 Checking for calls stuck in uploading status...\n');

  // Find calls stuck in 'uploading' status that have a file_url
  const { data: stuckCalls, error } = await supabase
    .from('calls')
    .select('*')
    .eq('status', 'uploading')
    .not('file_url', 'is', null);

  if (error) {
    console.error('❌ Error fetching calls:', error);
    return;
  }

  if (!stuckCalls || stuckCalls.length === 0) {
    console.log('✅ No stuck uploading calls found');
    return;
  }

  console.log(`Found ${stuckCalls.length} call(s) stuck in uploading status:\n`);

  for (const call of stuckCalls) {
    const minutesSinceCreation = Math.round(
      (Date.now() - new Date(call.created_at).getTime()) / 1000 / 60
    );

    console.log(`📞 Call: ${call.file_name}`);
    console.log(`   ID: ${call.id}`);
    console.log(`   Customer: ${call.customer_name || 'Unknown'}`);
    console.log(`   Created: ${minutesSinceCreation} minutes ago`);
    console.log(`   File URL: ${call.file_url ? '✅ Present' : '❌ Missing'}`);

    if (call.file_url) {
      console.log('   🔧 Fixing status and triggering processing...');

      // First, update status to 'processing' to trigger the processing
      const { error: updateError } = await supabase
        .from('calls')
        .update({
          status: 'processing',
          processing_progress: 0,
          processing_message: 'Starting processing...',
        })
        .eq('id', call.id);

      if (updateError) {
        console.error('   ❌ Failed to update status:', updateError.message);
        continue;
      }

      console.log('   ✅ Status updated to "processing"');

      // Now trigger processing
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const response = await fetch(`${baseUrl}/api/calls/${call.id}/process`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-processing': 'true',
          },
        });

        if (response.ok) {
          console.log('   ✅ Processing started successfully!');
        } else {
          const errorText = await response.text();
          console.log('   ⚠️  Processing request sent, but got response:', response.status);
          console.log('   ', errorText.substring(0, 100));
        }
      } catch (fetchError) {
        console.log('   ⚠️  Could not trigger processing (API may be offline)');
        console.log(
          '      Call is now in "uploaded" status and will be processed when API is available'
        );
      }
    } else {
      console.log('   ❌ No file URL - cannot process this call');
    }

    console.log('');
  }

  console.log('✨ Finished processing stuck uploading calls\n');
}

fixUploadingCalls().catch(console.error);
