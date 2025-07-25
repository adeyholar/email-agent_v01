// File: D:\AI\Gits\email-agent_v01\email-composition-system.js
// Email Composition and Reply System for All Providers
// Supports Gmail API, Yahoo/AOL SMTP, and AI-assisted composition

import nodemailer from 'nodemailer';
import { EnhancedGmailManager } from './enhanced-gmail-manager.js';

class EmailCompositionSystem {
    constructor() {
        this.gmailManager = new EnhancedGmailManager();
        this.smtpTransporters = new Map();
        this.initializeSMTPTransporters();
        
        // Email templates and signatures
        this.templates = new Map();
        this.signatures = new Map();
        this.initializeTemplates();
    }

    initializeSMTPTransporters() {
        // Yahoo SMTP configuration
        if (process.env.YAHOO_EMAIL && process.env.YAHOO_APP_PASSWORD) {
            const yahooTransporter = nodemailer.createTransporter({
                host: 'smtp.mail.yahoo.com',
                port: 465,
                secure: true,
                auth: {
                    user: process.env.YAHOO_EMAIL,
                    pass: process.env.YAHOO_APP_PASSWORD
                },
                pool: true,
                maxConnections: 3,
                rateDelta: 1000,
                rateLimit: 5
            });
            
            this.smtpTransporters.set('yahoo', {
                transporter: yahooTransporter,
                account: process.env.YAHOO_EMAIL
            });
        }

        if (process.env.YAHOO_EMAIL2 && process.env.YAHOO2_APP_PASSWORD) {
            const yahoo2Transporter = nodemailer.createTransporter({
                host: 'smtp.mail.yahoo.com',
                port: 465,
                secure: true,
                auth: {
                    user: process.env.YAHOO_EMAIL2,
                    pass: process.env.YAHOO2_APP_PASSWORD
                }
            });
            
            this.smtpTransporters.set('yahoo2', {
                transporter: yahoo2Transporter,
                account: process.env.YAHOO_EMAIL2
            });
        }

        // AOL SMTP configuration (uses Yahoo infrastructure)
        if (process.env.AOL_EMAIL && process.env.AOL_APP_PASSWORD) {
            const aolTransporter = nodemailer.createTransporter({
                host: 'smtp.aol.com',
                port: 465,
                secure: true,
                auth: {
                    user: process.env.AOL_EMAIL,
                    pass: process.env.AOL_APP_PASSWORD
                },
                pool: true,
                maxConnections: 2,
                rateDelta: 2000,
                rateLimit: 3
            });
            
            this.smtpTransporters.set('aol', {
                transporter: aolTransporter,
                account: process.env.AOL_EMAIL
            });
        }

        if (process.env.AOL2_EMAIL && process.env.AOL2_APP_PASSWORD) {
            const aol2Transporter = nodemailer.createTransporter({
                host: 'smtp.aol.com',
                port: 465,
                secure: true,
                auth: {
                    user: process.env.AOL2_EMAIL,
                    pass: process.env.AOL2_APP_PASSWORD
                }
            });
            
            this.smtpTransporters.set('aol2', {
                transporter: aol2Transporter,
                account: process.env.AOL2_EMAIL
            });
        }

        if (process.env.AOL3_EMAIL && process.env.AOL3_APP_PASSWORD) {
            const aol3Transporter = nodemailer.createTransporter({
                host: 'smtp.aol.com',
                port: 465,
                secure: true,
                auth: {
                    user: process.env.AOL3_EMAIL,
                    pass: process.env.AOL3_APP_PASSWORD
                }
            });
            
            this.smtpTransporters.set('aol3', {
                transporter: aol3Transporter,
                account: process.env.AOL3_EMAIL
            });
        }

        console.log(`📤 Email composition system initialized with ${this.smtpTransporters.size + 1} accounts`);
    }

