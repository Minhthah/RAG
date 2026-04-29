import React, { useState, useEffect, useRef } from 'react';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend } from 'chart.js';
import { Brain, Home, Database, FileText, CheckSquare, BarChart3, Settings, Search, MessageCircle, X, Send, User, Bot, Headphones, Upload, File, CheckCircle, TrendingUp, AlertCircle, Activity, Sun, Moon, Shield, ArrowLeft, Edit3, Trash2, FileSearch, Lock, Globe, ThumbsUp, ThumbsDown, Flag, History, Link, DollarSign, EyeOff, MessageSquare } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend);

// ================= TỪ ĐIỂN ĐA NGÔN NGỮ (I18N) ĐÃ ĐƯỢC KHÔI PHỤC ĐẦY ĐỦ =================
const i18n = {
  vi: {
    menu: {
      overview: 'Tổng quan', kb: 'Kho tri thức', pipeline: 'Luồng xử lý dữ liệu',
      analyze: 'Phân tích file', results: 'Kiểm tra kết quả', stats: 'Thống kê AI',
      audit: 'Quản trị & Giám sát', logs: 'Nhật ký kiểm toán',
      system: 'Hệ thống', integrations: 'Tích hợp đa kênh', settings: 'Cài đặt'
    },
    header: {
      overview: 'Tổng quan hệ thống', analyze: 'Phân tích & Tải lên Dữ liệu',
      results: 'Kiểm tra kết quả Bóc tách', statistics: 'Thống kê AI & Quản trị Chi phí',
      logs: 'Nhật ký Kiểm toán (Audit Logs)', integrations: 'Tích hợp API & Đa nền tảng',
      settings: 'Cài đặt hệ thống', search: 'Tìm kiếm tài liệu...', role: 'Quản trị viên'
    },
    settings: {
      title: 'Cài đặt hệ thống', uiTitle: 'Giao diện & Hiển thị',
      darkMode: 'Chế độ tối (Dark Mode)', darkDesc: 'Chuyển đổi giao diện để bảo vệ mắt khi làm việc ban đêm',
      language: 'Ngôn ngữ hệ thống', langDesc: 'Thay đổi ngôn ngữ hiển thị của toàn bộ nền tảng'
    },
    kpi: {
      docs: 'Tài liệu đã lập chỉ mục', chunks: 'Số lượng Chunks', latency: 'Độ trễ truy vấn (TB)', queue: 'Hàng đợi phê duyệt'
    }
  },
  en: {
    menu: {
      overview: 'Dashboard', kb: 'Knowledge Base', pipeline: 'Data Pipeline',
      analyze: 'Analyze Files', results: 'Check Results', stats: 'AI Statistics',
      audit: 'Governance', logs: 'Audit Logs',
      system: 'System', integrations: 'Omnichannel API', settings: 'Settings'
    },
    header: {
      overview: 'System Overview', analyze: 'Data Upload & Analysis',
      results: 'Extraction Results', statistics: 'AI Stats & Cost Management',
      logs: 'Security & Audit Logs', integrations: 'API & Omnichannel Integrations',
      settings: 'System Settings', search: 'Search documents...', role: 'Administrator'
    },
    settings: {
      title: 'System Settings', uiTitle: 'Appearance & Display',
      darkMode: 'Dark Mode', darkDesc: 'Toggle dark interface to protect your eyes at night',
      language: 'System Language', langDesc: 'Change the display language of the entire platform'
    },
    kpi: {
      docs: 'Indexed Documents', chunks: 'Total Chunks', latency: 'Avg. Query Latency', queue: 'Approval Queue'
    }
  }
};

interface KPI {
  titleKey: keyof typeof i18n['vi']['kpi'];
  value: string | number; trend: number; trendText: string;
  icon: React.ReactNode; colorClass: string;
}

interface Message {
  id: number; sender: 'ai' | 'admin' | 'user' | 'system'; text: string; sources?: string[];
  isMasked?: boolean;
}
interface ChunkData { id: number; text: string; }

import { useState as useStateOrig } from 'react';
interface DashboardProps {
  onLogout?: () => void;
  socket?: any;
}

