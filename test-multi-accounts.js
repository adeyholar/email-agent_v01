// test-multi-accounts.js - Test Multiple Accounts
import { MultiAccountManager } from './connectors/multiAccountManager.js';
import dotenv from 'dotenv';

dotenv.config();

async function testMultiAccounts() {
    const manager = new MultiAccountManager();
    
    console.log('📧 All configured accounts:');
    const accounts = manager.getAllAccounts();
    accounts.forEach(account => {
        console.log(`- ${account.name} (${account.email}) [${account.provider}]`);
    });
    
    console.log('\n🔄 Initializing all accounts...');
    const results = await manager.initializeAllAccounts();
    
    console.log('\n📊 Account Summary:');
    console.table(manager.getAccountSummary());
    
    console.log('\n📬 Unread counts by account:');
    const unreadCounts = await manager.getUnreadCounts();
    Object.entries(unreadCounts.byAccount).forEach(([accountId, data]) => {
        console.log(`${data.account.name}: ${data.count} unread`);
    });
    
    console.log(`\nTotal unread across all accounts: ${unreadCounts.total}`);
}

testMultiAccounts().catch(console.error);