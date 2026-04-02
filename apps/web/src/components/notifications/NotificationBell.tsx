/**
 * NotificationBell.tsx
 * 通知铃铛组件
 *
 * 功能:
 * - 显示未读通知数量
 * - 点击打开通知列表
 */

import { useState, useEffect } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { notificationsApi } from '../../services/api';
import { cn } from '../../utils';

interface NotificationBellProps {
  onClick?: () => void;
  className?: string;
}

export function NotificationBell({ onClick, className }: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = async () => {
    try {
      const res = await notificationsApi.getUnreadCount();
      if (res.data.success) {
        setUnreadCount(res.data.data?.count ?? 0);
      }
    } catch {
      // silent fail — 通知不影响主功能
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
      className={cn('relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors', className)}
      title="通知"
    >
      {unreadCount > 0 ? (
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
