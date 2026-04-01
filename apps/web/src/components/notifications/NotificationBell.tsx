/**
 * NotificationBell.tsx
 * 通知铃铛组件
 *
 * 功能:
 * - 显示未读通知数量
 * - 点击打开通知列表
 */

import { useState, useEffect } from 'react';
import { Bell, BellOff, Check, CheckCheck, Loader2 } from 'lucide-react';
import { analyticsApi } from '../../services/api';
import { cn } from '../../utils';

interface NotificationBellProps {
  onClick?: () => void;
  className?: string;
}

export function NotificationBell({ onClick, className }: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchUnreadCount = async () => {
    setLoading(true);
    try {
      const res = await analyticsApi.getStorageBreakdown();
      if (res.data.success) {
        // TODO: 实际调用通知 API
        // const notifRes = await notificationsApi.getUnreadCount();
        // setUnreadCount(notifRes.data.data.count);
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors',
        className
      )}
      title="通知"
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      ) : unreadCount > 0 ? (
        <>
          <Bell className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        </>
      ) : (
        <BellOff className="h-5 w-5 text-gray-400" />
      )}
    </button>
  );
}
