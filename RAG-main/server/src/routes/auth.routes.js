// ============================================
// 🔑 AUTH ROUTES - Đăng nhập (Local + Google OAuth)
// ============================================
import { Router } from 'express';
import { handleLogin } from '../services/auth.service.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = Router();

/**
 * POST /api/login
 * 
 * Body (Local):  { username: string, password: string }
 * Body (Google): { googleToken: string }
 * 
 * Response: { success: true, token: string, user: { name, email, role, picture } }
 */
router.post('/login', authLimiter, async (req, res) => {
  try {
    const result = await handleLogin(req.body);
    res.json(result);
  } catch (err) {
    res.status(401).json({
      success: false,
      error: err.message || 'Đăng nhập thất bại.',
    });
  }
});

export default router;
