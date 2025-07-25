// File: D:\AI\Gits\email-agent_v01\yahoo-imap-setup-fixed.js
// Yahoo IMAP Integration Setup with App Passwords - FIXED VERSION
// Based on correct ImapFlow API usage

import { ImapFlow } from 'imapflow';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const YAHOO_IMAP_CONFIG = {
    host: 'imap.mail.yahoo.com',
    port: 993,
    secure: true,
    auth: {
        user: '', // Will be set per account
        pass: ''  // Will be set per account
    },
    logger: false
};

const YAHOO_ACCOUNTS = [
    {
        email: process.env.YAHOO_EMAIL || 'adecisco_associate@yahoo.com',
        password: process.env.YAHOO_APP_PASSWORD,
        name: 'Yahoo Account 1'
    },
    {
        email: process.env.YAHOO_EMAIL2 || 'talk2pastoradeolaade@yahoo.com', 
        password: process.env.YAHOO2_APP_PASSWORD,
        name: 'Yahoo Account 2'
    }
];

async function testYahooConnection(account) {
    console.log(`\n🔍 Testing ${account.name} (${account.email})...`);
    
    if (!account.password) {
        console.log(`❌ ${account.name}: No app password configured`);
        console.log(`   Please set YAHOO_APP_PASSWORD or YAHOO2_APP_PASSWORD in .env`);
        return false;
    }

    let client;
    try {
        const config = {
            ...YAHOO_IMAP_CONFIG,
            auth: {
                user: account.email,
                pass: account.password
            }
        };

        console.log(`   📡 Connecting to ${config.host}:${config.port}...`);
        client = new ImapFlow(config);
        
        // Connect and authenticate
        await client.connect();
        console.log(`   ✅ Connected and authenticated successfully`);

        // Get mailbox info using correct API
        const lock = await client.getMailboxLock('INBOX');
        let totalMessages = 0;
        let unreadMessages = 0;
        
        try {
            // Get mailbox status
            const status = await client.status('INBOX', { messages: true, unseen: true });
            totalMessages = status.messages || 0;
            unreadMessages = status.unseen || 0;
            
            console.log(`   📊 INBOX Status:`);
            console.log(`      📬 Total messages: ${totalMessages.toLocaleString()}`);
            console.log(`      📩 Unread messages: ${unreadMessages.toLocaleString()}`);

            // Test fetching recent messages
            if (totalMessages > 0) {
                const recentCount = Math.min(5, totalMessages);
                console.log(`   📧 Fetching ${recentCount} most recent messages...`);
                
                const messages = [];
                const startSeq = Math.max(1, totalMessages - recentCount + 1);
                
                for await (let message of client.fetch(`${startSeq}:*`, {
                    envelope: true,
                    flags: true
                })) {
                    messages.push({
                        uid: message.uid,
                        subject: message.envelope.subject || '(No Subject)',
                        from: message.envelope.from?.[0]?.address || 'Unknown',
                        date: message.envelope.date,
                        flags: message.flags
                    });
                }

                console.log(`   📋 Recent Messages:`);
                messages.slice(0, 3).forEach((msg, index) => {
                    const unreadFlag = msg.flags && msg.flags.has && msg.flags.has('\\Seen') ? '📖' : '📩';
                    console.log(`      ${unreadFlag} ${msg.subject.substring(0, 50)}...`);
                    console.log(`         From: ${msg.from}`);
                });
            }
        } finally {
            lock.release();
        }

        await client.logout();
        console.log(`   🔌 Disconnected cleanly`);

        return {
            success: true,
            email: account.email,
            totalMessages: totalMessages,
            unreadMessages: unreadMessages,
            config: config
        };

    } catch (error) {
        console.log(`   ❌ Connection failed: ${error.message}`);
        
        if (error.message.includes('Invalid credentials') || error.message.includes('authentication')) {
            console.log(`   💡 Solution: Generate new app password for ${account.email}`);
            console.log(`      1. Go to: https://login.yahoo.com/account/security`);
            console.log(`      2. Generate app password for "Email Agent MCP"`);
            console.log(`      3. Update .env with new password`);
        }
        
        return {
            success: false,
            email: account.email,
            error: error.message
        };
    } finally {
        // Ensure client is closed
        if (client && client.usable) {
            try {
                await client.logout();
            } catch (e) {
                // Ignore logout errors
            }
        }
    }
}

