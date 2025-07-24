// claudeAnalyzer.js - AI Email Analysis Service
// Provides email analysis capabilities using Claude's reasoning

export class EmailAnalyzer {
  constructor() {
    this.sentimentKeywords = {
      positive: ['great', 'excellent', 'wonderful', 'amazing', 'fantastic', 'love', 'perfect', 'outstanding'],
      negative: ['terrible', 'awful', 'horrible', 'hate', 'worst', 'disappointed', 'frustrated', 'angry'],
      urgent: ['urgent', 'asap', 'immediately', 'emergency', 'critical', 'deadline', 'rush']
    };
    
    this.actionKeywords = [
      'please', 'can you', 'could you', 'would you', 'need to', 'should', 'must',
      'action required', 'follow up', 'respond', 'reply', 'review', 'approve',
      'schedule', 'meeting', 'call', 'discuss', 'send', 'provide', 'update'
    ];
  }

  async analyzeEmail(emailContent, analysisType = 'all') {
    const results = {};

    if (analysisType === 'all' || analysisType === 'sentiment') {
      results.sentiment = this.analyzeSentiment(emailContent);
    }

    if (analysisType === 'all' || analysisType === 'priority') {
      results.priority = this.analyzePriority(emailContent);
    }

    if (analysisType === 'all' || analysisType === 'action_items') {
      results.actionItems = this.extractActionItems(emailContent);
    }

    if (analysisType === 'all' || analysisType === 'summary') {
      results.summary = this.generateSummary(emailContent);
    }

    return {
      ...results,
      analyzedAt: new Date().toISOString(),
      contentLength: emailContent.length
    };
  }

  analyzeSentiment(text) {
    const content = text.toLowerCase();
    let positiveScore = 0;
    let negativeScore = 0;
    let urgencyScore = 0;

    // Count positive keywords
    this.sentimentKeywords.positive.forEach(keyword => {
      const matches = (content.match(new RegExp(keyword, 'g')) || []).length;
      positiveScore += matches;
    });

    // Count negative keywords
    this.sentimentKeywords.negative.forEach(keyword => {
      const matches = (content.match(new RegExp(keyword, 'g')) || []).length;
      negativeScore += matches;
    });

    // Count urgency indicators
    this.sentimentKeywords.urgent.forEach(keyword => {
      const matches = (content.match(new RegExp(keyword, 'g')) || []).length;
      urgencyScore += matches;
    });

    // Additional sentiment indicators
    const exclamationMarks = (content.match(/!/g) || []).length;
    const questionMarks = (content.match(/\?/g) || []).length;
    const capsWords = (content.match(/\b[A-Z]{2,}\b/g) || []).length;

    urgencyScore += exclamationMarks * 0.5 + capsWords * 0.3;

    // Determine overall sentiment
    let sentiment = 'neutral';
    let confidence = 0.5;

    if (positiveScore > negativeScore && positiveScore > 0) {
      sentiment = 'positive';
      confidence = Math.min(0.9, 0.5 + (positiveScore * 0.1));
    } else if (negativeScore > positiveScore && negativeScore > 0) {
      sentiment = 'negative';
      confidence = Math.min(0.9, 0.5 + (negativeScore * 0.1));
    }

    return {
      sentiment,
      confidence: parseFloat(confidence.toFixed(2)),
      urgency: urgencyScore > 2 ? 'high' : urgencyScore > 0 ? 'medium' : 'low',
      scores: {
        positive: positiveScore,
        negative: negativeScore,
        urgency: urgencyScore
      }
    };
  }

  analyzePriority(text) {
    const content = text.toLowerCase();
    let priorityScore = 0;

    // Check for explicit priority indicators
    const highPriorityWords = ['urgent', 'asap', 'emergency', 'critical', 'deadline', 'important'];
    const mediumPriorityWords = ['soon', 'when possible', 'follow up', 'reminder'];

    highPriorityWords.forEach(word => {
      if (content.includes(word)) priorityScore += 3;
    });

    mediumPriorityWords.forEach(word => {
      if (content.includes(word)) priorityScore += 1;
    });

    // Check for time-sensitive language
    const timePatterns = [
      /today/gi,
      /tomorrow/gi,
      /this week/gi,
      /by \w+day/gi,
      /due \w+/gi,
      /expires/gi
    ];

    timePatterns.forEach(pattern => {
      if (pattern.test(content)) priorityScore += 2;
    });

    // Check for question marks (often require response)
    const questionMarks = (content.match(/\?/g) || []).length;
    priorityScore += Math.min(questionMarks, 3);

    // Determine priority level
    let priority = 'low';
    if (priorityScore >= 6) {
      priority = 'high';
    } else if (priorityScore >= 3) {
      priority = 'medium';
    }

    return {
      priority,
      score: priorityScore,
      reasoning: this.generatePriorityReasoning(priorityScore, content)
    };
  }

  generatePriorityReasoning(score, content) {
    const reasons = [];
    
    if (content.includes('urgent') || content.includes('asap')) {
      reasons.push('Contains urgent language');
    }
    if (content.includes('deadline') || content.includes('due')) {
      reasons.push('Mentions deadlines');
    }
    if ((content.match(/\?/g) || []).length > 0) {
      reasons.push('Contains questions requiring response');
    }
    if (content.includes('meeting') || content.includes('call')) {
      reasons.push('Involves scheduling or meetings');
    }

    return reasons.length > 0 ? reasons : ['Standard email content'];
  }

  extractActionItems(text) {
    const actionItems = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

    sentences.forEach(sentence => {
      const lower = sentence.toLowerCase().trim();
      
      // Look for action-oriented language
      const hasActionKeyword = this.actionKeywords.some(keyword => 
        lower.includes(keyword)
      );

      if (hasActionKeyword) {
        // Extract potential action item
        let actionText = sentence.trim();
        
        // Clean up the text
        actionText = actionText.replace(/^(please|could you|can you|would you)/i, '').trim();
        
        if (actionText.length > 10 && actionText.length < 200) {
          actionItems.push({
            text: actionText,
            type: this.categorizeAction(lower),
            confidence: this.calculateActionConfidence(lower)
          });
        }
      }
    });

    return actionItems.slice(0, 10); // Limit to top 10 action items
  }

  categorizeAction(text) {
    if (text.includes('meeting') || text.includes('schedule') || text.includes('call')) {
      return 'meeting';
    }
    if (text.includes('review') || text.includes('check') || text.includes('look')) {
      return 'review';
    }
    if (text.includes('send') || text.includes('provide') || text.includes('share')) {
      return 'send';
    }
    if (text.includes('approve') || text.includes('confirm') || text.includes('sign')) {
      return 'approval';
    }
    if (text.includes('update') || text.includes('inform') || text.includes('notify')) {
      return 'update';
    }
    return 'task';
  }

  calculateActionConfidence(text) {
    let confidence = 0.3;
    
    if (text.includes('please')) confidence += 0.2;
    if (text.includes('need to') || text.includes('should')) confidence += 0.3;
    if (text.includes('deadline') || text.includes('by')) confidence += 0.2;
    if (text.includes('?')) confidence += 0.1;
    
    return Math.min(0.95, confidence);
  }

  generateSummary(text) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    if (sentences.length === 0) {
      return {
        summary: 'Empty email content',
        keyPoints: [],
        wordCount: 0
      };
    }

    // Extract key sentences (first, last, and those with important keywords)
    const keyPoints = [];
    const importantWords = [
      'important', 'urgent', 'deadline', 'meeting', 'please', 'thank', 
      'regarding', 'about', 'concern', 'issue', 'question', 'request'
    ];

    sentences.forEach((sentence, index) => {
      const lower = sentence.toLowerCase();
      let importance = 0;

      // First and last sentences are often important
      if (index === 0 || index === sentences.length - 1) {
        importance += 2;
      }

      // Check for important keywords
      importantWords.forEach(word => {
        if (lower.includes(word)) importance += 1;
      });

      if (importance > 0 && sentence.trim().length > 15) {
        keyPoints.push({
          text: sentence.trim(),
          importance
        });
      }
    });

    // Sort by importance and take top 3
    keyPoints.sort((a, b) => b.importance - a.importance);
    const topKeyPoints = keyPoints.slice(0, 3).map(item => item.text);

    // Generate a brief summary
    let summary = '';
    if (topKeyPoints.length > 0) {
      summary = topKeyPoints[0];
      if (summary.length > 150) {
        summary = summary.substring(0, 147) + '...';
      }
    }

