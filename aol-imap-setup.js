// File: D:\AI\Gits\email-agent_v01\aol-imap-setup.js
// AOL IMAP Multi-Account Setup

import { ImapFlow } from 'imapflow';
import { writeFileSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('🚀 AOL IMAP Multi-Account Setup');
console.log('==============================\n');

// AOL IMAP Configuration
const AOL_IMAP_CONFIG = {
    host: 'imap.aol.com',
    port: 993,
    secure: true,
    auth: {
        user: '', // Will be set per account
        pass: ''  // Will be set per account
    }
};

// Check for AOL accounts in .env
const aolAccounts = [];

console.log('🔍 Scanning for AOL accounts in .env file...');

for (let i = 1; i <= 10; i++) {
    const emailKey = i === 1 ? 'AOL_EMAIL' : `AOL${i}_EMAIL`;
    const passwordKey = i === 1 ? 'AOL_APP_PASSWORD' : `AOL${i}_APP_PASSWORD`;
    
    const email = process.env[emailKey];
    const appPassword = process.env[passwordKey];
    
    if (email) {
        aolAccounts.push({
            name: `AOL Account ${i}`,
            email: email,
            appPassword: appPassword,
            envPrefix: i === 1 ? 'AOL' : `AOL${i}`,
            emailKey: emailKey,
            passwordKey: passwordKey
        });
        
        console.log(`${i}. Found: ${email} - App Password: ${appPassword ? '✅ Set' : '❌ Missing'}`);
    }
}

if (aolAccounts.length === 0) {
    console.log('❌ No AOL accounts found in .env file');
    console.log('\n📝 AOL IMAP Setup Instructions');
    console.log('=============================');
    console.log();
    console.log('🔧 Step 1: Enable App Passwords in AOL');
    console.log('1. Go to: https://login.aol.com/account/security');
    console.log('2. Sign in to your AOL account');
    console.log('3. Go to "Account Security"');
    console.log('4. Find "App passwords" or "Generate app password"');
    console.log('5. Create a new app password for "Email Agent MCP"');
    console.log('6. Copy the generated 16-character password');
    console.log();
    console.log('⚙️ Step 2: Add to .env file');
    console.log('Add these lines for each AOL account:');
    console.log();
    console.log('# First AOL Account');
    console.log('AOL_EMAIL=your-first@aol.com');
    console.log('AOL_APP_PASSWORD=your_16_char_app_password');
    console.log();
    console.log('# Second AOL Account');
    console.log('AOL2_EMAIL=your-second@aol.com');
    console.log('AOL2_APP_PASSWORD=your_16_char_app_password');
    console.log();
    console.log('# Third AOL Account (and so on...)');
    console.log('AOL3_EMAIL=your-third@aol.com');
    console.log('AOL3_APP_PASSWORD=your_16_char_app_password');
    console.log();
    console.log('🔄 Step 3: Re-run this script');
    console.log('node aol-imap-setup.js');
    
    const instructions = {
        provider: 'AOL IMAP',
        setup_url: 'https://login.aol.com/account/security',
        imap_settings: {
            host: 'imap.aol.com',
            port: 993,
            security: 'SSL/TLS'
        },
        required_steps: [
            'Enable app passwords in AOL account security',
            'Generate app password for Email Agent MCP',
            'Add email and app password to .env file',
            'Re-run setup script'
        ],
        env_format: {
            'AOL_EMAIL': 'your-email@aol.com',
            'AOL_APP_PASSWORD': '16-character-app-password',
            'AOL2_EMAIL': 'second-email@aol.com',
            'AOL2_APP_PASSWORD': '16-character-app-password'
        }
    };
    
    writeFileSync('aol-imap-instructions.json', JSON.stringify(instructions, null, 2));
    console.log('💾 Instructions saved to: aol-imap-instructions.json');
    process.exit(0);
}

console.log(`\n✅ Found ${aolAccounts.length} AOL account(s) to test\n`);

// Test each AOL account
async function testAOLAccount(account) {
    console.log(`🧪 Testing ${account.name}: ${account.email}`);
    
    if (!account.appPassword) {
        console.log(`❌ Missing app password for ${account.email}`);
        console.log(`   Add ${account.passwordKey} to your .env file`);
        return false;
    }
    
    try {
        // Configure IMAP for this account
        const config = {
            ...AOL_IMAP_CONFIG,
            auth: {
                user: account.email,
                pass: account.appPassword
            }
        };
        
        console.log(`   🔌 Connecting to ${config.host}:${config.port}...`);
        
        // Create IMAP connection
        const client = new ImapFlow(config);
        
        // Test connection
        await client.connect();
        console.log(`   ✅ Connected successfully`);
        
        // Test mailbox access
        const lock = await client.getMailboxLock('INBOX');
        try {
            const status = await client.status('INBOX', { messages: true, unseen: true });
            console.log(`   📧 Inbox: ${status.messages} total, ${status.unseen} unread`);
            
            // Get a few recent messages to verify read access
            const messages = await client.fetch('1:5', { envelope: true }, { uid: true });
            let messageCount = 0;
            for await (let message of messages) {
                messageCount++;
            }
            console.log(`   📬 Successfully read ${messageCount} recent messages`);
            
        } finally {
            lock.release();
        }
        
        await client.logout();
        console.log(`   🔓 Disconnected cleanly`);
        
        return true;
        
    } catch (error) {
        console.log(`   ❌ Connection failed: ${error.message}`);
        
        if (error.message.includes('Invalid credentials')) {
            console.log(`   🔧 Solution: Check app password for ${account.email}`);
            console.log(`   🔗 Generate new password: https://login.aol.com/account/security`);
        } else if (error.message.includes('ENOTFOUND')) {
            console.log(`   🔧 Solution: Check internet connection`);
        } else {
            console.log(`   🔧 Solution: Verify AOL IMAP is enabled for ${account.email}`);
        }
        
        return false;
    }
}

// Test all accounts
async function testAllAccounts() {
    const results = {
        successful: [],
        failed: []
    };
    
    for (const account of aolAccounts) {
        const success = await testAOLAccount(account);
        
        if (success) {
            results.successful.push(account);
        } else {
            results.failed.push(account);
        }
        
        console.log(); // Add spacing between accounts
    }
    
    return results;
}

// Update API server configuration
function updateAPIServerConfig(successfulAccounts) {
    console.log('📝 Generating AOL IMAP configuration for API server...');
    
    const aolImapConfig = {
        provider: 'AOL IMAP',
        accounts: successfulAccounts.map(account => ({
            name: account.name,
            email: account.email,
            envPrefix: account.envPrefix,
            imap: {
                host: 'imap.aol.com',
                port: 993,
                secure: true,
                auth: {
                    user: account.email,
                    pass: `process.env.${account.passwordKey}`
                }
            }
        })),
        timestamp: new Date().toISOString()
    };
    
    writeFileSync('aol-imap-config.json', JSON.stringify(aolImapConfig, null, 2));
    console.log('💾 AOL IMAP config saved to: aol-imap-config.json');
    
    // Generate code snippet for API server integration
    const integrationCode = `
// AOL IMAP Integration Code
// Add this to your working-api-server.js

import { ImapFlow } from 'imapflow';

// AOL IMAP Helper Functions
async function getAOLEmails(accountEnvPrefix, limit = 10) {
    const config = {
        host: 'imap.aol.com',
        port: 993,
        secure: true,
        auth: {
            user: process.env[\`\${accountEnvPrefix}_EMAIL\`],
            pass: process.env[\`\${accountEnvPrefix}_APP_PASSWORD\`]
        }
    };
    
    const client = new ImapFlow(config);
    await client.connect();
    
    const lock = await client.getMailboxLock('INBOX');
    const emails = [];
    
    try {
        const messages = await client.fetch(\`1:\${limit}\`, { 
            envelope: true, 
            bodyStructure: true 
        }, { uid: true });
        
        for await (let message of messages) {
            emails.push({
                id: message.uid,
                from: message.envelope.from?.[0]?.address || 'Unknown',
                subject: message.envelope.subject || 'No Subject',
                date: message.envelope.date,
                isUnread: !message.flags.has('\\\\Seen')
            });
        }
    } finally {
        lock.release();
    }
    
    await client.logout();
    return emails;
}

// Add AOL endpoints to your Express app:
${successfulAccounts.map(account => `
app.get('/api/aol/${account.envPrefix.toLowerCase()}/emails', async (req, res) => {
    try {
        const emails = await getAOLEmails('${account.envPrefix}', req.query.limit || 10);
        res.json(emails);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});`).join('')}
`;
    
    writeFileSync('aol-api-integration.js', integrationCode);
    console.log('💾 API integration code saved to: aol-api-integration.js');
}

// Generate summary
function generateSummary(results) {
    console.log('='.repeat(60));
    console.log('📊 AOL IMAP SETUP SUMMARY');
    console.log('='.repeat(60));
    
    if (results.successful.length > 0) {
        console.log(`\n✅ Successfully configured ${results.successful.length} AOL account(s):`);
        results.successful.forEach((account, index) => {
            console.log(`${index + 1}. ${account.email} (${account.envPrefix})`);
        });
    }
    
    if (results.failed.length > 0) {
        console.log(`\n❌ Failed to configure ${results.failed.length} AOL account(s):`);
        results.failed.forEach((account, index) => {
            console.log(`${index + 1}. ${account.email} - Check app password`);
        });
        
        console.log('\n🔧 Fix failed accounts:');
        console.log('1. Go to: https://login.aol.com/account/security');
        console.log('2. Generate new app passwords');
        console.log('3. Update .env file with new passwords');
        console.log('4. Re-run: node aol-imap-setup.js');
    }
    
    if (results.successful.length > 0) {
        console.log('\n📝 Next Steps:');
        console.log('1. Integrate AOL IMAP with your API server');
        console.log('2. Update dashboard to show AOL emails');
        console.log('3. Test the complete multi-provider setup');
        
        updateAPIServerConfig(results.successful);
    }
    
    console.log('\n🎉 AOL IMAP setup complete!');
    console.log(`📊 Success rate: ${results.successful.length}/${aolAccounts.length} accounts`);
}

// Run the setup
async function runSetup() {
    try {
        const results = await testAllAccounts();
        generateSummary(results);
    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        process.exit(1);
    }
}

// Start the setup
runSetup();