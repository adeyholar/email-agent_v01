// File path: D:\AI\Gits\email-agent_v01\find-real-deletion-code.js
// Find Real Deletion Code
// Created: January 25, 2025
// Purpose: Find where the actual deletion code is that's still failing

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🔍 Finding Real Deletion Code');
console.log('=============================\n');

// More comprehensive file search
const searchPaths = [
    '.',
    'src',
    'src/components',
    'src/services',
    'mcp-server',
    'connectors'
];

const searchPatterns = [
    'delete',
    'batch',
    'trash',
    'batchModify',
    'messages.delete',
    'gmail.users.messages'
];

function searchInFile(filePath, content) {
    const findings = [];
    
    // Look for deletion-related code
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
        const lineNum = index + 1;
        const trimmedLine = line.trim();
        
        if (trimmedLine.includes('messages.delete')) {
            findings.push({
                line: lineNum,
                content: trimmedLine,
                type: '❌ BROKEN - messages.delete',
                severity: 'critical'
            });
        }
        
        if (trimmedLine.includes('batch') && (trimmedLine.includes('delete') || trimmedLine.includes('Delete'))) {
            findings.push({
                line: lineNum,
                content: trimmedLine,
                type: '🔍 BATCH DELETE FOUND',
                severity: 'important'
            });
        }
        
        if (trimmedLine.includes('gmail.users.messages') && !trimmedLine.includes('//')) {
            findings.push({
                line: lineNum,
                content: trimmedLine,
                type: '📧 GMAIL API CALL',
                severity: 'info'
            });
        }
        
        if (trimmedLine.includes('/api/') && trimmedLine.includes('delete')) {
            findings.push({
                line: lineNum,
                content: trimmedLine,
                type: '🌐 API ENDPOINT',
                severity: 'important'
            });
        }
    });
    
    return findings;
}

function searchDirectory(dirPath) {
    const results = [];
    
    try {
        const items = fs.readdirSync(dirPath);
        
        for (const item of items) {
            const itemPath = path.join(dirPath, item);
            const stat = fs.statSync(itemPath);
            
            if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
                results.push(...searchDirectory(itemPath));
            } else if (stat.isFile() && (item.endsWith('.js') || item.endsWith('.jsx') || item.endsWith('.ts') || item.endsWith('.tsx'))) {
                try {
                    const content = fs.readFileSync(itemPath, 'utf8');
                    const findings = searchInFile(itemPath, content);
                    
                    if (findings.length > 0) {
                        results.push({
                            file: itemPath,
                            findings: findings
                        });
                    }
                } catch (err) {
                    // Skip files that can't be read
                }
            }
        }
    } catch (err) {
        // Skip directories that can't be read
    }
    
    return results;
}

console.log('🔍 Searching all files for deletion code...\n');

const allFindings = searchDirectory('.');

// Sort by severity
const criticalFiles = [];
const importantFiles = [];
const infoFiles = [];

allFindings.forEach(result => {
    const hasCritical = result.findings.some(f => f.severity === 'critical');
    const hasImportant = result.findings.some(f => f.severity === 'important');
    
    if (hasCritical) {
        criticalFiles.push(result);
    } else if (hasImportant) {
        importantFiles.push(result);
    } else {
        infoFiles.push(result);
    }
});

// Report critical issues first
if (criticalFiles.length > 0) {
    console.log('🚨 CRITICAL: Files with broken .delete() calls');
    console.log('==============================================\n');
    
    criticalFiles.forEach(result => {
        console.log(`📄 ${result.file}:`);
        result.findings.forEach(finding => {
            if (finding.severity === 'critical') {
                console.log(`   Line ${finding.line}: ${finding.type}`);
                console.log(`   Code: ${finding.content}`);
                console.log('');
            }
        });
    });
}

// Report important findings
if (importantFiles.length > 0) {
    console.log('⚠️ IMPORTANT: Files with deletion-related code');
    console.log('==============================================\n');
    
    importantFiles.forEach(result => {
        console.log(`📄 ${result.file}:`);
        result.findings.forEach(finding => {
            if (finding.severity === 'important') {
                console.log(`   Line ${finding.line}: ${finding.type}`);
                console.log(`   Code: ${finding.content.substring(0, 80)}${finding.content.length > 80 ? '...' : ''}`);
            }
        });
        console.log('');
    });
}

// Look for API server files specifically
console.log('🌐 CHECKING API SERVER FILES');
console.log('============================\n');

const apiServerFiles = [
    'enhanced-working-api-server.js',
    'working-api-server.js',
    'enhanced-working-api-server-fixed.js',
    'api-server.js',
    'server.js'
];

apiServerFiles.forEach(filename => {
    const filePath = path.join('.', filename);
    if (fs.existsSync(filePath)) {
        console.log(`📄 Found: ${filename}`);
        
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            
            // Check for batch delete endpoints
            if (content.includes('/batch/delete') || content.includes('batch') && content.includes('delete')) {
                console.log('   🎯 Contains batch delete endpoint!');
                
                // Find the specific endpoint
                const lines = content.split('\n');
                lines.forEach((line, index) => {
                    if ((line.includes('/batch/delete') || (line.includes('batch') && line.includes('delete'))) && line.includes('app.')) {
                        console.log(`   Line ${index + 1}: ${line.trim()}`);
                    }
                });
            }
            
            if (content.includes('gmail.users.messages.delete')) {
                console.log('   ❌ Contains broken gmail.users.messages.delete!');
            }
            
            if (content.includes('EmailDeletionManager')) {
                console.log('   📦 Uses EmailDeletionManager class');
            }
            
        } catch (err) {
            console.log(`   ❌ Error reading file: ${err.message}`);
        }
        console.log('');
    }
});

console.log('🎯 RECOMMENDATION');
console.log('=================\n');

if (criticalFiles.length > 0) {
    console.log('❌ Found files still using broken .delete() method:');
    criticalFiles.forEach(result => {
        console.log(`   • ${result.file}`);
    });
    console.log('\nThese files need to be fixed with .trash() method.');
} else {
    console.log('✅ No broken .delete() calls found in searchable files');
    console.log('The issue may be:');
    console.log('   • In a running server using old cached code');
    console.log('   • In a different API server file');
    console.log('   • In frontend code making direct API calls');
}

console.log('\n🔧 NEXT STEPS:');
console.log('==============');
console.log('1. Check which API server file you\'re actually running');
console.log('2. Restart the server to clear any cached code');
console.log('3. Look for the batch delete API endpoint');
console.log('4. Replace any .delete() calls with .trash() calls');