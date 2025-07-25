// File: D:\AI\Gits\email-agent_v01\aol-oauth-setup.js
// AOL OAuth Multi-Account Setup

import { createServer } from 'http';
import { parse } from 'url';
import { writeFileSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('🚀 AOL OAuth Multi-Account Setup');
console.log('===============================\n');

// Check for AOL credentials
const AOL_CLIENT_ID = process.env.AOL_CLIENT_ID;
const AOL_CLIENT_SECRET = process.env.AOL_CLIENT_SECRET;

console.log('🔍 Checking AOL credentials...');
console.log('Client ID:', AOL_CLIENT_ID ? '✅ Present' : '❌ Missing');
console.log('Client Secret:', AOL_CLIENT_SECRET ? '✅ Present' : '❌ Missing');

if (!AOL_CLIENT_ID || !AOL_CLIENT_SECRET) {
    console.log('\n📝 AOL OAuth App Setup Required');
    console.log('================================');
    console.log();
    console.log('🔗 Step 1: Create AOL Developer App');
    console.log('1. Go to: https://developer.aol.com/api/registration');
    console.log('2. Sign in with your AOL account');
    console.log('3. Create new application:');
    console.log('   • Application Name: Email Agent MCP');
    console.log('   • Description: Personal email management with AI');
    console.log('   • Application Type: Web Application');
    console.log('   • Redirect URI: http://localhost:8080/auth/aol/callback');
    console.log();
    console.log('📋 Step 2: Get Credentials');
    console.log('After creating the app, copy:');
    console.log('• Client ID (Consumer Key)');
    console.log('• Client Secret (Consumer Secret)');
    console.log();
    console.log('⚙️ Step 3: Add to .env file');
    console.log('Add these lines to your .env file:');
    console.log('AOL_CLIENT_ID=your_aol_client_id');
    console.log('AOL_CLIENT_SECRET=your_aol_client_secret');
    console.log('AOL_EMAIL=your-first@aol.com');
    console.log('AOL2_EMAIL=your-second@aol.com');
    console.log('AOL3_EMAIL=your-third@aol.com');
    console.log();
    console.log('🔄 Then re-run this script: node aol-oauth-setup.js');
    
    const instructions = {
        provider: 'AOL',
        status: 'Setup required',
        developer_url: 'https://developer.aol.com/api/registration',
        redirect_uri: 'http://localhost:8080/auth/aol/callback',
        required_env_vars: [
            'AOL_CLIENT_ID',
            'AOL_CLIENT_SECRET',
            'AOL_EMAIL',
            'AOL2_EMAIL (optional)',
            'AOL3_EMAIL (optional)'
        ]
    };
    
    writeFileSync('aol-setup-instructions.json', JSON.stringify(instructions, null, 2));
    console.log('💾 Instructions saved to: aol-setup-instructions.json');
    process.exit(0);
}

// Get AOL email accounts from .env
const aolAccounts = [];

// Check for multiple AOL accounts
for (let i = 1; i <= 5; i++) {
    const emailKey = i === 1 ? 'AOL_EMAIL' : `AOL${i}_EMAIL`;
    const email = process.env[emailKey];
    
    if (email) {
        aolAccounts.push({
            name: `AOL Account ${i}`,
            email: email,
            envPrefix: i === 1 ? 'AOL' : `AOL${i}`,
            clientId: process.env[`AOL${i === 1 ? '' : i}_CLIENT_ID`] || AOL_CLIENT_ID,
            clientSecret: process.env[`AOL${i === 1 ? '' : i}_CLIENT_SECRET`] || AOL_CLIENT_SECRET
        });
    }
}

if (aolAccounts.length === 0) {
    console.log('❌ No AOL email addresses found in .env file');
    console.log('Add at least: AOL_EMAIL=your-email@aol.com');
    process.exit(1);
}

console.log(`✅ Found ${aolAccounts.length} AOL account(s) to configure:`);
aolAccounts.forEach((account, index) => {
    console.log(`${index + 1}. ${account.email}`);
});
console.log();

// AOL OAuth Configuration (uses Yahoo's OAuth infrastructure)
const OAUTH_CONFIG = {
    client_id: AOL_CLIENT_ID,
    client_secret: AOL_CLIENT_SECRET,
    redirect_uri: 'http://localhost:8080/auth/aol/callback',
    auth_url: 'https://api.login.aol.com/oauth2/request_auth',
    token_url: 'https://api.login.aol.com/oauth2/get_token',
    scopes: [
        'mail-r',     // Read mail
        'mail-w',     // Write mail
        'openid',     // OpenID Connect
        'profile'     // Basic profile
    ]
};

let currentAccountIndex = 0;
let server = null;

async function setupNextAccount() {
    if (currentAccountIndex >= aolAccounts.length) {
        console.log('\n🎉 All AOL accounts setup complete!');
        generateSummary();
        if (server) server.close();
        return;
    }

    const account = aolAccounts[currentAccountIndex];
    console.log(`\n🔧 Setting up account ${currentAccountIndex + 1}: ${account.name}`);
    console.log(`📧 Email: ${account.email}`);
    console.log('─'.repeat(50));

    // Update OAuth config for this account
    OAUTH_CONFIG.client_id = account.clientId;
    OAUTH_CONFIG.client_secret = account.clientSecret;

    const oauthUrl = buildOAuthUrl();
    
    console.log('🔗 AOL OAuth URL for this account:');
    console.log(`    ${oauthUrl}\n`);
    
    console.log('📝 Steps:');
    console.log('1. Click the OAuth URL above');
    console.log('2. Sign in to your AOL account: ' + account.email);
    console.log('3. Grant permissions');
    console.log('4. Wait for automatic redirect and token capture');
    console.log('5. Script will automatically move to next account\n');

    // Save OAuth info for this account
    const oauthInfo = {
        account: account.name,
        email: account.email,
        oauth_url: oauthUrl,
        timestamp: new Date().toISOString()
    };
    
    writeFileSync(`aol-oauth-${account.envPrefix.toLowerCase()}.json`, JSON.stringify(oauthInfo, null, 2));
    console.log(`💾 OAuth info saved to: aol-oauth-${account.envPrefix.toLowerCase()}.json`);
    
    console.log('\n⏳ Waiting for OAuth callback...');
}

function buildOAuthUrl() {
    const params = new URLSearchParams({
        client_id: OAUTH_CONFIG.client_id,
        redirect_uri: OAUTH_CONFIG.redirect_uri,
        response_type: 'code',
        scope: OAUTH_CONFIG.scopes.join(' '),
        access_type: 'offline',
        prompt: 'consent',
        state: `aol_oauth_${currentAccountIndex}_${Date.now()}`
    });

    return `${OAUTH_CONFIG.auth_url}?${params.toString()}`;
}

async function handleOAuthCallback(query, res) {
    const { code, error, error_description, state } = query;
    
    if (error) {
        console.error(`❌ OAuth Error: ${error}`);
        if (error_description) {
            console.error(`   Description: ${error_description}`);
        }
        
        res.writeHead(400, { 'Content-Type': 'text/html' });
        const errorHtml = `
            <html>
            <head><title>AOL OAuth Error</title></head>
            <body>
                <h1>AOL OAuth Error</h1>
                <p><strong>Error:</strong> ${error}</p>
                <p><strong>Description:</strong> ${error_description || 'Unknown error'}</p>
                <p>Return to terminal and try the next account or troubleshoot.</p>
            </body>
            </html>
        `;
        res.end(errorHtml);
        
        console.log('\n❌ OAuth failed for current account. Moving to next account...');
        currentAccountIndex++;
        setTimeout(setupNextAccount, 2000);
        return;
    }
    
    if (code) {
        const account = aolAccounts[currentAccountIndex];
        console.log(`\n✅ Authorization code received for ${account.email}!`);
        console.log(`🔑 Code: ${code.substring(0, 20)}...`);
        
        res.writeHead(200, { 'Content-Type': 'text/html' });
        const successHtml = `
            <html>
            <head><title>AOL OAuth Success</title></head>
            <body>
                <h1>✅ AOL OAuth Success!</h1>
                <p>Account: ${account.email}</p>
                <p>Authorization code received successfully.</p>
                <p>Return to your terminal to see the progress.</p>
                <script>setTimeout(() => window.close(), 3000);</script>
            </body>
            </html>
        `;
        res.end(successHtml);
        
        try {
            await exchangeCodeForTokens(code, account);
            console.log(`✅ ${account.email} setup complete!`);
            
            currentAccountIndex++;
            
            if (currentAccountIndex < aolAccounts.length) {
                console.log('\n⏳ Moving to next account in 3 seconds...');
                setTimeout(setupNextAccount, 3000);
            } else {
                setTimeout(setupNextAccount, 1000); // Complete setup
            }
            
        } catch (error) {
            console.error(`❌ Token exchange failed for ${account.email}:`, error.message);
            currentAccountIndex++;
            setTimeout(setupNextAccount, 2000);
        }
    }
}

async function exchangeCodeForTokens(code, account) {
    console.log(`\n🔄 Exchanging authorization code for tokens (${account.email})...`);
    
    const requestPayload = {
        client_id: account.clientId,
        client_secret: account.clientSecret,
        redirect_uri: OAUTH_CONFIG.redirect_uri,
        code: code,
        grant_type: 'authorization_code'
    };

    try {
        const response = await fetch(OAUTH_CONFIG.token_url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams(requestPayload)
        });

        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(`Token exchange failed: ${result.error_description || result.error}`);
        }

        console.log('✅ Tokens received successfully!');
        console.log(`🔑 Access Token: ${result.access_token.substring(0, 20)}...`);
        
        if (result.refresh_token) {
            console.log(`🔄 Refresh Token: ${result.refresh_token.substring(0, 20)}...`);
        }

        // Save tokens
        const tokenBackup = {
            account: account.name,
            email: account.email,
            access_token: result.access_token,
            refresh_token: result.refresh_token,
            expires_in: result.expires_in,
            token_type: result.token_type,
            scope: result.scope,
            timestamp: new Date().toISOString()
        };
        
        writeFileSync(`aol-tokens-${account.envPrefix.toLowerCase()}.json`, JSON.stringify(tokenBackup, null, 2));
        console.log(`💾 Tokens backed up to: aol-tokens-${account.envPrefix.toLowerCase()}.json`);

        // Update .env file
        updateEnvFile(account, result.refresh_token);

    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    }
}

