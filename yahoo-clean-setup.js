// File: D:\AI\Gits\email-agent_v01\yahoo-clean-setup.js
// Yahoo OAuth Setup - Clean Simple Version

import { createServer } from 'http';
import { parse } from 'url';
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('🚀 Yahoo OAuth Setup - Clean Version');
console.log('====================================\n');

// Check environment variables
const YAHOO_CLIENT_ID = process.env.YAHOO_CLIENT_ID;
const YAHOO_CLIENT_SECRET = process.env.YAHOO_CLIENT_SECRET;
const YAHOO_EMAIL = process.env.YAHOO_EMAIL;

if (!YAHOO_CLIENT_ID || !YAHOO_CLIENT_SECRET) {
    console.error('❌ Missing Yahoo OAuth credentials in .env file');
    process.exit(1);
}

console.log('✅ Yahoo credentials found in .env');
console.log('📧 Setting up OAuth for: ' + (YAHOO_EMAIL || 'your Yahoo email'));
console.log();

// Since Mail API isn't available, let's focus on what we can do
console.log('⚠️  IMPORTANT NOTICE:');
console.log('📧 Yahoo Mail API is not available in your app permissions.');
console.log('🔄 Let me suggest a better approach...');
console.log();

console.log('🎯 RECOMMENDED SOLUTION:');
console.log('Since Yahoo Mail API is restricted, let\s use one of these approaches:');
console.log();

console.log('1️⃣  IMAP Access (Recommended for Yahoo):');
console.log('   • More reliable than OAuth for Yahoo');
console.log('   • Uses Yahoo App Password');
console.log('   • Direct email access');
console.log();

console.log('2️⃣  Focus on Gmail First:');
console.log('   • Gmail definitely has Mail API access');
console.log('   • Get the system working with Gmail');
console.log('   • Add Yahoo IMAP later');
console.log();

console.log('3️⃣  Manual OAuth Test (Limited):');
console.log('   • Test basic OAuth flow');
console.log('   • Get profile info only');
console.log('   • No email content access');
console.log();

// Ask user what they want to do
console.log('📝 NEXT STEPS:');
console.log('Choose your preferred approach:');
console.log();
console.log('A) Set up Yahoo IMAP (recommended)');
console.log('B) Switch to Gmail OAuth first');
console.log('C) Test basic Yahoo OAuth (profile only)');
console.log();

console.log('💡 RECOMMENDATION: Start with Gmail OAuth since it has full Mail API access,');
console.log('   then add Yahoo via IMAP for reliable email access.');
console.log();

// Let's create the IMAP setup option
console.log('🔧 Yahoo IMAP Setup Info:');
console.log('If you choose IMAP approach:');
console.log('1. Go to Yahoo Account Security');
console.log('2. Enable "Less secure app access" or create App Password');
console.log('3. Use IMAP settings:');
console.log('   • Server: imap.mail.yahoo.com');
console.log('   • Port: 993');
console.log('   • Security: SSL/TLS');
console.log();

// Save the options to a file
const options = {
    yahoo_issue: 'Mail API not available in Yahoo app permissions',
    recommendations: [
        {
            option: 'A',
            name: 'Yahoo IMAP Setup',
            description: 'Use IMAP with app password for reliable email access',
            next_script: 'yahoo-imap-setup.js'
        },
        {
            option: 'B', 
            name: 'Gmail OAuth First',
            description: 'Set up Gmail OAuth which has full Mail API access',
            next_script: 'gmail-oauth-setup.js'
        },
        {
            option: 'C',
            name: 'Basic Yahoo OAuth Test',
            description: 'Test OAuth flow with profile access only',
            next_script: 'yahoo-profile-oauth.js'
        }
    ],
    yahoo_imap_settings: {
        server: 'imap.mail.yahoo.com',
        port: 993,
        security: 'SSL/TLS',
        auth_method: 'App Password recommended'
    },
    timestamp: new Date().toISOString()
};

writeFileSync('yahoo-setup-options.json', JSON.stringify(options, null, 2));
console.log('💾 Options saved to: yahoo-setup-options.json');
console.log();

console.log('🚀 READY TO PROCEED:');
console.log('Let me know which option you prefer (A, B, or C)');
console.log('and I\'ll provide the specific setup script for that approach!');