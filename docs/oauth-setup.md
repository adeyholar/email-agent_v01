# Email Provider OAuth Setup Instructions

## Gmail API Setup

1. Go to Google Cloud Console (https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Enable Gmail API:
   - Go to "APIs & Services" > "Library"
   - Search for "Gmail API" and enable it
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client ID"
   - Choose "Desktop application" type
   - Download the credentials JSON file
5. Update .env file with:
   - GMAIL_CLIENT_ID (from credentials file)
   - GMAIL_CLIENT_SECRET (from credentials file)

## Microsoft Outlook Setup

1. Go to Azure Portal (https://portal.azure.com/)
2. Navigate to "Azure Active Directory" > "App registrations"
3. Click "New registration"
4. Configure:
   - Name: "Email Agent MCP"
   - Supported account types: "Accounts in any organizational directory"
   - Redirect URI: http://localhost:3000/auth/callback
5. Note the Application (client) ID
6. Create client secret:
   - Go to "Certificates & secrets"
   - Click "New client secret"
   - Copy the secret value
7. Configure API permissions:
   - Add Microsoft Graph permissions
   - Mail.Read, Mail.Send, User.Read

## Security Notes

- Keep credentials secure and never commit to version control
- Use environment variables for all sensitive data
- Regularly rotate client secrets
- Monitor API usage and set up alerts
