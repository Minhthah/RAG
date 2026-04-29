import React, { useState } from 'react';
import { Brain, User, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { loginLocal, loginGoogle } from '../services/api';
import type { UserInfo } from '../services/api';

interface LoginPageProps {
  onLoginSuccess: (user: UserInfo) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(''); setIsLoading(true);
    try {
      const data = await loginLocal(username, password);
      onLoginSuccess(data.user);
    } catch (error: any) {
      setErrorMsg(error.message || 'Tên đăng nhập hoặc mật khẩu không chính xác.');
    } finally { setIsLoading(false); }
  };

  const handleGoogleLogin = async (credentialResponse: any) => {
    setErrorMsg(''); setIsLoading(true);
    try {
      const data = await loginGoogle(credentialResponse.credential);
      onLoginSuccess(data.user);
    } catch (error: any) {
      setErrorMsg(error.message || 'Google đăng nhập thất bại.');
    } finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-200/20 blur-3xl"></div>
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[60%] rounded-full bg-indigo-200/20 blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
          {/* Header */}
          <div className="bg-slate-900 px-8 py-10 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-blue-600 mb-4 shadow-lg shadow-blue-500/30">
              <Brain className="text-white w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">AI Knowledge Platform</h1>
            <p className="text-slate-400 text-sm">Hệ thống truy xuất tri thức doanh nghiệp</p>
          </div>

          {/* Form */}
          <div className="p-8">
            <h2 className="text-lg font-bold text-slate-800 mb-6">Đăng nhập hệ thống</h2>

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>{errorMsg}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Tên đăng nhập</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><User className="h-5 w-5 text-slate-400" /></div>
                  <input type="text" value={username} onChange={e => setUsername(e.target.value)} required
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-sm outline-none transition-all"
                    placeholder="VD: admin" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-slate-700">Mật khẩu</label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Lock className="h-5 w-5 text-slate-400" /></div>
                  <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required
                    className="block w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-sm outline-none transition-all"
                    placeholder="VD: 123456" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={isLoading}
                className="w-full flex justify-center py-2.5 px-4 rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-70">
                {isLoading ? (<><Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />Đang xác thực...</>) : 'Đăng nhập'}
              </button>

              <div className="flex items-center my-4">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="mx-3 text-xs text-slate-400">hoặc</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <GoogleLogin
                onSuccess={handleGoogleLogin}
                onError={() => setErrorMsg('Google đăng nhập thất bại.')}
                width="100%"
                useOneTap
              />
            </form>
          </div>

          <div className="bg-slate-50 border-t border-slate-100 px-8 py-4 text-center">
            <p className="text-xs text-slate-500">© 2026 Enterprise AI Solutions. Bảo mật bởi JWT + Google OAuth.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
