// File: D:\AI\Gits\email-agent_v01\setup-enhancements.js
// Setup Script for Gmail Fix, AI Spam Detection, and Email Composition
// Run this to install dependencies and configure the enhanced system

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

class EnhancementSetup {
    constructor() {
        this.projectRoot = process.cwd();
        this.packagesNeeded = [
            'nodemailer@6.9.8',        // For SMTP email sending
            '@anthropic-ai/sdk@0.27.0'  // For Claude API integration (optional)
        ];
    }

    async runSetup() {
        console.log('🚀 Setting up Gmail Fix & AI Enhancements...');
        console.log('===============================================');
        
        try {
            await this.checkCurrentSetup();
            await this.installDependencies();
            await this.updatePackageJson();
            await this.createBackup();
            await this.updateEnvironment();
            await this.displayInstructions();
            
            console.log('\n✅ Enhancement setup complete!');
            console.log('🎯 Ready to run enhanced email management system');
            
        } catch (error) {
            console.error('❌ Setup failed:', error.message);
            process.exit(1);
        }
    }

    async checkCurrentSetup() {
        console.log('\n📋 Checking current setup...');
        
        // Check if package.json exists
        if (!fs.existsSync('package.json')) {
            throw new Error('package.json not found. Please run from project root.');
        }
        
        // Check if existing server file exists
        if (!fs.existsSync('enhanced-working-api-server.js')) {
            console.log('⚠️ Original server file not found - that\'s okay, we\'ll use the new enhanced version');
        }
        
        // Check if .env exists
        if (!fs.existsSync('.env')) {
            console.log('⚠️ .env file not found - you\'ll need to configure it');
        }
        
        console.log('✅ Current setup checked');
    }

    async installDependencies() {
        console.log('\n📦 Installing new dependencies...');
        
        for (const pkg of this.packagesNeeded) {
            try {
                console.log(`   Installing ${pkg}...`);
                execSync(`pnpm add ${pkg}`, { stdio: 'inherit' });
            } catch (error) {
                console.log(`   ⚠️ Failed to install ${pkg}, trying with npm...`);
                try {
                    execSync(`npm install ${pkg}`, { stdio: 'inherit' });
                } catch (npmError) {
                    console.log(`   ℹ️ Could not install ${pkg} - you may need to install it manually`);
                }
            }
        }
        
        console.log('✅ Dependencies installation complete');
    }

    async updatePackageJson() {
        console.log('\n📝 Updating package.json scripts...');
        
        try {
            const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
            
            // Add new scripts
            if (!packageJson.scripts) {
                packageJson.scripts = {};
            }
            
            packageJson.scripts['server-v2'] = 'node enhanced-api-server-v2.js';
            packageJson.scripts['gmail-oauth'] = 'node gmail-oauth-fix-enhanced.js';
            packageJson.scripts['test-enhancements'] = 'node test-enhancements.js';
            
            fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
            console.log('✅ Package.json updated with new scripts');
            
        } catch (error) {
            console.log('⚠️ Could not update package.json:', error.message);
        }
    }

    async createBackup() {
        console.log('\n💾 Creating backup of existing files...');
        
        const filesToBackup = [
            'enhanced-working-api-server.js',
            '.env'
        ];
        
        for (const file of filesToBackup) {
            if (fs.existsSync(file)) {
                const backupName = `${file}.backup-${Date.now()}`;
                try {
                    fs.copyFileSync(file, backupName);
                    console.log(`   ✅ Backed up ${file} to ${backupName}`);
                } catch (error) {
                    console.log(`   ⚠️ Could not backup ${file}:`, error.message);
                }
            }
        }
        
        console.log('✅ Backup complete');
    }

