// ============================================
// 🛡️ SCANNER SERVICE - VirusTotal + ClamAV + Magic Bytes
// ============================================
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import config from '../config/env.js';
import { logSecurityEvent } from '../utils/logger.js';

const execAsync = promisify(exec);

// ===== MAGIC BYTES SIGNATURES =====
// Chữ ký nhị phân thực sự của file, chống fake extension attack
// Hacker đổi virus.exe → safe.pdf → Backend check magic bytes → Phát hiện giả mạo
const MAGIC_BYTES = {
  // PDF: bắt đầu bằng %PDF
  '.pdf': {
    bytes: [0x25, 0x50, 0x44, 0x46],
    description: 'PDF document',
  },
  // DOCX: là ZIP archive (PK signature)
  '.docx': {
    bytes: [0x50, 0x4B, 0x03, 0x04],
    description: 'DOCX/ZIP archive',
  },
  // TXT: không có magic bytes cố định, kiểm tra bằng cách khác
  '.txt': {
    bytes: null,
    description: 'Plain text',
  },
};

/**
 * Kiểm tra Magic Bytes của file (File Signature Validation)
 * Đây là tầng bảo mật QUAN TRỌNG: chống đổi đuôi file giả
 * 
 * @param {string} filePath - Đường dẫn file trong /tmp
 * @param {string} expectedExt - Extension kỳ vọng (.pdf, .docx, .txt)
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateMagicBytes(filePath, expectedExt) {
  try {
    const ext = expectedExt.toLowerCase();
    const signature = MAGIC_BYTES[ext];

    if (!signature) {
      return { valid: false, reason: `Extension ${ext} không được hỗ trợ.` };
    }

    // TXT không có magic bytes → kiểm tra bằng cách thử decode UTF-8
    if (signature.bytes === null) {
      const buffer = fs.readFileSync(filePath);
      // Kiểm tra có phải binary file không (chứa null bytes)
      const hasNullBytes = buffer.includes(0x00);
      if (hasNullBytes) {
        return { valid: false, reason: 'File chứa dữ liệu nhị phân, không phải text file hợp lệ.' };
      }
      return { valid: true };
    }

    // Đọc N bytes đầu tiên của file
    const fd = fs.openSync(filePath, 'r');
    const headerBuffer = Buffer.alloc(signature.bytes.length);
    fs.readSync(fd, headerBuffer, 0, signature.bytes.length, 0);
    fs.closeSync(fd);

    // So sánh từng byte
    for (let i = 0; i < signature.bytes.length; i++) {
      if (headerBuffer[i] !== signature.bytes[i]) {
        return {
          valid: false,
          reason: `File không phải ${signature.description} hợp lệ. Magic bytes không khớp. ` +
                  `Có thể file đã bị đổi đuôi giả mạo.`
        };
      }
    }

    return { valid: true };
  } catch (err) {
    return { valid: false, reason: `Lỗi khi kiểm tra file signature: ${err.message}` };
  }
}

/**
 * Quét file bằng VirusTotal API v3
 * Flow: Upload file → Nhận analysis ID → Poll kết quả (tối đa 60s)
 * 
 * @param {string} filePath
 * @returns {{ clean: boolean, threats: string[] }}
 */
export async function scanWithVirusTotal(filePath) {
  if (!config.VIRUSTOTAL_API_KEY) {
    logSecurityEvent({
      action: 'SCAN_SKIPPED',
      details: 'VirusTotal API key not configured. Skipping scan.',
      severity: 'WARN',
    });
    return { clean: true, threats: [], skipped: true };
  }

  try {
    console.log('🔬 Đang upload file lên VirusTotal để quét...');

    // Bước 1: Upload file lên VirusTotal
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);

    const formData = new FormData();
    formData.append('file', new Blob([fileBuffer]), fileName);

    const uploadRes = await fetch('https://www.virustotal.com/api/v3/files', {
      method: 'POST',
      headers: {
        'x-apikey': config.VIRUSTOTAL_API_KEY,
      },
      body: formData,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`VirusTotal upload failed: ${uploadRes.status} - ${errText}`);
    }

    const uploadData = await uploadRes.json();
    const analysisId = uploadData.data?.id;

    if (!analysisId) {
      throw new Error('VirusTotal không trả về analysis ID.');
    }

    console.log(`🔍 Đang chờ kết quả phân tích (ID: ${analysisId.substring(0, 20)}...)...`);

    // Bước 2: Poll kết quả phân tích (tối đa 60s, mỗi 5s poll 1 lần)
    const MAX_POLLS = 12;
    const POLL_INTERVAL = 5000; // 5 giây

    for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));

      const analysisRes = await fetch(
        `https://www.virustotal.com/api/v3/analyses/${analysisId}`,
        {
          headers: { 'x-apikey': config.VIRUSTOTAL_API_KEY },
        }
      );

      if (!analysisRes.ok) continue;

      const analysisData = await analysisRes.json();
      const status = analysisData.data?.attributes?.status;

      if (status === 'completed') {
        const stats = analysisData.data.attributes.stats;
        const results = analysisData.data.attributes.results || {};

        // Thu thập tên các mối đe dọa từ các engine phát hiện
        const threats = [];
        for (const [engine, result] of Object.entries(results)) {
          if (result.category === 'malicious' || result.category === 'suspicious') {
            threats.push(`${engine}: ${result.result || 'detected'}`);
          }
        }

        const isMalicious = (stats.malicious || 0) > 0 || (stats.suspicious || 0) > 0;

        console.log(isMalicious
          ? `🔴 VirusTotal: PHÁT HIỆN ${threats.length} mối đe dọa!`
          : `🟢 VirusTotal: File SẠCH (${stats.undetected || 0} engines kiểm tra).`
        );

        return {
          clean: !isMalicious,
          threats,
          stats: {
            malicious: stats.malicious || 0,
            suspicious: stats.suspicious || 0,
            undetected: stats.undetected || 0,
            harmless: stats.harmless || 0,
          },
        };
      }
    }

    // Timeout - coi như sạch nhưng ghi log cảnh báo
    logSecurityEvent({
      action: 'SCAN_TIMEOUT',
      details: 'VirusTotal analysis timed out after 60s.',
      severity: 'WARN',
    });

    return { clean: true, threats: [], timedOut: true };

  } catch (err) {
    console.error('❌ VirusTotal scan error:', err.message);
    logSecurityEvent({
      action: 'SCAN_ERROR',
      details: `VirusTotal error: ${err.message}`,
      severity: 'WARN',
    });
    // Lỗi scan → vẫn cho qua nhưng ghi log (fail-open cho dev, fail-close cho production)
    return { clean: config.NODE_ENV === 'development', threats: [], error: err.message };
  }
}

