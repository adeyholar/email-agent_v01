// File path: D:\AI\Gits\email-agent_v01\email-deletion-manager-fixed.js
// Email Deletion Manager - Fixed Version
// Created: January 25, 2025
// Purpose: Replace the broken email-deletion-manager.js with working Gmail deletion

import { google } from 'googleapis';

class EmailDeletionManager {
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

    // ✅ FIXED: Gmail batch deletion using trash method
    async deleteGmailEmails(messageIds) {
        console.log(`🗑️ Deleting ${messageIds.length} Gmail emails...`);
        
        const results = {
            success: [],
            failed: []
        };

        try {
            if (messageIds.length === 0) {
                return results;
            }

            if (messageIds.length === 1) {
                // Single email deletion - use trash method
                await this.gmail.users.messages.trash({
                    userId: 'me',
                    id: messageIds[0]
                });
                results.success = messageIds;
                console.log(`✅ Successfully moved 1 email to trash`);
            } else {
                // Batch email deletion - use batchModify with TRASH label
                await this.gmail.users.messages.batchModify({
                    userId: 'me',
                    requestBody: {
                        ids: messageIds,
                        addLabelIds: ['TRASH']
                    }
                });
                results.success = messageIds;
                console.log(`✅ Successfully moved ${messageIds.length} emails to trash`);
            }

        } catch (error) {
            console.error('Gmail deletion error:', error.message);
            
            // If batch fails, try individual deletion
            if (messageIds.length > 1) {
                console.log('🔄 Batch failed, trying individual deletion...');
                
                for (const messageId of messageIds) {
                    try {
                        await this.gmail.users.messages.trash({
                            userId: 'me',
                            id: messageId
                        });
                        results.success.push(messageId);
                        console.log(`✅ Moved email ${messageId} to trash`);
                    } catch (individualError) {
                        console.error(`❌ Failed to delete ${messageId}:`, individualError.message);
                        results.failed.push({
                            id: messageId,
                            error: individualError.message
                        });
                    }
                    
                    // Small delay to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            } else {
                results.failed.push({
                    id: messageIds[0],
                    error: error.message
                });
            }
        }

        return results;
    }

    // ✅ FIXED: Yahoo/AOL IMAP deletion (if needed)
    async deleteImapEmails(provider, email, messageIds) {
        console.log(`🗑️ Deleting ${messageIds.length} ${provider} emails from ${email}...`);
        
        const results = {
            success: [],
            failed: []
        };

        // For IMAP providers (Yahoo/AOL), we'll use flag-based deletion
        try {
            const { ImapFlow } = await import('imapflow');
            
            const imapConfig = {
                host: provider === 'yahoo' ? 'imap.mail.yahoo.com' : 'imap.aol.com',
                port: 993,
                secure: true,
                auth: {
                    user: email,
                    pass: this.getImapPassword(provider, email)
                }
            };

            const client = new ImapFlow(imapConfig);
            await client.connect();
            
            const lock = await client.getMailboxLock('INBOX');
            
            try {
                for (const messageId of messageIds) {
                    try {
                        // Mark as deleted and expunge
                        await client.messageDelete(messageId, { uid: true });
                        results.success.push(messageId);
                        console.log(`✅ Deleted ${provider} email ${messageId}`);
                    } catch (error) {
                        console.error(`❌ Failed to delete ${messageId}:`, error.message);
                        results.failed.push({
                            id: messageId,
                            error: error.message
                        });
                    }
                }
            } finally {
                lock.release();
                await client.logout();
            }

        } catch (error) {
            console.error(`${provider} deletion error:`, error.message);
            results.failed = messageIds.map(id => ({
                id,
                error: error.message
            }));
        }

        return results;
    }

    // ✅ MAIN: Universal email deletion method
    async batchDeleteEmails(emailsToDelete) {
        console.log(`🗑️ Starting batch deletion of ${emailsToDelete.length} emails`);
        
        const overallResults = {
            totalRequested: emailsToDelete.length,
            deleted: 0,
            failed: 0,
            results: []
        };

        // Group emails by provider
        const emailsByProvider = this.groupEmailsByProvider(emailsToDelete);

        // Process each provider
        for (const [provider, emails] of Object.entries(emailsByProvider)) {
            console.log(`\n📧 Processing ${emails.length} ${provider} emails...`);

            if (provider === 'gmail') {
                const messageIds = emails.map(email => email.id);
                const result = await this.deleteGmailEmails(messageIds);
                
                overallResults.deleted += result.success.length;
                overallResults.failed += result.failed.length;
                overallResults.results.push({
                    provider: 'gmail',
                    ...result
                });
            } else if (provider === 'yahoo' || provider === 'aol') {
                // Group by account for IMAP providers
                const emailsByAccount = this.groupEmailsByAccount(emails);
                
                for (const [account, accountEmails] of Object.entries(emailsByAccount)) {
                    const messageIds = accountEmails.map(email => email.uid || email.id);
                    const result = await this.deleteImapEmails(provider, account, messageIds);
                    
                    overallResults.deleted += result.success.length;
                    overallResults.failed += result.failed.length;
                    overallResults.results.push({
                        provider: provider,
                        account: account,
                        ...result
                    });
                }
            }
        }

        console.log(`\n✅ Batch deletion completed!`);
        console.log(`   Deleted: ${overallResults.deleted} emails`);
        console.log(`   Failed: ${overallResults.failed} emails`);

        return overallResults;
    }

    // Helper: Group emails by provider
    groupEmailsByProvider(emails) {
        const groups = {};
        
        for (const email of emails) {
            const provider = email.provider || 'gmail';
            if (!groups[provider]) {
                groups[provider] = [];
            }
            groups[provider].push(email);
        }
        
        return groups;
    }

    // Helper: Group emails by account (for IMAP providers)
    groupEmailsByAccount(emails) {
        const groups = {};
        
        for (const email of emails) {
            const account = email.account || 'default';
            if (!groups[account]) {
                groups[account] = [];
            }
            groups[account].push(email);
        }
        
        return groups;
    }

    // Helper: Get IMAP password for provider
    getImapPassword(provider, email) {
        if (provider === 'yahoo') {
            if (email === process.env.YAHOO_EMAIL) {
                return process.env.YAHOO_APP_PASSWORD;
            } else if (email === process.env.YAHOO_EMAIL2) {
                return process.env.YAHOO2_APP_PASSWORD;
            }
        } else if (provider === 'aol') {
            if (email === process.env.AOL_EMAIL) {
                return process.env.AOL_APP_PASSWORD;
            } else if (email === process.env.AOL2_EMAIL) {
                return process.env.AOL2_APP_PASSWORD;
            } else if (email === process.env.AOL3_EMAIL) {
                return process.env.AOL3_APP_PASSWORD;
            }
        }
        
        throw new Error(`No password found for ${provider} account: ${email}`);
    }

    // ✅ UTILITY: Restore emails from trash (Gmail only)
    async restoreGmailEmails(messageIds) {
        console.log(`🔄 Restoring ${messageIds.length} Gmail emails from trash...`);
        
        try {
            if (messageIds.length === 1) {
                await this.gmail.users.messages.untrash({
                    userId: 'me',
                    id: messageIds[0]
                });
            } else {
                // Batch restore from trash
                await this.gmail.users.messages.batchModify({
                    userId: 'me',
                    requestBody: {
                        ids: messageIds,
                        removeLabelIds: ['TRASH'],
                        addLabelIds: ['INBOX']
                    }
                });
            }
            
            console.log(`✅ Restored ${messageIds.length} emails from trash`);
            return { success: messageIds, failed: [] };
            
        } catch (error) {
            console.error('Gmail restore error:', error.message);
            return { 
                success: [], 
                failed: messageIds.map(id => ({ id, error: error.message }))
            };
        }
    }
}

export { EmailDeletionManager };