# Multi-Provider Email OAuth Setup Guide

This guide covers setting up OAuth for Gmail, Yahoo Mail, and AOL Mail.

## Gmail Setup (Already Done)
✅ Follow the existing oauth-setup.md instructions for Gmail.

## Yahoo Mail OAuth Setup

### 1. Create Yahoo Developer App
1. Go to [Yahoo Developer Network](https://developer.yahoo.com/)
2. Sign in with your Yahoo account
3. Create a new app:
   - Application Name: "Email Agent MCP"
   - Application Type: "Web Application"
   - Description: "Personal email management with AI"

### 2. Configure OAuth Settings
- **Redirect URI**: http://localhost:3000/auth/yahoo/callback
- **Permissions**: Mail Read/Write
- **API Permissions**: 
  - Mail API (mail-r, mail-w)

### 3. Get Credentials
- Copy **Client ID** → YAHOO_CLIENT_ID in .env
- Copy **Client Secret** → YAHOO_CLIENT_SECRET in .env
- Note your Yahoo email → YAHOO_EMAIL in .env

### 4. Test Connection
`powershell
# In your app, visit the Yahoo auth URL and complete OAuth flow
# The refresh token will be displayed - save it as YAHOO_REFRESH_TOKEN
`

## AOL Mail OAuth Setup

### 1. AOL Uses Yahoo Infrastructure
AOL Mail uses Yahoo's OAuth system since Verizon acquired Yahoo.

### 2. Create App (Same as Yahoo)
1. Use the same Yahoo Developer console
2. Create another app or use the same one
3. AOL emails work with Yahoo OAuth

### 3. Configure for AOL
- **Redirect URI**: http://localhost:3000/auth/aol/callback
- **Email Domain**: Use your @aol.com email address
- **Same API Permissions**: Mail Read/Write

### 4. Get AOL Credentials
- Use same Client ID/Secret or create separate ones
- Set AOL_EMAIL to your @aol.com address
- Complete OAuth flow for AOL refresh token

## Security Notes

### App Passwords (Alternative Method)
If OAuth seems complex, you can use App Passwords:

**Yahoo Mail App Password:**
1. Go to Yahoo Account Security
2. Enable 2-Step Verification
3. Generate App Password for "Mail"
4. Use this instead of OAuth (less secure but simpler)

**AOL Mail App Password:**
1. Go to AOL Account Security  
2. Enable 2-Step Verification
3. Generate App Password for "Other App"
4. Use this for IMAP authentication

### Environment Variables Summary
`nv
# Gmail (OAuth 2.0)
GMAIL_CLIENT_ID=your_gmail_client_id
GMAIL_CLIENT_SECRET=your_gmail_client_secret  
GMAIL_REFRESH_TOKEN=your_gmail_refresh_token

# Yahoo (OAuth 2.0 or App Password)
YAHOO_CLIENT_ID=your_yahoo_client_id
YAHOO_CLIENT_SECRET=your_yahoo_client_secret
YAHOO_REFRESH_TOKEN=your_yahoo_refresh_token
YAHOO_EMAIL=yourname@yahoo.com

# AOL (OAuth 2.0 or App Password)  
AOL_CLIENT_ID=your_aol_client_id
AOL_CLIENT_SECRET=your_aol_client_secret
AOL_REFRESH_TOKEN=your_aol_refresh_token
AOL_EMAIL=yourname@aol.com
`

## Testing Connections

### Test Individual Providers
`javascript
// Test Yahoo
const yahoo = new YahooConnector('yahoo');
await yahoo.initialize();
const emails = await yahoo.searchEmails({ maxResults: 5 });

// Test AOL
const aol = new YahooConnector('aol');
await aol.initialize(); 
const emails = await aol.searchEmails({ maxResults: 5 });
`

### Test All Providers
`javascript
const manager = new EmailProviderManager();
await manager.initializeProviders();
const status = manager.getProviderStatus();
console.log(status);
`

## Troubleshooting

### Common Issues

**Yahoo/AOL Authentication Fails:**
- Check if 2-Step Verification is enabled
- Verify redirect URIs match exactly
- Ensure app permissions include mail-r and mail-w

**IMAP Connection Issues:**
- Yahoo IMAP: imap.mail.yahoo.com:993 (SSL)
- AOL IMAP: imap.aol.com:993 (SSL)
- Check firewall settings

**Rate Limiting:**
- Yahoo: 10 requests/minute for free accounts
- AOL: Similar to Yahoo limits
- Implement proper rate limiting in connectors

### Support Links
- [Yahoo Developer Docs](https://developer.yahoo.com/oauth2/guide/)
- [Yahoo Mail API](https://developer.yahoo.com/mail/)
- [AOL Help Center](https://help.aol.com/articles/how-do-i-use-other-email-applications-to-send-and-receive-my-aol-mail)
