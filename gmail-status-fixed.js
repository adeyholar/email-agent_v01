// File path: D:\AI\Gits\email-agent_v01\gmail-status-fixed.js
// Gmail Status Checker - Fixed Version
// Created: January 25, 2025

import dotenv from 'dotenv';
import { google } from 'googleapis';

dotenv.config();

console.log('📧 Gmail Integration Status Check - FIXED VERSION');
console.log('================================================\n');

try {
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
    
    // Test API connection if we have required variables
    if (env.clientId && env.clientSecret && env.refreshToken) {
        console.log('\n🔄 Testing Gmail API Connection...');
        
        const oauth2Client = new google.auth.OAuth2(
            process.env.GMAIL_CLIENT_ID,
            process.env.GMAIL_CLIENT_SECRET,
            'http://localhost:8080/auth/google/callback'
        );
        
        oauth2Client.setCredentials({
            refresh_token: process.env.GMAIL_REFRESH_TOKEN
        });
        
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        
        try {
            // Quick profile test
            const profile = await gmail.users.getProfile({ userId: 'me' });
            
            console.log('✅ Gmail API Connection: SUCCESS');
            console.log(`   Email: ${profile.data.emailAddress}`);
            console.log(`   Messages: ${profile.data.messagesTotal}`);
            console.log(`   Threads: ${profile.data.threadsTotal}`);
            
            // Test message access
            console.log('\n📨 Testing Message Access...');
            const messages = await gmail.users.messages.list({
                userId: 'me',
                maxResults: 5
            });
            
            console.log(`✅ Recent messages: ${messages.data.messages?.length || 0} found`);
            
            console.log('\n🎉 Gmail integration is WORKING PERFECTLY!');
            console.log('✅ You can proceed with using the email dashboard');
            
        } catch (apiError) {
            console.log('❌ Gmail API Connection: FAILED');
            console.log(`   Error: ${apiError.message}`);
            
            if (apiError.message.includes('invalid_grant')) {
                console.log('\n💡 Solution: Refresh token expired');
                console.log('   Run: node quick-gmail-fix.js');
            } else if (apiError.message.includes('insufficient_scope')) {
                console.log('\n💡 Solution: Need additional OAuth permissions');
                console.log('   Run: node quick-gmail-fix.js');
            }
        }
    } else {
        console.log('\n⚠️ Cannot test API connection - missing credentials');
        console.log('💡 Solution: Complete OAuth setup');
        console.log('   Run: node quick-gmail-fix.js');
    }
    
} catch (error) {
    console.log('❌ Script error:', error.message);
    console.log('Stack:', error.stack);
}

console.log('\n=================================');
console.log('Status check completed!');