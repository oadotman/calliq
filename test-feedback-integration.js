// Test script for the feedback integration in Help Center
// Run this in the browser console when on the Help Center page

console.log('🧪 Testing Feedback Integration in Help Center...\n');

// Check if we're on the Help Center page
if (!window.location.pathname.includes('/help')) {
  console.log('⚠️ Please navigate to /help to run this test');
} else {
  console.log('✅ Currently on Help Center page');

  // Check for feedback section
  const checkFeedbackSection = () => {
    // Look for the feedback card
    const feedbackCard = Array.from(document.querySelectorAll('.bg-gradient-to-r')).find((el) =>
      el.textContent?.includes('Share Your Feedback')
    );

    if (feedbackCard) {
      console.log('✅ Feedback section found in Help Center');

      // Check for the button
      const feedbackButton = feedbackCard.querySelector('button');
      if (feedbackButton && feedbackButton.textContent?.includes('Send Feedback')) {
        console.log('✅ Send Feedback button found');
        console.log('   Button text:', feedbackButton.textContent);

        // Check for keyboard shortcut tip
        const shortcutTip = feedbackCard.querySelector('kbd');
        if (shortcutTip) {
          console.log('✅ Keyboard shortcut tip is displayed');
        }

        console.log('\n📝 Testing Instructions:');
        console.log('1. Click the "Send Feedback" button in the purple/blue gradient card');
        console.log('2. Or use keyboard shortcut: Ctrl+Shift+F (Cmd+Shift+F on Mac)');
        console.log('3. Test each feedback type: Bug Report, General Feedback, Feature Request');
        console.log('4. Submit feedback and check email at adeliyitomiwa@yahoo.com');

        return feedbackButton;
      } else {
        console.log('❌ Send Feedback button not found');
      }
    } else {
      console.log('❌ Feedback section not found in Help Center');
      console.log('   Looking for a gradient card with "Share Your Feedback" text');
    }

    return null;
  };

  const button = checkFeedbackSection();

  // Test floating feedback button
  console.log('\n🔍 Checking for floating feedback button...');
  const floatingButton = document.querySelector('[aria-label="Send feedback"]');
  if (floatingButton) {
    console.log('✅ Floating feedback button is present (bottom-right corner)');
  } else {
    console.log('ℹ️ Floating feedback button not found (might be loading)');
  }

  // Auto-click test (optional)
  if (button) {
    console.log('\n💡 To automatically open the feedback modal, run:');
    console.log("   document.querySelector('button:has(.w-4.h-4.mr-2)')?.click()");
  }
}

// Test keyboard shortcut
console.log('\n⌨️ Testing keyboard shortcut...');
console.log('Simulating Ctrl+Shift+F...');

setTimeout(() => {
  const event = new KeyboardEvent('keydown', {
    key: 'F',
    code: 'KeyF',
    shiftKey: true,
    ctrlKey: true,
    metaKey: false,
    bubbles: true,
  });

  window.dispatchEvent(event);

  setTimeout(() => {
    const modal = document.querySelector('[role="dialog"]');
    if (modal && modal.textContent?.includes('Send Feedback')) {
      console.log('✅ Keyboard shortcut works! Modal opened.');

      // Close it for cleanliness
      const closeButton = modal.querySelector('[aria-label*="Close"]');
      if (closeButton) {
        closeButton.click();
        console.log('   (Modal closed automatically for testing)');
      }
    } else {
      console.log('ℹ️ Keyboard shortcut did not open modal (may need manual testing)');
    }
  }, 500);
}, 1000);
