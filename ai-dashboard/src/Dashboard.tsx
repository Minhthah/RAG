import React, { useState, useEffect, useRef } from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend } from 'chart.js';
import { Brain, Home, Database, FileText, CheckSquare, BarChart3, Settings, Search, MessageCircle, X, Send, User, Bot, HeadphonesIcon, UploadCloud, File, CheckCircle2, TrendingUp, AlertCircle, FileUp } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend);

interface KPI {
  title: string;
  value: string | number;
  trend: number;
  trendText: string;
  icon: React.ReactNode;
  colorClass: string;
}

const Dashboard: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  
  // ================= STATE QUẢN LÝ MENU (TAB) =================
  const [activeTab, setActiveTab] = useState<'overview' | 'analyze' | 'results' | 'statistics'>('overview');

  // ================= STATE CHO BONG BÓNG CHAT (GEMINI) =================
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMode, setChatMode] = useState<'ai' | 'admin'>('ai');
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState([
    { id: 1, sender: 'ai', text: 'Xin chào! Tôi là Trợ lý AI (vận hành bởi Google Gemini). Tôi có thể giúp bạn phân tích file, bóc tách dữ liệu hoặc tìm kiếm thông tin gì hôm nay?' }
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleToggleMode = () => {
    const newMode = chatMode === 'ai' ? 'admin' : 'ai';
    setChatMode(newMode);
    setMessages(prev => [...prev, { 
      id: Date.now(), 
      sender: 'system', 
      text: newMode === 'ai' ? 'Đã chuyển sang chế độ: Trợ lý AI (Gemini).' : 'Đã chuyển sang chế độ: Kết nối Quản trị viên (Live Support).' 
    }]);
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput;
    setMessages(prev => [...prev, { id: Date.now(), sender: 'user', text: userText }]);
    setChatInput('');
    setIsTyping(true);

    // Mô phỏng gọi API Gemini từ Backend
    setTimeout(() => {
      setIsTyping(false);
      let replyText = '';
      if (chatMode === 'ai') {
        replyText = `[Gemini AI] Dựa trên kho dữ liệu của hệ thống, yêu cầu "${userText}" của bạn đã được phân tích. Dữ liệu này khớp với 3 tài liệu trong hệ thống. Bạn có muốn trích xuất chi tiết không?`;
      } else {
        replyText = `Chào bạn, mình là Admin. Mình đã nhận được vấn đề: "${userText}". Bạn chờ mình kiểm tra hệ thống nhé!`;
      }
      setMessages(prev => [...prev, { id: Date.now(), sender: chatMode, text: replyText }]);
    }, 1500);
  };

  // ================= DỮ LIỆU BIỂU ĐỒ TỔNG QUAN =================
  const kpiData: KPI[] = [
    { title: 'Tài liệu đã lập chỉ mục', value: '12.458', trend: 8.2, trendText: 'so với 7 ngày trước', icon: <Database className="w-5 h-5" />, colorClass: 'text-blue-600 bg-blue-100' },
    { title: 'Số lượng Chunks', value: '1.245.896', trend: 7.6, trendText: 'so với 7 ngày trước', icon: <FileText className="w-5 h-5" />, colorClass: 'text-emerald-600 bg-emerald-100' },
  ];

  const lineChartData = {
    labels: ['08/05', '09/05', '10/05', '11/05', '12/05', '13/05', '14/05', '15/05'],
    datasets: [
      { label: 'Tài liệu', data: [1200, 1400, 2100, 1600, 1800, 2180, 1800, 1400], borderColor: '#2563eb', tension: 0.3 },
      { label: 'Chunks', data: [600, 800, 1200, 900, 1000, 1500, 1100, 1000], borderColor: '#93c5fd', borderDash: [5, 5], tension: 0.3 }
    ]
  };

  const doughnutChartData = {
    labels: ['SharePoint', 'Confluence', 'File Server', 'Database', 'Web/Crawl', 'Khác'],
    datasets: [{ data: [38.7, 22.1, 16.4, 9.3, 7.8, 5.7], backgroundColor: ['#3b82f6', '#f97316', '#10b981', '#a855f7', '#64748b', '#38bdf8'], borderWidth: 0, cutout: '75%' }]
  };

  // ================= RENDER CÁC MÀN HÌNH CHỨC NĂNG =================
  
  const renderContent = () => {
    switch (activeTab) {
      // 1. MÀN HÌNH TỔNG QUAN
      case 'overview':
        return (
          <div className="animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {kpiData.map((kpi, index) => (
                <div key={index} className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${kpi.colorClass}`}>{kpi.icon}</div>
                  <div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">{kpi.title}</div>
                    <div className="text-2xl font-black text-slate-800 mb-1 leading-none">{kpi.value}</div>
                    <div className="text-xs font-medium text-emerald-600">↑ {kpi.trend}% <span className="text-slate-400 font-normal ml-1">{kpi.trendText}</span></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm p-6 flex flex-col h-80">
                <h3 className="font-bold text-slate-800 text-sm mb-4 shrink-0">Xu hướng Ingestion</h3>
                <div className="flex-1 relative w-full h-full min-h-0"><Line data={lineChartData} options={{ maintainAspectRatio: false }} /></div>
              </div>
              <div className="lg:col-span-1 bg-white rounded-xl border border-slate-100 shadow-sm p-6 flex flex-col h-80">
                <h3 className="font-bold text-slate-800 text-sm mb-4 shrink-0">Nguồn tài liệu</h3>
                <div className="flex-1 relative w-full h-full min-h-0 pb-4"><Doughnut data={doughnutChartData} options={{ maintainAspectRatio: false }} /></div>
              </div>
            </div>
          </div>
        );

      // 2. MÀN HÌNH PHÂN TÍCH & UPLOAD FILE
      case 'analyze':
        return (
          <div className="animate-in fade-in duration-300 space-y-6">
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-8">
              <h3 className="text-lg font-bold text-slate-800 mb-2">Tải tài liệu lên hệ thống</h3>
              <p className="text-sm text-slate-500 mb-6">AI Gemini sẽ đọc, cắt nhỏ (chunking) và bóc tách dữ liệu từ file của bạn để đưa vào kho tri thức vector.</p>
              
              <div className="border-2 border-dashed border-blue-200 bg-blue-50/50 hover:bg-blue-50 rounded-2xl p-12 text-center transition-colors cursor-pointer group">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <FileUp className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-slate-700 mb-1">Kéo thả file vào đây</h4>
                <p className="text-sm text-slate-500 mb-4">Hoặc bấm để chọn file (Hỗ trợ: PDF, DOCX, TXT - Tối đa 50MB)</p>
                <button className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-colors">
                  Chọn tệp từ máy tính
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-bold text-slate-800 mb-4">Cấu hình bóc tách (Gemini API)</h3>
              <div className="grid grid-cols-2 gap-6 text-sm">
                <div>
                  <label className="block text-slate-600 font-medium mb-2">Kích thước đoạn (Chunk size)</label>
                  <select className="w-full border border-slate-200 rounded-lg px-4 py-2 bg-slate-50 outline-none focus:border-blue-500">
                    <option>1000 ký tự (Khuyên dùng)</option>
                    <option>500 ký tự (Chính xác cao)</option>
                    <option>2000 ký tự (Bối cảnh rộng)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-2">Mô hình nhúng (Embedding Model)</label>
                  <select className="w-full border border-slate-200 rounded-lg px-4 py-2 bg-slate-50 outline-none focus:border-blue-500">
                    <option>models/embedding-001 (Gemini)</option>
                    <option>text-embedding-004 (Gemini Mới)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        );

      // 3. MÀN HÌNH KIỂM TRA KẾT QUẢ
      case 'results':
        return (
          <div className="animate-in fade-in duration-300">
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 flex flex-col h-[calc(100vh-160px)]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-800 text-lg">Danh sách dữ liệu đã bóc tách</h3>
                <button className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-lg text-sm font-medium border border-emerald-200 hover:bg-emerald-100 transition-colors">
                  <CheckCircle2 className="w-4 h-4 inline-block mr-1 -mt-0.5" /> Phê duyệt hàng loạt
                </button>
              </div>
              
              <div className="flex-1 overflow-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-500 sticky top-0">
                    <tr>
                      <th className="py-3 px-4 font-medium rounded-tl-lg">Tên tệp tin</th>
                      <th className="py-3 px-4 font-medium">Số đoạn (Chunks)</th>
                      <th className="py-3 px-4 font-medium">Trạng thái Vector</th>
                      <th className="py-3 px-4 font-medium">AI Đánh giá</th>
                      <th className="py-3 px-4 font-medium text-right rounded-tr-lg">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    <tr className="hover:bg-slate-50">
                      <td className="py-3 px-4 flex items-center gap-2"><File className="w-4 h-4 text-red-500"/> Bao_cao_tai_chinh_Q1.pdf</td>
                      <td className="py-3 px-4">124 chunks</td>
                      <td className="py-3 px-4"><span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Đã nhúng 100%</span></td>
                      <td className="py-3 px-4">Độ sạch: Cao</td>
                      <td className="py-3 px-4 text-right"><a href="#" className="text-blue-600 hover:underline">Xem chi tiết</a></td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-3 px-4 flex items-center gap-2"><File className="w-4 h-4 text-blue-500"/> Quy_trinh_nhan_su.docx</td>
                      <td className="py-3 px-4">45 chunks</td>
                      <td className="py-3 px-4"><span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Đã nhúng 100%</span></td>
                      <td className="py-3 px-4">Độ sạch: Rất Cao</td>
                      <td className="py-3 px-4 text-right"><a href="#" className="text-blue-600 hover:underline">Xem chi tiết</a></td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-3 px-4 flex items-center gap-2"><File className="w-4 h-4 text-orange-500"/> Huong_dan_ky_thuat_v2.txt</td>
                      <td className="py-3 px-4">12 chunks</td>
                      <td className="py-3 px-4"><span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">Đang xử lý (45%)</span></td>
                      <td className="py-3 px-4 text-slate-400">Đang phân tích...</td>
                      <td className="py-3 px-4 text-right"><a href="#" className="text-slate-400 cursor-not-allowed">Chưa sẵn sàng</a></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      // 4. MÀN HÌNH THỐNG KÊ THÔNG TIN
      case 'statistics':
        return (
          <div className="animate-in fade-in duration-300 space-y-6">
            <h3 className="font-bold text-slate-800 text-lg mb-2">Thống kê hữu ích (AI Insights)</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 text-white shadow-md">
                <TrendingUp className="w-8 h-8 mb-4 text-white/80" />
                <h4 className="text-lg font-bold mb-1">Chủ đề được hỏi nhiều nhất</h4>
                <p className="text-sm text-indigo-100 mb-4">"Quy trình thanh toán" và "Chính sách nhân sự" chiếm 68% lượng câu hỏi tuần qua.</p>
                <button className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors">Xem báo cáo chi tiết</button>
              </div>

              <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm">
                <AlertCircle className="w-8 h-8 mb-4 text-orange-500" />
                <h4 className="text-lg font-bold text-slate-800 mb-1">Cảnh báo lỗ hổng tri thức</h4>
                <p className="text-sm text-slate-500 mb-4">Hệ thống AI không tìm thấy câu trả lời cho 42 câu hỏi liên quan đến "Bảo hiểm thai sản 2024".</p>
                <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">Đề xuất bổ sung tài liệu →</button>
              </div>

              <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm">
                <Brain className="w-8 h-8 mb-4 text-emerald-500" />
                <h4 className="text-lg font-bold text-slate-800 mb-1">Hiệu suất Gemini AI</h4>
                <p className="text-sm text-slate-500 mb-4">Tốc độ truy xuất trung bình: 0.8 giây. Tỷ lệ câu trả lời được người dùng đánh giá Hữu ích: 94%.</p>
                <div className="w-full bg-slate-100 rounded-full h-2 mt-2">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '94%' }}></div>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 text-slate-800 font-sans">
      
      {/* ================= SIDEBAR MENU ================= */}
      <aside className="w-64 flex-shrink-0 bg-slate-900 text-white flex flex-col h-full shadow-xl z-20">
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
            <Brain className="text-white w-5 h-5" />
          </div>
          {/* Đổi chữ thành RAG theo yêu cầu */}
          <h1 className="text-xl font-black tracking-wider leading-tight truncate">RAG</h1>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <button onClick={() => setActiveTab('overview')} className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'overview' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <Home className="w-4 h-4 shrink-0" /> Tổng quan
          </button>
          
          <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
            <Database className="w-4 h-4 shrink-0" /> Kho tri thức
          </button>

          <div className="pt-6 pb-2 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Luồng xử lý dữ liệu
          </div>
          <button onClick={() => setActiveTab('analyze')} className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'analyze' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <UploadCloud className={`w-4 h-4 shrink-0 ${activeTab === 'analyze' ? 'text-white' : 'text-orange-400'}`} /> Phân tích & Bóc tách
          </button>
          <button onClick={() => setActiveTab('results')} className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'results' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <CheckSquare className={`w-4 h-4 shrink-0 ${activeTab === 'results' ? 'text-white' : 'text-emerald-400'}`} /> Kiểm tra kết quả
          </button>
          <button onClick={() => setActiveTab('statistics')} className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'statistics' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <BarChart3 className={`w-4 h-4 shrink-0 ${activeTab === 'statistics' ? 'text-white' : 'text-purple-400'}`} /> Thống kê thông tin
          </button>

          <div className="pt-6 pb-2 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Hệ thống
          </div>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
            <Settings className="w-4 h-4 shrink-0" /> Cài đặt
          </button>
        </nav>
      </aside>

      {/* ================= MAIN CONTENT ================= */}
      <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative z-10">
        
        {/* HEADER */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 shadow-sm">
          {/* Tiêu đề linh hoạt theo Tab */}
          <h2 className="text-lg font-bold text-slate-800 truncate">
            {activeTab === 'overview' && 'Tổng quan hệ thống'}
            {activeTab === 'analyze' && 'Phân tích & Tải lên Dữ liệu'}
            {activeTab === 'results' && 'Kiểm tra kết quả Bóc tách'}
            {activeTab === 'statistics' && 'Thống kê & Insight Hệ thống'}
          </h2>
          <div className="flex items-center gap-6">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm tài liệu, câu hỏi..." 
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-72 bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
            <div className="flex items-center gap-3 border-l pl-6 cursor-pointer hover:opacity-80 transition-opacity">
              <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md">AD</div>
              <div className="text-sm hidden sm:block">
                <div className="font-bold text-slate-800 leading-none mb-1">Admin</div>
                <div className="text-[11px] text-slate-500 leading-none">Quản trị viên</div>
              </div>
            </div>
          </div>
        </header>

        {/* NỘI DUNG THAY ĐỔI THEO TAB */}
        <div className="flex-1 overflow-y-auto p-8">
          {renderContent()}
        </div>
      </main>

      {/* ================= KHUNG CHAT & TRỢ LÝ ẢO (GEMINI) ================= */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        
        {isChatOpen && (
          <div className="bg-white w-[360px] h-[500px] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden mb-4 transform transition-all">
            
            {/* Header Khung Chat có Toggle */}
            <div className={`px-4 py-3 flex flex-col gap-3 text-white shadow-sm transition-colors duration-300 ${chatMode === 'ai' ? 'bg-gradient-to-r from-blue-600 to-indigo-600' : 'bg-gradient-to-r from-emerald-600 to-teal-600'}`}>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="bg-white/20 p-1.5 rounded-lg shrink-0">
                    {chatMode === 'ai' ? <Bot className="w-5 h-5 text-white" /> : <HeadphonesIcon className="w-5 h-5 text-white" />}
                  </div>
                  <div>
                    <span className="font-bold text-sm block">
                      {chatMode === 'ai' ? 'Trợ lý AI (Gemini)' : 'Hỗ trợ trực tuyến'}
                    </span>
                    <span className="text-[10px] text-white/80 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse"></span> Sẵn sàng
                    </span>
                  </div>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="hover:bg-white/20 p-1.5 rounded-full transition-colors">
                  <X className="w-5 h-5"/>
                </button>
              </div>

              {/* Công tắc chuyển đổi AI / Admin */}
              <div className="bg-black/10 p-1 rounded-lg flex text-xs font-medium relative">
                <button onClick={() => chatMode !== 'ai' && handleToggleMode()} className={`flex-1 py-1.5 text-center rounded-md transition-all z-10 ${chatMode === 'ai' ? 'bg-white text-blue-600 shadow-sm' : 'text-white/80 hover:text-white'}`}>
                  Gemini AI
                </button>
                <button onClick={() => chatMode !== 'admin' && handleToggleMode()} className={`flex-1 py-1.5 text-center rounded-md transition-all z-10 ${chatMode === 'admin' ? 'bg-white text-emerald-600 shadow-sm' : 'text-white/80 hover:text-white'}`}>
                  Gặp Admin
                </button>
              </div>
            </div>

            {/* Nội dung tin nhắn */}
            <div className="flex-1 p-4 overflow-y-auto bg-slate-50 flex flex-col gap-3 text-sm">
              {messages.map((msg) => {
                if (msg.sender === 'system') {
                  return <div key={msg.id} className="text-center text-[11px] text-slate-400 my-2">{msg.text}</div>;
                }
                
                const isUser = msg.sender === 'user';
                return (
                  <div key={msg.id} className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isUser ? 'bg-slate-200 text-slate-600' : (msg.sender === 'ai' ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white')}`}>
                      {isUser ? <User className="w-3.5 h-3.5" /> : (msg.sender === 'ai' ? <Bot className="w-3.5 h-3.5" /> : <HeadphonesIcon className="w-3.5 h-3.5" />)}
                    </div>
                    <div className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl shadow-sm leading-relaxed ${
                      isUser ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                );
              })}
              
              {isTyping && (
                <div className="flex gap-2 flex-row items-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${chatMode === 'ai' ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'}`}>
                     {chatMode === 'ai' ? <Bot className="w-3.5 h-3.5" /> : <HeadphonesIcon className="w-3.5 h-3.5" />}
                  </div>
                  <div className="bg-white border border-slate-100 px-3.5 py-3 rounded-2xl rounded-tl-none flex gap-1 items-center shadow-sm">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input gửi tin */}
            <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-100 flex gap-2 items-center">
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 border border-slate-200 bg-slate-50 rounded-full px-4 py-2 text-sm outline-none focus:border-blue-500 focus:bg-white transition-colors" 
                placeholder={chatMode === 'ai' ? "Hỏi Gemini phân tích..." : "Nhắn tin cho Admin..."}
              />
              <button 
                type="submit"
                disabled={!chatInput.trim() || isTyping}
                className={`p-2 rounded-full text-white transition-all shadow-md shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${chatMode === 'ai' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
              >
                <Send className="w-4 h-4 -ml-0.5 mt-0.5"/>
              </button>
            </form>
          </div>
        )}

        {/* Nút bật tắt Chat */}
        {!isChatOpen && (
          <button 
            onClick={() => setIsChatOpen(true)} 
            className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-full shadow-xl shadow-blue-500/30 flex items-center justify-center text-white transition-transform hover:scale-110 active:scale-95 group relative"
          >
            <MessageCircle className="w-6 h-6 group-hover:animate-pulse" />
            <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 border-2 border-slate-50 rounded-full animate-bounce"></span>
          </button>
        )}
      </div>

    </div>
  );
};

export default Dashboard;