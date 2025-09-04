// Test script to verify the profile API endpoint works
const testProfiles = async () => {
  const testHandles = ['jay.is.camp', 'bomdia.bsky.social', 'sebastianjanas.bsky.social'];
  
  try {
    console.log('🔍 Testing profile API with handles:', testHandles);
    
    const response = await fetch('http://localhost:8081/api/bluesky-profiles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ handles: testHandles })
    });
    
    console.log('📊 Response status:', response.status);
    
    if (!response.ok) {
      console.error('❌ API request failed:', response.statusText);
      return;
    }
    
    const data = await response.json();
    console.log('✅ API response:', JSON.stringify(data, null, 2));
    
    if (data.profiles && data.profiles.length > 0) {
      console.log(`📸 Successfully fetched ${data.profiles.length} profiles`);
      data.profiles.forEach(profile => {
        console.log(`  - ${profile.handle}: ${profile.avatar ? 'Has avatar' : 'No avatar'}`);
      });
    } else {
      console.log('⚠️ No profiles returned');
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
  }
};

// Note: This script is for testing purposes only
// To run: node test_profile_api.js (when server is running)
console.log('📝 Test script created. Run with: node test_profile_api.js');
console.log('⚠️ Make sure the server is running on localhost:8081 first');