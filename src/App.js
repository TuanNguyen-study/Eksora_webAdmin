import './App.css';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import SideNav from './components/SideNav';
import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Tour from './pages/Tour';
import Vouchers from './pages/Vouchers';
import Users from './pages/Users';
import Bookings from './pages/Bookings';
import Calendar from './components/Calendar';
import Reviews from './components/Reviews';
import Login from './pages/Login';
import AddTour from './pages/AddTour';
import CreateSupplier from './pages/CreateSupplier';
import SupplierAnalytics from './pages/SupplierAnalytics';
import Toast from './components/Toast';

function App() {
  const [loginFlag, setLoginFlag] = useState(0);
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true' || sessionStorage.getItem('isLoggedIn') === 'true';
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '' });
  const headerRef = useRef();

  useEffect(() => {
    const handleStorage = () => setLoginFlag(f => f + 1);
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('token');
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('token');
    window.location.href = '/login';
  };

  // Callback khi click notification
  const handleNotificationClick = (bookingId) => {
    setToast({ show: true, message: 'Đã mở chi tiết booking!' });
    if (headerRef.current) headerRef.current.removeNotification(bookingId);
  };

  // Hàm show toast khi đổi trạng thái booking
  window.showBookingToast = (msg) => {
    setToast({ show: true, message: msg });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
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
            <Header ref={headerRef} onNotificationClick={handleNotificationClick} />
            <div className="d-flex w-100">
              <SideNav onLogoutClick={() => setShowLogoutModal(true)} />
              <div className="flex-grow-1">
                <Routes>
                  <Route path="/dashboard" element={<Home />} />
                  <Route path="/tour" element={<Tour />} />
                  <Route path="/add-tour" element={<AddTour />} />
                  <Route path="/vouchers" element={<Vouchers />} />
                  <Route path="/users" element={<Users />} />
                  <Route path="/bookings" element={<Bookings />} />
                  <Route path="/calendar" element={<Calendar />} />
                  <Route path="/reviews" element={<Reviews />} />
                  <Route path="/suppliers/create" element={<CreateSupplier />} />
                  <Route path="/suppliers/analytics" element={<SupplierAnalytics />} />
                  {/* Redirect tất cả route không hợp lệ về dashboard */}
                  <Route path="*" element={<Home />} />
                </Routes>
                <Footer />
              </div>
            </div>
            <Toast show={toast.show} message={toast.message} onClose={() => setToast({ show: false, message: '' })} />
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
