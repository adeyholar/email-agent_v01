// File: D:\AI\Gits\email-agent_v01\test-gmail-direct.js
// Direct Gmail Connector Test

import dotenv from 'dotenv';
import { google } from 'googleapis';

dotenv.config();

console.log('🧪 Direct Gmail Connection Test');
console.log('===============================\n');

const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const GMAIL_REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;

console.log('🔍 Checking credentials...');
console.log('Client ID:', GMAIL_CLIENT_ID ? '✅ Present' : '❌ Missing');
console.log('Client Secret:', GMAIL_CLIENT_SECRET ? '✅ Present' : '❌ Missing');
console.log('Refresh Token:', GMAIL_REFRESH_TOKEN ? '✅ Present' : '❌ Missing');
console.log();

if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN) {
    console.error('❌ Missing Gmail credentials. Please complete OAuth setup first.');
    process.exit(1);
}

async function testGmailConnection() {
    try {
        console.log('🔧 Setting up Gmail client...');
        
        // Set up OAuth2 client
        const oauth2Client = new google.auth.OAuth2(
            GMAIL_CLIENT_ID,
            GMAIL_CLIENT_SECRET,
            'http://localhost:8080/auth/gmail/callback'
        );

        // Set credentials
        oauth2Client.setCredentials({
            refresh_token: GMAIL_REFRESH_TOKEN
        });

        console.log('✅ OAuth2 client configured');

        // Create Gmail API client
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        
        console.log('📧 Testing Gmail API access...');

        // Test 1: Get profile
        console.log('\n1️⃣ Testing profile access...');
        const profile = await gmail.users.getProfile({ userId: 'me' });
        console.log('✅ Profile retrieved:');
        console.log('   Email:', profile.data.emailAddress);
        console.log('   Total Messages:', profile.data.messagesTotal);
        console.log('   Total Threads:', profile.data.threadsTotal);

        // Test 2: List recent messages
        console.log('\n2️⃣ Testing message list access...');
        const messages = await gmail.users.messages.list({
            userId: 'me',
            maxResults: 10,
            q: 'in:inbox'
        });

        console.log('✅ Messages retrieved:');
        console.log('   Count:', messages.data.messages ? messages.data.messages.length : 0);
        console.log('   Result Size Estimate:', messages.data.resultSizeEstimate);

        if (messages.data.messages && messages.data.messages.length > 0) {
            console.log('\n3️⃣ Testing individual message access...');
            const firstMessage = await gmail.users.messages.get({
                userId: 'me',
                id: messages.data.messages[0].id,
                format: 'metadata',
                metadataHeaders: ['From', 'Subject', 'Date']
            });

            const headers = firstMessage.data.payload.headers;
            const from = headers.find(h => h.name === 'From')?.value || 'Unknown';
            const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
            const date = headers.find(h => h.name === 'Date')?.value || 'Unknown Date';

            console.log('✅ Sample message retrieved:');
            console.log('   From:', from);
            console.log('   Subject:', subject);
            console.log('   Date:', date);
        }

        console.log('\n🎉 Gmail connection test successful!');
        console.log('✅ All Gmail API calls working properly');
        console.log();
        console.log('🔍 DIAGNOSIS:');
        console.log('Gmail OAuth and API access are working correctly.');
        console.log('The issue is likely in the frontend/API server connection.');
        console.log();
        console.log('📝 NEXT STEPS:');
        console.log('1. Check if API server is running on port 3001');
        console.log('2. Check browser console for API errors');
        console.log('3. Verify frontend is calling the correct API endpoints');

    } catch (error) {
        console.error('❌ Gmail connection test failed:', error.message);
        
        if (error.message.includes('invalid_grant')) {
            console.log('🔧 SOLUTION: Refresh token may be expired. Re-run OAuth setup:');
            console.log('   node gmail-oauth-final.js');
        } else if (error.message.includes('insufficient_scope')) {
            console.log('🔧 SOLUTION: Missing required scopes. Check OAuth configuration.');
        } else {
            console.log('🔧 SOLUTION: Check your .env file and OAuth credentials.');
        }
    }
}

// Run the test
testGmailConnection().catch(console.error);