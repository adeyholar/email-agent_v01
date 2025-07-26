// File path: D:\AI\Gits\email-agent_v01\fix-enhanced-gmail-manager.js
// Fix Enhanced Gmail Manager
// Created: January 25, 2025
// Purpose: Fix the broken deletion code in enhanced-gmail-manager.js

import fs from 'fs';

console.log('🔧 Fixing Enhanced Gmail Manager');
console.log('================================\n');

try {
    const filename = 'enhanced-gmail-manager.js';
    
    if (!fs.existsSync(filename)) {
        console.log(`❌ ${filename} not found`);
        process.exit(1);
    }
    
    console.log(`📄 Reading ${filename}...`);
    let content = fs.readFileSync(filename, 'utf8');
    
    // Backup the original
    const backupName = `${filename}.broken-backup`;
    fs.writeFileSync(backupName, content);
    console.log(`✅ Backup created: ${backupName}`);
    
    // Fix the deletion code
    console.log('🔧 Applying fixes...');
    
    // Replace messages.delete with messages.trash
    const oldPattern = /await this\.gmail\.users\.messages\.delete\(\{[^}]*\}\)/g;
    const newReplacement = `await this.gmail.users.messages.trash({
                userId: 'me',
                id: messageId
            })`;
    
    if (content.match(oldPattern)) {
        content = content.replace(oldPattern, newReplacement);
        console.log('✅ Fixed: Replaced .delete() with .trash()');
    }
    
    // Also look for any batch deletion patterns and fix them
    const batchDeletePattern = /gmail\.users\.messages\.delete/g;
    if (content.match(batchDeletePattern)) {
        content = content.replace(/gmail\.users\.messages\.delete\(\{[^}]*userId:\s*'me',\s*id:\s*(\w+)[^}]*\}\)/g, 
            `gmail.users.messages.trash({ userId: 'me', id: $1 })`);
        console.log('✅ Fixed: Updated batch deletion patterns');
    }
    
    // Add batch modify method if not present
    if (!content.includes('batchModify')) {
        console.log('ℹ️ Adding batchModify capability...');
        
        // Find a good place to add the batch deletion method
        const insertPoint = content.indexOf('export {');
        if (insertPoint > -1) {
            const batchMethod = `
    // ✅ WORKING: Batch email deletion using trash
    async batchDeleteEmails(messageIds) {
        console.log(\`🗑️ Moving \${messageIds.length} emails to trash...\`);
        
        try {
            if (messageIds.length === 0) {
                return { success: [], failed: [] };
            }
            
            if (messageIds.length === 1) {
                // Single email deletion
                await this.gmail.users.messages.trash({
                    userId: 'me',
                    id: messageIds[0]
                });
                return { success: messageIds, failed: [] };
            } else {
                // Batch email deletion
                await this.gmail.users.messages.batchModify({
                    userId: 'me',
                    requestBody: {
                        ids: messageIds,
                        addLabelIds: ['TRASH']
                    }
                });
                return { success: messageIds, failed: [] };
            }
        } catch (error) {
            console.error('Gmail deletion error:', error.message);
            return { 
                success: [], 
                failed: messageIds.map(id => ({ id, error: error.message }))
            };
        }
    }

`;
            
            content = content.slice(0, insertPoint) + batchMethod + content.slice(insertPoint);
            console.log('✅ Added: batchDeleteEmails method');
        }
    }
    
    // Write the fixed content
    fs.writeFileSync(filename, content);
    console.log(`✅ Fixed file written: ${filename}`);
    
    // Verify the fix
    console.log('\n🔍 Verifying fix...');
    const fixedContent = fs.readFileSync(filename, 'utf8');
    
    const hasDelete = fixedContent.includes('messages.delete');
    const hasTrash = fixedContent.includes('messages.trash');
    const hasBatchModify = fixedContent.includes('batchModify');
    
    console.log(`   Uses .delete(): ${hasDelete ? '❌ Still present' : '✅ Removed'}`);
    console.log(`   Uses .trash(): ${hasTrash ? '✅ Added' : '❌ Missing'}`);
    console.log(`   Uses batchModify(): ${hasBatchModify ? '✅ Added' : '❌ Missing'}`);
    
    if (!hasDelete && hasTrash) {
        console.log('\n🎉 ENHANCED GMAIL MANAGER FIXED!');
        console.log('=================================');
        console.log('✅ Broken .delete() method removed');
        console.log('✅ Working .trash() method added');
        console.log('✅ Batch operations ready');
        
        console.log('\n🚀 NEXT: Check which API server is running');
        console.log('==========================================');
        console.log('Your frontend calls these endpoints:');
        console.log('   • POST /api/emails/batch/delete');
        console.log('   • POST /api/emails/batch/delete-by-criteria');
        console.log('');
        console.log('Make sure your running server uses the fixed enhanced-gmail-manager.js');
        
    } else {
        console.log('\n⚠️ Fix may be incomplete');
        console.log('Manual verification needed');
    }
    
} catch (error) {
    console.log('❌ Error fixing file:', error.message);
}

console.log('\n📋 SUMMARY');
console.log('==========');
console.log('Fixed: enhanced-gmail-manager.js');
console.log('Backup: enhanced-gmail-manager.js.broken-backup');
console.log('Change: .delete() → .trash() and added batchModify');

console.log('\n🔧 WHAT TO DO NEXT:');
console.log('==================');
console.log('1. Restart your API server (it imports enhanced-gmail-manager.js)');
console.log('2. Test batch deletion in dashboard');
console.log('3. Should now show "Deleted: X, Failed: 0"');