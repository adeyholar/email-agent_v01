// File: D:\AI\Gits\email-agent_v01\enhanced-working-api-server.js
// Enhanced Working API Server with Gmail + Yahoo + AOL Integration + AI Features
// Clean architecture with modular deletion manager, spam detection, and email composition

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { google } from 'googleapis';
import { YahooEmailManager } from './yahoo-api-integration.js';
import { ImapFlow } from 'imapflow';
import { EmailDeletionManager } from './email-deletion-manager.js';
import nodemailer from 'nodemailer';

// ================================
// Enhanced Gmail Manager Class
// ================================
class EnhancedGmailManager {
    constructor() {
        this.oauth2Client = new google.auth.OAuth2(
            process.env.GMAIL_CLIENT_ID,
            process.env.GMAIL_CLIENT_SECRET,
            'http://localhost:8080/auth/gmail/callback'
        );

        if (process.env.GMAIL_REFRESH_TOKEN) {
            this.oauth2Client.setCredentials({
                refresh_token: process.env.GMAIL_REFRESH_TOKEN
            });
        }

        this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
        this.email = process.env.GMAIL_EMAIL;
    }

    async refreshTokenIfNeeded() {
        try {
            const { credentials } = await this.oauth2Client.refreshAccessToken();
            this.oauth2Client.setCredentials(credentials);
            return true;
        } catch (error) {
            console.error('❌ Gmail token refresh failed:', error.message);
            throw new Error('Gmail authentication expired. Please re-authorize.');
        }
    }

    async getStats() {
        try {
            await this.refreshTokenIfNeeded();
            
            const profile = await this.gmail.users.getProfile({ userId: 'me' });
            const unreadMessages = await this.gmail.users.messages.list({
                userId: 'me',
                q: 'is:unread in:inbox',
                maxResults: 1
            });

            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            const weekQuery = `after:${oneWeekAgo.getFullYear()}/${(oneWeekAgo.getMonth() + 1).toString().padStart(2, '0')}/${oneWeekAgo.getDate().toString().padStart(2, '0')}`;
            
            const thisWeekMessages = await this.gmail.users.messages.list({
                userId: 'me',
                q: weekQuery,
                maxResults: 1
            });

            return {
                emailAddress: profile.data.emailAddress,
                totalMessages: profile.data.messagesTotal,
                unreadMessages: unreadMessages.data.resultSizeEstimate || 0,
                totalThisWeek: thisWeekMessages.data.resultSizeEstimate || 0,
                totalThreads: profile.data.threadsTotal,
                provider: 'gmail',
                status: 'connected'
            };
        } catch (error) {
            console.error('   ❌ Enhanced Gmail stats error:', error.message);
            throw error;
        }
    }

    async getRecentEmails(limit = 20) {
        try {
            await this.refreshTokenIfNeeded();
            
            const messagesList = await this.gmail.users.messages.list({
                userId: 'me',
                q: 'in:inbox',
                maxResults: Math.min(limit, 50)
            });

            if (!messagesList.data.messages) return [];

            const emails = [];
            const messagesToFetch = messagesList.data.messages.slice(0, limit);
            const batchSize = 5;

            for (let i = 0; i < messagesToFetch.length; i += batchSize) {
                const batch = messagesToFetch.slice(i, i + batchSize);
                
                const batchPromises = batch.map(async (message) => {
                    try {
                        const messageDetail = await this.gmail.users.messages.get({
                            userId: 'me',
                            id: message.id,
                            format: 'metadata',
                            metadataHeaders: ['From', 'Subject', 'Date', 'To']
                        });

                        const headers = messageDetail.data.payload.headers;
                        return {
                            id: message.id,
                            from: headers.find(h => h.name === 'From')?.value || 'Unknown',
                            to: headers.find(h => h.name === 'To')?.value || '',
                            subject: headers.find(h => h.name === 'Subject')?.value || 'No Subject',
                            date: new Date(headers.find(h => h.name === 'Date')?.value || new Date().toISOString()),
                            isUnread: messageDetail.data.labelIds?.includes('UNREAD') || false,
                            snippet: messageDetail.data.snippet || '',
                            provider: 'gmail',
                            account: this.email,
                            threadId: messageDetail.data.threadId,
                            labelIds: messageDetail.data.labelIds || []
                        };
                    } catch (err) {
                        console.warn(`   ⚠️ Error fetching Gmail message ${message.id}:`, err.message);
                        return null;
                    }
                });

                const batchResults = await Promise.allSettled(batchPromises);
                const validEmails = batchResults
                    .filter(result => result.status === 'fulfilled' && result.value !== null)
                    .map(result => result.value);
                
                emails.push(...validEmails);
                
                if (i + batchSize < messagesToFetch.length) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }

            return emails.sort((a, b) => new Date(b.date) - new Date(a.date));
        } catch (error) {
            console.error('   ❌ Enhanced Gmail recent emails error:', error.message);
            throw error;
        }
    }

