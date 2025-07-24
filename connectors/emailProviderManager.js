// emailProviderManager.js - Unified Email Provider Management
// Manages multiple email providers (Gmail, Yahoo, AOL) from a single interface

import { GmailConnector } from './gmailConnector.js';
import { YahooConnector } from './yahooConnector.js';

export class EmailProviderManager {
  constructor() {
    this.providers = new Map();
    this.activeProviders = [];
    this.setupProviders();
  }

  setupProviders() {
    // Initialize available providers
    this.providers.set('gmail', {
      connector: new GmailConnector(),
      name: 'Gmail',
      type: 'google',
      enabled: false
    });

    this.providers.set('yahoo', {
      connector: new YahooConnector('yahoo'),
      name: 'Yahoo Mail',
      type: 'yahoo',
      enabled: false
    });

    this.providers.set('aol', {
      connector: new YahooConnector('aol'),
      name: 'AOL Mail',
      type: 'aol',
      enabled: false
    });
  }

  async initializeProviders() {
    const results = {};
    
    for (const [providerId, provider] of this.providers) {
      try {
        await provider.connector.initialize();
        provider.enabled = true;
        this.activeProviders.push(providerId);
        results[providerId] = { success: true, message: `${provider.name} connected successfully` };
        console.log(`✓ ${provider.name} initialized successfully`);
      } catch (error) {
        provider.enabled = false;
        results[providerId] = { success: false, error: error.message };
        console.log(`✗ ${provider.name} failed to initialize: ${error.message}`);
      }
    }

    return results;
  }

  async searchAllProviders(options = {}) {
    const { query = '', timeRange = 'month', maxResults = 10 } = options;
    const results = {};
    const allEmails = [];

    for (const providerId of this.activeProviders) {
      const provider = this.providers.get(providerId);
      
      try {
        const searchResult = await provider.connector.searchEmails({
          query,
          timeRange,
          maxResults,
          includeBody: false
        });

        results[providerId] = {
          success: true,
          emails: searchResult.emails || [],
          totalFound: searchResult.totalFound || 0
        };

        // Add provider info to each email
        searchResult.emails.forEach(email => {
          email.provider = providerId;
          email.providerName = provider.name;
          allEmails.push(email);
        });

      } catch (error) {
        results[providerId] = {
          success: false,
          error: error.message,
          emails: [],
          totalFound: 0
        };
      }
    }

    // Sort all emails by timestamp (newest first)
    allEmails.sort((a, b) => b.timestamp - a.timestamp);

    return {
      byProvider: results,
      combined: allEmails.slice(0, maxResults),
      totalEmails: allEmails.length,
      activeProviders: this.activeProviders
    };
  }

  async getUnreadCounts() {
    const counts = {};
    let totalUnread = 0;

    for (const providerId of this.activeProviders) {
      const provider = this.providers.get(providerId);
      
      try {
        const count = await provider.connector.getUnreadCount();
        counts[providerId] = {
          count,
          providerName: provider.name
        };
        totalUnread += count;
      } catch (error) {
        counts[providerId] = {
          count: 0,
          error: error.message,
          providerName: provider.name
        };
      }
    }

    return {
      byProvider: counts,
      total: totalUnread
    };
  }

  async getEmailById(providerId, messageId, includeBody = false) {
    const provider = this.providers.get(providerId);
    
    if (!provider || !provider.enabled) {
      throw new Error(`Provider ${providerId} not available`);
    }

    try {
      const email = await provider.connector.getEmailById(messageId, includeBody);
      if (email) {
        email.provider = providerId;
        email.providerName = provider.name;
      }
      return email;
    } catch (error) {
      throw new Error(`Failed to get email from ${provider.name}: ${error.message}`);
    }
  }

  async markAsRead(providerId, messageId) {
    const provider = this.providers.get(providerId);
    
    if (!provider || !provider.enabled) {
      throw new Error(`Provider ${providerId} not available`);
    }

    try {
      return await provider.connector.markAsRead(messageId);
    } catch (error) {
      throw new Error(`Failed to mark email as read in ${provider.name}: ${error.message}`);
    }
  }

  async getProviderInsights(timeRange = 'month') {
    const insights = {};
    let totalEmails = 0;

    for (const providerId of this.activeProviders) {
      const provider = this.providers.get(providerId);
      
      try {
        // Get emails for analysis
        const searchResult = await provider.connector.searchEmails({
          query: '',
          timeRange,
          maxResults: 100,
          includeBody: false
        });

        const emails = searchResult.emails || [];
        const unreadCount = await provider.connector.getUnreadCount();

        insights[providerId] = {
          providerName: provider.name,
          totalEmails: emails.length,
          unreadEmails: unreadCount,
          recentActivity: this.analyzeEmailActivity(emails),
          topSenders: this.getTopSenders(emails, 5)
        };

        totalEmails += emails.length;

      } catch (error) {
        insights[providerId] = {
          providerName: provider.name,
          error: error.message,
          totalEmails: 0,
          unreadEmails: 0
        };
      }
    }

    return {
      byProvider: insights,
      summary: {
        totalEmails,
        activeProviders: this.activeProviders.length,
        timeRange
      }
    };
  }

  analyzeEmailActivity(emails) {
    const activity = {
      byDay: {},
      totalVolume: emails.length,
      averagePerDay: 0
    };

    // Group emails by day
    emails.forEach(email => {
      const date = new Date(email.timestamp);
      const dayKey = date.toISOString().split('T')[0];
      activity.byDay[dayKey] = (activity.byDay[dayKey] || 0) + 1;
    });

    // Calculate average
    const daysWithEmails = Object.keys(activity.byDay).length;
    if (daysWithEmails > 0) {
      activity.averagePerDay = Math.round(activity.totalVolume / daysWithEmails);
    }

    return activity;
  }

  getTopSenders(emails, limit = 5) {
    const senderCounts = {};

    emails.forEach(email => {
      if (email.from) {
        // Extract email address from "Name <email>" format
        const emailMatch = email.from.match(/<(.+?)>/);
        const senderEmail = emailMatch ? emailMatch[1] : email.from;
        senderCounts[senderEmail] = (senderCounts[senderEmail] || 0) + 1;
      }
    });

    return Object.entries(senderCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([sender, count]) => ({ sender, count }));
  }

  // OAuth management
  async getAuthUrls() {
    const urls = {};

    for (const [providerId, provider] of this.providers) {
      try {
        if (provider.connector.getAuthUrl) {
          urls[providerId] = {
            url: provider.connector.getAuthUrl(),
            providerName: provider.name
          };
        }
      } catch (error) {
        urls[providerId] = {
          error: error.message,
          providerName: provider.name
        };
      }
    }

    return urls;
  }

  async handleAuthCallback(providerId, code) {
    const provider = this.providers.get(providerId);
    
    if (!provider) {
      throw new Error(`Unknown provider: ${providerId}`);
    }

    try {
      return await provider.connector.handleAuthCallback(code);
    } catch (error) {
      throw new Error(`Auth callback failed for ${provider.name}: ${error.message}`);
    }
  }

  // Provider status and management
  getProviderStatus() {
    const status = {};

    for (const [providerId, provider] of this.providers) {
      status[providerId] = {
        name: provider.name,
        type: provider.type,
        enabled: provider.enabled,
        active: this.activeProviders.includes(providerId)
      };
    }

    return status;
  }

  async refreshAllConnections() {
    console.log('Refreshing all email provider connections...');
    return await this.initializeProviders();
  }

  async disconnectProvider(providerId) {
    const provider = this.providers.get(providerId);
    
    if (!provider) {
      throw new Error(`Unknown provider: ${providerId}`);
    }

    try {
      if (provider.connector.disconnect) {
        await provider.connector.disconnect();
      }
      
      provider.enabled = false;
      this.activeProviders = this.activeProviders.filter(id => id !== providerId);
      
      return { success: true, message: `Disconnected from ${provider.name}` };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async testConnections() {
    const results = {};

    for (const [providerId, provider] of this.providers) {
      try {
        if (provider.enabled) {
          // Simple test - get unread count
          const unreadCount = await provider.connector.getUnreadCount();
          results[providerId] = {
            success: true,
            message: `Connection OK - ${unreadCount} unread emails`,
            providerName: provider.name
          };
        } else {
          results[providerId] = {
            success: false,
            message: 'Provider not enabled',
            providerName: provider.name
          };
        }
      } catch (error) {
        results[providerId] = {
          success: false,
          error: error.message,
          providerName: provider.name
        };
      }
    }

    return results;
  }

  // Utility methods
  isProviderActive(providerId) {
    return this.activeProviders.includes(providerId);
  }

  getActiveProviders() {
    return this.activeProviders.map(id => ({
      id,
      name: this.providers.get(id).name,
      type: this.providers.get(id).type
    }));
  }

  getAllProviders() {
    return Array.from(this.providers.entries()).map(([id, provider]) => ({
      id,
      name: provider.name,
      type: provider.type,
      enabled: provider.enabled
    }));
  }
}