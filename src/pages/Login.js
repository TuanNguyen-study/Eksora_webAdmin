import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginWithEmail } from '../api/api';
import Swal from 'sweetalert2';
import './Login.css';

function Login(props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  // Nếu đã đăng nhập thì không hiển thị trang Login nữa, tự động chuyển hướng
  React.useEffect(() => {
    if (
      localStorage.getItem('isLoggedIn') === 'true' ||
      sessionStorage.getItem('isLoggedIn') === 'true'
    ) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  // Đảm bảo theme sáng cho trang Login
  React.useEffect(() => {
    document.body.classList.remove('dark-mode');
    document.body.classList.add('bg-light');
    return () => {
      document.body.classList.remove('bg-light');
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await loginWithEmail(email, password);
      if (res && res.token) {
        // Lưu token tạm thời để gọi API profile
        if (remember) {
          localStorage.setItem('token', res.token);
        } else {
          sessionStorage.setItem('token', res.token);
        }
        // Gọi API profile để lấy role
        let userProfile = null;
        try {
          const token = res.token;
          const headers = { Authorization: `Bearer ${token}` };
          // Ưu tiên lấy từ localStorage nếu remember, ngược lại lấy từ sessionStorage
          const profileRes = await fetch(`${process.env.REACT_APP_API_BASE_URL || ''}/api/profile`, { headers });
          userProfile = await profileRes.json();
        } catch (profileErr) {
          setError('Không thể xác thực tài khoản!');
          return;
        }
        if (userProfile && (userProfile.role === 'admin' || userProfile.role === 'supplier')) {
          if (remember) {
            localStorage.setItem('isLoggedIn', 'true');
          } else {
            sessionStorage.setItem('isLoggedIn', 'true');
          }
          window.sessionStorage.setItem('justLoggedIn', '1');
          // Gọi callback để App re-render ngay khi đăng nhập thành công
          if (props.onLoginSuccess) props.onLoginSuccess();
          // SweetAlert2 Success Toast
          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Đăng nhập thành công!',
            showConfirmButton: false,
            timer: 1500,
            timerProgressBar: true,
          });
          navigate('/dashboard');
        } else {
          setError('Chỉ tài khoản Admin và Supplier mới được đăng nhập!');
          localStorage.removeItem('token');
          sessionStorage.removeItem('token');
        }
      } else {
        setError('Sai email hoặc mật khẩu!');
      }
    } catch (err) {
      setError('Sai email hoặc mật khẩu!');
    }
  };

  return (
    <div className="login-page bg-light" style={{ minHeight: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', left: 0, top: 0, zIndex: 2000 }}>
      <div className="login-box" style={{ width: 380, maxWidth: '95vw', margin: '0 auto' }}>
        <div className="card card-outline card-primary shadow" style={{ borderRadius: 12 }}>
          <div className="card-header text-center">
            <a href="#" className="h1" style={{ fontSize: 32 }}>EKSORA <b>Admin</b></a>
          </div>
          <div className="card-body">
            <p className="login-box-msg">Đăng nhập để vào hệ thống</p>
            {error && <div className="alert alert-danger py-2">{error}</div>}
            <form onSubmit={handleSubmit} autoComplete="on">
              <div className="input-group mb-3">
                <input type="email" className="form-control" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={{ fontSize: 16 }} />
                <div className="input-group-append">
                  <div className="input-group-text"><span className="fas fa-envelope"></span></div>
                </div>
              </div>
              <div className="input-group mb-3">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-control"
                  placeholder="Mật khẩu"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{ fontSize: 16 }}
                />
                <div className="input-group-append">
                  <div className="input-group-text" style={{ cursor: 'pointer' }} onClick={() => setShowPassword(v => !v)}>
                    <span className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></span>
                  </div>
                </div>
              </div>
              <div className="d-flex align-items-center mb-2">
                <div className="form-check flex-grow-1">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="rememberMe"
                    checked={remember}
                    onChange={e => setRemember(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="rememberMe">Ghi nhớ đăng nhập</label>
                </div>
                <button type="submit" className="btn btn-primary px-4" style={{ whiteSpace: 'nowrap' }}>Đăng nhập</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
