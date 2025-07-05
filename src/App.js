import './App.css';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './components/Home';
import SideNav from './components/SideNav';
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Tour from './pages/Tour';
import Vouchers from './pages/Vouchers';
import Users from './pages/Users';
import Bookings from './pages/Bookings';
import Calendar from './pages/Calendar';
import Reviews from './components/Reviews';
import Login from './pages/Login';

function App() {
  // State để trigger re-render khi đăng nhập thành công
  const [loginFlag, setLoginFlag] = useState(0);
  // Kiểm tra trạng thái đăng nhập toàn cục
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true' || sessionStorage.getItem('isLoggedIn') === 'true';

  // Lắng nghe sự kiện storage để cập nhật trạng thái đăng nhập khi tab khác đăng nhập
  useEffect(() => {
    const handleStorage = () => setLoginFlag(f => f + 1);
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('token');
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('token');
    window.location.href = '/login';
  };

  return (
    <BrowserRouter>
      <div className="wrapper d-flex">
        {/* Nếu chưa đăng nhập, chỉ cho phép vào trang Login */}
        {!isLoggedIn ? (
          <Routes>
            <Route path="/*" element={<Login onLoginSuccess={() => setLoginFlag(f => f + 1)} />} />
          </Routes>
        ) : (
          <React.Fragment>
            <Header />
            <div className="d-flex w-100">
              <SideNav onLogoutClick={() => setShowLogoutModal(true)} />
              <div className="flex-grow-1">
                <Routes>
                  <Route path="/dashboard" element={<Home />} />
                  <Route path="/tour" element={<Tour />} />
                  <Route path="/vouchers" element={<Vouchers />} />
                  <Route path="/users" element={<Users />} />
                  <Route path="/bookings" element={<Bookings />} />
                  <Route path="/calendar" element={<Calendar />} />
                  <Route path="/reviews" element={<Reviews />} />
                  {/* Redirect tất cả route không hợp lệ về dashboard */}
                  <Route path="*" element={<Home />} />
                </Routes>
                <Footer />
              </div>
            </div>
            {/* Modal xác nhận đăng xuất */}
            {showLogoutModal && (
              <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.3)' }} tabIndex="-1" role="dialog">
                <div className="modal-dialog modal-dialog-centered" role="document">
                  <div className="modal-content">
                    <div className="modal-header">
                      <h5 className="modal-title">Xác nhận đăng xuất</h5>
                      <button type="button" className="close" onClick={() => setShowLogoutModal(false)}>
                        <span>&times;</span>
                      </button>
                    </div>
                    <div className="modal-body">
                      <p>Bạn có chắc chắn muốn đăng xuất?</p>
                    </div>
                    <div className="modal-footer">
                      <button type="button" className="btn btn-secondary" onClick={() => setShowLogoutModal(false)}>Hủy</button>
                      <button type="button" className="btn btn-danger" onClick={handleLogout}>Đăng xuất</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </React.Fragment>
        )}
      </div>
    </BrowserRouter>
  );
}

export default App;