/**
 * Quét file bằng ClamAV (chạy trong Docker container)
 * Fallback khi không có VirusTotal API key
 * 
 * @param {string} filePath
 * @returns {{ clean: boolean, threats: string[] }}
 */
export async function scanWithClamAV(filePath) {
  try {
    console.log('🔬 Đang quét file bằng ClamAV...');

    const { stdout, stderr } = await execAsync(
      `clamscan --no-summary --infected "${filePath}"`,
      { timeout: 30000 } // 30s timeout
    );

    // ClamAV exit code 0 = clean, 1 = virus found
    console.log('🟢 ClamAV: File sạch.');
    return { clean: true, threats: [] };

  } catch (err) {
    // Exit code 1 = virus found
    if (err.code === 1 && err.stdout) {
      const threats = err.stdout.split('\n')
        .filter(line => line.includes('FOUND'))
        .map(line => line.trim());

      console.log(`🔴 ClamAV: PHÁT HIỆN mã độc! ${threats.join(', ')}`);
      return { clean: false, threats };
    }

    // ClamAV not installed or other error
    console.warn('⚠️  ClamAV không khả dụng:', err.message);
    logSecurityEvent({
      action: 'CLAMAV_UNAVAILABLE',
      details: err.message,
      severity: 'WARN',
    });

    return { clean: config.NODE_ENV === 'development', threats: [], error: err.message };
  }
}

/**
 * Quét file tổng hợp - Auto chọn phương thức phù hợp
 * Priority: Magic Bytes → VirusTotal (nếu có key) → ClamAV (nếu available) → Skip (dev only)
 * 
 * @param {string} filePath - Đường dẫn file cần quét
 * @param {string} originalName - Tên file gốc (để lấy extension)
 * @returns {{ clean: boolean, threats: string[], method: string }}
 */
export async function scanFile(filePath, originalName) {
  const ext = path.extname(originalName).toLowerCase();

  // ========== BƯỚC 1: Kiểm tra Magic Bytes ==========
  // Chống fake extension: virus.exe đổi tên thành safe.pdf
  console.log(`🔐 Bước 1/2: Kiểm tra chữ ký nhị phân (Magic Bytes) cho ${originalName}...`);
  const magicResult = validateMagicBytes(filePath, ext);

  if (!magicResult.valid) {
    console.log(`🔴 FAKE FILE DETECTED: ${magicResult.reason}`);
    return {
      clean: false,
      threats: [`FAKE_EXTENSION: ${magicResult.reason}`],
      method: 'MAGIC_BYTES',
    };
  }
  console.log('✅ Magic Bytes hợp lệ - File thật.');

  // ========== BƯỚC 2: Quét Virus ==========
  console.log(`🔐 Bước 2/2: Quét mã độc cho ${originalName}...`);

  // Ưu tiên VirusTotal nếu có API key
  if (config.VIRUSTOTAL_API_KEY) {
    const vtResult = await scanWithVirusTotal(filePath);
    return { ...vtResult, method: 'VIRUSTOTAL' };
  }

  // Fallback sang ClamAV
  const clamResult = await scanWithClamAV(filePath);
  if (!clamResult.error) {
    return { ...clamResult, method: 'CLAMAV' };
  }

  // Không có scanner nào khả dụng
  console.warn('⚠️  CẢNH BÁO: Không có scanner nào khả dụng! File được cho qua trong DEV mode.');
  logSecurityEvent({
    action: 'NO_SCANNER_AVAILABLE',
    details: 'Neither VirusTotal nor ClamAV is available.',
    severity: 'WARN',
  });

  return {
    clean: config.NODE_ENV === 'development',
    threats: [],
    method: 'NONE',
    warning: 'No virus scanner available.',
  };
}

export default { validateMagicBytes, scanWithVirusTotal, scanWithClamAV, scanFile };
