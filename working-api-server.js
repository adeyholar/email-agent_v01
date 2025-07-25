// File: D:\AI\Gits\email-agent_v01\working-api-server.js
// Simple Working API Server for Email Dashboard

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { google } from 'googleapis';

dotenv.config();

const app = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
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

console.log('🚀 Email API Server Starting...');
console.log('=================================');

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        gmail_configured: !!process.env.GMAIL_REFRESH_TOKEN
    });
});

// Get email statistics
app.get('/api/stats', async (req, res) => {
    try {
        console.log('📊 Fetching email statistics...');
        
        // Get profile info
        const profile = await gmail.users.getProfile({ userId: 'me' });
        
        // Get unread count
        const unreadMessages = await gmail.users.messages.list({
            userId: 'me',
            q: 'is:unread in:inbox',
            maxResults: 1
        });

        // Get this week's messages
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const weekQuery = `after:${oneWeekAgo.getFullYear()}/${(oneWeekAgo.getMonth() + 1).toString().padStart(2, '0')}/${oneWeekAgo.getDate().toString().padStart(2, '0')}`;
        
        const thisWeekMessages = await gmail.users.messages.list({
            userId: 'me',
            q: weekQuery,
            maxResults: 1
        });

        const stats = {
            unreadEmails: unreadMessages.data.resultSizeEstimate || 0,
            totalThisWeek: thisWeekMessages.data.resultSizeEstimate || 0,
            avgResponseTime: '2h', // Placeholder
            dailyAverage: Math.round((thisWeekMessages.data.resultSizeEstimate || 0) / 7),
            totalMessages: profile.data.messagesTotal,
            totalThreads: profile.data.threadsTotal,
            emailAddress: profile.data.emailAddress
        };

        console.log('✅ Statistics generated:', stats);
        res.json(stats);

    } catch (error) {
        console.error('❌ Error fetching stats:', error.message);
        res.status(500).json({ 
            error: 'Failed to fetch email statistics',
            details: error.message 
        });
    }
});

// Get recent emails
app.get('/api/emails/recent', async (req, res) => {
    try {
        console.log('📧 Fetching recent emails...');
        
        const limit = req.query.limit || 10;
        const timeRange = req.query.timeRange || 'week';
        
        let query = 'in:inbox';
        
        // Add time filter
        if (timeRange !== 'all') {
            const daysAgo = timeRange === 'today' ? 1 : timeRange === 'week' ? 7 : 30;
            const date = new Date();
            date.setDate(date.getDate() - daysAgo);
            query += ` after:${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
        }

        // Get message list
        const messagesList = await gmail.users.messages.list({
            userId: 'me',
            q: query,
            maxResults: parseInt(limit)
        });

        if (!messagesList.data.messages) {
            return res.json([]);
        }

        // Get detailed info for each message
        const emails = await Promise.all(
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
                        date: date,
                        isUnread: messageDetail.data.labelIds?.includes('UNREAD') || false,
                        snippet: messageDetail.data.snippet || ''
                    };
                } catch (err) {
                    console.warn('⚠️ Error fetching message:', message.id, err.message);
                    return null;
                }
            })
        );

        const validEmails = emails.filter(email => email !== null);
        console.log(`✅ Fetched ${validEmails.length} recent emails`);
        
        res.json(validEmails);

    } catch (error) {
        console.error('❌ Error fetching recent emails:', error.message);
        res.status(500).json({ 
            error: 'Failed to fetch recent emails',
            details: error.message 
        });
    }
});

// Search emails
app.get('/api/emails/search', async (req, res) => {
    try {
        const query = req.query.q || '';
        const limit = req.query.limit || 20;
        
        console.log(`🔍 Searching emails with query: "${query}"`);

        if (!query.trim()) {
            return res.json([]);
        }

        const searchResults = await gmail.users.messages.list({
            userId: 'me',
            q: query,
            maxResults: parseInt(limit)
        });

        if (!searchResults.data.messages) {
            return res.json([]);
        }

        // Get details for search results
        const emails = await Promise.all(
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
                        snippet: messageDetail.data.snippet || ''
                    };
                } catch (err) {
                    return null;
                }
            })
        );

        const validEmails = emails.filter(email => email !== null);
        console.log(`✅ Found ${validEmails.length} emails matching search`);
        
        res.json(validEmails);

    } catch (error) {
        console.error('❌ Error searching emails:', error.message);
        res.status(500).json({ 
            error: 'Failed to search emails',
            details: error.message 
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log('✅ Email API Server started successfully!');
    console.log(`📡 Server running on: http://localhost:${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
    console.log(`📊 Stats endpoint: http://localhost:${PORT}/api/stats`);
    console.log(`📧 Recent emails: http://localhost:${PORT}/api/emails/recent`);
    console.log();
    console.log('🎯 Ready to serve your Email Dashboard!');
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
});