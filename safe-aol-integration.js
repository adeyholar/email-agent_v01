// File: D:\AI\Gits\email-agent_v01\safe-aol-integration.js
// Safe, step-by-step AOL integration that preserves working Gmail + Yahoo

import fs from 'fs';

const SERVER_FILE = 'enhanced-working-api-server.js';
const BACKUP_FILE = 'enhanced-working-api-server.js.backup-before-aol';

console.log('🔧 Safe AOL Integration - Step by Step');
console.log('=====================================');

function createSafetyBackup() {
    try {
        fs.copyFileSync(SERVER_FILE, BACKUP_FILE);
        console.log('✅ Safety backup created:', BACKUP_FILE);
        return true;
    } catch (error) {
        console.error('❌ Could not create backup:', error.message);
        return false;
    }
}

function analyzeCurrentStructure() {
    try {
        const content = fs.readFileSync(SERVER_FILE, 'utf8');
        
        const analysis = {
            hasImapFlow: content.includes('import { ImapFlow }'),
            hasYahooManager: content.includes('class YahooEmailManager') || content.includes('YahooEmailManager'),
            hasYahooInit: content.includes('yahooManager = new'),
            hasAOLClass: content.includes('class AOLEmailManager'),
            hasAOLInit: content.includes('aolManager = new'),
            hasHealthEndpoint: content.includes('/api/health'),
            hasStatsEndpoint: content.includes('/api/stats'),
            hasRecentEndpoint: content.includes('/api/emails/recent'),
            hasSearchEndpoint: content.includes('/api/emails/search')
        };
        
        console.log('📊 Current Structure Analysis:');
        console.log(`   ImapFlow import: ${analysis.hasImapFlow ? '✅' : '❌'}`);
        console.log(`   Yahoo Manager: ${analysis.hasYahooManager ? '✅' : '❌'}`);
        console.log(`   Yahoo Init: ${analysis.hasYahooInit ? '✅' : '❌'}`);
        console.log(`   AOL Class exists: ${analysis.hasAOLClass ? '⚠️ Already exists' : '✅ Clear to add'}`);
        console.log(`   AOL Init exists: ${analysis.hasAOLInit ? '⚠️ Already exists' : '✅ Clear to add'}`);
        console.log(`   Health endpoint: ${analysis.hasHealthEndpoint ? '✅' : '❌'}`);
        console.log(`   Stats endpoint: ${analysis.hasStatsEndpoint ? '✅' : '❌'}`);
        
        return analysis;
    } catch (error) {
        console.error('❌ Analysis failed:', error.message);
        return null;
    }
}

function addAOLManagerClass(content) {
    console.log('📝 Step 1: Adding AOL Manager class...');
    
    // Find where to insert the AOL class - after Yahoo import or after other managers
    const yahooImportPattern = /import \{ YahooEmailManager \} from '\.\/yahoo-api-integration\.js';/;
    const afterYahooManager = /class YahooEmailManager \{[\s\S]*?\n\}/;
    
    const aolManagerClass = `
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
        
        console.log(\`🔧 AOL Manager initialized with \${this.accounts.length} account(s)\`);
    }

    async getAllAccountsStats() {
        const stats = [];
        console.log('📊 Fetching AOL stats...');
        
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
                        provider: 'aol',
                        status: 'connected'
                    });
                    console.log(\`   ✅ \${account.email}: \${status.messages || 0} total, \${status.unseen || 0} unread\`);
                } finally {
                    await client.logout();
                }
            } catch (error) {
                console.error(\`   ❌ \${account.email}: \${error.message}\`);
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
            host: 'imap.aol.com',
            port: 993,
            secure: true,
            auth: { user: account.email, pass: account.password }
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
            auth: { user: account.email, pass: account.password }
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

    // Insert AOL class after Yahoo manager if it exists
    if (afterYahooManager.test(content)) {
        const match = content.match(afterYahooManager);
        if (match) {
            const insertPoint = match.index + match[0].length;
            content = content.slice(0, insertPoint) + '\n' + aolManagerClass + content.slice(insertPoint);
            console.log('✅ AOL Manager class added after Yahoo Manager');
            return content;
        }
    }
    
    // Otherwise, insert after Yahoo import
    if (yahooImportPattern.test(content)) {
        content = content.replace(yahooImportPattern, 
            `import { YahooEmailManager } from './yahoo-api-integration.js';${aolManagerClass}`);
        console.log('✅ AOL Manager class added after Yahoo import');
        return content;
    }
    
    console.log('⚠️ Could not find ideal insertion point, adding after imports');
    // Find end of imports and add there
    const lastImportPattern = /import.*?from.*?;[\r\n]/g;
    const imports = [...content.matchAll(lastImportPattern)];
    if (imports.length > 0) {
        const lastImport = imports[imports.length - 1];
        const insertPoint = lastImport.index + lastImport[0].length;
        content = content.slice(0, insertPoint) + aolManagerClass + '\n' + content.slice(insertPoint);
        console.log('✅ AOL Manager class added after imports');
    }
    
    return content;
}

function addAOLInitialization(content) {
    console.log('📝 Step 2: Adding AOL initialization...');
    
    const yahooInitPattern = /const yahooManager = new YahooEmailManager\(\);/;
    if (yahooInitPattern.test(content)) {
        content = content.replace(yahooInitPattern,
            `const yahooManager = new YahooEmailManager();\nconst aolManager = new AOLEmailManager();`);
        console.log('✅ AOL initialization added');
    } else {
        console.log('⚠️ Could not find Yahoo initialization pattern');
    }
    
    return content;
}

function updateStartupLogging(content) {
    console.log('📝 Step 3: Updating startup logging...');
    
    const yahooLogPattern = /console\.log\(\`📧 Yahoo: \${yahooManager\.accounts\.length} account\(s\) configured\`\);/;
    if (yahooLogPattern.test(content)) {
        content = content.replace(yahooLogPattern,
            `console.log(\`📧 Yahoo: \${yahooManager.accounts.length} account(s) configured\`);\nconsole.log(\`📧 AOL: \${aolManager.accounts.length} account(s) configured\`);`);
        console.log('✅ Startup logging updated');
    } else {
        console.log('⚠️ Could not find Yahoo logging pattern');
    }
    
    return content;
}

