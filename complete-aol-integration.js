// File: D:\AI\Gits\email-agent_v01\complete-aol-integration.js
// Enhanced AOL integration script that adds AOL to your enhanced-working-api-server.js

import fs from 'fs';
import path from 'path';

console.log('🚀 Starting Enhanced AOL Integration...');

const SERVER_FILE = 'enhanced-working-api-server.js';
const BACKUP_FILE = 'enhanced-working-api-server.js.backup';

// Create backup
function createBackup() {
    try {
        if (fs.existsSync(SERVER_FILE)) {
            fs.copyFileSync(SERVER_FILE, BACKUP_FILE);
            console.log('✅ Backup created:', BACKUP_FILE);
            return true;
        }
    } catch (error) {
        console.error('❌ Backup failed:', error.message);
        return false;
    }
}

// AOL Manager Class with modern implementation
const aolManagerCode = `
// AOL Email Manager Class with IMAP Integration
import { ImapFlow } from 'imapflow';

class AOLEmailManager {
    constructor() {
        this.accounts = [
            {
                email: process.env.AOL_EMAIL,
                password: process.env.AOL_APP_PASSWORD,
                name: 'AOL Account 1',
                host: 'imap.aol.com',
                port: 993,
                secure: true
            },
            {
                email: process.env.AOL2_EMAIL,
                password: process.env.AOL2_APP_PASSWORD,
                name: 'AOL Account 2', 
                host: 'imap.aol.com',
                port: 993,
                secure: true
            },
            {
                email: process.env.AOL3_EMAIL,
                password: process.env.AOL3_APP_PASSWORD,
                name: 'AOL Account 3',
                host: 'imap.aol.com',
                port: 993,
                secure: true
            }
        ].filter(account => account.email && account.password);
        
        console.log(\`🔧 AOL Manager initialized with \${this.accounts.length} account(s)\`);
    }

    async getAllAccountsStats() {
        const stats = [];
        console.log('📊 Fetching AOL stats for all accounts...');
        
        for (const account of this.accounts) {
            try {
                console.log(\`   📧 Connecting to \${account.email}...\`);
                
                const client = new ImapFlow({
                    host: account.host,
                    port: account.port,
                    secure: account.secure,
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
                        provider: 'aol',
                        status: 'connected'
                    });
                    
                    console.log(\`   ✅ \${account.email}: \${status.messages || 0} total, \${status.unseen || 0} unread\`);
                } finally {
                    await client.logout();
                }
            } catch (error) {
                console.error(\`   ❌ Error connecting to \${account.email}:\`, error.message);
                stats.push({
                    email: account.email,
                    error: error.message,
                    provider: 'aol',
                    status: 'error'
                });
            }
        }
        
        return stats;
    }

    async getRecentEmails(email, limit = 20) {
        const account = this.accounts.find(a => a.email === email);
        if (!account) throw new Error(\`AOL account \${email} not found\`);

        const client = new ImapFlow({
            host: account.host,
            port: account.port,
            secure: account.secure,
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

        const client = new ImapFlow({
            host: account.host,
            port: account.port,
            secure: account.secure,
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

// Integration function
function integrateAOL() {
    try {
        console.log('📖 Reading enhanced-working-api-server.js...');
        let serverContent = fs.readFileSync(SERVER_FILE, 'utf8');
        
        // 1. Add AOL manager import after Yahoo import
        const yahooImportPattern = /import \{ YahooEmailManager \} from '\.\/yahoo-api-integration\.js';/;
        if (yahooImportPattern.test(serverContent)) {
            serverContent = serverContent.replace(
                yahooImportPattern,
                `import { YahooEmailManager } from './yahoo-api-integration.js';\n${aolManagerCode}`
            );
            console.log('✅ Step 1: Added AOL Manager class');
        } else {
            console.log('⚠️  Yahoo import not found, adding AOL class at the beginning');
            serverContent = aolManagerCode + '\n\n' + serverContent;
        }
        
        // 2. Initialize AOL manager
        const yahooInitPattern = /const yahooManager = new YahooEmailManager\(\);/;
        if (yahooInitPattern.test(serverContent)) {
            serverContent = serverContent.replace(
                yahooInitPattern,
                `const yahooManager = new YahooEmailManager();\nconst aolManager = new AOLEmailManager();`
            );
            console.log('✅ Step 2: Added AOL manager initialization');
        }
        
        // 3. Update startup logging
        const startupPattern = /console\.log\(`📧 Yahoo: \${yahooManager\.accounts\.length} account\(s\) configured`\);/;
        if (startupPattern.test(serverContent)) {
            serverContent = serverContent.replace(
                startupPattern,
                `console.log(\`📧 Yahoo: \${yahooManager.accounts.length} account(s) configured\`);\nconsole.log(\`📧 AOL: \${aolManager.accounts.length} account(s) configured\`);`
            );
            console.log('✅ Step 3: Updated startup logging');
        }
        
        // 4. Update health check endpoint
        const healthPattern = /aol: 0 \/\/ Placeholder for AOL/;
        if (healthPattern.test(serverContent)) {
            serverContent = serverContent.replace(
                healthPattern,
                `aol: aolManager.accounts.length`
            );
            console.log('✅ Step 4: Updated health check');
        }
        
        // 5. Add AOL stats to /api/stats endpoint
        const yahooStatsEndPattern = /} catch \(error\) \{\s*console\.error\('   ❌ Yahoo stats error:', error\.message\);\s*stats\.providers\.yahoo = \{ error: error\.message, status: 'error' \};\s*}/;
        
        const aolStatsSection = `} catch (error) {
            console.error('   ❌ Yahoo stats error:', error.message);
            stats.providers.yahoo = { error: error.message, status: 'error' };
        }

        // AOL Statistics
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
        
        if (yahooStatsEndPattern.test(serverContent)) {
            serverContent = serverContent.replace(yahooStatsEndPattern, aolStatsSection);
            console.log('✅ Step 5: Added AOL stats integration');
        }
        
        // 6. Add AOL recent emails
        const yahooEmailsEndPattern = /} catch \(error\) \{\s*console\.error\('   ❌ Yahoo recent emails error:', error\.message\);\s*}/;
        
        const aolEmailsSection = `} catch (error) {
            console.error('   ❌ Yahoo recent emails error:', error.message);
        }

        // AOL Recent Emails
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
        
        if (yahooEmailsEndPattern.test(serverContent)) {
            serverContent = serverContent.replace(yahooEmailsEndPattern, aolEmailsSection);
            console.log('✅ Step 6: Added AOL recent emails integration');
        }
        
        // 7. Add AOL search
        const yahooSearchEndPattern = /} catch \(error\) \{\s*console\.error\('   ❌ Yahoo search error:', error\.message\);\s*}/;
        
        const aolSearchSection = `} catch (error) {
            console.error('   ❌ Yahoo search error:', error.message);
        }

        // AOL Search
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
        
        if (yahooSearchEndPattern.test(serverContent)) {
            serverContent = serverContent.replace(yahooSearchEndPattern, aolSearchSection);
            console.log('✅ Step 7: Added AOL search integration');
        }
        
        // 8. Update final startup message
        const finalMessagePattern = /console\.log\('📧 Gmail ✅ \| Yahoo ✅ \| AOL 🔄'\);/;
        if (finalMessagePattern.test(serverContent)) {
            serverContent = serverContent.replace(
                finalMessagePattern,
                `console.log('📧 Gmail ✅ | Yahoo ✅ | AOL ✅');`
            );
            console.log('✅ Step 8: Updated final startup message');
        }
        
        // 9. Add AOL provider endpoint before server start
        const startServerPattern = /(\/\/ Start server\s*app\.listen)/;
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

// Start server
app.listen`;
        
        if (startServerPattern.test(serverContent)) {
            serverContent = serverContent.replace(startServerPattern, aolEndpointSection);
            console.log('✅ Step 9: Added AOL provider endpoint');
        }
        
        // Write the updated file
        fs.writeFileSync(SERVER_FILE, serverContent);
        console.log('🎉 AOL integration completed successfully!');
        
        return true;
        
    } catch (error) {
        console.error('❌ Integration failed:', error.message);
        
        // Restore backup if it exists
        if (fs.existsSync(BACKUP_FILE)) {
            try {
                fs.copyFileSync(BACKUP_FILE, SERVER_FILE);
                console.log('🔄 Backup restored due to error');
            } catch (restoreError) {
                console.error('❌ Could not restore backup:', restoreError.message);
            }
        }
        
        return false;
    }
}

// Main execution
async function main() {
    console.log('🔧 Enhanced AOL Integration Script');
    console.log('==================================');
    
    // Check if server file exists
    if (!fs.existsSync(SERVER_FILE)) {
        console.error(`❌ ${SERVER_FILE} not found in current directory`);
        process.exit(1);
    }
    
    // Create backup
    if (!createBackup()) {
        console.error('❌ Could not create backup. Aborting.');
        process.exit(1);
    }
    
    // Perform integration
    const success = integrateAOL();
    
    if (success) {
        console.log('');
        console.log('🎯 Next Steps:');
        console.log('1. Restart your server: Ctrl+C and run `node enhanced-working-api-server.js`');
        console.log('2. Verify AOL appears in dashboard');
        console.log('3. Check total messages should increase to ~79,533');
        console.log('');
        console.log('✅ Integration complete! AOL should now be fully functional.');
    } else {
        console.log('❌ Integration failed. Please check the errors above.');
        process.exit(1);
    }
}

// Run the script
main().catch(console.error);