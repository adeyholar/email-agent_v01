// File: D:\AI\Gits\email-agent_v01\test-deletion-fixes.js
// Test script to verify deletion fixes for all providers
// Tests the corrected IMAP methods and Gmail permissions

import { google } from 'googleapis';
import { ImapFlow } from 'imapflow';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

console.log('🧪 Testing Email Deletion Fixes');
console.log('================================');
console.log('This script tests if your email deletion system is working properly.\n');

// Test Gmail deletion permissions
async function testGmailDeletion() {
    console.log('📧 Testing Gmail Deletion...');
    
    if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_REFRESH_TOKEN) {
        console.log('   ⚠️ Gmail credentials not configured in .env file');
        console.log('   📝 Required: GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN');
        return false;
    }
    
    try {
        const oauth2Client = new google.auth.OAuth2(
            process.env.GMAIL_CLIENT_ID,
            process.env.GMAIL_CLIENT_SECRET,
            'urn:ietf:wg:oauth:2.0:oob'
        );

        oauth2Client.setCredentials({
            refresh_token: process.env.GMAIL_REFRESH_TOKEN
        });

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        
        // Test API access
        console.log('   🔍 Testing Gmail API connection...');
        const profile = await gmail.users.getProfile({ userId: 'me' });
        console.log(`   ✅ Connected to Gmail: ${profile.data.emailAddress}`);
        
        // Test delete permission (with non-existent message ID)
        console.log('   🔍 Testing delete permissions...');
        try {
            await gmail.users.messages.delete({
                userId: 'me',
                id: 'test_nonexistent_message_id_12345'
            });
        } catch (error) {
            if (error.message.includes('Insufficient Permission')) {
                console.log('   ❌ Gmail delete permission missing');
                console.log('   🔧 Gmail OAuth needs update for delete permissions');
                console.log('   📖 See Gmail setup instructions below');
                return false;
            } else if (error.message.includes('not found')) {
                console.log('   ✅ Gmail delete permission confirmed');
                return true;
            } else {
                console.log('   ⚠️ Unexpected error:', error.message);
                return false;
            }
        }
        
    } catch (error) {
        console.log('   ❌ Gmail connection failed:', error.message);
        if (error.message.includes('invalid_grant')) {
            console.log('   🔧 Gmail refresh token is expired or invalid');
        }
        return false;
    }
}

// Test Yahoo IMAP deletion methods
async function testYahooIMAPMethods() {
    console.log('\n📮 Testing Yahoo IMAP Methods...');
    
    if (!process.env.YAHOO_EMAIL || !process.env.YAHOO_APP_PASSWORD) {
        console.log('   ⚠️ Yahoo credentials not configured');
        console.log('   📝 Required: YAHOO_EMAIL, YAHOO_APP_PASSWORD');
        return false;
    }
    
    try {
        console.log('   🔍 Connecting to Yahoo IMAP...');
        const client = new ImapFlow({
            host: 'imap.mail.yahoo.com',
            port: 993,
            secure: true,
            auth: {
                user: process.env.YAHOO_EMAIL,
                pass: process.env.YAHOO_APP_PASSWORD
            },
            logger: false
        });

        await client.connect();
        console.log(`   ✅ Connected to Yahoo: ${process.env.YAHOO_EMAIL}`);
        
        const lock = await client.getMailboxLock('INBOX');
        
        try {
            // Test available methods
            console.log('   🔍 Testing IMAP deletion methods:');
            
            const methods = {
                'messageDelete': typeof client.messageDelete === 'function',
                'messageMove': typeof client.messageMove === 'function',
                'messageFlagsAdd': typeof client.messageFlagsAdd === 'function'
            };
            
            Object.entries(methods).forEach(([method, available]) => {
                console.log(`   ${available ? '✅' : '❌'} ${method} ${available ? 'available' : 'not available'}`);
            });
            
            // List available mailboxes
            console.log('   🔍 Checking for Trash mailbox...');
            const mailboxes = await client.list();
            const trashMailbox = mailboxes.find(mb => 
                mb.name.toLowerCase().includes('trash') || 
                mb.name.toLowerCase().includes('deleted') ||
                mb.name.toLowerCase().includes('bin')
            );
            
            if (trashMailbox) {
                console.log(`   ✅ Trash mailbox found: ${trashMailbox.name}`);
            } else {
                console.log('   ⚠️ No trash mailbox found');
                console.log(`   📁 Available: ${mailboxes.slice(0, 5).map(mb => mb.name).join(', ')}`);
            }
            
            const allMethodsAvailable = Object.values(methods).every(Boolean);
            return allMethodsAvailable;
            
        } finally {
            lock.release();
            await client.logout();
        }
        
    } catch (error) {
        console.log('   ❌ Yahoo IMAP test failed:', error.message);
        if (error.message.includes('authentication')) {
            console.log('   🔧 Check Yahoo app password - may need to regenerate');
        }
        return false;
    }
}

// Test AOL IMAP deletion methods
async function testAOLIMAPMethods() {
    console.log('\n📫 Testing AOL IMAP Methods...');
    
    if (!process.env.AOL_EMAIL || !process.env.AOL_APP_PASSWORD) {
        console.log('   ⚠️ AOL credentials not configured');
        console.log('   📝 Required: AOL_EMAIL, AOL_APP_PASSWORD');
        return false;
    }
    
    try {
        console.log('   🔍 Connecting to AOL IMAP...');
        const client = new ImapFlow({
            host: 'imap.aol.com',
            port: 993,
            secure: true,
            auth: {
                user: process.env.AOL_EMAIL,
                pass: process.env.AOL_APP_PASSWORD
            },
            logger: false
        });

        await client.connect();
        console.log(`   ✅ Connected to AOL: ${process.env.AOL_EMAIL}`);
        
        const lock = await client.getMailboxLock('INBOX');
        
        try {
            // Test available methods
            console.log('   🔍 Testing IMAP deletion methods:');
            
            const methods = {
                'messageDelete': typeof client.messageDelete === 'function',
                'messageMove': typeof client.messageMove === 'function',
                'messageFlagsAdd': typeof client.messageFlagsAdd === 'function'
            };
            
            Object.entries(methods).forEach(([method, available]) => {
                console.log(`   ${available ? '✅' : '❌'} ${method} ${available ? 'available' : 'not available'}`);
            });
            
            // List available mailboxes
            console.log('   🔍 Checking for Trash mailbox...');
            const mailboxes = await client.list();
            const trashMailbox = mailboxes.find(mb => 
                mb.name.toLowerCase().includes('trash') || 
                mb.name.toLowerCase().includes('deleted') ||
                mb.name.toLowerCase().includes('bin')
            );
            
            if (trashMailbox) {
                console.log(`   ✅ Trash mailbox found: ${trashMailbox.name}`);
            } else {
                console.log('   ⚠️ No trash mailbox found');
                console.log(`   📁 Available: ${mailboxes.slice(0, 5).map(mb => mb.name).join(', ')}`);
            }
            
            const allMethodsAvailable = Object.values(methods).every(Boolean);
            return allMethodsAvailable;
            
        } finally {
            lock.release();
            await client.logout();
        }
        
    } catch (error) {
        console.log('   ❌ AOL IMAP test failed:', error.message);
        if (error.message.includes('authentication')) {
            console.log('   🔧 Check AOL app password - may need to regenerate');
        }
        return false;
    }
}

// Test ImapFlow library
async function testImapFlowLibrary() {
    console.log('\n📚 Testing ImapFlow Library...');
    
    try {
        console.log('   📦 ImapFlow library imported successfully');
        
        // Create a test client to check available methods
        const testClient = new ImapFlow({
            host: 'test.example.com',
            port: 993,
            secure: true,
            auth: { user: 'test', pass: 'test' }
        });
        
        console.log('   📦 ImapFlow client created successfully');
        
        // Check critical method availability
        const criticalMethods = ['messageDelete', 'messageMove', 'messageFlagsAdd'];
        const availableMethods = criticalMethods.filter(method => 
            typeof testClient[method] === 'function'
        );
        
        console.log(`   ✅ ${availableMethods.length}/${criticalMethods.length} critical methods available`);
        
        if (availableMethods.length === criticalMethods.length) {
            console.log('   ✅ All required IMAP methods present');
            return true;
        } else {
            console.log('   ❌ Some IMAP methods missing - may need ImapFlow update');
            return false;
        }
        
    } catch (error) {
        console.log('   ❌ ImapFlow library test failed:', error.message);
        console.log('   🔧 Try: pnpm install imapflow@latest');
        return false;
    }
}

// Check environment variables
function checkEnvironmentSetup() {
    console.log('\n🔧 Checking Environment Setup...');
    
    // Check if .env file exists
    if (!fs.existsSync('.env')) {
        console.log('   ❌ .env file not found');
        return false;
    }
    
    console.log('   ✅ .env file exists');
    
    const requiredVars = [
        'GMAIL_CLIENT_ID',
        'GMAIL_CLIENT_SECRET', 
        'GMAIL_REFRESH_TOKEN',
        'YAHOO_EMAIL',
        'YAHOO_APP_PASSWORD',
        'AOL_EMAIL',
        'AOL_APP_PASSWORD'
    ];
    
    let configuredCount = 0;
    
    requiredVars.forEach(varName => {
        const value = process.env[varName];
        if (value && value.length > 0) {
            const isSecret = varName.includes('PASSWORD') || varName.includes('TOKEN') || varName.includes('SECRET');
            const display = isSecret ? `${value.substring(0, 8)}...` : value;
            console.log(`   ✅ ${varName}: ${display}`);
            configuredCount++;
        } else {
            console.log(`   ❌ ${varName}: Not set`);
        }
    });
    
    console.log(`   📊 ${configuredCount}/${requiredVars.length} environment variables configured`);
    
    return configuredCount >= 4; // At least Gmail + one other provider
}

// Check if deletion manager file exists and is updated
function checkDeletionManagerFile() {
    console.log('\n📄 Checking Email Deletion Manager...');
    
    if (!fs.existsSync('email-deletion-manager.js')) {
        console.log('   ❌ email-deletion-manager.js not found');
        console.log('   🔧 Create this file with the fixed deletion manager code');
        return false;
    }
    
    console.log('   ✅ email-deletion-manager.js exists');
    
    try {
        const content = fs.readFileSync('email-deletion-manager.js', 'utf8');
        
        // Check for fixed methods
        const hasMessageDelete = content.includes('messageDelete');
        const hasProperErrorHandling = content.includes('FIXED');
        
        console.log(`   ${hasMessageDelete ? '✅' : '❌'} Contains messageDelete method`);
        console.log(`   ${hasProperErrorHandling ? '✅' : '❌'} Contains fix indicators`);
        
        return hasMessageDelete;
        
    } catch (error) {
        console.log('   ❌ Could not read deletion manager file');
        return false;
    }
}

// Print Gmail setup instructions
function printGmailSetupInstructions() {
    console.log('\n📖 Gmail OAuth Setup Instructions:');
    console.log('==================================');
    console.log('Your Gmail app is blocked because it needs proper Google Cloud Console setup:');
    console.log('');
    console.log('1. Go to Google Cloud Console: https://console.cloud.google.com');
    console.log('2. Create a new project or select existing one');
    console.log('3. Enable Gmail API:');
    console.log('   - Go to APIs & Services > Library');
    console.log('   - Search for "Gmail API"');
    console.log('   - Click Enable');
    console.log('');
    console.log('4. Configure OAuth consent screen:');
    console.log('   - Go to APIs & Services > OAuth consent screen');
    console.log('   - Choose "External" user type');
    console.log('   - Fill required fields (App name, User support email, Developer email)');
    console.log('   - Add scope: https://www.googleapis.com/auth/gmail.modify');
    console.log('   - Add your email as a test user');
    console.log('');
    console.log('5. Create credentials:');
    console.log('   - Go to APIs & Services > Credentials');
    console.log('   - Click "Create Credentials" > "OAuth 2.0 Client IDs"');
    console.log('   - Choose "Desktop application"');
    console.log('   - Note down Client ID and Client Secret');
    console.log('');
    console.log('6. Update your .env file with the new credentials');
    console.log('7. Run the OAuth flow again');
}

// Main test runner
async function runAllTests() {
    console.log('Starting comprehensive deletion system tests...\n');
    
    const results = {
        environment: checkEnvironmentSetup(),
        deletionManager: checkDeletionManagerFile(),
        imapFlow: await testImapFlowLibrary(),
        gmail: await testGmailDeletion(),
        yahoo: await testYahooIMAPMethods(),
        aol: await testAOLIMAPMethods()
    };
    
    console.log('\n📋 Test Results Summary:');
    console.log('========================');
    
    Object.entries(results).forEach(([test, passed]) => {
        const status = passed ? '✅ PASSED' : '❌ FAILED';
        console.log(`${status.padEnd(10)} ${test.toUpperCase()}`);
    });
    
    const criticalTests = ['environment', 'deletionManager', 'imapFlow'];
    const criticalPassed = criticalTests.every(test => results[test]);
    
    console.log('\n🎯 System Status:');
    if (criticalPassed && (results.gmail || results.yahoo || results.aol)) {
        console.log('✅ SYSTEM READY - At least one email provider working');
        console.log('\n🚀 Next Steps:');
        console.log('1. Start your email server: node enhanced-working-api-server.js');
        console.log('2. Open dashboard: http://localhost:3000');
        console.log('3. Test batch deletion with a few emails');
        console.log('4. Check deletion logs for confirmation');
    } else {
        console.log('❌ SYSTEM NOT READY - Critical issues found');
        console.log('\n🔧 Priority Fixes:');
        
        if (!results.environment) {
            console.log('• Fix environment variables in .env file');
        }
        if (!results.deletionManager) {
            console.log('• Create/update email-deletion-manager.js with fixed code');
        }
        if (!results.imapFlow) {
            console.log('• Update ImapFlow library: pnpm install imapflow@latest');
        }
        if (!results.gmail) {
            console.log('• Fix Gmail OAuth setup (see instructions below)');
        }
    }
    
    // Show Gmail setup if needed
    if (!results.gmail && process.env.GMAIL_CLIENT_ID) {
        printGmailSetupInstructions();
    }
    
    console.log('\n📚 Additional Resources:');
    console.log('• Yahoo App Password: https://login.yahoo.com/account/security');
    console.log('• AOL App Password: https://login.aol.com/account/security');
    console.log('• Google Cloud Console: https://console.cloud.google.com');
}

// Execute tests
runAllTests().catch(error => {
    console.error('\n💥 Test execution failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
});