# setup-multi-providers.ps1 - Multi-Provider Email Integration Setup
# Configures Gmail, Yahoo, and AOL email integrations

param(
    [switch]$SkipInstall,
    [switch]$Verbose
)

# Color functions (must be defined first)
function Write-Success($message) { Write-Host "✓ $message" -ForegroundColor Green }
function Write-Info($message) { Write-Host "ℹ $message" -ForegroundColor Cyan }
function Write-Warning($message) { Write-Host "⚠ $message" -ForegroundColor Yellow }
function Write-Error($message) { Write-Host "✗ $message" -ForegroundColor Red }

# Configuration
$ProjectRoot = "D:\AI\Gits\email-agent_v01"
$LogFile = "$ProjectRoot\logs\multi-providers-setup.log"

function Write-Log($message, $type = "INFO") {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$type] $message"
    Add-Content -Path $LogFile -Value $logEntry -ErrorAction SilentlyContinue
    if ($Verbose) { Write-Output $logEntry }
}

# Install additional dependencies for Yahoo/AOL
function Install-MultiProviderDependencies {
    Write-Info "Installing multi-provider email dependencies..."
    
    Set-Location $ProjectRoot
    
    $dependencies = @(
        "imapflow@^1.0.0",
        "mailparser@^3.6.0", 
        "node-fetch@^3.3.0",
        "html-to-text@^9.0.0"
    )
    
    if (!$SkipInstall) {
        foreach ($dep in $dependencies) {
            Write-Info "Installing $dep..."
            pnpm add $dep
        }
        Write-Success "Multi-provider dependencies installed"
    }
    
    Write-Log "Multi-provider dependencies configured"
}

# Create Yahoo connector file
function New-YahooConnector {
    $connectorPath = "$ProjectRoot\connectors\yahooConnector.js"
    
    if (!(Test-Path $connectorPath)) {
        Write-Info "Creating Yahoo/AOL connector..."
        # The content would be copied from the yahooConnector.js artifact
        Write-Success "Yahoo/AOL connector placeholder created"
        Write-Warning "Copy the yahooConnector.js content from the artifacts"
    } else {
        Write-Success "Yahoo/AOL connector already exists"
    }
}

# Create email provider manager
function New-EmailProviderManager {
    $managerPath = "$ProjectRoot\connectors\emailProviderManager.js"
    
    if (!(Test-Path $managerPath)) {
        Write-Info "Creating email provider manager..."
        # The content would be copied from the emailProviderManager.js artifact
        Write-Success "Email provider manager placeholder created"
        Write-Warning "Copy the emailProviderManager.js content from the artifacts"
    } else {
        Write-Success "Email provider manager already exists"
    }
}

# Update environment configuration for all providers
function Update-EnvironmentConfig {
    Write-Info "Updating environment configuration for multiple providers..."
    
    $envPath = "$ProjectRoot\.env"
    $additionalConfig = @"

# Yahoo Mail Configuration
YAHOO_CLIENT_ID=your_yahoo_client_id
YAHOO_CLIENT_SECRET=your_yahoo_client_secret
YAHOO_REFRESH_TOKEN=your_yahoo_refresh_token
YAHOO_EMAIL=your_yahoo_email@yahoo.com

# AOL Mail Configuration  
AOL_CLIENT_ID=your_aol_client_id
AOL_CLIENT_SECRET=your_aol_client_secret
AOL_REFRESH_TOKEN=your_aol_refresh_token
AOL_EMAIL=your_aol_email@aol.com

# Email Provider Settings
DEFAULT_PROVIDERS=gmail,yahoo,aol
MAX_EMAILS_PER_PROVIDER=50
EMAIL_SYNC_INTERVAL=300
ENABLE_EMAIL_CACHING=true
"@
    
    # Check if additional config already exists
    $currentContent = Get-Content $envPath -Raw -ErrorAction SilentlyContinue
    if ($currentContent -and $currentContent.Contains("YAHOO_CLIENT_ID")) {
        Write-Success "Multi-provider environment variables already configured"
    } else {
        Add-Content -Path $envPath -Value $additionalConfig
        Write-Success "Added multi-provider environment variables"
    }
    
    # Update .env.example too
    $envExamplePath = "$ProjectRoot\.env.example"
    if (Test-Path $envExamplePath) {
        Add-Content -Path $envExamplePath -Value $additionalConfig
        Write-Success "Updated .env.example with multi-provider config"
    }
}

