import React, { useState, useEffect } from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend } from 'chart.js';
import { Brain, Home, Database, FileText, CheckSquare, BarChart3, Settings, Search, MessageCircle, Upload, Activity, Sun, Moon, Shield, Globe, Lock, File, ArrowLeft, Edit3, Trash2, FileSearch, CheckCircle, TrendingUp, DollarSign, MessageSquare, History } from 'lucide-react';
import FileUploadComponent from './FileUpload';
import ChatWidget from './ChatWidget';
import AdminNotification from './AdminNotification';
import type { UserInfo } from '../services/api';
import type { Notification } from '../hooks/useSocket';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend);

interface DashboardProps {
  user: UserInfo | null;
  onLogout: () => void;
  socket?: any;
  isSocketConnected?: boolean;
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead: (id: number) => void;
  onMarkAllAsRead: () => void;
  onClearNotifications: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout, notifications, unreadCount, onMarkAsRead, onMarkAllAsRead, onClearNotifications }) => {
  const [lang, setLang] = useState<'vi'|'en'>('vi');
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedFileForChunks, setSelectedFileForChunks] = useState<string|null>(null);
  const [chunksData, setChunksData] = useState([
    { id: 1, text: "Quy trình xử lý nghỉ phép: Nhân viên cần nộp đơn trên hệ thống ERP trước 3 ngày." },
    { id: 2, text: "Trong trường hợp khẩn cấp, nhân viên có thể thông báo qua Email hoặc điện thoại." }
  ]);

  useEffect(() => {
    document.body.style.backgroundColor = isDarkMode ? '#0f172a' : '#f8fafc';
    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden';
  }, [isDarkMode]);

  const t = {
    menu: lang === 'vi' ? { overview:'Tổng quan', pipeline:'Luồng xử lý', analyze:'Phân tích file', results:'Kiểm tra kết quả', stats:'Thống kê AI', audit:'Giám sát', logs:'Nhật ký', system:'Hệ thống', integrations:'Tích hợp', settings:'Cài đặt' }
      : { overview:'Dashboard', pipeline:'Pipeline', analyze:'Upload', results:'Results', stats:'AI Stats', audit:'Governance', logs:'Audit Logs', system:'System', integrations:'Integrations', settings:'Settings' },
    kpi: lang === 'vi' ? { docs:'Tài liệu đã lập chỉ mục', chunks:'Số lượng Chunks', latency:'Độ trễ truy vấn', queue:'Hàng đợi' }
      : { docs:'Indexed Documents', chunks:'Total Chunks', latency:'Avg Latency', queue:'Queue' }
  };

  const kpiData = [
    { title: t.kpi.docs, value: '12.458', trend: 8.2, icon: <Database className="w-5 h-5"/>, color: 'text-blue-600 bg-blue-100' },
    { title: t.kpi.chunks, value: '1.245.896', trend: 7.6, icon: <FileText className="w-5 h-5"/>, color: 'text-emerald-600 bg-emerald-100' },
    { title: t.kpi.latency, value: '342 ms', trend: -12.1, icon: <Activity className="w-5 h-5"/>, color: 'text-purple-600 bg-purple-100' },
    { title: t.kpi.queue, value: '27', trend: 0, icon: <CheckSquare className="w-5 h-5"/>, color: 'text-orange-600 bg-orange-100' },
  ];

  const lineData = { labels: ['08/05','09/05','10/05','11/05','12/05','13/05','14/05'], datasets: [
    { label: 'Docs', data: [1200,1400,2100,1600,1800,2180,1400], borderColor: '#2563eb', tension: 0.3 },
    { label: 'Chunks', data: [600,800,1200,900,1000,1500,1000], borderColor: '#93c5fd', borderDash: [5,5], tension: 0.3 }
  ]};
  const doughnutData = { labels: ['SharePoint','Confluence','File Server','Database','Web'], datasets: [{ data: [38.7,22.1,16.4,9.3,13.5], backgroundColor: ['#3b82f6','#f97316','#10b981','#a855f7','#64748b'], borderWidth: 0, cutout: '75%' }]};
  const chartOpts = { maintainAspectRatio: false, plugins: { legend: { labels: { color: isDarkMode ? '#cbd5e1' : '#475569' } } }, scales: { x: { ticks: { color: isDarkMode ? '#94a3b8' : '#64748b' }, grid: { display: false } }, y: { ticks: { color: isDarkMode ? '#94a3b8' : '#64748b' }, grid: { color: isDarkMode ? 'rgba(255,255,255,0.03)' : '#e2e8f0' } } } };

  const card = isDarkMode ? 'bg-slate-800 border-none shadow-md' : 'bg-white border border-slate-200 shadow-sm';
  const txt = isDarkMode ? 'text-slate-100' : 'text-slate-800';
  const muted = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const border = isDarkMode ? 'border-slate-700' : 'border-slate-200';

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return (
        <div className="animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
            {kpiData.map((k,i) => (
              <div key={i} className={`${card} rounded-xl p-5 hover:shadow-lg transition-shadow`}>
                <div className="flex items-center gap-3 mb-4"><div className={`w-10 h-10 rounded-lg flex items-center justify-center ${k.color}`}>{k.icon}</div><h3 className={`text-sm font-semibold ${muted}`}>{k.title}</h3></div>
                <div className={`text-2xl font-bold mb-1 ${txt}`}>{k.value}</div>
                <div className={`text-xs font-medium ${k.trend >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{k.trend >= 0 ? '↑' : '↓'} {Math.abs(k.trend)}%</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className={`lg:col-span-2 ${card} rounded-xl p-5 h-[360px] flex flex-col`}><h3 className={`font-bold text-sm mb-4 ${txt}`}>{lang==='vi'?'Xu hướng Ingestion':'Ingestion Trends'}</h3><div className="flex-1 min-h-0"><Line data={lineData} options={chartOpts}/></div></div>
            <div className={`${card} rounded-xl p-5 h-[360px] flex flex-col`}><h3 className={`font-bold text-sm mb-4 ${txt}`}>{lang==='vi'?'Nguồn tài liệu':'Sources'}</h3><div className="flex-1 min-h-0"><Doughnut data={doughnutData} options={{maintainAspectRatio:false, plugins:{legend:{labels:{color:isDarkMode?'#cbd5e1':'#475569'}}}}}/></div></div>
          </div>
        </div>
      );
      case 'analyze': return <FileUploadComponent isDarkMode={isDarkMode} lang={lang} />;
      case 'results': return selectedFileForChunks ? (
        <div className={`${card} rounded-xl p-6 flex flex-col h-[calc(100vh-140px)]`}>
          <div className={`flex items-center gap-4 mb-6 pb-4 border-b ${border}`}>
            <button onClick={()=>setSelectedFileForChunks(null)} className={`p-2 rounded-lg ${isDarkMode?'hover:bg-slate-700':'hover:bg-slate-100'}`}><ArrowLeft className="w-5 h-5"/></button>
            <div><h3 className={`font-bold text-lg flex items-center gap-2 ${txt}`}><FileSearch className="w-5 h-5 text-blue-500"/>Chunks: {selectedFileForChunks}</h3></div>
          </div>
          <div className="flex-1 overflow-auto space-y-4">
            {chunksData.map(c=>(
              <div key={c.id} className={`p-4 rounded-xl border group ${isDarkMode?'bg-slate-900 border-slate-700':'bg-slate-50 border-slate-200'}`}>
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-xs font-bold px-2 py-1 rounded ${isDarkMode?'bg-slate-800 text-slate-400':'bg-slate-200 text-slate-600'}`}>Chunk #{c.id}</span>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={()=>{const t=window.prompt('Edit:',c.text);if(t)setChunksData(p=>p.map(x=>x.id===c.id?{...x,text:t}:x));}} className="p-1.5 text-blue-500 hover:bg-blue-100 rounded"><Edit3 className="w-4 h-4"/></button>
                    <button onClick={()=>{if(window.confirm('Xóa?'))setChunksData(p=>p.filter(x=>x.id!==c.id));}} className="p-1.5 text-red-500 hover:bg-red-100 rounded"><Trash2 className="w-4 h-4"/></button>
                  </div>
                </div>
                <p className={`text-sm leading-relaxed ${txt}`}>"{c.text}"</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className={`${card} rounded-xl p-6 flex flex-col h-[calc(100vh-140px)]`}>
          <h3 className={`font-bold text-lg mb-5 ${txt}`}>{lang==='vi'?'Quản lý Dữ liệu':'Data Management'}</h3>
          <div className={`flex-1 overflow-auto rounded-lg ${isDarkMode?'bg-slate-800':'border border-slate-100'}`}>
            <table className="w-full text-left text-sm">
              <thead className={`sticky top-0 ${isDarkMode?'bg-slate-900 text-slate-300':'bg-slate-50 text-slate-600 border-b'}`}>
                <tr><th className="py-3 px-4">{lang==='vi'?'Tệp tin':'File'}</th><th className="py-3 px-4">Status</th><th className="py-3 px-4">RBAC</th><th className="py-3 px-4 text-right">Action</th></tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode?'divide-slate-700 text-slate-300':'divide-slate-100'}`}>
                <tr className={`${isDarkMode?'hover:bg-slate-700/50':'hover:bg-slate-50'}`}><td className="py-4 px-4 flex items-center gap-2"><File className="w-4 h-4 text-red-500"/>Tai_Lieu.pdf</td><td className="py-4 px-4"><span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-green-100 text-green-700">100% Embedded</span></td><td className="py-4 px-4"><span className="px-2.5 py-1 rounded-md text-xs font-bold bg-red-100 text-red-700 flex items-center w-max gap-1"><Lock className="w-3 h-3"/>MANAGER</span></td><td className="py-4 px-4 text-right"><button onClick={()=>setSelectedFileForChunks('Tai_Lieu.pdf')} className="text-blue-500 font-bold hover:underline">Chunks →</button></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      );
      case 'statistics': return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-5 text-white"><DollarSign className="w-6 h-6 mb-3 text-white/80"/><h4 className="text-sm mb-1 text-blue-100">{lang==='vi'?'Chi phí API':'API Cost'}</h4><div className="text-3xl font-bold">$124.50</div></div>
            <div className={`${card} rounded-xl p-5`}><FileText className="w-6 h-6 mb-3 text-emerald-500"/><h4 className={`text-sm mb-1 ${muted}`}>Tokens</h4><div className={`text-2xl font-bold ${txt}`}>8.2M</div></div>
            <div className={`${card} rounded-xl p-5`}><MessageSquare className="w-6 h-6 mb-3 text-purple-500"/><h4 className={`text-sm mb-1 ${muted}`}>Queries</h4><div className={`text-2xl font-bold ${txt}`}>14,250</div></div>
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-5 text-white"><TrendingUp className="w-6 h-6 mb-3 text-white/80"/><h4 className="text-sm mb-1">ROI</h4><div className="text-3xl font-bold">~475h</div></div>
          </div>
        </div>
      );
      case 'logs': return (
        <div className={`${card} rounded-xl p-6 flex flex-col h-[calc(100vh-140px)]`}>
          <div className="flex justify-between items-center mb-5"><h3 className={`font-bold text-lg flex items-center gap-2 ${txt}`}><History className="w-5 h-5 text-orange-500"/>Audit Logs</h3><button className="text-sm text-blue-500 border border-blue-200 px-3 py-1.5 rounded bg-blue-50">Export CSV</button></div>
          <div className={`flex-1 overflow-auto rounded-lg ${isDarkMode?'bg-slate-800':'border border-slate-100'}`}>
            <table className="w-full text-left text-sm"><thead className={`sticky top-0 ${isDarkMode?'bg-slate-900 text-slate-300':'bg-slate-50 text-slate-600 border-b'}`}><tr><th className="py-3 px-4">Time</th><th className="py-3 px-4">User</th><th className="py-3 px-4">Query</th><th className="py-3 px-4">Risk</th></tr></thead>
            <tbody className={`divide-y ${isDarkMode?'divide-slate-700 text-slate-300':'divide-slate-100'}`}>
              <tr><td className="py-3 px-4 text-xs">28/04/2026 09:12</td><td className="py-3 px-4">nguyenvana@congty.com</td><td className="py-3 px-4 truncate max-w-[200px]">"Số CCCD của tôi..."</td><td className="py-3 px-4"><span className="px-2 py-1 bg-red-100 text-red-700 rounded text-[10px] font-bold">DLP TRIGGERED</span></td></tr>
              <tr><td className="py-3 px-4 text-xs">28/04/2026 09:10</td><td className="py-3 px-4">tranb@congty.com</td><td className="py-3 px-4 truncate max-w-[200px]">"Bảng lương giám đốc"</td><td className="py-3 px-4"><span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-[10px] font-bold">RBAC BLOCKED</span></td></tr>
            </tbody></table>
          </div>
        </div>
      );
      case 'settings': return (
        <div className="space-y-6">
          <h3 className={`font-bold text-xl ${txt}`}>{lang==='vi'?'Cài đặt':'Settings'}</h3>
          <div className={`${card} rounded-xl p-6 max-w-3xl`}>
            <div className={`flex items-center justify-between py-4 border-b ${border}`}>
              <div className="flex items-center gap-4"><div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDarkMode?'bg-slate-700':'bg-slate-100'}`}><Moon className="w-6 h-6 text-blue-400"/></div><div><div className={`font-bold ${txt}`}>Dark Mode</div><div className={`text-sm ${muted}`}>{lang==='vi'?'Bảo vệ mắt ban đêm':'Protect eyes at night'}</div></div></div>
              <button onClick={()=>setIsDarkMode(!isDarkMode)} className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${isDarkMode?'bg-blue-600':'bg-slate-300'}`}><span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${isDarkMode?'translate-x-8':'translate-x-1'}`}/></button>
            </div>
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center gap-4"><div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDarkMode?'bg-slate-700':'bg-slate-100'}`}><Globe className="w-6 h-6 text-indigo-500"/></div><div><div className={`font-bold ${txt}`}>{lang==='vi'?'Ngôn ngữ':'Language'}</div></div></div>
              <div className={`flex p-1 rounded-lg ${isDarkMode?'bg-slate-900':'bg-slate-200'}`}>
                <button onClick={()=>setLang('vi')} className={`px-4 py-1.5 text-sm font-bold rounded-md ${lang==='vi'?'bg-blue-600 text-white shadow-md':'text-slate-500'}`}>VI</button>
                <button onClick={()=>setLang('en')} className={`px-4 py-1.5 text-sm font-bold rounded-md ${lang==='en'?'bg-blue-600 text-white shadow-md':'text-slate-500'}`}>EN</button>
              </div>
            </div>
          </div>
        </div>
      );
      default: return <div/>;
    }
  };

  const menuItems = [
    { key: 'overview', icon: <Home className="w-4 h-4 shrink-0"/>, label: t.menu.overview },
    { key: '_pipeline', label: t.menu.pipeline, isSection: true },
    { key: 'analyze', icon: <Upload className="w-4 h-4 shrink-0 text-orange-400"/>, label: t.menu.analyze },
    { key: 'results', icon: <CheckSquare className="w-4 h-4 shrink-0 text-emerald-400"/>, label: t.menu.results },
    { key: 'statistics', icon: <BarChart3 className="w-4 h-4 shrink-0 text-purple-400"/>, label: t.menu.stats },
    { key: '_audit', label: t.menu.audit, isSection: true },
    { key: 'logs', icon: <Shield className="w-4 h-4 shrink-0 text-red-400"/>, label: t.menu.logs },
    { key: '_system', label: t.menu.system, isSection: true },
    { key: 'settings', icon: <Settings className="w-4 h-4 shrink-0"/>, label: t.menu.settings },
  ];

  const headerTitles: Record<string,string> = lang === 'vi'
    ? { overview:'Tổng quan hệ thống', analyze:'Phân tích & Tải lên', results:'Kiểm tra kết quả', statistics:'Thống kê AI', logs:'Nhật ký kiểm toán', settings:'Cài đặt' }
    : { overview:'System Overview', analyze:'Upload & Analysis', results:'Results', statistics:'AI Stats', logs:'Audit Logs', settings:'Settings' };

  return (
    <div className={`absolute inset-0 flex overflow-hidden font-sans transition-colors duration-300 ${isDarkMode?'bg-slate-900':'bg-[#f8fafc]'}`}>
      {/* Sidebar */}
      <aside className={`w-64 flex-shrink-0 flex flex-col h-full shadow-2xl z-20 ${isDarkMode?'bg-slate-950':'bg-slate-900'} text-white`}>
        <div className="h-16 flex items-center gap-3 px-6 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30"><Brain className="w-5 h-5"/></div>
          <h1 className="text-3xl font-black tracking-widest text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.9)]">RAG</h1>
        </div>
        <nav className="flex-1 overflow-y-auto py-5 px-4 space-y-1.5">
          {menuItems.map(item => item.isSection ? (
            <div key={item.key} className="pt-6 pb-2 px-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">{item.label}</div>
          ) : (
            <button key={item.key} onClick={()=>setActiveTab(item.key)} className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab===item.key?'bg-blue-600 text-white shadow-md':'text-slate-400 hover:text-white hover:bg-slate-800'}`}>{item.icon} {item.label}</button>
          ))}
        </nav>
        <button onClick={onLogout} className="m-4 p-3 text-red-400 font-bold hover:bg-red-500/10 rounded-xl transition-colors text-sm">{lang==='vi'?'Đăng xuất':'Logout'}</button>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative z-10">
        <header className={`h-16 flex items-center justify-between px-6 shrink-0 shadow-sm ${isDarkMode?'bg-slate-800':'bg-white border-b border-slate-200'}`}>
          <h2 className={`text-lg font-bold truncate ${isDarkMode?'text-white':'text-slate-800'}`}>{headerTitles[activeTab] || ''}</h2>
          <div className="flex items-center gap-4">
            <div className="relative hidden lg:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
              <input type="text" placeholder={lang==='vi'?'Tìm kiếm...':'Search...'} className={`pl-10 pr-4 py-2 border rounded-lg text-sm w-56 outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode?'bg-slate-900 border-slate-700 text-white':'bg-slate-50 border-slate-200'}`}/>
            </div>
            {user?.role === 'ADMIN' && <AdminNotification notifications={notifications} unreadCount={unreadCount} onMarkAsRead={onMarkAsRead} onMarkAllAsRead={onMarkAllAsRead} onClearAll={onClearNotifications} isDarkMode={isDarkMode} lang={lang}/>}
            <div className={`flex items-center gap-3 border-l pl-4 ${isDarkMode?'border-slate-700':'border-slate-200'}`}>
              {user?.picture ? <img src={user.picture} className="w-9 h-9 rounded-full" alt=""/> : <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">{(user?.name||'U')[0].toUpperCase()}</div>}
              <div className="text-sm hidden sm:block">
                <div className={`font-bold leading-none mb-1 ${isDarkMode?'text-white':'text-slate-800'}`}>{user?.name||'User'}</div>
                <div className={`text-[11px] leading-none ${muted}`}>{user?.role||'USER'}</div>
              </div>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-x-hidden overflow-y-auto p-6 w-full">{renderContent()}</div>
      </main>

      {/* Chat FAB + Widget */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        <ChatWidget isDarkMode={isDarkMode} lang={lang} isOpen={isChatOpen} onClose={()=>setIsChatOpen(false)}/>
        {!isChatOpen && (
          <button onClick={()=>setIsChatOpen(true)} className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-full shadow-xl shadow-blue-500/40 flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-transform relative">
            <MessageCircle className="w-6 h-6"/>
            {unreadCount>0 && <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full animate-bounce"/>}
          </button>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
