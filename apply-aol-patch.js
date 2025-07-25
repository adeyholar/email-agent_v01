// File: D:\AI\Gits\email-agent_v01\apply-aol-patch.js
// Script to directly modify enhanced-working-api-server.js and add AOL integration
// This preserves your file name and git history

import fs from 'fs';

const AOL_MANAGER_CLASS = `
// AOL Email Manager Class
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
                
                for await (let message of client.fetch(\`\${startSeq}:*\`, {
                    envelope: true,
                    flags: true
                })) {
                    messages.push({
                        uid: message.uid,
                        subject: message.envelope.subject || '(No Subject)',
                        from: message.envelope.from?.[0]?.address || 'Unknown',
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

function applyAOLPatch() {
    const fileName = 'enhanced-working-api-server.js';
    
    if (!fs.existsSync(fileName)) {
        console.error(`❌ File ${fileName} not found!`);
        return false;
    }

    console.log(`🔧 Applying AOL integration patch to ${fileName}...`);
    
    try {
        let content = fs.readFileSync(fileName, 'utf8');
        
        // Check if AOL is already integrated
        if (content.includes('AOLEmailManager')) {
            console.log('✅ AOL integration already exists in the file');
            return true;
        }

        // 1. Add AOL Manager class after Yahoo import
        const yahooImport = "import { YahooEmailManager } from './yahoo-api-integration.js';";
        if (content.includes(yahooImport)) {
            content = content.replace(yahooImport, yahooImport + AOL_MANAGER_CLASS);
            console.log('   ✅ Added AOL Manager class');
        }

        // 2. Initialize AOL manager
        const yahooInit = "const yahooManager = new YahooEmailManager();";
        if (content.includes(yahooInit)) {
            content = content.replace(yahooInit, yahooInit + "\nconst aolManager = new AOLEmailManager();");
            console.log('   ✅ Added AOL manager initialization');
        }

        // 3. Update startup logging
        const yahooLog = /console\.log\(\`📧 Yahoo: \${yahooManager\.accounts\.length} account\(s\) configured\`\);/;
        if (yahooLog.test(content)) {
            content = content.replace(yahooLog, match => 
                match + "\nconsole.log(`📧 AOL: ${aolManager.accounts.length} account(s) configured`);"
            );
            console.log('   ✅ Updated startup logging');
        }

        // 4. Update health check
        const healthCheck = "aol: 0 // Placeholder for AOL";
        if (content.includes(healthCheck)) {
            content = content.replace(healthCheck, "aol: aolManager.accounts.length");
            console.log('   ✅ Updated health check');
        }

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

        if (content.includes(yahooStatsEnd)) {
            content = content.replace(yahooStatsEnd, aolStatsSection);
            console.log('   ✅ Added AOL stats endpoint');
        }

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

        if (content.includes(yahooEmailsEnd)) {
            content = content.replace(yahooEmailsEnd, aolEmailsSection);
            console.log('   ✅ Added AOL recent emails');
        }

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

        if (content.includes(yahooSearchEnd)) {
            content = content.replace(yahooSearchEnd, aolSearchSection);
            console.log('   ✅ Added AOL search');
        }

        // 8. Add AOL provider endpoint
        const startServerMarker = "// Start server";
        const aolEndpoint = `
// AOL provider endpoint
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

        if (content.includes(startServerMarker)) {
            content = content.replace(startServerMarker, aolEndpoint);
            console.log('   ✅ Added AOL provider endpoint');
        }

        // 9. Update final message
        const oldMessage = "console.log('📧 Gmail ✅ | Yahoo ✅ | AOL 🔄');";
        const newMessage = "console.log('📧 Gmail ✅ | Yahoo ✅ | AOL ✅');";
        if (content.includes(oldMessage)) {
            content = content.replace(oldMessage, newMessage);
            console.log('   ✅ Updated startup message');
        }

        // Create backup first
        fs.writeFileSync(`${fileName}.backup`, fs.readFileSync(fileName));
        console.log(`   💾 Created backup: ${fileName}.backup`);

        // Write the modified content
        fs.writeFileSync(fileName, content);
        
        console.log('');
        console.log('🎉 AOL Integration Successfully Applied!');
        console.log('✅ File modified in place - no file name changes');
        console.log('💾 Backup created for safety');
        console.log('🔄 Restart your server to see AOL in dashboard');
        console.log('');
        console.log('Expected changes:');
        console.log('  • Total Messages: ~79,000+ (from 68,886)');
        console.log('  • Providers: 3 (Gmail + Yahoo + AOL)');
        console.log('  • AOL accounts visible in dashboard');
        
        return true;
        
    } catch (error) {
        console.error('❌ Error applying AOL patch:', error.message);
        return false;
    }
}

// Run the patch
if (applyAOLPatch()) {
    console.log('');
    console.log('🚀 Next Steps:');
    console.log('1. Stop your current server (Ctrl+C)');
    console.log('2. Restart: node enhanced-working-api-server.js');
    console.log('3. Refresh your dashboard to see AOL');
} else {
    console.log('❌ Patch failed. Check error messages above.');
}