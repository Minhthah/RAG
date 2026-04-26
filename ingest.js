import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

import fs from 'fs';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pg;

// Kết nối DB và khởi tạo model OpenAI
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const embeddings = new GoogleGenerativeAIEmbeddings({
    model: "gemini-embedding-001", // Siêu model nhúng thế hệ mới nhất của Google!
    apiKey: process.env.GOOGLE_API_KEY
});

async function processDocument(filePath) {
    try {
        console.log(`1. Đang đọc nội dung file: ${filePath}...`);
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        const rawText = data.text;

        console.log("2. Đang cắt nhỏ tài liệu để giữ ngữ cảnh (Chunking)...");
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });
        const docs = await splitter.createDocuments([rawText], [{ 
            source: filePath, 
            role_access: 'MANAGER' // Gắn nhãn phân quyền
        }]);

        console.log(`3. Đã cắt thành ${docs.length} đoạn. Đang nhúng (Embedding) và lưu vào Supabase...`);
        for (const [index, doc] of docs.entries()) {
            // Biến text thành vector (Gọi API OpenAI)
            const vector = await embeddings.embedQuery(doc.pageContent);
            
            // Đóng gói metadata
            const metadata = { ...doc.metadata, chunk_index: index };
            const formattedVector = `[${vector.join(',')}]`;
            
            // Lưu vào PostgreSQL (Supabase)
            await pool.query(
                `INSERT INTO enterprise_documents (content, metadata, embedding) VALUES ($1, $2, $3)`,
                [doc.pageContent, metadata, formattedVector]
            );
        }
        
        console.log("🎉 THÀNH CÔNG! Bộ não AI đã nạp xong kiến thức mới.");
        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error("❌ Có lỗi xảy ra:", error.message);
        await pool.end();
        process.exit(1);
    }
}

// Gọi hàm chạy với tên file bạn vừa chuẩn bị
processDocument('./Tài Liệu.pdf');