# setup-frontend.ps1 - Frontend Setup with React, TypeScript, and Tailwind
# Configures the React frontend using pnpm

param(
    [switch]$SkipInstall,
    [switch]$Verbose
)

# Color functions (must be defined first)
function Write-Success($message) { Write-Host "✓ $message" -ForegroundColor Green }
function Write-Info($message) { Write-Host "ℹ $message" -ForegroundColor Cyan }
function Write-Error($message) { Write-Host "✗ $message" -ForegroundColor Red }

# Configuration
$ProjectRoot = "D:\AI\Gits\email-agent_v01"
$LogFile = "$ProjectRoot\logs\frontend-setup.log"

function Write-Log($message, $type = "INFO") {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$type] $message"
    Add-Content -Path $LogFile -Value $logEntry
    if ($Verbose) { Write-Output $logEntry }
}

# Install frontend dependencies
function Install-FrontendDependencies {
    Write-Info "Installing frontend dependencies with pnpm..."
    
    Set-Location $ProjectRoot
    
    $frontendDeps = @(
        "react@^18.2.0",
        "react-dom@^18.2.0",
        "@types/react@^18.2.0",
        "@types/react-dom@^18.2.0",
        "typescript@^5.0.0",
        "vite@^5.0.0",
        "@vitejs/plugin-react@^4.0.0",
        "tailwindcss@^3.3.0",
        "autoprefixer@^10.4.0",
        "postcss@^8.4.0",
        "axios@^1.6.0",
        "lucide-react@^0.263.0",
        "react-router-dom@^6.8.0",
        "@hookform/resolvers@^3.3.0",
        "react-hook-form@^7.48.0",
        "zod@^3.22.0",
        "date-fns@^2.30.0",
        "concurrently@^8.2.0"
    )
    
    $devDeps = @(
        "@types/node@^20.0.0",
        "eslint@^8.0.0",
        "@typescript-eslint/eslint-plugin@^6.0.0",
        "@typescript-eslint/parser@^6.0.0",
        "eslint-plugin-react@^7.33.0",
        "eslint-plugin-react-hooks@^4.6.0",
        "eslint-plugin-react-refresh@^0.4.0",
        "vitest@^1.0.0",
        "@testing-library/react@^13.4.0",
        "@testing-library/jest-dom@^6.1.0"
    )
    
    if (!$SkipInstall) {
        # Install main dependencies
        $depString = $frontendDeps -join " "
        Write-Info "Installing main dependencies..."
        pnpm add $depString.Split(" ")
        
        # Install dev dependencies  
        $devDepString = $devDeps -join " "
        Write-Info "Installing dev dependencies..."
        pnpm add -D $devDepString.Split(" ")
        
        Write-Success "Frontend dependencies installed"
    }
    
    Write-Log "Frontend dependencies configured"
}

# Create Vite configuration
function New-ViteConfig {
    $viteConfig = @"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
"@
    
    Set-Content -Path "$ProjectRoot\vite.config.ts" -Value $viteConfig
    Write-Success "Created vite.config.ts"
}

# Create TypeScript configuration
function New-TypeScriptConfig {
    $tsConfig = @"
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
"@
    
    Set-Content -Path "$ProjectRoot\tsconfig.json" -Value $tsConfig
    
    $tsNodeConfig = @"
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
"@
    
    Set-Content -Path "$ProjectRoot\tsconfig.node.json" -Value $tsNodeConfig
    Write-Success "Created TypeScript configurations"
}

# Create Tailwind configuration
function New-TailwindConfig {
    $tailwindConfig = @"
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        }
      }
    },
  },
  plugins: [],
}
"@
    
    Set-Content -Path "$ProjectRoot\tailwind.config.js" -Value $tailwindConfig
    
    $postcssConfig = @"
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
"@
    
    Set-Content -Path "$ProjectRoot\postcss.config.js" -Value $postcssConfig
    Write-Success "Created Tailwind CSS configuration"
}

# Create HTML template
function New-HtmlTemplate {
    $htmlTemplate = @"
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Email Agent MCP</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
"@
    
    Set-Content -Path "$ProjectRoot\index.html" -Value $htmlTemplate
    Write-Success "Created HTML template"
}

# Create ESLint configuration
function New-EslintConfig {
    $eslintConfig = @"
module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
  },
}
"@
    
    Set-Content -Path "$ProjectRoot\.eslintrc.cjs" -Value $eslintConfig
    Write-Success "Created ESLint configuration"
}

# Main execution
function Start-FrontendSetup {
    Write-Info "Setting up React TypeScript frontend..."
    
    try {
        # Ensure we're in the right directory
        if (!(Test-Path $ProjectRoot)) {
            throw "Project root not found. Run setup-master.ps1 first."
        }
        
        Install-FrontendDependencies
        New-ViteConfig
        New-TypeScriptConfig  
        New-TailwindConfig
        New-HtmlTemplate
        New-EslintConfig
        
        Write-Success "Frontend setup completed successfully!"
        Write-Info "Frontend configured with:"
        Write-Info "- React 18 + TypeScript"
        Write-Info "- Vite build tool"
        Write-Info "- Tailwind CSS"
        Write-Info "- ESLint + Vitest"
        
        Write-Log "Frontend setup completed successfully" "SUCCESS"
        
    } catch {
        Write-Error "Frontend setup failed: $($_.Exception.Message)"
        Write-Log "Frontend setup failed: $($_.Exception.Message)" "ERROR"
        exit 1
    }
}

# Execute if run directly
if ($MyInvocation.InvocationName -ne '.') {
    Start-FrontendSetup
}