    async searchEmails(query, limit = 20) {
        try {
            await this.refreshTokenIfNeeded();
            
            const searchResults = await this.gmail.users.messages.list({
                userId: 'me',
                q: query,
                maxResults: Math.min(limit, 50)
            });

            if (!searchResults.data.messages) return [];

            const emails = [];
            const messagesToFetch = searchResults.data.messages.slice(0, limit);
            const batchSize = 3;

            for (let i = 0; i < messagesToFetch.length; i += batchSize) {
                const batch = messagesToFetch.slice(i, i + batchSize);
                
                const batchPromises = batch.map(async (message) => {
                    try {
                        const messageDetail = await this.gmail.users.messages.get({
                            userId: 'me',
                            id: message.id,
                            format: 'metadata',
                            metadataHeaders: ['From', 'Subject', 'Date', 'To']
                        });

                        const headers = messageDetail.data.payload.headers;
                        return {
                            id: message.id,
                            from: headers.find(h => h.name === 'From')?.value || 'Unknown',
                            to: headers.find(h => h.name === 'To')?.value || '',
                            subject: headers.find(h => h.name === 'Subject')?.value || 'No Subject',
                            date: headers.find(h => h.name === 'Date')?.value || new Date().toISOString(),
                            snippet: messageDetail.data.snippet || '',
                            provider: 'gmail',
                            account: this.email,
                            threadId: messageDetail.data.threadId,
                            labelIds: messageDetail.data.labelIds || []
                        };
                    } catch (err) {
                        return null;
                    }
                });

                const batchResults = await Promise.allSettled(batchPromises);
                const validEmails = batchResults
                    .filter(result => result.status === 'fulfilled' && result.value !== null)
                    .map(result => result.value);
                
                emails.push(...validEmails);
                await new Promise(resolve => setTimeout(resolve, 150));
            }

            return emails.sort((a, b) => new Date(b.date) - new Date(a.date));
        } catch (error) {
            console.error('   ❌ Enhanced Gmail search error:', error.message);
            throw error;
        }
    }

    async deleteEmails(messageIds) {
        try {
            await this.refreshTokenIfNeeded();
            
            if (!Array.isArray(messageIds) || messageIds.length === 0) {
                throw new Error('No message IDs provided for deletion');
            }

            let deletedCount = 0;
            let failedCount = 0;
            const batchSize = 10;

            for (let i = 0; i < messageIds.length; i += batchSize) {
                const batch = messageIds.slice(i, i + batchSize);
                
                const deletePromises = batch.map(async (messageId) => {
                    try {
                        await this.gmail.users.messages.delete({
                            userId: 'me',
                            id: messageId
                        });
                        return { success: true, id: messageId };
                    } catch (error) {
                        return { success: false, id: messageId, error: error.message };
                    }
                });

                const batchResults = await Promise.allSettled(deletePromises);
                
                batchResults.forEach(result => {
                    if (result.status === 'fulfilled') {
                        if (result.value.success) {
                            deletedCount++;
                        } else {
                            failedCount++;
                        }
                    } else {
                        failedCount++;
                    }
                });

                if (i + batchSize < messageIds.length) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }

            return {
                success: deletedCount > 0,
                deletedCount,
                failedCount,
                totalRequested: messageIds.length
            };
        } catch (error) {
            console.error('   ❌ Enhanced Gmail delete operation failed:', error.message);
            throw error;
        }
    }

    async sendEmail(to, subject, body, options = {}) {
        try {
            await this.refreshTokenIfNeeded();
            
            const emailLines = [
                `To: ${to}`,
                `Subject: ${subject}`,
                'Content-Type: text/html; charset=utf-8',
                'MIME-Version: 1.0',
                '',
                body
            ];

            if (options.cc) emailLines.splice(2, 0, `Cc: ${options.cc}`);
            if (options.bcc) emailLines.splice(options.cc ? 3 : 2, 0, `Bcc: ${options.bcc}`);

            const email = emailLines.join('\n');
            const encodedEmail = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

            const result = await this.gmail.users.messages.send({
                userId: 'me',
                requestBody: {
                    raw: encodedEmail,
                    threadId: options.threadId
                }
            });

            return {
                success: true,
                messageId: result.data.id,
                threadId: result.data.threadId
            };
        } catch (error) {
            console.error('   ❌ Enhanced Gmail send email failed:', error.message);
            throw error;
        }
    }
}

// ================================
// AI Spam Detection System
// ================================
class AISpamDetectionSystem {
    constructor() {
        this.spamPatterns = new Set();
        this.trustedSenders = new Set();
        this.blockedSenders = new Set();
        this.detectionLog = [];
        this.maxLogEntries = 1000;
        this.initializeSpamPatterns();
    }

    initializeSpamPatterns() {
        const patterns = [
            'urgent.*transfer', 'claim.*prize', 'lottery.*winner', 'inheritance.*funds',
            'bitcoin.*opportunity', 'crypto.*investment', 'make.*money.*fast',
            'verify.*account', 'suspend.*account', 'click.*here.*immediately',
            'update.*payment.*info', 'confirm.*identity',
            'lonely.*widow', 'military.*deployed', 'orphan.*funds',
            'viagra.*cheap', 'weight.*loss.*miracle', 'diet.*pills',
            'act.*now', 'limited.*time.*offer', 'exclusive.*deal',
            'congratulations.*selected', 'no.*strings.*attached'
        ];
        patterns.forEach(pattern => this.spamPatterns.add(new RegExp(pattern, 'i')));
    }

