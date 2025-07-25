// File: D:\AI\Gits\email-agent_v01\quick-verify.js
// Quick Verification Script - Email Agent MCP Project

import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('🔍 Email Agent MCP - Project Verification');
console.log('========================================\n');

// Start verification immediately
const issues = [];
const warnings = [];
const passed = [];

// Check project structure
console.log('📁 Checking project structure...');

const requiredFiles = [
    'package.json',
    'src/main.tsx',
    'src/components/EmailDashboard.jsx',
    'mcp-server/mcpServer.js',
    'connectors/yahooConnector.js',
    'connectors/gmailConnector.js'
];

const requiredDirs = [
    'src',
    'src/components', 
    'src/services',
    'mcp-server',
    'connectors'
];

// Check directories
requiredDirs.forEach(dir => {
    if (existsSync(join(__dirname, dir))) {
        passed.push(`✅ Directory exists: ${dir}`);
        console.log(`   ✅ Directory: ${dir}`);
    } else {
        issues.push(`❌ Missing directory: ${dir}`);
        console.log(`   ❌ Missing: ${dir}`);
    }
});

// Check files
requiredFiles.forEach(file => {
    if (existsSync(join(__dirname, file))) {
        passed.push(`✅ File exists: ${file}`);
        console.log(`   ✅ File: ${file}`);
    } else {
        issues.push(`❌ Missing file: ${file}`);
        console.log(`   ❌ Missing: ${file}`);
    }
});

console.log(`\n   Found ${passed.filter(p => p.includes('Directory')).length}/${requiredDirs.length} directories`);
console.log(`   Found ${passed.filter(p => p.includes('File')).length}/${requiredFiles.length} core files\n`);

// Check environment file
console.log('🔧 Checking environment configuration...');

const envPath = join(__dirname, '.env');

if (!existsSync(envPath)) {
    issues.push('❌ .env file not found');
    console.log('   ❌ .env file not found');
} else {
    console.log('   ✅ .env file exists');
    
    try {
        const envContent = readFileSync(envPath, 'utf8');
        
        const requiredEnvVars = [
            'MCP_SERVER_PORT',
            'API_PORT', 
            'YAHOO_CLIENT_ID',
            'YAHOO_CLIENT_SECRET',
            'YAHOO_EMAIL'
        ];

        requiredEnvVars.forEach(envVar => {
            const regex = new RegExp(`^${envVar}=(.*)$`, 'm');
            const match = envContent.match(regex);
            const value = match ? match[1].trim() : null;
            
            if (value && value.length > 0) {
                passed.push(`✅ ${envVar} configured`);
                console.log(`   ✅ ${envVar}: configured`);
            } else {
                issues.push(`❌ Missing or empty: ${envVar}`);
                console.log(`   ❌ ${envVar}: missing or empty`);
            }
        });

    } catch (error) {
        issues.push(`❌ Error reading .env file: ${error.message}`);
        console.log(`   ❌ Error reading .env: ${error.message}`);
    }
}

console.log('\n');

// Check dependencies
console.log('📦 Checking dependencies...');

const packagePath = join(__dirname, 'package.json');

if (!existsSync(packagePath)) {
    issues.push('❌ package.json not found');
    console.log('   ❌ package.json not found');
} else {
    console.log('   ✅ package.json exists');
    
    try {
        const packageContent = JSON.parse(readFileSync(packagePath, 'utf8'));
        
        const criticalDeps = [
            'react',
            'react-dom',
            '@modelcontextprotocol/sdk',
            'googleapis',
            'express',
            'dotenv'
        ];

        const hasDependencies = packageContent.dependencies || {};
        const hasDevDependencies = packageContent.devDependencies || {};
        const allDeps = { ...hasDependencies, ...hasDevDependencies };

        criticalDeps.forEach(dep => {
            if (allDeps[dep]) {
                passed.push(`✅ ${dep} v${allDeps[dep]}`);
                console.log(`   ✅ ${dep}: v${allDeps[dep]}`);
            } else {
                issues.push(`❌ Missing dependency: ${dep}`);
                console.log(`   ❌ Missing: ${dep}`);
            }
        });

        // Check if node_modules exists
        if (existsSync(join(__dirname, 'node_modules'))) {
            passed.push('✅ node_modules directory exists');
            console.log('   ✅ node_modules directory exists');
        } else {
            warnings.push('⚠️  node_modules not found - run pnpm install');
            console.log('   ⚠️  node_modules not found - run pnpm install');
        }

    } catch (error) {
        issues.push(`❌ Error reading package.json: ${error.message}`);
        console.log(`   ❌ Error reading package.json: ${error.message}`);
    }
}

console.log('\n');

// Generate final report
console.log('='.repeat(60));
console.log('📊 PROJECT VERIFICATION REPORT');
console.log('='.repeat(60));

const totalChecks = passed.length + issues.length + warnings.length;
console.log(`\n📈 Summary: ${totalChecks} checks performed`);
console.log(`✅ Passed: ${passed.length}`);
console.log(`⚠️  Warnings: ${warnings.length}`);
console.log(`❌ Issues: ${issues.length}\n`);

// Critical issues
if (issues.length > 0) {
    console.log('🚨 CRITICAL ISSUES (Must fix before proceeding):');
    issues.forEach(issue => console.log(`   ${issue}`));
    console.log();
}

// Warnings
if (warnings.length > 0) {
    console.log('⚠️  WARNINGS (Recommended to address):');
    warnings.forEach(warning => console.log(`   ${warning}`));
    console.log();
}

// Overall status
if (issues.length === 0) {
    console.log('🎉 PROJECT STATUS: READY FOR YAHOO OAUTH SETUP');
    console.log('✅ All critical components are in place');
    console.log('🔄 Next step: Run Yahoo OAuth setup for your accounts');
    console.log();
    console.log('📝 Recommended commands:');
    console.log('   1. Create Yahoo OAuth scripts');
    console.log('   2. Run: node yahoo-multi-account-setup.js');
    console.log('   3. Run: node test-providers.js');
    console.log('   4. Run: pnpm run dev');
} else {
    console.log('❌ PROJECT STATUS: NEEDS ATTENTION');
    console.log(`🔧 ${issues.length} critical issue(s) must be resolved first`);
    console.log();
    console.log('📝 Recommended actions:');
    console.log('   1. Fix the critical issues listed above');
    console.log('   2. Re-run this verification script');
    console.log('   3. Install dependencies with: pnpm install');
    console.log('   4. Check your .env file configuration');
}

console.log('\n' + '='.repeat(60));
console.log('✅ Verification complete!');