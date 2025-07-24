// simple-test.js - Basic Email Provider Test

import dotenv from 'dotenv';

dotenv.config();

async function basicTest() {
    console.log('🧪 Basic Email Provider Test\n');
    
    // Check environment variables
    console.log('📋 Environment Configuration:');
    console.log('Gmail configured:', !!process.env.GMAIL_CLIENT_ID);
    console.log('Yahoo configured:', !!process.env.YAHOO_CLIENT_ID);
    console.log('AOL configured:', !!process.env.AOL_CLIENT_ID);
    console.log('');
    
    // Test Gmail connector (if configured)
    if (process.env.GMAIL_CLIENT_ID) {
        try {
            console.log('🔍 Testing Gmail connector...');
            const { GmailConnector } = await import('./connectors/gmailConnector.js');
            const gmail = new GmailConnector();
            console.log('✅ Gmail connector imported successfully');
        } catch (error) {
            console.log('❌ Gmail connector error:', error.message);
        }
    } else {
        console.log('⚠️ Gmail not configured (missing GMAIL_CLIENT_ID)');
    }
    
    // Test Yahoo connector (if configured)
    if (process.env.YAHOO_CLIENT_ID) {
        try {
            console.log('🔍 Testing Yahoo connector...');
            const { YahooConnector } = await import('./connectors/yahooConnector.js');
            const yahoo = new YahooConnector('yahoo');
            console.log('✅ Yahoo connector imported successfully');
        } catch (error) {
            console.log('❌ Yahoo connector error:', error.message);
        }
    } else {
        console.log('⚠️ Yahoo not configured (missing YAHOO_CLIENT_ID)');
    }
    
    // Test EmailProviderManager
    try {
        console.log('🔍 Testing Email Provider Manager...');
        const { EmailProviderManager } = await import('./connectors/emailProviderManager.js');
        const manager = new EmailProviderManager();
        console.log('✅ Email Provider Manager imported successfully');
        
        // Get provider status without initializing
        const status = manager.getProviderStatus();
        console.log('\n📊 Provider Status (before initialization):');
        Object.entries(status).forEach(([id, info]) => {
            console.log(`- ${info.name}: ${info.enabled ? 'Enabled' : 'Not enabled'}`);
        });
        
    } catch (error) {
        console.log('❌ Email Provider Manager error:', error.message);
        console.log('Full error:', error.stack);
    }
    
    console.log('\n✅ Basic test completed!');
    console.log('\nNext steps:');
    console.log('1. Configure OAuth credentials in .env file');
    console.log('2. Run: node test-providers.js (after fixing the script)');
}

basicTest().catch(error => {
    console.error('❌ Basic test failed:', error.message);
    console.error('Stack:', error.stack);
});