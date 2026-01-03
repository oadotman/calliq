// Emergency script to process stuck calls
// Run this on the server to process calls that are stuck in the queue

const fetch = require('node-fetch');

async function processStuckCall(callId) {
  try {
    console.log(`Processing stuck call: ${callId}`);

    const response = await fetch(`https://synqall.com/api/calls/${callId}/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-processing': 'true', // Bypass CSRF
      },
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Call processed successfully:', result);
    } else {
      const error = await response.text();
      console.error('❌ Failed to process call:', response.status, error);
    }
  } catch (error) {
    console.error('❌ Error processing call:', error);
  }
}

// Process the stuck call
const stuckCallId = process.argv[2] || '8142b755-f129-4f60-9881-46d7c73ec872';
processStuckCall(stuckCallId);