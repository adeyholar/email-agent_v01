// connectorUtils.js - Shared utilities for email connectors

export class RateLimiter {
  constructor(requestsPerSecond = 10) {
    this.interval = 1000 / requestsPerSecond;
    this.lastRequest = 0;
  }

  async throttle() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;
    
    if (timeSinceLastRequest < this.interval) {
      await new Promise(resolve => 
        setTimeout(resolve, this.interval - timeSinceLastRequest)
      );
    }
    
    this.lastRequest = Date.now();
  }
}

export class EmailCache {
  constructor(maxSize = 1000, ttl = 300000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  set(key, data) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clear() {
    this.cache.clear();
  }
}

export function sanitizeEmailContent(content) {
  // Remove potentially dangerous content
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
}

export function formatEmailAddress(email) {
  if (!email) return '';
  return email.toLowerCase().trim();
}

export function parseEmailHeaders(headers) {
  const parsed = {};
  if (Array.isArray(headers)) {
    headers.forEach(header => {
      parsed[header.name] = header.value;
    });
  }
  return parsed;
}
