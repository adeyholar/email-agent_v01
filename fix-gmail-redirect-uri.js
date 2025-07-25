// File: D:\AI\Gits\email-agent_v01\fix-gmail-redirect-uri.js
// Fix Gmail OAuth Redirect URI Mismatch Error
// Solves "Error 400: redirect_uri_mismatch" issue

import { google } from 'googleapis';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config();

console.log('🔧 Gmail OAuth Redirect URI Fix');
console.log('===============================');
console.log('Fixing "Error 400: redirect_uri_mismatch"\n');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.trim());
        });
    });
}

async function fixRedirectUriMismatch() {
    console.log('📋 The Problem:');
    console.log('Your Google Cloud Console OAuth app has the wrong redirect URI configured.');
    console.log('Your app is trying to use "urn:ietf:wg:oauth:2.0:oob" but Google expects something else.\n');
    
    console.log('🔧 Solution Options:');
    console.log('1. Fix the redirect URI in Google Cloud Console (Recommended)');
    console.log('2. Use a different OAuth flow with localhost');
    console.log('3. Create a completely new OAuth app\n');
    
    const choice = await askQuestion('Which option would you like? (1, 2, or 3): ');
    
    switch (choice) {
        case '1':
            await fixRedirectUriInConsole();
            break;
        case '2':
            await useLocalhostFlow();
            break;
        case '3':
            await createNewOAuthApp();
            break;
        default:
            console.log('Invalid choice. Please run the script again.');
    }
}

async function fixRedirectUriInConsole() {
    console.log('\n🔧 Option 1: Fix Redirect URI in Google Cloud Console');
    console.log('==================================================');
    console.log('');
    console.log('📋 Step-by-Step Instructions:');
    console.log('');
    console.log('1. Go to Google Cloud Console: https://console.cloud.google.com');
    console.log('2. Select your project (or the one with your OAuth credentials)');
    console.log('3. Go to "APIs & Services" > "Credentials"');
    console.log('4. Find your OAuth 2.0 Client ID and click the pencil/edit icon');
    console.log('5. In the "Authorized redirect URIs" section:');
    console.log('   - REMOVE any existing redirect URIs');
    console.log('   - ADD this exact URI: urn:ietf:wg:oauth:2.0:oob');
    console.log('   - Click "SAVE"');
    console.log('');
    console.log('⚠️ Important: The URI must be exactly: urn:ietf:wg:oauth:2.0:oob');
    console.log('   (No http://, no localhost, exactly as shown above)');
    console.log('');
    
    await askQuestion('Press Enter when you\'ve updated the redirect URI in Google Cloud Console...');
    
    // Test the OAuth flow
    console.log('\n🧪 Testing the Fixed OAuth Flow:');
    console.log('================================');
    
    const oauth2Client = new google.auth.OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET,
        'urn:ietf:wg:oauth:2.0:oob'
    );
    
    const scopes = [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
    ];
    
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent'
    });
    
    console.log('📋 Now test the OAuth flow:');
    console.log('1. Open this URL in your browser:');
    console.log('');
    console.log(authUrl);
    console.log('');
    console.log('2. Sign in and grant permissions');
    console.log('3. Copy the authorization code from the page');
    console.log('');
    
    const authCode = await askQuestion('Enter the authorization code (or "skip" to exit): ');
    
    if (authCode && authCode !== 'skip') {
        try {
            const { tokens } = await oauth2Client.getToken(authCode);
            console.log('\n✅ SUCCESS! OAuth flow worked correctly.');
            console.log('Your redirect URI is now fixed.');
            console.log('');
            console.log('🔧 Update your .env file:');
            console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
            console.log('');
            console.log('🎉 Gmail OAuth is now working!');
            
        } catch (error) {
            console.log('\n❌ OAuth flow still failed:', error.message);
            console.log('Try option 2 or 3 for alternative solutions.');
        }
    }
}