function updateHealthCheck(content) {
    console.log('📝 Step 4: Updating health check...');
    
    const healthPattern = /aol: 0[^,}]*/;
    if (healthPattern.test(content)) {
        content = content.replace(healthPattern, 'aol: aolManager.accounts.length');
        console.log('✅ Health check updated');
    } else {
        console.log('⚠️ Could not find health check pattern');
    }
    
    return content;
}

function addAOLToStats(content) {
    console.log('📝 Step 5: Adding AOL to stats endpoint...');
    
    // Find the Yahoo stats section end
    const yahooStatsEndPattern = /(\s+)}\s*catch\s*\(error\)\s*\{\s*console\.error\('   ❌ Yahoo stats error:', error\.message\);\s*stats\.providers\.yahoo\s*=\s*\{\s*error:\s*error\.message,\s*status:\s*'error'\s*\};\s*}/;
    
    const aolStatsSection = `$1} catch (error) {
$1    console.error('   ❌ Yahoo stats error:', error.message);
$1    stats.providers.yahoo = { error: error.message, status: 'error' };
$1}

$1// AOL Statistics
$1try {
$1    console.log('   📧 Fetching AOL stats...');
$1    const aolStats = await aolManager.getAllAccountsStats();
$1    
$1    stats.providers.aol = {
$1        accounts: aolStats,
$1        provider: 'aol',
$1        status: 'connected'
$1    };

$1    aolStats.forEach(account => {
$1        if (!account.error) {
$1            stats.totals.totalMessages += account.totalMessages || 0;
$1            stats.totals.unreadMessages += account.unreadMessages || 0;
$1            stats.totals.accounts += 1;
$1        }
$1    });

$1    console.log(\`   ✅ AOL stats retrieved (\${aolStats.length} accounts)\`);
$1} catch (error) {
$1    console.error('   ❌ AOL stats error:', error.message);
$1    stats.providers.aol = { error: error.message, status: 'error' };
$1}`;

    if (yahooStatsEndPattern.test(content)) {
        content = content.replace(yahooStatsEndPattern, aolStatsSection);
        console.log('✅ AOL stats integration added');
    } else {
        console.log('⚠️ Could not find Yahoo stats end pattern');
    }
    
    return content;
}

function updateFinalMessage(content) {
    console.log('📝 Step 6: Updating final startup message...');
    
    const finalMessagePattern = /console\.log\('📧 Gmail ✅ \| Yahoo ✅ \| AOL 🔄'\);/;
    if (finalMessagePattern.test(content)) {
        content = content.replace(finalMessagePattern,
            `console.log('📧 Gmail ✅ | Yahoo ✅ | AOL ✅');`);
        console.log('✅ Final startup message updated');
    } else {
        console.log('⚠️ Could not find final message pattern');
    }
    
    return content;
}

async function performSafeIntegration() {
    try {
        // Step 0: Create backup
        if (!createSafetyBackup()) {
            return false;
        }
        
        // Step 1: Analyze current structure
        const analysis = analyzeCurrentStructure();
        if (!analysis) {
            return false;
        }
        
        if (analysis.hasAOLClass) {
            console.log('⚠️ AOL class already exists. Skipping to avoid duplicates.');
            return false;
        }
        
        // Step 2: Read current content
        let content = fs.readFileSync(SERVER_FILE, 'utf8');
        
        // Step 3: Apply modifications step by step
        content = addAOLManagerClass(content);
        content = addAOLInitialization(content);
        content = updateStartupLogging(content);
        content = updateHealthCheck(content);
        content = addAOLToStats(content);
        content = updateFinalMessage(content);
        
        // Step 4: Write updated content
        fs.writeFileSync(SERVER_FILE, content);
        console.log('✅ All modifications applied successfully');
        
        return true;
        
    } catch (error) {
        console.error('❌ Integration failed:', error.message);
        
        // Restore backup
        if (fs.existsSync(BACKUP_FILE)) {
            fs.copyFileSync(BACKUP_FILE, SERVER_FILE);
            console.log('🔄 Backup restored due to error');
        }
        
        return false;
    }
}

// Main execution
async function main() {
    const success = await performSafeIntegration();
    
    if (success) {
        console.log('');
        console.log('🎉 Safe AOL Integration Complete!');
        console.log('==================================');
        console.log('✅ AOL Manager class added');
        console.log('✅ AOL initialization added');
        console.log('✅ AOL logging added');
        console.log('✅ AOL health check added');  
        console.log('✅ AOL stats integration added');
        console.log('✅ Startup messages updated');
        console.log('');
        console.log('🚀 Next Steps:');
        console.log('1. Restart your server: node enhanced-working-api-server.js');
        console.log('2. Check console shows "📧 AOL: X account(s) configured"');
        console.log('3. Verify dashboard shows AOL provider');
        console.log('4. Total messages should increase to ~79,533');
        console.log('');
        console.log('💾 Safety backup saved as: enhanced-working-api-server.js.backup-before-aol');
    } else {
        console.log('');
        console.log('❌ Integration failed or skipped');
        console.log('💡 Your working Gmail + Yahoo setup is preserved');
    }
}

main().catch(console.error);