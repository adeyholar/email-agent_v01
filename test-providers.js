// test-providers.js - Test Multi-Provider Email Connections (Fixed)

import { EmailProviderManager } from './connectors/emailProviderManager.js';
import dotenv from 'dotenv';

dotenv.config();

async function testAllProviders() {
    console.log('🧪 Testing Email Provider Connections...\n');
    
    const manager = new EmailProviderManager();
    
    try {
        // Initialize all providers
        console.log('📧 Initializing providers...');
        const initResults = await manager.initializeProviders();
        
        Object.entries(initResults).forEach(([provider, result]) => {
            if (result.success) {
                console.log(`✅ ${provider}: ${result.message}`);
            } else {
                console.log(`❌ ${provider}: ${result.error}`);
            }
        });
        
        console.log('\n📊 Provider Status:');
        const status = manager.getProviderStatus();
        console.table(status);
        
        // Test connections
        console.log('\n🔗 Testing connections...');
        const testResults = await manager.testConnections();
        
        Object.entries(testResults).forEach(([provider, result]) => {
            if (result.success) {
                console.log(`✅ ${result.providerName}: ${result.message}`);
            } else {
                console.log(`❌ ${result.providerName}: ${result.error || result.message}`);
            }
        });
        
        // Get unread counts
        console.log('\n📬 Unread email counts:');
        const unreadCounts = await manager.getUnreadCounts();
        console.log(`Total unread: ${unreadCounts.total}`);
        
        Object.entries(unreadCounts.byProvider).forEach(([provider, data]) => {
            console.log(`${data.providerName}: ${data.count} unread`);
        });
        
        // Search across all providers
        console.log('\n🔍 Testing search across all providers...');
        const searchResults = await manager.searchAllProviders({
            query: '',
            timeRange: 'week',
            maxResults: 5
        });
        
        console.log(`Found ${searchResults.totalEmails} emails across ${searchResults.activeProviders.length} providers`);
        
        searchResults.combined.slice(0, 3).forEach(email => {
            console.log(`- [${email.providerName}] ${email.subject} (${email.from})`);
        });
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Run tests
testAllProviders().catch(console.error);