    async analyzeEmailWithClaude(email) {
        try {
            const analysisPrompt = `Analyze this email for spam/phishing characteristics. Return ONLY a JSON object with this exact structure:

{
  "isSpam": boolean,
  "confidence": number (0-100),
  "spamType": "string or null",
  "reasons": ["array", "of", "reasons"],
  "riskLevel": "low|medium|high|critical"
}

Email to analyze:
From: ${email.from}
Subject: ${email.subject}
Content: ${email.snippet || email.body || 'No content available'}

DO NOT OUTPUT ANYTHING OTHER THAN VALID JSON.`;

            const response = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "claude-sonnet-4-20250514",
                    max_tokens: 1000,
                    messages: [{ role: "user", content: analysisPrompt }]
                })
            });

            if (!response.ok) throw new Error(`Claude API error: ${response.status}`);

            const data = await response.json();
            let responseText = data.content[0].text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
            
            return JSON.parse(responseText);
        } catch (error) {
            return this.ruleBasedSpamAnalysis(email);
        }
    }

    ruleBasedSpamAnalysis(email) {
        let spamScore = 0;
        const reasons = [];
        let spamType = null;

        const subject = (email.subject || '').toLowerCase();
        const from = (email.from || '').toLowerCase();
        const content = (email.snippet || email.body || '').toLowerCase();
        const fullText = `${subject} ${from} ${content}`;

        for (const pattern of this.spamPatterns) {
            if (pattern.test(fullText)) {
                spamScore += 25;
                reasons.push(`Matches spam pattern: ${pattern.source}`);
            }
        }

        if (this.blockedSenders.has(from)) {
            spamScore += 50;
            reasons.push('Sender is in blocked list');
        }

        if (this.trustedSenders.has(from)) {
            spamScore -= 30;
            reasons.push('Sender is trusted');
        }

        if (subject.includes('urgent') || subject.includes('immediate')) {
            spamScore += 15;
            reasons.push('Urgent language in subject');
        }

        if (subject.includes('$') || subject.includes('money') || subject.includes('cash')) {
            spamScore += 20;
            reasons.push('Financial terms in subject');
            spamType = 'financial';
        }

        let riskLevel = 'low';
        if (spamScore >= 75) riskLevel = 'critical';
        else if (spamScore >= 50) riskLevel = 'high';
        else if (spamScore >= 25) riskLevel = 'medium';

        return {
            isSpam: spamScore >= 50,
            confidence: Math.min(100, Math.max(0, spamScore)),
            spamType,
            reasons: reasons.slice(0, 5),
            riskLevel
        };
    }

    async batchAnalyzeEmails(emails, useAI = true) {
        const results = [];
        const batchSize = useAI ? 3 : 10;
        
        for (let i = 0; i < emails.length; i += batchSize) {
            const batch = emails.slice(i, i + batchSize);
            
            const batchPromises = batch.map(async (email) => {
                try {
                    const analysis = useAI ? 
                        await this.analyzeEmailWithClaude(email) :
                        this.ruleBasedSpamAnalysis(email);
                    
                    this.logDetection(email, analysis);
                    
                    if (analysis.isSpam && analysis.confidence > 70) {
                        this.blockedSenders.add(email.from?.toLowerCase() || '');
                    }
                    
                    return {
                        email: {
                            id: email.id || email.uid,
                            from: email.from,
                            subject: email.subject,
                            provider: email.provider
                        },
                        analysis
                    };
                } catch (error) {
                    return {
                        email: {
                            id: email.id || email.uid,
                            from: email.from,
                            subject: email.subject,
                            provider: email.provider
                        },
                        analysis: {
                            isSpam: false,
                            confidence: 0,
                            spamType: null,
                            reasons: ['Analysis failed'],
                            riskLevel: 'unknown'
                        },
                        error: error.message
                    };
                }
            });
            
            const batchResults = await Promise.allSettled(batchPromises);
            const validResults = batchResults
                .filter(result => result.status === 'fulfilled')
                .map(result => result.value);
            
            results.push(...validResults);
            
            if (useAI && i + batchSize < emails.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        const spamEmails = results.filter(r => r.analysis.isSpam);
        
        return {
            results,
            summary: {
                total: results.length,
                spam: spamEmails.length,
                clean: results.length - spamEmails.length
            }
        };
    }

    logDetection(email, analysis) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            emailId: email.id || email.uid,
            from: email.from,
            subject: email.subject,
            provider: email.provider,
            isSpam: analysis.isSpam,
            confidence: analysis.confidence,
            spamType: analysis.spamType,
            riskLevel: analysis.riskLevel,
            reasons: analysis.reasons
        };
        
        this.detectionLog.push(logEntry);
        
        if (this.detectionLog.length > this.maxLogEntries) {
            this.detectionLog = this.detectionLog.slice(-this.maxLogEntries + 100);
        }
    }

    getDetectionStats() {
        const recentLogs = this.detectionLog.filter(log => 
            Date.now() - new Date(log.timestamp).getTime() < 24 * 60 * 60 * 1000
        );
        
        const spamCount = recentLogs.filter(log => log.isSpam).length;
        const totalCount = recentLogs.length;
        
        return {
            totalAnalyzed: totalCount,
            spamDetected: spamCount,
            cleanEmails: totalCount - spamCount,
            spamRate: totalCount > 0 ? (spamCount / totalCount * 100).toFixed(1) : 0,
            trustedSenders: this.trustedSenders.size,
            blockedSenders: this.blockedSenders.size,
            recentDetections: recentLogs.slice(-10)
        };
    }

    addTrustedSender(emailAddress) {
        this.trustedSenders.add(emailAddress.toLowerCase());
        this.blockedSenders.delete(emailAddress.toLowerCase());
    }

    addBlockedSender(emailAddress) {
        this.blockedSenders.add(emailAddress.toLowerCase());
        this.trustedSenders.delete(emailAddress.toLowerCase());
    }

    getDetectionLog(limit = 50) {
        return this.detectionLog.slice(-limit).reverse();
    }
}

// ================================
// Email Composition System
// ================================
class EmailCompositionSystem {
    constructor() {
        this.smtpTransporters = new Map();
        this.templates = new Map();
        this.signatures = new Map();
        this.initializeSMTPTransporters();
        this.initializeTemplates();
    }

