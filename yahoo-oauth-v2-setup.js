// File: D:\AI\Gits\email-agent_v01\yahoo-oauth-v2-setup.js
// Yahoo OAuth 2.0 Setup - Version 2.0
// Addresses scope issues and Yahoo API changes

import { createServer } from 'http';
import { parse } from 'url';
import { writeFileSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Yahoo OAuth Configuration
const YAHOO_CONFIG = {
    client_id: process.env.YAHOO_CLIENT_ID,
    client_secret: process.env.YAHOO_CLIENT_SECRET,
    redirect_uri: 'http://localhost:8888/auth/yahoo/callback',
    
    // Updated scopes for Yahoo Mail API 2024/2025
    scopes: [
        'mail-r',     // Read mail
        'mail-w',     // Write mail (if needed)
        'openid',     // Basic profile
        'profile'     // User info
    ],
    
    // Alternative minimal scope if above fails
    minimal_scopes: ['mail-r', 'openid'],
    
    // Yahoo OAuth endpoints (updated 2024)
    auth_url: 'https://api.login.yahoo.com/oauth2/request_auth',
    token_url: 'https://api.login.yahoo.com/oauth2/get_token'
};

class YahooOAuthSetup {
    constructor() {
        this.server = null;
        this.authCode = null;
        this.isServerRunning = false;
        this.tokens = null;
    }

    async setup() {
        console.log('🚀 Yahoo OAuth 2.0 Setup - Version 2.0');
        console.log('=======================================\n');

        // Check environment variables
        if (!YAHOO_CONFIG.client_id || !YAHOO_CONFIG.client_secret) {
            console.error('❌ Missing Yahoo OAuth credentials in .env file');
            console.error('Required: YAHOO_CLIENT_ID and YAHOO_CLIENT_SECRET');
            process.exit(1);
        }

        console.log('✅ Yahoo credentials found in .env');
        console.log(`📧 Setting up OAuth for: ${process.env.YAHOO_EMAIL || 'your Yahoo email'}\n`);

        // Start local server for OAuth callback
        await this.startCallbackServer();

        // Generate OAuth URLs with different scope options
        this.generateOAuthUrls();
        
        console.log('\n🔗 OAuth URLs Generated!');
        console.log('📝 Follow these steps:\n');
        
        console.log('1️⃣  Try the FULL SCOPE URL first:');
        console.log(`    ${this.getAuthUrl(YAHOO_CONFIG.scopes)}\n`);
        
        console.log('2️⃣  If that fails, try the MINIMAL SCOPE URL:');
        console.log(`    ${this.getAuthUrl(YAHOO_CONFIG.minimal_scopes)}\n`);
        
        console.log('3️⃣  Steps to complete OAuth:');
        console.log('    • Click one of the URLs above');
        console.log('    • Sign in to your Yahoo account');
        console.log('    • Grant permissions');
        console.log('    • You\'ll be redirected to localhost:8888');
        console.log('    • The authorization code will be captured automatically\n');
        
        console.log('4️⃣  Waiting for OAuth callback...');
        console.log('    (Leave this script running and complete the OAuth flow)\n');

        // Wait for OAuth callback
        await this.waitForCallback();
        
        // Exchange code for tokens
        await this.exchangeCodeForTokens();
        
        // Update .env file
        this.updateEnvFile();
        
        console.log('\n🎉 Yahoo OAuth setup complete!');
        console.log('✅ Refresh token saved to .env file');
        console.log('🔄 You can now restart your application');
        
        this.cleanup();
    }

    getAuthUrl(scopes) {
        const params = new URLSearchParams({
            client_id: YAHOO_CONFIG.client_id,
            redirect_uri: YAHOO_CONFIG.redirect_uri,
            response_type: 'code',
            scope: scopes.join(' '),
            state: 'yahoo_oauth_' + Date.now()
        });

        return `${YAHOO_CONFIG.auth_url}?${params.toString()}`;
    }

    generateOAuthUrls() {
        // Save URLs to file for easy access
        const urls = {
            full_scope: this.getAuthUrl(YAHOO_CONFIG.scopes),
            minimal_scope: this.getAuthUrl(YAHOO_CONFIG.minimal_scopes),
            timestamp: new Date().toISOString()
        };

        writeFileSync('yahoo-oauth-urls.json', JSON.stringify(urls, null, 2));
        console.log('💾 OAuth URLs saved to: yahoo-oauth-urls.json');
    }

    async startCallbackServer() {
        return new Promise((resolve, reject) => {
            this.server = createServer((req, res) => {
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
                        this.authCode = code;
                        console.log('\n✅ Authorization code received!');
                        console.log(`🔑 Code: ${code.substring(0, 20)}...`);
                        
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(`
                            <h1>✅ Yahoo OAuth Success!</h1>
                            <p>Authorization code received successfully.</p>
                            <p>Return to your terminal to complete the setup.</p>
                            <script>setTimeout(() => window.close(), 3000);</script>
                        `);
                        
                        // Close server after successful callback
                        setTimeout(() => {
                            this.server.close();
                            this.isServerRunning = false;
                        }, 1000);
                        
                        return;
                    }
                }
                
                // Default response
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 - Not Found</h1><p>This is the Yahoo OAuth callback server.</p>');
            });

            this.server.listen(8888, 'localhost', () => {
                this.isServerRunning = true;
                console.log('🌐 OAuth callback server started on http://localhost:8888');
                resolve();
            });

            this.server.on('error', (err) => {
                console.error('❌ Server error:', err.message);
                reject(err);
            });
        });
    }

    async waitForCallback() {
        return new Promise((resolve) => {
            const checkForCode = () => {
                if (this.authCode) {
                    resolve();
                } else if (this.isServerRunning) {
                    setTimeout(checkForCode, 1000);
                } else {
                    console.log('\n⏳ Waiting for OAuth completion...');
                    setTimeout(checkForCode, 1000);
                }
            };
            checkForCode();
        });
    }

    async exchangeCodeForTokens() {
        console.log('\n🔄 Exchanging authorization code for tokens...');
        
        const tokenData = {
            client_id: YAHOO_CONFIG.client_id,
            client_secret: YAHOO_CONFIG.client_secret,
            redirect_uri: YAHOO_CONFIG.redirect_uri,
            code: this.authCode,
            grant_type: 'authorization_code'
        };

        try {
            const response = await fetch(YAHOO_CONFIG.token_url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${Buffer.from(`${YAHOO_CONFIG.client_id}:${YAHOO_CONFIG.client_secret}`).toString('base64')}`
                },
                body: new URLSearchParams(tokenData)
            });

            const result = await response.json();
            
            if (!response.ok) {
                console.error('❌ Token exchange failed:', result);
                throw new Error(`Token exchange failed: ${result.error_description || result.error}`);
            }

            this.tokens = result;
            console.log('✅ Tokens received successfully!');
            console.log(`🔑 Access Token: ${result.access_token.substring(0, 20)}...`);
            console.log(`🔄 Refresh Token: ${result.refresh_token.substring(0, 20)}...`);
            console.log(`⏰ Expires in: ${result.expires_in} seconds`);

            // Save tokens to file for backup
            writeFileSync('yahoo-tokens-backup.json', JSON.stringify(result, null, 2));
            console.log('💾 Tokens backed up to: yahoo-tokens-backup.json');

        } catch (error) {
            console.error('❌ Error exchanging code for tokens:', error.message);
            throw error;
        }
    }

    updateEnvFile() {
        console.log('\n📝 Updating .env file...');
        
        try {
            // Read current .env file
            const envPath = join(__dirname, '.env');
            let envContent = '';
            
            try {
                envContent = readFileSync(envPath, 'utf8');
            } catch (err) {
                console.log('⚠️  .env file not found, will create new one');
            }

            // Update or add Yahoo refresh token
            const tokenLine = `YAHOO_REFRESH_TOKEN=${this.tokens.refresh_token}`;
            
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
            console.log(`    YAHOO_REFRESH_TOKEN=${this.tokens.refresh_token}`);
        }
    }

    cleanup() {
        if (this.server && this.isServerRunning) {
            this.server.close();
        }
        console.log('\n🧹 Cleanup complete');
    }
}

// Handle script interruption
process.on('SIGINT', () => {
    console.log('\n\n⚠️  Setup interrupted by user');
    process.exit(0);
});

// Run the setup
if (import.meta.url === `file://${process.argv[1]}`) {
    const setup = new YahooOAuthSetup();
    setup.setup().catch((error) => {
        console.error('\n❌ Setup failed:', error.message);
        process.exit(1);
    });
}

export { YahooOAuthSetup };