    initializeTemplates() {
        // Default email templates
        this.templates.set('reply', {
            name: 'Standard Reply',
            subject: 'Re: {original_subject}',
            body: `{reply_content}

---
{original_message}`
        });

        this.templates.set('forward', {
            name: 'Forward Email',
            subject: 'Fwd: {original_subject}',
            body: `{forward_message}

---------- Forwarded message ----------
From: {original_from}
Date: {original_date}
Subject: {original_subject}
To: {original_to}

{original_content}`
        });

        this.templates.set('meeting_request', {
            name: 'Meeting Request',
            subject: 'Meeting Request: {meeting_topic}',
            body: `Hi {recipient_name},

I hope this email finds you well. I would like to schedule a meeting to discuss {meeting_topic}.

Proposed Details:
- Date: {meeting_date}
- Time: {meeting_time}
- Duration: {meeting_duration}
- Location/Platform: {meeting_location}

Please let me know if this time works for you, or suggest alternative times that would be more convenient.

Best regards,
{sender_name}`
        });

        this.templates.set('follow_up', {
            name: 'Follow Up',
            subject: 'Follow up: {original_subject}',
            body: `Hi {recipient_name},

I wanted to follow up on my previous email regarding {topic}.

{follow_up_content}

Please let me know if you need any additional information.

Best regards,
{sender_name}`
        });

        // Default signatures
        this.signatures.set('professional', `
Best regards,
{sender_name}
{sender_title}
{sender_company}
{sender_email}
{sender_phone}`);

        this.signatures.set('casual', `
Thanks,
{sender_name}`);

        this.signatures.set('formal', `
Sincerely,
{sender_name}
{sender_title}
{sender_company}`);
    }

    async sendEmail(emailData) {
        const {
            provider,
            account,
            to,
            subject,
            body,
            cc,
            bcc,
            attachments,
            template,
            signature,
            replyTo,
            isHtml = true
        } = emailData;

        try {
            console.log(`📤 Sending email via ${provider} (${account || 'default'})...`);

            // Process template if specified
            let processedSubject = subject;
            let processedBody = body;

            if (template && this.templates.has(template)) {
                const templateData = this.templates.get(template);
                processedSubject = this.processTemplate(templateData.subject, emailData);
                processedBody = this.processTemplate(templateData.body, emailData);
            }

            // Add signature if specified
            if (signature && this.signatures.has(signature)) {
                const signatureTemplate = this.signatures.get(signature);
                const processedSignature = this.processTemplate(signatureTemplate, emailData);
                processedBody += '\n\n' + processedSignature;
            }

            let result;

            if (provider === 'gmail') {
                result = await this.sendViaGmail(
                    to, processedSubject, processedBody, {
                        cc, bcc, replyTo, isHtml, attachments
                    }
                );
            } else {
                result = await this.sendViaSMTP(
                    provider, account, to, processedSubject, processedBody, {
                        cc, bcc, replyTo, isHtml, attachments
                    }
                );
            }

            console.log(`✅ Email sent successfully via ${provider}`);
            return result;

        } catch (error) {
            console.error(`❌ Failed to send email via ${provider}:`, error.message);
            throw error;
        }
    }

    async sendViaGmail(to, subject, body, options = {}) {
        try {
            const result = await this.gmailManager.sendEmail(to, subject, body, {
                cc: options.cc,
                bcc: options.bcc,
                replyTo: options.replyTo,
                threadId: options.threadId
            });

            return {
                success: true,
                provider: 'gmail',
                messageId: result.messageId,
                threadId: result.threadId
            };
        } catch (error) {
            throw new Error(`Gmail send failed: ${error.message}`);
        }
    }

    async sendViaSMTP(provider, account, to, subject, body, options = {}) {
        const transporterKey = account ? `${provider}_${account}` : provider;
        let transporterInfo = this.smtpTransporters.get(transporterKey) || this.smtpTransporters.get(provider);

        if (!transporterInfo) {
            throw new Error(`No SMTP configuration found for ${provider}`);
        }

        const mailOptions = {
            from: transporterInfo.account,
            to: Array.isArray(to) ? to.join(', ') : to,
            subject: subject,
            [options.isHtml ? 'html' : 'text']: body
        };

        if (options.cc) {
            mailOptions.cc = Array.isArray(options.cc) ? options.cc.join(', ') : options.cc;
        }

        if (options.bcc) {
            mailOptions.bcc = Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc;
        }

        if (options.replyTo) {
            mailOptions.replyTo = options.replyTo;
        }

        if (options.attachments) {
            mailOptions.attachments = options.attachments;
        }

        try {
            const info = await transporterInfo.transporter.sendMail(mailOptions);
            
            return {
                success: true,
                provider: provider,
                messageId: info.messageId,
                response: info.response
            };
        } catch (error) {
            throw new Error(`SMTP send failed: ${error.message}`);
        }
    }