async function useLocalhostFlow() {
    console.log('\n🔧 Option 2: Use Localhost OAuth Flow');
    console.log('===================================');
    console.log('');
    console.log('This creates a temporary local server to handle the OAuth callback.');
    console.log('');
    console.log('📋 Steps:');
    console.log('1. Update your Google Cloud Console redirect URI to: http://localhost:3333/oauth/callback');
    console.log('2. We\'ll create a temporary server to handle the OAuth response');
    console.log('');
    
    const proceed = await askQuestion('Do you want to proceed? (y/n): ');
    
    if (proceed.toLowerCase() === 'y') {
        console.log('');
        console.log('📋 First, update your Google Cloud Console:');
        console.log('1. Go to: https://console.cloud.google.com');
        console.log('2. APIs & Services > Credentials');
        console.log('3. Edit your OAuth client');
        console.log('4. Set redirect URI to: http://localhost:3333/oauth/callback');
        console.log('5. Save the changes');
        console.log('');
        
        await askQuestion('Press Enter when you\'ve updated the redirect URI...');
        
        // Create temporary OAuth server
        await createTemporaryOAuthServer();
    }
}

async function createTemporaryOAuthServer() {
    console.log('\n🚀 Starting temporary OAuth server...');
    
    const express = await import('express');
    const app = express.default();
    
    const oauth2Client = new google.auth.OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET,
        'http://localhost:3333/oauth/callback'
    );
    
    const scopes = [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
    ];
    
    let server;
    
    // OAuth callback handler
    app.get('/oauth/callback', async (req, res) => {
        const code = req.query.code;
        
        if (code) {
            try {
                const { tokens } = await oauth2Client.getToken(code);
                
                res.send(`
                    <html>
                        <body style="font-family: Arial; padding: 40px; text-align: center;">
                            <h1 style="color: green;">✅ OAuth Success!</h1>
                            <p>Gmail permissions have been granted successfully.</p>
                            <p>You can close this window and return to the terminal.</p>
                            <div style="background: #f0f0f0; padding: 20px; margin: 20px; border-radius: 5px;">
                                <h3>Update your .env file:</h3>
                                <code>GMAIL_REFRESH_TOKEN=${tokens.refresh_token}</code>
                            </div>
                        </body>
                    </html>
                `);
                
                console.log('\n✅ OAuth Success!');
                console.log('🔧 Update your .env file with:');
                console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
                console.log('\n🎉 Gmail OAuth is now working!');
                
                // Close server
                setTimeout(() => {
                    server.close();
                    rl.close();
                    process.exit(0);
                }, 2000);
                
            } catch (error) {
                res.send(`
                    <html>
                        <body style="font-family: Arial; padding: 40px; text-align: center;">
                            <h1 style="color: red;">❌ OAuth Failed</h1>
                            <p>Error: ${error.message}</p>
                            <p>Please check the terminal for more details.</p>
                        </body>
                    </html>
                `);
                console.log('\n❌ OAuth failed:', error.message);
            }
        } else {
            res.send('No authorization code received');
        }
    });
    
    server = app.listen(3333, () => {
        console.log('✅ Temporary OAuth server running on http://localhost:3333');
        
        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            prompt: 'consent'
        });
        
        console.log('\n📋 Complete the OAuth flow:');
        console.log('1. Open this URL in your browser:');
        console.log('');
        console.log(authUrl);
        console.log('');
        console.log('2. Sign in and grant permissions');
        console.log('3. You\'ll be redirected back automatically');
        console.log('4. Check this terminal for the results');
        console.log('');
        console.log('⏳ Waiting for OAuth completion...');
    });
}

async function createNewOAuthApp() {
    console.log('\n🔧 Option 3: Create New OAuth App');
    console.log('=================================');
    console.log('');
    console.log('This creates a completely fresh OAuth app with proper settings.');
    console.log('');
    console.log('📋 Steps:');
    console.log('1. Go to Google Cloud Console: https://console.cloud.google.com');
    console.log('2. Create a new project or select existing one');
    console.log('3. Enable Gmail API');
    console.log('4. Configure OAuth consent screen');
    console.log('5. Create new OAuth 2.0 credentials');
    console.log('6. Set proper redirect URI');
    console.log('');
    console.log('📖 Detailed instructions:');
    console.log('- Run: node setup-gmail-cloud-console.js');
    console.log('- Follow the complete setup guide');
    console.log('- Use the new credentials in your .env file');
    console.log('');
    console.log('This is the most thorough solution if other options don\'t work.');
}

// Main execution
async function main() {
    console.log('🔍 Analyzing the redirect_uri_mismatch error...');
    console.log('');
    console.log('Error Details:');
    console.log('- Error Code: 400');
    console.log('- Error Type: redirect_uri_mismatch');
    console.log('- Problem: Google OAuth redirect URI configuration mismatch');
    console.log('');
    
    await fixRedirectUriMismatch();
}

main().catch((error) => {
    console.error('❌ Error:', error.message);
    rl.close();
});