// fixed-yahoo-setup.js - Yahoo OAuth with Correct Scopes

import dotenv from 'dotenv';
dotenv.config();

async function fixedYahooOAuth() {
    console.log('🔐 Yahoo Mail OAuth Setup (Fixed Scopes)\n');
    
    const clientId = process.env.YAHOO_CLIENT_ID;
    const clientSecret = process.env.YAHOO_CLIENT_SECRET;
    const email = process.env.YAHOO_EMAIL;
    
    if (!clientId || !clientSecret) {
        console.log('❌ Missing Yahoo credentials in .env file!');
        return;
    }
    
    console.log('✅ Found Yahoo credentials in .env');
    console.log(`📧 Yahoo Email: ${email}\n`);
    
    // Try different scope combinations that Yahoo accepts
    const scopeOptions = [
        // Option 1: Basic mail scope (most likely to work)
        'mail-r',
        
        // Option 2: Yahoo's documented scopes
        'openid email profile',
        
        // Option 3: Specific Yahoo Mail scopes
        'sdct-r sdct-w',
        
        // Option 4: Basic read scope only
        'openid'
    ];
    
    console.log('🔄 Trying different scope configurations...\n');
    
    scopeOptions.forEach((scope, index) => {
        console.log(`${index + 1}️⃣ Option ${index + 1}: ${scope}`);
        
        const authUrl = `https://api.login.yahoo.com/oauth2/request_auth?` +
            `client_id=${encodeURIComponent(clientId)}&` +
            `redirect_uri=${encodeURIComponent('https://localhost:3000/auth/yahoo/callback')}&` +
            `response_type=code&` +
            `scope=${encodeURIComponent(scope)}`;
        
        console.log(`   ${authUrl}\n`);
    });
    
    console.log('📋 Instructions:');
    console.log('1. Try Option 1 first (mail-r scope)');
    console.log('2. If that fails, try Option 2 (openid email profile)');
    console.log('3. Continue until you find one that works');
    console.log('4. When you get a successful redirect with code=..., run:');
    console.log('   node get-yahoo-token.js YOUR_AUTH_CODE\n');
    
    // Also check your Yahoo Developer Console settings
    console.log('🔍 Also check your Yahoo Developer Console:');
    console.log('1. Go to https://developer.yahoo.com/apps/');
    console.log('2. Select your "Email Agent MCP" app');
    console.log('3. Check "App Permissions" or "API Permissions"');
    console.log('4. Make sure these are enabled:');
    console.log('   - Mail API');
    console.log('   - Read/Write access');
    console.log('   - Profiles (Social Directory)');
    console.log('');
    
    // Update the token exchange script with better error handling
    await createBetterTokenScript();
}

async function createBetterTokenScript() {
    const betterTokenScript = `// get-yahoo-token-fixed.js - Better token exchange with error details
import dotenv from 'dotenv';
dotenv.config();

const authCode = process.argv[2];

if (!authCode) {
    console.log('❌ Please provide authorization code:');
    console.log('node get-yahoo-token-fixed.js YOUR_AUTHORIZATION_CODE');
    process.exit(1);
}

async function exchangeTokenWithDetails() {
    console.log('🔄 Exchanging authorization code for tokens...');
    console.log('Client ID:', process.env.YAHOO_CLIENT_ID ? 'Present' : 'Missing');
    console.log('Client Secret:', process.env.YAHOO_CLIENT_SECRET ? 'Present' : 'Missing');
    console.log('Auth Code:', authCode.substring(0, 10) + '...');
    console.log('');

    try {
        const response = await fetch('https://api.login.yahoo.com/oauth2/get_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': \`Basic \${Buffer.from(\`\${process.env.YAHOO_CLIENT_ID}:\${process.env.YAHOO_CLIENT_SECRET}\`).toString('base64')}\`
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: authCode,
                redirect_uri: 'https://localhost:3000/auth/yahoo/callback'
            })
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        const responseText = await response.text();
        console.log('Response body:', responseText);

        if (!response.ok) {
            throw new Error(\`Token exchange failed: \${response.status} - \${responseText}\`);
        }

        const tokens = JSON.parse(responseText);
        
        console.log('\\n✅ Success! Add this to your .env file:');
        console.log(\`YAHOO_REFRESH_TOKEN=\${tokens.refresh_token}\`);
        
        if (tokens.access_token) {
            console.log('\\n🧪 Testing access token...');
            
            // Test the access token with a simple API call
            const testResponse = await fetch('https://api.login.yahoo.com/openid_connect/userinfo', {
                headers: {
                    'Authorization': \`Bearer \${tokens.access_token}\`
                }
            });
            
            if (testResponse.ok) {
                const userInfo = await testResponse.json();
                console.log('✅ Access token works! User info:', userInfo);
            } else {
                console.log('⚠️ Access token test failed, but refresh token should still work');
            }
        }
        
    } catch (error) {
        console.log('❌ Token exchange failed:', error.message);
        console.log('\\nTroubleshooting:');
        console.log('1. Check if your Yahoo app has the right permissions');
        console.log('2. Verify redirect URI matches exactly');
        console.log('3. Make sure the authorization code is fresh (expires quickly)');
        console.log('4. Try a different scope in the authorization URL');
    }
}

exchangeTokenWithDetails();`;

    const fs = await import('fs/promises');
    await fs.writeFile('get-yahoo-token-fixed.js', betterTokenScript);
    console.log('📝 Created get-yahoo-token-fixed.js with better error handling');
}

fixedYahooOAuth().catch(console.error);