    async replyToEmail(originalEmail, replyContent, options = {}) {
        const {
            includeOriginal = true,
            replyToAll = false,
            template,
            signature
        } = options;

        try {
            console.log(`📧 Replying to email from ${originalEmail.from}...`);

            let replyTo = originalEmail.from;
            let cc = undefined;

            if (replyToAll && originalEmail.cc) {
                cc = originalEmail.cc;
            }

            // Determine which provider/account to use for reply
            const replyProvider = originalEmail.provider || 'gmail';
            const replyAccount = originalEmail.account;

            let subject = originalEmail.subject || 'Re: (No Subject)';
            if (!subject.toLowerCase().startsWith('re:')) {
                subject = `Re: ${subject}`;
            }

            let body = replyContent;
            
            if (includeOriginal) {
                body += `\n\n--- Original Message ---\n`;
                body += `From: ${originalEmail.from}\n`;
                body += `Date: ${originalEmail.date}\n`;
                body += `Subject: ${originalEmail.subject}\n`;
                if (originalEmail.to) body += `To: ${originalEmail.to}\n`;
                body += `\n${originalEmail.snippet || originalEmail.body || ''}`;
            }

            const emailData = {
                provider: replyProvider,
                account: replyAccount,
                to: replyTo,
                cc: cc,
                subject: subject,
                body: body,
                template: template,
                signature: signature,
                threadId: originalEmail.threadId,
                originalEmail: originalEmail
            };

            const result = await this.sendEmail(emailData);
            
            console.log(`✅ Reply sent successfully`);
            return result;

        } catch (error) {
            console.error(`❌ Failed to send reply:`, error.message);
            throw error;
        }
    }

    async forwardEmail(originalEmail, recipients, forwardMessage = '', options = {}) {
        try {
            console.log(`📤 Forwarding email to ${recipients}...`);

            const { template, signature, provider = 'gmail' } = options;

            let subject = originalEmail.subject || 'Fwd: (No Subject)';
            if (!subject.toLowerCase().startsWith('fwd:')) {
                subject = `Fwd: ${subject}`;
            }

            const emailData = {
                provider: provider,
                to: recipients,
                subject: subject,
                body: forwardMessage,
                template: template || 'forward',
                signature: signature,
                original_from: originalEmail.from,
                original_date: originalEmail.date,
                original_subject: originalEmail.subject,
                original_to: originalEmail.to,
                original_content: originalEmail.snippet || originalEmail.body || '',
                forward_message: forwardMessage
            };

            const result = await this.sendEmail(emailData);
            
            console.log(`✅ Email forwarded successfully`);
            return result;

        } catch (error) {
            console.error(`❌ Failed to forward email:`, error.message);
            throw error;
        }
    }

