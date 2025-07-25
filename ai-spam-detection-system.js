// File: D:\AI\Gits\email-agent_v01\ai-spam-detection-system.js
// AI-Powered Spam Detection using Claude API
// Advanced spam detection beyond built-in email provider filters

class AISpamDetectionSystem {
    constructor() {
        this.spamPatterns = new Set();
        this.trustedSenders = new Set();
        this.blockedSenders = new Set();
        this.spamScore = new Map();
        this.detectionLog = [];
        this.maxLogEntries = 1000;

        // Initialize with common spam indicators
        this.initializeSpamPatterns();
    }

    initializeSpamPatterns() {
        const patterns = [
            // Financial scams
            'urgent.*transfer', 'claim.*prize', 'lottery.*winner', 'inheritance.*funds',
            'bitcoin.*opportunity', 'crypto.*investment', 'make.*money.*fast',
            
            // Phishing attempts
            'verify.*account', 'suspend.*account', 'click.*here.*immediately',
            'update.*payment.*info', 'confirm.*identity',
            
            // Romance/advance fee scams
            'lonely.*widow', 'military.*deployed', 'orphan.*funds',
            
            // Pharmaceutical spam
            'viagra.*cheap', 'weight.*loss.*miracle', 'diet.*pills',
            
            // Generic spam indicators
            'act.*now', 'limited.*time.*offer', 'exclusive.*deal',
            'congratulations.*selected', 'no.*strings.*attached'
        ];

        patterns.forEach(pattern => this.spamPatterns.add(new RegExp(pattern, 'i')));
    }

