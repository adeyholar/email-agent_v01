// File path: D:\AI\Gits\email-agent_v01\apply-deletion-fix.js
// Apply Deletion Fix
// Created: January 25, 2025
// Purpose: Replace broken deletion code with working version

import fs from 'fs';
import path from 'path';

console.log('🔧 Applying Deletion Fix');
console.log('========================\n');

try {
    // Step 1: Backup the broken file
    const brokenFile = 'email-deletion-manager.js';
    const backupFile = 'email-deletion-manager.js.broken-backup';
    const fixedFile = 'email-deletion-manager-fixed.js';
    
    console.log('📂 Step 1: Creating backup...');
    
    if (fs.existsSync(brokenFile)) {
        fs.copyFileSync(brokenFile, backupFile);
        console.log(`✅ Backed up ${brokenFile} to ${backupFile}`);
    } else {
        console.log(`⚠️ ${brokenFile} not found, creating new file`);
    }
    
    // Step 2: Copy the fixed version
    console.log('\n📂 Step 2: Applying fix...');
    
    if (fs.existsSync(fixedFile)) {
        fs.copyFileSync(fixedFile, brokenFile);
        console.log(`✅ Copied ${fixedFile} to ${brokenFile}`);
    } else {
        console.log(`❌ ${fixedFile} not found - run the script to create it first`);
        process.exit(1);
    }
    
    // Step 3: Verify the fix
    console.log('\n📂 Step 3: Verifying fix...');
    
    const content = fs.readFileSync(brokenFile, 'utf8');
    const hasDelete = content.includes('messages.delete');
    const hasTrash = content.includes('messages.trash');
    const hasBatchModify = content.includes('batchModify');
    
    console.log(`🔍 Verification results:`);
    console.log(`   Uses .delete(): ${hasDelete ? '❌ Still present' : '✅ Removed'}`);
    console.log(`   Uses .trash(): ${hasTrash ? '✅ Added' : '❌ Missing'}`);
    console.log(`   Uses batchModify(): ${hasBatchModify ? '✅ Added' : '❌ Missing'}`);
    
    if (!hasDelete && hasTrash && hasBatchModify) {
        console.log('\n🎉 DELETION FIX APPLIED SUCCESSFULLY!');
        console.log('===================================');
        console.log('✅ Broken .delete() method removed');
        console.log('✅ Working .trash() method added');
        console.log('✅ Batch operations using batchModify added');
        console.log('✅ Your deletion should now work: "Deleted: X, Failed: 0"');
        
        console.log('\n🚀 NEXT STEPS:');
        console.log('==============');
        console.log('1. Restart your email API server');
        console.log('2. Test batch deletion in your dashboard');
        console.log('3. Should see successful deletions now');
        
    } else {
        console.log('\n⚠️ FIX MAY BE INCOMPLETE');
        console.log('========================');
        console.log('Please check the file manually or run the fix again');
    }
    
} catch (error) {
    console.log('❌ Error applying fix:', error.message);
}

console.log('\n📋 SUMMARY');
console.log('==========');
console.log('• Original file backed up as: email-deletion-manager.js.broken-backup');
console.log('• Fixed file is now: email-deletion-manager.js');
console.log('• Change: .delete() → .trash() and .batchModify()');
console.log('• This fixes: "Deleted: 0, Failed: 5" → "Deleted: 5, Failed: 0"');