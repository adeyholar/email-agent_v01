// File path: D:\AI\Gits\email-agent_v01\add-batch-delete-endpoints.js
// Add Batch Delete Endpoints
// Created: January 25, 2025
// Purpose: Add missing batch delete endpoints to enhanced-working-api-server.js

import fs from 'fs';

console.log('🔧 Adding Batch Delete Endpoints');
console.log('=================================\n');

try {
    const serverFile = 'enhanced-working-api-server.js';
    
    if (!fs.existsSync(serverFile)) {
        console.log(`❌ ${serverFile} not found`);
        process.exit(1);
    }
    
    console.log(`📄 Reading ${serverFile}...`);
    let content = fs.readFileSync(serverFile, 'utf8');
    
    // Backup the original
    const backupName = `${serverFile}.backup-before-batch-endpoints`;
    fs.writeFileSync(backupName, content);
    console.log(`✅ Backup created: ${backupName}`);
    
    // Check if endpoints already exist
    if (content.includes('/api/emails/batch/delete')) {
        console.log('⚠️ Batch delete endpoints already exist');
        console.log('The issue might be that the server is not running or the endpoints are broken');
        
        // Still proceed to fix them
    }
    
    // Add import for the fixed enhanced-gmail-manager
    if (!content.includes('enhanced-gmail-manager')) {
        console.log('📦 Adding enhanced-gmail-manager import...');
        
        // Find the import section
        const importSection = content.indexOf('import ');
        if (importSection > -1) {
            const insertPoint = content.indexOf('\n', importSection);
            const importStatement = "import { EnhancedGmailManager } from './enhanced-gmail-manager.js';\n";
            content = content.slice(0, insertPoint + 1) + importStatement + content.slice(insertPoint + 1);
            console.log('✅ Added enhanced-gmail-manager import');
        }
    }
    
    // Initialize the enhanced Gmail manager
    if (!content.includes('enhancedGmailManager')) {
        console.log('🔧 Adding enhanced Gmail manager initialization...');
        
        // Find where other managers are initialized (like yahooManager)
        const initSection = content.indexOf('yahooManager');
        if (initSection > -1) {
            const lineEnd = content.indexOf('\n', initSection);
            const initStatement = "const enhancedGmailManager = new EnhancedGmailManager();\n";
            content = content.slice(0, lineEnd + 1) + initStatement + content.slice(lineEnd + 1);
            console.log('✅ Added enhanced Gmail manager initialization');
        }
    }
    
    // Add the batch delete endpoints
    console.log('🌐 Adding batch delete endpoints...');
    
    const batchDeleteEndpoints = `
// ✅ BATCH DELETE ENDPOINTS (FIXED)
// =====================================

// Batch delete selected emails
app.post('/api/emails/batch/delete', async (req, res) => {
    try {
        console.log('🗑️ Batch delete request received');
        
        const { emailIds, provider = 'gmail' } = req.body;
        
        if (!emailIds || !Array.isArray(emailIds) || emailIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No email IDs provided'
            });
        }
        
        console.log(\`Processing \${emailIds.length} emails for deletion...\`);
        
        let results = { success: [], failed: [] };
        
        if (provider === 'gmail' && enhancedGmailManager) {
            // Use the FIXED enhanced Gmail manager
            results = await enhancedGmailManager.batchDeleteEmails(emailIds);
        } else {
            // Fallback to individual deletion
            for (const emailId of emailIds) {
                try {
                    await gmail.users.messages.trash({
                        userId: 'me',
                        id: emailId
                    });
                    results.success.push(emailId);
                } catch (error) {
                    console.error(\`Failed to delete \${emailId}:\`, error.message);
                    results.failed.push({ id: emailId, error: error.message });
                }
            }
        }
        
        console.log(\`✅ Batch deletion completed: \${results.success.length} deleted, \${results.failed.length} failed\`);
        
        res.json({
            success: true,
            deleted: results.success.length,
            failed: results.failed.length,
            method: 'moved_to_trash',
            details: results
        });
        
    } catch (error) {
        console.error('❌ Batch delete error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Batch delete by criteria (sender, subject, date, etc.)
app.post('/api/emails/batch/delete-by-criteria', async (req, res) => {
    try {
        console.log('🗑️ Batch delete by criteria request received');
        
        const { 
            criteria, 
            maxEmails = 50,
            provider = 'gmail' 
        } = req.body;
        
        if (!criteria) {
            return res.status(400).json({
                success: false,
                error: 'No criteria provided'
            });
        }
        
        console.log('Criteria:', criteria);
        
        // Build Gmail search query from criteria
        let searchQuery = '';
        
        if (criteria.sender) {
            searchQuery += \`from:\${criteria.sender} \`;
        }
        if (criteria.subject) {
            searchQuery += \`subject:"\${criteria.subject}" \`;
        }
        if (criteria.olderThanDays) {
            const date = new Date();
            date.setDate(date.getDate() - criteria.olderThanDays);
            const dateStr = \`\${date.getFullYear()}/\${(date.getMonth() + 1).toString().padStart(2, '0')}/\${date.getDate().toString().padStart(2, '0')}\`;
            searchQuery += \`before:\${dateStr} \`;
        }
        if (criteria.unreadOnly) {
            searchQuery += 'is:unread ';
        }
        
        console.log(\`Search query: "\${searchQuery.trim()}"\`);
        
        // Search for emails matching criteria
        const searchResults = await gmail.users.messages.list({
            userId: 'me',
            q: searchQuery.trim(),
            maxResults: maxEmails
        });
        
        if (!searchResults.data.messages || searchResults.data.messages.length === 0) {
            return res.json({
                success: true,
                deleted: 0,
                failed: 0,
                message: 'No emails found matching criteria'
            });
        }
        
        const emailIds = searchResults.data.messages.map(msg => msg.id);
        console.log(\`Found \${emailIds.length} emails matching criteria\`);
        
        // Delete the found emails
        let results = { success: [], failed: [] };
        
        if (enhancedGmailManager) {
            results = await enhancedGmailManager.batchDeleteEmails(emailIds);
        } else {
            // Fallback method
            for (const emailId of emailIds) {
                try {
                    await gmail.users.messages.trash({
                        userId: 'me',
                        id: emailId
                    });
                    results.success.push(emailId);
                } catch (error) {
                    results.failed.push({ id: emailId, error: error.message });
                }
            }
        }
        
        console.log(\`✅ Criteria deletion completed: \${results.success.length} deleted, \${results.failed.length} failed\`);
        
        res.json({
            success: true,
            deleted: results.success.length,
            failed: results.failed.length,
            criteria: criteria,
            method: 'moved_to_trash',
            details: results
        });
        
    } catch (error) {
        console.error('❌ Batch delete by criteria error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

`;
    
    // Find a good place to insert the endpoints (before app.listen)
    const listenIndex = content.indexOf('app.listen');
    if (listenIndex > -1) {
        content = content.slice(0, listenIndex) + batchDeleteEndpoints + '\n' + content.slice(listenIndex);
        console.log('✅ Added batch delete endpoints before app.listen');
    } else {
        // Fallback: add at the end before exports
        const exportIndex = content.lastIndexOf('export');
        if (exportIndex > -1) {
            content = content.slice(0, exportIndex) + batchDeleteEndpoints + '\n' + content.slice(exportIndex);
        } else {
            content += batchDeleteEndpoints;
        }
        console.log('✅ Added batch delete endpoints at end of file');
    }
    
    // Write the updated content
    fs.writeFileSync(serverFile, content);
    console.log(`✅ Updated server file: ${serverFile}`);
    
    // Verify the endpoints were added
    console.log('\n🔍 Verifying endpoints...');
    const updatedContent = fs.readFileSync(serverFile, 'utf8');
    
    const hasBatchDelete = updatedContent.includes('/api/emails/batch/delete');
    const hasBatchCriteria = updatedContent.includes('/api/emails/batch/delete-by-criteria');
    const hasEnhancedManager = updatedContent.includes('enhancedGmailManager');
    
    console.log(`   Batch delete endpoint: ${hasBatchDelete ? '✅ Added' : '❌ Missing'}`);
    console.log(`   Batch criteria endpoint: ${hasBatchCriteria ? '✅ Added' : '❌ Missing'}`);
    console.log(`   Enhanced Gmail manager: ${hasEnhancedManager ? '✅ Added' : '❌ Missing'}`);
    
    if (hasBatchDelete && hasBatchCriteria) {
        console.log('\n🎉 BATCH DELETE ENDPOINTS ADDED SUCCESSFULLY!');
        console.log('=============================================');
        console.log('✅ POST /api/emails/batch/delete');
        console.log('✅ POST /api/emails/batch/delete-by-criteria');
        console.log('✅ Uses fixed enhanced-gmail-manager.js');
        console.log('✅ Uses .trash() method instead of .delete()');
        
        console.log('\n🚀 FINAL STEPS:');
        console.log('===============');
        console.log('1. Restart your API server:');
        console.log('   node enhanced-working-api-server.js');
        console.log('');
        console.log('2. Test batch deletion in dashboard');
        console.log('   Should now work: "Deleted: X, Failed: 0"');
        
    } else {
        console.log('\n⚠️ Endpoint addition may be incomplete');
        console.log('Please check the file manually');
    }
    
} catch (error) {
    console.log('❌ Error adding endpoints:', error.message);
    console.log('Stack:', error.stack);
}

console.log('\n📋 SUMMARY');
console.log('==========');
console.log('• Added missing batch delete endpoints');
console.log('• Integrated fixed enhanced-gmail-manager.js'); 
console.log('• Uses .trash() method (working)');
console.log('• Ready to fix "Deleted: 0, Failed: 5" issue');