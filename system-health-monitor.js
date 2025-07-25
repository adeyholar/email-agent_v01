// File: D:\AI\Gits\email-agent_v01\system-health-monitor.js
// System Health & Performance Monitor for Multi-Provider Email System

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { google } from 'googleapis';
import { YahooEmailManager } from './yahoo-api-integration.js';

dotenv.config();

const app = express();
const PORT = process.env.MONITOR_PORT || 3003;

app.use(cors());
app.use(express.json());

// Initialize managers
const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'http://localhost:8080/auth/gmail/callback'
);
oauth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

const yahooManager = new YahooEmailManager();

// System health monitoring
class SystemHealthMonitor {
    constructor() {
        this.metrics = {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            providers: {},
            lastCheck: new Date(),
            errors: []
        };
        
        // Start monitoring
        setInterval(() => this.updateMetrics(), 30000); // Every 30 seconds
    }

    async updateMetrics() {
        const startTime = Date.now();
        
        this.metrics.uptime = process.uptime();
        this.metrics.memory = process.memoryUsage();
        this.metrics.lastCheck = new Date();

        // Test Gmail connectivity
        try {
            const profile = await gmail.users.getProfile({ userId: 'me' });
            this.metrics.providers.gmail = {
                status: 'healthy',
                responseTime: Date.now() - startTime,
                lastSuccess: new Date(),
                account: profile.data.emailAddress,
                messages: profile.data.messagesTotal
            };
        } catch (error) {
            this.metrics.providers.gmail = {
                status: 'error',
                error: error.message,
                lastError: new Date()
            };
            this.logError('Gmail', error);
        }

        // Test Yahoo connectivity
        try {
            const yahooStart = Date.now();
            const yahooStats = await yahooManager.getAllAccountsStats();
            this.metrics.providers.yahoo = {
                status: 'healthy',
                responseTime: Date.now() - yahooStart,
                lastSuccess: new Date(),
                accounts: yahooStats.length,
                totalMessages: yahooStats.reduce((sum, acc) => sum + (acc.totalMessages || 0), 0)
            };
        } catch (error) {
            this.metrics.providers.yahoo = {
                status: 'error',
                error: error.message,
                lastError: new Date()
            };
            this.logError('Yahoo', error);
        }

        // Calculate overall health score
        this.metrics.healthScore = this.calculateHealthScore();
    }

    calculateHealthScore() {
        const providers = Object.values(this.metrics.providers);
        const healthyProviders = providers.filter(p => p.status === 'healthy').length;
        const totalProviders = providers.length;
        
        if (totalProviders === 0) return 0;
        
        const providerScore = (healthyProviders / totalProviders) * 100;
        const memoryScore = this.metrics.memory.heapUsed < 500 * 1024 * 1024 ? 100 : 50; // 500MB threshold
        const uptimeScore = this.metrics.uptime > 3600 ? 100 : this.metrics.uptime / 36; // 1 hour = 100%
        
        return Math.round((providerScore + memoryScore + uptimeScore) / 3);
    }

    logError(provider, error) {
        this.metrics.errors.push({
            provider,
            error: error.message,
            timestamp: new Date(),
            stack: error.stack
        });
        
        // Keep only last 50 errors
        if (this.metrics.errors.length > 50) {
            this.metrics.errors = this.metrics.errors.slice(-50);
        }
    }

    getMetrics() {
        return {
            ...this.metrics,
            memory: {
                ...this.metrics.memory,
                heapUsedMB: Math.round(this.metrics.memory.heapUsed / 1024 / 1024),
                heapTotalMB: Math.round(this.metrics.memory.heapTotal / 1024 / 1024),
                rssMB: Math.round(this.metrics.memory.rss / 1024 / 1024)
            },
            uptimeFormatted: this.formatUptime(this.metrics.uptime)
        };
    }

    formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (days > 0) return `${days}d ${hours}h ${minutes}m`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    }
}

// Initialize monitor
const monitor = new SystemHealthMonitor();

// Health dashboard endpoint
app.get('/health', (req, res) => {
    const metrics = monitor.getMetrics();
    res.json({
        status: metrics.healthScore >= 70 ? 'healthy' : 'degraded',
        score: metrics.healthScore,
        timestamp: new Date(),
        ...metrics
    });
});

// Detailed metrics endpoint
app.get('/metrics', (req, res) => {
    res.json(monitor.getMetrics());
});

// Provider-specific health
app.get('/health/:provider', (req, res) => {
    const provider = req.params.provider;
    const metrics = monitor.getMetrics();
    
    if (!metrics.providers[provider]) {
        return res.status(404).json({ error: 'Provider not found' });
    }
    
    res.json({
        provider,
        ...metrics.providers[provider],
        timestamp: new Date()
    });
});

// Performance test endpoint
app.post('/test/:provider', async (req, res) => {
    const provider = req.params.provider;
    const startTime = Date.now();
    
    try {
        let result;
        
        switch (provider) {
            case 'gmail':
                const profile = await gmail.users.getProfile({ userId: 'me' });
                result = {
                    success: true,
                    responseTime: Date.now() - startTime,
                    account: profile.data.emailAddress,
                    messages: profile.data.messagesTotal
                };
                break;
                
            case 'yahoo':
                const yahooStats = await yahooManager.getAllAccountsStats();
                result = {
                    success: true,
                    responseTime: Date.now() - startTime,
                    accounts: yahooStats.length,
                    totalMessages: yahooStats.reduce((sum, acc) => sum + (acc.totalMessages || 0), 0)
                };
                break;
                
            default:
                return res.status(400).json({ error: 'Unknown provider' });
        }
        
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            responseTime: Date.now() - startTime
        });
    }
});

