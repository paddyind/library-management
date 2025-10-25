import { useState, useEffect } from 'react';
import api from '@/utils/api';

interface Notification {
  id: string;
  message: string;
  type: 'due_soon' | 'overdue' | 'returned';
  createdAt: string;
  read: boolean;
}

export function NotificationList() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data);
    } catch (err) {
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await api.markNotificationAsRead(id);
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === id ? { ...notif, read: true } : notif
        )
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="space-y-4">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`p-4 rounded-lg shadow-sm border-l-4 ${
            notification.type === 'due_soon'
              ? 'border-yellow-500 bg-yellow-50'
              : notification.type === 'overdue'
              ? 'border-red-500 bg-red-50'
              : 'border-green-500 bg-green-50'
          } ${!notification.read ? 'bg-opacity-100' : 'bg-opacity-50'}`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">
                {notification.message}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(notification.createdAt).toLocaleDateString()}
              </p>
            </div>
            {!notification.read && (
              <button
                onClick={() => markAsRead(notification.id)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Mark as read
              </button>
            )}
          </div>
        </div>
      ))}
      {notifications.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          No notifications
        </div>
      )}
    </div>
  );
}
