import React, { useState, useEffect } from 'react';
import LoginPage from './LoginPage';
import Dashboard from './Dashboard'; // File Dashboard mình viết cho bạn ban nãy

const App: React.FC = () => {
  // Trạng thái kiểm tra xem user đã đăng nhập chưa
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Khi ứng dụng vừa load, kiểm tra xem trong "ví" (localStorage) đã có Token chưa
  useEffect(() => {
    const token = localStorage.getItem('ai_app_token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  // Hàm được gọi khi Login thành công
  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  // Hàm Đăng xuất (Có thể gắn vào nút ở góc trên bên phải của Dashboard)
  const handleLogout = () => {
    localStorage.removeItem('ai_app_token');
    setIsAuthenticated(false);
  };

  return (
    <>
      {/* Cấu trúc rẽ nhánh (Router cơ bản): Có token thì hiện trang chủ, chưa có thì bắt Login */}
      {isAuthenticated ? (
        // Truyền hàm handleLogout vào Dashboard nếu bạn muốn thêm nút Đăng xuất
        <Dashboard onLogout={handleLogout} /> 
      ) : (
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      )}
    </>
  );
};

export default App;