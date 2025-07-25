// File: D:\AI\Gits\email-agent_v01\quick-aol-fix.js
// Quick fix to add AOL to your enhanced-working-api-server.js

/*
STEP 1: Add this AOL Manager class to your enhanced-working-api-server.js 
Insert this code RIGHT AFTER the Yahoo import line:
*/

import { ImapFlow } from 'imapflow';

class AOLEmailManager {
    constructor() {
        this.accounts = [
            {
                email: process.env.AOL_EMAIL,
                password: process.env.AOL_APP_PASSWORD,
                name: 'AOL Account 1'
            },
            {
                email: process.env.AOL2_EMAIL,
                password: process.env.AOL2_APP_PASSWORD,
                name: 'AOL Account 2'
            },
            {
                email: process.env.AOL3_EMAIL,
                password: process.env.AOL3_APP_PASSWORD,
                name: 'AOL Account 3'
            }
        ].filter(account => account.email && account.password);
    }

    async getAllAccountsStats() {
        const stats = [];
        for (const account of this.accounts) {
            try {
                const client = new ImapFlow({
                    host: 'imap.aol.com',
                    port: 993,
                    secure: true,
                    auth: {
                        user: account.email,
                        pass: account.password
                    }
                });
                
                await client.connect();
                
                try {
                    const status = await client.status('INBOX', { messages: true, unseen: true });
                    stats.push({
                        email: account.email,
                        totalMessages: status.messages || 0,
                        unreadMessages: status.unseen || 0,
                        provider: 'aol'
                    });
                } finally {
                    await client.logout();
                }
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

        const client = new ImapFlow({
            host: 'imap.aol.com',
            port: 993,
            secure: true,
            auth: {
                user: account.email,
                pass: account.password
            }
        });

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
        
        return messages.reverse();
    }
}

/* 
STEP 2: Add this line after yahooManager initialization:
FIND: const yahooManager = new YahooEmailManager();
ADD AFTER IT: const aolManager = new AOLEmailManager();
*/

/* 
STEP 3: Update startup logging
FIND: console.log(`📧 Yahoo: ${yahooManager.accounts.length} account(s) configured`);
ADD AFTER IT: console.log(`📧 AOL: ${aolManager.accounts.length} account(s) configured`);
*/

/* 
STEP 4: Update health check providers object
FIND: aol: 0 // Placeholder for AOL
REPLACE WITH: aol: aolManager.accounts.length
*/

/* 
STEP 5: Add AOL stats in /api/stats endpoint
FIND this section in your /api/stats endpoint (after Yahoo stats):
        } catch (error) {
            console.error('   ❌ Yahoo stats error:', error.message);
            stats.providers.yahoo = { error: error.message, status: 'error' };
        }

REPLACE WITH:
        } catch (error) {
            console.error('   ❌ Yahoo stats error:', error.message);
            stats.providers.yahoo = { error: error.message, status: 'error' };
        }

        // AOL Statistics (new)
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
*/

/* 
STEP 6: Add AOL recent emails in /api/emails/recent endpoint
FIND this section (after Yahoo recent emails):
        } catch (error) {
            console.error('   ❌ Yahoo recent emails error:', error.message);
        }

ADD AFTER IT:
        // AOL Recent Emails (new)
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
*/

/* 
STEP 7: Add AOL provider endpoint (add this before "// Start server")
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
*/

/*
STEP 8: Update final startup message
FIND: console.log('📧 Gmail ✅ | Yahoo ✅ | AOL 🔄');
REPLACE WITH: console.log('📧 Gmail ✅ | Yahoo ✅ | AOL ✅');
*/

console.log('📋 AOL Integration Instructions Generated!');
console.log('Follow the 8 steps above to add AOL to your enhanced-working-api-server.js');
console.log('After making changes, restart your server to see AOL appear in the dashboard.');