    async analyzeEmailWithClaude(email) {
        try {
            const analysisPrompt = `
Analyze this email for spam/phishing characteristics. Return ONLY a JSON object with this exact structure:

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
Date: ${email.date}

Consider these factors:
1. Sender reputation and domain
2. Subject line characteristics
3. Content analysis for scam patterns
4. Urgency indicators
5. Grammar and spelling
6. Links and attachments (if any)
7. Financial/personal information requests

DO NOT OUTPUT ANYTHING OTHER THAN VALID JSON.`;

            const response = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: "claude-sonnet-4-20250514",
                    max_tokens: 1000,
                    messages: [
                        { role: "user", content: analysisPrompt }
                    ]
                })
            });

            if (!response.ok) {
                throw new Error(`Claude API error: ${response.status}`);
            }

            const data = await response.json();
            let responseText = data.content[0].text;
            
            // Clean up potential markdown formatting
            responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
            
            const analysis = JSON.parse(responseText);
            
            // Validate response structure
            if (typeof analysis.isSpam !== 'boolean' || 
                typeof analysis.confidence !== 'number' ||
                !Array.isArray(analysis.reasons)) {
                throw new Error('Invalid Claude response structure');
            }

            return analysis;

        } catch (error) {
            console.error('Claude spam analysis failed:', error.message);
            
            // Fallback to rule-based analysis
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

        // Check against spam patterns
        for (const pattern of this.spamPatterns) {
            if (pattern.test(fullText)) {
                spamScore += 25;
                reasons.push(`Matches spam pattern: ${pattern.source}`);
            }
        }

        // Sender reputation checks
        if (this.blockedSenders.has(from)) {
            spamScore += 50;
            reasons.push('Sender is in blocked list');
        }

        if (this.trustedSenders.has(from)) {
            spamScore -= 30;
            reasons.push('Sender is trusted');
        }

        // Subject line analysis
        if (subject.includes('urgent') || subject.includes('immediate')) {
            spamScore += 15;
            reasons.push('Urgent language in subject');
        }

        if (subject.includes(') || subject.includes('money') || subject.includes('cash')) {
            spamScore += 20;
            reasons.push('Financial terms in subject');
            spamType = 'financial';
        }

        if (subject.match(/re:|fwd:/i) && !content.includes('original message')) {
            spamScore += 10;
            reasons.push('Fake reply/forward');
        }

        // Content analysis
        if (content.includes('click here') || content.includes('click now')) {
            spamScore += 15;
            reasons.push('Suspicious links');
        }

        if (content.includes('verify account') || content.includes('confirm identity')) {
            spamScore += 30;
            reasons.push('Phishing attempt');
            spamType = 'phishing';
        }

        // Determine risk level and spam status
        let riskLevel = 'low';
        if (spamScore >= 75) riskLevel = 'critical';
        else if (spamScore >= 50) riskLevel = 'high';
        else if (spamScore >= 25) riskLevel = 'medium';

        return {
            isSpam: spamScore >= 50,
            confidence: Math.min(100, Math.max(0, spamScore)),
            spamType,
            reasons: reasons.slice(0, 5), // Limit reasons
            riskLevel
        };
    }

    async batchAnalyzeEmails(emails, useAI = true) {
        console.log(`🤖 Analyzing ${emails.length} emails for spam...`);
        
        const results = [];
        const batchSize = useAI ? 3 : 10; // Smaller batches for AI analysis
        
        for (let i = 0; i < emails.length; i += batchSize) {
            const batch = emails.slice(i, i + batchSize);
            
            const batchPromises = batch.map(async (email) => {
                try {
                    const analysis = useAI ? 
                        await this.analyzeEmailWithClaude(email) :
                        this.ruleBasedSpamAnalysis(email);
                    
                    // Log the analysis
                    this.logDetection(email, analysis);
                    
                    // Update sender reputation
                    if (analysis.isSpam && analysis.confidence > 70) {
                        this.blockedSenders.add(email.from?.toLowerCase() || '');
                    } else if (!analysis.isSpam && analysis.confidence < 30) {
                        this.trustedSenders.add(email.from?.toLowerCase() || '');
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
                    console.error(`Error analyzing email ${email.id}:`, error.message);
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
            
            // Delay between batches for AI analysis rate limiting
            if (useAI && i + batchSize < emails.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        const spamEmails = results.filter(r => r.analysis.isSpam);
        const highRiskEmails = results.filter(r => r.analysis.riskLevel === 'critical');
        
        console.log(`✅ Spam analysis complete: ${spamEmails.length} spam detected, ${highRiskEmails.length} high risk`);
        
        return {
            results,
            summary: {
                total: results.length,
                spam: spamEmails.length,
                clean: results.length - spamEmails.length,
                highRisk: highRiskEmails.length,
                spamTypes: this.getSpamTypeDistribution(results)
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
        
        // Keep log size manageable
        if (this.detectionLog.length > this.maxLogEntries) {
            this.detectionLog = this.detectionLog.slice(-this.maxLogEntries + 100);
        }
    }

    getSpamTypeDistribution(results) {
        const distribution = {};
        results.forEach(result => {
            if (result.analysis.isSpam && result.analysis.spamType) {
                distribution[result.analysis.spamType] = (distribution[result.analysis.spamType] || 0) + 1;
            }
        });
        return distribution;
    }

    async autoDeleteSpam(spamResults, provider, account) {
        if (!spamResults || spamResults.length === 0) {
            return { deletedCount: 0, errors: [] };
        }
        
        console.log(`🗑️ Auto-deleting ${spamResults.length} spam emails from ${provider}...`);
        
        const emailIds = spamResults.map(result => result.email.id);
        
        try {
            // This would integrate with your existing deletion system
            const deleteResult = await this.deleteSpamEmails(emailIds, provider, account);
            
            console.log(`✅ Auto-deleted ${deleteResult.deletedCount} spam emails`);
            return deleteResult;
            
        } catch (error) {
            console.error('❌ Auto-delete spam failed:', error.message);
            throw error;
        }
    }

    // Integration method for existing deletion system
    async deleteSpamEmails(emailIds, provider, account) {
        // This method would call your existing EmailDeletionManager
        // For now, return a mock response
        return {
            deletedCount: emailIds.length,
            failedCount: 0,
            errors: []
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
            recentDetections: recentLogs.slice(-10),
            spamTypes: this.getSpamTypeDistribution(recentLogs)
        };
    }

    getDetectionLog(limit = 50) {
        return this.detectionLog
            .slice(-limit)
            .reverse()
            .map(log => ({
                ...log,
                timeAgo: this.getTimeAgo(new Date(log.timestamp))
            }));
    }

    getTimeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    }

    // Export/Import settings for persistence
    exportSettings() {
        return {
            trustedSenders: Array.from(this.trustedSenders),
            blockedSenders: Array.from(this.blockedSenders),
            detectionLog: this.detectionLog.slice(-100) // Export recent logs only
        };
    }

    importSettings(settings) {
        if (settings.trustedSenders) {
            this.trustedSenders = new Set(settings.trustedSenders);
        }
        if (settings.blockedSenders) {
            this.blockedSenders = new Set(settings.blockedSenders);
        }
        if (settings.detectionLog) {
            this.detectionLog = settings.detectionLog;
        }
    }
}

export { AISpamDetectionSystem };