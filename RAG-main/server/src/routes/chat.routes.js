// ============================================
// 💬 CHAT ROUTES - Smart AI Chat with RAG
// ============================================
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { chatLimiter } from '../middleware/rateLimiter.js';
import { classifyAndRespond } from '../services/chat.service.js';

const router = Router();

// Socket notifier - sẽ được inject từ index.js
let socketNotifier = null;
export function setSocketNotifier(notifier) {
  socketNotifier = notifier;
}

/**
 * POST /api/chat
 * Protected: Yêu cầu JWT token
 * Rate limited: 30 tin nhắn/phút
 * 
 * Body: { message: string }
 * Response: { reply: string, intent: string, mood: string, sources?: string[] }
 */
router.post('/chat', requireAuth, chatLimiter, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        error: 'InvalidInput',
        message: 'Tin nhắn không được để trống.',
      });
    }

    // Giới hạn độ dài tin nhắn (chống abuse)
    if (message.length > 2000) {
      return res.status(400).json({
        error: 'MessageTooLong',
        message: 'Tin nhắn quá dài. Tối đa 2000 ký tự.',
      });
    }

    // Gọi Smart Chat Service
    const result = await classifyAndRespond(message, req.user.role);

    // 🔔 Ping Admin qua Socket khi user gửi tin nhắn
    if (socketNotifier) {
      socketNotifier.notifyUserMessage(
        req.user.email,
        message
      );
    }

    res.json({
      reply: result.reply,
      intent: result.intent,
      mood: result.mood,
      sources: result.sources || [],
    });

  } catch (err) {
    console.error('❌ Chat route error:', err.message);
    res.status(500).json({
      error: 'AIError',
      message: 'Có lỗi xảy ra khi xử lý AI. Vui lòng thử lại.',
    });
  }
});

export default router;
