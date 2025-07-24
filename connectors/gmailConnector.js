// gmailConnector.js - Gmail API Integration Module
// Handles all Gmail API operations with rate limiting and caching

import { google } from 'googleapis';
import { RateLimiter, EmailCache, sanitizeEmailContent } from './connectorUtils.js';
import fs from 'fs/promises';
import path from 'path';

export class GmailConnector {
  constructor() {
    this.gmail = null;
    this.auth = null;
    this.rateLimiter = new RateLimiter(10); // 10 requests per second
    this.cache = new EmailCache(1000, 300000); // 5 minutes TTL
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Load credentials from environment or config
      const credentials = {
        client_id: process.env.GMAIL_CLIENT_ID,
        client_secret: process.env.GMAIL_CLIENT_SECRET,
        refresh_token: process.env.GMAIL_REFRESH_TOKEN
      };

      if (!credentials.client_id || !credentials.client_secret) {
        throw new Error('Gmail credentials not found in environment variables');
      }

      // Setup OAuth2 client
      this.auth = new google.auth.OAuth2(
        credentials.client_id,
        credentials.client_secret,
        'http://localhost:3000/auth/callback'
      );

      if (credentials.refresh_token) {
        this.auth.setCredentials({
          refresh_token: credentials.refresh_token
        });
      }

      // Initialize Gmail API
      this.gmail = google.gmail({ version: 'v1', auth: this.auth });
      this.isInitialized = true;

      console.log('Gmail connector initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Gmail connector:', error.message);
      throw error;
    }
  }

  async searchEmails(options = {}) {
    await this.initialize();
    await this.rateLimiter.throttle();

    const {
      query = '',
      timeRange = 'month',
      maxResults = 10,
      includeBody = false
    } = options;

    // Build Gmail search query
    let gmailQuery = query;
    
    // Add time range filter
    if (timeRange !== 'all') {
      const timeMap = {
        'today': '1d',
        'week': '7d', 
        'month': '30d',
        'year': '365d'
      };
      gmailQuery += ` newer_than:${timeMap[timeRange]}`;
    }

    const cacheKey = `search_${JSON.stringify(options)}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Search for message IDs
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: gmailQuery,
        maxResults: maxResults
      });

      const messages = response.data.messages || [];
      const emails = [];

      // Fetch details for each message
      for (const message of messages) {
        const email = await this.getEmailById(message.id, includeBody);
        if (email) emails.push(email);
      }

      const result = { emails, totalFound: response.data.resultSizeEstimate || 0 };
      this.cache.set(cacheKey, result);
      
      return result;
    } catch (error) {
      console.error('Gmail search error:', error.message);
      throw new Error(`Gmail search failed: ${error.message}`);
    }
  }

  async getEmailById(messageId, includeBody = false) {
    await this.initialize();
    await this.rateLimiter.throttle();

    const cacheKey = `email_${messageId}_${includeBody}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: includeBody ? 'full' : 'metadata'
      });

      const message = response.data;
      const email = this.parseGmailMessage(message, includeBody);
      
      this.cache.set(cacheKey, email);
      return email;
    } catch (error) {
      console.error(`Error fetching email ${messageId}:`, error.message);
      return null;
    }
  }

  parseGmailMessage(message, includeBody = false) {
    const headers = {};
    if (message.payload && message.payload.headers) {
      message.payload.headers.forEach(header => {
        headers[header.name.toLowerCase()] = header.value;
      });
    }

    const email = {
      id: message.id,
      threadId: message.threadId,
      subject: headers.subject || '(No Subject)',
      from: headers.from || '',
      to: headers.to || '',
      cc: headers.cc || '',
      date: headers.date || '',
      timestamp: parseInt(message.internalDate) || Date.now(),
      labels: message.labelIds || [],
      snippet: message.snippet || ''
    };

    if (includeBody) {
      email.body = this.extractMessageBody(message.payload);
    }

    return email;
  }

  extractMessageBody(payload) {
    let body = '';

    if (payload.body && payload.body.data) {
      // Single part message
      body = this.decodeBase64Url(payload.body.data);
    } else if (payload.parts) {
      // Multi-part message
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body && part.body.data) {
          body += this.decodeBase64Url(part.body.data);
        } else if (part.mimeType === 'text/html' && part.body && part.body.data) {
          // Prefer plain text, but use HTML if no plain text
          if (!body) {
            body = this.decodeBase64Url(part.body.data);
          }
        }
      }
    }

    return sanitizeEmailContent(body);
  }

  decodeBase64Url(data) {
    try {
      // Gmail uses base64url encoding
      const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
      const padding = base64.length % 4;
      const paddedBase64 = base64 + '='.repeat(padding > 0 ? 4 - padding : 0);
      return Buffer.from(paddedBase64, 'base64').toString('utf-8');
    } catch (error) {
      console.error('Error decoding base64 data:', error.message);
      return '';
    }
  }

  async getEmailsInTimeRange(timeRange) {
    const searchResult = await this.searchEmails({
      query: '',
      timeRange,
      maxResults: 100,
      includeBody: false
    });

    return searchResult.emails;
  }

  async sendEmail(emailData) {
    await this.initialize();
    await this.rateLimiter.throttle();

    const { to, subject, body, cc, bcc } = emailData;

    const email = [
      'Content-Type: text/html; charset="UTF-8"',
      'MIME-Version: 1.0',
      `To: ${to}`,
      cc ? `Cc: ${cc}` : '',
      bcc ? `Bcc: ${bcc}` : '',
      `Subject: ${subject}`,
      '',
      body
    ].filter(line => line !== '').join('\n');

    const encodedEmail = Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    try {
      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedEmail
        }
      });

      return {
        success: true,
        messageId: response.data.id,
        threadId: response.data.threadId
      };
    } catch (error) {
      console.error('Error sending email:', error.message);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  async getUnreadCount() {
    await this.initialize();
    await this.rateLimiter.throttle();

    const cacheKey = 'unread_count';
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: 'is:unread',
        maxResults: 1
      });

      const count = response.data.resultSizeEstimate || 0;
      this.cache.set(cacheKey, count);
      return count;
    } catch (error) {
      console.error('Error getting unread count:', error.message);
      return 0;
    }
  }

  async markAsRead(messageId) {
    await this.initialize();
    await this.rateLimiter.throttle();

    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: ['UNREAD']
        }
      });

      // Invalidate cache for this message
      this.cache.clear();
      return true;
    } catch (error) {
      console.error('Error marking email as read:', error.message);
      return false;
    }
  }

  async getLabels() {
    await this.initialize();
    await this.rateLimiter.throttle();

    const cacheKey = 'gmail_labels';
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await this.gmail.users.labels.list({
        userId: 'me'
      });

      const labels = response.data.labels || [];
      this.cache.set(cacheKey, labels);
      return labels;
    } catch (error) {
      console.error('Error fetching labels:', error.message);
      return [];
    }
  }

  // OAuth flow helpers
  getAuthUrl() {
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.compose',
      'https://www.googleapis.com/auth/gmail.modify'
    ];

    return this.auth.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
  }

  async handleAuthCallback(code) {
    try {
      const { tokens } = await this.auth.getToken(code);
      this.auth.setCredentials(tokens);
      
      // Save refresh token for future use
      if (tokens.refresh_token) {
        console.log('Save this refresh token to your .env file:');
        console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
      }

      return tokens;
    } catch (error) {
      console.error('Error handling auth callback:', error.message);
      throw error;
    }
  }
}