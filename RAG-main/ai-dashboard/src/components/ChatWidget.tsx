import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, User, Headphones, ThumbsUp, ThumbsDown, Flag, FileText } from 'lucide-react';
import { sendChatMessage } from '../services/api';

interface Message { id: number; sender: 'ai' | 'user' | 'system'; text: string; sources?: string[]; }
interface ChatWidgetProps { isDarkMode: boolean; lang: 'vi' | 'en'; isOpen: boolean; onClose: () => void; }

const ChatWidget: React.FC<ChatWidgetProps> = ({ isDarkMode, lang, isOpen, onClose }) => {
  const [chatMode, setChatMode] = useState<'ai' | 'admin'>('ai');
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, sender: 'ai', text: lang === 'vi' ? 'Xin chào! Tôi là RAG Assistant (Gemini). Tôi có thể giúp bạn tra cứu tài liệu nội bộ hoặc trả lời câu hỏi nghiệp vụ.' : 'Hello! I\'m RAG Assistant (Gemini). I can help you search documents or answer business questions.' }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);

  const handleToggleMode = () => {
    const newMode = chatMode === 'ai' ? 'admin' : 'ai';
    setChatMode(newMode);
    setMessages(prev => [...prev, { id: Date.now(), sender: 'system', text: newMode === 'ai' ? (lang === 'vi' ? 'Đã chuyển sang: AI Gemini' : 'Switched to AI Gemini') : (lang === 'vi' ? 'Đã chuyển sang: Gặp Admin' : 'Switched to Admin') }]);
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || isTyping) return;
    const userText = chatInput;
    setMessages(prev => [...prev, { id: Date.now(), sender: 'user', text: userText }]);
    setChatInput(''); setIsTyping(true);

    try {
      const data = await sendChatMessage(userText);
      setMessages(prev => [...prev, {
        id: Date.now() + 1, sender: 'ai', text: data.reply,
        sources: data.sources?.length > 0 ? data.sources : undefined
      }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'ai', text: lang === 'vi' ? 'Lỗi hệ thống AI. Vui lòng thử lại.' : 'AI system error.' }]);
    } finally { setIsTyping(false); }
  };

  if (!isOpen) return null;

  return (
    <div className={`w-[380px] h-[560px] rounded-2xl shadow-2xl flex flex-col overflow-hidden mb-4 transform transition-all origin-bottom-right ${isDarkMode ? 'bg-slate-800 border-none' : 'bg-white border border-slate-200'}`}>
      {/* Header */}
      <div className={`px-4 py-4 flex flex-col gap-3 text-white shadow-sm ${chatMode === 'ai' ? 'bg-gradient-to-r from-blue-600 to-indigo-600' : 'bg-gradient-to-r from-emerald-600 to-teal-600'}`}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="bg-white/20 p-2 rounded-lg shrink-0">{chatMode === 'ai' ? <Bot className="w-5 h-5" /> : <Headphones className="w-5 h-5" />}</div>
            <div>
              <span className="font-bold text-sm block">{chatMode === 'ai' ? 'RAG Assistant (Gemini)' : (lang === 'vi' ? 'Hỗ trợ Admin' : 'Admin Support')}</span>
              <span className="text-[11px] text-white/80 flex items-center gap-1.5 mt-0.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse"></span> {lang === 'vi' ? 'Sẵn sàng' : 'Online'}</span>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-1.5 rounded-full transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="bg-black/10 p-1 rounded-lg flex text-xs font-semibold">
          <button onClick={() => chatMode !== 'ai' && handleToggleMode()} className={`flex-1 py-1.5 text-center rounded-md transition-all ${chatMode === 'ai' ? 'bg-white text-blue-600 shadow-sm' : 'text-white/80 hover:text-white'}`}>AI</button>
          <button onClick={() => chatMode !== 'admin' && handleToggleMode()} className={`flex-1 py-1.5 text-center rounded-md transition-all ${chatMode === 'admin' ? 'bg-white text-emerald-600 shadow-sm' : 'text-white/80 hover:text-white'}`}>Admin</button>
        </div>
      </div>

      {/* Messages */}
      <div className={`flex-1 p-4 overflow-y-auto flex flex-col gap-3 text-sm ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
        {messages.map(msg => {
          if (msg.sender === 'system') return <div key={msg.id} className={`text-center text-[11px] font-medium my-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{msg.text}</div>;
          const isUser = msg.sender === 'user';
          return (
            <div key={msg.id} className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isUser ? (isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600') : 'bg-blue-600 text-white'}`}>
                {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>
              <div className="flex flex-col max-w-[80%]">
                <div className={`px-3.5 py-2.5 rounded-2xl shadow-sm text-[13px] leading-relaxed ${isUser ? 'bg-blue-600 text-white rounded-tr-none' : (isDarkMode ? 'bg-slate-800 text-slate-200 rounded-tl-none' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none')}`}>
                  {msg.text}
                </div>
                {/* Sources */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {msg.sources.map((src, i) => (
                      <span key={i} className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${isDarkMode ? 'bg-indigo-900/30 text-indigo-300 border border-indigo-500/30' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'}`}>
                        <FileText className="w-3 h-3" />{src}
                      </span>
                    ))}
                  </div>
                )}
                {/* Feedback buttons */}
                {!isUser && msg.sender === 'ai' && (
                  <div className={`flex items-center gap-1 mt-1 opacity-0 hover:opacity-100 transition-opacity ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    <button className={`p-1 rounded ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><ThumbsUp className="w-3 h-3" /></button>
                    <button className={`p-1 rounded ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><ThumbsDown className="w-3 h-3" /></button>
                    <button className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold ${isDarkMode ? 'hover:bg-red-900/50 hover:text-red-400' : 'hover:bg-red-50 hover:text-red-600'}`}><Flag className="w-3 h-3" /> Report</button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {isTyping && (
          <div className="flex gap-2 items-center">
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0"><Bot className="w-3.5 h-3.5" /></div>
            <div className={`px-3.5 py-3 rounded-2xl rounded-tl-none flex gap-1.5 ${isDarkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'}`}>
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className={`p-3 border-t flex gap-2 items-center ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
        <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} className={`flex-1 border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`} placeholder={lang === 'vi' ? 'Hỏi AI về tài liệu...' : 'Ask about documents...'} />
        <button type="submit" disabled={!chatInput.trim() || isTyping} className={`p-2.5 rounded-lg text-white shadow-md shrink-0 disabled:opacity-50 ${chatMode === 'ai' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}><Send className="w-4 h-4" /></button>
      </form>
    </div>
  );
};

export default ChatWidget;
