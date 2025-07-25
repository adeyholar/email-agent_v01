// File: D:\AI\Gits\email-agent_v01\src\components\ScalableDashboard.jsx
// Enhanced Scalable Dashboard with Batch Delete functionality
// Manages space efficiently with batch email deletion features

import React, { useState, useEffect } from 'react';
import { 
  Mail, Search, BarChart3, Users, Clock, TrendingUp, Globe, RefreshCw, 
  ChevronDown, ChevronUp, Grid, List, Settings, Plus, Minus, Maximize2, Minimize2,
  Trash2, Check, X, AlertTriangle, Shield, Activity, Filter
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
  const [viewMode, setViewMode] = useState('grid');
  const [collapsedProviders, setCollapsedProviders] = useState(new Set());
  const [selectedProviders, setSelectedProviders] = useState(new Set());
  const [showProviderDetails, setShowProviderDetails] = useState(true);

  // NEW: Batch delete state management
  const [selectedEmails, setSelectedEmails] = useState(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInProgress, setDeleteInProgress] = useState(false);
  const [deletionStats, setDeletionStats] = useState(null);
  const [showDeletionLog, setShowDeletionLog] = useState(false);
  const [deletionLog, setDeletionLog] = useState([]);

  // NEW: Bulk delete criteria state
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleteCriteria, setBulkDeleteCriteria] = useState({
    provider: '',
    account: '',
    sender: '',
    subject: '',
    older_than_days: '',
    unread_only: false,
    limit: 50
  });

  // Fetch data functions
  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/stats');
      const data = await response.json();
      setStats(data);
      setLastUpdated(new Date());
      
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
      const response = await fetch('http://localhost:3001/api/emails/recent?limit=30');
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
      const response = await fetch(`http://localhost:3001/api/emails/search?q=${encodeURIComponent(query)}&limit=50`);
      const data = await response.json();
      setSearchResults(data);
    } catch (err) {
      console.error('Search error:', err);
    }
  };

  // NEW: Fetch deletion statistics
  const fetchDeletionStats = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/emails/deletion/stats');
      const data = await response.json();
      setDeletionStats(data);
    } catch (err) {
      console.error('Deletion stats error:', err);
    }
  };

  // NEW: Fetch deletion log
  const fetchDeletionLog = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/emails/deletion/log?limit=20');
      const data = await response.json();
      setDeletionLog(data.log || []);
    } catch (err) {
      console.error('Deletion log error:', err);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchRecentEmails();
    fetchDeletionStats();
    
    const interval = setInterval(() => {
      fetchStats();
      fetchRecentEmails();
      fetchDeletionStats();
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

  // NEW: Email selection functions
  const toggleEmailSelection = (email) => {
    const emailKey = `${email.provider}-${email.account}-${email.id || email.uid}`;
    const newSelected = new Set(selectedEmails);
    
    if (newSelected.has(emailKey)) {
      newSelected.delete(emailKey);
    } else {
      newSelected.add(emailKey);
    }
    
    setSelectedEmails(newSelected);
  };

  const selectAllVisibleEmails = () => {
    const visibleEmails = [...(searchResults.length > 0 ? searchResults : recentEmails)]
      .filter(email => selectedProviders.has(email.provider));
    
    const newSelected = new Set(selectedEmails);
    visibleEmails.forEach(email => {
      const emailKey = `${email.provider}-${email.account}-${email.id || email.uid}`;
      newSelected.add(emailKey);
    });
    
    setSelectedEmails(newSelected);
  };

  const clearEmailSelection = () => {
    setSelectedEmails(new Set());
    setIsSelectionMode(false);
  };

  // NEW: Batch delete functions
  const handleBatchDelete = async () => {
    if (selectedEmails.size === 0) return;

    setDeleteInProgress(true);
    const emailsToDelete = [...(searchResults.length > 0 ? searchResults : recentEmails)]
      .filter(email => {
        const emailKey = `${email.provider}-${email.account}-${email.id || email.uid}`;
        return selectedEmails.has(emailKey);
      });

    // Group emails by provider and account
    const emailsByProvider = {};
    emailsToDelete.forEach(email => {
      const key = `${email.provider}-${email.account}`;
      if (!emailsByProvider[key]) {
        emailsByProvider[key] = {
          provider: email.provider,
          account: email.account,
          emails: []
        };
      }
      emailsByProvider[key].emails.push(email);
    });

    let totalDeleted = 0;
    let totalFailed = 0;

    // Process each provider/account group
    for (const group of Object.values(emailsByProvider)) {
      try {
        const emailIds = group.emails.filter(e => e.id).map(e => e.id);
        const uids = group.emails.filter(e => e.uid).map(e => e.uid);

        const response = await fetch('http://localhost:3001/api/emails/batch/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: group.provider,
            account: group.account,
            emailIds: emailIds.length > 0 ? emailIds : undefined,
            uids: uids.length > 0 ? uids : undefined
          })
        });
                
                // ✅ Handle deletion response and refresh
                if (response.ok) {
                    const result = await response.json();
                    console.log('🗑️ Deletion result:', result);
                    
                    // Show success message
                    alert(`Successfully deleted ${result.deleted || 0} emails`);
                    
                    // Refresh email list
                    console.log('🔄 Refreshing email list...');
                    await fetchRecentEmails();
                    
                    // Clear selection
                    setSelectedEmails([]);
                    setSelectionMode(false);
                } else {
                    const error = await response.json();
                    console.error('❌ Deletion failed:', error);
                    alert(`Deletion failed: ${error.error || 'Unknown error'}`);
                }

        const result = await response.json();
        
        if (result.success) {
          totalDeleted += result.deletedCount;
          console.log(`✅ Deleted ${result.deletedCount} emails from ${group.provider}`);
        } else {
          totalFailed += group.emails.length;
          console.error(`❌ Failed to delete emails from ${group.provider}:`, result.error);
        }
      } catch (error) {
        totalFailed += group.emails.length;
        console.error(`❌ Error deleting emails from ${group.provider}:`, error);
      }
    }

    // Refresh data and UI
    await fetchStats();
    await fetchRecentEmails();
    await fetchDeletionStats();
    
    if (searchQuery) {
      await handleSearch(searchQuery);
    }

    // Reset state
    setSelectedEmails(new Set());
    setIsSelectionMode(false);
    setShowDeleteConfirm(false);
    setDeleteInProgress(false);

    // Show result
    alert(`Batch deletion completed!\nDeleted: ${totalDeleted} emails\nFailed: ${totalFailed} emails`);
  };

  // NEW: Bulk delete by criteria
  const handleBulkDeleteByCriteria = async () => {
    if (!bulkDeleteCriteria.provider) {
      alert('Please select a provider');
      return;
    }

    setDeleteInProgress(true);

    try {
      const response = await fetch('http://localhost:3001/api/emails/batch/delete-by-criteria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: bulkDeleteCriteria.provider,
          account: bulkDeleteCriteria.account,
          criteria: {
            sender: bulkDeleteCriteria.sender || undefined,
            subject: bulkDeleteCriteria.subject || undefined,
            older_than_days: bulkDeleteCriteria.older_than_days ? parseInt(bulkDeleteCriteria.older_than_days) : undefined,
            unread_only: bulkDeleteCriteria.unread_only,
            limit: parseInt(bulkDeleteCriteria.limit) || 50
          }
        })
      });
                
                // ✅ Handle deletion response and refresh
                if (response.ok) {
                    const result = await response.json();
                    console.log('🗑️ Deletion result:', result);
                    
                    // Show success message
                    alert(`Successfully deleted ${result.deleted || 0} emails`);
                    
                    // Refresh email list
                    console.log('🔄 Refreshing email list...');
                    await fetchRecentEmails();
                    
                    // Clear selection
                    setSelectedEmails([]);
                    setSelectionMode(false);
                } else {
                    const error = await response.json();
                    console.error('❌ Deletion failed:', error);
                    alert(`Deletion failed: ${error.error || 'Unknown error'}`);
                }

      const result = await response.json();

      if (result.success) {
        alert(`Bulk deletion by criteria completed!\nDeleted: ${result.deletedCount} emails`);
        
        // Refresh data
        await fetchStats();
        await fetchRecentEmails();
        await fetchDeletionStats();
        
        if (searchQuery) {
          await handleSearch(searchQuery);
        }
      } else {
        alert(`Bulk deletion failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Bulk delete by criteria error:', error);
      alert(`Bulk deletion failed: ${error.message}`);
    } finally {
      setDeleteInProgress(false);
      setShowBulkDeleteModal(false);
      setBulkDeleteCriteria({
        provider: '',
        account: '',
        sender: '',
        subject: '',
        older_than_days: '',
        unread_only: false,
        limit: 50
      });
    }
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

  // NEW: Batch Action Toolbar
  const BatchActionToolbar = () => {
    if (!isSelectionMode && selectedEmails.size === 0) return null;

    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Check className="w-5 h-5 text-yellow-600" />
              <span className="font-medium">
                {selectedEmails.size} email{selectedEmails.size !== 1 ? 's' : ''} selected
              </span>
            </div>
            
            <button
              onClick={selectAllVisibleEmails}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Select All Visible
            </button>
            
            <button
              onClick={clearEmailSelection}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Clear Selection
            </button>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={selectedEmails.size === 0 || deleteInProgress}
              className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Selected</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // NEW: Delete Confirmation Modal
  const DeleteConfirmationModal = () => {
    if (!showDeleteConfirm) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center space-x-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            <h3 className="text-lg font-semibold">Confirm Email Deletion</h3>
          </div>
          
          <p className="text-gray-600 mb-6">
            Are you sure you want to delete {selectedEmails.size} selected email{selectedEmails.size !== 1 ? 's' : ''}? 
            This action cannot be undone.
          </p>
          
          <div className="flex space-x-3">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deleteInProgress}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleBatchDelete}
              disabled={deleteInProgress}
              className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
            >
              {deleteInProgress ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // NEW: Bulk Delete Modal
  const BulkDeleteModal = () => {
    if (!showBulkDeleteModal) return null;

    const getAccountsForProvider = (provider) => {
      if (!stats?.providers?.[provider]) return [];
      
      if (provider === 'gmail') {
        return [{ email: stats.providers.gmail.emailAddress }];
      } else if (stats.providers[provider].accounts) {
        return stats.providers[provider].accounts.filter(acc => !acc.error);
      }
      return [];
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Bulk Delete by Criteria</h3>
            <button
              onClick={() => setShowBulkDeleteModal(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            {/* Provider Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">Provider *</label>
              <select
                value={bulkDeleteCriteria.provider}
                onChange={(e) => setBulkDeleteCriteria({...bulkDeleteCriteria, provider: e.target.value, account: ''})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Select Provider</option>
                {stats?.providers && Object.keys(stats.providers).map(provider => (
                  <option key={provider} value={provider} className="capitalize">{provider}</option>
                ))}
              </select>
            </div>

            {/* Account Selection */}
            {bulkDeleteCriteria.provider && (
              <div>
                <label className="block text-sm font-medium mb-2">Account</label>
                <select
                  value={bulkDeleteCriteria.account}
                  onChange={(e) => setBulkDeleteCriteria({...bulkDeleteCriteria, account: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">All Accounts</option>
                  {getAccountsForProvider(bulkDeleteCriteria.provider).map(account => (
                    <option key={account.email} value={account.email}>{account.email}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Search Criteria */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">From Sender</label>
                <input
                  type="text"
                  placeholder="example@domain.com"
                  value={bulkDeleteCriteria.sender}
                  onChange={(e) => setBulkDeleteCriteria({...bulkDeleteCriteria, sender: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Subject Contains</label>
                <input
                  type="text"
                  placeholder="spam, promotion, etc."
                  value={bulkDeleteCriteria.subject}
                  onChange={(e) => setBulkDeleteCriteria({...bulkDeleteCriteria, subject: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Older Than (Days)</label>
                <input
                  type="number"
                  placeholder="30"
                  min="1"
                  value={bulkDeleteCriteria.older_than_days}
                  onChange={(e) => setBulkDeleteCriteria({...bulkDeleteCriteria, older_than_days: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Max Emails to Delete</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={bulkDeleteCriteria.limit}
                  onChange={(e) => setBulkDeleteCriteria({...bulkDeleteCriteria, limit: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            {/* Unread Only Checkbox */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="unread-only"
                checked={bulkDeleteCriteria.unread_only}
                onChange={(e) => setBulkDeleteCriteria({...bulkDeleteCriteria, unread_only: e.target.checked})}
                className="rounded"
              />
              <label htmlFor="unread-only" className="text-sm">Only delete unread emails</label>
            </div>

            {/* Warning */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">Warning</p>
                  <p className="text-sm text-red-700">
                    This will permanently delete emails matching your criteria. This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex space-x-3 mt-6">
            <button
              onClick={() => setShowBulkDeleteModal(false)}
              disabled={deleteInProgress}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkDeleteByCriteria}
              disabled={deleteInProgress || !bulkDeleteCriteria.provider}
              className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
            >
              {deleteInProgress ? 'Deleting...' : 'Delete Matching Emails'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // NEW: Deletion Statistics Card
  const DeletionStatsCard = () => {
    if (!deletionStats) return null;

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center space-x-2">
            <Activity className="w-5 h-5 text-red-500" />
            <span>Deletion Statistics</span>
          </h3>
          <button
            onClick={() => {
              fetchDeletionLog();
              setShowDeletionLog(!showDeletionLog);
            }}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            View Log
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium">{deletionStats.totalEmailsDeleted.toLocaleString()}</p>
            <p className="text-gray-500">Emails Deleted</p>
          </div>
          <div>
            <p className="font-medium">{deletionStats.totalDeletions}</p>
            <p className="text-gray-500">Operations</p>
          </div>
          <div>
            <p className="font-medium">{deletionStats.successRate}%</p>
            <p className="text-gray-500">Success Rate</p>
          </div>
          <div>
            <p className="font-medium">
              {Object.keys(deletionStats.deletionsByProvider || {}).length}
            </p>
            <p className="text-gray-500">Providers</p>
          </div>
        </div>

        {/* Deletion Log */}
        {showDeletionLog && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="font-medium mb-2">Recent Deletions</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {deletionLog.map((log, idx) => (
                <div key={idx} className="text-xs p-2 bg-gray-50 rounded">
                  <div className="flex justify-between">
                    <span className="capitalize font-medium">{log.provider}</span>
                    <span className={log.success ? 'text-green-600' : 'text-red-600'}>
                      {log.success ? '✓' : '✗'}
                    </span>
                  </div>
                  <p>Deleted: {log.deletedCount} emails</p>
                  <p className="text-gray-500">{new Date(log.timestamp).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Layout Control Panel (Enhanced with delete options)
  const LayoutControls = () => (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <h3 className="font-medium">Layout & Actions:</h3>
          
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
        
        <div className="flex items-center space-x-2">
          {/* NEW: Delete action buttons */}
          <button
            onClick={() => setIsSelectionMode(!isSelectionMode)}
            className={`flex items-center space-x-1 px-3 py-1 rounded text-sm ${isSelectionMode ? 'bg-yellow-500 text-white' : 'bg-gray-100'}`}
          >
            <Check className="w-4 h-4" />
            <span>Select Mode</span>
          </button>

          <button
            onClick={() => setShowBulkDeleteModal(true)}
            className="flex items-center space-x-1 px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
          >
            <Filter className="w-4 h-4" />
            <span>Bulk Delete</span>
          </button>
          
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
              fetchDeletionStats();
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

  // Enhanced Email Item Component (with selection capability)
  const EmailItem = ({ email }) => {
    if (!selectedProviders.has(email.provider)) return null;
    
    const config = getProviderConfig(email.provider);
    const emailKey = `${email.provider}-${email.account}-${email.id || email.uid}`;
    const isSelected = selectedEmails.has(emailKey);
    
    return (
      <div className={`p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50 border-blue-300' : ''}`}>
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-2">
            {/* NEW: Selection checkbox */}
            {(isSelectionMode || selectedEmails.size > 0) && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleEmailSelection(email)}
                className="rounded"
              />
            )}
            
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
          <span>Loading enhanced dashboard...</span>
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
            Multi-Provider Email Dashboard with Batch Delete
          </h1>
          <p className="text-gray-600 text-sm">
            Manage unlimited email providers with batch deletion • Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>

        {/* Layout Controls */}
        <LayoutControls />

        {/* NEW: Batch Action Toolbar */}
        <BatchActionToolbar />

        {/* Overall Stats - Enhanced with deletion stats */}
        {stats?.totals && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-6 mb-6">
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
                <Check className="w-4 md:w-6 h-4 md:h-6 text-purple-500" />
                <h3 className="font-semibold text-sm md:text-base">Selected</h3>
              </div>
              <p className="text-xl md:text-3xl font-bold text-purple-600">{selectedEmails.size}</p>
              <p className="text-xs md:text-sm text-gray-500">Emails selected</p>
            </div>

            {/* NEW: Deletion stats card */}
            <div className="bg-white p-4 md:p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center space-x-2 mb-2">
                <Trash2 className="w-4 md:w-6 h-4 md:h-6 text-red-500" />
                <h3 className="font-semibold text-sm md:text-base">Deleted</h3>
              </div>
              <p className="text-xl md:text-3xl font-bold text-red-600">
                {deletionStats ? deletionStats.totalEmailsDeleted.toLocaleString() : '0'}
              </p>
              <p className="text-xs md:text-sm text-gray-500">
                {deletionStats ? `${deletionStats.successRate}% success` : 'No deletions yet'}
              </p>
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
                
                {/* NEW: Deletion Stats Card in Grid */}
                {deletionStats && <DeletionStatsCard />}
              </div>
            )}
            
            {/* List View */}
            {viewMode === 'list' && (
              <div className="space-y-4">
                {Object.entries(stats.providers).map(([provider, data]) => (
                  <DetailedProviderCard key={provider} provider={provider} data={data} />
                ))}
                
                {/* NEW: Deletion Stats Card in List */}
                {deletionStats && <DeletionStatsCard />}
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

        {/* Search and Recent Emails - Enhanced with selection */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Search Section */}
          <div className="bg-white p-4 md:p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center space-x-3 mb-4">
              <Search className="w-5 md:w-6 h-5 md:h-6 text-gray-400" />
              <h2 className="text-lg md:text-xl font-semibold">Search & Delete</h2>
              {isSelectionMode && (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                  Selection Mode
                </span>
              )}
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
              <div className="flex space-x-2 mt-2">
                <button 
                  onClick={() => handleSearch(searchQuery)}
                  disabled={selectedProviders.size === 0}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 text-sm"
                >
                  Search
                </button>
                
                {searchResults.length > 0 && (
                  <button
                    onClick={() => {
                      setIsSelectionMode(true);
                      // Auto-select search results for quick deletion
                      const newSelected = new Set(selectedEmails);
                      filteredSearchResults.forEach(email => {
                        const emailKey = `${email.provider}-${email.account}-${email.id || email.uid}`;
                        newSelected.add(emailKey);
                      });
                      setSelectedEmails(newSelected);
                    }}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
                  >
                    Select All Results
                  </button>
                )}
              </div>
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
              {isSelectionMode && (
                <button
                  onClick={() => {
                    const newSelected = new Set(selectedEmails);
                    filteredRecentEmails.forEach(email => {
                      const emailKey = `${email.provider}-${email.account}-${email.id || email.uid}`;
                      newSelected.add(emailKey);
                    });
                    setSelectedEmails(newSelected);
                  }}
                  className="ml-auto px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                >
                  Select All Recent
                </button>
              )}
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

        {/* Enhanced Tips with Delete Functionality */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">💡 Batch Delete Features:</h3>
          <div className="text-sm text-blue-800 space-y-1">
            <p>• <strong>Selection Mode</strong>: Enable to select individual emails for batch deletion</p>
            <p>• <strong>Bulk Delete</strong>: Delete emails by criteria (sender, subject, date, etc.)</p>
            <p>• <strong>Search & Delete</strong>: Search for specific emails and select all results for deletion</p>
            <p>• <strong>Safety Features</strong>: Confirmation dialogs and deletion audit logs for security</p>
            <p>• <strong>Provider Support</strong>: Works with Gmail (API), Yahoo and AOL (IMAP) with provider-specific optimizations</p>
          </div>
        </div>

        {/* NEW: Modals */}
        <DeleteConfirmationModal />
        <BulkDeleteModal />
      </div>
    </div>
  );
};

export default ScalableDashboard;