function updateEnvFile(account, refreshToken) {
    console.log(`\n📝 Updating .env file for ${account.email}...`);
    
    try {
        const envPath = join(__dirname, '.env');
        let envContent = '';
        
        try {
            envContent = readFileSync(envPath, 'utf8');
        } catch (err) {
            console.log('⚠️  .env file not found');
            return;
        }

        // Update or add refresh token
        const tokenKey = `${account.envPrefix}_REFRESH_TOKEN`;
        const tokenLine = `${tokenKey}=${refreshToken}`;
        
        if (envContent.includes(`${tokenKey}=`)) {
            envContent = envContent.replace(new RegExp(`${tokenKey}=.*`, 'g'), tokenLine);
        } else {
            envContent += `\n${tokenLine}\n`;
        }

        writeFileSync(envPath, envContent);
        console.log(`✅ .env file updated with ${account.email} refresh token`);

    } catch (error) {
        console.error(`❌ Error updating .env file:`, error.message);
        console.log(`🛠️  Please manually add: ${account.envPrefix}_REFRESH_TOKEN=${refreshToken}`);
    }
}

function generateSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 AOL MULTI-ACCOUNT SETUP SUMMARY');
    console.log('='.repeat(60));
    
    console.log(`\n🎯 Setup completed for ${aolAccounts.length} AOL account(s):`);
    aolAccounts.forEach((account, index) => {
        console.log(`${index + 1}. ${account.email} (${account.envPrefix}_REFRESH_TOKEN)`);
    });
    
    console.log('\n📝 Next Steps:');
    console.log('1. Update your working-api-server.js to include AOL accounts');
    console.log('2. Run: node test-providers.js (to verify all connections)');
    console.log('3. Restart your application: pnpm run dev');
    console.log('4. Check dashboard for all email accounts');
    
    console.log('\n💾 Files created:');
    aolAccounts.forEach(account => {
        console.log(`• aol-tokens-${account.envPrefix.toLowerCase()}.json`);
    });
    
    console.log('\n🎉 AOL multi-account OAuth setup complete!');
}

// Start OAuth callback server
server = createServer(async (req, res) => {
    const parsedUrl = parse(req.url, true);
    
    if (parsedUrl.pathname === '/auth/aol/callback') {
        await handleOAuthCallback(parsedUrl.query, res);
    } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        const html = `
            <html>
            <head><title>AOL OAuth Setup</title></head>
            <body>
                <h1>AOL OAuth Multi-Account Setup</h1>
                <p>Server is running to capture OAuth callbacks.</p>
                <p>Complete the OAuth flow in the browser tab that opened.</p>
                <p>Current account: ${currentAccountIndex + 1} of ${aolAccounts.length}</p>
            </body>
            </html>
        `;
        res.end(html);
    }
});

server.listen(8080, 'localhost', () => {
    console.log('✅ OAuth callback server started on http://localhost:8080');
    console.log('🔄 Ready to receive AOL OAuth callbacks\n');
    
    // Start with first account
    setupNextAccount();
});

server.on('error', (err) => {
    console.error('❌ Server error:', err.message);
    process.exit(1);
});

// Handle interruption
process.on('SIGINT', () => {
    console.log('\n\n⚠️  Setup interrupted by user');
    if (server) {
        server.close();
    }
    process.exit(0);
});