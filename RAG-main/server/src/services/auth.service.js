// ============================================
// 🔐 AUTH SERVICE - Google OAuth & JWT Issuing
// ============================================
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import { logLogin } from '../utils/logger.js';

const googleClient = new OAuth2Client(config.GOOGLE_CLIENT_ID);

/**
 * Xác thực Google ID Token
 * Google gửi ID Token từ Frontend → Backend verify trực tiếp với Google servers
 * 
 * @param {string} idToken - Token nhận từ @react-oauth/google
 * @returns {Object} { email, name, picture }
 */
export async function verifyGoogleToken(idToken) {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: config.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    return {
      email: payload.email,
      name: payload.name || payload.email.split('@')[0],
      picture: payload.picture || null,
      emailVerified: payload.email_verified,
    };
  } catch (err) {
    console.error('❌ Google Token verification failed:', err.message);
    throw new Error('Google Token không hợp lệ hoặc đã hết hạn.');
  }
}

/**
 * Xác định role dựa trên email
 * Email nằm trong ADMIN_EMAILS env → ADMIN, còn lại → USER
 */
export function determineRole(email) {
  const normalizedEmail = email.toLowerCase().trim();
  return config.ADMIN_EMAILS.includes(normalizedEmail) ? 'ADMIN' : 'USER';
}

/**
 * Tạo JWT token chứa thông tin user + role
 * Token có hiệu lực 8 giờ làm việc
 */
export function issueJWT({ email, name, role, picture }) {
  return jwt.sign(
    { email, name, role, picture },
    config.JWT_SECRET,
    { expiresIn: '8h' }
  );
}

/**
 * Xác thực đăng nhập nội bộ (username/password)
 * NOTE: Production nên dùng bcrypt hash password trong DB
 */
export function verifyLocalCredentials(username, password) {
  // Tạm thời hardcode cho demo - Production: query database
  const DEMO_ACCOUNTS = {
    admin: { password: '123456', email: 'admin@enterprise.local', name: 'Admin', role: 'ADMIN' },
  };

  const account = DEMO_ACCOUNTS[username];
  if (!account || account.password !== password) {
    return null;
  }

  return {
    email: account.email,
    name: account.name,
    role: account.role,
  };
}

/**
 * Xử lý toàn bộ flow đăng nhập (Google hoặc Local)
 * 
 * @param {Object} body - { googleToken } hoặc { username, password }
 * @returns {Object} { success, token, user }
 */
export async function handleLogin(body) {
  const { googleToken, username, password } = body;

  // --- Luồng Google OAuth ---
  if (googleToken) {
    const googleUser = await verifyGoogleToken(googleToken);

    if (!googleUser.emailVerified) {
      throw new Error('Email Google chưa được xác minh.');
    }

    const role = determineRole(googleUser.email);
    const token = issueJWT({
      email: googleUser.email,
      name: googleUser.name,
      role,
      picture: googleUser.picture,
    });

    logLogin(googleUser.email, 'GOOGLE_OAUTH', true);

    return {
      success: true,
      token,
      user: {
        email: googleUser.email,
        name: googleUser.name,
        role,
        picture: googleUser.picture,
      },
    };
  }

  // --- Luồng đăng nhập nội bộ ---
  if (username && password) {
    const localUser = verifyLocalCredentials(username, password);

    if (!localUser) {
      logLogin(username, 'LOCAL', false);
      throw new Error('Tên đăng nhập hoặc mật khẩu không chính xác.');
    }

    const token = issueJWT({
      email: localUser.email,
      name: localUser.name,
      role: localUser.role,
      picture: null,
    });

    logLogin(localUser.email, 'LOCAL', true);

    return {
      success: true,
      token,
      user: {
        email: localUser.email,
        name: localUser.name,
        role: localUser.role,
        picture: null,
      },
    };
  }

  throw new Error('Thiếu thông tin đăng nhập.');
}

export default { verifyGoogleToken, determineRole, issueJWT, verifyLocalCredentials, handleLogin };