    async composeWithAI(prompt, emailContext = {}) {
        try {
            console.log(`🤖 Using AI to compose email...`);

            const compositionPrompt = `
Generate an email based on this request: "${prompt}"

Context information:
${emailContext.recipient ? `Recipient: ${emailContext.recipient}` : ''}
${emailContext.tone ? `Tone: ${emailContext.tone}` : ''}
${emailContext.purpose ? `Purpose: ${emailContext.purpose}` : ''}
${emailContext.background ? `Background: ${emailContext.background}` : ''}

Return ONLY a JSON object with this structure:
{
  "subject": "email subject line",
  "body": "email body content",
  "tone": "professional|casual|formal|friendly",
  "suggestedRecipients": ["array of suggested recipients if any"],
  "priority": "high|medium|low"
}

Make the email professional, clear, and appropriate for the context.
DO NOT OUTPUT ANYTHING OTHER THAN VALID JSON.`;

            const response = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: "claude-sonnet-4-20250514",
                    max_tokens: 1500,
                    messages: [
                        { role: "user", content: compositionPrompt }
                    ]
                })
            });

            if (!response.ok) {
                throw new Error(`Claude API error: ${response.status}`);
            }

            const data = await response.json();
            let responseText = data.content[0].text;
            
            // Clean up response
            responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
            
            const emailComposition = JSON.parse(responseText);
            
            console.log(`✅ AI email composition complete`);
            return emailComposition;

        } catch (error) {
            console.error(`❌ AI email composition failed:`, error.message);
            throw error;
        }
    }

    processTemplate(template, data) {
        let processed = template;
        
        // Replace placeholders with actual data
        Object.keys(data).forEach(key => {
            const placeholder = `{${key}}`;
            if (processed.includes(placeholder)) {
                processed = processed.replace(new RegExp(placeholder, 'g'), data[key] || '');
            }
        });

        // Handle special placeholders
        processed = processed.replace(/{sender_name}/g, data.senderName || 'Your Name');
        processed = processed.replace(/{sender_email}/g, data.account || process.env.GMAIL_EMAIL || '');
        processed = processed.replace(/{sender_title}/g, data.senderTitle || '');
        processed = processed.replace(/{sender_company}/g, data.senderCompany || '');
        processed = processed.replace(/{sender_phone}/g, data.senderPhone || '');
        processed = processed.replace(/{recipient_name}/g, data.recipientName || 'There');
        processed = processed.replace(/{date}/g, new Date().toLocaleDateString());
        processed = processed.replace(/{time}/g, new Date().toLocaleTimeString());

        return processed;
    }

    async validateEmail(emailAddress) {
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(emailAddress);
    }

    async testSMTPConnection(provider, account) {
        const transporterKey = account ? `${provider}_${account}` : provider;
        const transporterInfo = this.smtpTransporters.get(transporterKey);

        if (!transporterInfo) {
            throw new Error(`No SMTP configuration found for ${provider}`);
        }

        try {
            await transporterInfo.transporter.verify();
            return {
                success: true,
                provider: provider,
                account: transporterInfo.account
            };
        } catch (error) {
            throw new Error(`SMTP connection test failed: ${error.message}`);
        }
    }

    getAvailableAccounts() {
        const accounts = [];

        // Add Gmail account
        if (process.env.GMAIL_EMAIL) {
            accounts.push({
                provider: 'gmail',
                account: process.env.GMAIL_EMAIL,
                name: 'Gmail',
                type: 'oauth'
            });
        }

        // Add SMTP accounts
        this.smtpTransporters.forEach((transporterInfo, key) => {
            const [provider] = key.split('_');
            accounts.push({
                provider: provider,
                account: transporterInfo.account,
                name: provider.charAt(0).toUpperCase() + provider.slice(1),
                type: 'smtp'
            });
        });

        return accounts;
    }

    addTemplate(name, template) {
        this.templates.set(name, template);
    }

    getTemplate(name) {
        return this.templates.get(name);
    }

    getAllTemplates() {
        return Array.from(this.templates.entries()).map(([name, template]) => ({
            name,
            ...template
        }));
    }

    addSignature(name, signature) {
        this.signatures.set(name, signature);
    }

    getSignature(name) {
        return this.signatures.get(name);
    }

    getAllSignatures() {
        return Array.from(this.signatures.entries()).map(([name, signature]) => ({
            name,
            content: signature
        }));
    }

    // Bulk email sending with rate limiting
    async sendBulkEmails(emailList, options = {}) {
        const {
            batchSize = 5,
            delayBetweenBatches = 2000,
            provider = 'gmail',
            template,
            signature
        } = options;

        console.log(`📤 Sending bulk emails: ${emailList.length} emails via ${provider}`);

        const results = [];
        const errors = [];

        for (let i = 0; i < emailList.length; i += batchSize) {
            const batch = emailList.slice(i, i + batchSize);
            
            console.log(`📧 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(emailList.length / batchSize)}`);

            const batchPromises = batch.map(async (emailData) => {
                try {
                    const result = await this.sendEmail({
                        provider,
                        template,
                        signature,
                        ...emailData
                    });
                    return { success: true, email: emailData.to, result };
                } catch (error) {
                    return { success: false, email: emailData.to, error: error.message };
                }
            });

            const batchResults = await Promise.allSettled(batchPromises);
            
            batchResults.forEach(result => {
                if (result.status === 'fulfilled') {
                    if (result.value.success) {
                        results.push(result.value);
                    } else {
                        errors.push(result.value);
                    }
                } else {
                    errors.push({ success: false, error: result.reason.message });
                }
            });

            // Delay between batches to respect rate limits
            if (i + batchSize < emailList.length) {
                await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
            }
        }

        console.log(`✅ Bulk email sending complete: ${results.length} sent, ${errors.length} failed`);

        return {
            total: emailList.length,
            sent: results.length,
            failed: errors.length,
            results,
            errors: errors.slice(0, 10) // Limit error details
        };
    }

    // Email scheduling (for future implementation)
    scheduleEmail(emailData, sendTime) {
        // This would integrate with a job queue system
        console.log(`⏰ Email scheduled for ${sendTime}`);
        return {
            success: true,
            scheduledId: Date.now().toString(),
            sendTime: sendTime,
            message: 'Email scheduled successfully'
        };
    }

    // Email analytics and tracking
    getCompositionStats() {
        return {
            availableAccounts: this.getAvailableAccounts().length,
            smtpConnections: this.smtpTransporters.size,
            templates: this.templates.size,
            signatures: this.signatures.size,
            providers: ['gmail', 'yahoo', 'aol']
        };
    }

    // Auto-save draft functionality
    saveDraft(draftData) {
        // This would save to local storage or database
        const draftId = `draft_${Date.now()}`;
        console.log(`💾 Draft saved with ID: ${draftId}`);
        return { draftId, timestamp: new Date().toISOString() };
    }

    // Email preview before sending
    previewEmail(emailData) {
        const {
            to,
            subject,
            body,
            template,
            signature,
            provider = 'gmail'
        } = emailData;

        let processedSubject = subject;
        let processedBody = body;

        // Process template
        if (template && this.templates.has(template)) {
            const templateData = this.templates.get(template);
            processedSubject = this.processTemplate(templateData.subject, emailData);
            processedBody = this.processTemplate(templateData.body, emailData);
        }

        // Add signature
        if (signature && this.signatures.has(signature)) {
            const signatureTemplate = this.signatures.get(signature);
            const processedSignature = this.processTemplate(signatureTemplate, emailData);
            processedBody += '\n\n' + processedSignature;
        }

        return {
            preview: {
                from: this.getAccountEmail(provider, emailData.account),
                to: to,
                subject: processedSubject,
                body: processedBody,
                estimatedSize: Buffer.byteLength(processedBody, 'utf8'),
                provider: provider
            },
            warnings: this.validateEmailData(emailData)
        };
    }

    validateEmailData(emailData) {
        const warnings = [];

        if (!emailData.to) {
            warnings.push('No recipient specified');
        }

        if (!emailData.subject || emailData.subject.trim().length === 0) {
            warnings.push('No subject line');
        }

        if (!emailData.body || emailData.body.trim().length === 0) {
            warnings.push('Email body is empty');
        }

        if (emailData.subject && emailData.subject.length > 100) {
            warnings.push('Subject line is very long (over 100 characters)');
        }

        if (emailData.body && emailData.body.length > 50000) {
            warnings.push('Email body is very large (over 50KB)');
        }

        return warnings;
    }

    getAccountEmail(provider, account) {
        if (provider === 'gmail') {
            return process.env.GMAIL_EMAIL;
        }

        const transporterKey = account ? `${provider}_${account}` : provider;
        const transporterInfo = this.smtpTransporters.get(transporterKey);
        return transporterInfo ? transporterInfo.account : 'Unknown';
    }

    // Cleanup method
    async closeConnections() {
        console.log('📤 Closing email composition system connections...');
        
        for (const [key, transporterInfo] of this.smtpTransporters) {
            try {
                if (transporterInfo.transporter.close) {
                    await transporterInfo.transporter.close();
                }
            } catch (error) {
                console.warn(`Warning: Failed to close ${key} connection:`, error.message);
            }
        }
        
        console.log('✅ Email composition system connections closed');
    }
}

export { EmailCompositionSystem };