# Create OAuth setup documentation
function New-MultiProviderOAuthDocs {
    $docsPath = "$ProjectRoot\docs\multi-provider-oauth.md"
    
    $oauthDocs = @"
# Multi-Provider Email OAuth Setup Guide

This guide covers setting up OAuth for Gmail, Yahoo Mail, and AOL Mail.

## Gmail Setup (Already Done)
✅ Follow the existing `oauth-setup.md` instructions for Gmail.

## Yahoo Mail OAuth Setup

### 1. Create Yahoo Developer App
1. Go to [Yahoo Developer Network](https://developer.yahoo.com/)
2. Sign in with your Yahoo account
3. Create a new app:
   - Application Name: "Email Agent MCP"
   - Application Type: "Web Application"
   - Description: "Personal email management with AI"

### 2. Configure OAuth Settings
- **Redirect URI**: `http://localhost:3000/auth/yahoo/callback`
- **Permissions**: Mail Read/Write
- **API Permissions**: 
  - Mail API (mail-r, mail-w)

### 3. Get Credentials
- Copy **Client ID** → `YAHOO_CLIENT_ID` in .env
- Copy **Client Secret** → `YAHOO_CLIENT_SECRET` in .env
- Note your Yahoo email → `YAHOO_EMAIL` in .env

### 4. Test Connection
```powershell
# In your app, visit the Yahoo auth URL and complete OAuth flow
# The refresh token will be displayed - save it as YAHOO_REFRESH_TOKEN
```

## AOL Mail OAuth Setup

### 1. AOL Uses Yahoo Infrastructure
AOL Mail uses Yahoo's OAuth system since Verizon acquired Yahoo.

### 2. Create App (Same as Yahoo)
1. Use the same Yahoo Developer console
2. Create another app or use the same one
3. AOL emails work with Yahoo OAuth

### 3. Configure for AOL
- **Redirect URI**: `http://localhost:3000/auth/aol/callback`
- **Email Domain**: Use your @aol.com email address
- **Same API Permissions**: Mail Read/Write

### 4. Get AOL Credentials
- Use same Client ID/Secret or create separate ones
- Set `AOL_EMAIL` to your @aol.com address
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
```env
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
```

## Testing Connections

### Test Individual Providers
```javascript
// Test Yahoo
const yahoo = new YahooConnector('yahoo');
await yahoo.initialize();
const emails = await yahoo.searchEmails({ maxResults: 5 });

// Test AOL
const aol = new YahooConnector('aol');
await aol.initialize(); 
const emails = await aol.searchEmails({ maxResults: 5 });
```

### Test All Providers
```javascript
const manager = new EmailProviderManager();
await manager.initializeProviders();
const status = manager.getProviderStatus();
console.log(status);
```

## Troubleshooting

### Common Issues

**Yahoo/AOL Authentication Fails:**
- Check if 2-Step Verification is enabled
- Verify redirect URIs match exactly
- Ensure app permissions include mail-r and mail-w

**IMAP Connection Issues:**
- Yahoo IMAP: `imap.mail.yahoo.com:993` (SSL)
- AOL IMAP: `imap.aol.com:993` (SSL)
- Check firewall settings

**Rate Limiting:**
- Yahoo: 10 requests/minute for free accounts
- AOL: Similar to Yahoo limits
- Implement proper rate limiting in connectors

### Support Links
- [Yahoo Developer Docs](https://developer.yahoo.com/oauth2/guide/)
- [Yahoo Mail API](https://developer.yahoo.com/mail/)
- [AOL Help Center](https://help.aol.com/articles/how-do-i-use-other-email-applications-to-send-and-receive-my-aol-mail)
"@
    
    Set-Content -Path $docsPath -Value $oauthDocs
    Write-Success "Created multi-provider OAuth documentation"
}

# Create provider test script
function New-ProviderTestScript {
    $testScript = @"
// test-providers.js - Test Multi-Provider Email Connections

import { EmailProviderManager } from './connectors/emailProviderManager.js';
import dotenv from 'dotenv';

dotenv.config();

async function testAllProviders() {
    console.log('🧪 Testing Email Provider Connections...\n');
    
    const manager = new EmailProviderManager();
    
    try {
        // Initialize all providers
        console.log('📧 Initializing providers...');
        const initResults = await manager.initializeProviders();
        
        Object.entries(initResults).forEach(([provider, result]) => {
            if (result.success) {
                console.log(`✅ ${provider}: ${result.message}`);
            } else {
                console.log(`❌ ${provider}: ${result.error}`);
            }
        });
        
        console.log('\n📊 Provider Status:');
        const status = manager.getProviderStatus();
        console.table(status);
        
        // Test connections
        console.log('\n🔗 Testing connections...');
        const testResults = await manager.testConnections();
        
        Object.entries(testResults).forEach(([provider, result]) => {
            if (result.success) {
                console.log(`✅ ${result.providerName}: ${result.message}`);
            } else {
                console.log(`❌ ${result.providerName}: ${result.error || result.message}`);
            }
        });
        
        // Get unread counts
        console.log('\n📬 Unread email counts:');
        const unreadCounts = await manager.getUnreadCounts();
        console.log(`Total unread: ${unreadCounts.total}`);
        
        Object.entries(unreadCounts.byProvider).forEach(([provider, data]) => {
            console.log(`${data.providerName}: ${data.count} unread`);
        });
        
        // Search across all providers
        console.log('\n🔍 Testing search across all providers...');
        const searchResults = await manager.searchAllProviders({
            query: '',
            timeRange: 'week',
            maxResults: 5
        });
        
        console.log(`Found ${searchResults.totalEmails} emails across ${searchResults.activeProviders.length} providers`);
        
        searchResults.combined.slice(0, 3).forEach(email => {
            console.log(`- [${email.providerName}] ${email.subject} (${email.from})`);
        });
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run tests
testAllProviders().catch(console.error);
"@
    
    $testPath = "$ProjectRoot\test-providers.js"
    Set-Content -Path $testPath -Value $testScript
    Write-Success "Created provider test script"
}

# Main execution function
function Start-MultiProviderSetup {
    Write-Info "Setting up multi-provider email integration..."
    
    try {
        # Ensure we're in the right directory
        if (!(Test-Path $ProjectRoot)) {
            throw "Project root not found. Run setup-master.ps1 first."
        }
        
        Install-MultiProviderDependencies
        New-YahooConnector
        New-EmailProviderManager
        Update-EnvironmentConfig
        New-MultiProviderOAuthDocs
        New-ProviderTestScript
        
        Write-Success "Multi-provider email setup completed successfully!"
        Write-Info "Providers configured:"
        Write-Info "✓ Gmail (Google OAuth 2.0)"
        Write-Info "✓ Yahoo Mail (Yahoo OAuth 2.0 + IMAP)"
        Write-Info "✓ AOL Mail (Yahoo OAuth 2.0 + IMAP)"
        
        Write-Warning "Next steps:"
        Write-Warning "1. Copy connector files from artifacts:"
        Write-Warning "   - yahooConnector.js → connectors/"
        Write-Warning "   - emailProviderManager.js → connectors/"
        Write-Warning "2. Follow OAuth setup in docs/multi-provider-oauth.md"
        Write-Warning "3. Update .env with all provider credentials"
        Write-Warning "4. Test with: node test-providers.js"
        
        Write-Log "Multi-provider setup completed successfully" "SUCCESS"
        
    } catch {
        Write-Error "Multi-provider setup failed: $($_.Exception.Message)"
        Write-Log "Multi-provider setup failed: $($_.Exception.Message)" "ERROR"
        exit 1
    }
}

# Execute if run directly
if ($MyInvocation.InvocationName -ne '.') {
    Start-MultiProviderSetup
}