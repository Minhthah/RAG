// ============================================
// 🚀 SERVER ENTRY POINT
// Express + Socket.io + Security Middleware
// ============================================
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import { Server } from 'socket.io';

import config from './config/env.js';
import { initSocketHandlers } from './services/socket.service.js';
import { ensureDir } from './utils/fileHelpers.js';

// --- Import Routes ---
import authRoutes from './routes/auth.routes.js';
import chatRoutes, { setSocketNotifier as setChatSocketNotifier } from './routes/chat.routes.js';
import uploadRoutes, { setSocketNotifier as setUploadSocketNotifier } from './routes/upload.routes.js';

// ============================================
// 🔧 APP SETUP
// ============================================
const app = express();
const server = http.createServer(app);

// Socket.io với CORS cho Frontend
const io = new Server(server, {
  cors: {
    origin: config.FRONTEND_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// ============================================
// 🛡️ SECURITY MIDDLEWARE
// ============================================
app.use(helmet({
  contentSecurityPolicy: false, // Tắt CSP vì Frontend dùng inline scripts
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: config.FRONTEND_URL,
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ============================================
// 📂 TẠO THƯ MỤC CẦN THIẾT
// ============================================
ensureDir('./tmp');   // Quarantine folder cho file upload
ensureDir('./logs');  // Audit logs

// ============================================
// 🔔 SOCKET.IO SETUP
// ============================================
const socketNotifier = initSocketHandlers(io);

// Inject socket notifier vào các routes cần dùng
setChatSocketNotifier(socketNotifier);
setUploadSocketNotifier(socketNotifier);

// ============================================
// 🛤️ ROUTES
// ============================================
app.use('/api', authRoutes);     // POST /api/login
app.use('/api', chatRoutes);     // POST /api/chat
app.use('/api', uploadRoutes);   // POST /api/upload

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
    virusScannerAvailable: !!config.VIRUSTOTAL_API_KEY,
  });
});

// ============================================
// ❌ ERROR HANDLER
// ============================================
app.use((err, req, res, next) => {
  console.error('❌ Unhandled Error:', err.message);
  res.status(500).json({
    error: 'InternalServerError',
    message: config.NODE_ENV === 'development' ? err.message : 'Lỗi hệ thống. Vui lòng thử lại.',
  });
});

// ============================================
// 🚀 START SERVER
// ============================================
server.listen(config.PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 ENTERPRISE RAG AI SERVER');
  console.log('='.repeat(60));
  console.log(`📡 Server:      http://localhost:${config.PORT}`);
  console.log(`🌐 Frontend:    ${config.FRONTEND_URL}`);
  console.log(`🔐 Environment: ${config.NODE_ENV}`);
  console.log(`🛡️  VirusTotal:  ${config.VIRUSTOTAL_API_KEY ? '✅ Configured' : '⚠️  Not configured'}`);
  console.log(`👑 Admin emails: ${config.ADMIN_EMAILS.length > 0 ? config.ADMIN_EMAILS.join(', ') : '⚠️  None configured'}`);
  console.log('='.repeat(60) + '\n');
});

export default server;
