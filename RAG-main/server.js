import express from 'express';
import pg from 'pg';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import helmet from 'helmet';
import multer from 'multer';
import { GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { createRequire } from 'module';
import { Server } from 'socket.io';
import http from 'http';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: 'http://localhost:5173' } });

app.use(helmet({ contentSecurityPolicy: false })); 
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json({ limit: '10mb' }));

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const embeddings = new GoogleGenerativeAIEmbeddings({ model: "text-embedding-004", apiKey: process.env.GOOGLE_API_KEY });
const llm = new ChatGoogleGenerativeAI({ model: "gemini-1.5-flash", apiKey: process.env.GOOGLE_API_KEY, temperature: 0.1 });

// [STAGE 1] API ĐĂNG NHẬP
app.post('/api/v1/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === '123456') {
        const token = jwt.sign({ user: 'admin' }, process.env.JWT_SECRET || 'secret', { expiresIn: '8h' });
        return res.json({ success: true, token });
    }
    res.status(401).json({ error: "Sai tài khoản" });
});

// [STAGE 3] API UPLOAD & NẠP DỮ LIỆU
const upload = multer({ storage: multer.memoryStorage() });
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        const data = await pdfParse(req.file.buffer);
        const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
        const docs = await splitter.createDocuments([data.text], [{ source: req.file.originalname }]);

        for (const doc of docs) {
            const vector = await embeddings.embedQuery(doc.pageContent);
            await pool.query('INSERT INTO enterprise_documents (content, metadata, embedding) VALUES ($1, $2, $3)', 
            [doc.pageContent, doc.metadata, `[${vector.join(',')}]`]);
        }
        io.emit('security_alert', `Vừa nạp thành công: ${req.file.originalname}`);
        res.json({ success: true, chunks: docs.length });
    } catch (e) { res.status(500).json({ error: "Lỗi nạp file" }); }
});

// [STAGE 2] API CHAT THÔNG MINH
app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;
        const greetings = ['hi', 'hello', 'chào', 'alo'];
        const isGreeting = greetings.some(g => message.toLowerCase().includes(g));

        let context = "";
        if (!isGreeting) {
            const queryVector = await embeddings.embedQuery(message);
            const result = await pool.query('SELECT content FROM enterprise_documents ORDER BY embedding <=> $1 LIMIT 3', [JSON.stringify(queryVector)]);
            context = result.rows.map(r => r.content).join('\n\n');
        }

        const prompt = `Bạn là Trợ lý AI. Nếu chào hỏi hãy trả lời vui vẻ. Nếu hỏi nghiệp vụ, dùng ngữ cảnh: ${context || 'Không có'}. Nếu không thấy câu trả lời, hãy nói không tìm thấy.`;
        const response = await llm.invoke([["system", prompt], ["human", message]]);
        res.json({ answer: response.content });
    } catch (e) { res.status(500).json({ error: "Lỗi AI" }); }
});

server.listen(3000, () => console.log('🚀 Backend chạy tại port 3000'));