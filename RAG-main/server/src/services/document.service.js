// ============================================
// 📄 DOCUMENT SERVICE - Parse, Chunk, Embed
// Chiến lược Chunking thông minh với metadata phong phú
// ============================================
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

import fs from 'fs';
import mammoth from 'mammoth';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import pg from 'pg';
import config from '../config/env.js';

// --- Khởi tạo kết nối DB & Embedding model ---
const pool = new pg.Pool({
  connectionString: config.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const embeddings = new GoogleGenerativeAIEmbeddings({
  model: 'text-embedding-004',
  apiKey: config.GOOGLE_API_KEY,
});

/**
 * Phân loại và trích xuất text từ file dựa trên extension
 * Hỗ trợ: PDF, DOCX, TXT
 * 
 * @param {Buffer} buffer - Nội dung file dạng Buffer
 * @param {string} filename - Tên file gốc
 * @returns {{ text: string, pageCount: number }}
 */
export async function parseFile(buffer, filename) {
  const ext = filename.toLowerCase().split('.').pop();

  switch (ext) {
    case 'pdf': {
      console.log(`📖 Đang đọc PDF: ${filename}...`);
      const data = await pdfParse(buffer);
      return {
        text: data.text,
        pageCount: data.numpages || 0,
      };
    }

    case 'docx': {
      console.log(`📖 Đang đọc DOCX: ${filename}...`);
      const result = await mammoth.extractRawText({ buffer });
      // DOCX không có khái niệm "page" rõ ràng, ước lượng dựa trên ký tự
      const estimatedPages = Math.ceil(result.value.length / 3000);
      return {
        text: result.value,
        pageCount: estimatedPages,
      };
    }

    case 'txt': {
      console.log(`📖 Đang đọc TXT: ${filename}...`);
      const text = buffer.toString('utf-8');
      const estimatedPages = Math.ceil(text.length / 3000);
      return {
        text,
        pageCount: estimatedPages,
      };
    }

    default:
      throw new Error(`Định dạng file .${ext} không được hỗ trợ.`);
  }
}

/**
 * Xử lý tài liệu: Cắt nhỏ (Chunking) → Nhúng vector (Embedding) → Lưu Supabase
 * 
 * Chiến lược Chunking thông minh:
 * - chunkSize: 1000 ký tự - đủ dài để giữ ngữ cảnh
 * - chunkOverlap: 200 ký tự - gối đầu tránh mất thông tin khi cắt giữa câu
 * 
 * Metadata phong phú cho từng chunk:
 * - source: Tên tài liệu gốc
 * - upload_date: Ngày upload
 * - uploader: Email người upload
 * - page_estimate: Trang ước lượng
 * - chunk_index: Vị trí chunk trong tài liệu
 * - total_chunks: Tổng số chunks
 * - role_access: Phân quyền (MANAGER/USER)
 * 
 * @param {string} text - Nội dung text đã trích xuất
 * @param {Object} metadata - Thông tin file
 * @param {string} roleAccess - 'MANAGER' hoặc 'USER'
 * @returns {number} Số chunks đã tạo
 */
export async function processDocument(text, metadata, roleAccess = 'USER') {
  console.log('✂️  Đang cắt nhỏ tài liệu (Chunking)...');

  // Cấu hình Splitter với overlap để không mất ngữ cảnh
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200, // Gối đầu 200 ký tự - câu quan trọng ở biên sẽ không bị mất
  });

  // Tạo documents với metadata phong phú
  const uploadDate = new Date().toISOString();
  const docs = await splitter.createDocuments([text], [{
    source: metadata.filename,
    upload_date: uploadDate,
    uploader: metadata.uploaderEmail || 'unknown',
    page_count: metadata.pageCount || 0,
    role_access: roleAccess,
  }]);

  const totalChunks = docs.length;
  console.log(`📦 Đã cắt thành ${totalChunks} đoạn. Đang nhúng vector (Embedding)...`);

  // Nhúng và lưu từng chunk
  for (const [index, doc] of docs.entries()) {
    // Tạo vector embedding qua Gemini
    const vector = await embeddings.embedQuery(doc.pageContent);

    // Đóng gói metadata đầy đủ cho mỗi chunk
    const chunkMetadata = {
      ...doc.metadata,
      chunk_index: index,
      total_chunks: totalChunks,
      // Ước lượng trang dựa trên vị trí chunk
      page_estimate: metadata.pageCount > 0
        ? Math.ceil((index / totalChunks) * metadata.pageCount)
        : null,
    };

    const formattedVector = `[${vector.join(',')}]`;

    // Lưu vào Supabase (PostgreSQL + pgvector)
    await pool.query(
      `INSERT INTO enterprise_documents (content, metadata, embedding) VALUES ($1, $2, $3)`,
      [doc.pageContent, chunkMetadata, formattedVector]
    );

    // Log tiến độ mỗi 10 chunks
    if ((index + 1) % 10 === 0 || index === totalChunks - 1) {
      console.log(`  → Đã nhúng ${index + 1}/${totalChunks} chunks...`);
    }
  }

  console.log(`🎉 HOÀN THÀNH: ${totalChunks} chunks đã được nhúng và lưu vào Supabase.`);
  return totalChunks;
}

/**
 * Truy vấn Vector Database - Tìm documents liên quan nhất
 * Dùng cosine similarity (<=> operator của pgvector)
 * Có filter theo role_access
 * 
 * @param {string} query - Câu hỏi cần tìm context
 * @param {string} userRole - Role của user (ADMIN/USER)
 * @param {number} topK - Số kết quả tối đa
 * @returns {Array} Danh sách documents phù hợp nhất
 */
export async function searchDocuments(query, userRole = 'USER', topK = 5) {
  // Embed câu hỏi
  const queryVector = await embeddings.embedQuery(query);

  // Query với filter theo role
  // ADMIN xem được tất cả, USER chỉ xem role_access = 'USER'
  const roleFilter = userRole === 'ADMIN'
    ? '' // Admin xem tất cả
    : `WHERE metadata->>'role_access' = 'USER'`; // User chỉ xem tài liệu public

  const result = await pool.query(
    `SELECT content, metadata, 1 - (embedding <=> $1) as similarity 
     FROM enterprise_documents 
     ${roleFilter}
     ORDER BY embedding <=> $1 
     LIMIT $2`,
    [JSON.stringify(queryVector), topK]
  );

  return result.rows.map(row => ({
    content: row.content,
    metadata: row.metadata,
    similarity: parseFloat(row.similarity).toFixed(4),
  }));
}

// Export pool cho các service khác cần dùng
export { pool };

export default { parseFile, processDocument, searchDocuments };
