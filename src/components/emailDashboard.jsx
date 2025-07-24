// emailDashboard.jsx - Main Email Dashboard UI Component
// Displays email analytics, search, and management interface

import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Search, 
  Filter, 
  BarChart3, 
  Clock, 
  Users, 
  TrendingUp,
  RefreshCw,
  Settings
} from 'lucide-react';

const EmailDashboard = () => {
  const [emails, setEmails] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTimeRange, setSelectedTimeRange] = useState('week');
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadDashboardData();
  }, [selectedTimeRange]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchRecentEmails(),
        fetchInsights(),
        fetchUnreadCount()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentEmails = async () => {
    try {
      const response = await fetch('/api/emails/recent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeRange: selectedTimeRange, maxResults: 20 })
      });
      const data = await response.json();
      setEmails(data.emails || []);
    } catch (error) {
      console.error('Error fetching emails:', error);
    }
  };

  const fetchInsights = async () => {
    try {
      const response = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeRange: selectedTimeRange })
      });
      const data = await response.json();
      setInsights(data);
    } catch (error) {
      console.error('Error fetching insights:', error);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch('/api/emails/unread-count');
      const data = await response.json();
      setUnreadCount(data.count || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/emails/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: searchQuery, 
          timeRange: selectedTimeRange,
          maxResults: 50 
        })
      });
      const data = await response.json();
      setEmails(data.emails || []);
    } catch (error) {
      console.error('Error searching emails:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    return new Date(parseInt(timestamp)).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateText = (text, maxLength = 100) => {
    return text && text.length > maxLength 
      ? text.substring(0, maxLength) + '...' 
      : text;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Email Dashboard</h1>
            <p className="text-gray-600 mt-1">AI-powered email management with Claude MCP</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={loadDashboardData}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <Mail className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Unread Emails</p>
              <p className="text-2xl font-bold text-gray-900">{unreadCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <BarChart3 className="w-8 h-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total This {selectedTimeRange}</p>
              <p className="text-2xl font-bold text-gray-900">
                {insights?.volume?.total || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
              <p className="text-2xl font-bold text-gray-900">
                {insights?.responseTime?.averageResponseTimeHours?.toFixed(1) || 0}h
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Daily Average</p>
              <p className="text-2xl font-bold text-gray-900">
                {insights?.volume?.averagePerDay?.toFixed(0) || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search emails..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
            <option value="all">All Time</option>
          </select>

          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            <Search className="w-4 h-4 mr-2" />
            Search
          </button>
        </div>
      </div>

      {/* Email List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Emails</h2>
            <span className="text-sm text-gray-500">
              {emails.length} emails found
            </span>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {loading ? (
            <div className="p-8 text-center">
              <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-500">Loading emails...</p>
            </div>
          ) : emails.length === 0 ? (
            <div className="p-8 text-center">
              <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No emails found</p>
            </div>
          ) : (
            emails.map((email) => (
              <div key={email.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {email.from}
                      </p>
                      <span className="text-xs text-gray-500">
                        {formatDate(email.timestamp)}
                      </span>
                    </div>
                    
                    <h3 className="text-base font-medium text-gray-900 mb-1">
                      {email.subject}
                    </h3>
                    
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {truncateText(email.snippet)}
                    </p>
                    
                    {email.labels && email.labels.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {email.labels.slice(0, 3).map((label) => (
                          <span
                            key={label}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {label.replace('CATEGORY_', '').toLowerCase()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="ml-4 flex items-center space-x-2">
                    <button className="text-gray-400 hover:text-gray-600">
                      <Mail className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailDashboard;