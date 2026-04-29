import React, { useState, useEffect, useCallback } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import { getStoredUser, isAuthenticated as checkAuth, logout } from './services/api';
import { useSocket } from './hooks/useSocket';
import type { UserInfo } from './services/api';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '596735790224-aljdrg900j65ccsud1uufk8rnltvgdo5.apps.googleusercontent.com';

export default function App() {
  const [authenticated, setAuthenticated] = useState(checkAuth());
  const [user, setUser] = useState<UserInfo | null>(getStoredUser());

  // Socket.io for real-time notifications
  const {
    socket, isConnected, notifications, unreadCount,
    markAsRead, markAllAsRead, clearAll
  } = useSocket({
    userEmail: user?.email,
    userRole: user?.role,
    enabled: authenticated,
  });

  // Listen for forced logout (token expired)
  useEffect(() => {
    const handler = () => { setAuthenticated(false); setUser(null); };
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, []);

  const handleLoginSuccess = useCallback((userInfo: UserInfo) => {
    setUser(userInfo);
    setAuthenticated(true);
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    setUser(null);
    setAuthenticated(false);
  }, []);

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      {!authenticated ? (
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      ) : (
        <Dashboard
          user={user}
          onLogout={handleLogout}
          socket={socket}
          isSocketConnected={isConnected}
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
          onClearNotifications={clearAll}
        />
      )}
    </GoogleOAuthProvider>
  );
}