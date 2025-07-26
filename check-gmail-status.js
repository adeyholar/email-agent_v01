// File path: D:\AI\Gits\email-agent_v01\check-gmail-status.js
// Gmail Status Checker
// Created: January 25, 2025
// Purpose: Quick status check for Gmail integration
// Updated: Fixed syntax errors

import dotenv from 'dotenv';

dotenv.config();

async function checkGmailStatus() {
    console.log('📧 Gmail Integration Status Check');
    console.log('=================================\n');
    
    // Check environment variables
    const env = {
        clientId: !!process.env.GMAIL_CLIENT_ID,
        clientSecret: !!process.env.GMAIL_CLIENT_SECRET,
        email: !!process.env.GMAIL_EMAIL,
        refreshToken: !!process.env.GMAIL_REFRESH_TOKEN
    };
    
    console.log('🔧 Environment Configuration:');
    console.log(`   Client ID: ${env.clientId ? '✅ Set' : '❌ Missing'}`);
    console.log(`   Client Secret: ${env.clientSecret ? '✅ Set' : '❌ Missing'}`);
    console.log(`   Email: ${env.email ? '✅ Set' : '❌ Missing'}`);
    console.log(`   Refresh Token: ${env.refreshToken ? '✅ Set' : '❌ Missing'}`);
    
    if (process.env.GMAIL_EMAIL) {
        console.log(`   Account: ${process.env.GMAIL_EMAIL}`);
    }
    
    // Check if googleapis package is available and test API connection
    console.log('\n📦 Package Dependencies:');
    try {
        const { google } = await import('googleapis');
        console.log('   googleapis: ✅ Available');
        
        // Test API connection if we have required variables
        if (env.clientId && env.clientSecret && env.refreshToken) {
            console.log('\n🔄 Testing Gmail API Connection...');
            
            try {
                const oauth2Client = new google.auth.OAuth2(
                    process.env.GMAIL_CLIENT_ID,
                    process.env.GMAIL_CLIENT_SECRET,
                    'http://localhost:8080/auth/google/callback'
                );
                
                oauth2Client.setCredentials({
                    refresh_token: process.env.GMAIL_REFRESH_TOKEN
                });
                
                const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
                
                // Quick profile test
                const profile = await gmail.users.getProfile({ userId: 'me' });
                
                console.log('✅ Gmail API Connection: SUCCESS');
                console.log(`   Email: ${profile.data.emailAddress}`);
                console.log(`   Messages: ${profile.data.messagesTotal}`);
                console.log(`   Threads: ${profile.data.threadsTotal}`);
                
            } catch (error) {
                console.log('❌ Gmail API Connection: FAILED');
                console.log(`   Error: ${error.message}`);
                
                if (error.message.includes('invalid_grant')) {
                    console.log('\n💡 Solution: Run Gmail OAuth fix');
                    console.log('   Command: node quick-gmail-fix.js');
                }
            }
        } else {
            console.log('\n⚠️ Cannot test API connection - missing credentials');
            console.log('💡 Solution: Complete OAuth setup');
            console.log('   Command: node quick-gmail-fix.js');
        }
    } catch (error) {
        console.log('   googleapis: ❌ Missing - Run: npm install googleapis');
        return;
    }
    
    console.log('\n=================================');
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
    checkGmailStatus().catch(console.error);
}