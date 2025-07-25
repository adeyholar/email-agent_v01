// File: D:\AI\Gits\email-agent_v01\gmail-oauth-setup.js
// Gmail OAuth Setup - Full Implementation

import { createServer } from 'http';
import { parse } from 'url';
import { writeFileSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('🚀 Gmail OAuth Setup');
console.log('===================\n');

// Check if Gmail credentials exist
const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const GMAIL_EMAIL = process.env.GMAIL_EMAIL;

console.log('🔍 Checking Gmail credentials...');

if (!GMAIL_CLIENT_ID && !GMAIL_CLIENT_SECRET) {
    console.log('❌ No Gmail OAuth credentials found in .env file');
    console.log();
    console.log('📝 TO SET UP GMAIL OAUTH:');
    console.log('1. Go to: https://console.cloud.google.com/');
    console.log('2. Create a new project or select existing');
    console.log('3. Enable Gmail API');
    console.log('4. Create OAuth 2.0 credentials');
    console.log('5. Add these to your .env file:');
    console.log('   GMAIL_CLIENT_ID=your_client_id');
    console.log('   GMAIL_CLIENT_SECRET=your_client_secret');
    console.log('   GMAIL_EMAIL=your_gmail_address');
    console.log();
    console.log('🔗 Detailed guide: https://developers.google.com/gmail/api/quickstart/nodejs');
    console.log();
    
    // Save setup instructions
    const instructions = {
        provider: 'Gmail',
        status: 'Credentials needed',
        steps: [
            'Go to Google Cloud Console',
            'Create/select project',
            'Enable Gmail API',
            'Create OAuth 2.0 credentials',
            'Add redirect URI: http://localhost:8080/auth/gmail/callback',
            'Add credentials to .env file'
        ],
        required_env_vars: [
            'GMAIL_CLIENT_ID',
            'GMAIL_CLIENT_SECRET', 
            'GMAIL_EMAIL'
        ],
        redirect_uri: 'http://localhost:8080/auth/gmail/callback',
        scopes_needed: [
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/userinfo.email'
        ]
    };
    
    writeFileSync('gmail-setup-instructions.json', JSON.stringify(instructions, null, 2));
    console.log('💾 Setup instructions saved to: gmail-setup-instructions.json');
    console.log();
    console.log('❓ Would you like me to:');
    console.log('A) Help you set up Gmail OAuth credentials');
    console.log('B) Skip Gmail and try Yahoo IMAP instead');
    console.log('C) Continue with existing project components');
    
    process.exit(0);
}

console.log('✅ Gmail credentials found in .env');
console.log('📧 Setting up OAuth for: ' + (GMAIL_EMAIL || 'your Gmail account'));
console.log();

// Gmail OAuth Configuration
const OAUTH_CONFIG = {
    client_id: GMAIL_CLIENT_ID,
    client_secret: GMAIL_CLIENT_SECRET,
    redirect_uri: 'http://localhost:8080/auth/gmail/callback',
    auth_url: 'https://accounts.google.com/o/oauth2/auth',
    token_url: 'https://oauth2.googleapis.com/token',
    scopes: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send', 
        'https://www.googleapis.com/auth/userinfo.email'
    ]
};

// Build OAuth URL
const oauthUrl = buildOAuthUrl();

console.log('🔗 Gmail OAuth URL Generated!');
console.log('📝 Follow these steps:\n');

console.log('1️⃣  Make sure your Google Cloud OAuth app has this redirect URI:');
console.log('    http://localhost:8080/auth/gmail/callback\n');

console.log('2️⃣  Click this OAuth URL:');
console.log('    ' + oauthUrl);
console.log();

console.log('3️⃣  Steps to complete OAuth:');
console.log('    • Click the OAuth URL above');
console.log('    • Sign in to your Gmail account');
console.log('    • Grant permissions for Gmail access');
console.log('    • You will be redirected to localhost:8080');
console.log('    • The authorization code will be captured automatically');
console.log();

// Save OAuth info
const oauthInfo = {
    provider: 'Gmail',
    oauth_url: oauthUrl,
    redirect_uri: OAUTH_CONFIG.redirect_uri,
    scopes: OAUTH_CONFIG.scopes,
    timestamp: new Date().toISOString()
};

writeFileSync('gmail-oauth-info.json', JSON.stringify(oauthInfo, null, 2));
console.log('💾 OAuth info saved to: gmail-oauth-info.json\n');

// Start OAuth callback server
console.log('🌐 Starting OAuth callback server on http://localhost:8080');
console.log('4️⃣  Waiting for OAuth callback...');
console.log('    (Leave this script running and complete the OAuth flow)\n');

const server = createServer(async (req, res) => {
    const parsedUrl = parse(req.url, true);
    
    if (parsedUrl.pathname === '/auth/gmail/callback') {
        await handleOAuthCallback(parsedUrl.query, res);
    } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        const html = '<h1>Gmail OAuth Setup</h1><p>This server is running to capture the OAuth callback.</p><p>Please complete the OAuth flow in another browser tab.</p>';
        res.end(html);
    }
});

server.listen(8080, 'localhost', () => {
    console.log('✅ OAuth callback server started on http://localhost:8080');
    console.log('🔄 Ready to receive Gmail OAuth callback\n');
});

server.on('error', (err) => {
    console.error('❌ Server error:', err.message);
    if (err.code === 'EADDRINUSE') {
        console.log('🔧 Port 8080 is in use. Kill any running processes on this port.');
    }
    process.exit(1);
});

