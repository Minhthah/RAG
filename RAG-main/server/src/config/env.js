// ============================================
// 🔧 ENV CONFIG - Validate & Export Environment
// ============================================
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// --- Biến bắt buộc ---
const REQUIRED_VARS = ['DATABASE_URL', 'GOOGLE_API_KEY', 'GOOGLE_CLIENT_ID', 'JWT_SECRET'];

for (const key of REQUIRED_VARS) {
  if (!process.env[key]) {
    console.error(`❌ FATAL: Missing required environment variable: ${key}`);
    console.error(`   → Copy .env.example thành .env và điền đầy đủ các giá trị.`);
    process.exit(1);
  }
}

// --- Export config object ---
const config = {
  // Database
  DATABASE_URL: process.env.DATABASE_URL,

  // Google
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,

  // Security
  JWT_SECRET: process.env.JWT_SECRET,
  VIRUSTOTAL_API_KEY: process.env.VIRUSTOTAL_API_KEY || null,

  // Admin emails (comma-separated → array)
  ADMIN_EMAILS: (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean),

  // App
  PORT: parseInt(process.env.PORT || '3001', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',

  // File upload limits
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_EXTENSIONS: ['.pdf', '.docx', '.txt'],
  ALLOWED_MIMETYPES: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ],

  // Rate limiting
  UPLOAD_RATE_LIMIT: { windowMs: 60 * 1000, max: 5 },   // 5 uploads/phút
  CHAT_RATE_LIMIT: { windowMs: 60 * 1000, max: 30 },     // 30 messages/phút
  AUTH_RATE_LIMIT: { windowMs: 15 * 60 * 1000, max: 10 }, // 10 login attempts/15 phút
};

export default config;
