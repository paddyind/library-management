import Layout from '../src/components/layout/Layout.js';
import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../src/contexts/AuthContext';
import withAuth from '../src/components/withAuth';

function Settings() {
  const [activeTab, setActiveTab] = useState('general');
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const tabs = [
    { id: 'general', name: 'General', icon: '⚙️' },
    { id: 'notifications', name: 'Notifications', icon: '🔔' },
    { id: 'security', name: 'Security', icon: '🔒' },
    { id: 'integrations', name: 'Integrations', icon: '🔌' },
  ];

  // Only show admin tabs if user is admin
  if (isAdmin) {
    tabs.push(
      { id: 'user-management', name: 'User Management', icon: '👥' },
      { id: 'group-management', name: 'Group Management', icon: '🏢' }
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage your library system preferences and configurations.
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors`}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          {activeTab === 'general' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">General Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">Library Name</h4>
                  <p className="text-sm text-gray-600">Configure your library's display name</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">Operating Hours</h4>
                  <p className="text-sm text-gray-600">Set library opening and closing times</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">Loan Duration</h4>
                  <p className="text-sm text-gray-600">Default book borrowing period</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">Fine Policy</h4>
                  <p className="text-sm text-gray-600">Configure late return penalties</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Notification Settings</h3>
              <div className="space-y-3">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">Email Notifications</h4>
                  <p className="text-sm text-gray-600">Configure email alerts for reservations and due dates</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">SMS Notifications</h4>
                  <p className="text-sm text-gray-600">Set up text message reminders</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">Push Notifications</h4>
                  <p className="text-sm text-gray-600">Manage in-app notification preferences</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Security Settings</h3>
              <div className="space-y-3">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">Password Policy</h4>
                  <p className="text-sm text-gray-600">Set password requirements and expiration rules</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">Two-Factor Authentication</h4>
                  <p className="text-sm text-gray-600">Enable additional security layer for admin access</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">Session Management</h4>
                  <p className="text-sm text-gray-600">Configure session timeout and concurrent logins</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Integration Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">Email Service</h4>
                  <p className="text-sm text-gray-600">Connect SMTP server for email delivery</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">Calendar Sync</h4>
                  <p className="text-sm text-gray-600">Integrate with Google Calendar or Outlook</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">Payment Gateway</h4>
                  <p className="text-sm text-gray-600">Setup payment processing for fines</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">API Keys</h4>
                  <p className="text-sm text-gray-600">Manage external API access</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'user-management' && (
            <div>
              <Link href="/admin/users" className="text-primary-600 hover:underline">
                Go to User Management
              </Link>
            </div>
          )}

          {activeTab === 'group-management' && (
            <div>
              <Link href="/admin/groups" className="text-primary-600 hover:underline">
                Go to Group Management
              </Link>
            </div>
          )}
        </div>

        {/* Coming Soon Banner */}
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-primary-100">
            <svg className="h-8 w-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">Settings Module Under Development</h3>
          <p className="mt-2 text-sm text-gray-500">
            This feature is currently being developed. All configuration options shown above will be fully functional soon.
          </p>
          <div className="mt-4 text-xs text-gray-400">
            Expected features: System preferences, User management, Role-based permissions, Backup and restore
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default withAuth(Settings);