async function handleOAuthCallback(query, res) {
    const { code, error, error_description } = query;
    
    if (error) {
        console.error('❌ OAuth Error: ' + error);
        if (error_description) {
            console.error('   Description: ' + error_description);
        }
        
        res.writeHead(400, { 'Content-Type': 'text/html' });
        const errorHtml = '<h1>OAuth Error</h1><p>Error: ' + error + '</p><p>Description: ' + (error_description || 'Unknown error') + '</p>';
        res.end(errorHtml);
        return;
    }
    
    if (code) {
        console.log('\n✅ Authorization code received!');
        console.log('🔑 Code: ' + code.substring(0, 20) + '...');
        
        res.writeHead(200, { 'Content-Type': 'text/html' });
        const successHtml = '<h1>✅ Gmail OAuth Success!</h1><p>Authorization code received successfully.</p><p>Return to your terminal to see the results.</p><script>setTimeout(() => window.close(), 3000);</script>';
        res.end(successHtml);
        
        try {
            await exchangeCodeForTokens(code);
            console.log('\n🎉 Gmail OAuth setup complete!');
            console.log('✅ Refresh token saved to .env file');
            console.log('🔄 You can now test your Gmail integration');
            
            server.close();
            
        } catch (error) {
            console.error('❌ Token exchange failed:', error.message);
        }
    }
}

function buildOAuthUrl() {
    const params = new URLSearchParams({
        client_id: OAUTH_CONFIG.client_id,
        redirect_uri: OAUTH_CONFIG.redirect_uri,
        response_type: 'code',
        scope: OAUTH_CONFIG.scopes.join(' '),
        access_type: 'offline',
        prompt: 'consent',
        state: 'gmail_oauth_' + Date.now()
    });

    return OAUTH_CONFIG.auth_url + '?' + params.toString();
}

async function exchangeCodeForTokens(code) {
    console.log('\n🔄 Exchanging authorization code for tokens...');
    
    const tokenData = {
        client_id: OAUTH_CONFIG.client_id,
        client_secret: OAUTH_CONFIG.client_secret,
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
            body: new URLSearchParams(tokenData)
        });

        const result = await response.json();
        
        if (!response.ok) {
            console.error('❌ Token exchange failed:', result);
            throw new Error('Token exchange failed: ' + (result.error_description || result.error));
        }

        console.log('✅ Tokens received successfully!');
        console.log('🔑 Access Token: ' + result.access_token.substring(0, 20) + '...');
        
        if (result.refresh_token) {
            console.log('🔄 Refresh Token: ' + result.refresh_token.substring(0, 20) + '...');
        }
        
        console.log('⏰ Expires in: ' + result.expires_in + ' seconds');

        // Save tokens
        const tokenData = {
            ...result,
            timestamp: new Date().toISOString(),
            scopes: OAUTH_CONFIG.scopes
        };
        
        writeFileSync('gmail-tokens-backup.json', JSON.stringify(tokenData, null, 2));
        console.log('💾 Tokens backed up to: gmail-tokens-backup.json');

        // Update .env file
        updateEnvFile(result.refresh_token);

        // Test Gmail API access
        await testGmailAccess(result.access_token);

    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    }
}

function updateEnvFile(refreshToken) {
    console.log('\n📝 Updating .env file...');
    
    try {
        const envPath = join(__dirname, '.env');
        let envContent = '';
        
        try {
            envContent = readFileSync(envPath, 'utf8');
        } catch (err) {
            console.log('⚠️  .env file not found, will create new one');
        }

        // Update or add Gmail refresh token
        const tokenLine = 'GMAIL_REFRESH_TOKEN=' + refreshToken;
        
        if (envContent.includes('GMAIL_REFRESH_TOKEN=')) {
            envContent = envContent.replace(/GMAIL_REFRESH_TOKEN=.*/, tokenLine);
        } else {
            envContent += '\n' + tokenLine + '\n';
        }

        writeFileSync(envPath, envContent);
        console.log('✅ .env file updated with Gmail refresh token');

    } catch (error) {
        console.error('❌ Error updating .env file:', error.message);
        console.log('🛠️  Please manually add this line to your .env file:');
        console.log('    GMAIL_REFRESH_TOKEN=' + refreshToken);
    }
}

async function testGmailAccess(accessToken) {
    console.log('\n📧 Testing Gmail API access...');
    
    try {
        const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
            headers: {
                'Authorization': 'Bearer ' + accessToken
            }
        });

        if (response.ok) {
            const profile = await response.json();
            console.log('✅ Gmail API access confirmed:');
            console.log('   Email: ' + profile.emailAddress);
            console.log('   Total Messages: ' + profile.messagesTotal);
            console.log('   Total Threads: ' + profile.threadsTotal);
            
            writeFileSync('gmail-profile.json', JSON.stringify(profile, null, 2));
            console.log('💾 Gmail profile saved to: gmail-profile.json');
            
            console.log('\n🎉 SUCCESS! Gmail OAuth is fully configured and working!');
            console.log('📝 Next steps:');
            console.log('1. Run: node test-providers.js (to test all providers)');
            console.log('2. Run: pnpm run dev (to start your application)');
            console.log('3. Test Claude Desktop MCP integration');
            
        } else {
            console.log('⚠️  Gmail API test failed. Check your OAuth scopes.');
        }
    } catch (error) {
        console.log('⚠️  Error testing Gmail API:', error.message);
    }
}

// Handle interruption
process.on('SIGINT', () => {
    console.log('\n\n⚠️  Setup interrupted by user');
    if (server) {
        server.close();
    }
    process.exit(0);
});