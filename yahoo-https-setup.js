// File: D:\AI\Gits\email-agent_v01\yahoo-https-setup.js
// Yahoo OAuth Setup with HTTPS support

import { createServer } from 'https';
import { createServer as createHttpServer } from 'http';
import { parse } from 'url';
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('🚀 Yahoo OAuth Setup - HTTPS Version');
console.log('====================================\n');

// Check environment variables
const YAHOO_CLIENT_ID = process.env.YAHOO_CLIENT_ID;
const YAHOO_CLIENT_SECRET = process.env.YAHOO_CLIENT_SECRET;
const YAHOO_EMAIL = process.env.YAHOO_EMAIL;

if (!YAHOO_CLIENT_ID || !YAHOO_CLIENT_SECRET) {
    console.error('❌ Missing Yahoo OAuth credentials in .env file');
    process.exit(1);
}

console.log('✅ Yahoo credentials found in .env');
console.log(`📧 Setting up OAuth for: ${YAHOO_EMAIL || 'your Yahoo email'}\n');

// Yahoo OAuth Configuration for available scopes only
const OAUTH_CONFIG = {
    client_id: YAHOO_CLIENT_ID,
    client_secret: YAHOO_CLIENT_SECRET,
    redirect_uri: 'https://localhost:3000/auth/yahoo/callback',
    auth_url: 'https://api.login.yahoo.com/oauth2/request_auth',
    token_url: 'https://api.login.yahoo.com/oauth2/get_token'
};

// Use only available scopes (no mail-r since Mail API isn't available)
const availableScopes = ['openid', 'profile', 'email'];

console.log('⚠️  IMPORTANT NOTICE:');
console.log('📧 Mail API is not available in your Yahoo app permissions.');
console.log('🔧 This setup will get basic profile info and email address.');
console.log('📬 For actual email access, you may need to apply for Mail API separately.\n');

const oauthUrl = buildOAuthUrl(availableScopes);

console.log('🔗 OAuth URL Generated!');
console.log('📝 Follow these steps:\n');

console.log('1️⃣  Update your Yahoo app redirect URI to:');
console.log('    https://localhost:3000/auth/yahoo/callback\n');

console.log('2️⃣  Then click this OAuth URL:');
console.log('    ' + oauthUrl + '\n');

console.log('3️⃣  Steps to complete OAuth:');
console.log('    • Update redirect URI in Yahoo Developer Console');
console.log('    • Click the OAuth URL above');
console.log('    • Sign in to your Yahoo account');
console.log('    • Grant permissions');
console.log('    • You\'ll be redirected to localhost:3000');
console.log('    • The authorization code will be captured automatically\n');

// Save URL to file
const urlData = {
    oauth_url: oauthUrl,
    redirect_uri: OAUTH_CONFIG.redirect_uri,
    scopes: availableScopes,
    timestamp: new Date().toISOString(),
    note: 'Mail API not available - using profile/email scopes only'
};

writeFileSync('yahoo-oauth-info.json', JSON.stringify(urlData, null, 2));
console.log('💾 OAuth info saved to: yahoo-oauth-info.json\n');

// Start HTTPS server (will work with self-signed cert warnings)
let server = null;

console.log('🌐 Starting HTTPS callback server on https://localhost:3000');
console.log('⚠️  You may see browser security warnings - click "Advanced" → "Proceed to localhost"');
console.log('4️⃣  Waiting for OAuth callback...\n');

// Simple HTTP redirect server (since we can't easily create HTTPS certs)
const httpServer = createHttpServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    
    if (parsedUrl.pathname === '/auth/yahoo/callback') {
        // Handle OAuth callback
        handleOAuthCallback(parsedUrl.query, res);
    } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
            <h1>Yahoo OAuth Setup</h1>
            <p>This server is running to capture the OAuth callback.</p>
            <p>Please complete the OAuth flow in another browser tab.</p>
        `);
    }
});

// Start on port 3000 to match redirect URI
httpServer.listen(3000, 'localhost', () => {
    console.log('✅ HTTP callback server started on http://localhost:3000');
    console.log('🔄 Will handle HTTPS redirects from Yahoo\n');
    
    console.log('📋 NEXT STEPS:');
    console.log('1. Go to Yahoo Developer Console');
    console.log('2. Update redirect URI to: https://localhost:3000/auth/yahoo/callback');
    console.log('3. Click the OAuth URL above');
    console.log('4. Accept browser security warnings for localhost');
});

async function handleOAuthCallback(query, res) {
    const { code, error, error_description } = query;
    
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
        `);
        return;
    }
    
    if (code) {
        console.log('\n✅ Authorization code received!');
        console.log('🔑 Code: ' + code.substring(0, 20) + '...');
        
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
            <h1>✅ Yahoo OAuth Success!</h1>
            <p>Authorization code received successfully.</p>
            <p>Return to your terminal to see the results.</p>
            <script>setTimeout(() => window.close(), 3000);</script>
        `);
        
        // Exchange code for tokens
        try {
            await exchangeCodeForTokens(code);
            console.log('\n🎉 OAuth setup complete!');
            
            // Close server
            httpServer.close();
            
        } catch (error) {
            console.error('❌ Token exchange failed:', error.message);
        }
    }
}

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
            throw new Error(`Token exchange failed: ${result.error_description || result.error}`);
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
            scopes_available: availableScopes,
            note: 'These tokens provide profile/email access only - not mail access'
        };
        
        writeFileSync('yahoo-tokens-profile.json', JSON.stringify(tokenData, null, 2));
        console.log('💾 Tokens saved to: yahoo-tokens-profile.json');

        // Try to get user profile info
        await getUserProfile(result.access_token);

    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    }
}

async function getUserProfile(accessToken) {
    console.log('\n📧 Getting user profile information...');
    
    try {
        const response = await fetch('https://api.login.yahoo.com/openid/v1/userinfo', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (response.ok) {
            const profile = await response.json();
            console.log('✅ Profile information retrieved:');
            console.log('   Name: ' + (profile.name || 'Not available'));
            console.log('   Email: ' + (profile.email || 'Not available'));
            console.log('   Verified: ' + (profile.email_verified || 'Unknown'));
            
            writeFileSync('yahoo-profile.json', JSON.stringify(profile, null, 2));
            console.log('💾 Profile saved to: yahoo-profile.json');
        } else {
            console.log('⚠️  Could not retrieve profile information');
        }
    } catch (error) {
        console.log('⚠️  Error getting profile:', error.message);
    }
}

// Handle interruption
process.on('SIGINT', () => {
    console.log('\n\n⚠️  Setup interrupted by user');
    if (httpServer) {
        httpServer.close();
    }
    process.exit(0);
});