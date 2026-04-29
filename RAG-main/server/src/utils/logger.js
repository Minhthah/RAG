// ============================================
// 📋 AUDIT LOGGER - Ghi nhật ký bảo mật
// ============================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.resolve(__dirname, '../../logs');
const LOG_FILE = path.join(LOG_DIR, 'security-audit.log');

// Đảm bảo thư mục logs tồn tại
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * Ghi một sự kiện bảo mật vào audit log
 * Format: JSON Lines (mỗi dòng là 1 JSON object)
 * 
 * @param {Object} event
 * @param {string} event.action - Loại hành động (UPLOAD_SUCCESS, MALWARE_DETECTED, LOGIN, etc.)
 * @param {string} event.userId - ID/Email người dùng
 * @param {string} [event.filename] - Tên file liên quan
 * @param {string} [event.details] - Chi tiết bổ sung
 * @param {string} [event.severity] - INFO | WARN | CRITICAL
 */
export function logSecurityEvent({ action, userId, filename, details, severity = 'INFO' }) {
  const entry = {
    timestamp: new Date().toISOString(),
    severity,
    action,
    userId: userId || 'SYSTEM',
    filename: filename || null,
    details: details || null,
  };

  const line = JSON.stringify(entry) + '\n';

  // Ghi ra console với màu sắc theo severity
  const colors = { INFO: '\x1b[36m', WARN: '\x1b[33m', CRITICAL: '\x1b[31m' };
  const reset = '\x1b[0m';
  const color = colors[severity] || colors.INFO;
  console.log(`${color}[AUDIT] ${severity}${reset} | ${action} | User: ${entry.userId} | ${details || ''}`);

  // Ghi ra file (async, không block)
  fs.appendFile(LOG_FILE, line, (err) => {
    if (err) console.error('❌ Không thể ghi audit log:', err.message);
  });
}

/**
 * Ghi log khi phát hiện malware - CRITICAL
 */
export function logMalwareDetected(userId, filename, threats) {
  logSecurityEvent({
    action: 'MALWARE_DETECTED',
    userId,
    filename,
    details: `Threats found: ${threats.join(', ')}`,
    severity: 'CRITICAL',
  });
}

/**
 * Ghi log upload thành công
 */
export function logUploadSuccess(userId, filename, chunkCount) {
  logSecurityEvent({
    action: 'UPLOAD_SUCCESS',
    userId,
    filename,
    details: `File processed successfully. ${chunkCount} chunks created.`,
    severity: 'INFO',
  });
}

/**
 * Ghi log đăng nhập
 */
export function logLogin(userId, method, success) {
  logSecurityEvent({
    action: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED',
    userId,
    details: `Method: ${method}`,
    severity: success ? 'INFO' : 'WARN',
  });
}

export default { logSecurityEvent, logMalwareDetected, logUploadSuccess, logLogin };
