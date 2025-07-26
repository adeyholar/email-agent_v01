// File path: D:\AI\Gits\email-agent_v01\check-api-servers.js
// Check API Servers
// Created: January 25, 2025
// Purpose: Find which API server has the batch delete endpoints

import fs from 'fs';

console.log('🌐 Checking API Servers for Batch Delete Endpoints');
console.log('===================================================\n');

const serverFiles = [
    'enhanced-working-api-server.js',
    'working-api-server.js',
    'src/services/apiServer.js'
];

serverFiles.forEach(filename => {
    console.log(`📄 Checking ${filename}:`);
    
    if (!fs.existsSync(filename)) {
        console.log('   ❌ File not found\n');
        return;
    }
    
    try {
        const content = fs.readFileSync(filename, 'utf8');
        
        // Check for batch delete endpoints that your frontend is calling
        const endpoints = [
            '/api/emails/batch/delete',
            '/api/emails/batch/delete-by-criteria'
        ];
        
        let hasEndpoints = false;
        endpoints.forEach(endpoint => {
            if (content.includes(endpoint)) {
                console.log(`   ✅ Has endpoint: ${endpoint}`);
                hasEndpoints = true;
            }
        });
        
        if (!hasEndpoints) {
            console.log('   ❌ No batch delete endpoints found');
        }
        
        // Check if it imports enhanced-gmail-manager
        if (content.includes('enhanced-gmail-manager')) {
            console.log('   ✅ Imports enhanced-gmail-manager.js');
        } else if (content.includes('EmailDeletionManager')) {
            console.log('   ✅ Uses EmailDeletionManager');
        } else {
            console.log('   ⚠️ No clear deletion manager import');
        }
        
        // Check file size and last modified to see which is actively used
        const stats = fs.statSync(filename);
        console.log(`   📊 Size: ${(stats.size / 1024).toFixed(1)}KB, Modified: ${stats.mtime.toLocaleDateString()}`);
        
    } catch (error) {
        console.log(`   ❌ Error reading: ${error.message}`);
    }
    
    console.log();
});

console.log('🎯 RECOMMENDATION');
console.log('=================\n');

// Based on your frontend code, find which server should be running
console.log('Your frontend (ScalableDashboard.jsx) makes these API calls:');
console.log('   • http://localhost:3001/api/emails/batch/delete');
console.log('   • http://localhost:3001/api/emails/batch/delete-by-criteria');
console.log('');
console.log('The server that handles these endpoints needs to:');
console.log('   ✅ Import the FIXED enhanced-gmail-manager.js');
console.log('   ✅ Use .trash() instead of .delete()');
console.log('   ✅ Handle batch operations properly');
console.log('');

console.log('🚀 IMMEDIATE FIX:');
console.log('=================');
console.log('1. Run: node fix-enhanced-gmail-manager.js');
console.log('2. Restart your API server (probably enhanced-working-api-server.js)');
console.log('3. Test deletion in dashboard');
console.log('4. Should see "Deleted: X, Failed: 0"');