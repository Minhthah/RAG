// ============================================
// 📤 UPLOAD ROUTES - Secure File Upload Pipeline
// Luồng: Multer → Magic Bytes → VirusTotal/ClamAV → Parse → Embed → Supabase
// ============================================
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { requireAuth } from '../middleware/auth.js';
import { uploadLimiter } from '../middleware/rateLimiter.js';
import { scanFile } from '../services/scanner.service.js';
import { parseFile, processDocument } from '../services/document.service.js';
import { safeDeleteFile, getTmpDir } from '../utils/fileHelpers.js';
import { logMalwareDetected, logUploadSuccess, logSecurityEvent } from '../utils/logger.js';
import config from '../config/env.js';

const router = Router();

// Socket notifier - sẽ được inject từ index.js
let socketNotifier = null;
export function setSocketNotifier(notifier) {
  socketNotifier = notifier;
}

// ============================================
// 🔧 MULTER CONFIG - Cổng tiếp nhận file
// ============================================
const storage = multer.diskStorage({
  // Lưu vào thư mục quarantine /tmp - TUYỆT ĐỐI không lưu vào source code
  destination: (req, file, cb) => {
    cb(null, getTmpDir());
  },
  // Tạo tên file unique để tránh trùng
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `upload-${uniqueSuffix}${ext}`);
  },
});

// File filter - Tầng phòng thủ đầu tiên (server-side)
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  // Kiểm tra extension
  if (!config.ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(
      new Error(`Định dạng file ${ext} không được hỗ trợ. Chỉ chấp nhận: ${config.ALLOWED_EXTENSIONS.join(', ')}`),
      false
    );
  }

  // Kiểm tra MIME type (tầng 2, nhưng có thể bị spoof)
  if (!config.ALLOWED_MIMETYPES.includes(file.mimetype)) {
    // Cho qua vì MIME type không đáng tin cậy 100%
    // Magic Bytes sẽ kiểm tra chính xác hơn ở bước sau
    console.warn(`⚠️  MIME type không khớp: ${file.mimetype} cho file ${ext}`);
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.MAX_FILE_SIZE, // 10MB
    files: 1, // Chỉ 1 file mỗi lần
  },
});

// ============================================
// 📤 UPLOAD ENDPOINT
// ============================================

/**
 * POST /api/upload
 * Protected: Yêu cầu JWT token
 * Rate limited: 5 file/phút
 * 
 * Body: FormData with 'file' field
 * Query: ?role=MANAGER (optional, default: USER)
 * 
 * Response:
 *   Success: { success: true, chunkCount: number, filename: string }
 *   Malware: { error: 'MalwareDetected', message: '...' } (400)
 *   Error:   { error: string, message: string } (4xx/5xx)
 */
router.post('/upload', requireAuth, uploadLimiter, (req, res, next) => {
  // Bọc multer trong error handler riêng
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({
            error: 'FileTooLarge',
            message: `File quá lớn. Giới hạn tối đa: ${config.MAX_FILE_SIZE / (1024 * 1024)}MB.`,
          });
        }
        return res.status(400).json({ error: 'UploadError', message: err.message });
      }
      return res.status(400).json({ error: 'FileRejected', message: err.message });
    }
    next();
  });
}, async (req, res) => {
  // Lưu đường dẫn file để cleanup trong finally
  const filePath = req.file?.path || null;

  try {
    // ========== VALIDATION ==========
    if (!req.file) {
      return res.status(400).json({
        error: 'NoFile',
        message: 'Không tìm thấy file. Vui lòng chọn file để upload.',
      });
    }

    const { originalname, size } = req.file;
    const userEmail = req.user.email;
    const roleAccess = req.query.role === 'MANAGER' ? 'MANAGER' : 'USER';

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📤 UPLOAD PIPELINE START`);
    console.log(`   File: ${originalname} (${(size / 1024).toFixed(1)}KB)`);
    console.log(`   User: ${userEmail} | Role Access: ${roleAccess}`);
    console.log(`   Quarantine: ${filePath}`);
    console.log(`${'='.repeat(60)}`);

    // ========== BƯỚC 1: QUÉT BẢO MẬT (Magic Bytes + VirusTotal/ClamAV) ==========
    console.log('\n🛡️  BƯỚC 1: Quét bảo mật...');
    const scanResult = await scanFile(filePath, originalname);

    if (!scanResult.clean) {
      // 🔴 PHÁT HIỆN MÃ ĐỘC → Xóa ngay + Log + Thông báo Admin
      console.log(`\n🔴 MALWARE DETECTED trong file: ${originalname}`);
      console.log(`   Threats: ${scanResult.threats.join(', ')}`);

      // Xóa file ngay lập tức
      safeDeleteFile(filePath);

      // Ghi Audit Log (CRITICAL)
      logMalwareDetected(userEmail, originalname, scanResult.threats);

      // Thông báo Admin qua Socket
      if (socketNotifier) {
        socketNotifier.notifyMalwareDetected(userEmail, originalname, scanResult.threats);
      }

      return res.status(400).json({
        error: 'MalwareDetected',
        message: 'Tải lên thất bại: Phát hiện tệp đáng ngờ hoặc chứa mã độc. File đã bị xóa.',
        threats: scanResult.threats,
        method: scanResult.method,
      });
    }

    console.log(`✅ File sạch (Method: ${scanResult.method})`);

    // ========== BƯỚC 2: PARSE FILE → TEXT ==========
    console.log('\n📖 BƯỚC 2: Trích xuất nội dung...');
    const fileBuffer = await import('fs').then(fs => fs.default.readFileSync(filePath));
    const { text, pageCount } = await parseFile(fileBuffer, originalname);

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        error: 'EmptyDocument',
        message: 'File không chứa nội dung text nào có thể trích xuất.',
      });
    }

    console.log(`  → Trích xuất được ${text.length} ký tự, ~${pageCount} trang`);

    // ========== BƯỚC 3: CHUNK + EMBED + SAVE TO SUPABASE ==========
    console.log('\n🧠 BƯỚC 3: Cắt nhỏ, nhúng vector và lưu vào Supabase...');
    const chunkCount = await processDocument(text, {
      filename: originalname,
      uploaderEmail: userEmail,
      pageCount,
    }, roleAccess);

    // Ghi Audit Log (SUCCESS)
    logUploadSuccess(userEmail, originalname, chunkCount);

    // Thông báo Admin qua Socket
    if (socketNotifier) {
      socketNotifier.notifyUploadComplete(userEmail, originalname, chunkCount);
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ UPLOAD PIPELINE COMPLETE: ${originalname} → ${chunkCount} chunks`);
    console.log(`${'='.repeat(60)}\n`);

    res.json({
      success: true,
      chunkCount,
      filename: originalname,
      pageCount,
      roleAccess,
      scanMethod: scanResult.method,
    });

  } catch (err) {
    console.error('❌ Upload pipeline error:', err.message);

    logSecurityEvent({
      action: 'UPLOAD_ERROR',
      userId: req.user?.email,
      filename: req.file?.originalname,
      details: err.message,
      severity: 'WARN',
    });

    res.status(500).json({
      error: 'ProcessingError',
      message: 'Có lỗi xảy ra khi xử lý file. Vui lòng thử lại.',
    });

  } finally {
    // ========== BƯỚC 4: DỌN DẸP - Luôn xóa file trong /tmp ==========
    // BẤT KỂ thành công hay thất bại, file gốc PHẢI được xóa
    safeDeleteFile(filePath);
  }
});

export default router;
