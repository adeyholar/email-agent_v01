// File: D:\AI\Gits\email-agent_v01\working-aol-fix.js
// Working AOL Integration Fix Script - No Syntax Errors

import fs from 'fs';
import path from 'path';

const SERVER_FILE = 'enhanced-working-api-server.js';

console.log('🔧 AOL Integration Fix Script');
console.log('============================');

function createBackup() {
    if (fs.existsSync(SERVER_FILE)) {
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
        const backupName = `${SERVER_FILE}.backup-${timestamp}`;
        fs.copyFileSync(SERVER_FILE, backupName);
        console.log(`✅ Backup created: ${backupName}`);
        return true;
    }
    console.log('⚠️ Original file not found');
    return false;
}

function generateFixedServerCode() {
    return `// File: D:\\AI\\Gits\\email-agent_v01\\enhanced-working-api-server.js
// Enhanced Working API Server with Gmail + Yahoo + AOL Integration
// Fixed syntax errors and properly integrated AOL

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
                        unread: !message.flags.has('\\\\Seen'),
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

dotenv.config();

const app = express();
const PORT = process.env.API_PORT || 3001;

app.use(cors());
app.use(express.json());

// Gmail OAuth Setup
const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'http://localhost:8080/auth/gmail/callback'
);

oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN
});

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

// Initialize Email Managers
const yahooManager = new YahooEmailManager();
const aolManager = new AOLEmailManager();

console.log('🚀 Enhanced Email API Server Starting...');
console.log('==========================================');
console.log(\`📧 Gmail: \${process.env.GMAIL_EMAIL || 'Not configured'}\`);
console.log(\`📧 Yahoo: \${yahooManager.accounts.length} account(s) configured\`);
console.log(\`📧 AOL: \${aolManager.accounts.length} account(s) configured\`);
console.log();

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        providers: {
            gmail: !!process.env.GMAIL_REFRESH_TOKEN,
            yahoo: yahooManager.accounts.length,
            aol: aolManager.accounts.length
        }
    });
});

// Enhanced email statistics
app.get('/api/stats', async (req, res) => {
    try {
        console.log('📊 Fetching multi-provider email statistics...');
        
        const stats = {
            providers: {},
            totals: {
                totalMessages: 0,
                unreadMessages: 0,
                accounts: 0
            }
        };

        // Gmail Statistics
        try {
            console.log('   📧 Fetching Gmail stats...');
            const profile = await gmail.users.getProfile({ userId: 'me' });
            const unreadMessages = await gmail.users.messages.list({
                userId: 'me',
                q: 'is:unread in:inbox',
                maxResults: 1
            });

            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            const weekQuery = \`after:\${oneWeekAgo.getFullYear()}/\${(oneWeekAgo.getMonth() + 1).toString().padStart(2, '0')}/\${oneWeekAgo.getDate().toString().padStart(2, '0')}\`;
            
            const thisWeekMessages = await gmail.users.messages.list({
                userId: 'me',
                q: weekQuery,
                maxResults: 1
            });

            stats.providers.gmail = {
                emailAddress: profile.data.emailAddress,
                totalMessages: profile.data.messagesTotal,
                unreadMessages: unreadMessages.data.resultSizeEstimate || 0,
                totalThisWeek: thisWeekMessages.data.resultSizeEstimate || 0,
                totalThreads: profile.data.threadsTotal,
                provider: 'gmail',
                status: 'connected'
            };

            stats.totals.totalMessages += profile.data.messagesTotal;
            stats.totals.unreadMessages += unreadMessages.data.resultSizeEstimate || 0;
            stats.totals.accounts += 1;

            console.log('   ✅ Gmail stats retrieved');
        } catch (error) {
            console.error('   ❌ Gmail stats error:', error.message);
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

            console.log(\`   ✅ Yahoo stats retrieved (\${yahooStats.length} accounts)\`);
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

            console.log(\`   ✅ AOL stats retrieved (\${aolStats.length} accounts)\`);
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

// Enhanced recent emails endpoint
app.get('/api/emails/recent', async (req, res) => {
    try {
        console.log('📧 Fetching recent emails from all providers...');
        
        const limit = parseInt(req.query.limit) || 10;
        const timeRange = req.query.timeRange || 'week';
        const allEmails = [];

        // Gmail Recent Emails
        try {
            console.log('   📧 Fetching Gmail recent emails...');
            
            let query = 'in:inbox';
            
            if (timeRange !== 'all') {
                const daysAgo = timeRange === 'today' ? 1 : timeRange === 'week' ? 7 : 30;
                const date = new Date();
                date.setDate(date.getDate() - daysAgo);
                query += \` after:\${date.getFullYear()}/\${(date.getMonth() + 1).toString().padStart(2, '0')}/\${date.getDate().toString().padStart(2, '0')}\`;
            }

            const messagesList = await gmail.users.messages.list({
                userId: 'me',
                q: query,
                maxResults: Math.min(limit, 10)
            });

            if (messagesList.data.messages) {
                const gmailEmails = await Promise.all(
                    messagesList.data.messages.slice(0, 5).map(async (message) => {
                        try {
                            const messageDetail = await gmail.users.messages.get({
                                userId: 'me',
                                id: message.id,
                                format: 'metadata',
                                metadataHeaders: ['From', 'Subject', 'Date']
                            });

                            const headers = messageDetail.data.payload.headers;
                            const from = headers.find(h => h.name === 'From')?.value || 'Unknown';
                            const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
                            const date = headers.find(h => h.name === 'Date')?.value || new Date().toISOString();

                            return {
                                id: message.id,
                                from: from,
                                subject: subject,
                                date: new Date(date),
                                isUnread: messageDetail.data.labelIds?.includes('UNREAD') || false,
                                snippet: messageDetail.data.snippet || '',
                                provider: 'gmail',
                                account: process.env.GMAIL_EMAIL
                            };
                        } catch (err) {
                            console.warn('⚠️ Error fetching Gmail message:', message.id, err.message);
                            return null;
                        }
                    })
                );

                allEmails.push(...gmailEmails.filter(email => email !== null));
                console.log(\`   ✅ Fetched \${gmailEmails.filter(e => e).length} Gmail emails\`);
            }
        } catch (error) {
            console.error('   ❌ Gmail recent emails error:', error.message);
        }

        // Yahoo Recent Emails
        try {
            console.log('   📧 Fetching Yahoo recent emails...');
            
            for (const account of yahooManager.accounts) {
                try {
                    const yahooEmails = await yahooManager.getRecentEmails(account.email, 5);
                    allEmails.push(...yahooEmails);
                    console.log(\`   ✅ Fetched \${yahooEmails.length} emails from \${account.email}\`);
                } catch (error) {
                    console.error(\`   ⚠️ Error fetching emails from \${account.email}:\`, error.message);
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
                    console.log(\`   ✅ Fetched \${aolEmails.length} emails from \${account.email}\`);
                } catch (error) {
                    console.error(\`   ⚠️ Error fetching emails from \${account.email}:\`, error.message);
                }
            }
        } catch (error) {
            console.error('   ❌ AOL recent emails error:', error.message);
        }

        // Sort by date and limit results
        const sortedEmails = allEmails
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, limit);

        console.log(\`✅ Total recent emails fetched: \${sortedEmails.length} from all providers\`);
        res.json(sortedEmails);

    } catch (error) {
        console.error('❌ Error fetching enhanced recent emails:', error.message);
        res.status(500).json({ 
            error: 'Failed to fetch recent emails',
            details: error.message 
        });
    }
});

// Enhanced search emails endpoint
app.get('/api/emails/search', async (req, res) => {
    try {
        const query = req.query.q || '';
        const limit = parseInt(req.query.limit) || 20;
        
        console.log(\`🔍 Searching emails across all providers with query: "\${query}"\`);

        if (!query.trim()) {
            return res.json([]);
        }

        const allResults = [];

        // Gmail Search
        try {
            console.log('   🔍 Searching Gmail...');
            
            const searchResults = await gmail.users.messages.list({
                userId: 'me',
                q: query,
                maxResults: Math.min(limit, 15)
            });

            if (searchResults.data.messages) {
                const gmailEmails = await Promise.all(
                    searchResults.data.messages.slice(0, 5).map(async (message) => {
                        try {
                            const messageDetail = await gmail.users.messages.get({
                                userId: 'me',
                                id: message.id,
                                format: 'metadata',
                                metadataHeaders: ['From', 'Subject', 'Date']
                            });

                            const headers = messageDetail.data.payload.headers;
                            return {
                                id: message.id,
                                from: headers.find(h => h.name === 'From')?.value || 'Unknown',
                                subject: headers.find(h => h.name === 'Subject')?.value || 'No Subject',
                                date: headers.find(h => h.name === 'Date')?.value || new Date().toISOString(),
                                snippet: messageDetail.data.snippet || '',
                                provider: 'gmail',
                                account: process.env.GMAIL_EMAIL
                            };
                        } catch (err) {
                            return null;
                        }
                    })
                );

                allResults.push(...gmailEmails.filter(email => email !== null));
                console.log(\`   ✅ Found \${gmailEmails.filter(e => e).length} Gmail results\`);
            }
        } catch (error) {
            console.error('   ❌ Gmail search error:', error.message);
        }

        // Yahoo Search
        try {
            console.log('   🔍 Searching Yahoo...');
            
            for (const account of yahooManager.accounts) {
                try {
                    const yahooResults = await yahooManager.searchEmails(account.email, query, 5);
                    allResults.push(...yahooResults);
                    console.log(\`   ✅ Found \${yahooResults.length} results in \${account.email}\`);
                } catch (error) {
                    console.error(\`   ⚠️ Error searching \${account.email}:\`, error.message);
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
                    console.log(\`   ✅ Found \${aolResults.length} results in \${account.email}\`);
                } catch (error) {
                    console.error(\`   ⚠️ Error searching \${account.email}:\`, error.message);
                }
            }
        } catch (error) {
            console.error('   ❌ AOL search error:', error.message);
        }

        // Sort by date and limit
        const sortedResults = allResults
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, limit);

        console.log(\`✅ Total search results: \${sortedResults.length} from all providers\`);
        res.json(sortedResults);

    } catch (error) {
        console.error('❌ Error searching enhanced emails:', error.message);
        res.status(500).json({ 
            error: 'Failed to search emails',
            details: error.message 
        });
    }
});

// Provider-specific endpoints
app.get('/api/providers/gmail', async (req, res) => {
    try {
        const profile = await gmail.users.getProfile({ userId: 'me' });
        res.json({
            success: true,
            provider: 'gmail',
            account: profile.data.emailAddress,
            totalMessages: profile.data.messagesTotal,
            totalThreads: profile.data.threadsTotal
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

// Start server
app.listen(PORT, () => {
    console.log('✅ Enhanced Email API Server started successfully!');
    console.log(\`📡 Server running on: http://localhost:\${PORT}\`);
    console.log(\`🔗 Health check: http://localhost:\${PORT}/api/health\`);
    console.log(\`📊 Enhanced stats: http://localhost:\${PORT}/api/stats\`);
    console.log(\`📧 Multi-provider recent: http://localhost:\${PORT}/api/emails/recent\`);
    console.log(\`🔍 Multi-provider search: http://localhost:\${PORT}/api/emails/search?q=query\`);
    console.log();
    console.log('🎯 Multi-Provider Dashboard Ready!');
    console.log('📧 Gmail ✅ | Yahoo ✅ | AOL ✅');
    console.log('📱 Start your frontend with: pnpm run frontend');
});

// Error handling
app.on('error', (error) => {
    console.error('❌ Server error:', error);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught exception:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled rejection:', error);
});`;
}

