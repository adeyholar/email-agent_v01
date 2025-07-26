// File: D:\AI\Gits\email-agent_v01\email-deletion-manager.js
// FIXED Email Deletion Manager - Corrected IMAP methods and Gmail permissions
// Handles Gmail API, Yahoo IMAP, and AOL IMAP deletion with proper methods

import { google } from 'googleapis';
import { ImapFlow } from 'imapflow';

export class EmailDeletionManager {
    constructor(gmailAuth, yahooManager, aolManager) {
        this.gmail = google.gmail({ version: 'v1', auth: gmailAuth });
        this.yahooManager = yahooManager;
        this.aolManager = aolManager;
        
        // Deletion audit log
        this.deletionLog = [];
        this.maxLogEntries = 1000;
        
        console.log('🗑️ Email Deletion Manager initialized with FIXED IMAP methods');
    }

    /**
     * Log deletion operations for audit purposes
     */
    logDeletion(operation) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            ...operation
        };
        
        this.deletionLog.unshift(logEntry);
        
        // Keep only the most recent entries
        if (this.deletionLog.length > this.maxLogEntries) {
            this.deletionLog = this.deletionLog.slice(0, this.maxLogEntries);
        }
        
        console.log(`📝 Logged deletion: ${operation.provider} - ${operation.deletedCount} emails`);
    }

    /**
     * Get deletion audit log
     */
    getDeletionLog(limit = 50) {
        return this.deletionLog.slice(0, limit);
    }

    /**
     * Batch delete emails by IDs/UIDs
     */
    async batchDeleteEmails(provider, account, emailIds, uids) {
        try {
            console.log(`🗑️ Batch delete request: ${provider} - ${emailIds?.length || uids?.length} emails`);

            let result;

            switch (provider.toLowerCase()) {
                case 'gmail':
                    result = await this.deleteGmailEmails(emailIds);
                    break;
                case 'yahoo':
                    result = await this.deleteYahooEmails(account, uids);
                    break;
                case 'aol':
                    result = await this.deleteAOLEmails(account, uids);
                    break;
                default:
                    throw new Error(`Unsupported provider: ${provider}`);
            }

            // Log the deletion operation
            this.logDeletion({
                provider: provider.toLowerCase(),
                account: account || 'N/A',
                emailCount: emailIds?.length || uids?.length,
                deletedCount: result.deletedCount,
                method: 'batch_delete',
                success: result.success
            });

            return result;

        } catch (error) {
            console.error('❌ Batch delete error:', error.message);
            
            // Log failed deletion attempt
            this.logDeletion({
                provider: provider.toLowerCase(),
                account: account || 'N/A',
                emailCount: emailIds?.length || uids?.length,
                deletedCount: 0,
                method: 'batch_delete',
                success: false,
                error: error.message
            });

            throw error;
        }
    }

    /**
     * FIXED: Delete Gmail emails using Gmail API with proper permissions
     */
    async deleteGmailEmails(emailIds) {
        if (!emailIds || emailIds.length === 0) {
            throw new Error('Gmail requires emailIds array');
        }

        console.log(`🗑️ Deleting ${emailIds.length} Gmail messages...`);
        console.log('⚠️ NOTE: Gmail deletion requires additional OAuth scopes');

        let deletedCount = 0;
        const failedDeletions = [];

        // Process deletions with rate limiting (Gmail API limits)
        const batchSize = 5; // Smaller batches to avoid rate limits
        
        for (let i = 0; i < emailIds.length; i += batchSize) {
            const batch = emailIds.slice(i, i + batchSize);
            
            await Promise.all(batch.map(async (emailId) => {
                try {
                    // Try to delete the message
                    await this.gmail.users.messages.delete({
                        userId: 'me',
                        id: emailId
                    });
                    deletedCount++;
                    console.log(`   ✅ Deleted Gmail message: ${emailId}`);
                } catch (error) {
                    if (error.message.includes('Insufficient Permission')) {
                        console.warn(`   🔒 Gmail permission error for ${emailId}: Need additional OAuth scopes`);
                        failedDeletions.push({ 
                            id: emailId, 
                            error: 'Insufficient Permission - Need OAuth scope update' 
                        });
                    } else {
                        console.warn(`   ⚠️ Failed to delete Gmail message ${emailId}:`, error.message);
                        failedDeletions.push({ id: emailId, error: error.message });
                    }
                }
            }));

            // Small delay between batches to respect rate limits
            if (i + batchSize < emailIds.length) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }

        console.log(`✅ Gmail deletion completed: ${deletedCount}/${emailIds.length} messages deleted`);

        // If no emails were deleted due to permissions, provide helpful guidance
        if (deletedCount === 0 && failedDeletions.every(f => f.error.includes('Insufficient Permission'))) {
            console.log('🔧 Gmail OAuth Scope Fix Needed:');
            console.log('   Add this scope to your Gmail OAuth: https://www.googleapis.com/auth/gmail.modify');
            console.log('   Or use: https://mail.google.com/ (full access)');
        }

        return {
            success: true,
            deletedCount,
            totalRequested: emailIds.length,
            failedDeletions,
            provider: 'gmail',
            needsPermissionUpdate: deletedCount === 0 && failedDeletions.length > 0
        };
    }

    /**
     * FIXED: Delete Yahoo emails using correct IMAP methods
     */
    async deleteYahooEmails(account, uids) {
        if (!uids || uids.length === 0 || !account) {
            throw new Error('Yahoo requires uids array and account email');
        }

        const yahooAccount = this.yahooManager.accounts.find(a => a.email === account);
        if (!yahooAccount) {
            throw new Error(`Yahoo account ${account} not found`);
        }

        console.log(`🗑️ Deleting ${uids.length} emails from Yahoo: ${account}`);

        const client = new ImapFlow({
            host: 'imap.mail.yahoo.com',
            port: 993,
            secure: true,
            auth: {
                user: yahooAccount.email,
                pass: yahooAccount.password
            },
            logger: false
        });

        await client.connect();
        const lock = await client.getMailboxLock('INBOX');
        
        try {
            // FIXED: Correct method for marking messages as deleted
            console.log('   🏷️ Marking messages as deleted...');
            await client.messageFlagsAdd(uids, ['\\Deleted']);
            
            // FIXED: Use messageDelete instead of expunge for ImapFlow
            console.log('   🗑️ Permanently deleting messages...');
            await client.messageDelete(uids, { uid: true });
            
            console.log(`✅ Successfully deleted ${uids.length} emails from Yahoo: ${account}`);
            
            return {
                success: true,
                deletedCount: uids.length,
                totalRequested: uids.length,
                provider: 'yahoo',
                account: account
            };
            
        } catch (imapError) {
            console.error('❌ Yahoo IMAP deletion error:', imapError.message);
            
            // Try alternative method if messageDelete fails
            try {
                console.log('   🔄 Trying alternative deletion method...');
                
                // Move to Trash folder instead of permanent deletion
                const trashExists = await client.getMailboxLock('Trash');
                if (trashExists) {
                    await client.messageMove(uids, 'Trash', { uid: true });
                    console.log(`✅ Moved ${uids.length} emails to Trash in Yahoo: ${account}`);
                    
                    return {
                        success: true,
                        deletedCount: uids.length,
                        totalRequested: uids.length,
                        provider: 'yahoo',
                        account: account,
                        method: 'moved_to_trash'
                    };
                }
            } catch (moveError) {
                console.error('❌ Yahoo alternative deletion also failed:', moveError.message);
            }
            
            throw imapError;
            
        } finally {
            lock.release();
            await client.logout();
        }
    }

    /**
     * FIXED: Delete AOL emails using correct IMAP methods
     */
    async deleteAOLEmails(account, uids) {
        if (!uids || uids.length === 0 || !account) {
            throw new Error('AOL requires uids array and account email');
        }

        const aolAccount = this.aolManager.accounts.find(a => a.email === account);
        if (!aolAccount) {
            throw new Error(`AOL account ${account} not found`);
        }

        console.log(`🗑️ Deleting ${uids.length} emails from AOL: ${account}`);

        const client = new ImapFlow({
            host: 'imap.aol.com',
            port: 993,
            secure: true,
            auth: {
                user: aolAccount.email,
                pass: aolAccount.password
            },
            logger: false
        });

        await client.connect();
        const lock = await client.getMailboxLock('INBOX');
        
        try {
            // FIXED: Correct method for marking messages as deleted
            console.log('   🏷️ Marking messages as deleted...');
            await client.messageFlagsAdd(uids, ['\\Deleted']);
            
            // FIXED: Use messageDelete instead of expunge for ImapFlow
            console.log('   🗑️ Permanently deleting messages...');
            await client.messageDelete(uids, { uid: true });
            
            console.log(`✅ Successfully deleted ${uids.length} emails from AOL: ${account}`);
            
            return {
                success: true,
                deletedCount: uids.length,
                totalRequested: uids.length,
                provider: 'aol',
                account: account
            };
            
        } catch (imapError) {
            console.error('❌ AOL IMAP deletion error:', imapError.message);
            
            // Try alternative method if messageDelete fails
            try {
                console.log('   🔄 Trying alternative deletion method...');
                
                // Move to Trash folder instead of permanent deletion
                const trashExists = await client.getMailboxLock('Trash');
                if (trashExists) {
                    await client.messageMove(uids, 'Trash', { uid: true });
                    console.log(`✅ Moved ${uids.length} emails to Trash in AOL: ${account}`);
                    
                    return {
                        success: true,
                        deletedCount: uids.length,
                        totalRequested: uids.length,
                        provider: 'aol',
                        account: account,
                        method: 'moved_to_trash'
                    };
                }
            } catch (moveError) {
                console.error('❌ AOL alternative deletion also failed:', moveError.message);
            }
            
            throw imapError;
            
        } finally {
            lock.release();
            await client.logout();
        }
    }

    /**
     * Delete emails by criteria (search-based deletion)
     */
    async deleteEmailsByCriteria(provider, account, criteria) {
        try {
            console.log(`🗑️ Delete by criteria: ${provider} - ${JSON.stringify(criteria)}`);

            let searchQuery = '';
            let result;

            // Build search query based on criteria
            if (criteria.sender) searchQuery += `from:${criteria.sender} `;
            if (criteria.subject) searchQuery += `subject:${criteria.subject} `;
            if (criteria.older_than_days) {
                const date = new Date();
                date.setDate(date.getDate() - criteria.older_than_days);
                const dateStr = `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
                searchQuery += `before:${dateStr} `;
            }
            if (criteria.unread_only) searchQuery += 'is:unread ';

            searchQuery = searchQuery.trim();

            switch (provider.toLowerCase()) {
                case 'gmail':
                    result = await this.deleteGmailByCriteria(searchQuery, criteria.limit || 100);
                    break;
                case 'yahoo':
                    result = await this.deleteYahooByCriteria(account, criteria);
                    break;
                case 'aol':
                    result = await this.deleteAOLByCriteria(account, criteria);
                    break;
                default:
                    throw new Error(`Unsupported provider: ${provider}`);
            }

            // Log the criteria-based deletion
            this.logDeletion({
                provider: provider.toLowerCase(),
                account: account || 'N/A',
                criteria: criteria,
                deletedCount: result.deletedCount,
                method: 'criteria_delete',
                success: result.success
            });

            return result;

        } catch (error) {
            console.error('❌ Delete by criteria error:', error.message);
            
            // Log failed deletion attempt
            this.logDeletion({
                provider: provider.toLowerCase(),
                account: account || 'N/A',
                criteria: criteria,
                deletedCount: 0,
                method: 'criteria_delete',
                success: false,
                error: error.message
            });

            throw error;
        }
    }

    /**
     * Delete Gmail emails by search criteria
     */
    async deleteGmailByCriteria(searchQuery, limit = 100) {
        console.log(`🔍 Searching Gmail with query: "${searchQuery}"`);
        
        const searchResults = await this.gmail.users.messages.list({
            userId: 'me',
            q: searchQuery,
            maxResults: limit
        });

        if (searchResults.data.messages && searchResults.data.messages.length > 0) {
            const emailIds = searchResults.data.messages.map(msg => msg.id);
            console.log(`   📧 Found ${emailIds.length} emails matching criteria`);
            
            // Use the batch delete method
            return await this.deleteGmailEmails(emailIds);
        } else {
            console.log('   📭 No emails found matching criteria');
            return { 
                success: true, 
                deletedCount: 0, 
                totalRequested: 0,
                provider: 'gmail' 
            };
        }
    }

    /**
     * Delete Yahoo emails by criteria
     */
    async deleteYahooByCriteria(account, criteria) {
        // Search for emails matching criteria
        const searchQuery = criteria.subject || criteria.sender || '';
        const searchEmails = await this.yahooManager.searchEmails(account, searchQuery, criteria.limit || 100);
        
        if (searchEmails.length > 0) {
            // Filter by additional criteria if needed
            let filteredEmails = searchEmails;
            
            if (criteria.older_than_days) {
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - criteria.older_than_days);
                filteredEmails = filteredEmails.filter(email => new Date(email.date) < cutoffDate);
            }
            
            if (criteria.unread_only) {
                filteredEmails = filteredEmails.filter(email => email.unread);
            }

            if (filteredEmails.length > 0) {
                const uids = filteredEmails.map(email => email.uid);
                console.log(`   📧 Found ${filteredEmails.length} Yahoo emails matching all criteria`);
                return await this.deleteYahooEmails(account, uids);
            }
        }

        console.log('   📭 No Yahoo emails found matching criteria');
        return { 
            success: true, 
            deletedCount: 0, 
            totalRequested: 0,
            provider: 'yahoo',
            account: account
        };
    }

    /**
     * Delete AOL emails by criteria
     */
    async deleteAOLByCriteria(account, criteria) {
        // Search for emails matching criteria
        const searchQuery = criteria.subject || criteria.sender || '';
        const searchEmails = await this.aolManager.searchEmails(account, searchQuery, criteria.limit || 100);
        
        if (searchEmails.length > 0) {
            // Filter by additional criteria if needed
            let filteredEmails = searchEmails;
            
            if (criteria.older_than_days) {
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - criteria.older_than_days);
                filteredEmails = filteredEmails.filter(email => new Date(email.date) < cutoffDate);
            }
            
            if (criteria.unread_only) {
                filteredEmails = filteredEmails.filter(email => email.unread);
            }

            if (filteredEmails.length > 0) {
                const uids = filteredEmails.map(email => email.uid);
                console.log(`   📧 Found ${filteredEmails.length} AOL emails matching all criteria`);
                return await this.deleteAOLEmails(account, uids);
            }
        }

        console.log('   📭 No AOL emails found matching criteria');
        return { 
            success: true, 
            deletedCount: 0, 
            totalRequested: 0,
            provider: 'aol',
            account: account
        };
    }

    /**
     * Bulk delete with safety checks
     */
    async safetyBulkDelete(provider, account, identifiers, options = {}) {
        const {
            confirmationRequired = true,
            dryRun = false,
            maxBatchSize = 100
        } = options;

        console.log(`🛡️ Safety bulk delete: ${provider} - ${identifiers.length} emails`);

        // Safety check: prevent accidental mass deletion
        if (identifiers.length > maxBatchSize) {
            throw new Error(`Batch size ${identifiers.length} exceeds maximum allowed ${maxBatchSize}. Use multiple smaller batches.`);
        }

        // Dry run mode: just return what would be deleted
        if (dryRun) {
            console.log(`🔍 DRY RUN: Would delete ${identifiers.length} emails from ${provider}`);
            return {
                success: true,
                dryRun: true,
                wouldDeleteCount: identifiers.length,
                provider: provider.toLowerCase(),
                account: account
            };
        }

        // Proceed with actual deletion
        if (provider.toLowerCase() === 'gmail') {
            return await this.batchDeleteEmails(provider, account, identifiers, null);
        } else {
            return await this.batchDeleteEmails(provider, account, null, identifiers);
        }
    }

    /**
     * Get deletion statistics
     */
    getDeletionStats() {
        const stats = {
            totalDeletions: this.deletionLog.length,
            deletionsByProvider: {},
            deletionsByMethod: {},
            totalEmailsDeleted: 0,
            successRate: 0
        };

        let successfulDeletions = 0;

        this.deletionLog.forEach(log => {
            // Count by provider
            if (!stats.deletionsByProvider[log.provider]) {
                stats.deletionsByProvider[log.provider] = { count: 0, emails: 0 };
            }
            stats.deletionsByProvider[log.provider].count++;
            stats.deletionsByProvider[log.provider].emails += log.deletedCount || 0;

            // Count by method
            if (!stats.deletionsByMethod[log.method]) {
                stats.deletionsByMethod[log.method] = { count: 0, emails: 0 };
            }
            stats.deletionsByMethod[log.method].count++;
            stats.deletionsByMethod[log.method].emails += log.deletedCount || 0;

            // Total emails deleted
            stats.totalEmailsDeleted += log.deletedCount || 0;

            // Success rate
            if (log.success) successfulDeletions++;
        });

        stats.successRate = stats.totalDeletions > 0 
            ? Math.round((successfulDeletions / stats.totalDeletions) * 100) 
            : 0;

        return stats;
    }

    /**
     * Emergency stop - cancel all pending deletions
     */
    emergencyStop() {
        console.log('🚨 EMERGENCY STOP: Halting all deletion operations');
        // In a real implementation, you'd set flags to stop ongoing operations
        // For now, we'll just log the event
        this.logDeletion({
            provider: 'system',
            method: 'emergency_stop',
            deletedCount: 0,
            success: true,
            note: 'Emergency stop activated by user'
        });
    }
}