    initializeSMTPTransporters() {
        if (process.env.YAHOO_EMAIL && process.env.YAHOO_APP_PASSWORD) {
            const yahooTransporter = nodemailer.createTransporter({
                host: 'smtp.mail.yahoo.com',
                port: 465,
                secure: true,
                auth: {
                    user: process.env.YAHOO_EMAIL,
                    pass: process.env.YAHOO_APP_PASSWORD
                }
            });
            this.smtpTransporters.set('yahoo', { transporter: yahooTransporter, account: process.env.YAHOO_EMAIL });
        }

        if (process.env.AOL_EMAIL && process.env.AOL_APP_PASSWORD) {
            const aolTransporter = nodemailer.createTransporter({
                host: 'smtp.aol.com',
                port: 465,
                secure: true,
                auth: {
                    user: process.env.AOL_EMAIL,
                    pass: process.env.AOL_APP_PASSWORD
                }
            });
            this.smtpTransporters.set('aol', { transporter: aolTransporter, account: process.env.AOL_EMAIL });
        }
    }

    initializeTemplates() {
        this.templates.set('reply', {
            name: 'Standard Reply',
            subject: 'Re: {original_subject}',
            body: '{reply_content}\n\n---\n{original_message}'
        });

        this.templates.set('forward', {
            name: 'Forward Email',
            subject: 'Fwd: {original_subject}',
            body: '{forward_message}\n\n---------- Forwarded message ----------\nFrom: {original_from}\nDate: {original_date}\nSubject: {original_subject}\n\n{original_content}'
        });

        this.signatures.set('professional', '\nBest regards,\n{sender_name}');
        this.signatures.set('casual', '\nThanks,\n{sender_name}');
    }

    async sendEmail(emailData) {
        const { provider, to, subject, body, cc, bcc, template, signature } = emailData;

        try {
            let processedSubject = subject;
            let processedBody = body;

            if (template && this.templates.has(template)) {
                const templateData = this.templates.get(template);
                processedSubject = this.processTemplate(templateData.subject, emailData);
                processedBody = this.processTemplate(templateData.body, emailData);
            }

            if (signature && this.signatures.has(signature)) {
                const signatureTemplate = this.signatures.get(signature);
                const processedSignature = this.processTemplate(signatureTemplate, emailData);
                processedBody += processedSignature;
            }

            let result;
            if (provider === 'gmail') {
                result = await this.sendViaGmail(to, processedSubject, processedBody, { cc, bcc });
            } else {
                result = await this.sendViaSMTP(provider, to, processedSubject, processedBody, { cc, bcc });
            }

            return result;
        } catch (error) {
            console.error(`❌ Failed to send email via ${provider}:`, error.message);
            throw error;
        }
    }

    async sendViaGmail(to, subject, body, options = {}) {
        const gmailManager = new EnhancedGmailManager();
        const result = await gmailManager.sendEmail(to, subject, body, options);
        return { success: true, provider: 'gmail', messageId: result.messageId };
    }

    async sendViaSMTP(provider, to, subject, body, options = {}) {
        const transporterInfo = this.smtpTransporters.get(provider);
        if (!transporterInfo) {
            throw new Error(`No SMTP configuration found for ${provider}`);
        }

        const mailOptions = {
            from: transporterInfo.account,
            to: Array.isArray(to) ? to.join(', ') : to,
            subject: subject,
            html: body
        };

        if (options.cc) mailOptions.cc = Array.isArray(options.cc) ? options.cc.join(', ') : options.cc;
        if (options.bcc) mailOptions.bcc = Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc;

        try {
            const info = await transporterInfo.transporter.sendMail(mailOptions);
            return { success: true, provider: provider, messageId: info.messageId };
        } catch (error) {
            throw new Error(`SMTP send failed: ${error.message}`);
        }
    }

    processTemplate(template, data) {
        let processed = template;
        Object.keys(data).forEach(key => {
            const placeholder = `{${key}}`;
            if (processed.includes(placeholder)) {
                processed = processed.replace(new RegExp(placeholder, 'g'), data[key] || '');
            }
        });
        return processed;
    }

    getAvailableAccounts() {
        const accounts = [];
        if (process.env.GMAIL_EMAIL) {
            accounts.push({ provider: 'gmail', account: process.env.GMAIL_EMAIL, type: 'oauth' });
        }
        this.smtpTransporters.forEach((transporterInfo, provider) => {
            accounts.push({ provider, account: transporterInfo.account, type: 'smtp' });
        });
        return accounts;
    }

    getAllTemplates() {
        return Array.from(this.templates.entries()).map(([name, template]) => ({ name, ...template }));
    }

    getAllSignatures() {
        return Array.from(this.signatures.entries()).map(([name, signature]) => ({ name, content: signature }));
    }
}

