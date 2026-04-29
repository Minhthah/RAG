import React, { useState, useRef, useCallback } from 'react';
import { Upload, Shield, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { uploadFile } from '../services/api';

interface FileUploadProps { isDarkMode: boolean; lang: 'vi' | 'en'; }
type UploadStatus = 'idle' | 'scanning' | 'processing' | 'success' | 'error';

const FileUpload: React.FC<FileUploadProps> = ({ isDarkMode, lang }) => {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [roleAccess, setRoleAccess] = useState<'USER' | 'MANAGER'>('USER');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!['.pdf', '.docx', '.txt'].includes(ext)) return `Chỉ nhận: .pdf, .docx, .txt`;
    if (file.size > 10 * 1024 * 1024) return `File quá lớn. Tối đa 10MB.`;
    return null;
  };

  const handleUpload = useCallback(async (file: File) => {
    const err = validateFile(file);
    if (err) { setErrorMsg(err); setStatus('error'); return; }
    setSelectedFile(file); setErrorMsg(''); setResult(null);
    try {
      setStatus('scanning');
      await new Promise(r => setTimeout(r, 500));
      setStatus('processing');
      const res = await uploadFile(file, roleAccess);
      setResult(res); setStatus('success');
    } catch (e: any) { setErrorMsg(e.message); setStatus('error'); }
  }, [roleAccess]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }, [handleUpload]);

  const resetState = () => { setStatus('idle'); setResult(null); setErrorMsg(''); setSelectedFile(null); };
  const card = isDarkMode ? 'bg-slate-800 border-none' : 'bg-white border border-slate-200';
  const txt = isDarkMode ? 'text-slate-100' : 'text-slate-800';
  const muted = isDarkMode ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      <div className={`${card} rounded-xl p-8 shadow-sm`}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className={`text-lg font-bold ${txt}`}>{lang === 'vi' ? 'Tải tài liệu lên hệ thống' : 'Upload Documents'}</h3>
            <p className={`text-sm mt-1 ${muted}`}>{lang === 'vi' ? 'File sẽ được quét bảo mật, trích xuất, cắt nhỏ và nhúng vector tự động.' : 'Files are security-scanned, parsed, chunked, and vector-embedded.'}</p>
          </div>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isDarkMode ? 'bg-slate-900' : 'bg-slate-100'}`}>
            <span className={`text-xs font-semibold ${muted}`}>{lang === 'vi' ? 'Quyền:' : 'Access:'}</span>
            <select value={roleAccess} onChange={e => setRoleAccess(e.target.value as any)} className={`text-xs font-bold border-none outline-none rounded px-2 py-1 ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-700'}`}>
              <option value="USER">{lang === 'vi' ? 'Toàn công ty' : 'All Staff'}</option>
              <option value="MANAGER">{lang === 'vi' ? 'Quản lý' : 'Managers'}</option>
            </select>
          </div>
        </div>

        {status === 'idle' && (
          <div className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer group ${dragOver ? (isDarkMode ? 'border-blue-400 bg-blue-900/30' : 'border-blue-500 bg-blue-50') : (isDarkMode ? 'border-slate-600 hover:border-blue-500' : 'border-slate-300 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/50')}`}
            onDrop={handleDrop} onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onClick={() => fileInputRef.current?.click()}>
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform ${isDarkMode ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-600'}`}><Upload className="w-8 h-8" /></div>
            <h4 className={`text-lg font-bold mb-2 ${txt}`}>{lang === 'vi' ? 'Kéo thả file vào đây' : 'Drag & drop files here'}</h4>
            <p className={`text-sm mb-1 ${muted}`}>{lang === 'vi' ? 'Hỗ trợ: PDF, DOCX, TXT — Tối đa 10MB' : 'Supports: PDF, DOCX, TXT — Max 10MB'}</p>
            <p className={`text-xs ${muted}`}>🔒 {lang === 'vi' ? 'File sẽ được quét virus trước khi xử lý' : 'Files are virus-scanned first'}</p>
            <div className="mt-6"><span className="bg-blue-600 text-white px-8 py-3 rounded-xl text-sm font-semibold shadow-lg hover:bg-blue-700 transition-colors inline-block">{lang === 'vi' ? 'Chọn tệp từ máy tính' : 'Browse Files'}</span></div>
            <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="hidden" />
          </div>
        )}

        {status === 'scanning' && (
          <div className={`rounded-2xl p-10 text-center ${isDarkMode ? 'bg-amber-900/20 border border-amber-500/30' : 'bg-amber-50 border border-amber-200'}`}>
            <div className="flex items-center justify-center gap-3 mb-4"><Shield className="w-8 h-8 text-amber-500 animate-pulse" /><Loader2 className="w-6 h-6 text-amber-500 animate-spin" /></div>
            <h4 className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-amber-300' : 'text-amber-700'}`}>{lang === 'vi' ? 'Đang tải lên và quét bảo mật...' : 'Uploading & scanning...'}</h4>
            <p className={`text-sm ${isDarkMode ? 'text-amber-400/80' : 'text-amber-600'}`}>{lang === 'vi' ? 'Kiểm tra Magic Bytes + quét mã độc...' : 'Validating file signature + malware scan...'}</p>
            {selectedFile && <p className={`text-xs mt-3 font-medium ${muted}`}>📄 {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)</p>}
          </div>
        )}

        {status === 'processing' && (
          <div className={`rounded-2xl p-10 text-center ${isDarkMode ? 'bg-blue-900/20 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'}`}>
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
            <h4 className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>{lang === 'vi' ? 'Đang xử lý tài liệu...' : 'Processing document...'}</h4>
            <p className={`text-sm ${isDarkMode ? 'text-blue-400/80' : 'text-blue-600'}`}>{lang === 'vi' ? 'AI đang đọc, chunking và embedding...' : 'AI is reading, chunking & embedding...'}</p>
          </div>
        )}

        {status === 'success' && result && (
          <div className={`rounded-2xl p-10 text-center ${isDarkMode ? 'bg-emerald-900/20 border border-emerald-500/30' : 'bg-emerald-50 border border-emerald-200'}`}>
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <h4 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>100% Embedded ✅</h4>
            <div className={`text-sm space-y-1 ${isDarkMode ? 'text-emerald-400/80' : 'text-emerald-600'}`}>
              <p>📄 {result.filename}</p><p>📦 {result.chunkCount} chunks</p><p>📖 ~{result.pageCount} trang</p><p>🔒 Scan: {result.scanMethod}</p>
            </div>
            <button onClick={resetState} className="mt-6 bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-md">{lang === 'vi' ? 'Upload thêm' : 'Upload More'}</button>
          </div>
        )}

        {status === 'error' && (
          <div className={`rounded-2xl p-10 text-center ${isDarkMode ? 'bg-red-900/20 border border-red-500/30' : 'bg-red-50 border border-red-200'}`}>
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h4 className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>{lang === 'vi' ? 'Tải lên thất bại' : 'Upload Failed'}</h4>
            <p className={`text-sm mb-4 ${isDarkMode ? 'text-red-400/80' : 'text-red-600'}`}>{errorMsg}</p>
            <button onClick={resetState} className="bg-red-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors">{lang === 'vi' ? 'Thử lại' : 'Try Again'}</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
