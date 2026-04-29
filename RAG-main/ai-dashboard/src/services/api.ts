// ============================================
// 🌐 API SERVICE - Centralized API Client with Auth
// ============================================

const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

/**
 * Base fetch wrapper - tự động inject JWT token
 */
async function request(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('ai_app_token');

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  // Inject JWT token nếu có
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Chỉ set Content-Type nếu body không phải FormData
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  // Token hết hạn → xóa token, redirect về login
  if (res.status === 401) {
    localStorage.removeItem('ai_app_token');
    localStorage.removeItem('ai_app_user');
    window.dispatchEvent(new Event('auth:logout'));
    throw new Error('Phiên đăng nhập đã hết hạn.');
  }

  // Rate limited
  if (res.status === 429) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Bạn đang thao tác quá nhanh. Vui lòng đợi.');
  }

  return res;
}

// ============================================
// 🔑 AUTH APIs
// ============================================

export interface UserInfo {
  email: string;
  name: string;
  role: 'ADMIN' | 'USER';
  picture?: string;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  user: UserInfo;
}

/**
 * Đăng nhập bằng username/password
 */
export async function loginLocal(username: string, password: string): Promise<LoginResponse> {
  const res = await request('/api/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.message || 'Đăng nhập thất bại.');
  
  // Lưu token và user info
  localStorage.setItem('ai_app_token', data.token);
  localStorage.setItem('ai_app_user', JSON.stringify(data.user));
  return data;
}

/**
 * Đăng nhập bằng Google OAuth token
 */
export async function loginGoogle(googleToken: string): Promise<LoginResponse> {
  const res = await request('/api/login', {
    method: 'POST',
    body: JSON.stringify({ googleToken }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.message || 'Google đăng nhập thất bại.');

  localStorage.setItem('ai_app_token', data.token);
  localStorage.setItem('ai_app_user', JSON.stringify(data.user));
  return data;
}

/**
 * Đăng xuất - xóa token
 */
export function logout() {
  localStorage.removeItem('ai_app_token');
  localStorage.removeItem('ai_app_user');
}

/**
 * Lấy thông tin user đã lưu
 */
export function getStoredUser(): UserInfo | null {
  try {
    const data = localStorage.getItem('ai_app_user');
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

/**
 * Kiểm tra đã đăng nhập chưa
 */
export function isAuthenticated(): boolean {
  return !!localStorage.getItem('ai_app_token');
}

// ============================================
// 💬 CHAT APIs
// ============================================

export interface ChatResponse {
  reply: string;
  intent: 'greeting' | 'business';
  mood: 'urgent' | 'friendly' | 'neutral';
  sources: string[];
}

/**
 * Gửi tin nhắn chat cho AI
 */
export async function sendChatMessage(message: string): Promise<ChatResponse> {
  const res = await request('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Lỗi AI.');
  return data;
}

// ============================================
// 📤 UPLOAD APIs
// ============================================

export interface UploadResponse {
  success: boolean;
  chunkCount: number;
  filename: string;
  pageCount: number;
  roleAccess: string;
  scanMethod: string;
  error?: string;
  message?: string;
  threats?: string[];
}

/**
 * Upload file tài liệu
 * Client-side validation + server upload
 */
export async function uploadFile(file: File, role: string = 'USER'): Promise<UploadResponse> {
  // --- Client-side Validation ---
  const ALLOWED_EXTS = ['.pdf', '.docx', '.txt'];
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB

  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!ALLOWED_EXTS.includes(ext)) {
    throw new Error(`Định dạng ${ext} không được hỗ trợ. Chỉ chấp nhận: ${ALLOWED_EXTS.join(', ')}`);
  }
  if (file.size > MAX_SIZE) {
    throw new Error(`File quá lớn (${(file.size / (1024 * 1024)).toFixed(1)}MB). Giới hạn: 10MB.`);
  }

  // --- Upload ---
  const formData = new FormData();
  formData.append('file', file);

  const res = await request(`/api/upload?role=${role}`, {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();
  
  if (!res.ok) {
    // Phân biệt lỗi malware vs lỗi khác
    if (data.error === 'MalwareDetected') {
      throw new Error(`🔴 ${data.message}`);
    }
    throw new Error(data.message || 'Upload thất bại.');
  }

  return data;
}

export default { loginLocal, loginGoogle, logout, getStoredUser, isAuthenticated, sendChatMessage, uploadFile };
