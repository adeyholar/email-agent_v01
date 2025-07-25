// File: D:\AI\Gits\email-agent_v01\setup-gmail-cloud-console.js
// Gmail Google Cloud Console Setup Guide and Helper
// Fixes "Access blocked: This app's request is invalid" error

import readline from 'readline';

console.log('🔧 Gmail Google Cloud Console Setup Guide');
console.log('==========================================');
console.log('This guide will help you fix the "Access blocked" error for Gmail OAuth.\n');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.trim());
        });
    });
}

async function setupGoogleCloudConsole() {
    console.log('📋 Gmail OAuth Setup Checklist');
    console.log('==============================\n');
    
    console.log('The "Access blocked" error happens because your Gmail app needs proper Google Cloud setup.');
    console.log('Let\'s fix this step by step:\n');
    
    // Step 1: Google Cloud Console Project
    console.log('📖 STEP 1: Google Cloud Console Project');
    console.log('---------------------------------------');
    console.log('1. Go to: https://console.cloud.google.com');
    console.log('2. Sign in with your Google account');
    console.log('3. Create a new project:');
    console.log('   - Click "Select a project" dropdown');
    console.log('   - Click "NEW PROJECT"');
    console.log('   - Project name: "Email Agent MCP"');
    console.log('   - Click "CREATE"');
    console.log('4. Wait for project creation to complete');
    
    await askQuestion('\nPress Enter when you\'ve created the project...');
    
    // Step 2: Enable Gmail API
    console.log('\n📖 STEP 2: Enable Gmail API');
    console.log('---------------------------');
    console.log('1. In Google Cloud Console, go to "APIs & Services" > "Library"');
    console.log('2. Search for "Gmail API"');
    console.log('3. Click on "Gmail API" in the results');
    console.log('4. Click "ENABLE" button');
    console.log('5. Wait for API to be enabled');
    
    await askQuestion('\nPress Enter when Gmail API is enabled...');
    
    // Step 3: OAuth Consent Screen
    console.log('\n📖 STEP 3: Configure OAuth Consent Screen');
    console.log('----------------------------------------');
    console.log('1. Go to "APIs & Services" > "OAuth consent screen"');
    console.log('2. Choose "External" user type');
    console.log('3. Click "CREATE"');
    console.log('4. Fill in App Information:');
    console.log('   - App name: "Email Agent MCP"');
    console.log('   - User support email: (your email)');
    console.log('   - Developer contact information: (your email)');
    console.log('5. Click "SAVE AND CONTINUE"');
    console.log('6. On Scopes page:');
    console.log('   - Click "ADD OR REMOVE SCOPES"');
    console.log('   - Search for "gmail"');
    console.log('   - Select these scopes:');
    console.log('     ✓ https://www.googleapis.com/auth/gmail.readonly');
    console.log('     ✓ https://www.googleapis.com/auth/gmail.modify');
    console.log('     ✓ https://www.googleapis.com/auth/userinfo.email');
    console.log('     ✓ https://www.googleapis.com/auth/userinfo.profile');
    console.log('   - Click "UPDATE"');
    console.log('7. Click "SAVE AND CONTINUE"');
    console.log('8. On Test users page:');
    console.log('   - Click "ADD USERS"');
    console.log('   - Add your Gmail address');
    console.log('   - Click "ADD"');
    console.log('9. Click "SAVE AND CONTINUE"');
    console.log('10. Review and click "BACK TO DASHBOARD"');
    
    await askQuestion('\nPress Enter when OAuth consent screen is configured...');
    
    // Step 4: Create Credentials
    console.log('\n📖 STEP 4: Create OAuth 2.0 Credentials');
    console.log('---------------------------------------');
    console.log('1. Go to "APIs & Services" > "Credentials"');
    console.log('2. Click "CREATE CREDENTIALS" > "OAuth 2.0 Client IDs"');
    console.log('3. Application type: "Desktop application"');
    console.log('4. Name: "Email Agent MCP Desktop"');
    console.log('5. Click "CREATE"');
    console.log('6. A popup will show your credentials:');
    console.log('   - Copy the "Client ID"');
    console.log('   - Copy the "Client secret"');
    console.log('   - Click "OK"');
    
    const clientId = await askQuestion('\nEnter your new Client ID: ');
    const clientSecret = await askQuestion('Enter your new Client Secret: ');
    
    if (clientId && clientSecret) {
        console.log('\n📝 Update Your .env File:');
        console.log('=========================');
        console.log('Replace these lines in your .env file:');
        console.log('');
        console.log(`GMAIL_CLIENT_ID=${clientId}`);
        console.log(`GMAIL_CLIENT_SECRET=${clientSecret}`);
        console.log('GMAIL_REFRESH_TOKEN=  # Leave empty for now');
        console.log('');
        console.log('⚠️ Important: Remove any old GMAIL_REFRESH_TOKEN value');
    }
    
    // Step 5: OAuth Flow
    console.log('\n📖 STEP 5: Get New OAuth Token');
    console.log('------------------------------');
    console.log('Now that your app is properly configured:');
    console.log('1. Update your .env file with the new credentials above');
    console.log('2. Run: node simple-gmail-oauth-fix.js');
    console.log('3. Follow the OAuth flow with your properly configured app');
    console.log('4. The OAuth should now work without "Access blocked" error');
    
    console.log('\n✅ Google Cloud Console Setup Complete!');
    console.log('======================================');
    console.log('Your Gmail app should now work properly.');
    console.log('');
    console.log('🚀 Next Steps:');
    console.log('1. Update .env with new credentials');
    console.log('2. Run: node simple-gmail-oauth-fix.js');
    console.log('3. Test: node test-deletion-fixes.js');
    console.log('4. Start server: node enhanced-working-api-server.js');
}

