# setup-mcp.ps1 - Claude Desktop MCP Server Setup
# Configures the Model Context Protocol server for Claude Desktop integration

param(
    [switch]$SkipInstall,
    [switch]$Verbose
)

$ProjectRoot = "D:\AI\Gits\email-agent_v01"
$LogFile = "$ProjectRoot\logs\mcp-setup.log"
$ClaudeConfigPath = "$env:APPDATA\Claude\claude_desktop_config.json"

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

# Install MCP dependencies
function Install-McpDependencies {
    Write-Info "Installing MCP dependencies..."
    
    Set-Location $ProjectRoot
    
    $mcpDeps = @(
        "@modelcontextprotocol/sdk@^1.0.0",
        "ws@^8.14.0",
        "node-cron@^3.0.0",
        "dotenv@^16.3.0"
    )
    
    if (!$SkipInstall) {
        foreach ($dep in $mcpDeps) {
            Write-Info "Installing $dep..."
            pnpm add $dep
        }
        Write-Success "MCP dependencies installed"
    }
    
    Write-Log "MCP dependencies configured"
}

# Create MCP server configuration
function New-McpServerConfig {
    $serverConfig = @"
{
  "name": "email-agent-mcp",
  "version": "1.0.0",
  "description": "Email Management Agent MCP Server",
  "capabilities": {
    "tools": [
      "email_analyze",
      "email_search", 
      "email_compose",
      "email_schedule",
      "email_insights"
    ],
    "resources": [
      "email_templates",
      "contact_list",
      "email_analytics"
    ]
  },
  "transport": {
    "type": "websocket",
    "port": 8080,
    "host": "localhost"
  },
  "logging": {
    "level": "info",
    "file": "./logs/mcp-server.log"
  }
}
"@
    
    $configPath = "$ProjectRoot\mcp-server\config.json"
    Set-Content -Path $configPath -Value $serverConfig
    Write-Success "Created MCP server configuration"
}

# Create MCP tools schema
function New-McpToolsSchema {
    $toolsSchema = @"
{
  "tools": {
    "email_analyze": {
      "description": "Analyze email content for sentiment, priority, and action items",
      "inputSchema": {
        "type": "object",
        "properties": {
          "emailContent": {
            "type": "string",
            "description": "The email content to analyze"
          },
          "analysisType": {
            "type": "string",
            "enum": ["sentiment", "priority", "action_items", "all"],
            "description": "Type of analysis to perform"
          }
        },
        "required": ["emailContent"]
      }
    },
    "email_search": {
      "description": "Search emails using various criteria",
      "inputSchema": {
        "type": "object", 
        "properties": {
          "query": {
            "type": "string",
            "description": "Search query"
          },
          "timeRange": {
            "type": "string",
            "enum": ["today", "week", "month", "year"],
            "description": "Time range for search"
          },
          "sender": {
            "type": "string",
            "description": "Filter by sender email"
          }
        },
        "required": ["query"]
      }
    },
    "email_compose": {
      "description": "Compose email with AI assistance",
      "inputSchema": {
        "type": "object",
        "properties": {
          "to": {
            "type": "string",
            "description": "Recipient email address"
          },
          "subject": {
            "type": "string", 
            "description": "Email subject"
          },
          "context": {
            "type": "string",
            "description": "Context for email composition"
          },
          "tone": {
            "type": "string",
            "enum": ["professional", "casual", "friendly", "formal"],
            "description": "Desired tone"
          }
        },
        "required": ["to", "context"]
      }
    }
  }
}
"@
    
    $schemaPath = "$ProjectRoot\mcp-server\tools-schema.json"
    Set-Content -Path $schemaPath -Value $toolsSchema
    Write-Success "Created MCP tools schema"
}

# Create environment configuration
function New-EnvironmentConfig {
    $envContent = @"
# MCP Server Configuration
MCP_SERVER_PORT=8080
MCP_SERVER_HOST=localhost
MCP_LOG_LEVEL=info

# Email Provider Settings
GMAIL_CLIENT_ID=your_gmail_client_id
GMAIL_CLIENT_SECRET=your_gmail_client_secret
GMAIL_REFRESH_TOKEN=your_gmail_refresh_token

# Claude Configuration
CLAUDE_API_KEY=your_claude_api_key_optional

# Security
JWT_SECRET=your_jwt_secret_here
ENCRYPTION_KEY=your_encryption_key_here

# Database (if needed)
DB_CONNECTION_STRING=your_db_connection_string
"@
    
    $envPath = "$ProjectRoot\.env"
    if (!(Test-Path $envPath)) {
        Set-Content -Path $envPath -Value $envContent
        Write-Success "Created .env template"
    } else {
        Write-Warning ".env file already exists, skipping"
    }
    
    # Create .env.example
    Set-Content -Path "$ProjectRoot\.env.example" -Value $envContent
    Write-Success "Created .env.example"
}

# Update Claude Desktop configuration
function Update-ClaudeDesktopConfig {
    Write-Info "Updating Claude Desktop configuration..."
    
    # Backup existing config if it exists
    if (Test-Path $ClaudeConfigPath) {
        $backupPath = "$ClaudeConfigPath.backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        Copy-Item $ClaudeConfigPath $backupPath
        Write-Info "Backed up existing config to: $backupPath"
    }
    
    # Create Claude Desktop config directory if it doesn't exist
    $claudeConfigDir = Split-Path $ClaudeConfigPath
    if (!(Test-Path $claudeConfigDir)) {
        New-Item -ItemType Directory -Path $claudeConfigDir -Force | Out-Null
    }
    
    # Create or update Claude Desktop configuration
    $claudeConfig = @{
        mcpServers = @{
            "email-agent" = @{
                command = "node"
                args = @("$ProjectRoot\mcp-server\mcpServer.js")
                env = @{
                    NODE_ENV = "production"
                }
            }
        }
    }
    
    # If config already exists, merge with existing
    if (Test-Path $ClaudeConfigPath) {
        try {
            $existing = Get-Content $ClaudeConfigPath | ConvertFrom-Json
            if ($existing.mcpServers) {
                $existing.mcpServers."email-agent" = $claudeConfig.mcpServers."email-agent"
                $claudeConfig = $existing
            }
        } catch {
            Write-Warning "Could not parse existing Claude config, creating new one"
        }
    }
    
    $configJson = $claudeConfig | ConvertTo-Json -Depth 10
    Set-Content -Path $ClaudeConfigPath -Value $configJson
    Write-Success "Updated Claude Desktop configuration"
}

# Create start script
function New-StartScript {
    $startScript = @"
# start.ps1 - Start Email Agent MCP Application

param(
    [switch]`$Development,
    [switch]`$Verbose
)

`$ProjectRoot = "D:\AI\Gits\email-agent_v01"

function Write-Success(`$message) { Write-Host "✓ `$message" -ForegroundColor Green }
function Write-Info(`$message) { Write-Host "ℹ `$message" -ForegroundColor Cyan }
function Write-Error(`$message) { Write-Host "✗ `$message" -ForegroundColor Red }

Set-Location `$ProjectRoot

Write-Info "Starting Email Agent MCP Application..."

try {
    if (`$Development) {
        Write-Info "Starting in development mode..."
        pnpm run dev
    } else {
        Write-Info "Building and starting production mode..."
        pnpm run build
        pnpm run preview
    }
} catch {
    Write-Error "Failed to start application: `$(`$_.Exception.Message)"
    exit 1
}
"@
    
    $scriptPath = "$ProjectRoot\start.ps1"
    Set-Content -Path $scriptPath -Value $startScript
    Write-Success "Created start script"
}

# Main execution
function Start-McpSetup {
    Write-Info "Setting up Claude Desktop MCP server..."
    
    try {
        # Ensure we're in the right directory
        if (!(Test-Path $ProjectRoot)) {
            throw "Project root not found. Run setup-master.ps1 first."
        }
        
        Install-McpDependencies
        New-McpServerConfig
        New-McpToolsSchema
        New-EnvironmentConfig
        Update-ClaudeDesktopConfig
        New-StartScript
        
        Write-Success "MCP setup completed successfully!"
        Write-Info "MCP server configured for:"
        Write-Info "- Claude Desktop integration"
        Write-Info "- Email analysis tools"
        Write-Info "- WebSocket transport"
        Write-Info "- Local development"
        
        Write-Warning "Next steps:"
        Write-Warning "1. Update .env file with your credentials"
        Write-Warning "2. Restart Claude Desktop application" 
        Write-Warning "3. Run setup-connectors.ps1"
        
        Write-Log "MCP setup completed successfully" "SUCCESS"
        
    } catch {
        Write-Error "MCP setup failed: $($_.Exception.Message)"
        Write-Log "MCP setup failed: $($_.Exception.Message)" "ERROR"
        exit 1
    }
}

# Execute if run directly
if ($MyInvocation.InvocationName -ne '.') {
    Start-McpSetup
}