    async updateEnvironment() {
        console.log('\n🔧 Checking environment configuration...');
        
        if (!fs.existsSync('.env')) {
            console.log('   Creating .env template...');
            const envTemplate = `# Enhanced Email API Configuration
API_PORT=3001

# Gmail OAuth Configuration (Enhanced)
GMAIL_CLIENT_ID=your_gmail_client_id
GMAIL_CLIENT_SECRET=your_gmail_client_secret
GMAIL_EMAIL=your_gmail_email
GMAIL_REFRESH_TOKEN=your_gmail_refresh_token

# Yahoo IMAP Configuration
YAHOO_EMAIL=your_yahoo_email
YAHOO_APP_PASSWORD=your_yahoo_app_password
YAHOO_EMAIL2=your_second_yahoo_email
YAHOO2_APP_PASSWORD=your_second_yahoo_app_password

# AOL IMAP Configuration
AOL_EMAIL=your_aol_email
AOL_APP_PASSWORD=your_aol_app_password
AOL2_EMAIL=your_second_aol_email
AOL2_APP_PASSWORD=your_second_aol_app_password
AOL3_EMAIL=your_third_aol_email
AOL3_APP_PASSWORD=your_third_aol_app_password

# AI Features (Optional)
CLAUDE_API_KEY=your_claude_api_key_optional

# MCP Server Configuration
MCP_SERVER_PORT=8080
MCP_SERVER_HOST=localhost
MCP_LOG_LEVEL=info
`;
            
            fs.writeFileSync('.env', envTemplate);
            console.log('   ✅ Created .env template');
        } else {
            console.log('   ✅ .env file already exists');
        }
        
        console.log('✅ Environment configuration ready');
    }

    async displayInstructions() {
        console.log('\n📚 Setup Instructions:');
        console.log('=======================');
        
        console.log('\n1️⃣ **Fix Gmail OAuth (Important)**:');
        console.log('   Run: node gmail-oauth-fix-enhanced.js');
        console.log('   This will update Gmail with delete/send permissions');
        
        console.log('\n2️⃣ **Configure Email Providers**:');
        console.log('   Edit .env file with your email credentials');
        console.log('   - Gmail: OAuth credentials from Google Cloud Console');
        console.log('   - Yahoo/AOL: App passwords from account settings');
        
        console.log('\n3️⃣ **Start Enhanced API Server**:');
        console.log('   Option A: pnpm run server-v2');
        console.log('   Option B: node enhanced-api-server-v2.js');
        
        console.log('\n4️⃣ **Start Frontend Dashboard**:');
        console.log('   pnpm run frontend');
        console.log('   Access at: http://localhost:3000');
        
        console.log('\n5️⃣ **Test New Features**:');
        console.log('   - AI Spam Detection: POST /api/ai/spam/analyze');
        console.log('   - Email Composition: POST /api/compose/send');
        console.log('   - Enhanced Gmail: Improved fetch and delete');
        
        console.log('\n🆕 **New Features Available**:');
        console.log('   ✅ Fixed Gmail API with delete/send permissions');
        console.log('   ✅ AI-powered spam detection using Claude');
        console.log('   ✅ Email composition & reply system');
        console.log('   ✅ SMTP support for Yahoo/AOL sending');
        console.log('   ✅ Enhanced error handling & performance');
        
        console.log('\n🔧 **Troubleshooting**:');
        console.log('   - Gmail issues: Check OAuth scopes in Google Cloud Console');
        console.log('   - SMTP issues: Verify app passwords are generated correctly');
        console.log('   - AI features: Ensure internet connection for Claude API');
        console.log('   - Port conflicts: Change API_PORT in .env if needed');
        
        console.log('\n📋 **File Overview**:');
        console.log('   - enhanced-api-server-v2.js: Main server with all enhancements');
        console.log('   - gmail-oauth-fix-enhanced.js: OAuth setup tool');
        console.log('   - enhanced-gmail-manager.js: Fixed Gmail API integration');
        console.log('   - ai-spam-detection-system.js: AI spam detection');
        console.log('   - email-composition-system.js: Email sending & composition');
        
        console.log('\n🎯 **Quick Start Command**:');
        console.log('   node enhanced-api-server-v2.js && pnpm run frontend');
    }

