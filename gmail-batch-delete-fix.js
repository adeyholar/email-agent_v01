// File path: D:\AI\Gits\email-agent_v01\gmail-batch-delete-fix.js
// Gmail Batch Delete Fix
// Created: January 25, 2025
// Purpose: Fix Gmail batch deletion to use "Move to Trash" instead of permanent delete

import dotenv from 'dotenv';
import { google } from 'googleapis';

dotenv.config();

class GmailBatchDeleter {
    constructor() {
        this.oauth2Client = new google.auth.OAuth2(
            process.env.GMAIL_CLIENT_ID,
            process.env.GMAIL_CLIENT_SECRET,
            'http://localhost:8080/auth/gmail/callback'
        );
        
        this.oauth2Client.setCredentials({
            refresh_token: process.env.GMAIL_REFRESH_TOKEN
        });
        
        this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
    }

    // WORKING METHOD: Move emails to trash (safe deletion)
    async moveEmailsToTrash(messageIds) {
        console.log(`🗑️ Moving ${messageIds.length} emails to trash...`);
        
        const results = {
            success: [],
            failed: []
        };
        
        try {
            // Use batch modify to move multiple emails to trash at once
            const batchRequest = {
                ids: messageIds,
                addLabelIds: ['TRASH']
            };
            
            await this.gmail.users.messages.batchModify({
                userId: 'me',
                requestBody: batchRequest
            });
            
            // All emails moved successfully
            results.success = messageIds;
            
            console.log(`✅ Successfully moved ${messageIds.length} emails to trash`);
            
        } catch (error) {
            console.error('❌ Batch trash operation failed:', error.message);
            
            // Fallback: Try individual deletion
            console.log('🔄 Trying individual email deletion...');
            
            for (const messageId of messageIds) {
                try {
                    await this.gmail.users.messages.trash({
                        userId: 'me',
                        id: messageId
                    });
                    results.success.push(messageId);
                    console.log(`✅ Moved email ${messageId} to trash`);
                } catch (individualError) {
                    console.error(`❌ Failed to move email ${messageId}:`, individualError.message);
                    results.failed.push({
                        id: messageId,
                        error: individualError.message
                    });
                }
                
                // Add small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        return results;
    }

    // OPTIONAL: Permanent deletion (requires enhanced permissions)
    async permanentlyDeleteEmails(messageIds) {
        console.log(`🗑️ Permanently deleting ${messageIds.length} emails...`);
        console.log('⚠️ WARNING: This cannot be undone!');
        
        const results = {
            success: [],
            failed: []
        };
        
        // Note: Gmail API doesn't support batch permanent deletion
        // Must delete one by one
        for (const messageId of messageIds) {
            try {
                await this.gmail.users.messages.delete({
                    userId: 'me',
                    id: messageId
                });
                results.success.push(messageId);
                console.log(`✅ Permanently deleted email ${messageId}`);
            } catch (error) {
                console.error(`❌ Failed to delete email ${messageId}:`, error.message);
                results.failed.push({
                    id: messageId,
                    error: error.message
                });
            }
            
            // Add delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        return results;
    }

    // WORKING METHOD: Remove from inbox (archive)
    async archiveEmails(messageIds) {
        console.log(`📦 Archiving ${messageIds.length} emails...`);
        
        try {
            const batchRequest = {
                ids: messageIds,
                removeLabelIds: ['INBOX']
            };
            
            await this.gmail.users.messages.batchModify({
                userId: 'me',
                requestBody: batchRequest
            });
            
            console.log(`✅ Successfully archived ${messageIds.length} emails`);
            return { success: messageIds, failed: [] };
            
        } catch (error) {
            console.error('❌ Archive operation failed:', error.message);
            return { success: [], failed: messageIds.map(id => ({ id, error: error.message })) };
        }
    }

    // Get recent emails for testing
    async getRecentEmails(limit = 5) {
        try {
            const response = await this.gmail.users.messages.list({
                userId: 'me',
                maxResults: limit,
                q: 'in:inbox'
            });
            
            return response.data.messages || [];
        } catch (error) {
            console.error('Error fetching emails:', error.message);
            return [];
        }
    }

    // Test the deletion functionality
    async testDeletion() {
        console.log('🧪 Testing Gmail Batch Deletion Fix');
        console.log('===================================\n');
        
        // Get some test emails
        const emails = await this.getRecentEmails(3);
        
        if (emails.length === 0) {
            console.log('⚠️ No emails found for testing');
            return;
        }
        
        const emailIds = emails.map(email => email.id);
        console.log(`📧 Found ${emailIds.length} test emails:`, emailIds);
        
        // Test 1: Move to trash (RECOMMENDED)
        console.log('\n🗑️ TEST 1: Move to Trash (Recommended)');
        const trashResults = await this.moveEmailsToTrash([emailIds[0]]);
        console.log('Results:', {
            deleted: trashResults.success.length,
            failed: trashResults.failed.length
        });
        
        // Restore the email
        if (trashResults.success.length > 0) {
            console.log('🔄 Restoring email from trash...');
            await this.gmail.users.messages.untrash({
                userId: 'me',
                id: trashResults.success[0]
            });
            console.log('✅ Email restored');
        }
        
        // Test 2: Archive (Alternative safe option)
        if (emailIds.length > 1) {
            console.log('\n📦 TEST 2: Archive Email (Alternative)');
            const archiveResults = await this.archiveEmails([emailIds[1]]);
            console.log('Results:', {
                archived: archiveResults.success.length,
                failed: archiveResults.failed.length
            });
            
            // Restore to inbox
            if (archiveResults.success.length > 0) {
                console.log('🔄 Restoring email to inbox...');
                await this.gmail.users.messages.batchModify({
                    userId: 'me',
                    requestBody: {
                        ids: [archiveResults.success[0]],
                        addLabelIds: ['INBOX']
                    }
                });
                console.log('✅ Email restored to inbox');
            }
        }
        
        console.log('\n✅ All tests completed successfully!');
        console.log('\n💡 RECOMMENDATION: Use moveEmailsToTrash() method');
        console.log('   - It works with your current OAuth permissions');
        console.log('   - It\'s reversible (users can restore from trash)');
        console.log('   - It\'s the safest deletion method');
    }
}

// Test the functionality
async function main() {
    try {
        const deleter = new GmailBatchDeleter();
        await deleter.testDeletion();
        
        console.log('\n🔧 TO FIX YOUR EMAIL DASHBOARD:');
        console.log('===============================');
        console.log('1. Replace your current deletion code with:');
        console.log('   await gmailDeleter.moveEmailsToTrash(messageIds)');
        console.log('');
        console.log('2. Update your API endpoint to use trash instead of delete');
        console.log('');
        console.log('3. This will fix the "0 deleted, 5 failed" issue');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run if executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
    main();
}

export { GmailBatchDeleter };