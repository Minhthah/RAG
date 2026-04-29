import React, { useState, useRef, useEffect } from 'react';
import { Bell, X, Shield, Upload, MessageCircle, AlertTriangle } from 'lucide-react';
import type { Notification } from '../hooks/useSocket';

interface AdminNotificationProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead: (id: number) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  isDarkMode: boolean;
  lang: 'vi' | 'en';
}

const AdminNotification: React.FC<AdminNotificationProps> = ({
  notifications, unreadCount, onMarkAsRead, onMarkAllAsRead, onClearAll, isDarkMode, lang
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'malware_detected': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'upload_complete': return <Upload className="w-4 h-4 text-emerald-500" />;
      case 'user_message': return <MessageCircle className="w-4 h-4 text-blue-500" />;
      default: return <Shield className="w-4 h-4 text-amber-500" />;
    }
  };

  const getBgColor = (type: string, read: boolean) => {
    if (read) return isDarkMode ? 'bg-slate-800' : 'bg-white';
    switch (type) {
      case 'malware_detected': return isDarkMode ? 'bg-red-900/20' : 'bg-red-50';
      case 'upload_complete': return isDarkMode ? 'bg-emerald-900/20' : 'bg-emerald-50';
      default: return isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50';
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button onClick={() => setIsOpen(!isOpen)} className={`relative p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}>
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className={`absolute right-0 top-12 w-80 max-h-96 rounded-xl shadow-2xl overflow-hidden z-50 border ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
          {/* Header */}
          <div className={`px-4 py-3 flex items-center justify-between border-b ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
            <h4 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
              {lang === 'vi' ? 'Thông báo' : 'Notifications'} {unreadCount > 0 && `(${unreadCount})`}
            </h4>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <button onClick={onMarkAllAsRead} className="text-[10px] text-blue-500 font-semibold hover:underline">
                  {lang === 'vi' ? 'Đọc hết' : 'Read all'}
                </button>
              )}
              {notifications.length > 0 && (
                <button onClick={onClearAll} className="text-[10px] text-slate-400 font-semibold hover:underline">
                  {lang === 'vi' ? 'Xóa hết' : 'Clear'}
                </button>
              )}
            </div>
          </div>

          {/* Notification List */}
          <div className="overflow-y-auto max-h-80">
            {notifications.length === 0 ? (
              <div className={`p-8 text-center ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{lang === 'vi' ? 'Chưa có thông báo' : 'No notifications'}</p>
              </div>
            ) : (
              notifications.map(notif => (
                <div
                  key={notif.id}
                  onClick={() => onMarkAsRead(notif.id)}
                  className={`px-4 py-3 border-b cursor-pointer transition-colors hover:opacity-80 ${getBgColor(notif.type, notif.read)} ${isDarkMode ? 'border-slate-800' : 'border-slate-50'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">{getIcon(notif.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold truncate ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{notif.title}</span>
                        {!notif.read && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>}
                      </div>
                      <p className={`text-[11px] mt-0.5 line-clamp-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{notif.message}</p>
                      <p className={`text-[10px] mt-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        {new Date(notif.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminNotification;