    createTestScript() {
        console.log('\n🧪 Creating test script...');
        
        const testScript = `// File: D:\AI\Gits\email-agent_v01\test-enhancements.js
// Test script for enhanced email system features

import { EnhancedGmailManager } from './enhanced-gmail-manager.js';
import { AISpamDetectionSystem } from './ai-spam-detection-system.js';
import { EmailCompositionSystem } from './email-composition-system.js';

async function testEnhancements() {
    console.log('🧪 Testing Enhanced Email System Features...');
    console.log('============================================');
    
    const results = {
        gmail: { status: 'not_tested', error: null },
        spamDetection: { status: 'not_tested', error: null },
        emailComposition: { status: 'not_tested', error: null }
    };

    // Test Enhanced Gmail Manager
    try {
        console.log('\\n📧 Testing Enhanced Gmail Manager...');
        const gmailManager = new EnhancedGmailManager();
        
        const profile = await gmailManager.getProfile();
        console.log(\`   ✅ Gmail Profile: \${profile.emailAddress}\`);
        
        const stats = await gmailManager.getStats();
        console.log(\`   ✅ Gmail Stats: \${stats.totalMessages} messages, \${stats.unreadMessages} unread\`);
        
        results.gmail.status = 'success';
        
    } catch (error) {
        console.error('   ❌ Gmail test failed:', error.message);
        results.gmail.status = 'failed';
        results.gmail.error = error.message;
    }

    // Test AI Spam Detection
    try {
        console.log('\\n🤖 Testing AI Spam Detection...');
        const spamDetector = new AISpamDetectionSystem();
        
        // Test with sample emails
        const sampleEmails = [
            {
                id: 'test1',
                from: 'test@example.com',
                subject: 'Hello there',
                snippet: 'This is a normal email',
                provider: 'test'
            },
            {
                id: 'test2', 
                from: 'spam@suspicious.com',
                subject: 'URGENT: Claim your prize now!!!',
                snippet: 'You have won $1,000,000! Click here immediately to claim!',
                provider: 'test'
            }
        ];
        
        const analysis = await spamDetector.batchAnalyzeEmails(sampleEmails, false);
        console.log(\`   ✅ Spam Analysis: \${analysis.summary.spam} spam detected out of \${analysis.summary.total}\`);
        
        const stats = spamDetector.getDetectionStats();
        console.log(\`   ✅ Detection Stats: \${stats.totalAnalyzed} analyzed, \${stats.spamDetected} spam\`);
        
        results.spamDetection.status = 'success';
        
    } catch (error) {
        console.error('   ❌ Spam detection test failed:', error.message);
        results.spamDetection.status = 'failed';
        results.spamDetection.error = error.message;
    }

    // Test Email Composition System
    try {
        console.log('\\n📤 Testing Email Composition System...');
        const compositionSystem = new EmailCompositionSystem();
        
        const accounts = compositionSystem.getAvailableAccounts();
        console.log(\`   ✅ Available Accounts: \${accounts.length} configured\`);
        
        const templates = compositionSystem.getAllTemplates();
        console.log(\`   ✅ Templates: \${templates.length} available\`);
        
        const signatures = compositionSystem.getAllSignatures();
        console.log(\`   ✅ Signatures: \${signatures.length} available\`);
        
        // Test email validation
        const isValid = await compositionSystem.validateEmail('test@example.com');
        console.log(\`   ✅ Email Validation: \${isValid ? 'Working' : 'Failed'}\`);
        
        results.emailComposition.status = 'success';
        
    } catch (error) {
        console.error('   ❌ Email composition test failed:', error.message);
        results.emailComposition.status = 'failed';
        results.emailComposition.error = error.message;
    }

    // Display Results Summary
    console.log('\\n📊 Test Results Summary:');
    console.log('========================');
    
    Object.entries(results).forEach(([feature, result]) => {
        const status = result.status === 'success' ? '✅' : 
                      result.status === 'failed' ? '❌' : '⚠️';
        console.log(\`\${status} \${feature}: \${result.status}\`);
        if (result.error) {
            console.log(\`   Error: \${result.error}\`);
        }
    });
    
    const successCount = Object.values(results).filter(r => r.status === 'success').length;
    const totalCount = Object.keys(results).length;
    
    console.log(\`\\n🎯 Overall: \${successCount}/\${totalCount} features working correctly\`);
    
    if (successCount === totalCount) {
        console.log('🎉 All enhancements are working perfectly!');
        return true;
    } else {
        console.log('⚠️ Some enhancements need attention. Check errors above.');
        return false;
    }
}

// Auto-run if called directly
if (import.meta.url === \`file://\${process.argv[1]}\`) {
    testEnhancements()
        .then((success) => {
            console.log('\\n🏁 Enhancement testing complete!');
            process.exit(success ? 0 : 1);
        })
        .catch((error) => {
            console.error('\\n❌ Test runner failed:', error.message);
            process.exit(1);
        });
}

export { testEnhancements };`;

        try {
            fs.writeFileSync('test-enhancements.js', testScript);
            console.log('   ✅ Created test-enhancements.js');
        } catch (error) {
            console.log('   ⚠️ Could not create test script:', error.message);
        }
    }

    createQuickStartScript() {
        console.log('\n⚡ Creating quick start script...');
        
        const quickStart = `#!/bin/bash
# File: D:\AI\Gits\email-agent_v01\quick-start.sh
# Quick start script for enhanced email system

echo "🚀 Starting Enhanced Email Management System..."
echo "=============================================="

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install || npm install
fi

# Check if .env exists with proper configuration
if [ ! -f ".env" ]; then
    echo "❌ .env file not found!"
    echo "Please run: node setup-enhancements.js first"
    exit 1
fi

# Start the enhanced API server
echo "🔄 Starting enhanced API server..."
node enhanced-api-server-v2.js &
SERVER_PID=$!

# Wait a moment for server to start
sleep 3

# Check if server is running
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ API server is running on port 3001"
    
    # Start frontend in new terminal/process
    echo "🎨 Starting frontend dashboard..."
    pnpm run frontend &
    FRONTEND_PID=$!
    
    echo ""
    echo "🎯 System Ready!"
    echo "✅ API Server: http://localhost:3001"
    echo "✅ Dashboard: http://localhost:3000" 
    echo ""
    echo "Press Ctrl+C to stop both servers"
    
    # Wait for interrupt signal
    trap "echo 'Stopping servers...'; kill $SERVER_PID $FRONTEND_PID; exit 0" INT
    wait
    
else
    echo "❌ API server failed to start!"
    echo "Check the logs above for errors"
    kill $SERVER_PID 2>/dev/null
    exit 1
fi`;

        try {
            fs.writeFileSync('quick-start.sh', quickStart);
            console.log('   ✅ Created quick-start.sh');
            
            // Make executable on Unix systems
            try {
                execSync('chmod +x quick-start.sh', { stdio: 'ignore' });
            } catch (error) {
                // Ignore on Windows
            }
        } catch (error) {
            console.log('   ⚠️ Could not create quick start script:', error.message);
        }
    }

    createWindowsStartScript() {
        console.log('\n🪟 Creating Windows start script...');
        
        const windowsStart = `@echo off
REM File: D:\AI\Gits\email-agent_v01\start-enhanced-system.bat
REM Windows batch file to start enhanced email system

echo 🚀 Starting Enhanced Email Management System...
echo ==============================================

REM Check if node_modules exists
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    call pnpm install || call npm install
)

REM Check if .env exists
if not exist ".env" (
    echo ❌ .env file not found!
    echo Please run: node setup-enhancements.js first
    pause
    exit /b 1
)

REM Start the enhanced API server
echo 🔄 Starting enhanced API server...
start "Enhanced API Server" cmd /k "node enhanced-api-server-v2.js"

REM Wait for server to start
timeout /t 5 /nobreak >nul

REM Check if server is responding
curl -s http://localhost:3001/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ API server is running on port 3001
    
    REM Start frontend
    echo 🎨 Starting frontend dashboard...
    start "Frontend Dashboard" cmd /k "pnpm run frontend"
    
    echo.
    echo 🎯 System Ready!
    echo ✅ API Server: http://localhost:3001
    echo ✅ Dashboard: http://localhost:3000
    echo.
    echo Press any key to continue...
    pause >nul
    
) else (
    echo ❌ API server failed to start!
    echo Check the server window for errors
    pause
)`;

        try {
            fs.writeFileSync('start-enhanced-system.bat', windowsStart);
            console.log('   ✅ Created start-enhanced-system.bat');
        } catch (error) {
            console.log('   ⚠️ Could not create Windows start script:', error.message);
        }
    }
}

// Auto-run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const setup = new EnhancementSetup();
    
    setup.runSetup()
        .then(() => {
            // Create additional helper scripts
            setup.createTestScript();
            setup.createQuickStartScript();
            setup.createWindowsStartScript();
            
            console.log('\n🎉 Complete enhancement setup finished!');
            console.log('\n🚀 Next Steps:');
            console.log('1. Run: node gmail-oauth-fix-enhanced.js (to fix Gmail)');
            console.log('2. Edit .env with your email credentials');
            console.log('3. Run: node enhanced-api-server-v2.js');
            console.log('4. Run: pnpm run frontend');
            console.log('\n✨ Enjoy your enhanced email management system!');
        })
        .catch((error) => {
            console.error('\n❌ Enhancement setup failed:', error.message);
            process.exit(1);
        });
}

export { EnhancementSetup };