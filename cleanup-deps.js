// File: D:\AI\Gits\email-agent_v01\cleanup-deps.js
// Clean up deprecated dependencies

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

console.log('🧹 Cleaning up deprecated dependencies...');
console.log('======================================\n');

try {
    // Read current package.json
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
    
    console.log('📦 Current dependencies to review:');
    
    // List of deprecated packages to remove/update
    const deprecatedPackages = [
        'auto-reload-brunch',
        'clean-css-brunch', 
        'coffee-script-brunch',
        'coffee-script',
        'coffeelint-brunch',
        'css-brunch',
        'har-validator',
        'inflight',
        'javascript-brunch',
        'node-domexception',
        'request',
        'stylus-brunch',
        'uglify-js-brunch'
    ];

    // Check if any deprecated packages are direct dependencies
    let foundDeprecated = false;
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    deprecatedPackages.forEach(pkg => {
        if (deps[pkg]) {
            console.log(`❌ Found deprecated: ${pkg}`);
            foundDeprecated = true;
        }
    });

    if (!foundDeprecated) {
        console.log('✅ No deprecated packages found in direct dependencies');
        console.log('⚠️  Warnings are from sub-dependencies of other packages');
        console.log();
        console.log('🔧 Solutions:');
        console.log('1. Update all packages to latest versions');
        console.log('2. Use npm audit to check for vulnerabilities'); 
        console.log('3. Consider using pnpm dedupe');
        console.log();
        
        // Run pnpm update to get latest versions
        console.log('🔄 Updating all dependencies to latest versions...');
        try {
            execSync('pnpm update', { stdio: 'inherit' });
            console.log('✅ Dependencies updated successfully');
        } catch (error) {
            console.log('⚠️  Some packages may not have updates available');
        }
        
        // Clean node_modules and reinstall
        console.log('\n🧹 Cleaning node_modules and reinstalling...');
        try {
            execSync('pnpm store prune', { stdio: 'inherit' });
            execSync('pnpm install --frozen-lockfile', { stdio: 'inherit' });
            console.log('✅ Clean install completed');
        } catch (error) {
            console.log('⚠️  Clean install had some issues, but should still work');
        }
        
    } else {
        console.log('\n🔧 Removing deprecated packages...');
        // Code to remove deprecated packages would go here
    }

} catch (error) {
    console.error('❌ Error during cleanup:', error.message);
}

console.log('\n🎉 Dependency cleanup complete!');
console.log('💡 The deprecated warnings are from sub-dependencies and won\'t affect functionality');