// File: D:\AI\Gits\email-agent_v01\deploy-fixed-server.js
// Script to safely deploy the corrected enhanced API server

import fs from 'fs';
import path from 'path';

const __dirname = process.cwd();
const sourceFile = 'enhanced-working-api-server.js';
const backupFile = `${sourceFile}.backup-${new Date().toISOString().replace(/[:.]/g, '-')}`;

console.log('🔧 Deploying Fixed Enhanced API Server...');
console.log('===============================================');

try {
    // 1. Create backup of current file
    if (fs.existsSync(sourceFile)) {
        console.log(`📦 Creating backup: ${backupFile}`);
        fs.copyFileSync(sourceFile, backupFile);
        console.log('✅ Backup created successfully');
    }

    // 2. Write the corrected server code
    console.log('📝 Writing corrected server code...');
    
    const correctedCode = `// File: D:\\AI\\Gits\\email-agent_v01\\enhanced-working-api-server.js
// Enhanced Working API Server with Gmail + Yahoo + AOL Integration
// Based on your working-api-server.js with multi-provider support added

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { google } from 'googleapis';
import { YahooEmailManager } from './yahoo-api-integration.js';
import { ImapFlow } from 'imapflow';

class AOLEmailManager {
    constructor() {
        this.accounts = [
            {
                email: process.env.AOL_EMAIL,
                password: process.env.AOL_APP_PASSWORD,
                name: 'AOL Account 1'
            },
            {
                email: process.env.AOL2_EMAIL,
                password: process.env.AOL2_APP_PASSWORD,
                name: 'AOL Account 2'
            },
            {
                email: process.env.AOL3_EMAIL,
                password: process.env.AOL3_APP_PASSWORD,
                name: 'AOL Account 3'
            }
        ].filter(account => account.email && account.password);
        
        console.log(\`📧 AOL Manager initialized with \${this.accounts.length} account(s)\`);
    }

    async getAllAccountsStats() {
        const stats = [];
        console.log(\`   🔄 Processing \${this.accounts.length} AOL accounts...\`);
        
        for (const account of this.accounts) {
            try {
                console.log(\`   📧 Connecting to AOL: \${account.email}\`);
                
                const client = new ImapFlow({
                    host: 'imap.aol.com',
                    port: 993,
                    secure: true,
                    auth: {
                        user: account.email,
                        pass: account.password
                    },
                    logger: false // Disable verbose logging
                });
                
                await client.connect();
                
                try {
                    const status = await client.status('INBOX', { messages: true, unseen: true });
                    stats.push({
                        email: account.email,
                        totalMessages: status.messages || 0,
                        unreadMessages: status.unseen || 0,
                        provider: 'aol'
                    });
                    console.log(\`   ✅ AOL \${account.email}: \${status.messages} total, \${status.unseen} unread\`);
                } finally {
                    await client.logout();
                }
            } catch (error) {
                console.error(\`   ❌ Error getting AOL stats for \${account.email}:\`, error.message);
                stats.push({
                    email: account.email,
                    error: error.message,
                    provider: 'aol'
                });
            }
        }
        return stats;
    }

    async getRecentEmails(email, limit = 20) {
        const account = this.accounts.find(a => a.email === email);
        if (!account) throw new Error(\`AOL account \${email} not found\`);

        const client = new ImapFlow({
            host: 'imap.aol.com',
            port: 993,
            secure: true,
            auth: {
                user: account.email,
                pass: account.password
            },
            logger: false
        });

        await client.connect();
        const lock = await client.getMailboxLock('INBOX');
        const messages = [];
        
        try {
            const status = await client.status('INBOX', { messages: true });
            const totalMessages = status.messages || 0;
            
            if (totalMessages > 0) {
                const startSeq = Math.max(1, totalMessages - limit + 1);
                
                for await (let message of client.fetch(\`\${startSeq}:*\`, {
                    envelope: true,
                    flags: true
                })) {
                    messages.push({
                        uid: message.uid,
                        subject: message.envelope.subject || '(No Subject)',
                        from: message.envelope.from?.[0]?.address || 'Unknown',
                        date: message.envelope.date,
                        unread: !message.flags.has('\\\\Seen'),
                        provider: 'aol',
                        account: email
                    });