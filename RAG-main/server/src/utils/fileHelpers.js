// ============================================
// 🗂️ FILE HELPERS - Safe file operations
// ============================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TMP_DIR = path.resolve(__dirname, '../../tmp');

/**
 * Đảm bảo thư mục tồn tại, tạo nếu chưa có
 */
export function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Xóa file an toàn - không throw error nếu file không tồn tại
 * QUAN TRỌNG: Luôn dùng hàm này trong finally block sau upload
 */
export function safeDeleteFile(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️  Đã xóa file tạm: ${path.basename(filePath)}`);
    }
  } catch (err) {
    console.error(`⚠️  Không thể xóa file ${filePath}: ${err.message}`);
  }
}

/**
 * Lấy đường dẫn thư mục quarantine /tmp
 * Tự tạo nếu chưa tồn tại
 */
export function getTmpDir() {
  ensureDir(TMP_DIR);
  return TMP_DIR;
}

/**
 * Kiểm tra file có nằm trong thư mục cho phép không
 * Chống Path Traversal attack
 */
export function isPathSafe(filePath, allowedDir = TMP_DIR) {
  const resolved = path.resolve(filePath);
  return resolved.startsWith(path.resolve(allowedDir));
}

export default { ensureDir, safeDeleteFile, getTmpDir, isPathSafe };
