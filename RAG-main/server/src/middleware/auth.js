// ============================================
// 🔑 AUTH MIDDLEWARE - JWT Verification Gate
// ============================================
import jwt from 'jsonwebtoken';
import config from '../config/env.js';

/**
 * Middleware xác thực JWT token
 * Mọi route cần bảo vệ phải đi qua middleware này
 * 
 * Flow: Header Authorization → Decode JWT → Gắn req.user → next()
 * Nếu token sai/expired → 401 Unauthorized
 */
export function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token xác thực không được cung cấp. Vui lòng đăng nhập.'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.JWT_SECRET);

    // Gắn thông tin user vào request để các route sau dùng
    req.user = {
      email: decoded.email,
      name: decoded.name,
      role: decoded.role, // 'ADMIN' hoặc 'USER'
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'TokenExpired',
        message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
      });
    }
    return res.status(401).json({
      error: 'InvalidToken',
      message: 'Token không hợp lệ.'
    });
  }
}

/**
 * Middleware kiểm tra role ADMIN
 * Dùng sau requireAuth: router.post('/admin-only', requireAuth, requireAdmin, handler)
 */
export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Chỉ Admin mới có quyền thực hiện hành động này.'
    });
  }
  next();
}

export default { requireAuth, requireAdmin };