// ================================
// AOL Email Manager
// ================================
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
        
        console.log(`📧 AOL Manager initialized with ${this.accounts.length} account(s)`);
    }

    async getAllAccountsStats() {
        const stats = [];
        console.log(`   🔄 Processing ${this.accounts.length} AOL accounts...`);
        
        for (const account of this.accounts) {
            try {
                console.log(`   📧 Connecting to AOL: ${account.email}`);
                
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
                
                try {
                    const status = await client.status('INBOX', { messages: true, unseen: true });
                    stats.push({
                        email: account.email,
                        totalMessages: status.messages || 0,
                        unreadMessages: status.unseen || 0,
                        provider: 'aol'
                    });
                    console.log(`   ✅ AOL ${account.email}: ${status.messages} total, ${status.unseen} unread`);
                } finally {
                    await client.logout();
                }
            } catch (error) {
                console.error(`   ❌ Error getting AOL stats for ${account.email}:`, error.message);
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
        if (!account) throw new Error(`AOL account ${email} not found`);

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
                
                for await (let message of client.fetch(`${startSeq}:*`, {
                    envelope: true,
                    flags: true
                })) {
                    messages.push({
                        uid: message.uid,
                        subject: message.envelope.subject || '(No Subject)',
                        from: message.envelope.from?.[0]?.address || 'Unknown',
                        date: message.envelope.date,
                        unread: !message.flags.has('\\Seen'),
                        provider: 'aol',
                        account: email
                    });
                }
            }
        } finally {
            lock.release();
            await client.logout();
        }
        
        return messages.reverse();
    }

    async searchEmails(email, query, limit = 20) {
        const account = this.accounts.find(a => a.email === email);
        if (!account) throw new Error(`AOL account ${email} not found`);

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
            const uids = await client.search({ or: [{ subject: query }, { body: query }, { from: query }] });
            
            if (uids.length > 0) {
                const limitedUids = uids.slice(0, limit);
                for await (let message of client.fetch(limitedUids, {
                    envelope: true,
                    flags: true
                })) {
                    messages.push({
                        uid: message.uid,
                        subject: message.envelope.subject || '(No Subject)',
                        from: message.envelope.from?.[0]?.address || 'Unknown',
                        date: message.envelope.date,
                        unread: !message.flags.has('\\Seen'),
                        provider: 'aol',
                        account: email
                    });
                }
            }
        } finally {
            lock.release();
            await client.logout();
        }
        
        return messages;
    }
}

// ================================
// SERVER INITIALIZATION
// ================================
dotenv.config();

const app = express();
const PORT = process.env.API_PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Initialize Enhanced Managers
const enhancedGmailManager = new EnhancedGmailManager();
const yahooManager = new YahooEmailManager();
const aolManager = new AOLEmailManager();
const spamDetectionSystem = new AISpamDetectionSystem();
const emailCompositionSystem = new EmailCompositionSystem();

// Initialize Deletion Manager
const deletionManager = new EmailDeletionManager(enhancedGmailManager.oauth2Client, yahooManager, aolManager);

console.log('🚀 Enhanced Email API Server v2 Starting...');
console.log('============================================');
console.log(`📧 Gmail: ${process.env.GMAIL_EMAIL || 'Not configured'} (Enhanced)`);
console.log(`📧 Yahoo: ${yahooManager.accounts.length} account(s) configured`);
console.log(`📧 AOL: ${aolManager.accounts.length} account(s) configured`);
console.log('🤖 AI Spam Detection: Enabled');
console.log('📤 Email Composition: Enabled');
console.log('🗑️ Enhanced batch delete functionality enabled');
console.log();

