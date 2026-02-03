// Test script to debug navigation issues
// Run this in the browser console when logged into the app

console.log('🔍 Starting navigation debug test...');

// Function to test navigation
async function testNavigation() {
  console.log('\n📍 Current location:', window.location.pathname);

  // Check auth state
  const authCookies = document.cookie
    .split(';')
    .filter((c) => c.includes('sb-') || c.includes('csrf'));

  console.log('🍪 Auth cookies present:', authCookies.length > 0);
  authCookies.forEach((cookie) => {
    const [name] = cookie.trim().split('=');
    console.log(`  - ${name}`);
  });

  // Check localStorage
  const authKeys = Object.keys(localStorage).filter(
    (key) => key.includes('supabase') || key.includes('auth') || key.includes('organization')
  );

  console.log('💾 Auth localStorage keys:', authKeys.length > 0);
  authKeys.forEach((key) => {
    console.log(`  - ${key}`);
  });

  // Try to get the current user from localStorage
  const authToken = localStorage.getItem('sb-qftyoiozatjhgmvdxgzw-auth-token');
  if (authToken) {
    try {
      const parsed = JSON.parse(authToken);
      console.log('👤 Current user:', parsed.user?.email);
      console.log(
        '🎫 Session expires:',
        parsed.expires_at ? new Date(parsed.expires_at * 1000) : 'N/A'
      );
    } catch (e) {
      console.log('❌ Failed to parse auth token');
    }
  }

  console.log('\n🧪 Testing navigation to different routes...');
  console.log('Click on different navigation links and observe the console output.');
  console.log('The AuthLayout and Sidebar components have debug logging enabled.');

  // Monitor navigation changes
  let lastPath = window.location.pathname;
  const observer = setInterval(() => {
    if (window.location.pathname !== lastPath) {
      console.log(`\n🔄 Navigation detected: ${lastPath} → ${window.location.pathname}`);
      lastPath = window.location.pathname;
    }
  }, 100);

  // Clean up after 30 seconds
  setTimeout(() => {
    clearInterval(observer);
    console.log('\n✅ Navigation test completed');
  }, 30000);

  console.log('\n💡 Instructions:');
  console.log('1. Click on "Team" in the sidebar');
  console.log('2. Click on "Analytics" in the sidebar');
  console.log('3. Click on "Calls" in the sidebar');
  console.log('4. Click on "Settings" in the sidebar');
  console.log('5. Watch the console for debug output');
  console.log('\nTest will auto-stop in 30 seconds.');
}

// Run the test
testNavigation();
