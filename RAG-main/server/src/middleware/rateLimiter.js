// ============================================
// 🛡️ RATE LIMITER - Chống DDoS & Spam
// ============================================
import rateLimit from 'express-rate-limit';
import config from '../config/env.js';

/**
 * Rate limit cho API đăng nhập
 * 10 lần / 15 phút - Chống brute force password
 */
export const authLimiter = rateLimit({
  windowMs: config.AUTH_RATE_LIMIT.windowMs,
  max: config.AUTH_RATE_LIMIT.max,
  message: {
    error: 'TooManyRequests',
    message: 'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng đợi 15 phút.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Dùng IP + username để track (tránh lock toàn bộ IP nếu nhiều user cùng mạng)
  keyGenerator: (req) => {
    return `${req.ip}-${req.body?.username || req.body?.googleToken?.substring(0, 20) || 'unknown'}`;
  },
});

/**
 * Rate limit cho API upload file
 * 5 file / phút / user - Chống spam upload
 */
export const uploadLimiter = rateLimit({
  windowMs: config.UPLOAD_RATE_LIMIT.windowMs,
  max: config.UPLOAD_RATE_LIMIT.max,
  message: {
    error: 'TooManyUploads',
    message: 'Bạn đang upload quá nhanh! Tối đa 5 file/phút. Vui lòng đợi.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.email || req.ip,
});

/**
 * Rate limit cho API chat
 * 30 tin nhắn / phút - Chống spam AI queries
 */
export const chatLimiter = rateLimit({
  windowMs: config.CHAT_RATE_LIMIT.windowMs,
  max: config.CHAT_RATE_LIMIT.max,
  message: {
    error: 'TooManyMessages',
    message: 'Bạn đang hỏi quá nhanh! Vui lòng đợi một lát.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.email || req.ip,
});

export default { authLimiter, uploadLimiter, chatLimiter };
