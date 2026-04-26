import express from 'express';
import pg from 'pg';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';

dotenv.config();
const { Pool } = pg;
const app = express();

// ==========================================
// 1. MIDDLEWARE BẢO MẬT CƠ BẢN
// ==========================================
app.use(helmet()); 
app.use(cors({ origin: 'http://localhost:5173', methods: ['GET', 'POST'] }));
app.use(express.json({ limit: '1mb' }));

// ==========================================
// 2. ĐỊNH NGHĨA RATE LIMIT (Fix lỗi "not defined")
// ==========================================
const aiApiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 phút
    max: 20, 
    message: { error: "Bạn đã hỏi AI quá nhiều lần. Vui lòng thử lại sau 15 phút!" },
    standardHeaders: true,
    legacyHeaders: false,
});

// ==========================================
// 3. KHỞI TẠO DATABASE VÀ AI
// ==========================================
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const embeddings = new GoogleGenerativeAIEmbeddings({
    model: "text-embedding-004", // Tên chuẩn của model nhúng Gemini
    apiKey: process.env.GOOGLE_API_KEY
});

// ==========================================
// 4. BẢO MẬT JWT TOKEN
// ==========================================
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: "Từ chối truy cập. Thiếu Token." });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Token không hợp lệ hoặc đã hết hạn." });
        req.user = user;
        next();
    });
};

// ==========================================
// 5. CÁC API ENDPOINT
// ==========================================

// Giả lập hàm gọi AI (Bạn có thể thêm logic RAG tìm kiếm DB vào đây sau)
async function queryAI(userQuestion) {
    return { 
        answer: "Hệ thống Backend đã kết nối thành công! Đây là câu trả lời thử nghiệm.", 
        traceability: [] 
    };
}

// API Đăng nhập
app.post('/api/v1/auth/login', async (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === '123456') {
        const userPayload = { id: 'user_123', role: 'MANAGER', username: 'admin' };
        const accessToken = jwt.sign(userPayload, process.env.JWT_SECRET, { expiresIn: '8h' });
        return res.json({ success: true, token: accessToken });
    }
    return res.status(401).json({ error: "Sai tên đăng nhập hoặc mật khẩu" });
});

// API Truy vấn (Có gắn aiApiLimiter và authenticateToken)
app.post('/api/v1/enterprise/query', aiApiLimiter, authenticateToken, async (req, res) => {
    try {
        const { question } = req.body;
        if (!question) return res.status(400).json({ error: "Câu hỏi không hợp lệ." });
        
        const response = await queryAI(question);
        
        res.status(200).json({
            success: true,
            data: response.answer,
            sources: response.traceability 
        });
    } catch (error) {
        console.error("Lỗi Server:", error);
        res.status(500).json({ error: "Lỗi xử lý hệ thống" });
    }
});

// Chạy Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Secure Enterprise Server đang chạy tại http://localhost:${PORT}`);
});