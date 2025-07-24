// yahooConnector.js - Yahoo and AOL Mail Integration
// Handles Yahoo Mail and AOL Mail using OAuth 2.0 and IMAP

import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { RateLimiter, EmailCache, sanitizeEmailContent } from './connectorUtils.js';
import fetch from 'node-fetch';

export class YahooConnector {
  constructor(provider = 'yahoo') {
    this.provider = provider; // 'yahoo' or 'aol'
    this.imap = null;
    this.rateLimiter = new RateLimiter(5); // 5 requests per second
    this.cache = new EmailCache(1000, 300000); // 5 minutes TTL
    this.isInitialized = false;
    this.accessToken = null;
    
    // Provider-specific configurations
    this.config = this.getProviderConfig(provider);
  }

  getProviderConfig(provider) {
    const configs = {
      yahoo: {
        imap: {
          host: 'imap.mail.yahoo.com',
          port: 993,
          secure: true
        },
        oauth: {
          clientId: process.env.YAHOO_CLIENT_ID,
          clientSecret: process.env.YAHOO_CLIENT_SECRET,
          redirectUri: 'http://localhost:3000/auth/yahoo/callback',
          authUrl: 'https://api.login.yahoo.com/oauth2/request_auth',
          tokenUrl: 'https://api.login.yahoo.com/oauth2/get_token',
          scope: 'mail-r mail-w'
        }
      },
      aol: {
        imap: {
          host: 'imap.aol.com',
          port: 993,
          secure: true
        },
        oauth: {
          clientId: process.env.AOL_CLIENT_ID,
          clientSecret: process.env.AOL_CLIENT_SECRET,
          redirectUri: 'http://localhost:3000/auth/aol/callback',
          authUrl: 'https://api.login.yahoo.com/oauth2/request_auth',
          tokenUrl: 'https://api.login.yahoo.com/oauth2/get_token',
          scope: 'mail-r mail-w'
        }
      }
    };
    
    return configs[provider] || configs.yahoo;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Get stored refresh token
      const refreshToken = this.provider === 'yahoo' 
        ? process.env.YAHOO_REFRESH_TOKEN 
        : process.env.AOL_REFRESH_TOKEN;

      if (!refreshToken) {
        throw new Error(`${this.provider.toUpperCase()} refresh token not found. Please complete OAuth flow.`);
      }

      // Refresh access token
      await this.refreshAccessToken(refreshToken);
      
      // Connect to IMAP
      await this.connectIMAP();
      
      this.isInitialized = true;
      console.log(`${this.provider.toUpperCase()} connector initialized successfully`);

    } catch (error) {
      console.error(`Failed to initialize ${this.provider} connector:`, error.message);
      throw error;
    }
  }

  async refreshAccessToken(refreshToken) {
    try {
      const response = await fetch(this.config.oauth.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${this.config.oauth.clientId}:${this.config.oauth.clientSecret}`).toString('base64')}`
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        })
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      
      return data;
    } catch (error) {
      console.error(`Failed to refresh ${this.provider} access token:`, error.message);
      throw error;
    }
  }

  async connectIMAP() {
    try {
      this.imap = new ImapFlow({
        host: this.config.imap.host,
        port: this.config.imap.port,
        secure: this.config.imap.secure,
        auth: {
          user: this.provider === 'yahoo' 
            ? process.env.YAHOO_EMAIL 
            : process.env.AOL_EMAIL,
          accessToken: this.accessToken
        },
        logger: false // Set to console for debugging
      });

      await this.imap.connect();
      console.log(`Connected to ${this.provider.toUpperCase()} IMAP`);
      
    } catch (error) {
      console.error(`IMAP connection failed for ${this.provider}:`, error.message);
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
      includeBody = false,
      folder = 'INBOX'
    } = options;

    const cacheKey = `${this.provider}_search_${JSON.stringify(options)}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Select mailbox
      const mailbox = await this.imap.getMailboxLock(folder);

      try {
        // Build search criteria
        const searchCriteria = this.buildSearchCriteria(query, timeRange);
        
        // Search for messages
        const messages = [];
        for await (const message of this.imap.fetch(searchCriteria, {
          envelope: true,
          bodyStructure: true,
          internalDate: true,
          flags: true,
          uid: true,
          source: includeBody
        }, { maxResults })) {
          
          const email = await this.parseMessage(message, includeBody);
          if (email) messages.push(email);
        }

        const result = { 
          emails: messages, 
          totalFound: messages.length,
          provider: this.provider 
        };
        
        this.cache.set(cacheKey, result);
        return result;

      } finally {
        mailbox.release();
      }

    } catch (error) {
      console.error(`${this.provider} search error:`, error.message);
      throw new Error(`${this.provider} search failed: ${error.message}`);
    }
  }

  buildSearchCriteria(query, timeRange) {
    let criteria = { all: true };

    // Add time range
    if (timeRange !== 'all') {
      const timeMap = {
        'today': 1,
        'week': 7,
        'month': 30,
        'year': 365
      };
      
      const daysAgo = timeMap[timeRange];
      if (daysAgo) {
        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - daysAgo);
        criteria.since = sinceDate;
      }
    }

    // Add text search
    if (query && query.trim()) {
      // Simple text search in subject and body
      criteria.or = [
        { subject: query },
        { body: query }
      ];
    }

    return criteria;
  }

  async parseMessage(message, includeBody = false) {
    try {
      const envelope = message.envelope;
      
      const email = {
        id: message.uid.toString(),
        provider: this.provider,
        subject: envelope.subject || '(No Subject)',
        from: this.parseAddress(envelope.from),
        to: this.parseAddress(envelope.to),
        cc: this.parseAddress(envelope.cc),
        date: envelope.date ? envelope.date.toISOString() : new Date().toISOString(),
        timestamp: envelope.date ? envelope.date.getTime() : Date.now(),
        flags: message.flags ? Array.from(message.flags) : [],
        unread: !message.flags?.has('\\Seen')
      };

      if (includeBody && message.source) {
        const parsed = await simpleParser(message.source);
        email.body = sanitizeEmailContent(parsed.text || parsed.html || '');
        email.snippet = email.body.substring(0, 150) + '...';
      }

      return email;
    } catch (error) {
      console.error(`Error parsing ${this.provider} message:`, error.message);
      return null;
    }
  }

  parseAddress(addressList) {
    if (!addressList || !Array.isArray(addressList)) return '';
    
    return addressList.map(addr => {
      if (addr.name) {
        return `${addr.name} <${addr.address}>`;
      }
      return addr.address;
    }).join(', ');
  }

  async getEmailById(messageId, includeBody = false) {
    await this.initialize();
    await this.rateLimiter.throttle();

    const cacheKey = `${this.provider}_email_${messageId}_${includeBody}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const mailbox = await this.imap.getMailboxLock('INBOX');

      try {
        const message = await this.imap.fetchOne(messageId, {
          envelope: true,
          bodyStructure: true,
          internalDate: true,
          flags: true,
          source: includeBody
        });

        const email = await this.parseMessage(message, includeBody);
        this.cache.set(cacheKey, email);
        return email;

      } finally {
        mailbox.release();
      }

    } catch (error) {
      console.error(`Error fetching ${this.provider} email ${messageId}:`, error.message);
      return null;
    }
  }

  async getUnreadCount() {
    await this.initialize();
    await this.rateLimiter.throttle();

    const cacheKey = `${this.provider}_unread_count`;
    const cached = this.cache.get(cacheKey);
    if (cached !== null) {
      return cached;
    }

    try {
      const mailbox = await this.imap.getMailboxLock('INBOX');

      try {
        const status = await this.imap.status('INBOX', { unseen: true });
        const count = status.unseen || 0;
        
        this.cache.set(cacheKey, count);
        return count;

      } finally {
        mailbox.release();
      }

    } catch (error) {
      console.error(`Error getting ${this.provider} unread count:`, error.message);
      return 0;
    }
  }

  async markAsRead(messageId) {
    await this.initialize();
    await this.rateLimiter.throttle();

    try {
      const mailbox = await this.imap.getMailboxLock('INBOX');

      try {
        await this.imap.messageFlagsAdd(messageId, ['\\Seen']);
        this.cache.clear(); // Invalidate cache
        return true;

      } finally {
        mailbox.release();
      }

    } catch (error) {
      console.error(`Error marking ${this.provider} email as read:`, error.message);
      return false;
    }
  }

  async getFolders() {
    await this.initialize();
    await this.rateLimiter.throttle();

    const cacheKey = `${this.provider}_folders`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const folders = [];
      for await (const mailbox of this.imap.list()) {
        folders.push({
          name: mailbox.name,
          path: mailbox.path,
          specialUse: mailbox.specialUse,
          subscribed: mailbox.subscribed
        });
      }

      this.cache.set(cacheKey, folders);
      return folders;

    } catch (error) {
      console.error(`Error getting ${this.provider} folders:`, error.message);
      return [];
    }
  }

  // OAuth flow helpers
  getAuthUrl() {
    const params = new URLSearchParams({
      client_id: this.config.oauth.clientId,
      redirect_uri: this.config.oauth.redirectUri,
      response_type: 'code',
      scope: this.config.oauth.scope
    });

    return `${this.config.oauth.authUrl}?${params.toString()}`;
  }

  async handleAuthCallback(code) {
    try {
      const response = await fetch(this.config.oauth.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${this.config.oauth.clientId}:${this.config.oauth.clientSecret}`).toString('base64')}`
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: this.config.oauth.redirectUri
        })
      });

      if (!response.ok) {
        throw new Error(`OAuth callback failed: ${response.status}`);
      }

      const tokens = await response.json();
      
      // Save refresh token for future use
      if (tokens.refresh_token) {
        console.log(`Save this ${this.provider.toUpperCase()} refresh token to your .env file:`);
        console.log(`${this.provider.toUpperCase()}_REFRESH_TOKEN=${tokens.refresh_token}`);
      }

      return tokens;
    } catch (error) {
      console.error(`Error handling ${this.provider} auth callback:`, error.message);
      throw error;
    }
  }

  async disconnect() {
    if (this.imap) {
      try {
        await this.imap.logout();
        this.imap = null;
        this.isInitialized = false;
        console.log(`Disconnected from ${this.provider.toUpperCase()}`);
      } catch (error) {
        console.error(`Error disconnecting from ${this.provider}:`, error.message);
      }
    }
  }
}