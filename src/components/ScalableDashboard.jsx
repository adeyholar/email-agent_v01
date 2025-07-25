// File: D:\AI\Gits\email-agent_v01\src\components\ScalableDashboard.jsx
// Scalable Dashboard that efficiently manages space for unlimited providers

import React, { useState, useEffect } from 'react';
import { 
  Mail, Search, BarChart3, Users, Clock, TrendingUp, Globe, RefreshCw, 
  ChevronDown, ChevronUp, Grid, List, Settings, Plus, Minus, Maximize2, Minimize2
} from 'lucide-react';

const ScalableDashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentEmails, setRecentEmails] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Layout state management
  const [viewMode, setViewMode] = useState('grid'); // 'grid', 'list', 'compact'
  const [collapsedProviders, setCollapsedProviders] = useState(new Set());
  const [selectedProviders, setSelectedProviders] = useState(new Set());
  const [showProviderDetails, setShowProviderDetails] = useState(true);
  const [compactMode, setCompactMode] = useState(false);

  // Fetch data functions (same as before)
  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/stats');
      const data = await response.json();
      setStats(data);
      setLastUpdated(new Date());
      
      // Auto-select all providers if none selected
      if (selectedProviders.size === 0 && data.providers) {
        setSelectedProviders(new Set(Object.keys(data.providers)));
      }
    } catch (err) {
      setError('Failed to fetch email statistics');
      console.error('Stats error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentEmails = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/emails/recent?limit=20');
      const data = await response.json();
      setRecentEmails(data);
    } catch (err) {
      console.error('Recent emails error:', err);
    }
  };

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
    
    const interval = setInterval(() => {
      fetchStats();
      fetchRecentEmails();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Layout helper functions
  const toggleProviderCollapse = (provider) => {
    const newCollapsed = new Set(collapsedProviders);
    if (newCollapsed.has(provider)) {
      newCollapsed.delete(provider);
    } else {
      newCollapsed.add(provider);
    }
    setCollapsedProviders(newCollapsed);
  };

  const toggleProviderSelection = (provider) => {
    const newSelected = new Set(selectedProviders);
    if (newSelected.has(provider)) {
      newSelected.delete(provider);
    } else {
      newSelected.add(provider);
    }
    setSelectedProviders(newSelected);
  };

  const getProviderConfig = (name) => {
    const configs = {
      gmail: { icon: '📧', color: 'bg-red-500', bgColor: 'bg-red-50', textColor: 'text-red-700' },
      yahoo: { icon: '📮', color: 'bg-purple-500', bgColor: 'bg-purple-50', textColor: 'text-purple-700' },
      aol: { icon: '📫', color: 'bg-blue-500', bgColor: 'bg-blue-50', textColor: 'text-blue-700' },
      outlook: { icon: '📬', color: 'bg-orange-500', bgColor: 'bg-orange-50', textColor: 'text-orange-700' },
      icloud: { icon: '📭', color: 'bg-gray-500', bgColor: 'bg-gray-50', textColor: 'text-gray-700' }
    };
    return configs[name] || { icon: '📬', color: 'bg-gray-500', bgColor: 'bg-gray-50', textColor: 'text-gray-700' };
  };

  // Compact Provider Card
  const CompactProviderCard = ({ provider, data }) => {
    const config = getProviderConfig(provider);
    
    let totalMessages = 0;
    let totalUnread = 0;
    let accountCount = 0;

    if (provider === 'gmail' && data && !data.error) {
      totalMessages = data.totalMessages || 0;
      totalUnread = data.unreadMessages || 0;
      accountCount = 1;
    } else if (data && data.accounts) {
      data.accounts.forEach(acc => {
        if (!acc.error) {
          totalMessages += acc.totalMessages || 0;
          totalUnread += acc.unreadMessages || 0;
          accountCount++;
        }
      });
    }

    return (
      <div className={`${config.bgColor} border border-gray-200 rounded-lg p-3 hover:shadow-md transition-all cursor-pointer`}
           onClick={() => toggleProviderSelection(provider)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${config.color}`}></div>
            <span className="text-lg">{config.icon}</span>
            <span className="font-medium capitalize text-sm">{provider}</span>
            {selectedProviders.has(provider) && <span className="text-green-500 text-xs">✓</span>}
          </div>
          <div className="text-right">
            <div className="text-sm font-medium">{totalUnread}</div>
            <div className="text-xs text-gray-500">unread</div>
          </div>
        </div>
        
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="font-medium">{totalMessages.toLocaleString()}</span>
            <span className="text-gray-500"> msgs</span>
          </div>
          <div>
            <span className="font-medium">{accountCount}</span>
            <span className="text-gray-500"> acc</span>
          </div>
        </div>
      </div>
    );
  };

  // Detailed Provider Card
  const DetailedProviderCard = ({ provider, data }) => {
    const config = getProviderConfig(provider);
    const isCollapsed = collapsedProviders.has(provider);
    
    if (!data || data.error) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xl">{config.icon}</span>
              <span className="font-medium capitalize">{provider}</span>
            </div>
            <span className="text-red-500 text-sm">Error</span>
          </div>
          {data?.error && (
            <p className="text-xs text-red-400 mt-2">{data.error}</p>
          )}
        </div>
      );
    }

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
      <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${config.color}`}></div>
            <span className="text-xl">{config.icon}</span>
            <h3 className="font-semibold capitalize">{provider}</h3>
            <button 
              onClick={() => toggleProviderSelection(provider)}
              className={`text-xs px-2 py-1 rounded ${selectedProviders.has(provider) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}
            >
              {selectedProviders.has(provider) ? 'Selected' : 'Select'}
            </button>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-green-500 text-sm font-medium">Connected</span>
            <button onClick={() => toggleProviderCollapse(provider)}>
              {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <p className="text-xl font-bold text-gray-900">{totalMessages.toLocaleString()}</p>
            <p className="text-sm text-gray-500">Total Messages</p>
          </div>
          <div>
            <p className="text-xl font-bold text-blue-600">{totalUnread.toLocaleString()}</p>
            <p className="text-sm text-gray-500">Unread</p>
          </div>
        </div>

        {!isCollapsed && (
          <div className="space-y-1">
            <p className="text-sm text-gray-600">{accounts.length} account{accounts.length !== 1 ? 's' : ''}</p>
            {accounts.slice(0, 3).map((acc, idx) => (
              <p key={idx} className="text-xs text-gray-400 truncate">
                {acc.email} ({(acc.totalMessages || 0).toLocaleString()} msgs, {(acc.unreadMessages || 0)} unread)
              </p>
            ))}
            {accounts.length > 3 && (
              <p className="text-xs text-gray-400">+{accounts.length - 3} more accounts</p>
            )}
          </div>
        )}
      </div>
    );
  };

  // Layout Control Panel
  const LayoutControls = () => (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <h3 className="font-medium">Layout Options:</h3>
          
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded text-sm ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
            >
              <Grid className="w-4 h-4 inline mr-1" />Grid
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded text-sm ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
            >
              <List className="w-4 h-4 inline mr-1" />List
            </button>
            <button 
              onClick={() => setViewMode('compact')}
              className={`px-3 py-1 rounded text-sm ${viewMode === 'compact' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
            >
              <Minimize2 className="w-4 h-4 inline mr-1" />Compact
            </button>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setShowProviderDetails(!showProviderDetails)}
            className="flex items-center space-x-1 px-3 py-1 bg-gray-100 rounded text-sm"
          >
            {showProviderDetails ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span>{showProviderDetails ? 'Hide' : 'Show'} Details</span>
          </button>
          
          <button 
            onClick={() => {
              fetchStats();
              fetchRecentEmails();
            }}
            className="flex items-center space-x-1 px-3 py-1 bg-blue-500 text-white rounded text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>
      
      {stats?.providers && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-2">Provider Selection:</p>
          <div className="flex flex-wrap gap-2">
            {Object.keys(stats.providers).map(provider => {
              const config = getProviderConfig(provider);
              return (
                <button
                  key={provider}
                  onClick={() => toggleProviderSelection(provider)}
                  className={`flex items-center space-x-1 px-2 py-1 rounded text-xs ${
                    selectedProviders.has(provider) 
                      ? `${config.color} text-white` 
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <span>{config.icon}</span>
                  <span className="capitalize">{provider}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  // Email Item Component (updated for provider filtering)
  const EmailItem = ({ email }) => {
    if (!selectedProviders.has(email.provider)) return null;
    
    const config = getProviderConfig(email.provider);
    
    return (
      <div className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 text-xs rounded-full ${config.bgColor} ${config.textColor}`}>
              {email.provider?.toUpperCase()}
            </span>
            {email.unread && <span className="w-2 h-2 bg-blue-500 rounded-full"></span>}
          </div>
          <span className="text-xs text-gray-500">
            {new Date(email.date).toLocaleDateString()}
          </span>
        </div>
        
        <h4 className="font-medium text-gray-900 mb-1 text-sm line-clamp-1">
          {email.subject || '(No Subject)'}
        </h4>
        
        <p className="text-xs text-gray-600 mb-1 line-clamp-1">
          From: {email.from || 'Unknown'}
        </p>
        
        {email.snippet && (
          <p className="text-xs text-gray-500 line-clamp-2">
            {email.snippet}
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
          <span>Loading scalable dashboard...</span>
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

  // Filter emails based on selected providers
  const filteredRecentEmails = recentEmails.filter(email => selectedProviders.has(email.provider));
  const filteredSearchResults = searchResults.filter(email => selectedProviders.has(email.provider));

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Scalable Multi-Provider Email Dashboard
          </h1>
          <p className="text-gray-600 text-sm">
            Efficiently manage unlimited email providers • Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>

        {/* Layout Controls */}
        <LayoutControls />

        {/* Overall Stats - Responsive Grid */}
        {stats?.totals && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6">
            <div className="bg-white p-4 md:p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center space-x-2 mb-2">
                <Globe className="w-4 md:w-6 h-4 md:h-6 text-blue-500" />
                <h3 className="font-semibold text-sm md:text-base">Total Messages</h3>
              </div>
              <p className="text-xl md:text-3xl font-bold text-gray-900">{stats.totals.totalMessages.toLocaleString()}</p>
              <p className="text-xs md:text-sm text-gray-500">{stats.totals.accounts} accounts</p>
            </div>

            <div className="bg-white p-4 md:p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center space-x-2 mb-2">
                <Mail className="w-4 md:w-6 h-4 md:h-6 text-red-500" />
                <h3 className="font-semibold text-sm md:text-base">Unread</h3>
              </div>
              <p className="text-xl md:text-3xl font-bold text-red-600">{stats.totals.unreadMessages.toLocaleString()}</p>
              <p className="text-xs md:text-sm text-gray-500">Needs attention</p>
            </div>

            <div className="bg-white p-4 md:p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="w-4 md:w-6 h-4 md:h-6 text-green-500" />
                <h3 className="font-semibold text-sm md:text-base">Providers</h3>
              </div>
              <p className="text-xl md:text-3xl font-bold text-green-600">{Object.keys(stats.providers).length}</p>
              <p className="text-xs md:text-sm text-gray-500">Connected</p>
            </div>

            <div className="bg-white p-4 md:p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="w-4 md:w-6 h-4 md:h-6 text-purple-500" />
                <h3 className="font-semibold text-sm md:text-base">Selected</h3>
              </div>
              <p className="text-xl md:text-3xl font-bold text-purple-600">{selectedProviders.size}</p>
              <p className="text-xs md:text-sm text-gray-500">Active filters</p>
            </div>
          </div>
        )}

        {/* Dynamic Provider Display */}
        {stats?.providers && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg md:text-xl font-semibold">Provider Status</h2>
              <span className="text-sm text-gray-500">{viewMode} view</span>
            </div>
            
            {/* Grid View */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Object.entries(stats.providers).map(([provider, data]) => 
                  showProviderDetails ? (
                    <DetailedProviderCard key={provider} provider={provider} data={data} />
                  ) : (
                    <CompactProviderCard key={provider} provider={provider} data={data} />
                  )
                )}
              </div>
            )}
            
            {/* List View */}
            {viewMode === 'list' && (
              <div className="space-y-4">
                {Object.entries(stats.providers).map(([provider, data]) => (
                  <DetailedProviderCard key={provider} provider={provider} data={data} />
                ))}
              </div>
            )}
            
            {/* Compact View */}
            {viewMode === 'compact' && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                {Object.entries(stats.providers).map(([provider, data]) => (
                  <CompactProviderCard key={provider} provider={provider} data={data} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search and Recent Emails - Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Search Section */}
          <div className="bg-white p-4 md:p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center space-x-3 mb-4">
              <Search className="w-5 md:w-6 h-5 md:h-6 text-gray-400" />
              <h2 className="text-lg md:text-xl font-semibold">Search Selected Providers</h2>
            </div>
            
            <div className="mb-4">
              <input
                type="text"
                placeholder={`Search across ${selectedProviders.size} selected provider(s)...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
                className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm md:text-base"
              />
              <button 
                onClick={() => handleSearch(searchQuery)}
                disabled={selectedProviders.size === 0}
                className="mt-2 w-full md:w-auto px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 text-sm md:text-base"
              >
                Search
              </button>
            </div>

            <div className="space-y-3 max-h-80 md:max-h-96 overflow-y-auto">
              {filteredSearchResults.length > 0 ? (
                filteredSearchResults.map((email, index) => (
                  <EmailItem key={`search-${index}`} email={email} />
                ))
              ) : searchQuery ? (
                <p className="text-gray-500 text-center py-4 text-sm">No results in selected providers</p>
              ) : (
                <p className="text-gray-500 text-center py-4 text-sm">
                  {selectedProviders.size === 0 ? 'Select providers to search' : 'Enter search term'}
                </p>
              )}
            </div>
          </div>

          {/* Recent Emails Section */}
          <div className="bg-white p-4 md:p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center space-x-3 mb-4">
              <Clock className="w-5 md:w-6 h-5 md:h-6 text-gray-400" />
              <h2 className="text-lg md:text-xl font-semibold">Recent Emails</h2>
              <span className="text-sm text-gray-500">({filteredRecentEmails.length})</span>
            </div>
            
            <div className="space-y-3 max-h-80 md:max-h-96 overflow-y-auto">
              {filteredRecentEmails.length > 0 ? (
                filteredRecentEmails.map((email, index) => (
                  <EmailItem key={`recent-${index}`} email={email} />
                ))
              ) : (
                <p className="text-gray-500 text-center py-4 text-sm">
                  {selectedProviders.size === 0 ? 'Select providers to view emails' : 'No recent emails in selected providers'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Provider Management Tips */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">💡 Space Management Tips:</h3>
          <div className="text-sm text-blue-800 space-y-1">
            <p>• Use <strong>Compact View</strong> for 6+ providers to maximize screen space</p>
            <p>• <strong>Select specific providers</strong> to filter emails and focus on what matters</p>
            <p>• <strong>Collapse provider details</strong> using the chevron buttons to save vertical space</p>
            <p>• Switch to <strong>List View</strong> on mobile devices for better readability</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScalableDashboard;