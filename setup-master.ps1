# setup-master.ps1 - Email Agent Master Setup Orchestrator
# Creates project structure and coordinates all setup scripts

param(
    [switch]$SkipDependencyCheck,
    [switch]$Verbose
)

# Color functions for better output (must be defined first)
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-Success($message) { Write-ColorOutput Green "✓ $message" }
function Write-Info($message) { Write-ColorOutput Cyan "ℹ $message" }
function Write-Warning($message) { Write-ColorOutput Yellow "⚠ $message" }
function Write-Error($message) { Write-ColorOutput Red "✗ $message" }

# Configuration
$ProjectRoot = "D:\AI\Gits\email-agent_v01"
$LogFile = "$ProjectRoot\setup.log"

# Logging function
function Write-Log($message, $type = "INFO") {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$type] $message"
    Add-Content -Path $LogFile -Value $logEntry -ErrorAction SilentlyContinue
    if ($Verbose) { Write-Output $logEntry }
}

# Dependency checker
function Test-Dependencies {
    Write-Info "Checking dependencies..."
    
    $dependencies = @{
        "node" = "Node.js is required"
        "pnpm" = "pnpm package manager is required"
        "git" = "Git is required for version control"
    }
    
    $missing = @()
    foreach ($dep in $dependencies.Keys) {
        try {
            $null = Get-Command $dep -ErrorAction Stop
            Write-Success "$dep found"
        }
        catch {
            Write-Error "$($dependencies[$dep])"
            $missing += $dep
        }
    }
    
    if ($missing.Count -gt 0) {
        Write-Error "Missing dependencies: $($missing -join ', ')"
        Write-Info "Install missing dependencies and run again."
        return $false
    }
    return $true
}

# Create project structure
function Initialize-ProjectStructure {
    Write-Info "Creating project structure..."
    
    $directories = @(
        "src\components",
        "src\services", 
        "src\utils",
        "src\types",
        "mcp-server",
        "connectors",
        "scripts",
        "config",
        "logs",
        "docs"
    )
    
    # Create root directory
    if (!(Test-Path $ProjectRoot)) {
        New-Item -ItemType Directory -Path $ProjectRoot -Force | Out-Null
        Write-Success "Created project root: $ProjectRoot"
    }
    
    # Create subdirectories
    foreach ($dir in $directories) {
        $fullPath = Join-Path $ProjectRoot $dir
        if (!(Test-Path $fullPath)) {
            New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
            Write-Success "Created directory: $dir"
        }
    }
    
    Write-Log "Project structure initialized"
}

# Create package.json template
function Initialize-PackageJson {
    $packageJson = @{
        name = "email-agent-mcp"
        version = "1.0.0"
        description = "Email Management Agent with Claude Desktop MCP Integration"
        main = "src/index.js"
        scripts = @{
            dev = "concurrently `"pnpm run mcp-server`" `"pnpm run frontend`""
            frontend = "vite"
            build = "vite build"
            preview = "vite preview"
            "mcp-server" = "node mcp-server/mcpServer.js"
            test = "vitest"
            lint = "eslint src --ext .js,.jsx,.ts,.tsx"
            "type-check" = "tsc --noEmit"
        }
        dependencies = @{}
        devDependencies = @{}
        type = "module"
    } | ConvertTo-Json -Depth 10
    
    $packagePath = Join-Path $ProjectRoot "package.json"
    Set-Content -Path $packagePath -Value $packageJson
    Write-Success "Created package.json template"
}

# Main execution
function Start-Setup {
    Write-Info "Starting Email Agent MCP Setup..."
    Write-Info "Project Root: $ProjectRoot"
    
    # Initialize log file
    if (!(Test-Path (Split-Path $LogFile))) {
        New-Item -ItemType Directory -Path (Split-Path $LogFile) -Force | Out-Null
    }
    Write-Log "Setup started" "START"
    
    try {
        # Check dependencies unless skipped
        if (!$SkipDependencyCheck -and !(Test-Dependencies)) {
            throw "Dependency check failed"
        }
        
        # Initialize project structure
        Initialize-ProjectStructure
        Initialize-PackageJson
        
        Write-Success "Master setup completed successfully!"
        Write-Info "Next steps:"
        Write-Info "1. Run: .\setup-frontend.ps1"
        Write-Info "2. Run: .\setup-mcp.ps1"
        Write-Info "3. Run: .\setup-connectors.ps1"
        Write-Info "4. Run: .\start.ps1"
        
        Write-Log "Master setup completed successfully" "SUCCESS"
        
    } catch {
        Write-Error "Setup failed: $($_.Exception.Message)"
        Write-Log "Setup failed: $($_.Exception.Message)" "ERROR"
        exit 1
    }
}

# Execute if run directly
if ($MyInvocation.InvocationName -ne '.') {
    Start-Setup
}