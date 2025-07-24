# setup-connectors.ps1 - Email Provider Integration Setup
# Configures Gmail and other email provider connections

param(
    [switch]$SkipInstall,
    [switch]$ConfigureGmail,
    [switch]$Verbose
)

$ProjectRoot = "D:\AI\Gits\email-agent_v01"
$LogFile = "$ProjectRoot\logs\connectors-setup.log"

function Write-Success($message) { Write-Host "✓ $message" -ForegroundColor Green }
function Write-Info($message) { Write-Host "ℹ $message" -ForegroundColor Cyan }
function Write-Warning($message) { Write-Host "⚠ $message" -ForegroundColor Yellow }
function Write-Error($message) { Write-Host "✗ $message" -ForegroundColor Red }

function Write-Log($message, $type = "INFO") {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$type] $message"
    Add-Content -Path $LogFile -Value $logEntry
    if ($Verbose) { Write-Output $logEntry }
}

# Install connector dependencies
function Install-ConnectorDependencies {
    Write-Info "Installing email connector dependencies..."
    
    Set-Location $ProjectRoot
    
    $connectorDeps = @(
        "googleapis@^128.0.0",
        "microsoft-graph@^3.0.0", 
        "nodemailer@^6.9.0",
        "imap@^0.8.19",
        "mailparser@^3.6.0",
        "sanitize-html@^2.11.0",
        "rate-limiter-flexible@^3.0.0"
    )
    
    if (!$SkipInstall) {
        foreach ($dep in $connectorDeps) {
            Write-Info "Installing $dep..."
            pnpm add $dep
        }
        Write-Success "Connector dependencies installed"
    }
    
    Write-Log "Connector dependencies configured"
}

# Create Gmail connector configuration
function New-GmailConnectorConfig {
    $gmailConfig = @"
{
  "gmail": {
    "apiVersion": "v1",
    "scopes": [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.send", 
      "https://www.googleapis.com/auth/gmail.compose",
      "https://www.googleapis.com/auth/gmail.modify"
    ],
    "rateLimits": {
      "requestsPerSecond": 10,
      "requestsPerDay": 1000000,
      "batchSize": 100
    },
    "caching": {
      "enabled": true,
      "ttl": 300,
      "maxSize": 1000
    }
  },
  "outlook": {
    "apiVersion": "v1.0",
    "scopes": [
      "https://graph.microsoft.com/Mail.Read",
      "https://graph.microsoft.com/Mail.Send"
    ],
    "rateLimits": {
      "requestsPerSecond": 5,
      "requestsPerDay": 100000
    }
  }
}
"@
    
    $configPath = "$ProjectRoot\connectors\config.json"
    Set-Content -Path $configPath -Value $gmailConfig
    Write-Success "Created email connector configuration"
}

# Create OAuth setup instructions
function New-OAuthInstructions {
    $instructions = @"
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
"@
    
    $instructionsPath = "$ProjectRoot\docs\oauth-setup.md"
    Set-Content -Path $instructionsPath -Value $instructions
    Write-Success "Created OAuth setup instructions"
}

# Create connector utility functions
function New-ConnectorUtils {
    $utilsContent = @"
// connectorUtils.js - Shared utilities for email connectors

export class RateLimiter {
  constructor(requestsPerSecond = 10) {
    this.interval = 1000 / requestsPerSecond;
    this.lastRequest = 0;
  }

  async throttle() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;
    
    if (timeSinceLastRequest < this.interval) {
      await new Promise(resolve => 
        setTimeout(resolve, this.interval - timeSinceLastRequest)
      );
    }
    
    this.lastRequest = Date.now();
  }
}

export class EmailCache {
  constructor(maxSize = 1000, ttl = 300000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  set(key, data) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clear() {
    this.cache.clear();
  }
}

export function sanitizeEmailContent(content) {
  // Remove potentially dangerous content
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
}

export function formatEmailAddress(email) {
  if (!email) return '';
  return email.toLowerCase().trim();
}

export function parseEmailHeaders(headers) {
  const parsed = {};
  if (Array.isArray(headers)) {
    headers.forEach(header => {
      parsed[header.name] = header.value;
    });
  }
  return parsed;
}
"@
    
    $utilsPath = "$ProjectRoot\connectors\connectorUtils.js"
    Set-Content -Path $utilsPath -Value $utilsContent
    Write-Success "Created connector utilities"
}

# Create test configuration
function New-TestConfig {
    $testConfig = @"
{
  "testAccounts": {
    "gmail": {
      "testEmail": "test@gmail.com",
      "mockResponses": true,
      "rateLimitBypass": true
    },
    "outlook": {
      "testEmail": "test@outlook.com", 
      "mockResponses": true,
      "rateLimitBypass": true
    }
  },
  "mockData": {
    "sampleEmails": [
      {
        "id": "mock-001",
        "subject": "Test Email Subject",
        "from": "sender@example.com",
        "to": "recipient@example.com",
        "body": "This is a test email body",
        "date": "2025-07-23T10:00:00Z"
      }
    ]
  }
}
"@
    
    $testConfigPath = "$ProjectRoot\connectors\test-config.json"
    Set-Content -Path $testConfigPath -Value $testConfig
    Write-Success "Created test configuration"
}

# Main execution
function Start-ConnectorSetup {
    Write-Info "Setting up email provider connectors..."
    
    try {
        # Ensure we're in the right directory
        if (!(Test-Path $ProjectRoot)) {
            throw "Project root not found. Run setup-master.ps1 first."
        }
        
        Install-ConnectorDependencies
        New-GmailConnectorConfig
        New-OAuthInstructions
        New-ConnectorUtils
        New-TestConfig
        
        Write-Success "Email connector setup completed successfully!"
        Write-Info "Connectors configured for:"
        Write-Info "- Gmail API integration"
        Write-Info "- Microsoft Outlook/Graph API"
        Write-Info "- Rate limiting and caching"
        Write-Info "- OAuth 2.0 authentication"
        
        Write-Warning "Next steps:"
        Write-Warning "1. Follow OAuth setup instructions in docs/oauth-setup.md"
        Write-Warning "2. Update .env file with your API credentials"
        Write-Warning "3. Test connections before production use"
        
        if ($ConfigureGmail) {
            Write-Info "Opening Gmail API setup documentation..."
            Start-Process "https://console.cloud.google.com/"
        }
        
        Write-Log "Connector setup completed successfully" "SUCCESS"
        
    } catch {
        Write-Error "Connector setup failed: $($_.Exception.Message)"
        Write-Log "Connector setup failed: $($_.Exception.Message)" "ERROR"
        exit 1
    }
}

# Execute if run directly
if ($MyInvocation.InvocationName -ne '.') {
    Start-ConnectorSetup
}