async function troubleshootCommonIssues() {
    console.log('\n🔧 Common Issues & Solutions:');
    console.log('============================');
    
    const issue = await askQuestion(`
What error are you seeing?
1. "Access blocked: This app's request is invalid"
2. "Error 403: access_denied"
3. "Error 400: invalid_request" 
4. "This app isn't verified"
5. Other

Enter number (1-5): `);
    
    switch (issue) {
        case '1':
            console.log('\n🔧 Fix for "Access blocked":');
            console.log('- Your app needs proper Google Cloud Console setup');
            console.log('- Follow the full setup guide above');
            console.log('- Make sure OAuth consent screen is configured');
            console.log('- Add yourself as a test user');
            break;
            
        case '2':
            console.log('\n🔧 Fix for "Error 403: access_denied":');
            console.log('- Check that you\'re signed in with the right Google account');
            console.log('- Make sure your email is added as a test user');
            console.log('- Verify OAuth consent screen is published');
            break;
            
        case '3':
            console.log('\n🔧 Fix for "Error 400: invalid_request":');
            console.log('- Check Client ID and Client Secret are correct');
            console.log('- Verify redirect URI matches (urn:ietf:wg:oauth:2.0:oob)');
            console.log('- Make sure Gmail API is enabled');
            break;
            
        case '4':
            console.log('\n🔧 Fix for "This app isn\'t verified":');
            console.log('- Click "Advanced" on the warning page');
            console.log('- Click "Go to [Your App] (unsafe)"');
            console.log('- This is normal for testing/development apps');
            console.log('- For production, you\'d need Google verification');
            break;
            
        case '5':
            console.log('\n🔧 For other issues:');
            console.log('- Make sure you\'re using the latest credentials');
            console.log('- Clear browser cache and try again');
            console.log('- Check that all APIs are enabled');
            console.log('- Verify project settings in Google Cloud Console');
            break;
    }
}

// Main menu
async function main() {
    const choice = await askQuestion(`
Choose an option:
1. Full Google Cloud Console setup guide
2. Troubleshoot OAuth errors
3. Quick credentials update
4. Exit

Enter choice (1-4): `);

    switch (choice) {
        case '1':
            await setupGoogleCloudConsole();
            break;
        case '2':
            await troubleshootCommonIssues();
            break;
        case '3':
            console.log('\n📝 Quick Credentials Update:');
            console.log('Just update these in your .env file:');
            const newClientId = await askQuestion('New Client ID: ');
            const newClientSecret = await askQuestion('New Client Secret: ');
            if (newClientId && newClientSecret) {
                console.log('\nUpdate .env with:');
                console.log(`GMAIL_CLIENT_ID=${newClientId}`);
                console.log(`GMAIL_CLIENT_SECRET=${newClientSecret}`);
                console.log('GMAIL_REFRESH_TOKEN=  # Clear this');
            }
            break;
        case '4':
            console.log('Goodbye!');
            break;
        default:
            console.log('Invalid choice');
    }
    
    rl.close();
}

main().catch(console.error);