import React, { useState } from 'react';
import { Brain, User, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
// Import hàm gọi API mà chúng ta đã định nghĩa ở bước trước
// import { loginAndGetToken } from './apiClient'; 

interface LoginPageProps {
  onLoginSuccess: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); // Ngăn form reload lại trang
    setErrorMsg('');
    setIsLoading(true);

    try {
      // GIẢ LẬP GỌI API (Trong thực tế, bạn gọi hàm loginAndGetToken ở đây)
      // const success = await loginAndGetToken(username, password);
      
      // Đoạn này mình dùng setTimeout để bạn thấy được hiệu ứng Loading xoay xoay
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      if (username === 'admin' && password === '123456') {
        // Lưu token giả lập (thực tế API sẽ trả về)
        localStorage.setItem('ai_app_token', 'mock_jwt_token_header.payload.signature');
        onLoginSuccess(); // Gọi hàm để chuyển màn hình sang Dashboard
      } else {
        setErrorMsg('Tên đăng nhập hoặc mật khẩu không chính xác.');
      }
    } catch (error) {
      setErrorMsg('Đã có lỗi xảy ra. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      {/* Background trang trí thêm cho đỡ trống */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-200/20 blur-3xl"></div>
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[60%] rounded-full bg-indigo-200/20 blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Card Đăng nhập */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
          
          {/* Header Card */}
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
                <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Username Input */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Tên đăng nhập</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-sm outline-none transition-all"
                    placeholder="Nhập tên đăng nhập (VD: admin)"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-slate-700">Mật khẩu</label>
                  <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-500">Quên mật khẩu?</a>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="block w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-sm outline-none transition-all"
                    placeholder="Nhập mật khẩu (VD: 123456)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded cursor-pointer"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-600 cursor-pointer">
                  Ghi nhớ đăng nhập
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                    Đang xác thực...
                  </>
                ) : (
                  'Đăng nhập'
                )}
              </button>
            </form>
          </div>
          
          {/* Footer Card */}
          <div className="bg-slate-50 border-t border-slate-100 px-8 py-4 text-center">
            <p className="text-xs text-slate-500">
              © 2026 Enterprise AI Solutions. Bảo mật bởi JWT.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;