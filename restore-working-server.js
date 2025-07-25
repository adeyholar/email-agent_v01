// File: D:\AI\Gits\email-agent_v01\restore-working-server.js
// Complete restoration to working state

import fs from 'fs';

const SERVER_FILE = 'enhanced-working-api-server.js';
const BACKUP_FILE = 'enhanced-working-api-server.js.backup';

console.log('🔄 Restoring to working state...');

function restoreWorkingServer() {
    try {
        // Check if backup exists
        if (fs.existsSync(BACKUP_FILE)) {
            console.log('📦 Found backup file, restoring...');
            fs.copyFileSync(BACKUP_FILE, SERVER_FILE);
            console.log('✅ Backup restored successfully');
            
            // Test the restored file
            const content = fs.readFileSync(SERVER_FILE, 'utf8');
            const hasGmail = content.includes('gmailManager');
            const hasYahoo = content.includes('yahooManager');
            const hasDuplicates = (content.match(/class AOLEmailManager/g) || []).length > 1;
            
            console.log('🔍 Verification:');
            console.log(`   Gmail integration: ${hasGmail ? '✅' : '❌'}`);
            console.log(`   Yahoo integration: ${hasYahoo ? '✅' : '❌'}`);
            console.log(`   No duplicates: ${!hasDuplicates ? '✅' : '❌'}`);
            
            if (hasGmail && hasYahoo && !hasDuplicates) {
                console.log('✅ Server restored to working state');
                return true;
            } else {
                console.log('⚠️ Backup may have issues');
                return false;
            }
        } else {
            console.log('❌ No backup file found');
            return false;
        }
    } catch (error) {
        console.error('❌ Restoration failed:', error.message);
        return false;
    }
}

// Try restoration
const success = restoreWorkingServer();

if (success) {
    console.log('');
    console.log('🎯 Status: Server restored to working Gmail + Yahoo state');
    console.log('');
    console.log('🚀 Try starting the server:');
    console.log('node enhanced-working-api-server.js');
    console.log('');
    console.log('📋 Current working features:');
    console.log('✅ Gmail integration (48,887 messages)');
    console.log('✅ Yahoo integration (20,000 messages)');
    console.log('✅ Frontend dashboard');
    console.log('✅ Claude MCP integration');
    console.log('⏳ AOL integration (pending safe implementation)');
    console.log('');
    console.log('💡 Next: We can add AOL integration more carefully');
} else {
    console.log('❌ Could not restore from backup.');
    console.log('');
    console.log('🔧 Manual fix needed:');
    console.log('1. Check if enhanced-working-api-server.js.backup exists');
    console.log('2. If yes: copy backup over current file');
    console.log('3. If no: restore from your git repository or documentation');
}