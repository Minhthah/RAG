// ============================================
// 🔔 SOCKET SERVICE - Real-time Notifications
// ============================================

/**
 * Khởi tạo Socket.io event handlers
 * 
 * Events:
 * - security_alert: Thông báo bảo mật cho Admin (malware detected, upload complete)
 * - user_message: Ping Admin khi có user gửi tin nhắn chat
 * - notification: Thông báo chung
 * 
 * @param {import('socket.io').Server} io - Socket.io server instance
 */
export function initSocketHandlers(io) {
  // Lưu danh sách Admin sockets để gửi targeted notifications
  const adminSockets = new Map(); // socketId → { email, role }

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Client gửi thông tin auth sau khi connect
    socket.on('register', (data) => {
      const { email, role } = data || {};
      if (role === 'ADMIN') {
        adminSockets.set(socket.id, { email, role });
        console.log(`👑 Admin registered: ${email} (${socket.id})`);
      }
      socket.userData = { email, role };
    });

    socket.on('disconnect', () => {
      adminSockets.delete(socket.id);
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  // --- Expose helper functions cho các route sử dụng ---

  /**
   * Gửi thông báo bảo mật cho TẤT CẢ Admin
   * Hiển thị dạng toast message với chấm đỏ trên bell icon
   */
  function notifyAdmins(event, data) {
    const payload = {
      type: event,
      timestamp: new Date().toISOString(),
      ...data,
    };

    // Gửi cho tất cả Admin đang online
    for (const [socketId, admin] of adminSockets.entries()) {
      io.to(socketId).emit('admin_notification', payload);
    }

    // Cũng broadcast security_alert cho backward compatibility
    io.emit('security_alert', data.message || data.title);

    console.log(`🔔 Notified ${adminSockets.size} admin(s): ${event}`);
  }

  /**
   * Ping Admin khi user gửi tin nhắn chat
   * Tạo chấm đỏ trên bell icon và toast notification
   */
  function notifyUserMessage(userEmail, messagePreview) {
    notifyAdmins('user_message', {
      title: 'Tin nhắn mới từ User',
      message: `${userEmail}: "${messagePreview.substring(0, 80)}..."`,
      userEmail,
    });
  }

  /**
   * Thông báo upload thành công
   */
  function notifyUploadComplete(userEmail, filename, chunkCount) {
    notifyAdmins('upload_complete', {
      title: 'Tài liệu mới được nạp',
      message: `${userEmail} vừa upload "${filename}" (${chunkCount} chunks).`,
      filename,
      chunkCount,
    });
  }

  /**
   * Cảnh báo phát hiện malware
   */
  function notifyMalwareDetected(userEmail, filename, threats) {
    notifyAdmins('malware_detected', {
      title: '🚨 CẢNH BÁO BẢO MẬT',
      message: `Phát hiện mã độc trong file "${filename}" từ ${userEmail}!`,
      filename,
      threats,
      severity: 'CRITICAL',
    });
  }

  return {
    notifyAdmins,
    notifyUserMessage,
    notifyUploadComplete,
    notifyMalwareDetected,
  };
}

export default { initSocketHandlers };
