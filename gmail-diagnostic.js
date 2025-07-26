// File path: D:\AI\Gits\email-agent_v01\gmail-diagnostic.js
// Gmail Integration Diagnostic Tool
// Created: January 25, 2025
// Purpose: Diagnose Gmail OAuth and API issues
// Updated: Fixed for ES module compatibility and removed syntax errors

import dotenv from 'dotenv';
import { google } from 'googleapis';

dotenv.config();

async function diagnoseGmailIntegration() {
    console.log('🔍 Gmail Integration Diagnostic Starting...\n');
    
    // Check environment variables
    console.log('📊 Environment Variables Check:');
    const requiredVars = [
        'GMAIL_CLIENT_ID',
        'GMAIL_CLIENT_SECRET', 
        'GMAIL_EMAIL',
        'GMAIL_REFRESH_TOKEN'
    ];
    
    let missingVars = [];
    requiredVars.forEach(varName => {
        const value = process.env[varName];
        if (!value) {
            missingVars.push(varName);
            console.log(`❌ ${varName}: Missing`);
        } else {
            // Show partial value for security
            const masked = value.length > 10 ? 
                value.substring(0, 8) + '...' + value.substring(value.length - 4) :
                '***masked***';
            console.log(`✅ ${varName}: ${masked}`);
        }
    });
    
    if (missingVars.length > 0) {
        console.log(`\n❌ Missing required variables: ${missingVars.join(', ')}`);
        return false;
    }
    
    // Test Gmail API connection
    console.log('\n📧 Testing Gmail API Connection:');
    try {
        // Create OAuth2 client
        const oauth2Client = new google.auth.OAuth2(
            process.env.GMAIL_CLIENT_ID,
            process.env.GMAIL_CLIENT_SECRET,
            'http://localhost:8080/auth/google/callback'
        );
        
        // Set credentials
        oauth2Client.setCredentials({
            refresh_token: process.env.GMAIL_REFRESH_TOKEN
        });
        
        // Test connection by getting profile
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        
        console.log('🔄 Attempting to fetch Gmail profile...');
        const profile = await gmail.users.getProfile({ userId: 'me' });
        
        console.log(`✅ Gmail Profile: ${profile.data.emailAddress}`);
        console.log(`📊 Total Messages: ${profile.data.messagesTotal}`);
        console.log(`📬 Total Threads: ${profile.data.threadsTotal}`);
        
        // Test message access
        console.log('\n📨 Testing Message Access:');
        const messages = await gmail.users.messages.list({
            userId: 'me',
            maxResults: 5
        });
        
        console.log(`✅ Can access messages: Found ${messages.data.messages?.length || 0} recent messages`);
        
        // Test label access (indicates permissions)
        console.log('\n🏷️ Testing Label Access:');
        const labels = await gmail.users.labels.list({ userId: 'me' });
        console.log(`✅ Can access labels: Found ${labels.data.labels?.length || 0} labels`);
        
        console.log('\n🎉 Gmail API Connection: SUCCESS');
        return true;
        
    } catch (error) {
        console.log(`\n❌ Gmail API Connection: FAILED`);
        console.log(`Error: ${error.message}`);
        
        // Analyze specific error types
        if (error.message.includes('invalid_grant')) {
            console.log('\n🔧 Suggested Fix:');
            console.log('- OAuth refresh token is expired or invalid');
            console.log('- Need to re-run OAuth flow');
            console.log('- Run: node quick-gmail-fix.js');
        } else if (error.message.includes('insufficient_scope')) {
            console.log('\n🔧 Suggested Fix:');
            console.log('- OAuth scopes are insufficient');
            console.log('- Need to request additional permissions');
            console.log('- Update OAuth consent screen');
        } else if (error.message.includes('rate_limit')) {
            console.log('\n🔧 Suggested Fix:');
            console.log('- Gmail API rate limit exceeded');
            console.log('- Implement exponential backoff');
            console.log('- Reduce API call frequency');
        }
        
        return false;
    }
}

// Test Gmail API package availability
function testGoogleApiPackage() {
    console.log('📦 Testing Google APIs Package:');
    try {
        // Already imported at top, so just check if google object exists
        if (google && google.gmail) {
            console.log('✅ googleapis package: Available');
            return true;
        } else {
            console.log('❌ googleapis package: Incomplete');
            return false;
        }
    } catch (error) {
        console.log('❌ googleapis package: Missing');
        console.log('Install with: npm install googleapis');
        return false;
    }
}

// Main diagnostic function
async function main() {
    console.log('='.repeat(50));
    console.log('📧 GMAIL INTEGRATION DIAGNOSTIC TOOL');
    console.log('='.repeat(50));
    
    // Test package availability
    if (!testGoogleApiPackage()) {
        console.log('\n❌ Cannot continue without googleapis package');
        return;
    }
    
    // Run diagnostic
    const success = await diagnoseGmailIntegration();
    
    console.log('\n' + '='.repeat(50));
    if (success) {
        console.log('🎉 DIAGNOSIS COMPLETE: Gmail integration is working!');
        console.log('✅ You can proceed with using Gmail features');
    } else {
        console.log('⚠️ DIAGNOSIS COMPLETE: Gmail integration needs fixing');
        console.log('🔧 Please follow the suggested fixes above');
        console.log('📝 Most likely need to run: node quick-gmail-fix.js');
    }
    console.log('='.repeat(50));
}

// Run diagnostic if this file is executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
    main().catch(console.error);
}

export { diagnoseGmailIntegration };