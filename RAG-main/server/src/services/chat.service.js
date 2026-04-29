// ============================================
// 🧠 CHAT SERVICE - Smart LLM Routing
// Ứng dụng Tâm lý học: Mirroring + Fallback mượt mà
// ============================================
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { searchDocuments } from './document.service.js';
import config from '../config/env.js';

// --- Khởi tạo Gemini LLM ---
const llm = new ChatGoogleGenerativeAI({
  model: 'gemini-2.0-flash',
  apiKey: config.GOOGLE_API_KEY,
  temperature: 0.3, // Cân bằng giữa sáng tạo và chính xác
});

// ============================================
// 🎭 SYSTEM PROMPT CAO CẤP
// Kết hợp: Intent Classification + Mirroring + Smart Fallback
// ============================================
const SYSTEM_PROMPT = `
Bạn là một Trợ lý AI thông minh của hệ thống nội bộ doanh nghiệp, được vận hành bởi Google Gemini.
Tên bạn là "RAG Assistant". Bạn có nhiệm vụ hỗ trợ nhân viên tra cứu tài liệu và giải đáp thắc mắc.

═══════════════════════════════════════
QUY TẮC PHÂN LOẠI INTENT (BẮT BUỘC)
═══════════════════════════════════════

Bạn PHẢI phân loại mỗi tin nhắn của người dùng thành 1 trong 2 loại:

1. "greeting" — Chào hỏi, tán gẫu, hỏi thăm sức khỏe, nói chuyện phiếm
   Ví dụ: "Hi", "Hello", "Chào bạn", "Bạn khỏe không?", "Cảm ơn", "Tạm biệt"
   → Trả lời trực tiếp, thân thiện, KHÔNG tra cứu tài liệu.

2. "business" — Câu hỏi nghiệp vụ, chuyên môn, chính sách, quy trình
   Ví dụ: "Quy trình nghỉ phép?", "Chính sách lương?", "Làm sao để...", "Theo quy định..."
   → CẦN tra cứu tài liệu nội bộ để trả lời chính xác.

═══════════════════════════════════════
KỸ THUẬT MIRRORING (PHẢN CHIẾU TÂM LÝ)
═══════════════════════════════════════

Hãy phân tích THÁI ĐỘ và NĂNG LƯỢNG của người dùng từ cách họ viết:

🔥 Người dùng ĐANG VỘI hoặc CĂNG THẲNG:
   - Dấu hiệu: viết ngắn, dùng "!", viết tắt, không chào hỏi, hỏi trực tiếp
   - Phản hồi: Ngắn gọn, đi thẳng vào vấn đề, bullet points, không lan man
   - Ví dụ user: "cho tôi quy trình xin nghỉ phép ngay" → Trả lời ngay, không mở đầu dài

😊 Người dùng VUI VẺ hoặc THOẢI MÁI:
   - Dấu hiệu: dùng emoji, chào hỏi, viết đầy đủ câu, tone thân thiện
   - Phản hồi: Nhiệt tình, thêm emoji phù hợp, có thể dẫn dắt vào tính năng
   - Ví dụ user: "Chào bạn 😄 Cho mình hỏi..." → Phản hồi vui vẻ tương xứng

😐 Người dùng TRUNG TÍNH:
   - Dấu hiệu: viết bình thường, không có dấu hiệu đặc biệt
   - Phản hồi: Chuyên nghiệp, rõ ràng, đủ chi tiết

═══════════════════════════════════════
FALLBACK THÔNG MINH (KHÔNG BAO GIỜ BÁO LỖI KHÔ KHAN)
═══════════════════════════════════════

Khi KHÔNG TÌM THẤY tài liệu phù hợp, TUYỆT ĐỐI KHÔNG nói:
  ❌ "Tôi không tìm thấy tài liệu."
  ❌ "Không có thông tin."

Thay vào đó, hãy:
  ✅ Đặt câu hỏi ngược để khai thác thêm thông tin:
     "Bạn có thể cho mình biết thêm ngữ cảnh không? Ví dụ đây là tài liệu thuộc phòng ban nào?"
  ✅ Gợi ý cách tìm kiếm khác:
     "Mình chưa tìm thấy thông tin chính xác. Bạn thử hỏi cụ thể hơn nhé, ví dụ: 'Quy trình nghỉ phép cho nhân viên chính thức'"
  ✅ Đề xuất liên hệ Admin:
     "Câu hỏi này có vẻ cần thông tin mới nhất. Bạn có muốn mình chuyển sang kênh hỗ trợ Admin không?"

═══════════════════════════════════════
TRÍCH DẪN NGUỒN (KHI CÓ TÀI LIỆU)
═══════════════════════════════════════

Khi trả lời dựa trên tài liệu, LUÔN trích dẫn nguồn ở cuối câu trả lời:
  📄 "Theo tài liệu [Tên tài liệu] (Trang ~X), ..."

═══════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════

Bạn PHẢI trả lời bằng JSON hợp lệ (không có markdown, không có \`\`\`):
{
  "intent": "greeting" hoặc "business",
  "mood": "urgent" hoặc "friendly" hoặc "neutral",
  "reply": "Nội dung trả lời đầy đủ"
}
`.trim();

