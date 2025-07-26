// File path: D:\AI\Gits\email-agent_v01\quick-gmail-fix.js
// Quick Gmail OAuth Fix - Simplified Version
// Created: January 25, 2025
// Purpose: Fix Gmail OAuth issues quickly

import dotenv from 'dotenv';
import { google } from 'googleapis';
import readline from 'readline';

dotenv.config();

async function quickGmailFix() {
    console.log('🔐 Quick Gmail OAuth Fix');
    console.log('=======================\n');
    
    // Check if we have required credentials
    if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET) {
        console.log('❌ Missing Gmail credentials in .env file:');
        console.log('   GMAIL_CLIENT_ID=your_client_id');
        console.log('   GMAIL_CLIENT_SECRET=your_client_secret');
        return;
    }
    
    const oauth2Client = new google.auth.OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET,
        'http://localhost:8080/auth/google/callback'
    );
    
    // Test existing token first
    if (process.env.GMAIL_REFRESH_TOKEN) {
        console.log('🧪 Testing existing Gmail token...');
        
        oauth2Client.setCredentials({
            refresh_token: process.env.GMAIL_REFRESH_TOKEN
        });
        
        try {
            const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
            const profile = await gmail.users.getProfile({ userId: 'me' });
            
            console.log('✅ Existing token works!');
            console.log(`   Account: ${profile.data.emailAddress}`);
            console.log(`   Messages: ${profile.data.messagesTotal}`);
            console.log('\n🎉 Gmail integration is working correctly!');
            return;
            
        } catch (error) {
            console.log('❌ Existing token failed:', error.message);
            console.log('🔄 Need to generate new token...\n');
        }
    } else {
        console.log('⚠️ No refresh token found in .env file');
        console.log('🔄 Need to generate new token...\n');
    }
    
    // Generate new OAuth URL
    const scopes = [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/userinfo.email'
    ];
    
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent'
    });
    
    console.log('🌐 Please visit this URL to authorize the application:');
    console.log(authUrl);
    console.log('\n📝 After authorization, you\'ll be redirected to a URL like:');
    console.log('http://localhost:8080/auth/google/callback?code=AUTHORIZATION_CODE');
    console.log('\nCopy the AUTHORIZATION_CODE from the URL');
    
    // Get authorization code from user
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    const authCode = await new Promise((resolve) => {
        rl.question('\n🔑 Enter the authorization code: ', (code) => {
            rl.close();
            resolve(code.trim());
        });
    });
    
    if (!authCode) {
        console.log('❌ No authorization code provided');
        return;
    }
    
    try {
        console.log('\n🔄 Exchanging code for tokens...');
        
        const { tokens } = await oauth2Client.getToken(authCode);
        oauth2Client.setCredentials(tokens);
        
        // Test the new token
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        const profile = await gmail.users.getProfile({ userId: 'me' });
        
        console.log('✅ New token successful!');
        console.log(`   Account: ${profile.data.emailAddress}`);
        console.log(`   Messages: ${profile.data.messagesTotal}`);
        
        // Show the new refresh token
        console.log('\n📝 Update your .env file with this new refresh token:');
        console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token || tokens.access_token}`);
        
        console.log('\n🎉 Gmail OAuth fix complete!');
        console.log('💡 Don\'t forget to update your .env file and restart your server');
        
    } catch (error) {
        console.log('\n❌ Token exchange failed:', error.message);
        
        if (error.message.includes('redirect_uri_mismatch')) {
            console.log('\n🔧 Fix required:');
            console.log('1. Go to Google Cloud Console');
            console.log('2. Navigate to APIs & Services > Credentials');
            console.log('3. Edit your OAuth 2.0 Client ID');
            console.log('4. Add this redirect URI: http://localhost:8080/auth/google/callback');
            console.log('5. Save and try again');
        }
    }
}

// Run the fix
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
    quickGmailFix().catch(console.error);
}

export { quickGmailFix };