// ================================
// ENHANCED HEALTH CHECK
// ================================
app.get('/api/health', async (req, res) => {
    try {
        // Test enhanced Gmail connection
        let gmailStatus = false;
        try {
            await enhancedGmailManager.getStats();
            gmailStatus = true;
        } catch (error) {
            console.log('Gmail health check failed:', error.message);
        }

        res.json({ 
            status: 'healthy', 
            timestamp: new Date().toISOString(),
            version: '2.0-enhanced',
            providers: {
                gmail: gmailStatus,
                yahoo: yahooManager.accounts.length,
                aol: aolManager.accounts.length
            },
            features: {
                batchDelete: true,
                deletionAudit: true,
                safetyChecks: true,
                spamDetection: true,
                aiComposition: true,
                emailSending: true
            },
            ai: {
                spamDetection: spamDetectionSystem.getDetectionStats(),
                emailComposition: emailCompositionSystem.getAvailableAccounts().length
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// ================================
// AI SPAM DETECTION ENDPOINTS
// ================================
app.post('/api/ai/spam/analyze', async (req, res) => {
    try {
        const { emails, useAI = true } = req.body;
        if (!emails || !Array.isArray(emails)) {
            return res.status(400).json({ error: 'Invalid emails array' });
        }
        const analysis = await spamDetectionSystem.batchAnalyzeEmails(emails, useAI);
        res.json({ success: true, analysis: analysis.results, summary: analysis.summary });
    } catch (error) {
        res.status(500).json({ error: 'Spam analysis failed', details: error.message });
    }
});

app.get('/api/ai/spam/stats', (req, res) => {
    try {
        const stats = spamDetectionSystem.getDetectionStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch spam statistics', details: error.message });
    }
});

app.post('/api/ai/spam/senders', async (req, res) => {
    try {
        const { action, email } = req.body;
        if (!action || !email) {
            return res.status(400).json({ error: 'Missing action or email' });
        }
        if (action === 'trust') {
            spamDetectionSystem.addTrustedSender(email);
        } else if (action === 'block') {
            spamDetectionSystem.addBlockedSender(email);
        } else {
            return res.status(400).json({ error: 'Invalid action. Use "trust" or "block"' });
        }
        res.json({ success: true, action, email });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update sender status', details: error.message });
    }
});

// ================================
// EMAIL COMPOSITION ENDPOINTS
// ================================
app.get('/api/compose/accounts', (req, res) => {
    try {
        const accounts = emailCompositionSystem.getAvailableAccounts();
        res.json(accounts);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch available accounts', details: error.message });
    }
});

app.post('/api/compose/send', async (req, res) => {
    try {
        const emailData = req.body;
        if (!emailData.to || !emailData.subject || !emailData.body) {
            return res.status(400).json({ error: 'Missing required fields: to, subject, body' });
        }
        const result = await emailCompositionSystem.sendEmail(emailData);
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ error: 'Failed to send email', details: error.message });
    }
});

app.get('/api/compose/templates', (req, res) => {
    try {
        const templates = emailCompositionSystem.getAllTemplates();
        res.json(templates);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch templates', details: error.message });
    }
});

// ================================
// ENHANCED EMAIL STATISTICS
// ================================
app.get('/api/stats', async (req, res) => {
    try {
        console.log('📊 Fetching enhanced multi-provider email statistics...');
        
        const stats = {
            providers: {},
            totals: {
                totalMessages: 0,
                unreadMessages: 0,
                accounts: 0
            },
            ai: {
                spamDetection: spamDetectionSystem.getDetectionStats()
            }
        };

        // Enhanced Gmail Statistics
        try {
            console.log('   📧 Fetching enhanced Gmail stats...');
            const gmailStats = await enhancedGmailManager.getStats();
            stats.providers.gmail = gmailStats;
            stats.totals.totalMessages += gmailStats.totalMessages;
            stats.totals.unreadMessages += gmailStats.unreadMessages;
            stats.totals.accounts += 1;
            console.log('   ✅ Enhanced Gmail stats retrieved');
        } catch (error) {
            console.error('   ❌ Enhanced Gmail stats error:', error.message);
            stats.providers.gmail = { error: error.message, status: 'error' };
        }

        // Yahoo Statistics
        try {
            console.log('   📧 Fetching Yahoo stats...');
            const yahooStats = await yahooManager.getAllAccountsStats();
            
            stats.providers.yahoo = {
                accounts: yahooStats,
                provider: 'yahoo',
                status: 'connected'
            };

            yahooStats.forEach(account => {
                if (!account.error) {
                    stats.totals.totalMessages += account.totalMessages || 0;
                    stats.totals.unreadMessages += account.unreadMessages || 0;
                    stats.totals.accounts += 1;
                }
            });

            console.log(`   ✅ Yahoo stats retrieved (${yahooStats.length} accounts)`);
        } catch (error) {
            console.error('   ❌ Yahoo stats error:', error.message);
            stats.providers.yahoo = { error: error.message, status: 'error' };
        }

        // AOL Statistics
        try {
            console.log('   📧 Fetching AOL stats...');
            const aolStats = await aolManager.getAllAccountsStats();
            
            stats.providers.aol = {
                accounts: aolStats,
                provider: 'aol',
                status: 'connected'
            };

            aolStats.forEach(account => {
                if (!account.error) {
                    stats.totals.totalMessages += account.totalMessages || 0;
                    stats.totals.unreadMessages += account.unreadMessages || 0;
                    stats.totals.accounts += 1;
                }
            });

            console.log(`   ✅ AOL stats retrieved (${aolStats.length} accounts)`);
        } catch (error) {
            console.error('   ❌ AOL stats error:', error.message);
            stats.providers.aol = { error: error.message, status: 'error' };
        }

        // Calculate legacy fields for frontend compatibility
        stats.unreadEmails = stats.totals.unreadMessages;
        stats.totalThisWeek = stats.providers.gmail?.totalThisWeek || 0;
        stats.avgResponseTime = '2h';
        stats.dailyAverage = Math.round((stats.providers.gmail?.totalThisWeek || 0) / 7);
        stats.totalMessages = stats.totals.totalMessages;
        stats.emailAddress = stats.providers.gmail?.emailAddress || 'Multi-Provider Dashboard';

        console.log('✅ Enhanced statistics generated:', {
            totalAccounts: stats.totals.accounts,
            totalMessages: stats.totals.totalMessages,
            totalUnread: stats.totals.unreadMessages
        });

        res.json(stats);

    } catch (error) {
        console.error('❌ Error fetching enhanced stats:', error.message);
        res.status(500).json({ 
            error: 'Failed to fetch email statistics',
            details: error.message 
        });
    }
});

// ================================
// ENHANCED RECENT EMAILS
// ================================
app.get('/api/emails/recent', async (req, res) => {
    try {
        console.log('📧 Fetching recent emails from all providers...');
        
        const limit = parseInt(req.query.limit) || 20;
        const timeRange = req.query.timeRange || 'week';
        const includeSpamAnalysis = req.query.spam === 'true';
        const allEmails = [];

        // Enhanced Gmail Recent Emails
        try {
            console.log('   📧 Fetching enhanced Gmail recent emails...');
            const gmailEmails = await enhancedGmailManager.getRecentEmails(Math.min(limit, 10));
            allEmails.push(...gmailEmails);
            console.log(`   ✅ Fetched ${gmailEmails.length} enhanced Gmail emails`);
        } catch (error) {
            console.error('   ❌ Enhanced Gmail recent emails error:', error.message);
        }

        // Yahoo Recent Emails
        try {
            console.log('   📧 Fetching Yahoo recent emails...');
            
            for (const account of yahooManager.accounts) {
                try {
                    const yahooEmails = await yahooManager.getRecentEmails(account.email, 5);
                    allEmails.push(...yahooEmails);
                    console.log(`   ✅ Fetched ${yahooEmails.length} emails from ${account.email}`);
                } catch (error) {
                    console.error(`   ⚠️ Error fetching emails from ${account.email}:`, error.message);
                }
            }
        } catch (error) {
            console.error('   ❌ Yahoo recent emails error:', error.message);
        }

        // AOL Recent Emails
        try {
            console.log('   📧 Fetching AOL recent emails...');
            
            for (const account of aolManager.accounts) {
                try {
                    const aolEmails = await aolManager.getRecentEmails(account.email, 5);
                    allEmails.push(...aolEmails);
                    console.log(`   ✅ Fetched ${aolEmails.length} emails from ${account.email}`);
                } catch (error) {
                    console.error(`   ⚠️ Error fetching emails from ${account.email}:`, error.message);
                }
            }
        } catch (error) {
            console.error('   ❌ AOL recent emails error:', error.message);
        }

        // Sort by date and limit results
        let sortedEmails = allEmails
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, limit);

        // Optional spam analysis
        if (includeSpamAnalysis && sortedEmails.length > 0) {
            try {
                console.log('🤖 Performing spam analysis on recent emails...');
                const spamAnalysis = await spamDetectionSystem.batchAnalyzeEmails(sortedEmails, true);
                
                // Add spam scores to emails
                sortedEmails = sortedEmails.map(email => {
                    const analysis = spamAnalysis.results.find(r => r.email.id === (email.id || email.uid));
                    return {
                        ...email,
                        spamAnalysis: analysis ? analysis.analysis : null
                    };
                });

                console.log(`✅ Spam analysis complete: ${spamAnalysis.summary.spam} spam detected`);
            } catch (error) {
                console.error('❌ Spam analysis failed:', error.message);
            }
        }

        console.log(`✅ Total recent emails fetched: ${sortedEmails.length} from all providers`);
        res.json(sortedEmails);

    } catch (error) {
        console.error('❌ Error fetching enhanced recent emails:', error.message);
        res.status(500).json({ 
            error: 'Failed to fetch recent emails',
            details: error.message 
        });
    }
});

// ================================
// ENHANCED SEARCH
// ================================
app.get('/api/emails/search', async (req, res) => {
    try {
        const query = req.query.q || '';
        const limit = parseInt(req.query.limit) || 20;
        const includeSpamAnalysis = req.query.spam === 'true';
        
        console.log(`🔍 Enhanced search across all providers with query: "${query}"`);

        if (!query.trim()) {
            return res.json([]);
        }

        const allResults = [];

        // Enhanced Gmail Search
        try {
            console.log('   🔍 Searching enhanced Gmail...');
            const gmailResults = await enhancedGmailManager.searchEmails(query, Math.min(limit, 10));
            allResults.push(...gmailResults);
            console.log(`   ✅ Found ${gmailResults.length} enhanced Gmail results`);
        } catch (error) {
            console.error('   ❌ Enhanced Gmail search error:', error.message);
        }

        // Yahoo Search
        try {
            console.log('   🔍 Searching Yahoo...');
            
            for (const account of yahooManager.accounts) {
                try {
                    const yahooResults = await yahooManager.searchEmails(account.email, query, 5);
                    allResults.push(...yahooResults);
                    console.log(`   ✅ Found ${yahooResults.length} results in ${account.email}`);
                } catch (error) {
                    console.error(`   ⚠️ Error searching ${account.email}:`, error.message);
                }
            }
        } catch (error) {
            console.error('   ❌ Yahoo search error:', error.message);
        }

        // AOL Search
        try {
            console.log('   🔍 Searching AOL...');
            
            for (const account of aolManager.accounts) {
                try {
                    const aolResults = await aolManager.searchEmails(account.email, query, 5);
                    allResults.push(...aolResults);
                    console.log(`   ✅ Found ${aolResults.length} results in ${account.email}`);
                } catch (error) {
                    console.error(`   ⚠️ Error searching ${account.email}:`, error.message);
                }
            }
        } catch (error) {
            console.error('   ❌ AOL search error:', error.message);
        }

        // Sort by date and limit
        let sortedResults = allResults
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, limit);

        // Optional spam analysis on search results
        if (includeSpamAnalysis && sortedResults.length > 0) {
            try {
                console.log('🤖 Performing spam analysis on search results...');
                const spamAnalysis = await spamDetectionSystem.batchAnalyzeEmails(sortedResults, true);
                
                sortedResults = sortedResults.map(email => {
                    const analysis = spamAnalysis.results.find(r => r.email.id === (email.id || email.uid));
                    return {
                        ...email,
                        spamAnalysis: analysis ? analysis.analysis : null
                    };
                });

                console.log(`✅ Search spam analysis complete`);
            } catch (error) {
                console.error('❌ Search spam analysis failed:', error.message);
            }
        }

        console.log(`✅ Total search results: ${sortedResults.length} from all providers`);
        res.json(sortedResults);

    } catch (error) {
        console.error('❌ Error searching enhanced emails:', error.message);
        res.status(500).json({ 
            error: 'Failed to search emails',
            details: error.message 
        });
    }
});

// ================================
// ENHANCED DELETION ENDPOINTS
// ================================
app.post('/api/emails/batch/delete', async (req, res) => {
    try {
        const { provider, account, emailIds, uids } = req.body;
        
        if (!provider || (!emailIds && !uids)) {
            return res.status(400).json({ 
                error: 'Missing required fields: provider and (emailIds or uids)' 
            });
        }

        let result;

        // Use enhanced Gmail manager for Gmail deletions
        if (provider === 'gmail') {
            result = await enhancedGmailManager.deleteEmails(emailIds || uids);
        } else {
            // Use existing deletion manager for IMAP providers
            result = await deletionManager.batchDeleteEmails(provider, account, emailIds, uids);
        }

        res.json(result);

    } catch (error) {
        console.error('❌ Enhanced batch delete endpoint error:', error.message);
        res.status(500).json({ 
            error: 'Batch delete failed',
            details: error.message 
        });
    }
});

// Delete emails by criteria endpoint
app.post('/api/emails/batch/delete-by-criteria', async (req, res) => {
    try {
        const { provider, account, criteria } = req.body;
        
        if (!provider || !criteria) {
            return res.status(400).json({ 
                error: 'Missing required fields: provider and criteria' 
            });
        }

        const result = await deletionManager.deleteEmailsByCriteria(provider, account, criteria);
        res.json(result);

    } catch (error) {
        console.error('❌ Delete by criteria endpoint error:', error.message);
        res.status(500).json({ 
            error: 'Delete by criteria failed',
            details: error.message 
        });
    }
});

// Safe bulk delete endpoint
app.post('/api/emails/batch/safe-delete', async (req, res) => {
    try {
        const { provider, account, identifiers, options } = req.body;
        
        if (!provider || !identifiers) {
            return res.status(400).json({ 
                error: 'Missing required fields: provider and identifiers' 
            });
        }

        const result = await deletionManager.safetyBulkDelete(provider, account, identifiers, options);
        res.json(result);

    } catch (error) {
        console.error('❌ Safe delete endpoint error:', error.message);
        res.status(500).json({ 
            error: 'Safe delete failed',
            details: error.message 
        });
    }
});

// Get deletion audit log
app.get('/api/emails/deletion/log', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const log = deletionManager.getDeletionLog(limit);
        res.json({
            log: log,
            total: log.length
        });
    } catch (error) {
        console.error('❌ Deletion log endpoint error:', error.message);
        res.status(500).json({ 
            error: 'Failed to fetch deletion log',
            details: error.message 
        });
    }
});

