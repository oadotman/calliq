// Test script for the feedback feature
// Run this in the browser console when logged into the app

console.log('🧪 Testing Feedback Feature...\n');

// Check if the feedback button exists
const checkFeedbackElements = () => {
  // Check sidebar feedback button
  const sidebarButton = document
    .querySelector('button span')
    ?.textContent?.includes('Send Feedback');
  console.log(`✅ Sidebar feedback button: ${sidebarButton ? 'Found' : 'Not found'}`);

  // Check floating feedback button
  const floatingButton = document.querySelector('[aria-label="Send feedback"]');
  console.log(`✅ Floating feedback button: ${floatingButton ? 'Found' : 'Not found'}`);

  // Test keyboard shortcut
  console.log('\n💡 Keyboard Shortcut Test:');
  console.log('Press Ctrl+Shift+F (or Cmd+Shift+F on Mac) to open the feedback modal');

  // Simulate keyboard shortcut
  const event = new KeyboardEvent('keydown', {
    key: 'F',
    shiftKey: true,
    ctrlKey: true,
    bubbles: true,
  });

  console.log('Simulating keyboard shortcut...');
  window.dispatchEvent(event);

  setTimeout(() => {
    const modal = document.querySelector('[role="dialog"]');
    if (modal) {
      console.log('✅ Feedback modal opened successfully!');

      // Check modal elements
      const typeSelect = modal.querySelector('#type');
      const subjectInput = modal.querySelector('#subject');
      const messageTextarea = modal.querySelector('#message');

      console.log('\n📋 Modal Elements:');
      console.log(`  - Type selector: ${typeSelect ? '✓' : '✗'}`);
      console.log(`  - Subject input: ${subjectInput ? '✓' : '✗'}`);
      console.log(`  - Message textarea: ${messageTextarea ? '✓' : '✗'}`);
    } else {
      console.log('❌ Modal did not open. Try manually clicking the feedback button.');
    }
  }, 500);
};

// Test API endpoint
const testFeedbackAPI = async () => {
  console.log('\n🔌 Testing Feedback API...');

  try {
    const response = await fetch('/api/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'feedback',
        subject: 'Test feedback from console',
        message: 'This is a test feedback message sent from the browser console.',
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ API test successful:', data);
    } else {
      console.log('❌ API test failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('❌ API test error:', error);
  }
};

// Run tests
checkFeedbackElements();

console.log('\n📝 Instructions:');
console.log('1. Look for the "Send Feedback" button in the sidebar');
console.log('2. Look for the floating feedback button in the bottom right');
console.log('3. Click either button to open the feedback modal');
console.log('4. Try the keyboard shortcut: Ctrl+Shift+F (Cmd+Shift+F on Mac)');
console.log('5. Submit a test feedback and check your email');
console.log('\n💡 To test the API directly, run: testFeedbackAPI()');

// Export for manual testing
window.testFeedbackAPI = testFeedbackAPI;
