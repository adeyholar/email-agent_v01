// File path: D:\AI\Gits\email-agent_v01\simple-test.js
// Simple Test Script to diagnose issues
// Created: January 25, 2025

console.log('🧪 Simple Test Script Starting...');
console.log('Node.js version:', process.version);
console.log('Current directory:', process.cwd());

// Test basic imports
console.log('\n📦 Testing basic imports...');

try {
    console.log('Testing dotenv...');
    const dotenv = await import('dotenv');
    console.log('✅ dotenv imported successfully');
    
    dotenv.config();
    console.log('✅ dotenv.config() executed');
} catch (error) {
    console.log('❌ dotenv import failed:', error.message);
}

try {
    console.log('Testing googleapis...');
    const { google } = await import('googleapis');
    console.log('✅ googleapis imported successfully');
    console.log('✅ google.auth available:', !!google.auth);
    console.log('✅ google.gmail available:', !!google.gmail);
} catch (error) {
    console.log('❌ googleapis import failed:', error.message);
    console.log('💡 Run: npm install googleapis');
}

// Test environment variables
console.log('\n🔧 Testing environment variables...');
const envVars = ['GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'GMAIL_EMAIL', 'GMAIL_REFRESH_TOKEN'];
envVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
        console.log(`✅ ${varName}: Set (${value.length} chars)`);
    } else {
        console.log(`❌ ${varName}: Not set`);
    }
});

console.log('\n✅ Simple test completed!');
console.log('If you see this message, the basic script execution is working.');