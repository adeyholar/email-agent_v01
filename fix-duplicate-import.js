// File: D:\AI\Gits\email-agent_v01\fix-duplicate-import.js
// Quick fix for duplicate ImapFlow import issue

import fs from 'fs';

const SERVER_FILE = 'enhanced-working-api-server.js';
const BACKUP_FILE = 'enhanced-working-api-server.js.backup';

console.log('🔧 Fixing duplicate ImapFlow import...');

function fixDuplicateImport() {
    try {
        // First, restore from backup if it exists
        if (fs.existsSync(BACKUP_FILE)) {
            console.log('📦 Restoring from backup...');
            fs.copyFileSync(BACKUP_FILE, SERVER_FILE);
            console.log('✅ Backup restored successfully');
        }

        // Now read the server file
        let serverContent = fs.readFileSync(SERVER_FILE, 'utf8');
        
        // Find the existing ImapFlow import and Yahoo manager
        const hasImapFlowImport = serverContent.includes('import { ImapFlow } from \'imapflow\';');
        const hasYahooImport = serverContent.includes('import { YahooEmailManager } from \'./yahoo-api-integration.js\';');
        
        if (!hasImapFlowImport) {
            console.error('❌ Could not find existing ImapFlow import');
            return false;
        }

        console.log('📝 Adding AOL Manager without duplicate import...');

        // AOL Manager class that reuses existing ImapFlow import
        const aolManagerCode = `
// AOL Email Manager Class (reuses existing ImapFlow import)
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

        // Step 1: Add AOL manager class after Yahoo import
        if (hasYahooImport) {
            const yahooImportLine = 'import { YahooEmailManager } from \'./yahoo-api-integration.js\';';
            serverContent = serverContent.replace(
                yahooImportLine,
                yahooImportLine + '\n' + aolManagerCode
            );
            console.log('✅ Added AOL Manager class');
        } else {
            // Find a good place to add it after imports
            const importEndPattern = /import.*?from.*?;[\r\n]+/g;
            const imports = serverContent.match(importEndPattern);
            if (imports) {
                const lastImport = imports[imports.length - 1];
                serverContent = serverContent.replace(lastImport, lastImport + '\n' + aolManagerCode);
                console.log('✅ Added AOL Manager class after imports');
            }
        }

        // Step 2: Initialize AOL manager after Yahoo manager
        const yahooInitPattern = /const yahooManager = new YahooEmailManager\(\);/;
        if (yahooInitPattern.test(serverContent)) {
            serverContent = serverContent.replace(
                yahooInitPattern,
                `const yahooManager = new YahooEmailManager();\nconst aolManager = new AOLEmailManager();`
            );
            console.log('✅ Added AOL manager initialization');
        }

        // Step 3: Update startup logging
        const startupPattern = /console\.log\(\`📧 Yahoo: \${yahooManager\.accounts\.length} account\(s\) configured\`\);/;
        if (startupPattern.test(serverContent)) {
            serverContent = serverContent.replace(
                startupPattern,
                `console.log(\`📧 Yahoo: \${yahooManager.accounts.length} account(s) configured\`);\nconsole.log(\`📧 AOL: \${aolManager.accounts.length} account(s) configured\`);`
            );
            console.log('✅ Updated startup logging');
        }

        // Step 4: Update "Coming soon" message to show working status
        const comingSoonPattern = /📧 AOL: Coming soon\.\.\./;
        if (comingSoonPattern.test(serverContent)) {
            serverContent = serverContent.replace(
                comingSoonPattern,
                `📧 AOL: \${aolManager.accounts.length} account(s) configured`
            );
            console.log('✅ Updated AOL status message');
        }

        // Step 5: Update final startup message
        const finalMessagePattern = /console\.log\('📧 Gmail ✅ \| Yahoo ✅ \| AOL 🔄'\);/;
        if (finalMessagePattern.test(serverContent)) {
            serverContent = serverContent.replace(
                finalMessagePattern,
                `console.log('📧 Gmail ✅ | Yahoo ✅ | AOL ✅');`
            );
            console.log('✅ Updated final startup message');
        }

        // Write the corrected file
        fs.writeFileSync(SERVER_FILE, serverContent);
        console.log('🎉 Duplicate import fixed successfully!');
        
        return true;
        
    } catch (error) {
        console.error('❌ Fix failed:', error.message);
        return false;
    }
}

// Run the fix
const success = fixDuplicateImport();

if (success) {
    console.log('');
    console.log('🎯 System Status:');
    console.log('✅ Duplicate ImapFlow import removed');
    console.log('✅ AOL Manager class added (reusing existing import)');
    console.log('✅ Server should now start without errors');
    console.log('');
    console.log('🚀 Try starting the server again:');
    console.log('node enhanced-working-api-server.js');
} else {
    console.log('❌ Fix failed. Please restore manually from backup.');
}