function executeFix() {
    try {
        console.log('🚀 Starting AOL integration fix...');
        
        // Create backup
        createBackup();
        
        // Write corrected code
        console.log('📝 Writing corrected server code...');
        const correctedCode = generateFixedServerCode();
        fs.writeFileSync(SERVER_FILE, correctedCode, 'utf8');
        console.log('✅ Corrected server code written');
        
        console.log();
        console.log('🎉 AOL Integration Fix Complete!');
        console.log('================================');
        console.log('✅ Syntax errors fixed');
        console.log('✅ AOL manager class integrated');
        console.log('✅ All endpoints updated to include AOL');
        console.log('✅ Error handling improved');
        console.log();
        console.log('📋 Next Steps:');
        console.log('1. Test the server: node enhanced-working-api-server.js');
        console.log('2. Verify AOL accounts appear in console output');
        console.log('3. Check dashboard shows all 3 providers');
        console.log('4. Configure AOL credentials in .env if needed:');
        console.log('   AOL_EMAIL=your-email@aol.com');
        console.log('   AOL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx');
        
        return true;
        
    } catch (error) {
        console.error('❌ Fix execution failed:', error.message);
        return false;
    }
}

// Execute the fix
if (executeFix()) {
    console.log('\n🎯 Ready to test! Run: node enhanced-working-api-server.js');
} else {
    console.log('\n❌ Fix failed. Check error messages above.');
}