// ============================================
// 🔌 useSocket Hook - Socket.io Connection Manager
// ============================================
import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  severity?: string;
  read: boolean;
}

interface UseSocketOptions {
  userEmail?: string;
  userRole?: string;
  enabled?: boolean;
}

/**
 * Custom hook quản lý Socket.io connection
 * Auto-connect khi enabled, auto-disconnect khi unmount
 * Cung cấp notifications array và unread count
 */
export function useSocket({ userEmail, userRole, enabled = true }: UseSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Kết nối Socket
  useEffect(() => {
    if (!enabled) return;

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('🔌 Socket connected:', socket.id);

      // Đăng ký user info để server biết ai là Admin
      if (userEmail && userRole) {
        socket.emit('register', { email: userEmail, role: userRole });
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('🔌 Socket disconnected');
    });

    // Nhận notification từ server (cho Admin)
    socket.on('admin_notification', (data: any) => {
      const notification: Notification = {
        id: Date.now(),
        type: data.type || 'info',
        title: data.title || 'Thông báo',
        message: data.message || '',
        timestamp: data.timestamp || new Date().toISOString(),
        severity: data.severity,
        read: false,
      };
      setNotifications(prev => [notification, ...prev].slice(0, 50)); // Giữ tối đa 50 notifications
    });

    // Backward compatibility với security_alert event cũ
    socket.on('security_alert', (msg: string) => {
      const notification: Notification = {
        id: Date.now(),
        type: 'security_alert',
        title: '🔔 Thông báo hệ thống',
        message: msg,
        timestamp: new Date().toISOString(),
        read: false,
      };
      setNotifications(prev => [notification, ...prev].slice(0, 50));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled, userEmail, userRole]);

  // Đánh dấu notification đã đọc
  const markAsRead = useCallback((notifId: number) => {
    setNotifications(prev =>
      prev.map(n => n.id === notifId ? { ...n, read: true } : n)
    );
  }, []);

  // Đánh dấu tất cả đã đọc
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  // Xóa tất cả notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    socket: socketRef.current,
    isConnected,
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
  };
}

export default useSocket;