/**
 * Phân loại intent và tạo câu trả lời thông minh
 * 
 * Flow:
 * 1. Gửi tin nhắn + System Prompt → Gemini phân loại intent + mood
 * 2. Nếu greeting → Return reply trực tiếp (KHÔNG query DB, tiết kiệm tài nguyên)
 * 3. Nếu business → Search Vector DB → Gọi Gemini lần 2 với context
 * 
 * @param {string} message - Tin nhắn từ user
 * @param {string} userRole - Role: 'ADMIN' | 'USER'
 * @returns {{ intent, mood, reply, sources? }}
 */
export async function classifyAndRespond(message, userRole = 'USER') {
  try {
    // ========== BƯỚC 1: Phân loại Intent + Mood ==========
    console.log(`🧠 Đang phân tích intent cho: "${message.substring(0, 50)}..."`);

    const classifyResponse = await llm.invoke([
      ['system', SYSTEM_PROMPT],
      ['human', message],
    ]);

    let parsed;
    try {
      // Cố parse JSON từ response
      let responseText = classifyResponse.content;
      // Loại bỏ markdown code blocks nếu có
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(responseText);
    } catch (parseErr) {
      // Nếu Gemini không trả JSON → coi như greeting, dùng raw text
      console.warn('⚠️  Gemini không trả JSON, fallback sang greeting...');
      parsed = {
        intent: 'greeting',
        mood: 'neutral',
        reply: classifyResponse.content,
      };
    }

    const { intent, mood } = parsed;
    console.log(`  → Intent: ${intent} | Mood: ${mood}`);

    // ========== BƯỚC 2: Xử lý theo Intent ==========

    // 🗣️ GREETING → Trả lời trực tiếp, KHÔNG tra cứu DB
    if (intent === 'greeting') {
      return {
        intent: 'greeting',
        mood,
        reply: parsed.reply,
        sources: [],
      };
    }

    // 📚 BUSINESS → Tra cứu Vector DB rồi trả lời
    console.log(`📚 Đang tra cứu tài liệu nội bộ (role: ${userRole})...`);
    const documents = await searchDocuments(message, userRole, 5);

    if (documents.length === 0) {
      // Không tìm thấy tài liệu → Dùng Fallback thông minh
      console.log('📭 Không tìm thấy tài liệu phù hợp → Kích hoạt Smart Fallback');

      const fallbackResponse = await llm.invoke([
        ['system', `${SYSTEM_PROMPT}\n\nBỐI CẢNH: Không tìm thấy tài liệu nào phù hợp trong database. Hãy áp dụng kỹ thuật FALLBACK THÔNG MINH: đặt câu hỏi ngược, gợi ý cách tìm khác, hoặc đề xuất liên hệ Admin. LUÔN trả JSON.`],
        ['human', message],
      ]);

      let fallbackParsed;
      try {
        let text = fallbackResponse.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        fallbackParsed = JSON.parse(text);
      } catch {
        fallbackParsed = { reply: fallbackResponse.content };
      }

      return {
        intent: 'business',
        mood,
        reply: fallbackParsed.reply || fallbackResponse.content,
        sources: [],
        noDocumentsFound: true,
      };
    }

    // Có tài liệu → Tạo context và gọi Gemini lần 2
    const context = documents
      .map((doc, i) => {
        const src = doc.metadata?.source || 'Không rõ nguồn';
        const page = doc.metadata?.page_estimate || '?';
        return `[Nguồn ${i + 1}: ${src} - Trang ~${page}]\n${doc.content}`;
      })
      .join('\n\n---\n\n');

    const sources = [...new Set(
      documents
        .map(d => d.metadata?.source)
        .filter(Boolean)
    )];

    console.log(`📄 Tìm thấy ${documents.length} đoạn từ ${sources.length} tài liệu.`);

    // Gọi Gemini lần 2 với context từ tài liệu
    const contextResponse = await llm.invoke([
      ['system', `${SYSTEM_PROMPT}\n\nBỐI CẢNH TÀI LIỆU NỘI BỘ:\n${context}\n\nHãy trả lời dựa CHÍNH XÁC vào nội dung tài liệu trên. Trích dẫn nguồn ở cuối. LUÔN trả JSON.`],
      ['human', message],
    ]);

    let contextParsed;
    try {
      let text = contextResponse.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      contextParsed = JSON.parse(text);
    } catch {
      contextParsed = { reply: contextResponse.content };
    }

    return {
      intent: 'business',
      mood,
      reply: contextParsed.reply || contextResponse.content,
      sources,
    };

  } catch (err) {
    console.error('❌ Chat Service Error:', err.message);
    throw new Error('Lỗi xử lý AI. Vui lòng thử lại.');
  }
}

export default { classifyAndRespond };
