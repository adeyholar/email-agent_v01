// File: D:\AI\Gits\email-agent_v01\add-aol-integration.js
// This script adds AOL integration to your enhanced-working-api-server.js

import fs from 'fs';

const aolManagerCode = `
// AOL Email Manager Class
import { ImapFlow } from 'imapflow';

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

    async getAllAccountsStats() {
        const stats = [];
        for (const account of this.accounts) {
            try {
                const client = new ImapFlow(account.config);
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
                console.error(\`Error getting AOL stats for \${account.email}:\`, error.message);
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
        if (!account) throw new Error(\`AOL account \${email} not found\`);

        const client = new ImapFlow(account.config);
        await client.connect();
        
        const lock = await client.getMailboxLock('INBOX');
        const messages = [];
        
        try {
            const status = await client.status('INBOX', { messages: true });
            const totalMessages = status.messages || 0;
            
            if (totalMessages > 0) {
                const startSeq = Math.max(1, totalMessages - limit + 1);
                
                for await (let message of client.fetch(\`\${startSeq}:*\`, {
                    envelope: true,
                    flags: true
                })) {
                    messages.push({
                        uid: message.uid,
                        subject: message.envelope.subject || '(No Subject)',
                        from: message.envelope.from?.[0]?.address || 'Unknown',
                        to: message.envelope.to?.[0]?.address || 'Unknown', 
                        date: message.envelope.date,
                        unread: !message.flags.has('\\\\Seen'),
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

    async searchEmails(email, query, limit = 10) {
        const account = this.accounts.find(a => a.email === email);
        if (!account) throw new Error(\`AOL account \${email} not found\`);

        const client = new ImapFlow(account.config);
        await client.connect();
        
        const lock = await client.getMailboxLock('INBOX');
        const messages = [];
        
        try {
            const searchResults = await client.search({ body: query });
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
                        unread: !message.flags.has('\\\\Seen'),
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
}`;

function addAOLIntegration() {
    try {
        // Read the current enhanced server file
        let serverContent = fs.readFileSync('enhanced-working-api-server.js', 'utf8');
        
        // 1. Add AOL manager class after Yahoo import
        const importSection = "import { YahooEmailManager } from './yahoo-api-integration.js';";
        const aolImport = `${importSection}\n${aolManagerCode}`;
        serverContent = serverContent.replace(importSection, aolImport);
        
        // 2. Initialize AOL manager
        const yahooInit = "const yahooManager = new YahooEmailManager();";
        const aolInit = `${yahooInit}\nconst aolManager = new AOLEmailManager();`;
        serverContent = serverContent.replace(yahooInit, aolInit);
        
        // 3. Update startup logging
        const startupLog = `console.log(\`📧 Yahoo: \${yahooManager.accounts.length} account(s) configured\`);`;
        const aolStartupLog = `${startupLog}\nconsole.log(\`📧 AOL: \${aolManager.accounts.length} account(s) configured\`);`;
        serverContent = serverContent.replace(startupLog, aolStartupLog);
        
        // 4. Update health check
        const healthCheck = `            aol: 0 // Placeholder for AOL`;
        const aolHealthCheck = `            aol: aolManager.accounts.length`;
        serverContent = serverContent.replace(healthCheck, aolHealthCheck);
        
        // 5. Add AOL stats to /api/stats endpoint
        const yahooStatsEnd = `        } catch (error) {
            console.error('   ❌ Yahoo stats error:', error.message);
            stats.providers.yahoo = { error: error.message, status: 'error' };
        }`;
        
        const aolStatsSection = `        } catch (error) {
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

            console.log(\`   ✅ AOL stats retrieved (\${aolStats.length} accounts)\`);
        } catch (error) {
            console.error('   ❌ AOL stats error:', error.message);
            stats.providers.aol = { error: error.message, status: 'error' };
        }`;
        
        serverContent = serverContent.replace(yahooStatsEnd, aolStatsSection);
        
        // 6. Add AOL recent emails
        const yahooEmailsEnd = `        } catch (error) {
            console.error('   ❌ Yahoo recent emails error:', error.message);
        }`;
        
        const aolEmailsSection = `        } catch (error) {
            console.error('   ❌ Yahoo recent emails error:', error.message);
        }

        // AOL Recent Emails (new)
        try {
            console.log('   📧 Fetching AOL recent emails...');
            
            for (const account of aolManager.accounts) {
                try {
                    const aolEmails = await aolManager.getRecentEmails(account.email, 5);
                    allEmails.push(...aolEmails);
                    console.log(\`   ✅ Fetched \${aolEmails.length} emails from \${account.email}\`);
                } catch (error) {
                    console.error(\`   ⚠️ Error fetching emails from \${account.email}:\`, error.message);
                }
            }
        } catch (error) {
            console.error('   ❌ AOL recent emails error:', error.message);
        }`;
        
        serverContent = serverContent.replace(yahooEmailsEnd, aolEmailsSection);
        
        // 7. Add AOL search
        const yahooSearchEnd = `        } catch (error) {
            console.error('   ❌ Yahoo search error:', error.message);
        }`;
        
        const aolSearchSection = `        } catch (error) {
            console.error('   ❌ Yahoo search error:', error.message);
        }

        // AOL Search (new)
        try {
            console.log('   🔍 Searching AOL...');
            
            for (const account of aolManager.accounts) {
                try {
                    const aolResults = await aolManager.searchEmails(account.email, query, 5);
                    allResults.push(...aolResults);
                    console.log(\`   ✅ Found \${aolResults.length} results in \${account.email}\`);
                } catch (error) {
                    console.error(\`   ⚠️ Error searching \${account.email}:\`, error.message);
                }
            }
        } catch (error) {
            console.error('   ❌ AOL search error:', error.message);
        }`;
        
        serverContent = serverContent.replace(yahooSearchEnd, aolSearchSection);
        
        // 8. Add AOL provider endpoint before the start server section
        const startServerSection = `// Start server`;
        const aolEndpointSection = `// AOL provider endpoint
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

// Start server`;
        
        serverContent = serverContent.replace(startServerSection, aolEndpointSection);
        
        // 9. Update final startup message
        const finalMessage = `console.log('📧 Gmail ✅ | Yahoo ✅ | AOL 🔄');`;
        const updatedMessage = `console.log('📧 Gmail ✅ | Yahoo ✅ | AOL ✅');`;
        serverContent = serverContent.replace(finalMessage, updatedMessage);
        
        // Write the updated file
        fs.writeFileSync('enhanced-working-api-server-with-aol.js', serverContent);
        
        console.log('✅ AOL integration added successfully!');
        console.log('📁 Created: enhanced-working-api-server-with-aol.js');
        console.log('🔄 Replace your current server with this new version');
        
        return true;
    } catch (error) {
        console.error('❌ Error adding AOL integration:', error.message);
        return false;
    }
}

// Run the integration
addAOLIntegration();