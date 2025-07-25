// File: D:AIGitsemail-agent_v01yahoo-api-integration.js
// Yahoo IMAP API Integration - Generated automatically
// Accounts: adecisco_associate@yahoo.com, talk2pastoradeolaade@yahoo.com

import { ImapFlow } from 'imapflow';
import dotenv from 'dotenv';

dotenv.config();

const YAHOO_ACCOUNTS = [
    {
        email: 'adecisco_associate@yahoo.com',
        password: process.env.YAHOO_APP_PASSWORD,
        name: 'Yahoo Account 1',
        config: {
            host: 'imap.mail.yahoo.com',
            port: 993,
            secure: true,
            auth: {
                user: 'adecisco_associate@yahoo.com',
                pass: process.env.YAHOO_APP_PASSWORD
            }
        }
    },
    {
        email: 'talk2pastoradeolaade@yahoo.com',
        password: process.env.YAHOO2_APP_PASSWORD,
        name: 'Yahoo Account 2',
        config: {
            host: 'imap.mail.yahoo.com',
            port: 993,
            secure: true,
            auth: {
                user: 'talk2pastoradeolaade@yahoo.com',
                pass: process.env.YAHOO2_APP_PASSWORD
            }
        }
    }
];

class YahooEmailManager {
    constructor() {
        this.accounts = YAHOO_ACCOUNTS;
    }

    async getAccountStats(email) {
        const account = this.accounts.find(a => a.email === email);
        if (!account) throw new Error(`Account ${email} not found`);

        const client = new ImapFlow(account.config);
        await client.connect();
        
        try {
            const status = await client.status('INBOX', { messages: true, unseen: true });
            return {
                email: account.email,
                totalMessages: status.messages || 0,
                unreadMessages: status.unseen || 0,
                provider: 'yahoo'
            };
        } finally {
            await client.logout();
        }
    }

    async getAllAccountsStats() {
        const stats = [];
        for (const account of this.accounts) {
            try {
                const accountStats = await this.getAccountStats(account.email);
                stats.push(accountStats);
            } catch (error) {
                console.error(`Error getting stats for ${account.email}:`, error.message);
                stats.push({
                    email: account.email,
                    error: error.message,
                    provider: 'yahoo'
                });
            }
        }
        return stats;
    }

    async searchEmails(email, query, limit = 10) {
        const account = this.accounts.find(a => a.email === email);
        if (!account) throw new Error(`Account ${email} not found`);

        const client = new ImapFlow(account.config);
        await client.connect();
        
        const lock = await client.getMailboxLock('INBOX');
        const messages = [];
        
        try {
            // Search for messages containing the query
            const searchResults = await client.search({
                body: query
            });

            const fetchLimit = Math.min(limit, searchResults.length);
            
            if (fetchLimit > 0) {
                for await (let message of client.fetch(searchResults.slice(-fetchLimit), {
                    envelope: true,
                    bodyStructure: true,
                    flags: true
                })) {
                    messages.push({
                        uid: message.uid,
                        subject: message.envelope.subject || '(No Subject)',
                        from: message.envelope.from?.[0]?.address || 'Unknown',
                        to: message.envelope.to?.[0]?.address || 'Unknown',
                        date: message.envelope.date,
                        unread: !message.flags.has('\\Seen'),
                        provider: 'yahoo',
                        account: email
                    });
                }
            }
        } finally {
            lock.release();
            await client.logout();
        }
        
        return messages;
    }

    async getRecentEmails(email, limit = 20) {
        const account = this.accounts.find(a => a.email === email);
        if (!account) throw new Error(`Account ${email} not found`);

        const client = new ImapFlow(account.config);
        await client.connect();
        
        const lock = await client.getMailboxLock('INBOX');
        const messages = [];
        
        try {
            const status = await client.status('INBOX', { messages: true });
            const totalMessages = status.messages || 0;
            
            if (totalMessages > 0) {
                const startSeq = Math.max(1, totalMessages - limit + 1);
                
                for await (let message of client.fetch(`${startSeq}:*`, {
                    envelope: true,
                    flags: true
                })) {
                    messages.push({
                        uid: message.uid,
                        subject: message.envelope.subject || '(No Subject)',
                        from: message.envelope.from?.[0]?.address || 'Unknown',
                        to: message.envelope.to?.[0]?.address || 'Unknown', 
                        date: message.envelope.date,
                        unread: !message.flags.has('\\Seen'),
                        provider: 'yahoo',
                        account: email
                    });
                }
            }
        } finally {
            lock.release();
            await client.logout();
        }
        
        return messages.reverse(); // Most recent first
    }
}

// Export for use in API server
export { YahooEmailManager };

// Test function
async function testYahooIntegration() {
    const manager = new YahooEmailManager();
    
    console.log('🧪 Testing Yahoo Email Integration...');
    
    // Test all accounts stats
    const stats = await manager.getAllAccountsStats();
    console.log('📊 Account Statistics:', stats);
    
    // Test recent emails for first working account
    const workingAccount = stats.find(s => !s.error);
    if (workingAccount) {
        const recent = await manager.getRecentEmails(workingAccount.email, 5);
        console.log(`📧 Recent emails from ${workingAccount.email}:`, recent.length);
    }
}

// Uncomment to test
// testYahooIntegration().catch(console.error);
