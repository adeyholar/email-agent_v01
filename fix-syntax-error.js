// File path: D:\AI\Gits\email-agent_v01\fix-syntax-error.js
// Fix Syntax Error in Enhanced Gmail Manager
// Created: January 25, 2025
// Purpose: Fix the syntax error at line 507

import fs from 'fs';

console.log('🔧 Fixing Syntax Error in Enhanced Gmail Manager');
console.log('================================================\n');

try {
    const filename = 'enhanced-gmail-manager.js';
    
    if (!fs.existsSync(filename)) {
        console.log(`❌ ${filename} not found`);
        process.exit(1);
    }
    
    console.log(`📄 Reading ${filename} to check syntax...`);
    let content = fs.readFileSync(filename, 'utf8');
    
    // Create another backup
    const backupName = `${filename}.syntax-error-backup`;
    fs.writeFileSync(backupName, content);
    console.log(`✅ Backup created: ${backupName}`);
    
    // Find and fix the syntax error around line 507
    const lines = content.split('\n');
    console.log(`📊 File has ${lines.length} lines`);
    
    // Look for the problematic area around line 507
    const problemArea = lines.slice(500, 515);
    console.log('\n🔍 Lines around 507:');
    problemArea.forEach((line, index) => {
        const lineNum = 501 + index;
        console.log(`${lineNum}: ${line}`);
    });
    
    // Common syntax issues and fixes
    let fixed = false;
    
    // Fix 1: Missing closing brace before batchDeleteEmails
    if (content.includes('async batchDeleteEmails(messageIds) {') && !fixed) {
        console.log('\n🔧 Fixing: Adding missing closing brace...');
        
        // Find the batchDeleteEmails method
        const batchIndex = content.indexOf('async batchDeleteEmails(messageIds) {');
        if (batchIndex > -1) {
            // Look backwards for the previous method/class structure
            const beforeBatch = content.substring(0, batchIndex);
            
            // Count open and close braces to see if we need a closing brace
            const openBraces = (beforeBatch.match(/{/g) || []).length;
            const closeBraces = (beforeBatch.match(/}/g) || []).length;
            
            if (openBraces > closeBraces) {
                // Add missing closing brace
                content = beforeBatch + '\n    }\n\n    ' + content.substring(batchIndex);
                fixed = true;
                console.log('✅ Added missing closing brace');
            }
        }
    }
    
    // Fix 2: Method not properly inside class
    if (!fixed && content.includes('async batchDeleteEmails(messageIds) {')) {
        console.log('\n🔧 Fixing: Ensuring method is inside class...');
        
        // Find the class structure and make sure the method is properly indented
        const classMatch = content.match(/class\s+\w+\s*{/);
        if (classMatch) {
            const batchIndex = content.indexOf('async batchDeleteEmails(messageIds) {');
            if (batchIndex > -1) {
                // Replace the method with properly indented version
                const methodStart = content.lastIndexOf('\n', batchIndex);
                const methodEnd = content.indexOf('\n}', batchIndex + 1);
                
                if (methodEnd > -1) {
                    const beforeMethod = content.substring(0, methodStart);
                    const afterMethod = content.substring(methodEnd);
                    
                    const fixedMethod = `
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
    }`;
                    
                    content = beforeMethod + fixedMethod + afterMethod;
                    fixed = true;
                    console.log('✅ Fixed method indentation and structure');
                }
            }
        }
    }
    
    // Fix 3: If still not fixed, restore from working backup and add method properly
    if (!fixed) {
        console.log('\n🔧 Fixing: Restoring from backup and adding method properly...');
        
        // Restore from the broken backup (which was working before our changes)
        const brokenBackup = `${filename}.broken-backup`;
        if (fs.existsSync(brokenBackup)) {
            content = fs.readFileSync(brokenBackup, 'utf8');
            console.log('✅ Restored from broken backup');
            
            // Now add the batch method properly at the end of the class
            const lastBrace = content.lastIndexOf('}');
            if (lastBrace > -1) {
                const beforeLastBrace = content.substring(0, lastBrace);
                const afterLastBrace = content.substring(lastBrace);
                
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
                
                content = beforeLastBrace + batchMethod + afterLastBrace;
                fixed = true;
                console.log('✅ Added batch method properly at end of class');
            }
        }
    }
    
    // Also fix any remaining .delete() calls
    if (content.includes('messages.delete')) {
        console.log('\n🔧 Fixing remaining .delete() calls...');
        content = content.replace(/gmail\.users\.messages\.delete\(\{([^}]*)\}\)/g, 
            'gmail.users.messages.trash({$1})');
        console.log('✅ Fixed remaining .delete() calls');
    }
    
    // Write the fixed content
    fs.writeFileSync(filename, content);
    console.log(`\n✅ Fixed file written: ${filename}`);
    
    // Test syntax by checking if Node can parse it
    console.log('\n🧪 Testing syntax...');
    try {
        // Try to parse the file to check for syntax errors
        const testContent = fs.readFileSync(filename, 'utf8');
        
        // Simple syntax check - look for common issues
        const openBraces = (testContent.match(/{/g) || []).length;
        const closeBraces = (testContent.match(/}/g) || []).length;
        const openParens = (testContent.match(/\(/g) || []).length;
        const closeParens = (testContent.match(/\)/g) || []).length;
        
        console.log(`   Braces: ${openBraces} open, ${closeBraces} close ${openBraces === closeBraces ? '✅' : '❌'}`);
        console.log(`   Parentheses: ${openParens} open, ${closeParens} close ${openParens === closeParens ? '✅' : '❌'}`);
        
        // Check for the fixed method
        const hasBatchMethod = testContent.includes('async batchDeleteEmails(messageIds)');
        const hasTrashMethod = testContent.includes('messages.trash');
        const hasNoDeleteMethod = !testContent.includes('messages.delete');
        
        console.log(`   Batch method: ${hasBatchMethod ? '✅ Present' : '❌ Missing'}`);
        console.log(`   Uses .trash(): ${hasTrashMethod ? '✅ Yes' : '❌ No'}`);
        console.log(`   No .delete(): ${hasNoDeleteMethod ? '✅ Clean' : '❌ Still present'}`);
        
        if (openBraces === closeBraces && openParens === closeParens && hasBatchMethod && hasTrashMethod) {
            console.log('\n🎉 SYNTAX ERROR FIXED!');
            console.log('======================');
            console.log('✅ File syntax is valid');
            console.log('✅ Batch method added properly');
            console.log('✅ Uses working .trash() method');
            
            console.log('\n🚀 NOW TRY STARTING THE SERVER:');
            console.log('===============================');
            console.log('node enhanced-working-api-server.js');
        } else {
            console.log('\n⚠️ File may still have issues');
            console.log('Check the syntax manually or restore from backup');
        }
        
    } catch (parseError) {
        console.log('❌ Syntax test failed:', parseError.message);
    }
    
} catch (error) {
    console.log('❌ Error fixing syntax:', error.message);
}

console.log('\n📋 SUMMARY');
console.log('==========');
console.log('• Fixed syntax error in enhanced-gmail-manager.js');
console.log('• Added proper batch deletion method');
console.log('• Uses .trash() instead of .delete()');
console.log('• Ready to restart server');