const Dashboard: React.FC<DashboardProps> = ({ onLogout, socket }) => {
  const [lang, setLang] = useState<'vi' | 'en'>('vi');
  const t = i18n[lang];

  const [activeTab, setActiveTab] = useState<'overview' | 'analyze' | 'results' | 'statistics' | 'logs' | 'integrations' | 'settings'>('overview');
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ chunkCount: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMode, setChatMode] = useState<'ai' | 'admin'>('ai');
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([
    { id: 1, sender: 'ai', text: 'Xin chào! Tôi là Trợ lý AI (vận hành bởi Google Gemini). Tôi có thể giúp bạn phân tích file, bóc tách dữ liệu hoặc tìm kiếm thông tin gì hôm nay?' }
  ]);

  const [selectedFileForChunks, setSelectedFileForChunks] = useState<string | null>(null);
  const [chunksData, setChunksData] = useState<ChunkData[]>([
    { id: 1, text: "Quy trình xử lý nghỉ phép: Nhân viên cần nộp đơn trên hệ thống ERP trước 3 ngày. Giám đốc bộ phận sẽ phê duyệt trực tiếp." },
    { id: 2, text: "Trong trường hợp khẩn cấp (ốm đau, tai nạn), nhân viên có thể thông báo qua Email hoặc điện thoại cho quản lý trực tiếp và bổ sung giấy tờ sau." }
  ]);

  const handleDeleteChunk = (id: number) => {
    const isConfirm = window.confirm(lang === 'vi' ? "Xóa đoạn dữ liệu này?" : "Delete this chunk?");
    if (isConfirm) setChunksData(prev => prev.filter(chunk => chunk.id !== id));
  };

  const handleEditChunk = (id: number, currentText: string) => {
    const newText = window.prompt(lang === 'vi' ? "Chỉnh sửa nội dung:" : "Edit content:", currentText);
    if (newText !== null && newText.trim() !== "") {
      setChunksData(prev => prev.map(chunk => chunk.id === id ? { ...chunk, text: newText } : chunk));
    }
  };

  useEffect(() => {
    document.body.style.backgroundColor = isDarkMode ? '#0f172a' : '#f8fafc';
    document.body.style.margin = '0'; document.body.style.padding = '0'; document.body.style.overflow = 'hidden';
  }, [isDarkMode]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);

  const handleToggleMode = () => {
    const newMode = chatMode === 'ai' ? 'admin' : 'ai';
    setChatMode(newMode);
    setMessages(prev => [...prev, { id: Date.now(), sender: 'system', text: newMode === 'ai' ? (lang === 'vi' ? 'Đã chuyển sang: AI Gemini' : 'Switched to AI Gemini') : (lang === 'vi' ? 'Đã chuyển sang: Gặp Admin' : 'Switched to Admin') }]);
  };

  // --- SECURE AI CHAT (RAG + DLP + WebSocket Alert) ---
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;
    const userText = chatInput;
    setMessages(prev => [...prev, { id: Date.now(), sender: 'user', text: userText }]);
    setChatInput('');
    setIsTyping(true);
    try {
      const token = localStorage.getItem('ai_app_token');
      const res = await fetch((import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001') + '/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: userText })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { id: Date.now(), sender: 'ai', text: data.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { id: Date.now(), sender: 'ai', text: lang === 'vi' ? 'Lỗi hệ thống AI.' : 'AI system error.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const kpiData: KPI[] = [
    { titleKey: 'docs', value: '12.458', trend: 8.2, trendText: 'vs last week', icon: <Database className="w-5 h-5" />, colorClass: 'text-blue-600 bg-blue-100' },
    { titleKey: 'chunks', value: '1.245.896', trend: 7.6, trendText: 'vs last week', icon: <FileText className="w-5 h-5" />, colorClass: 'text-emerald-600 bg-emerald-100' },
    { titleKey: 'latency', value: '342 ms', trend: -12.1, trendText: 'improvement', icon: <Activity className="w-5 h-5" />, colorClass: 'text-purple-600 bg-purple-100' },
    { titleKey: 'queue', value: '27', trend: 0, trendText: 'pending', icon: <CheckSquare className="w-5 h-5" />, colorClass: 'text-orange-600 bg-orange-100' },
  ];

  const lineChartData = {
    labels: ['08/05', '09/05', '10/05', '11/05', '12/05', '13/05', '14/05', '15/05'],
    datasets: [
      { label: 'Tài liệu / Docs', data: [1200, 1400, 2100, 1600, 1800, 2180, 1800, 1400], borderColor: '#2563eb', tension: 0.3 },
      { label: 'Chunks', data: [600, 800, 1200, 900, 1000, 1500, 1100, 1000], borderColor: '#93c5fd', borderDash: [5, 5], tension: 0.3 }
    ]
  };

  const doughnutChartData = {
    labels: ['SharePoint', 'Confluence', 'File Server', 'Database', 'Web/Crawl'],
    datasets: [{ data: [38.7, 22.1, 16.4, 9.3, 13.5], backgroundColor: ['#3b82f6', '#f97316', '#10b981', '#a855f7', '#64748b'], borderWidth: 0, cutout: '75%' }]
  };

  const chartOptions = { 
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: isDarkMode ? '#cbd5e1' : '#475569' } } },
    scales: {
      x: { ticks: { color: isDarkMode ? '#94a3b8' : '#64748b' }, grid: { display: false } },
      y: { ticks: { color: isDarkMode ? '#94a3b8' : '#64748b' }, grid: { color: isDarkMode ? 'rgba(255,255,255,0.03)' : '#e2e8f0' }, border: { display: false } }
    }
  };

  const doughnutOptions = {
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: isDarkMode ? '#cbd5e1' : '#475569' } } },
  };

  const renderContent = () => {
    const cardClass = isDarkMode ? 'bg-slate-800 border-none shadow-md' : 'bg-white border border-slate-200 shadow-sm';
    const textColor = isDarkMode ? 'text-slate-100' : 'text-slate-800';
    const textMuted = isDarkMode ? 'text-slate-400' : 'text-slate-500';
    const borderClass = isDarkMode ? 'border-slate-700' : 'border-slate-200';

    switch (activeTab) {
      // ĐÃ KHÔI PHỤC LẠI BIỂU ĐỒ BỊ XÓA
      case 'overview':
        return (
          <div className="animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
              {kpiData.map((kpi, index) => (
                <div key={index} className={`${cardClass} rounded-xl p-5 hover:shadow-lg transition-shadow flex flex-col justify-between`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${kpi.colorClass}`}>{kpi.icon}</div>
                    <h3 className={`text-sm font-semibold leading-tight line-clamp-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t.kpi[kpi.titleKey]}</h3>
                  </div>
                  <div>
                    <div className={`text-2xl font-bold mb-1 ${textColor}`}>{kpi.value}</div>
                    <div className={`text-xs font-medium ${kpi.trend >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {kpi.trend >= 0 ? '↑' : '↓'} {Math.abs(kpi.trend)}% <span className={`font-normal ml-1 ${textMuted}`}>{lang === 'vi' ? 'so với tuần trước' : kpi.trendText}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
              <div className={`lg:col-span-2 ${cardClass} rounded-xl p-5 flex flex-col h-[360px]`}>
                <h3 className={`font-bold text-sm mb-4 shrink-0 ${textColor}`}>{lang === 'vi' ? 'Xu hướng Ingestion (Nạp dữ liệu)' : 'Ingestion Trends'}</h3>
                <div className="flex-1 relative w-full h-full min-h-0"><Line data={lineChartData} options={chartOptions} /></div>
              </div>
              <div className={`lg:col-span-1 ${cardClass} rounded-xl p-5 flex flex-col h-[360px]`}>
                <h3 className={`font-bold text-sm mb-4 shrink-0 ${textColor}`}>{lang === 'vi' ? 'Nguồn tài liệu bóc tách' : 'Document Sources'}</h3>
                <div className="flex-1 relative w-full h-full min-h-0 pb-2"><Doughnut data={doughnutChartData} options={doughnutOptions} /></div>
              </div>
            </div>
          </div>
        );

      case 'analyze':
        return (
          <div className="animate-in fade-in duration-300 space-y-6">
            <div className={`${cardClass} rounded-xl p-8`}>
              <h3 className={`text-lg font-bold mb-2 ${textColor}`}>{lang === 'vi' ? 'Tải tài liệu lên hệ thống' : 'Upload Documents'}</h3>
              <p className={`text-sm mb-8 ${textMuted}`}>
                {lang === 'vi'
                  ? 'AI Gemini sẽ đọc, phân tích ngữ nghĩa, cắt nhỏ (chunking) và gắn nhãn phân quyền tự động cho file của bạn.'
                  : 'Gemini AI will read, analyze, chunk, and assign role-based access to your files automatically.'}
              </p>
              <form
                className={`border-2 border-dashed rounded-2xl p-10 text-center transition-colors cursor-pointer group ${isDarkMode ? 'border-blue-500/30 bg-blue-900/10 hover:bg-blue-900/20' : 'border-blue-300 bg-blue-50/50 hover:bg-blue-50'}`}
                onSubmit={async (e) => { e.preventDefault(); }}
                onDrop={async (e) => {
                  e.preventDefault();
                  if (uploading) return;
                  const file = e.dataTransfer.files[0];
                  if (!file) return;
                  await handleFileUpload(file);
                }}
                onDragOver={e => e.preventDefault()}
              >
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform"><Upload className="w-8 h-8" /></div>
                <h4 className={`text-base font-bold mb-1 ${textColor}`}>{lang === 'vi' ? 'Kéo thả file vào đây' : 'Drag & drop files here'}</h4>
                <p className={`text-sm mb-5 ${textMuted}`}>{lang === 'vi' ? 'Hỗ trợ: PDF, DOCX - Tối đa 50MB' : 'Supports: PDF, DOCX - Max 50MB'}</p>
                <input
                  type="file"
                  accept=".pdf,.docx"
                  style={{ display: 'none' }}
                  id="file-upload-input"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) await handleFileUpload(file);
                  }}
                />
                <label htmlFor="file-upload-input">
                  <span className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium shadow-sm hover:bg-blue-700 transition-colors cursor-pointer inline-block mt-2">
                    {lang === 'vi' ? 'Chọn tệp từ máy tính' : 'Browse Files'}
                  </span>
                </label>
                {uploading && <div className="mt-4 text-blue-600 font-semibold flex items-center gap-2"><Loader2 className="animate-spin w-5 h-5" /> Đang tải lên...</div>}
                {uploadResult && <div className="mt-4 text-emerald-600 font-semibold">{lang === 'vi' ? `Tải lên thành công! Đã cắt thành ${uploadResult.chunkCount} đoạn.` : `Upload successful! ${uploadResult.chunkCount} chunks created.`}</div>}
              </form>
            </div>
          </div>
        );

  // --- SECURE UPLOAD PIPELINE ---
  async function handleFileUpload(file: File) {
    setUploading(true);
    setUploadResult(null);
    try {
      const token = localStorage.getItem('ai_app_token');
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch((import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001') + '/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUploadResult({ chunkCount: data.chunkCount });
      } else {
        setUploadResult(null);
        alert(lang === 'vi' ? 'Tải lên thất bại.' : 'Upload failed.');
      }
    } catch (err) {
      setUploadResult(null);
      alert(lang === 'vi' ? 'Tải lên thất bại.' : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

      case 'results':
        if (selectedFileForChunks) {
          return (
            <div className={`animate-in slide-in-from-right-8 duration-300 ${cardClass} rounded-xl p-6 flex flex-col h-[calc(100vh-140px)]`}>
              <div className={`flex items-center gap-4 mb-6 pb-4 border-b ${borderClass}`}>
                <button onClick={() => setSelectedFileForChunks(null)} className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}>
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h3 className={`font-bold text-lg flex items-center gap-2 ${textColor}`}>
                    <FileSearch className="w-5 h-5 text-blue-500"/> {lang === 'vi' ? 'Khám phá Chunks:' : 'Chunk Explorer:'} {selectedFileForChunks}
                  </h3>
                  <p className={`text-xs mt-1 ${textMuted}`}>
                    {lang === 'vi' ? `Tài liệu được cắt thành ${chunksData.length} đoạn (Chunks). Có thể chỉnh sửa để AI học lại.` : `Document chunked into ${chunksData.length} pieces. You can edit to retrain AI.`}
                  </p>
                </div>
              </div>
              
              <div className="flex-1 overflow-auto space-y-4 pr-2">
                {chunksData.map((chunk) => (
                  <div key={chunk.id} className={`p-4 rounded-xl border relative group transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200 hover:bg-white'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-xs font-bold px-2 py-1 rounded ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'}`}>Chunk #{chunk.id}</span>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEditChunk(chunk.id, chunk.text)} className="p-1.5 text-blue-500 hover:bg-blue-100 rounded" title={lang === 'vi' ? 'Sửa' : 'Edit'}><Edit3 className="w-4 h-4"/></button>
                        <button onClick={() => handleDeleteChunk(chunk.id)} className="p-1.5 text-red-500 hover:bg-red-100 rounded" title={lang === 'vi' ? 'Xóa' : 'Delete'}><Trash2 className="w-4 h-4"/></button>
                      </div>
                    </div>
                    <p className={`text-sm leading-relaxed ${textColor}`}>"{chunk.text}"</p>
                  </div>
                ))}
              </div>
            </div>
          );
        }

        return (
          <div className={`animate-in fade-in duration-300 ${cardClass} rounded-xl p-6 flex flex-col h-[calc(100vh-140px)]`}>
            <div className="flex justify-between items-center mb-5">
              <h3 className={`font-bold text-lg ${textColor}`}>{lang === 'vi' ? 'Quản lý Dữ liệu đã Bóc tách' : 'Extracted Data Management'}</h3>
              <div className="flex gap-3">
                <button className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${isDarkMode ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800 hover:bg-emerald-900/50' : 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100'}`}>
                  <CheckCircle className="w-4 h-4 inline-block mr-1.5 -mt-0.5" /> {lang === 'vi' ? 'Phê duyệt hàng loạt' : 'Bulk Approve'}
                </button>
              </div>
            </div>
            <div className={`flex-1 overflow-auto rounded-lg ${isDarkMode ? 'bg-slate-800' : 'border border-slate-100'}`}>
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className={`sticky top-0 z-10 ${isDarkMode ? 'bg-slate-900 text-slate-300' : 'bg-slate-50 text-slate-600 border-b border-slate-200'}`}>
                  <tr>
                    <th className="py-3 px-4 font-semibold">{lang === 'vi' ? 'Tên tệp tin' : 'Filename'}</th>
                    <th className="py-3 px-4 font-semibold">{lang === 'vi' ? 'Trạng thái Vector' : 'Vector Status'}</th>
                    <th className="py-3 px-4 font-semibold">{lang === 'vi' ? 'Mức bảo mật (RBAC)' : 'Security Level'}</th>
                    <th className="py-3 px-4 font-semibold text-right">{lang === 'vi' ? 'Khám phá' : 'Explore'}</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-slate-700 text-slate-300' : 'divide-slate-100 text-slate-700'}`}>
                  <tr className={`transition-colors ${isDarkMode ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'}`}>
                    <td className="py-4 px-4 flex items-center gap-2.5 font-medium"><File className="w-4 h-4 text-red-500"/> Luong_Thuong_GD_2024.pdf</td>
                    <td className="py-4 px-4"><span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${isDarkMode ? 'bg-green-900/40 text-green-400' : 'bg-green-100 text-green-700'}`}>100% Embedded</span></td>
                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center w-max gap-1.5 ${isDarkMode ? 'bg-red-900/40 text-red-400' : 'bg-red-100 text-red-700'}`}>
                        <Lock className="w-3 h-3"/> {lang === 'vi' ? 'Tuyệt mật (Chỉ BOD)' : 'Top Secret (BOD Only)'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right"><button onClick={() => setSelectedFileForChunks('Luong_Thuong_GD_2024.pdf')} className="text-blue-500 font-bold hover:underline">Chunks →</button></td>
                  </tr>
                  <tr className={`transition-colors ${isDarkMode ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'}`}>
                    <td className="py-4 px-4 flex items-center gap-2.5 font-medium"><File className="w-4 h-4 text-blue-500"/> Quy_trinh_nhan_su.docx</td>
                    <td className="py-4 px-4"><span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${isDarkMode ? 'bg-green-900/40 text-green-400' : 'bg-green-100 text-green-700'}`}>100% Embedded</span></td>
                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center w-max gap-1.5 ${isDarkMode ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                        <Shield className="w-3 h-3"/> {lang === 'vi' ? 'Nội bộ (Toàn công ty)' : 'Internal (All Staff)'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right"><button onClick={() => setSelectedFileForChunks('Quy_trinh_nhan_su.docx')} className="text-blue-500 font-bold hover:underline">Chunks →</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'statistics':
        return (
          <div className="animate-in fade-in duration-300 space-y-6">
            <h3 className={`font-bold text-lg mb-4 ${textColor}`}>{lang === 'vi' ? 'Quản trị Chi phí & ROI' : 'Cost & ROI Management'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-5 text-white shadow-md">
                <DollarSign className="w-6 h-6 mb-3 text-white/80" />
                <h4 className="text-sm font-medium mb-1 text-blue-100">{lang === 'vi' ? 'Chi phí API (Tháng)' : 'Monthly API Cost'}</h4>
                <div className="text-3xl font-bold">$124.50</div>
              </div>
              <div className={`${cardClass} rounded-xl p-5`}>
                <FileText className={`w-6 h-6 mb-3 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-500'}`} />
                <h4 className={`text-sm font-medium mb-1 ${textMuted}`}>{lang === 'vi' ? 'Tokens tiêu thụ' : 'Tokens Consumed'}</h4>
                <div className={`text-2xl font-bold ${textColor}`}>8.2M <span className="text-xs text-emerald-500 ml-1">↓ 2%</span></div>
              </div>
              <div className={`${cardClass} rounded-xl p-5`}>
                <MessageSquare className={`w-6 h-6 mb-3 ${isDarkMode ? 'text-purple-400' : 'text-purple-500'}`} />
                <h4 className={`text-sm font-medium mb-1 ${textMuted}`}>{lang === 'vi' ? 'Câu hỏi xử lý' : 'Queries Handled'}</h4>
                <div className={`text-2xl font-bold ${textColor}`}>14,250</div>
              </div>
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-5 text-white shadow-md">
                <TrendingUp className="w-6 h-6 mb-3 text-white/80" />
                <h4 className="text-sm font-medium mb-1 text-emerald-100">{lang === 'vi' ? 'Nhân sự tiết kiệm (ROI)' : 'Saved HR Hours (ROI)'}</h4>
                <div className="text-3xl font-bold">{lang === 'vi' ? '~475 Giờ' : '~475 Hrs'}</div>
              </div>
            </div>
            
            <div className={`w-full ${cardClass} rounded-xl p-6 h-[300px] flex items-center justify-center`}>
              <p className={textMuted}>{lang === 'vi' ? 'Biểu đồ tiêu thụ Token theo phòng ban sẽ hiển thị ở đây...' : 'Token consumption chart by department goes here...'}</p>
            </div>
          </div>
        );

      case 'logs':
        return (
          <div className={`animate-in fade-in duration-300 ${cardClass} rounded-xl p-6 flex flex-col h-[calc(100vh-140px)]`}>
            <div className="flex justify-between items-center mb-5">
              <h3 className={`font-bold text-lg flex items-center gap-2 ${textColor}`}><History className="w-5 h-5 text-orange-500"/> {lang === 'vi' ? 'Nhật ký Truy vấn & Cảnh báo' : 'Audit Logs & Alerts'}</h3>
              <button className="text-sm font-medium text-blue-500 border border-blue-200 px-3 py-1.5 rounded bg-blue-50 hover:bg-blue-100 transition-colors">Export CSV</button>
            </div>
            <div className={`flex-1 overflow-auto rounded-lg ${isDarkMode ? 'bg-slate-800' : 'border border-slate-100'}`}>
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className={`sticky top-0 z-10 ${isDarkMode ? 'bg-slate-900 text-slate-300' : 'bg-slate-50 text-slate-600 border-b border-slate-200'}`}>
                  <tr>
                    <th className="py-3 px-4 font-semibold">{lang === 'vi' ? 'Thời gian' : 'Time'}</th>
                    <th className="py-3 px-4 font-semibold">{lang === 'vi' ? 'Tài khoản User' : 'User Account'}</th>
                    <th className="py-3 px-4 font-semibold">{lang === 'vi' ? 'Trích xuất câu hỏi' : 'Query Extract'}</th>
                    <th className="py-3 px-4 font-semibold">{lang === 'vi' ? 'Mức rủi ro' : 'Risk Level'}</th>
                    <th className="py-3 px-4 font-semibold text-right">{lang === 'vi' ? 'Hành động AI' : 'AI Action'}</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-slate-700 text-slate-300' : 'divide-slate-100 text-slate-700'}`}>
                  <tr className={`transition-colors ${isDarkMode ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'}`}>
                    <td className="py-3 px-4 text-xs">28/04/2026 09:12:45</td>
                    <td className="py-3 px-4 font-medium">nguyenvana@congty.com</td>
                    <td className="py-3 px-4 truncate max-w-[200px]">{lang === 'vi' ? '"Số CCCD của tôi là 07909200..."' : '"My SSN is 07909200..."'}</td>
                    <td className="py-3 px-4"><span className="px-2 py-1 bg-red-100 text-red-700 rounded text-[10px] font-bold">DLP TRIGGERED</span></td>
                    <td className="py-3 px-4 text-right text-xs">{lang === 'vi' ? 'Che dấu dữ liệu (Masked)' : 'Data Masked'}</td>
                  </tr>
                  <tr className={`transition-colors ${isDarkMode ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'}`}>
                    <td className="py-3 px-4 text-xs">28/04/2026 09:10:11</td>
                    <td className="py-3 px-4 font-medium">tranb@congty.com</td>
                    <td className="py-3 px-4 truncate max-w-[200px]">{lang === 'vi' ? '"Bảng lương tháng 3 của giám đốc"' : '"Director salary in March"'}</td>
                    <td className="py-3 px-4"><span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-[10px] font-bold">RBAC BLOCKED</span></td>
                    <td className="py-3 px-4 text-right text-xs">{lang === 'vi' ? 'Từ chối truy cập' : 'Access Denied'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'integrations':
        return (
          <div className="animate-in fade-in duration-300 space-y-6">
            <h3 className={`font-bold text-xl mb-4 ${textColor}`}>{lang === 'vi' ? 'Tích hợp Đa nền tảng (Omnichannel)' : 'Omnichannel Integrations'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { name: 'Microsoft Teams', status: lang === 'vi' ? 'Đã kết nối' : 'Connected', color: 'bg-[#5558AF]', icon: 'M' },
                { name: 'Slack', status: lang === 'vi' ? 'Ngắt kết nối' : 'Disconnected', color: 'bg-[#E01E5A]', icon: 'S' },
                { name: 'Zalo OA Doanh Nghiệp', status: lang === 'vi' ? 'Ngắt kết nối' : 'Disconnected', color: 'bg-[#0068FF]', icon: 'Z' }
              ].map((app, idx) => (
                <div key={idx} className={`${cardClass} rounded-xl p-6 flex flex-col items-center text-center border-t-4 ${app.status === 'Đã kết nối' || app.status === 'Connected' ? 'border-t-emerald-500' : 'border-t-slate-200'}`}>
                  <div className={`w-14 h-14 ${app.color} text-white font-black text-2xl flex items-center justify-center rounded-xl mb-4 shadow-lg`}>{app.icon}</div>
                  <h4 className={`font-bold text-lg mb-1 ${textColor}`}>{app.name}</h4>
                  <p className={`text-xs font-semibold mb-5 ${app.status === 'Đã kết nối' || app.status === 'Connected' ? 'text-emerald-500' : textMuted}`}>{app.status}</p>
                  <button className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors ${app.status === 'Đã kết nối' || app.status === 'Connected' ? (isDarkMode ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200') : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'}`}>
                    {app.status === 'Đã kết nối' || app.status === 'Connected' ? (lang === 'vi' ? 'Cấu hình Webhook' : 'Webhook Config') : (lang === 'vi' ? 'Kết nối ngay' : 'Connect Now')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="animate-in fade-in duration-300 space-y-6">
            <h3 className={`font-bold text-xl mb-4 ${textColor}`}>{t.settings.title}</h3>
            <div className={`${cardClass} rounded-xl p-6 max-w-3xl`}>
              <h4 className={`text-xs font-bold uppercase tracking-wider mb-4 ${textMuted}`}>{t.settings.uiTitle}</h4>
              <div className={`flex items-center justify-between py-4 border-b ${borderClass}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}`}><Moon className="w-6 h-6 text-blue-400" /></div>
                  <div><div className={`font-bold text-base ${textColor}`}>{t.settings.darkMode}</div><div className={`text-sm ${textMuted}`}>{t.settings.darkDesc}</div></div>
                </div>
                <button onClick={() => setIsDarkMode(!isDarkMode)} className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none shadow-inner ${isDarkMode ? 'bg-blue-600' : 'bg-slate-300'}`}>
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${isDarkMode ? 'translate-x-8' : 'translate-x-1'}`} />
                </button>
              </div>
              <div className={`flex items-center justify-between py-4`}>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}`}><Globe className="w-6 h-6 text-indigo-500" /></div>
                  <div><div className={`font-bold text-base ${textColor}`}>{t.settings.language}</div><div className={`text-sm ${textMuted}`}>{t.settings.langDesc}</div></div>
                </div>
                <div className={`flex p-1 rounded-lg ${isDarkMode ? 'bg-slate-900' : 'bg-slate-200'}`}>
                  <button onClick={() => setLang('vi')} className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${lang === 'vi' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-400'}`}>VI</button>
                  <button onClick={() => setLang('en')} className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${lang === 'en' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-400'}`}>EN</button>
                </div>
              </div>
            </div>
          </div>
        );
        
      default: return <div/>;
    }
  };

  // --- WebSocket Security Alert (already handled in App.tsx with toast) ---

  return (
    <div className={`absolute inset-0 flex overflow-hidden font-sans transition-colors duration-300 ${isDarkMode ? 'bg-slate-900' : 'bg-[#f8fafc]'}`}>
      <aside className={`w-64 flex-shrink-0 flex flex-col h-full shadow-2xl z-20 transition-colors duration-300 ${isDarkMode ? 'bg-slate-950' : 'bg-slate-900'} text-white`}>
        <div className="h-16 flex items-center gap-3 px-6 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/30"><Brain className="text-white w-5 h-5" /></div>
          <h1 className="text-3xl font-black tracking-widest leading-tight text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.9)]">RAG</h1>
        </div>
        <nav className="flex-1 overflow-y-auto py-5 px-4 space-y-1.5">
          <button onClick={() => setActiveTab('overview')} className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'overview' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}><Home className="w-4 h-4 shrink-0" /> {t.menu.overview}</button>
          
          <div className="pt-6 pb-2 px-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">{t.menu.pipeline}</div>
          <button onClick={() => setActiveTab('analyze')} className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'analyze' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}><Upload className={`w-4 h-4 shrink-0 ${activeTab === 'analyze' ? 'text-white' : 'text-orange-400'}`} /> {t.menu.analyze}</button>
          <button onClick={() => setActiveTab('results')} className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'results' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}><CheckSquare className={`w-4 h-4 shrink-0 ${activeTab === 'results' ? 'text-white' : 'text-emerald-400'}`} /> {t.menu.results}</button>
          <button onClick={() => setActiveTab('statistics')} className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'statistics' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}><BarChart3 className={`w-4 h-4 shrink-0 ${activeTab === 'statistics' ? 'text-white' : 'text-purple-400'}`} /> {t.menu.stats}</button>
          
          <div className="pt-6 pb-2 px-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">{t.menu.audit}</div>
          <button onClick={() => setActiveTab('logs')} className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'logs' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}><Shield className={`w-4 h-4 shrink-0 ${activeTab === 'logs' ? 'text-white' : 'text-red-400'}`} /> {t.menu.logs}</button>
          
          <div className="pt-6 pb-2 px-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">{t.menu.system}</div>
          <button onClick={() => setActiveTab('integrations')} className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'integrations' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}><Globe className={`w-4 h-4 shrink-0 ${activeTab === 'integrations' ? 'text-white' : 'text-indigo-400'}`} /> {t.menu.integrations}</button>
          <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'settings' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}><Settings className="w-4 h-4 shrink-0" /> {t.menu.settings}</button>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative z-10">
        <header className={`h-16 flex items-center justify-between px-6 shrink-0 shadow-sm transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-none' : 'bg-white border-b border-slate-200'}`}>
          <h2 className={`text-lg font-bold truncate ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
             {activeTab === 'overview' && t.header.overview}
             {activeTab === 'analyze' && t.header.analyze}
             {activeTab === 'results' && t.header.results}
             {activeTab === 'statistics' && t.header.statistics}
             {activeTab === 'logs' && t.header.logs}
             {activeTab === 'integrations' && t.header.integrations}
             {activeTab === 'settings' && t.header.settings}
          </h2>
          <div className="flex items-center gap-5">
            <div className="relative hidden lg:block">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder={t.header.search} className={`pl-10 pr-4 py-2 border rounded-lg text-sm w-64 outline-none transition-all focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white focus:bg-slate-800' : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white'}`} />
            </div>
            <div className={`flex items-center gap-3 border-l pl-5 cursor-pointer hover:opacity-80 transition-opacity ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
              <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md">AD</div>
              <div className="text-sm hidden sm:block">
                <div className={`font-bold leading-none mb-1 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Admin</div>
                <div className={`text-[11px] leading-none ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t.header.role}</div>
              </div>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-x-hidden overflow-y-auto p-6 w-full">{renderContent()}</div>
      </main>

      {/* ================= KHUNG CHAT & TRỢ LÝ ẢO ================= */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {isChatOpen && (
          <div className={`w-[360px] h-[540px] rounded-2xl shadow-2xl flex flex-col overflow-hidden mb-4 transform transition-all origin-bottom-right ${isDarkMode ? 'bg-slate-800 border-none' : 'bg-white border border-slate-200'}`}>
            <div className={`px-4 py-4 flex flex-col gap-3 text-white shadow-sm transition-colors duration-300 ${chatMode === 'ai' ? 'bg-gradient-to-r from-blue-600 to-indigo-600' : 'bg-gradient-to-r from-emerald-600 to-teal-600'}`}>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="bg-white/20 p-2 rounded-lg shrink-0">{chatMode === 'ai' ? <Bot className="w-5 h-5 text-white" /> : <Headphones className="w-5 h-5 text-white" />}</div>
                  <div>
                    <span className="font-bold text-sm block">{chatMode === 'ai' ? (lang === 'vi' ? 'Trợ lý AI (Gemini)' : 'AI Assistant (Gemini)') : (lang === 'vi' ? 'Hỗ trợ trực tuyến' : 'Live Support')}</span>
                    <span className="text-[11px] text-white/80 flex items-center gap-1.5 mt-0.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse"></span> {lang === 'vi' ? 'Sẵn sàng' : 'Online'}</span>
                  </div>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="hover:bg-white/20 p-1.5 rounded-full transition-colors"><X className="w-5 h-5"/></button>
              </div>
              
              {/* ĐÃ KHÔI PHỤC LẠI NÚT CHUYỂN ĐỔI (TOGGLE ADMIN/AI) BỊ XÓA */}
              <div className="bg-black/10 p-1 rounded-lg flex text-xs font-semibold relative">
                <button onClick={() => chatMode !== 'ai' && handleToggleMode()} className={`flex-1 py-1.5 text-center rounded-md transition-all z-10 ${chatMode === 'ai' ? 'bg-white text-blue-600 shadow-sm' : 'text-white/80 hover:text-white'}`}>{lang === 'vi' ? 'AI Trả lời' : 'AI Reply'}</button>
                <button onClick={() => chatMode !== 'admin' && handleToggleMode()} className={`flex-1 py-1.5 text-center rounded-md transition-all z-10 ${chatMode === 'admin' ? 'bg-white text-emerald-600 shadow-sm' : 'text-white/80 hover:text-white'}`}>{lang === 'vi' ? 'Gặp Admin' : 'Talk to Admin'}</button>
              </div>
            </div>
            
            <div className={`flex-1 p-4 overflow-y-auto flex flex-col gap-4 text-sm ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
              {messages.map((msg) => {
                if (msg.sender === 'system') return <div key={msg.id} className={`text-center text-[11px] font-medium my-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{msg.text}</div>;
                const isUser = msg.sender === 'user';
                return (
                  <div key={msg.id} className={`flex gap-2.5 flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'} max-w-full`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isUser ? (isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600') : (msg.sender === 'ai' ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white')}`}>{isUser ? <User className="w-3.5 h-3.5" /> : (msg.sender === 'ai' ? <Bot className="w-3.5 h-3.5" /> : <Headphones className="w-3.5 h-3.5" />)}</div>
                      
                      <div className="flex flex-col">
                        <div className={`px-3.5 py-2.5 rounded-2xl shadow-sm leading-relaxed text-[13px] ${isUser ? 'bg-blue-600 text-white rounded-tr-none' : (isDarkMode ? 'bg-slate-800 text-slate-200 rounded-tl-none' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none')} ${msg.isMasked ? 'border-orange-500 border-2' : ''}`}>
                          {msg.text}
                        </div>

                        {!isUser && msg.sender === 'ai' && (
                          <div className={`flex items-center gap-1.5 mt-1.5 opacity-60 hover:opacity-100 transition-opacity ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            <button className={`p-1.5 rounded-md transition-colors ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`} title="Câu trả lời tốt"><ThumbsUp className="w-3 h-3" /></button>
                            <button className={`p-1.5 rounded-md transition-colors ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`} title="Câu trả lời chưa tốt"><ThumbsDown className="w-3 h-3" /></button>
                            <button className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold transition-colors ${isDarkMode ? 'hover:bg-red-900/50 hover:text-red-400' : 'hover:bg-red-50 hover:text-red-600'}`}>
                              <Flag className="w-3 h-3" /> {lang === 'vi' ? 'Báo cáo sai lệch' : 'Report Hallucination'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {msg.sources && (
                      <div className={`flex flex-wrap gap-1.5 mt-1 ml-10`}>
                        {msg.sources.map((source, idx) => (
                          <div key={idx} className={`flex items-center gap-1 px-2 py-1 rounded border text-[10px] font-medium cursor-pointer hover:opacity-80 transition-opacity ${isDarkMode ? 'bg-indigo-900/30 border-indigo-500/30 text-indigo-300' : 'bg-indigo-50 border-indigo-100 text-indigo-600'}`}><FileText className="w-3 h-3" /> {source}</div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {isTyping && (
                <div className="flex gap-2.5 flex-row items-center"><div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${chatMode === 'ai' ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'}`}>{chatMode === 'ai' ? <Bot className="w-3.5 h-3.5" /> : <Headphones className="w-3.5 h-3.5" />}</div><div className={`px-3.5 py-3.5 rounded-2xl rounded-tl-none flex gap-1.5 items-center shadow-sm border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}><span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span><span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75"></span><span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></span></div></div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className={`p-3 border-t flex gap-2.5 items-center ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
              <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} className={`flex-1 border rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white focus:bg-slate-800' : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white'}`} placeholder={chatMode === 'ai' ? (lang === 'vi' ? "Thử nhập chuỗi 12 số bất kỳ..." : "Type a 12-digit number...") : (lang === 'vi' ? "Nhắn cho Admin..." : "Message Admin...")}/>
              <button type="submit" disabled={!chatInput.trim() || isTyping} className={`p-2.5 rounded-lg text-white transition-all shadow-md shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${chatMode === 'ai' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}><Send className="w-4 h-4 -ml-0.5 mt-0.5"/></button>
            </form>
          </div>
        )}
        {!isChatOpen && (
          <button onClick={() => setIsChatOpen(true)} className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-full shadow-xl shadow-blue-500/40 flex items-center justify-center text-white transition-transform hover:scale-110 active:scale-95 group relative">
            <MessageCircle className="w-6 h-6 group-hover:animate-pulse" /><span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 border-2 border-slate-50 rounded-full animate-bounce"></span>
          </button>
        )}
      </div>
    </div>
  );
};

export default Dashboard;