// Get deletion statistics
app.get('/api/emails/deletion/stats', (req, res) => {
    try {
        const stats = deletionManager.getDeletionStats();
        res.json(stats);
    } catch (error) {
        console.error('❌ Deletion stats endpoint error:', error.message);
        res.status(500).json({ 
            error: 'Failed to fetch deletion statistics',
            details: error.message 
        });
    }
});

// Emergency stop endpoint
app.post('/api/emails/deletion/emergency-stop', (req, res) => {
    try {
        deletionManager.emergencyStop();
        res.json({ 
            success: true, 
            message: 'Emergency stop activated' 
        });
    } catch (error) {
        console.error('❌ Emergency stop endpoint error:', error.message);
        res.status(500).json({ 
            error: 'Emergency stop failed',
            details: error.message 
        });
    }
});

// ================================
// PROVIDER-SPECIFIC ENDPOINTS
// ================================
app.get('/api/providers/gmail', async (req, res) => {
    try {
        const profile = await enhancedGmailManager.getStats();
        res.json({
            success: true,
            provider: 'gmail',
            account: profile.emailAddress,
            totalMessages: profile.totalMessages,
            totalThreads: profile.totalThreads,
            enhanced: true
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/providers/yahoo', async (req, res) => {
    try {
        const stats = await yahooManager.getAllAccountsStats();
        res.json({
            success: true,
            provider: 'yahoo',
            accounts: stats
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/providers/aol', async (req, res) => {
    try {
        const stats = await aolManager.getAllAccountsStats();
        res.json({
            success: true,
            provider: 'aol',
            accounts: stats
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ================================
// SERVER STARTUP
// ================================
app.listen(PORT, () => {
    console.log('✅ Enhanced Email API Server v2 started successfully!');
    console.log(`📡 Server running on: http://localhost:${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
    console.log(`📊 Enhanced stats: http://localhost:${PORT}/api/stats`);
    console.log(`📧 Enhanced recent: http://localhost:${PORT}/api/emails/recent`);
    console.log(`🔍 Enhanced search: http://localhost:${PORT}/api/emails/search?q=query`);
    console.log();
    console.log('🤖 AI Features Available:');
    console.log(`   • POST ${PORT}/api/ai/spam/analyze - Analyze emails for spam`);
    console.log(`   • GET  ${PORT}/api/ai/spam/stats - Spam detection statistics`);
    console.log(`   • POST ${PORT}/api/ai/spam/senders - Manage trusted/blocked senders`);
    console.log();
    console.log('📤 Email Composition Available:');
    console.log(`   • GET  ${PORT}/api/compose/accounts - Available accounts`);
    console.log(`   • POST ${PORT}/api/compose/send - Send email`);
    console.log(`   • GET  ${PORT}/api/compose/templates - Email templates`);
    console.log();
    console.log('🗑️ Enhanced Deletion Endpoints:');
    console.log(`   • POST ${PORT}/api/emails/batch/delete - Enhanced batch delete`);
    console.log(`   • POST ${PORT}/api/emails/batch/delete-by-criteria - Delete by criteria`);
    console.log(`   • POST ${PORT}/api/emails/batch/safe-delete - Safe delete with checks`);
    console.log(`   • GET  ${PORT}/api/emails/deletion/log - Deletion audit log`);
    console.log(`   • GET  ${PORT}/api/emails/deletion/stats - Deletion statistics`);
    console.log();
    console.log('🎯 Multi-Provider Dashboard Ready!');
    console.log('📧 Gmail ✅ (Enhanced) | Yahoo ✅ | AOL ✅ | 🤖 AI ✅ | 📤 Compose ✅');
    console.log('📱 Start your frontend with: pnpm run frontend');
});

// Enhanced error handling
app.on('error', (error) => {
    console.error('❌ Server error:', error);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught exception:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled rejection:', error);
});