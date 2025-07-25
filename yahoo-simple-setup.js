// File: D:\AI\Gits\email-agent_v01\yahoo-simple-setup.js
// Simplified Yahoo OAuth Setup - Standalone Version

import { createServer } from 'http';
import { parse } from 'url';
import { writeFileSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('🚀 Yahoo OAuth Setup - Simplified Version');
console.log('=========================================\n');

// Check environment variables
const YAHOO_CLIENT_ID = process.env.YAHOO_CLIENT_ID;
const YAHOO_CLIENT_SECRET = process.env.YAHOO_CLIENT_SECRET;
const YAHOO_EMAIL = process.env.YAHOO_EMAIL;

if (!YAHOO_CLIENT_ID || !YAHOO_CLIENT_SECRET) {
    console.error('❌ Missing Yahoo OAuth credentials in .env file');
    console.error('Required: YAHOO_CLIENT_ID and YAHOO_CLIENT_SECRET');
    process.exit(1);
}

console.log('✅ Yahoo credentials found in .env');
console.log(`📧 Setting up OAuth for: ${YAHOO_EMAIL || 'your Yahoo email'}\n`);

// Yahoo OAuth Configuration
const OAUTH_CONFIG = {
    client_id: YAHOO_CLIENT_ID,
    client_secret: YAHOO_CLIENT_SECRET,
    redirect_uri: 'http://localhost:8888/auth/yahoo/callback',
    auth_url: 'https://api.login.yahoo.com/oauth2/request_auth',
    token_url: 'https://api.login.yahoo.com/oauth2/get_token'
};

// Build OAuth URLs
const fullScopeUrl = buildOAuthUrl(['mail-r', 'mail-w', 'openid', 'profile']);
const minimalScopeUrl = buildOAuthUrl(['mail-r', 'openid']);

console.log('🔗 OAuth URLs Generated!');
console.log('📝 Follow these steps:\n');

console.log('1️⃣  Try the FULL SCOPE URL first:');
console.log(`    ${fullScopeUrl}\n`);

console.log('2️⃣  If that fails, try the MINIMAL SCOPE URL:');
console.log(`    ${minimalScopeUrl}\n`);

console.log('3️⃣  Steps to complete OAuth:');
console.log('    • Click one of the URLs above');
console.log('    • Sign in to your Yahoo account'); 
console.log('    • Grant permissions');
console.log('    • You\'ll be redirected to localhost:8888');
console.log('    • The authorization code will be captured automatically\n');

// Save URLs to file for easy access
const urls = {
    full_scope: fullScopeUrl,
    minimal_scope: minimalScopeUrl,
    timestamp: new Date().toISOString()
};

writeFileSync('yahoo-oauth-urls.json', JSON.stringify(urls, null, 2));
console.log('💾 OAuth URLs saved to: yahoo-oauth-urls.json\n');

// Start OAuth callback server
let authCode = null;
let server = null;

console.log('🌐 Starting OAuth callback server on http://localhost:8888');
console.log('4️⃣  Waiting for OAuth callback...');
console.log('    (Leave this script running and complete the OAuth flow)\n');

server = createServer(async (req, res) => {
    const parsedUrl = parse(req.url, true);
    
    if (parsedUrl.pathname === '/auth/yahoo/callback') {
        const { code, error, error_description } = parsedUrl.query;
        
        if (error) {
            console.error(`❌ OAuth Error: ${error}`);
            if (error_description) {
                console.error(`   Description: ${error_description}`);
            }
            
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end(`
                <h1>OAuth Error</h1>
                <p>Error: ${error}</p>
                <p>Description: ${error_description || 'Unknown error'}</p>
                <p>Please try the minimal scope URL or check your Yahoo app configuration.</p>
            `);
            return;
        }
        
        if (code) {
            authCode = code;
            console.log('\n✅ Authorization code received!');
            console.log(`🔑 Code: ${code.substring(0, 20)}...`);
            
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
                <h1>✅ Yahoo OAuth Success!</h1>
                <p>Authorization code received successfully.</p>
                <p>Return to your terminal to complete the setup.</p>
                <script>setTimeout(() => window.close(), 3000);</script>
            `);
            
            // Exchange code for tokens
            await exchangeCodeForTokens(code);
            
            // Close server
            server.close();
            return;
        }
    }
    
    // Default response
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end('<h1>404 - Not Found</h1><p>This is the Yahoo OAuth callback server.</p>');
});

server.listen(8888, 'localhost', () => {
    console.log('✅ OAuth callback server started successfully');
});

server.on('error', (err) => {
    console.error('❌ Server error:', err.message);
    process.exit(1);
});

// Function to build OAuth URL
function buildOAuthUrl(scopes) {
    const params = new URLSearchParams({
        client_id: OAUTH_CONFIG.client_id,
        redirect_uri: OAUTH_CONFIG.redirect_uri,
        response_type: 'code',
        scope: scopes.join(' '),
        state: 'yahoo_oauth_' + Date.now()
    });

    return `${OAUTH_CONFIG.auth_url}?${params.toString()}`;
}

// Function to exchange authorization code for tokens
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
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(`${OAUTH_CONFIG.client_id}:${OAUTH_CONFIG.client_secret}`).toString('base64')}`
            },
            body: new URLSearchParams(tokenData)
        });

        const result = await response.json();
        
        if (!response.ok) {
            console.error('❌ Token exchange failed:', result);
            throw new Error(`Token exchange failed: ${result.error_description || result.error}`);
        }

        console.log('✅ Tokens received successfully!');
        console.log(`🔑 Access Token: ${result.access_token.substring(0, 20)}...`);
        console.log(`🔄 Refresh Token: ${result.refresh_token.substring(0, 20)}...`);
        console.log(`⏰ Expires in: ${result.expires_in} seconds`);

        // Save tokens to file for backup
        writeFileSync('yahoo-tokens-backup.json', JSON.stringify(result, null, 2));
        console.log('💾 Tokens backed up to: yahoo-tokens-backup.json');

        // Update .env file
        updateEnvFile(result.refresh_token);
        
        console.log('\n🎉 Yahoo OAuth setup complete!');
        console.log('✅ Refresh token saved to .env file');
        console.log('🔄 You can now restart your application');
        console.log('\n📝 Next steps:');
        console.log('1. Run: node test-providers.js (to verify setup)');
        console.log('2. Run: pnpm run dev (to start the application)');

    } catch (error) {
        console.error('❌ Error exchanging code for tokens:', error.message);
        throw error;
    }
}

// Function to update .env file
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

        // Update or add Yahoo refresh token
        const tokenLine = `YAHOO_REFRESH_TOKEN=${refreshToken}`;
        
        if (envContent.includes('YAHOO_REFRESH_TOKEN=')) {
            // Update existing line
            envContent = envContent.replace(/YAHOO_REFRESH_TOKEN=.*/, tokenLine);
        } else {
            // Add new line
            envContent += `\n${tokenLine}\n`;
        }

        // Write updated .env file
        writeFileSync(envPath, envContent);
        console.log('✅ .env file updated with Yahoo refresh token');

    } catch (error) {
        console.error('❌ Error updating .env file:', error.message);
        console.log(`🛠️  Please manually add this line to your .env file:`);
        console.log(`    YAHOO_REFRESH_TOKEN=${refreshToken}`);
    }
}

// Handle script interruption
process.on('SIGINT', () => {
    console.log('\n\n⚠️  Setup interrupted by user');
    if (server) {
        server.close();
    }
    process.exit(0);
});