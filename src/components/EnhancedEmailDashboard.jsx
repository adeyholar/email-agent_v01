// File: D:\AI\Gits\email-agent_v01\src\components\EnhancedEmailDashboard.jsx
// Enhanced Multi-Provider Email Dashboard
// Shows Gmail + Yahoo + AOL statistics in beautiful unified interface

import React, { useState, useEffect } from 'react';
import { Mail, Search, BarChart3, Users, Clock, TrendingUp, Globe, RefreshCw } from 'lucide-react';

const EnhancedEmailDashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentEmails, setRecentEmails] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Fetch statistics from enhanced API
  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/stats');
      const data = await response.json();
      setStats(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError('Failed to fetch email statistics');
      console.error('Stats error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch recent emails from all providers
  const fetchRecentEmails = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/emails/recent?limit=20');
      const data = await response.json();
      setRecentEmails(data);
    } catch (err) {
      console.error('Recent emails error:', err);
    }
  };

  // Search across all providers
  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(`http://localhost:3001/api/emails/search?q=${encodeURIComponent(query)}&limit=30`);
      const data = await response.json();
      setSearchResults(data);
    } catch (err) {
      console.error('Search error:', err);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchRecentEmails();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(() => {
      fetchStats();
      fetchRecentEmails();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Provider status component
  const ProviderStatus = ({ provider, data }) => {
    const getProviderIcon = (name) => {
      switch (name) {
        case 'gmail': return '📧';
        case 'yahoo': return '📮';
        case 'aol': return '📫';
        default: return '📬';
      }
    };

    const getProviderColor = (name) => {
      switch (name) {
        case 'gmail': return 'bg-red-500';
        case 'yahoo': return 'bg-purple-500';
        case 'aol': return 'bg-blue-500';
        default: return 'bg-gray-500';
      }
    };

    if (!data || data.error) {
      return (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">{getProviderIcon(provider)}</span>
              <span className="font-medium capitalize">{provider}</span>
            </div>
            <span className="text-red-500 text-sm">Error</span>
          </div>
        </div>
      );
    }

    // Handle different provider data structures
    let accounts = [];
    let totalMessages = 0;
    let totalUnread = 0;

    if (provider === 'gmail') {
      accounts = [{ email: data.emailAddress, totalMessages: data.totalMessages, unreadMessages: data.unreadMessages }];
      totalMessages = data.totalMessages;
      totalUnread = data.unreadMessages;
    } else {
      accounts = data.accounts || [];
      accounts.forEach(acc => {
        if (!acc.error) {
          totalMessages += acc.totalMessages || 0;
          totalUnread += acc.unreadMessages || 0;
        }
      });
    }

    return (
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${getProviderColor(provider)}`}></div>
            <span className="text-2xl">{getProviderIcon(provider)}</span>
            <h3 className="font-semibold text-lg capitalize">{provider}</h3>
          </div>
          <span className="text-green-500 text-sm font-medium">Connected</span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-2xl font-bold text-gray-900">{totalMessages.toLocaleString()}</p>
            <p className="text-sm text-gray-500">Total Messages</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600">{totalUnread.toLocaleString()}</p>
            <p className="text-sm text-gray-500">Unread</p>
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-sm text-gray-600">{accounts.length} account{accounts.length !== 1 ? 's' : ''}</p>
          {accounts.slice(0, 2).map((acc, idx) => (
            <p key={idx} className="text-xs text-gray-400 truncate">
              {acc.email} ({(acc.totalMessages || 0).toLocaleString()} msgs)
            </p>
          ))}
          {accounts.length > 2 && (
            <p className="text-xs text-gray-400">+{accounts.length - 2} more accounts</p>
          )}
        </div>
      </div>
    );
  };

  // Email item component
  const EmailItem = ({ email }) => {
    const getProviderBadge = (provider) => {
      const colors = {
        gmail: 'bg-red-100 text-red-800',
        yahoo: 'bg-purple-100 text-purple-800',
        aol: 'bg-blue-100 text-blue-800'
      };
      return (
        <span className={`px-2 py-1 text-xs rounded-full ${colors[provider] || 'bg-gray-100 text-gray-800'}`}>
          {provider?.toUpperCase() || 'EMAIL'}
        </span>
      );
    };

    const formatDate = (dateStr) => {
      try {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        if (diffHours < 1) return 'Just now';
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
      } catch {
        return 'Unknown';
      }
    };

    return (
      <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-2">
            {getProviderBadge(email.provider)}
            {email.unread && <span className="w-2 h-2 bg-blue-500 rounded-full"></span>}
          </div>
          <span className="text-xs text-gray-500">{formatDate(email.date)}</span>
        </div>
        
        <h4 className="font-medium text-gray-900 mb-1 line-clamp-1">
          {email.subject || '(No Subject)'}
        </h4>
        
        <p className="text-sm text-gray-600 mb-2 line-clamp-1">
          From: {email.from || 'Unknown'}
        </p>
        
        {email.snippet && (
          <p className="text-xs text-gray-500 line-clamp-2">
            {email.snippet}
          </p>
        )}
        
        {email.account && (
          <p className="text-xs text-gray-400 mt-2 truncate">
            Account: {email.account}
          </p>
        )}
      </div>
    );
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span>Loading multi-provider dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={fetchStats} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Multi-Provider Email Dashboard
              </h1>
              <p className="text-gray-600">
                Unified view across Gmail, Yahoo, and AOL accounts
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => { fetchStats(); fetchRecentEmails(); }}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </button>
              <p className="text-sm text-gray-500">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>

        {/* Overall Stats */}
        {stats?.totals && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center space-x-3 mb-2">
                <Globe className="w-6 h-6 text-blue-500" />
                <h3 className="font-semibold">Total Messages</h3>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.totals.totalMessages.toLocaleString()}</p>
              <p className="text-sm text-gray-500">Across {stats.totals.accounts} accounts</p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center space-x-3 mb-2">
                <Mail className="w-6 h-6 text-red-500" />
                <h3 className="font-semibold">Unread</h3>
              </div>
              <p className="text-3xl font-bold text-red-600">{stats.totals.unreadMessages.toLocaleString()}</p>
              <p className="text-sm text-gray-500">Needs attention</p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center space-x-3 mb-2">
                <Users className="w-6 h-6 text-green-500" />
                <h3 className="font-semibold">Active Accounts</h3>
              </div>
              <p className="text-3xl font-bold text-green-600">{stats.totals.accounts}</p>
              <p className="text-sm text-gray-500">Connected providers</p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center space-x-3 mb-2">
                <TrendingUp className="w-6 h-6 text-purple-500" />
                <h3 className="font-semibold">This Week</h3>
              </div>
              <p className="text-3xl font-bold text-purple-600">{stats.totalThisWeek || 0}</p>
              <p className="text-sm text-gray-500">New messages</p>
            </div>
          </div>
        )}

        {/* Provider Status */}
        {stats?.providers && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Provider Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Object.entries(stats.providers).map(([provider, data]) => (
                <ProviderStatus key={provider} provider={provider} data={data} />
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Search */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center space-x-3 mb-4">
              <Search className="w-6 h-6 text-gray-400" />
              <h2 className="text-xl font-semibold">Search All Providers</h2>
            </div>
            
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search across Gmail, Yahoo, and AOL..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button 
                onClick={() => handleSearch(searchQuery)}
                className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Search
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {searchResults.length > 0 ? (
                searchResults.map((email, index) => (
                  <EmailItem key={`search-${index}`} email={email} />
                ))
              ) : searchQuery ? (
                <p className="text-gray-500 text-center py-4">No results found</p>
              ) : (
                <p className="text-gray-500 text-center py-4">Enter a search term to find emails</p>
              )}
            </div>
          </div>

          {/* Recent Emails */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center space-x-3 mb-4">
              <Clock className="w-6 h-6 text-gray-400" />
              <h2 className="text-xl font-semibold">Recent Emails</h2>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {recentEmails.length > 0 ? (
                recentEmails.map((email, index) => (
                  <EmailItem key={`recent-${index}`} email={email} />
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No recent emails found</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedEmailDashboard;