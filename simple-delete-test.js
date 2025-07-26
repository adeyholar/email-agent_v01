// File path: D:\AI\Gits\email-agent_v01\simple-delete-test.js
// Simple Gmail Delete Test
// Created: January 25, 2025

import dotenv from 'dotenv';
import { google } from 'googleapis';

dotenv.config();

console.log('🗑️ Simple Gmail Delete Test');
console.log('===========================');

try {
    console.log('Setting up Gmail API...');
    
    const oauth2Client = new google.auth.OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET,
        'http://localhost:8080/auth/gmail/callback'
    );
    
    oauth2Client.setCredentials({
        refresh_token: process.env.GMAIL_REFRESH_TOKEN
    });
    
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    console.log('✅ Gmail API setup complete');
    
    // Get a test email
    console.log('📧 Getting test email...');
    const messages = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 1,
        q: 'in:inbox'
    });
    
    if (!messages.data.messages || messages.data.messages.length === 0) {
        console.log('❌ No emails found in inbox');
        process.exit(0);
    }
    
    const testEmailId = messages.data.messages[0].id;
    console.log(`✅ Found test email: ${testEmailId}`);
    
    // Test working deletion method (move to trash)
    console.log('🗑️ Testing move to trash...');
    
    const result = await gmail.users.messages.trash({
        userId: 'me',
        id: testEmailId
    });
    
    console.log('✅ Successfully moved email to trash!');
    console.log(`   Trashed email ID: ${result.data.id}`);
    
    // Restore it
    console.log('🔄 Restoring email from trash...');
    
    await gmail.users.messages.untrash({
        userId: 'me',
        id: testEmailId
    });
    
    console.log('✅ Email restored to inbox!');
    
    console.log('\n🎉 SOLUTION FOUND!');
    console.log('==================');
    console.log('Your Gmail deletion should use:');
    console.log('  gmail.users.messages.trash() - for single emails');
    console.log('  gmail.users.messages.batchModify() - for multiple emails');
    console.log('');
    console.log('NOT:');
    console.log('  gmail.users.messages.delete() - requires special permissions');
    
} catch (error) {
    console.log('❌ Error:', error.message);
    console.log('Stack:', error.stack);
}

console.log('\n✅ Test completed!');