async function generateYahooIntegrationCode(results) {
    const workingAccounts = results.filter(r => r.success);
    
    if (workingAccounts.length === 0) {
        console.log('\n❌ No working Yahoo accounts found. Integration code not generated.');
        return;
    }

    console.log(`\n🔧 Generating Yahoo API integration code for ${workingAccounts.length} account(s)...`);

    const integrationCode = `// File: D:\AI\Gits\email-agent_v01\yahoo-api-integration.js
// Yahoo IMAP API Integration - Generated automatically
// Accounts: ${workingAccounts.map(a => a.email).join(', ')}

import { ImapFlow } from 'imapflow';
import dotenv from 'dotenv';

dotenv.config();

const YAHOO_ACCOUNTS = [
${workingAccounts.map((account, index) => `    {
        email: '${account.email}',
        password: process.env.YAHOO${index === 0 ? '' : index + 1}_APP_PASSWORD,
        name: 'Yahoo Account ${index + 1}',
        config: {
            host: 'imap.mail.yahoo.com',
            port: 993,
            secure: true,
            auth: {
                user: '${account.email}',
                pass: process.env.YAHOO${index === 0 ? '' : index + 1}_APP_PASSWORD
            }
        }
    }`).join(',\n')}
];

class YahooEmailManager {
    constructor() {
        this.accounts = YAHOO_ACCOUNTS;
    }

    async getAccountStats(email) {
        const account = this.accounts.find(a => a.email === email);
        if (!account) throw new Error(\`Account \${email} not found\`);

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
                console.error(\`Error getting stats for \${account.email}:\`, error.message);
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
        if (!account) throw new Error(\`Account \${email} not found\`);

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
                        unread: !message.flags.has('\\\\Seen'),
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
        if (!account) throw new Error(\`Account \${email} not found\`);

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
        console.log(\`📧 Recent emails from \${workingAccount.email}:\`, recent.length);
    }
}

// Uncomment to test
// testYahooIntegration().catch(console.error);
`;

    // Save the integration code
    fs.writeFileSync('yahoo-api-integration.js', integrationCode);
    console.log('✅ Yahoo API integration code saved to: yahoo-api-integration.js');

    // Save configuration
    const configData = {
        accounts: workingAccounts.map(account => ({
            email: account.email,
            totalMessages: account.totalMessages,
            unreadMessages: account.unreadMessages,
            lastTested: new Date().toISOString()
        })),
        imapSettings: {
            host: 'imap.mail.yahoo.com',
            port: 993,
            secure: true
        },
        generatedAt: new Date().toISOString()
    };

    fs.writeFileSync('yahoo-imap-config.json', JSON.stringify(configData, null, 2));
    console.log('✅ Yahoo configuration saved to: yahoo-imap-config.json');
}

async function main() {
    console.log('🚀 Yahoo IMAP Setup & Testing (Fixed Version)');
    console.log('===============================================');
    
    console.log('\n📋 Yahoo Accounts to Test:');
    YAHOO_ACCOUNTS.forEach((account, index) => {
        console.log(`   ${index + 1}. ${account.name}: ${account.email}`);
        console.log(`      App Password: ${account.password ? '✅ Configured' : '❌ Missing'}`);
    });

    if (!YAHOO_ACCOUNTS.some(acc => acc.password)) {
        console.log('\n⚠️  No Yahoo app passwords found in .env file!');
        console.log('   Please add to your .env file:');
        console.log('   YAHOO_APP_PASSWORD=your_app_password_here');
        console.log('   YAHOO2_APP_PASSWORD=your_second_app_password_here');
        console.log('\n💡 To generate Yahoo app passwords:');
        console.log('   1. Go to: https://login.yahoo.com/account/security');
        console.log('   2. Generate app password for "Email Agent MCP"');
        console.log('   3. Add to .env file');
        return;
    }

    console.log('\n🔍 Testing Yahoo IMAP Connections...');
    
    const results = [];
    for (const account of YAHOO_ACCOUNTS) {
        const result = await testYahooConnection(account);
        results.push(result);
    }

    // Summary
    console.log('\n📊 Yahoo IMAP Test Results:');
    console.log('================================');
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    if (successful.length > 0) {
        console.log(`✅ Successful Connections: ${successful.length}`);
        successful.forEach(account => {
            console.log(`   📧 ${account.email}: ${account.totalMessages.toLocaleString()} total, ${account.unreadMessages.toLocaleString()} unread`);
        });
    }
    
    if (failed.length > 0) {
        console.log(`❌ Failed Connections: ${failed.length}`);
        failed.forEach(account => {
            console.log(`   ⚠️  ${account.email}: ${account.error}`);
        });
    }

    // Generate integration code if we have working accounts
    if (successful.length > 0) {
        await generateYahooIntegrationCode(results);
        
        console.log('\n🎉 Yahoo IMAP Setup Complete!');
        console.log(`✅ ${successful.length} Yahoo account(s) ready for integration`);
        console.log('\n📁 Generated Files:');
        console.log('   - yahoo-api-integration.js (integration code)');
        console.log('   - yahoo-imap-config.json (configuration)');
        console.log('\n🔄 Next Steps:');
        console.log('   1. Add Yahoo endpoints to working-api-server.js');
        console.log('   2. Update frontend to display Yahoo data');
        console.log('   3. Test unified multi-provider dashboard');
    } else {
        console.log('\n❌ No working Yahoo connections found.');
        console.log('   Please check app passwords and try again.');
    }
}

// Run the setup
main().catch(console.error);