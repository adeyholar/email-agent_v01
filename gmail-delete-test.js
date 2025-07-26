// File path: D:\AI\Gits\email-agent_v01\gmail-delete-test.js
// Gmail Delete Test & Fix
// Created: January 25, 2025
// Purpose: Test and fix Gmail deletion functionality

import dotenv from 'dotenv';
import { google } from 'googleapis';

dotenv.config();

console.log('🗑️ Gmail Delete Test & Fix');
console.log('==========================\n');

try {
    // Setup Gmail API
    const oauth2Client = new google.auth.OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET,
        'http://localhost:8080/auth/gmail/callback'
    );
    
    oauth2Client.setCredentials({
        refresh_token: process.env.GMAIL_REFRESH_TOKEN
    });
    
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    // Test basic access first
    console.log('📧 Testing Gmail API access...');
    const profile = await gmail.users.getProfile({ userId: 'me' });
    console.log(`✅ Gmail connected: ${profile.data.emailAddress}`);
    
    // Check current scopes/permissions
    console.log('\n🔍 Testing permissions...');
    
    // Test read permissions
    try {
        const messages = await gmail.users.messages.list({
            userId: 'me',
            maxResults: 5,
            q: 'in:inbox'
        });
        console.log(`✅ Read permission: Found ${messages.data.messages?.length || 0} messages`);
    } catch (error) {
        console.log('❌ Read permission: Failed -', error.message);
    }
    
    // Test labels access (indicates modify permissions)
    try {
        const labels = await gmail.users.labels.list({ userId: 'me' });
        console.log(`✅ Labels access: Found ${labels.data.labels?.length || 0} labels`);
    } catch (error) {
        console.log('❌ Labels access: Failed -', error.message);
    }
    
    // Test if we can get a specific message for deletion test
    console.log('\n🧪 Testing deletion capabilities...');
    
    // Get a few recent messages to test with
    const messagesList = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 3,
        q: 'in:inbox'
    });
    
    if (!messagesList.data.messages || messagesList.data.messages.length === 0) {
        console.log('⚠️ No messages found to test deletion');
        process.exit(0);
    }
    
    const testMessageId = messagesList.data.messages[0].id;
    console.log(`📨 Found test message ID: ${testMessageId}`);
    
    // Get message details to see what we're working with
    const messageDetail = await gmail.users.messages.get({
        userId: 'me',
        id: testMessageId,
        format: 'metadata',
        metadataHeaders: ['Subject', 'From']
    });
    
    const headers = messageDetail.data.payload.headers;
    const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
    const from = headers.find(h => h.name === 'From')?.value || 'Unknown';
    
    console.log(`📋 Test message: "${subject}" from ${from}`);
    
    // Test different deletion methods
    console.log('\n🗑️ Testing deletion methods...');
    
    // Method 1: Try moving to trash (softer delete)
    try {
        console.log('🧪 Testing: Move to Trash...');
        
        // This should work with gmail.modify scope
        const trashResult = await gmail.users.messages.trash({
            userId: 'me',
            id: testMessageId
        });
        
        console.log('✅ Move to Trash: SUCCESS');
        console.log(`   Message moved to trash: ${trashResult.data.id}`);
        
        // Restore it back to inbox for further testing
        console.log('🔄 Restoring message from trash...');
        await gmail.users.messages.untrash({
            userId: 'me',
            id: testMessageId
        });
        console.log('✅ Message restored to inbox');
        
    } catch (error) {
        console.log('❌ Move to Trash: FAILED');
        console.log(`   Error: ${error.message}`);
        
        if (error.message.includes('insufficient_scope')) {
            console.log('   🔧 Issue: Missing gmail.modify scope');
        } else if (error.message.includes('forbidden')) {
            console.log('   🔧 Issue: Insufficient permissions');
        }
    }
    
    // Method 2: Try permanent deletion (requires more permissions)
    try {
        console.log('\n🧪 Testing: Permanent Delete...');
        
        // Get another message for permanent deletion test
        const deleteTestMessages = await gmail.users.messages.list({
            userId: 'me',
            maxResults: 1,
            q: 'in:spam OR in:trash'  // Try to find a spam/trash message
        });
        
        if (deleteTestMessages.data.messages && deleteTestMessages.data.messages.length > 0) {
            const deleteTestId = deleteTestMessages.data.messages[0].id;
            
            // This requires gmail.modify scope and might need additional permissions
            await gmail.users.messages.delete({
                userId: 'me',
                id: deleteTestId
            });
            
            console.log('✅ Permanent Delete: SUCCESS');
            console.log('   Can permanently delete messages');
        } else {
            console.log('⚠️ No spam/trash messages found for permanent delete test');
        }
        
    } catch (error) {
        console.log('❌ Permanent Delete: FAILED');
        console.log(`   Error: ${error.message}`);
        
        if (error.message.includes('insufficient_scope')) {
            console.log('   🔧 Issue: Missing required scope for permanent deletion');
        }
    }
    
    // Method 3: Try batch operations
    console.log('\n🧪 Testing: Batch Operations...');
    
    try {
        // Test batch modify (this is what's likely failing)
        const batchRequest = {
            ids: [testMessageId],
            addLabelIds: ['TRASH']  // Move to trash via label
        };
        
        const batchResult = await gmail.users.messages.batchModify({
            userId: 'me',
            requestBody: batchRequest
        });
        
        console.log('✅ Batch Operations: SUCCESS');
        console.log('   Can perform batch modifications');
        
        // Restore from trash
        const restoreRequest = {
            ids: [testMessageId],
            removeLabelIds: ['TRASH'],
            addLabelIds: ['INBOX']
        };
        
        await gmail.users.messages.batchModify({
            userId: 'me',
            requestBody: restoreRequest
        });
        
        console.log('✅ Message restored via batch operation');
        
    } catch (error) {
        console.log('❌ Batch Operations: FAILED');
        console.log(`   Error: ${error.message}`);
        
        if (error.message.includes('insufficient_scope')) {
            console.log('   🔧 Issue: Missing scope for batch operations');
        }
    }
    
    console.log('\n📊 DIAGNOSIS SUMMARY');
    console.log('===================');
    
    // Check what the actual issue might be
    if (process.env.GMAIL_REFRESH_TOKEN) {
        console.log('✅ Refresh token: Present');
    } else {
        console.log('❌ Refresh token: Missing');
    }
    
    console.log('\n💡 SOLUTION RECOMMENDATIONS');
    console.log('===========================');
    console.log('Based on the test results above:');
    console.log('');
    console.log('If "Move to Trash" failed:');
    console.log('  🔧 Your OAuth token needs the gmail.modify scope');
    console.log('  📝 Re-run OAuth with enhanced permissions');
    console.log('  🔗 Command: node gmail-oauth-enhanced.js');
    console.log('');
    console.log('If "Batch Operations" failed:');
    console.log('  🔧 Check your batch deletion code implementation');
    console.log('  📝 Use gmail.users.messages.batchModify() instead of delete()');
    console.log('  🗑️ Move to TRASH label instead of permanent deletion');
    console.log('');
    console.log('For immediate fix:');
    console.log('  ✅ Use "Move to Trash" instead of permanent deletion');
    console.log('  ✅ This is safer and works with standard scopes');
    
} catch (error) {
    console.log('❌ Gmail Delete Test Failed:', error.message);
    
    if (error.message.includes('invalid_grant')) {
        console.log('\n🔧 OAuth token expired again');
        console.log('   Run: node gmail-oauth-fixed.js');
    }
}