// System alerts endpoint
app.get('/alerts', (req, res) => {
    const metrics = monitor.getMetrics();
    const alerts = [];
    
    // Health score alerts
    if (metrics.healthScore < 50) {
        alerts.push({
            level: 'critical',
            message: `System health score is low: ${metrics.healthScore}%`,
            timestamp: new Date()
        });
    } else if (metrics.healthScore < 80) {
        alerts.push({
            level: 'warning',
            message: `System health score is degraded: ${metrics.healthScore}%`,
            timestamp: new Date()
        });
    }
    
    // Memory alerts
    if (metrics.memory.heapUsedMB > 500) {
        alerts.push({
            level: 'warning',
            message: `High memory usage: ${metrics.memory.heapUsedMB}MB`,
            timestamp: new Date()
        });
    }
    
    // Provider alerts
    Object.entries(metrics.providers).forEach(([name, provider]) => {
        if (provider.status === 'error') {
            alerts.push({
                level: 'critical',
                message: `${name} provider is down: ${provider.error}`,
                timestamp: provider.lastError
            });
        } else if (provider.responseTime > 5000) {
            alerts.push({
                level: 'warning',
                message: `${name} provider is slow: ${provider.responseTime}ms`,
                timestamp: new Date()
            });
        }
    });
    
    res.json({
        alerts,
        count: alerts.length,
        timestamp: new Date()
    });
});

// Simple HTML dashboard
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Email System Health Monitor</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <script src="https://cdn.tailwindcss.com"></script>
            <script>
                async function refreshData() {
                    try {
                        const response = await fetch('/health');
                        const data = await response.json();
                        
                        document.getElementById('health-score').textContent = data.score + '%';
                        document.getElementById('status').textContent = data.status.toUpperCase();
                        document.getElementById('status').className = 
                            'px-3 py-1 rounded-full text-sm font-medium ' + 
                            (data.status === 'healthy' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800');
                        
                        document.getElementById('uptime').textContent = data.uptimeFormatted;
                        document.getElementById('memory').textContent = data.memory.heapUsedMB + 'MB';
                        document.getElementById('last-check').textContent = new Date(data.lastCheck).toLocaleTimeString();
                        
                        // Update providers
                        const providersDiv = document.getElementById('providers');
                        providersDiv.innerHTML = '';
                        
                        Object.entries(data.providers).forEach(([name, provider]) => {
                            const statusColor = provider.status === 'healthy' ? 'text-green-600' : 'text-red-600';
                            providersDiv.innerHTML += \`
                                <div class="bg-gray-50 p-4 rounded-lg">
                                    <div class="flex justify-between items-center mb-2">
                                        <h3 class="font-medium capitalize">\${name}</h3>
                                        <span class="\${statusColor} text-sm font-medium">\${provider.status}</span>
                                    </div>
                                    <p class="text-sm text-gray-600">
                                        Response: \${provider.responseTime || 'N/A'}ms
                                    </p>
                                    \${provider.error ? \`<p class="text-xs text-red-500 mt-1">\${provider.error}</p>\` : ''}
                                </div>
                            \`;
                        });
                        
                    } catch (error) {
                        console.error('Failed to refresh data:', error);
                    }
                }
                
                // Auto-refresh every 10 seconds
                setInterval(refreshData, 10000);
                
                // Initial load
                document.addEventListener('DOMContentLoaded', refreshData);
            </script>
        </head>
        <body class="bg-gray-100 p-6">
            <div class="max-w-4xl mx-auto">
                <div class="bg-white rounded-lg shadow p-6 mb-6">
                    <h1 class="text-2xl font-bold mb-4">Email System Health Monitor</h1>
                    
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div class="text-center">
                            <div class="text-3xl font-bold text-blue-600" id="health-score">--</div>
                            <div class="text-sm text-gray-500">Health Score</div>
                        </div>
                        <div class="text-center">
                            <div id="status" class="px-3 py-1 rounded-full text-sm font-medium bg-gray-100">--</div>
                            <div class="text-sm text-gray-500 mt-1">Status</div>
                        </div>
                        <div class="text-center">
                            <div class="text-lg font-medium" id="uptime">--</div>
                            <div class="text-sm text-gray-500">Uptime</div>
                        </div>
                        <div class="text-center">
                            <div class="text-lg font-medium" id="memory">--</div>
                            <div class="text-sm text-gray-500">Memory Usage</div>
                        </div>
                    </div>
                    
                    <div class="text-center text-sm text-gray-500">
                        Last Check: <span id="last-check">--</span>
                    </div>
                </div>
                
                <div class="bg-white rounded-lg shadow p-6">
                    <h2 class="text-xl font-semibold mb-4">Provider Status</h2>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4" id="providers">
                        <!-- Providers will be populated by JavaScript -->
                    </div>
                </div>
                
                <div class="mt-6 text-center">
                    <div class="space-x-4">
                        <a href="/health" class="text-blue-600 hover:underline">JSON Health</a>
                        <a href="/metrics" class="text-blue-600 hover:underline">Full Metrics</a>
                        <a href="/alerts" class="text-blue-600 hover:underline">System Alerts</a>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `);
});

// Start monitor server
app.listen(PORT, () => {
    console.log('🔍 System Health Monitor started!');
    console.log(`📊 Monitor dashboard: http://localhost:${PORT}`);
    console.log(`🔗 Health endpoint: http://localhost:${PORT}/health`);
    console.log(`📈 Metrics endpoint: http://localhost:${PORT}/metrics`);
    console.log(`🚨 Alerts endpoint: http://localhost:${PORT}/alerts`);
});

// Initial metrics update
monitor.updateMetrics();

export { SystemHealthMonitor };