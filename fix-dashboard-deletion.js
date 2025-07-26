// File path: D:\AI\Gits\email-agent_v01\fix-dashboard-deletion.js
// Fix Dashboard Deletion Code
// Created: January 25, 2025
// Purpose: Patch your existing deletion code to use working Gmail methods

import fs from 'fs';
import path from 'path';

console.log('🔧 Fixing Dashboard Deletion Code');
console.log('=================================\n');

// Files that likely contain deletion code
const filesToCheck = [
    'enhanced-working-api-server.js',
    'enhanced-working-api-server-fixed.js',
    'email-deletion-manager.js',
    'src/components/ScalableDashboard.jsx'
];

console.log('🔍 Searching for deletion code in your files...\n');

for (const fileName of filesToCheck) {
    const filePath = path.join(process.cwd(), fileName);
    
    try {
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            
            // Check for problematic deletion patterns
            const hasDelete = content.includes('messages.delete');
            const hasTrash = content.includes('messages.trash');
            const hasBatchModify = content.includes('batchModify');
            
            console.log(`📄 ${fileName}:`);
            console.log(`   🗑️ Uses .delete(): ${hasDelete ? '❌ FOUND (needs fixing)' : '✅ No'}`);
            console.log(`   🗑️ Uses .trash(): ${hasTrash ? '✅ Good' : '⚠️ Missing'}`);
            console.log(`   📦 Uses batchModify(): ${hasBatchModify ? '✅ Good' : '⚠️ Missing'}`);
            
            if (hasDelete && !hasTrash) {
                console.log(`   🔧 Action needed: Replace .delete() with .trash()`);
            }
            console.log();
        } else {
            console.log(`📄 ${fileName}: File not found`);
        }
    } catch (error) {
        console.log(`📄 ${fileName}: Error reading file - ${error.message}`);
    }
}

console.log('🔧 GMAIL DELETION FIX GUIDE');
console.log('===========================\n');

console.log('Replace this BROKEN pattern:');
console.log('```javascript');
console.log('// ❌ BROKEN - Permanent deletion');
console.log('await gmail.users.messages.delete({');
console.log('    userId: "me",');
console.log('    id: messageId');
console.log('});');
console.log('```\n');

console.log('With this WORKING pattern:');
console.log('```javascript');
console.log('// ✅ WORKING - Move to trash');
console.log('await gmail.users.messages.trash({');
console.log('    userId: "me",');
console.log('    id: messageId');
console.log('});');
console.log('```\n');

console.log('For BATCH deletion, replace:');
console.log('```javascript');
console.log('// ❌ BROKEN - Batch permanent deletion');
console.log('for (const id of messageIds) {');
console.log('    await gmail.users.messages.delete({ userId: "me", id });');
console.log('}');
console.log('```\n');

console.log('With this WORKING batch pattern:');
console.log('```javascript');
console.log('// ✅ WORKING - Batch move to trash');
console.log('await gmail.users.messages.batchModify({');
console.log('    userId: "me",');
console.log('    requestBody: {');
console.log('        ids: messageIds,');
console.log('        addLabelIds: ["TRASH"]');
console.log('    }');
console.log('});');
console.log('```\n');

console.log('🎯 SPECIFIC ENDPOINT FIXES');
console.log('==========================\n');

// Common API endpoint patterns that need fixing
console.log('If you have an API endpoint like:');
console.log('```javascript');
console.log('app.post("/api/emails/batch/delete", async (req, res) => {');
console.log('    const { emailIds } = req.body;');
console.log('    ');
console.log('    // ❌ BROKEN CODE:');
console.log('    // for (const id of emailIds) {');
console.log('    //     await gmail.users.messages.delete({ userId: "me", id });');
console.log('    // }');
console.log('    ');
console.log('    // ✅ WORKING CODE:');
console.log('    try {');
console.log('        await gmail.users.messages.batchModify({');
console.log('            userId: "me",');
console.log('            requestBody: {');
console.log('                ids: emailIds,');
console.log('                addLabelIds: ["TRASH"]');
console.log('            }');
console.log('        });');
console.log('        ');
console.log('        res.json({');
console.log('            success: true,');
console.log('            deleted: emailIds.length,');
console.log('            failed: 0,');
console.log('            method: "moved_to_trash"');
console.log('        });');
console.log('    } catch (error) {');
console.log('        res.status(500).json({');
console.log('            success: false,');
console.log('            error: error.message');
console.log('        });');
console.log('    }');
console.log('});');
console.log('```\n');

console.log('💡 WHY THIS WORKS');
console.log('=================\n');
console.log('✅ Your OAuth token has "gmail.modify" permission');
console.log('✅ Moving to trash is reversible (users can restore)');
console.log('✅ Batch operations are more efficient');
console.log('✅ This is the standard Gmail behavior');
console.log('❌ Permanent deletion requires special Google approval');
console.log();

console.log('🚀 NEXT STEPS');
console.log('=============\n');
console.log('1. Find your deletion code (likely in API server)');
console.log('2. Replace .delete() calls with .trash() or batchModify()');
console.log('3. Test with your email dashboard');
console.log('4. Should see "Deleted: X, Failed: 0" instead of "Deleted: 0, Failed: X"');
console.log();

// Let's also create a working deletion function they can copy
console.log('📋 READY-TO-USE DELETION FUNCTION');
console.log('=================================\n');

const workingCode = `
// Copy this working Gmail deletion function:
async function deleteGmailEmails(gmail, messageIds) {
    try {
        if (messageIds.length === 0) {
            return { success: [], failed: [] };
        }
        
        if (messageIds.length === 1) {
            // Single email deletion
            await gmail.users.messages.trash({
                userId: 'me',
                id: messageIds[0]
            });
            return { success: messageIds, failed: [] };
        } else {
            // Batch email deletion
            await gmail.users.messages.batchModify({
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

console.log(workingCode);

console.log('\n✅ Deletion fix guide completed!');
console.log('Apply these changes to fix "Deleted: 0, Failed: 5" issue.');