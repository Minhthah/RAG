// apiClient.ts

const API_BASE_URL = 'http://localhost:3000/api/v1';

// Hàm 1: Xử lý Đăng nhập và lưu Token
export const loginAndGetToken = async (username, password) => {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success && data.token) {
            // Lưu token vào "túi" của trình duyệt (localStorage) để dùng dần
            localStorage.setItem('ai_app_token', data.token);
            console.log("Đăng nhập thành công! Đã cất thẻ nhân viên vào ví.");
            return true;
        } else {
            console.error("Đăng nhập thất bại:", data.error);
            return false;
        }
    } catch (error) {
        console.error("Lỗi kết nối máy chủ:", error);
        return false;
    }
};

// Hàm 2: Gửi câu hỏi cho AI (Tự động kẹp Token vào)
export const askEnterpriseAI = async (question) => {
    // 1. Lấy "thẻ nhân viên" từ trong ví ra
    const token = localStorage.getItem('ai_app_token');

    if (!token) {
        alert("Bạn chưa đăng nhập hoặc thẻ đã hết hạn!");
        return null;
    }

    try {
        // 2. Kẹp thẻ vào Header Authorization
        const response = await fetch(`${API_BASE_URL}/enterprise/query`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // Đây là mấu chốt bảo mật!
            },
            body: JSON.stringify({ question })
        });

        // Xử lý trường hợp Token hết hạn hoặc bị spam (Rate Limit)
        if (response.status === 401 || response.status === 403) {
            alert("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.");
            localStorage.removeItem('ai_app_token'); // Xóa thẻ cũ
            // Chuyển hướng về trang đăng nhập...
            return null;
        }

        if (response.status === 429) {
            alert("Bạn đang hỏi quá nhanh! Vui lòng đợi một lát.");
            return null;
        }

        const data = await response.json();
        return data; // Trả về câu trả lời và nguồn trích dẫn
        
    } catch (error) {
        console.error("Lỗi khi hỏi AI:", error);
        return null;
    }
};