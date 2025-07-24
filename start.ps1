# start.ps1 - Start Email Agent MCP Application

param(
    [switch]$Development,
    [switch]$Verbose
)

$ProjectRoot = "D:\AI\Gits\email-agent_v01"

function Write-Success($message) { Write-Host "✓ $message" -ForegroundColor Green }
function Write-Info($message) { Write-Host "ℹ $message" -ForegroundColor Cyan }
function Write-Error($message) { Write-Host "✗ $message" -ForegroundColor Red }

Set-Location $ProjectRoot

Write-Info "Starting Email Agent MCP Application..."

try {
    if ($Development) {
        Write-Info "Starting in development mode..."
        pnpm run dev
    } else {
        Write-Info "Building and starting production mode..."
        pnpm run build
        pnpm run preview
    }
} catch {
    Write-Error "Failed to start application: $($_.Exception.Message)"
    exit 1
}
