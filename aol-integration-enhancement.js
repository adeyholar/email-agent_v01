// File: D:\AI\Gits\email-agent_v01\aol-integration-enhancement.js
// AOL IMAP Integration for Enhanced API Server
// Add this code to your enhanced-working-api-server.js

import { ImapFlow } from 'imapflow';

// AOL Email Manager Class (similar to Yahoo)
class AOLEmailManager {
    constructor() {
        this.accounts = [
            {
                email: process.env.AOL_EMAIL,
                password: process.env.AOL_APP_PASSWORD,
                name: 'AOL Account 1',
                config: {
                    host: 'imap.aol.com',
                    port: 993,
                    secure: true,
                    auth: {
                        user: process.env.AOL_EMAIL,
                        pass: process.env.AOL_APP_PASSWORD
                    }
                }
            },
            {
                email: process.env.AOL2_EMAIL,
                password: process.env.AOL2_APP_PASSWORD,
                name: 'AOL Account 2',
                config: {
                    host: 'imap.aol.com',
                    port: 993,
                    secure: true,
                    auth: {
                        user: process.env.AOL2_EMAIL,
                        pass: process.env.AOL2_APP_PASSWORD
                    }
                }
            },
            {
                email: process.env.AOL3_EMAIL,
                password: process.env.AOL3_APP_PASSWORD,
                name: 'AOL Account 3',
                config: {
                    host: 'imap.aol.com',
                    port: 993,
                    secure: true,
                    auth: {
                        user: process.env.AOL3_EMAIL,
                        pass: process.env.AOL3_APP_PASSWORD
                    }
                }
            }
        ].filter(account => account.email && account.password);
    }

    async getAccountStats(email) {
        const account = this.accounts.find(a => a.email === email);
        if (!account) throw new Error(`AOL account ${email} not found`);

        const client = new ImapFlow(account.config);
        await client.connect();
        
        try {
            const status = await client.status('INBOX', { messages: true, unseen: true });
            return {
                email: account.email,
                totalMessages: status.messages || 0,
                unreadMessages: status.unseen || 0,
                provider: 'aol'
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
                console.error(`Error getting AOL stats for ${account.email}:`, error.message);
                stats.push({
                    email: account.email,
                    error: error.message,
                    provider: 'aol'
                });
            }
        }
        return stats;
    }

    async getRecentEmails(email, limit = 20) {
        const account = this.accounts.find(a => a.email === email);
        if (!account) throw new Error(`AOL account ${email} not found`);

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
                        provider: 'aol',
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

    async searchEmails(email, query, limit = 10) {
        const account = this.accounts.find(a => a.email === email);
        if (!account) throw new Error(`AOL account ${email} not found`);

        const client = new ImapFlow(account.config);
        await client.connect();
        
        const lock = await client.getMailboxLock('INBOX');
        const messages = [];
        
        try {
            const searchResults = await client.search({
                body: query
            });

            const fetchLimit = Math.min(limit, searchResults.length);
            
            if (fetchLimit > 0) {
                for await (let message of client.fetch(searchResults.slice(-fetchLimit), {
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
                        provider: 'aol',
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
}

// Export for use in enhanced server
export { AOLEmailManager };

// Code to add to enhanced-working-api-server.js:

/*
// 1. Add import at top:
import { AOLEmailManager } from './aol-integration-enhancement.js';

// 2. Add to initialization section:
const aolManager = new AOLEmailManager();
console.log(`📧 AOL: ${aolManager.accounts.length} account(s) configured`);

// 3. Add AOL stats to /api/stats endpoint (inside try block after Yahoo):
        // AOL Statistics (add after Yahoo)
        try {
            console.log('   📧 Fetching AOL stats...');
            const aolStats = await aolManager.getAllAccountsStats();
            
            stats.providers.aol = {
                accounts: aolStats,
                provider: 'aol',
                status: 'connected'
            };

            aolStats.forEach(account => {
                if (!account.error) {
                    stats.totals.totalMessages += account.totalMessages || 0;
                    stats.totals.unreadMessages += account.unreadMessages || 0;
                    stats.totals.accounts += 1;
                }
            });

            console.log(`   ✅ AOL stats retrieved (${aolStats.length} accounts)`);
        } catch (error) {
            console.error('   ❌ AOL stats error:', error.message);
            stats.providers.aol = { error: error.message, status: 'error' };
        }

// 4. Add AOL recent emails to /api/emails/recent (after Yahoo section):
        // AOL Recent Emails (add after Yahoo)
        try {
            console.log('   📧 Fetching AOL recent emails...');
            
            for (const account of aolManager.accounts) {
                try {
                    const aolEmails = await aolManager.getRecentEmails(account.email, 5);
                    allEmails.push(...aolEmails);
                    console.log(`   ✅ Fetched ${aolEmails.length} emails from ${account.email}`);
                } catch (error) {
                    console.error(`   ⚠️ Error fetching emails from ${account.email}:`, error.message);
                }
            }
        } catch (error) {
            console.error('   ❌ AOL recent emails error:', error.message);
        }

// 5. Add AOL search to /api/emails/search (after Yahoo section):
        // AOL Search (add after Yahoo)
        try {
            console.log('   🔍 Searching AOL...');
            
            for (const account of aolManager.accounts) {
                try {
                    const aolResults = await aolManager.searchEmails(account.email, query, 5);
                    allResults.push(...aolResults);
                    console.log(`   ✅ Found ${aolResults.length} results in ${account.email}`);
                } catch (error) {
                    console.error(`   ⚠️ Error searching ${account.email}:`, error.message);
                }
            }
        } catch (error) {
            console.error('   ❌ AOL search error:', error.message);
        }

// 6. Add AOL provider endpoint:
app.get('/api/providers/aol', async (req, res) => {
    try {
        const stats = await aolManager.getAllAccountsStats();
        res.json({
            success: true,
            provider: 'aol',
            accounts: stats
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 7. Update health check providers count:
        providers: {
            gmail: !!process.env.GMAIL_REFRESH_TOKEN,
            yahoo: yahooManager.accounts.length,
            aol: aolManager.accounts.length  // Updated from 0
        }

// 8. Update startup message:
console.log('📧 Gmail ✅ | Yahoo ✅ | AOL ✅');  // Updated from AOL 🔄
*/