    return {
      summary: summary || 'No clear summary available',
      keyPoints: topKeyPoints,
      wordCount: text.split(/\s+/).length,
      sentenceCount: sentences.length
    };
  }

  async generateComposeSuggestions(options) {
    const { context, tone = 'professional', recipient } = options;
    
    const suggestions = {
      subjectLines: this.generateSubjectSuggestions(context, tone),
      openings: this.generateOpenings(tone, recipient),
      closings: this.generateClosings(tone),
      keyPhrases: this.generateKeyPhrases(context, tone)
    };

    return suggestions;
  }

  generateSubjectSuggestions(context, tone) {
    const subjects = [];
    const contextWords = context.toLowerCase().split(' ').slice(0, 5);
    
    // Generate variations based on context
    if (context.includes('meeting')) {
      subjects.push('Meeting Request', 'Schedule Meeting', 'Meeting Follow-up');
    }
    if (context.includes('question')) {
      subjects.push('Question Regarding', 'Quick Question', 'Inquiry About');
    }
    if (context.includes('update')) {
      subjects.push('Project Update', 'Status Update', 'Progress Report');
    }
    
    // Add generic professional subjects
    subjects.push(
      'Following Up',
      'Request for Information', 
      'Discussion Points',
      'Next Steps'
    );

    return subjects.slice(0, 5);
  }

  generateOpenings(tone, recipient) {
    const openings = {
      professional: [
        'I hope this email finds you well.',
        'Thank you for your time.',
        'I wanted to reach out regarding',
        'I hope you are doing well.'
      ],
      casual: [
        'Hope you\'re having a great day!',
        'Thanks for getting back to me.',
        'Just wanted to touch base about',
        'Hope all is well!'
      ],
      formal: [
        'I trust this message finds you in good health.',
        'I am writing to inquire about',
        'Please allow me to introduce',
        'I would like to formally request'
      ]
    };

    return openings[tone] || openings.professional;
  }

  generateClosings(tone) {
    const closings = {
      professional: [
        'Best regards,',
        'Thank you for your consideration.',
        'Looking forward to hearing from you.',
        'Please let me know if you have any questions.'
      ],
      casual: [
        'Thanks!',
        'Let me know what you think.',
        'Talk soon!',
        'Have a great day!'
      ],
      formal: [
        'Respectfully yours,',
        'I await your response.',
        'Thank you for your attention to this matter.',
        'Sincerely,'
      ]
    };

    return closings[tone] || closings.professional;
  }

  generateKeyPhrases(context, tone) {
    const phrases = [];
    
    if (context.includes('meeting')) {
      phrases.push('schedule a meeting', 'discuss this further', 'find a time that works');
    }
    if (context.includes('deadline')) {
      phrases.push('time-sensitive', 'by the deadline', 'as soon as possible');
    }
    if (context.includes('follow up')) {
      phrases.push('following up on', 'checking in about', 'wanted to circle back');
    }

    return phrases;
  }

  async extractTopics(emails) {
    const topicMap = new Map();
    
    emails.forEach(email => {
      const text = `${email.subject} ${email.snippet || ''}`.toLowerCase();
      const words = text.split(/\W+/).filter(word => 
        word.length > 3 && 
        !this.isStopWord(word)
      );
      
      words.forEach(word => {
        topicMap.set(word, (topicMap.get(word) || 0) + 1);
      });
    });

    // Sort by frequency and return top topics
    const topics = Array.from(topicMap.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .map(([topic, count]) => ({ topic, count }));

    return topics;
  }

  isStopWord(word) {
    const stopWords = [
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before',
      'after', 'above', 'below', 'between', 'among', 'this', 'that', 'these',
      'those', 'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves',
      'you', 'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his',
      'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself',
      'they', 'them', 'their', 'theirs', 'themselves', 'what', 'which',
      'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'is', 'are',
      'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having',
      'do', 'does', 'did', 'doing', 'will', 'would', 'could', 'should',
      'may', 'might', 'must', 'can', 'said', 'says', 'get', 'go', 'goes',
      'went', 'got', 'make', 'made', 'take', 'took', 'come', 'came', 'see',
      'saw', 'know', 'knew', 'think', 'thought', 'look', 'looked', 'first',
      'last', 'long', 'great', 'little', 'own', 'other', 'old', 'right',
      'big', 'high', 'different', 'small', 'large', 'next', 'early', 'young',
      'important', 'few', 'public', 'bad', 'same', 'able'
    ];
    
    return stopWords.includes(word.toLowerCase());
  }
}