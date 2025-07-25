// File: D:\AI\Gits\email-agent_v01\src\components\EmailDashboard.jsx
// Fixed Email Dashboard with correct API endpoints

import React, { useState, useEffect } from 'react';
import { Search, Mail, TrendingUp, Clock, BarChart3, Settings, RefreshCw } from 'lucide-react';

// Fixed: Use correct API server port and endpoints
const API_BASE = 'http://localhost:3001/api';

const EmailDashboard = () => {
  const [emails, setEmails] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [timeRange, setTimeRange] = useState('week');
  const [stats, setStats] = useState({
    unreadEmails: 0,
    totalThisWeek: 0,
    avgResponseTime: '0h',
    dailyAverage: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch email statistics
  const fetchStats = async () => {
    try {
      console.log('Fetching stats from:', `${API_BASE}/stats`);
      const response = await fetch(`${API_BASE}/stats`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Stats received:', data);
      
      setStats({
        unreadEmails: data.unreadEmails || 0,
        totalThisWeek: data.totalThisWeek || 0,
        avgResponseTime: data.avgResponseTime || '0h',
        dailyAverage: data.dailyAverage || 0
      });
      
    } catch (error) {
      console.error('Error fetching stats:', error);
      setError(`Failed to fetch statistics: ${error.message}`);
    }
  };

  // Fetch recent emails
  const fetchEmails = async () => {
    try {
      console.log('Fetching emails from:', `${API_BASE}/emails/recent`);
      const response = await fetch(`${API_BASE}/emails/recent?limit=10&timeRange=${timeRange}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Emails received:', data);
      
      setEmails(Array.isArray(data) ? data : []);
      
    } catch (error) {
      console.error('Error fetching emails:', error);
      setError(`Failed to fetch emails: ${error.message}`);
    }
  };

  // Search emails
  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      console.log('Searching emails with query:', query);
      const response = await fetch(`${API_BASE}/emails/search?q=${encodeURIComponent(query)}&limit=20`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Search results:', data);
      
      setSearchResults(Array.isArray(data) ? data : []);
      
    } catch (error) {
      console.error('Error searching emails:', error);
      setError(`Search failed: ${error.message}`);
    }
  };

  // Test API connection
  const testConnection = async () => {
    try {
      console.log('Testing API connection...');
      const response = await fetch(`${API_BASE}/health`);
      
      if (!response.ok) {
        throw new Error(`API server not responding: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('API health check:', data);
      
      if (data.status === 'healthy') {
        setError(null);
        return true;
      } else {
        throw new Error('API server unhealthy');
      }
      
    } catch (error) {
      console.error('API connection test failed:', error);
      setError(`API connection failed: ${error.message}. Make sure API server is running on port 3001.`);
      return false;
    }
  };

  // Refresh all data
  const refreshData = async () => {
    setLoading(true);
    setError(null);
    
    console.log('Refreshing dashboard data...');
    
    // Test connection first
    const connected = await testConnection();
    if (!connected) {
      setLoading(false);
      return;
    }
    
    // Fetch all data
    await Promise.all([
      fetchStats(),
      fetchEmails()
    ]);
    
    setLoading(false);
    console.log('Dashboard refresh complete');
  };

  // Load data on component mount
  useEffect(() => {
    refreshData();
  }, [timeRange]);

  // Handle search input
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch(searchQuery);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Format date for display
  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Truncate email subject/sender
  const truncate = (text, maxLength = 50) => {
    if (!text) return 'N/A';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Email Dashboard</h1>
            <p className="text-gray-600 mt-1">AI-powered email management with Claude MCP</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={refreshData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-red-800 font-medium">Connection Error</span>
            </div>
            <p className="text-red-700 mt-1">{error}</p>
            <p className="text-red-600 text-sm mt-2">
              💡 Make sure to run: <code className="bg-red-100 px-1 rounded">node working-api-server.js</code>
            </p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Unread Emails</p>
                <p className="text-2xl font-bold text-gray-900">{loading ? '...' : stats.unreadEmails}</p>
              </div>
              <Mail className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total This Week</p>
                <p className="text-2xl font-bold text-gray-900">{loading ? '...' : stats.totalThisWeek}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Avg Response Time</p>
                <p className="text-2xl font-bold text-gray-900">{loading ? '...' : stats.avgResponseTime}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Daily Average</p>
                <p className="text-2xl font-bold text-gray-900">{loading ? '...' : stats.dailyAverage}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-8">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search emails..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="all">All Time</option>
            </select>
            <button
              onClick={() => handleSearch(searchQuery)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Search
            </button>
          </div>
        </div>

        {/* Email List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              {searchQuery ? `Search Results (${searchResults.length})` : 'Recent Emails'}
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              {loading ? 'Loading emails...' : `${(searchQuery ? searchResults : emails).length} emails found`}
            </p>
          </div>

          <div className="divide-y divide-gray-200">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
                <p className="text-gray-600 mt-4">Loading emails...</p>
              </div>
            ) : (searchQuery ? searchResults : emails).length > 0 ? (
              (searchQuery ? searchResults : emails).map((email, index) => (
                <div key={email.id || index} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-2 h-2 rounded-full ${email.isUnread ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                        <span className="font-medium text-gray-900">{truncate(email.from)}</span>
                        <span className="text-gray-500 text-sm">{formatDate(email.date)}</span>
                      </div>
                      <h3 className="font-medium text-gray-900 mb-1">{truncate(email.subject, 60)}</h3>
                      <p className="text-gray-600 text-sm">{truncate(email.snippet, 100)}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  {error ? 'Unable to load emails' : searchQuery ? 'No emails found matching your search' : 'No emails found'}
                </p>
                {error && (
                  <button 
                    onClick={refreshData}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Retry Connection
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailDashboard;