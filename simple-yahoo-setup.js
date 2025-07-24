// simple-yahoo-setup.js - Simplified Yahoo OAuth Setup (No external dependencies)

import dotenv from 'dotenv';
dotenv.config();

async function yahooOAuthInstructions() {
    console.log('🔐 Yahoo Mail OAuth Setup (Safe Method)\n');
    
    // Check environment variables
    const clientId = process.env.YAHOO_CLIENT_ID;
    const clientSecret = process.env.YAHOO_CLIENT_SECRET;
    const email = process.env.YAHOO_EMAIL;
    
    if (!clientId || !clientSecret) {
        console.log('❌ Missing Yahoo credentials in .env file!\n');
        console.log('Please add these to your .env file:');
        console.log('YAHOO_CLIENT_ID=your_yahoo_client_id');
        console.log('YAHOO_CLIENT_SECRET=your_yahoo_client_secret');
        console.log('YAHOO_EMAIL=your_email@yahoo.com\n');
        console.log('Get these from: https://developer.yahoo.com/\n');
        return;
    }
    
    console.log('✅ Found Yahoo credentials in .env');
    console.log(`📧 Yahoo Email: ${email || 'Not specified'}\n`);
    
    // Manual OAuth instructions (safer than automated)
    console.log('📋 Manual Yahoo OAuth Setup Steps:\n');
    
    console.log('1️⃣ In Yahoo Developer Console:');
    console.log('   - Set redirect URI to: https://localhost:3000/auth/yahoo/callback');
    console.log('   - OR use: https://developer.yahoo.com/oauth2/guide/flows_webserver/');
    console.log('');
    
    console.log('2️⃣ Visit this authorization URL:');
    const authUrl = `https://api.login.yahoo.com/oauth2/request_auth?` +
        `client_id=${encodeURIComponent(clientId)}&` +
        `redirect_uri=${encodeURIComponent('https://localhost:3000/auth/yahoo/callback')}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent('mail-r mail-w')}`;
    
    console.log(authUrl);
    console.log('');
    
    console.log('3️⃣ After authorization, you\'ll get redirected to a URL like:');
    console.log('https://localhost:3000/auth/yahoo/callback?code=AUTHORIZATION_CODE');
    console.log('');
    
    console.log('4️⃣ Copy the authorization code and run this command:');
    console.log('node get-yahoo-token.js AUTHORIZATION_CODE');
    console.log('');
    
    console.log('5️⃣ The script will give you a refresh token to add to .env');
    console.log('');
    
    // Create the token exchange script
    await createTokenExchangeScript();
    
    console.log('✅ Setup files created! Follow the steps above.');
}

async function createTokenExchangeScript() {
    const tokenScript = `// get-yahoo-token.js - Exchange authorization code for tokens
import dotenv from 'dotenv';
dotenv.config();

const authCode = process.argv[2];

if (!authCode) {
    console.log('❌ Please provide authorization code:');
    console.log('node get-yahoo-token.js YOUR_AUTHORIZATION_CODE');
    process.exit(1);
}

async function exchangeToken() {
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

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(\`Token exchange failed: \${response.status} - \${errorText}\`);
        }

        const tokens = await response.json();
        
        console.log('✅ Success! Add this to your .env file:');
        console.log(\`YAHOO_REFRESH_TOKEN=\${tokens.refresh_token}\`);
        
    } catch (error) {
        console.log('❌ Token exchange failed:', error.message);
    }
}

exchangeToken();`;

    // Write the token exchange script
    const fs = await import('fs/promises');
    await fs.writeFile('get-yahoo-token.js', tokenScript);
    console.log('📝 Created get-yahoo-token.js for token exchange');
}

yahooOAuthInstructions().catch(console.error);