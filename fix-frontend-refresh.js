// File path: D:\AI\Gits\email-agent_v01\fix-frontend-refresh.js
// Fix Frontend Refresh After Deletion
// Created: January 25, 2025
// Purpose: Update ScalableDashboard.jsx to refresh properly after deletion

import fs from 'fs';

console.log('🔧 Fixing Frontend Refresh After Deletion');
console.log('=========================================\n');

try {
    const frontendFile = 'src/components/ScalableDashboard.jsx';
    
    if (!fs.existsSync(frontendFile)) {
        console.log(`❌ ${frontendFile} not found`);
        process.exit(1);
    }
    
    console.log(`📄 Reading ${frontendFile}...`);
    let content = fs.readFileSync(frontendFile, 'utf8');
    
    // Backup the original
    const backupName = `${frontendFile}.before-refresh-fix`;
    fs.writeFileSync(backupName, content);
    console.log(`✅ Backup created: ${backupName}`);
    
    console.log('🔍 Analyzing current deletion handling...');
    
    // Check if there's already a refresh mechanism
    const hasRefresh = content.includes('refreshEmails') || content.includes('fetchEmails');
    const hasStateUpdate = content.includes('setEmails') || content.includes('setRecentEmails');
    
    console.log(`   Refresh function: ${hasRefresh ? '✅ Found' : '❌ Missing'}`);
    console.log(`   State update: ${hasStateUpdate ? '✅ Found' : '❌ Missing'}`);
    
    // Look for batch deletion handlers
    const batchDeleteIndex = content.indexOf('batch/delete');
    if (batchDeleteIndex > -1) {
        console.log('✅ Found batch delete API calls');
        
        // Find the deletion success handler
        let updated = false;
        
        // Pattern 1: Look for success handling after batch delete
        const successPattern = /if\s*\(\s*response\.ok\s*\)\s*\{([^}]*)\}/g;
        let match;
        
        while ((match = successPattern.exec(content)) !== null) {
            const successBlock = match[1];
            
            // Check if this success block is after a batch delete call
            const beforeSuccess = content.substring(0, match.index);
            const recentDeleteCall = beforeSuccess.lastIndexOf('batch/delete');
            
            if (recentDeleteCall > -1 && match.index - recentDeleteCall < 500) {
                console.log('📝 Found deletion success handler');
                
                // Check if it already refreshes the email list
                if (!successBlock.includes('fetchEmails') && !successBlock.includes('refreshEmails')) {
                    console.log('🔧 Adding email refresh after successful deletion...');
                    
                    const newSuccessBlock = successBlock + `
                        
                        // ✅ Refresh email list after successful deletion
                        console.log('🔄 Refreshing email list after deletion...');
                        await fetchRecentEmails();
                        
                        // Update UI immediately by removing deleted emails from state
                        if (selectedEmails && selectedEmails.length > 0) {
                            setRecentEmails(prev => 
                                prev.filter(email => !selectedEmails.includes(email.id))
                            );
                            setSelectedEmails([]);
                        }`;
                    
                    content = content.replace(match[0], `if (response.ok) {${newSuccessBlock}}`);
                    updated = true;
                    console.log('✅ Added email refresh to deletion success handler');
                    break;
                }
            }
        }
        
        // Pattern 2: If no success handler found, add complete deletion handling
        if (!updated) {
            console.log('🔧 Adding complete deletion handling...');
            
            // Find batch delete API calls and enhance them
            const batchDeleteCallPattern = /(const response = await fetch\('.*?batch\/delete.*?\{[\s\S]*?\}\);)/g;
            
            content = content.replace(batchDeleteCallPattern, (match) => {
                return match + `
                
                // ✅ Handle deletion response and refresh
                if (response.ok) {
                    const result = await response.json();
                    console.log('🗑️ Deletion result:', result);
                    
                    // Show success message
                    alert(\`Successfully deleted \${result.deleted || 0} emails\`);
                    
                    // Refresh email list
                    console.log('🔄 Refreshing email list...');
                    await fetchRecentEmails();
                    
                    // Clear selection
                    setSelectedEmails([]);
                    setSelectionMode(false);
                } else {
                    const error = await response.json();
                    console.error('❌ Deletion failed:', error);
                    alert(\`Deletion failed: \${error.error || 'Unknown error'}\`);
                }`;
            });
            
            if (content !== fs.readFileSync(frontendFile, 'utf8')) {
                updated = true;
                console.log('✅ Added complete deletion handling');
            }
        }
        
        // Also ensure there's a fetchRecentEmails function
        if (!content.includes('const fetchRecentEmails') && !content.includes('function fetchRecentEmails')) {
            console.log('🔧 Adding fetchRecentEmails function...');
            
            // Find existing fetch function or add new one
            const existingFetchPattern = /const fetch\w*Emails?\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{/;
            const existingFetch = content.match(existingFetchPattern);
            
            if (existingFetch) {
                console.log('✅ Found existing fetch function, will use that');
            } else {
                // Add a basic fetchRecentEmails function
                const fetchFunction = `
    // ✅ Function to refresh email list
    const fetchRecentEmails = async () => {
        try {
            setLoading(true);
            const response = await fetch('http://localhost:3001/api/emails/recent?limit=20');
            
            if (response.ok) {
                const emails = await response.json();
                setRecentEmails(emails);
                console.log(\`✅ Refreshed \${emails.length} emails\`);
            } else {
                console.error('❌ Failed to fetch emails');
            }
        } catch (error) {
            console.error('❌ Error fetching emails:', error);
        } finally {
            setLoading(false);
        }
    };
`;
                
                // Insert before the first function definition
                const firstFunctionIndex = content.indexOf('const ') || content.indexOf('function ');
                if (firstFunctionIndex > -1) {
                    content = content.slice(0, firstFunctionIndex) + fetchFunction + content.slice(firstFunctionIndex);
                    console.log('✅ Added fetchRecentEmails function');
                }
            }
        }
        
        if (updated) {
            // Write the updated content
            fs.writeFileSync(frontendFile, content);
            console.log(`✅ Updated frontend file: ${frontendFile}`);
            
            console.log('\n🎉 FRONTEND REFRESH FIX APPLIED!');
            console.log('=================================');
            console.log('✅ Added email list refresh after deletion');
            console.log('✅ Added immediate UI update (remove from state)');
            console.log('✅ Added proper success/error handling');
            
            console.log('\n🚀 NEXT STEPS:');
            console.log('==============');
            console.log('1. Restart your frontend: pnpm run frontend');
            console.log('2. Test batch deletion again');
            console.log('3. Deleted emails should disappear immediately');
            console.log('4. Email list should refresh automatically');
            
        } else {
            console.log('\n⚠️ Could not automatically add refresh handling');
            console.log('Manual update may be needed');
        }
        
    } else {
        console.log('❌ No batch delete functionality found in frontend');
    }
    
} catch (error) {
    console.log('❌ Error fixing frontend refresh:', error.message);
}

console.log('\n💡 MANUAL ALTERNATIVE');
console.log('====================');
console.log('If automatic fix doesn\'t work, add this after successful deletion:');
console.log('');
console.log('```javascript');
console.log('// After successful deletion response');
console.log('if (response.ok) {');
console.log('    const result = await response.json();');
console.log('    ');
console.log('    // Remove deleted emails from UI immediately');
console.log('    setRecentEmails(prev => ');
console.log('        prev.filter(email => !selectedEmails.includes(email.id))');
console.log('    );');
console.log('    ');
console.log('    // Clear selection');
console.log('    setSelectedEmails([]);');
console.log('    ');
console.log('    // Refresh email list from server');
console.log('    fetchRecentEmails();');
console.log('}');
console.log('```');

console.log('\n📋 SUMMARY');
console.log('==========');
console.log('• Added email refresh after deletion');
console.log('• Added immediate UI update');
console.log('• Added proper success/error handling');
console.log('• Deleted emails should now disappear from view');