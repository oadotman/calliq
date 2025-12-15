/**
 * Script to fix missing duration values in calls
 * This script will:
 * 1. Find calls with missing duration values
 * 2. Try to get duration from transcript audio_duration
 * 3. If no transcript duration, estimate from file size
 * 4. Update the calls with the correct duration
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixMissingDurations() {
  console.log('🔧 Starting to fix missing duration values...\n');

  try {
    // Step 1: Get all calls with missing durations
    const { data: callsWithMissingDuration, error: fetchError } = await supabase
      .from('calls')
      .select(`
        id,
        file_name,
        file_size,
        mime_type,
        duration,
        duration_minutes,
        organization_id,
        transcripts (
          audio_duration
        )
      `)
      .or('duration.is.null,duration_minutes.is.null')
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching calls:', fetchError);
      return;
    }

    console.log(`📊 Found ${callsWithMissingDuration.length} calls with missing duration values\n`);

    if (callsWithMissingDuration.length === 0) {
      console.log('✅ No calls with missing durations found!');
      return;
    }

    let fixedFromTranscript = 0;
    let fixedFromEstimate = 0;
    let failed = 0;

    // Step 2: Process each call
    for (const call of callsWithMissingDuration) {
      console.log(`Processing: ${call.file_name}`);

      let duration = null;
      let duration_minutes = null;
      let source = '';

      // Try to get duration from transcript
      if (call.transcripts && call.transcripts.length > 0 && call.transcripts[0].audio_duration) {
        duration = Math.round(call.transcripts[0].audio_duration);
        duration_minutes = Math.round(call.transcripts[0].audio_duration / 60);
        source = 'transcript';
        fixedFromTranscript++;
      }
      // Estimate from file size if no transcript duration
      else if (call.file_size && call.file_size > 0) {
        // Estimate based on typical audio bitrate (128 kbps = 16 KB/s)
        // Using a more conservative estimate for compressed formats
        let bytesPerSecond = 16000; // 128 kbps

        // Adjust based on mime type if available
        if (call.mime_type) {
          if (call.mime_type.includes('wav')) {
            bytesPerSecond = 176400; // 1411 kbps for WAV
          } else if (call.mime_type.includes('mp3')) {
            bytesPerSecond = 16000; // 128 kbps for MP3
          } else if (call.mime_type.includes('m4a') || call.mime_type.includes('aac')) {
            bytesPerSecond = 16000; // 128 kbps for AAC/M4A
          } else if (call.mime_type.includes('ogg') || call.mime_type.includes('opus')) {
            bytesPerSecond = 12000; // 96 kbps for OGG/Opus
          }
        }

        duration = Math.max(60, Math.round(call.file_size / bytesPerSecond)); // Minimum 60 seconds
        duration_minutes = Math.max(1, Math.round(duration / 60)); // Minimum 1 minute
        source = 'estimate';
        fixedFromEstimate++;
      } else {
        console.log(`  ⚠️  Could not determine duration for ${call.file_name}`);
        failed++;
        continue;
      }

      // Step 3: Update the call with the duration
      const { error: updateError } = await supabase
        .from('calls')
        .update({
          duration,
          duration_minutes,
          updated_at: new Date().toISOString()
        })
        .eq('id', call.id);

      if (updateError) {
        console.error(`  ❌ Error updating call ${call.id}:`, updateError);
        failed++;
      } else {
        console.log(`  ✅ Fixed duration (${duration_minutes} min) - Source: ${source}`);
      }
    }

    // Step 4: Summary
    console.log('\n📈 Summary:');
    console.log(`  ✅ Fixed from transcript: ${fixedFromTranscript}`);
    console.log(`  ✅ Fixed from estimate: ${fixedFromEstimate}`);
    console.log(`  ❌ Failed to fix: ${failed}`);
    console.log(`  📊 Total processed: ${callsWithMissingDuration.length}`);

    // Step 5: Verify the fix
    const { data: verifyData, error: verifyError } = await supabase
      .from('calls')
      .select('id')
      .or('duration.is.null,duration_minutes.is.null');

    if (!verifyError) {
      console.log(`\n🔍 Remaining calls with missing durations: ${verifyData.length}`);
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the script
fixMissingDurations()
  .then(() => {
    console.log('\n✨ Script completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });