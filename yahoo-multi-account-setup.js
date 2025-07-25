// File: D:\AI\Gits\email-agent_v01\yahoo-multi-account-setup.js
// Yahoo Multi-Account OAuth Setup
// Handles OAuth for multiple Yahoo email accounts

import { YahooOAuthSetup } from './yahoo-oauth-v2-setup.js';
import { writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

class YahooMultiAccountSetup {
    constructor() {
        this.accounts = [
            {
                name: 'Primary Yahoo',
                email: process.env.YAHOO_EMAIL || 'your-first-yahoo@yahoo.com',
                envPrefix: 'YAHOO',
                clientId: process.env.YAHOO_CLIENT_ID,
                clientSecret: process.env.YAHOO_CLIENT_SECRET
            },
            {
                name: 'Secondary Yahoo', 
                email: process.env.YAHOO2_EMAIL || 'your-second-yahoo@yahoo.com',
                envPrefix: 'YAHOO2',
                clientId: process.env.YAHOO2_CLIENT_ID || process.env.YAHOO_CLIENT_ID, // Fallback to same app
                clientSecret: process.env.YAHOO2_CLIENT_SECRET || process.env.YAHOO_CLIENT_SECRET
            }
        ];
        
        this.completedAccounts = [];
    }

    async setupAllAccounts() {
        console.log('🚀 Yahoo Multi-Account OAuth Setup');
        console.log('==================================\n');
        
        console.log('📧 Accounts to configure:');
        this.accounts.forEach((account, index) => {
            console.log(`${index + 1}. ${account.name}: ${account.email}`);
        });
        console.log();

        // Check if we have the necessary credentials
        this.validateCredentials();

        // Setup each account
        for (let i = 0; i < this.accounts.length; i++) {
            const account = this.accounts[i];
            
            // Skip if no email configured for secondary account
            if (account.envPrefix === 'YAHOO2' && (!account.email || account.email.includes('your-second-yahoo'))) {
                console.log(`\n⏭️  Skipping ${account.name}: No email configured`);
                console.log('   Add YAHOO2_EMAIL to .env file if you want to set up a second account\n');
                continue;
            }
            
            console.log(`\n🔧 Setting up account ${i + 1}: ${account.name}`);
            console.log(`📧 Email: ${account.email}`);
            console.log('─'.repeat(50));

            try {
                await this.setupSingleAccount(account);
                this.completedAccounts.push(account);
                console.log(`✅ ${account.name} setup complete!`);
                
                if (i < this.accounts.length - 1) {
                    console.log('\n⏳ Waiting 5 seconds before next account...');
                    await this.sleep(5000);
                }
            } catch (error) {
                console.error(`❌ Failed to setup ${account.name}:`, error.message);
                console.log(`🛠️  You can retry this account later`);
            }
        }

        this.generateSummary();
    }

    validateCredentials() {
        console.log('🔍 Validating credentials...\n');
        
        let hasValidCredentials = false;
        
        this.accounts.forEach((account, index) => {
            console.log(`${index + 1}. ${account.name}:`);
            
            if (account.clientId && account.clientSecret) {
                console.log(`   ✅ Client ID: ${account.clientId.substring(0, 20)}...`);
                console.log(`   ✅ Client Secret: ${account.clientSecret.substring(0, 10)}...`);
                hasValidCredentials = true;
            } else {
                console.log(`   ❌ Missing credentials (will use YAHOO_ credentials)`);
                // Use primary credentials as fallback
                account.clientId = process.env.YAHOO_CLIENT_ID;
                account.clientSecret = process.env.YAHOO_CLIENT_SECRET;
                
                if (account.clientId && account.clientSecret) {
                    console.log(`   ✅ Using fallback credentials`);
                    hasValidCredentials = true;
                }
            }
        });

        if (!hasValidCredentials) {
            console.error('\n❌ No valid Yahoo OAuth credentials found!');
            console.error('Required in .env file:');
            console.error('  - YAHOO_CLIENT_ID');
            console.error('  - YAHOO_CLIENT_SECRET');
            console.error('\nOptional for second account:');
            console.error('  - YAHOO2_CLIENT_ID');
            console.error('  - YAHOO2_CLIENT_SECRET');
            process.exit(1);
        }

        console.log('\n✅ Credentials validation complete\n');
    }

    async setupSingleAccount(account) {
        // Temporarily set environment variables for this account
        const originalEnv = {
            YAHOO_CLIENT_ID: process.env.YAHOO_CLIENT_ID,
            YAHOO_CLIENT_SECRET: process.env.YAHOO_CLIENT_SECRET,
            YAHOO_EMAIL: process.env.YAHOO_EMAIL
        };

        // Set current account credentials
        process.env.YAHOO_CLIENT_ID = account.clientId;
        process.env.YAHOO_CLIENT_SECRET = account.clientSecret;
        process.env.YAHOO_EMAIL = account.email;

        try {
            // Create a custom OAuth setup for this account
            const setup = new YahooOAuthSetup();
            
            // Override the updateEnvFile method to use the correct prefix
            const originalUpdateEnv = setup.updateEnvFile.bind(setup);
            setup.updateEnvFile = () => {
                this.updateEnvFileForAccount(account, setup.tokens);
            };

            // Run the OAuth setup
            await setup.setup();

            return setup.tokens;

        } finally {
            // Restore original environment
            Object.assign(process.env, originalEnv);
        }
    }

    updateEnvFileForAccount(account, tokens) {
        console.log(`\n📝 Updating .env file for ${account.name}...`);
        
        try {
            const envPath = join(__dirname, '.env');
            let envContent = '';
            
            try {
                envContent = readFileSync(envPath, 'utf8');
            } catch (err) {
                console.log('⚠️  .env file not found, will create new one');
            }

            // Update or add refresh token for this account
            const tokenKey = `${account.envPrefix}_REFRESH_TOKEN`;
            const tokenLine = `${tokenKey}=${tokens.refresh_token}`;
            
            if (envContent.includes(`${tokenKey}=`)) {
                // Update existing line
                const regex = new RegExp(`${tokenKey}=.*`, 'g');
                envContent = envContent.replace(regex, tokenLine);
            } else {
                // Add new line
                envContent += `\n${tokenLine}\n`;
            }

            // Also ensure email is set
            const emailKey = `${account.envPrefix}_EMAIL`;
            const emailLine = `${emailKey}=${account.email}`;
            
            if (envContent.includes(`${emailKey}=`)) {
                const regex = new RegExp(`${emailKey}=.*`, 'g');
                envContent = envContent.replace(regex, emailLine);
            } else {
                envContent += `${emailLine}\n`;
            }

            writeFileSync(envPath, envContent);
            console.log(`✅ .env file updated with ${account.name} credentials`);

            // Backup tokens for this account
            const backupData = {
                account: account.name,
                email: account.email,
                envPrefix: account.envPrefix,
                tokens: tokens,
                timestamp: new Date().toISOString()
            };

            writeFileSync(`yahoo-tokens-${account.envPrefix.toLowerCase()}.json`, JSON.stringify(backupData, null, 2));
            console.log(`💾 Tokens backed up to: yahoo-tokens-${account.envPrefix.toLowerCase()}.json`);

        } catch (error) {
            console.error(`❌ Error updating .env file for ${account.name}:`, error.message);
            console.log(`🛠️  Please manually add this line to your .env file:`);
            console.log(`    ${account.envPrefix}_REFRESH_TOKEN=${tokens.refresh_token}`);
            console.log(`    ${account.envPrefix}_EMAIL=${account.email}`);
        }
    }

    generateSummary() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 MULTI-ACCOUNT SETUP SUMMARY');
        console.log('='.repeat(60));

        if (this.completedAccounts.length === 0) {
            console.log('❌ No accounts were successfully configured');
            console.log('\n📝 Check the following:');
            console.log('1. Ensure YAHOO_EMAIL is set in .env file');
            console.log('2. Add YAHOO2_EMAIL if you want a second account');
            console.log('3. Verify Yahoo app has proper permissions');
            return;
        }

        console.log(`✅ Successfully configured ${this.completedAccounts.length} out of ${this.accounts.length} accounts:\n`);

        this.completedAccounts.forEach((account, index) => {
            console.log(`${index + 1}. ${account.name}`);
            console.log(`   📧 Email: ${account.email}`);
            console.log(`   🔑 Environment Variable: ${account.envPrefix}_REFRESH_TOKEN`);
            console.log(`   💾 Backup File: yahoo-tokens-${account.envPrefix.toLowerCase()}.json`);
            console.log();
        });

        console.log('🔄 Next Steps:');
        console.log('1. Restart your email agent application');
        console.log('2. Run: node test-providers.js');
        console.log('3. Verify all Yahoo accounts are working');
        console.log('4. Run: pnpm run dev (to start the full application)');
        console.log();

        if (this.completedAccounts.length < this.accounts.filter(a => a.email && !a.email.includes('your-')).length) {
            const failedCount = this.accounts.filter(a => a.email && !a.email.includes('your-')).length - this.completedAccounts.length;
            console.log(`⚠️  ${failedCount} account(s) failed to configure`);
            console.log('You can re-run this script to retry failed accounts');
        }

        console.log('='.repeat(60));
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Handle script interruption
process.on('SIGINT', () => {
    console.log('\n\n⚠️  Multi-account setup interrupted by user');
    process.exit(0);
});

// Run the multi-account setup
if (import.meta.url === `file://${process.argv[1]}`) {
    const setup = new YahooMultiAccountSetup();
    setup.setupAllAccounts().catch((error) => {
        console.error('\n❌ Multi-account setup failed:', error.message);
        process.exit(1);
    });
}

export { YahooMultiAccountSetup };