// apiServer.js - Express API Server for Frontend Communication
// Provides REST API endpoints for the React frontend

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GmailConnector } from '../connectors/gmailConnector.js';
import { EmailAnalyzer } from './services/emailAnalyzer.js';

dotenv.config();

class EmailAgentAPI {
  constructor() {
    this.app = express();
    this.port = process.env.API_PORT || 3001;
    this.gmailConnector = new GmailConnector();
    this.emailAnalyzer = new EmailAnalyzer();
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddleware() {
    // CORS configuration
    this.app.use(cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });
  }

  setupRoutes() {
    // Email routes
    this.setupEmailRoutes();
    
    // Analysis routes
    this.setupAnalysisRoutes();
    
    // Insights routes
    this.setupInsightsRoutes();
    
    // Auth routes
    this.setupAuthRoutes();
  }

  setupEmailRoutes() {
    const router = express.Router();

    // Get recent emails
    router.post('/recent', async (req, res) => {
      try {
        const { timeRange = 'week', maxResults = 20 } = req.body;
        
        const result = await this.gmailConnector.searchEmails({
          query: '',
          timeRange,
          maxResults,
          includeBody: false
        });

        res.json({
          success: true,
          emails: result.emails,
          totalFound: result.totalFound
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Search emails
    router.post('/search', async (req, res) => {
      try {
        const { query, timeRange = 'month', maxResults = 50 } = req.body;
        
        if (!query || query.trim() === '') {
          return res.status(400).json({
            success: false,
            error: 'Search query is required'
          });
        }

        const result = await this.gmailConnector.searchEmails({
          query: query.trim(),
          timeRange,
          maxResults,
          includeBody: false
        });

        res.json({
          success: true,
          emails: result.emails,
          totalFound: result.totalFound,
          query
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Get specific email
    router.get('/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const { includeBody = true } = req.query;
        
        const email = await this.gmailConnector.getEmailById(id, includeBody === 'true');
        
        if (!email) {
          return res.status(404).json({
            success: false,
            error: 'Email not found'
          });
        }

        res.json({
          success: true,
          email
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Get unread count
    router.get('/unread-count', async (req, res) => {
      try {
        const count = await this.gmailConnector.getUnreadCount();
        
        res.json({
          success: true,
          count
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
          count: 0
        });
      }
    });

    // Send email
    router.post('/send', async (req, res) => {
      try {
        const { to, subject, body, cc, bcc } = req.body;
        
        if (!to || !subject || !body) {
          return res.status(400).json({
            success: false,
            error: 'To, subject, and body are required'
          });
        }

        const result = await this.gmailConnector.sendEmail({
          to, subject, body, cc, bcc
        });

        res.json({
          success: true,
          ...result
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    this.app.use('/api/emails', router);
  }

  setupAnalysisRoutes() {
    const router = express.Router();

    // Analyze email content
    router.post('/analyze', async (req, res) => {
      try {
        const { emailContent, analysisType = 'all' } = req.body;
        
        if (!emailContent) {
          return res.status(400).json({
            success: false,
            error: 'Email content is required'
          });
        }

        const analysis = await this.emailAnalyzer.analyzeEmail(emailContent, analysisType);
        
        res.json({
          success: true,
          analysis
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Get compose suggestions
    router.post('/compose-assist', async (req, res) => {
      try {
        const { context, tone = 'professional', recipient } = req.body;
        
        if (!context) {
          return res.status(400).json({
            success: false,
            error: 'Context is required'
          });
        }

        const suggestions = await this.emailAnalyzer.generateComposeSuggestions({
          context, tone, recipient
        });
        
        res.json({
          success: true,
          suggestions
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    this.app.use('/api/analysis', router);
  }

  setupInsightsRoutes() {
    const router = express.Router();

    // Get email insights
    router.post('/', async (req, res) => {
      try {
        const { timeRange = 'week' } = req.body;
        
        // Get emails for the time range
        const emails = await this.gmailConnector.getEmailsInTimeRange(timeRange);
        
        // Generate insights
        const insights = {
          volume: this.calculateVolumeInsights(emails),
          responseTime: this.calculateResponseTimeInsights(emails),
          senders: this.calculateSenderInsights(emails),
          topics: await this.emailAnalyzer.extractTopics(emails)
        };
        
        res.json({
          success: true,
          insights,
          timeRange,
          emailCount: emails.length
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    this.app.use('/api/insights', router);
  }

  setupAuthRoutes() {
    const router = express.Router();

    // Get Gmail auth URL
    router.get('/gmail/url', (req, res) => {
      try {
        const authUrl = this.gmailConnector.getAuthUrl();
        res.json({
          success: true,
          authUrl
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Handle Gmail auth callback
    router.post('/gmail/callback', async (req, res) => {
      try {
        const { code } = req.body;
        
        if (!code) {
          return res.status(400).json({
            success: false,
            error: 'Authorization code is required'
          });
        }

        const tokens = await this.gmailConnector.handleAuthCallback(code);
        
        res.json({
          success: true,
          message: 'Authentication successful',
          hasRefreshToken: !!tokens.refresh_token
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    this.app.use('/api/auth', router);
  }

  calculateVolumeInsights(emails) {
    const totalEmails = emails.length;
    const sentEmails = emails.filter(email => 
      email.labels && email.labels.includes('SENT')
    ).length;
    const receivedEmails = totalEmails - sentEmails;
    
    return {
      total: totalEmails,
      sent: sentEmails,
      received: receivedEmails,
      averagePerDay: totalEmails / 7 // Assuming week timeframe
    };
  }

  calculateResponseTimeInsights(emails) {
    // Simple approximation for response time analysis
    const responses = emails.filter(email => 
      email.subject && email.subject.toLowerCase().includes('re:')
    );
    
    return {
      averageResponseTimeHours: 4.5, // Placeholder
      totalResponses: responses.length
    };
  }

  calculateSenderInsights(emails) {
    const senderCounts = {};
    
    emails.forEach(email => {
      if (email.from) {
        const sender = email.from.split('<')[0].trim();
        senderCounts[sender] = (senderCounts[sender] || 0) + 1;
      }
    });
    
    const topSenders = Object.entries(senderCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([sender, count]) => ({ sender, count }));
    
    return { topSenders };
  }

  setupErrorHandling() {
    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found'
      });
    });

    // Global error handler
    this.app.use((error, req, res, next) => {
      console.error('API Error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    });
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`Email Agent API server running on port ${this.port}`);
      console.log(`Health check: http://localhost:${this.port}/health`);
    });
  }
}

// Start the server
const api = new EmailAgentAPI();
api.start();