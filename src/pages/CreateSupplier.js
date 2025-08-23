import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSupplier, getCurrentUserRole } from '../api/api';
import { FaUser, FaEnvelope, FaLock, FaPhone, FaMapMarkerAlt, FaEye, FaEyeSlash, FaExclamationTriangle } from 'react-icons/fa';

function CreateSupplier() {
  const navigate = useNavigate();
  
  // Kiểm tra đăng nhập và role
  useEffect(() => {
    const checkAuthAndRole = async () => {
      const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true' || sessionStorage.getItem('isLoggedIn') === 'true';
      if (!isLoggedIn) {
        navigate('/login');
        return;
      }

      // Kiểm tra role của user
      try {
        setRoleLoading(true);
        const role = await getCurrentUserRole();
        console.log('User role in CreateSupplier:', role);
        setUserRole(role);
      } catch (error) {
        console.error('Error getting user role:', error);
        setUserRole(null);
      } finally {
        setRoleLoading(false);
      }
    };

    checkAuthAndRole();
  }, [navigate]);

  const [form, setForm] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    address: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    feedback: '',
    color: '#dc3545',
    width: '0%'
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [userRole, setUserRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);

  // Danh sách loại hình công ty
  const companyTypes = [
    { value: 'TNHH', label: 'Công ty Trách nhiệm Hữu hạn (TNHH)' },
    { value: 'CP', label: 'Công ty Cổ phần (CP)' },
    { value: 'HD', label: 'Công ty Hợp danh' },
    { value: 'DNTN', label: 'Doanh nghiệp tư nhân (DNTN)' },
    { value: 'HKDCT', label: 'Hộ kinh doanh cá thể' }
  ];

  // Hàm kiểm tra độ mạnh của mật khẩu
  const checkPasswordStrength = (password) => {
    let score = 0;
    let feedback = '';
    let color = '#dc3545'; // Red
    let width = '0%';

    if (password.length === 0) {
      return { score: 0, feedback: '', color: '#dc3545', width: '0%' };
    }

    // Kiểm tra độ dài tối thiểu 8 ký tự
    if (password.length >= 8) {
      score += 1;
    }

    // Kiểm tra có chữ hoa
    if (/[A-Z]/.test(password)) {
      score += 1;
    }

    // Kiểm tra có chữ thường
    if (/[a-z]/.test(password)) {
      score += 1;
    }

    // Kiểm tra có số
    if (/[0-9]/.test(password)) {
      score += 1;
    }

    // Kiểm tra không có ký tự đặc biệt (yêu cầu đặc biệt)
    const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(password);
    
    // Đánh giá điểm số và phản hồi
    if (score === 4 && !hasSpecialChar && password.length >= 8) {
      feedback = 'Mật khẩu mạnh';
      color = '#28a745'; // Green
      width = '100%';
    } else if (score >= 3 && !hasSpecialChar) {
      feedback = 'Mật khẩu trung bình';
      color = '#ffc107'; // Yellow
      width = '75%';
    } else if (score >= 2) {
      feedback = 'Mật khẩu yếu';
      color = '#fd7e14'; // Orange
      width = '50%';
    } else {
      feedback = 'Mật khẩu rất yếu';
      color = '#dc3545'; // Red
      width = '25%';
    }

    // Thêm thông tin chi tiết về yêu cầu
    const requirements = [];
    if (password.length < 8) requirements.push('ít nhất 8 ký tự');
    if (!/[A-Z]/.test(password)) requirements.push('chữ hoa');
    if (!/[a-z]/.test(password)) requirements.push('chữ thường');
    if (!/[0-9]/.test(password)) requirements.push('số');
    if (hasSpecialChar) requirements.push('không được có ký tự đặc biệt');

    if (requirements.length > 0) {
      feedback += ` (Cần: ${requirements.join(', ')})`;
    }

    return { score, feedback, color, width };
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));

    // Xóa lỗi khi người dùng bắt đầu nhập
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }

    // Kiểm tra độ mạnh mật khẩu khi nhập
    if (name === 'password') {
      setPasswordStrength(checkPasswordStrength(value));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Kiểm tra email
    if (!form.email.trim()) {
      newErrors.email = 'Email là bắt buộc';
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.email = 'Email không hợp lệ';
    }

    // Kiểm tra mật khẩu
    if (!form.password) {
      newErrors.password = 'Mật khẩu là bắt buộc';
    } else {
      const strength = checkPasswordStrength(form.password);
      if (strength.score < 4 || /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(form.password)) {
        newErrors.password = 'Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và không có ký tự đặc biệt';
      }
    }

    // Kiểm tra tên
    if (!form.first_name.trim()) {
      newErrors.first_name = 'Tên là bắt buộc';
    }

    if (!form.last_name) {
      newErrors.last_name = 'Loại hình công ty là bắt buộc';
    }

    // Kiểm tra số điện thoại
    if (!form.phone.trim()) {
      newErrors.phone = 'Số điện thoại là bắt buộc';
    } else if (!/^[0-9+\-\s()]+$/.test(form.phone)) {
      newErrors.phone = 'Số điện thoại không hợp lệ';
    }

    // Kiểm tra địa chỉ
    if (!form.address.trim()) {
      newErrors.address = 'Địa chỉ là bắt buộc';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // Debug: Kiểm tra token trước khi gửi request
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      console.log('Current token:', token ? 'Token exists' : 'No token found');
      console.log('Token length:', token?.length || 0);
      
      await createSupplier(form);
      
      // Reset form sau khi tạo thành công
      setForm({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        phone: '',
        address: ''
      });
      setPasswordStrength({ score: 0, feedback: '', color: '#dc3545', width: '0%' });
      
      // Có thể chuyển hướng hoặc hiển thị thông báo thành công
      // navigate('/suppliers');
    } catch (error) {
      console.error('Error creating supplier:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content-wrapper">
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Create Supplier</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><a href="/">Home</a></li>
                <li className="breadcrumb-item">Suppliers</li>
                <li className="breadcrumb-item active">Create Supplier</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          <div className="row justify-content-center">
            <div className="col-md-8">
              
              {/* Role Loading */}
              {roleLoading && (
                <div className="card card-info">
                  <div className="card-body text-center">
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Đang kiểm tra quyền truy cập...
                  </div>
                </div>
              )}

              {/* Role Warning */}
              {!roleLoading && userRole !== 'admin' && (
                <div className="card card-warning">
                  <div className="card-header">
                    <h3 className="card-title">
                      <FaExclamationTriangle className="mr-2" />
                      Cảnh báo quyền truy cập
                    </h3>
                  </div>
                  <div className="card-body">
                    <div className="alert alert-warning">
                      <h5><i className="icon fas fa-exclamation-triangle"></i> Không có quyền truy cập!</h5>
                      Chỉ có tài khoản <strong>Admin</strong> mới được phép tạo Supplier.
                      <br />
                      Role hiện tại của bạn: <strong>{userRole || 'Không xác định'}</strong>
                      <br />
                      Vui lòng liên hệ quản trị viên để được cấp quyền.
                    </div>
                  </div>
                </div>
              )}

              {/* Form chỉ hiển thị khi là admin */}
              {!roleLoading && userRole === 'admin' && (
                <div className="card card-primary">
                  <div className="card-header">
                    <h3 className="card-title">
                      <FaUser className="mr-2" />
                      Thông tin Supplier mới
                    </h3>
                  </div>
                  
                  <form onSubmit={handleSubmit}>
                  <div className="card-body">
                    <div className="row">
                      {/* Email */}
                      <div className="col-md-6">
                        <div className="form-group">
                          <label htmlFor="email">
                            <FaEnvelope className="mr-2" />
                            Email <span className="text-danger">*</span>
                          </label>
                          <input
                            type="email"
                            className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                            id="email"
                            name="email"
                            value={form.email}
                            onChange={handleInputChange}
                            placeholder="Nhập email"
                            required
                          />
                          {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                        </div>
                      </div>

                      {/* Password */}
                      <div className="col-md-6">
                        <div className="form-group">
                          <label htmlFor="password">
                            <FaLock className="mr-2" />
                            Mật khẩu <span className="text-danger">*</span>
                          </label>
                          <div className="input-group">
                            <input
                              type={showPassword ? 'text' : 'password'}
                              className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                              id="password"
                              name="password"
                              value={form.password}
                              onChange={handleInputChange}
                              placeholder="Nhập mật khẩu"
                              required
                            />
                            <div className="input-group-append">
                              <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                              </button>
                            </div>
                          </div>
                          
                          {/* Password Strength Indicator */}
                          {form.password && (
                            <div className="mt-2">
                              <div className="progress" style={{ height: '8px' }}>
                                <div
                                  className="progress-bar"
                                  role="progressbar"
                                  style={{
                                    width: passwordStrength.width,
                                    backgroundColor: passwordStrength.color,
                                    transition: 'all 0.3s ease'
                                  }}
                                ></div>
                              </div>
                              <small 
                                className="form-text"
                                style={{ color: passwordStrength.color, fontWeight: 'bold' }}
                              >
                                {passwordStrength.feedback}
                              </small>
                            </div>
                          )}
                          
                          {errors.password && <div className="invalid-feedback d-block">{errors.password}</div>}
                          
                          <small className="form-text text-muted">
                            Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và không có ký tự đặc biệt
                          </small>
                        </div>
                      </div>
                    </div>

                    <div className="row">
                      {/* First Name */}
                      <div className="col-md-6">
                        <div className="form-group">
                          <label htmlFor="first_name">
                            <FaUser className="mr-2" />
                            Tên công ty <span className="text-danger">*</span>
                          </label>
                          <input
                            type="text"
                            className={`form-control ${errors.first_name ? 'is-invalid' : ''}`}
                            id="first_name"
                            name="first_name"
                            value={form.first_name}
                            onChange={handleInputChange}
                            placeholder="Nhập tên công ty"
                            required
                          />
                          {errors.first_name && <div className="invalid-feedback">{errors.first_name}</div>}
                        </div>
                      </div>

                      {/* Company Type */}
                      <div className="col-md-6">
                        <div className="form-group">
                          <label htmlFor="last_name">
                            <i className="fas fa-building mr-2"></i>
                            Loại hình công ty <span className="text-danger">*</span>
                          </label>
                          <select
                            className={`form-control ${errors.last_name ? 'is-invalid' : ''}`}
                            id="last_name"
                            name="last_name"
                            value={form.last_name}
                            onChange={handleInputChange}
                            required
                          >
                            <option value="">-- Chọn loại hình công ty --</option>
                            {companyTypes.map((type) => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </select>
                          {errors.last_name && <div className="invalid-feedback">{errors.last_name}</div>}
                        </div>
                      </div>
                    </div>

                    <div className="row">
                      {/* Phone */}
                      <div className="col-md-6">
                        <div className="form-group">
                          <label htmlFor="phone">
                            <FaPhone className="mr-2" />
                            Số điện thoại <span className="text-danger">*</span>
                          </label>
                          <input
                            type="tel"
                            className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
                            id="phone"
                            name="phone"
                            value={form.phone}
                            onChange={handleInputChange}
                            placeholder="Nhập số điện thoại"
                            required
                          />
                          {errors.phone && <div className="invalid-feedback">{errors.phone}</div>}
                        </div>
                      </div>

                      {/* Address */}
                      <div className="col-md-6">
                        <div className="form-group">
                          <label htmlFor="address">
                            <FaMapMarkerAlt className="mr-2" />
                            Địa chỉ <span className="text-danger">*</span>
                          </label>
                          <textarea
                            className={`form-control ${errors.address ? 'is-invalid' : ''}`}
                            id="address"
                            name="address"
                            value={form.address}
                            onChange={handleInputChange}
                            placeholder="Nhập địa chỉ"
                            rows="3"
                            required
                          />
                          {errors.address && <div className="invalid-feedback">{errors.address}</div>}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="card-footer">
                    <div className="row">
                      <div className="col-md-6">
                        <button
                          type="submit"
                          className="btn btn-primary btn-block"
                          disabled={loading}
                        >
                          {loading ? (
                            <>
                              <i className="fas fa-spinner fa-spin mr-2"></i>
                              Đang tạo...
                            </>
                          ) : (
                            <>
                              <i className="fas fa-save mr-2"></i>
                              Tạo Supplier
                            </>
                          )}
                        </button>
                      </div>
                      <div className="col-md-6">
                        <button
                          type="button"
                          className="btn btn-secondary btn-block"
                          onClick={() => {
                            setForm({
                              email: '',
                              password: '',
                              first_name: '',
                              last_name: '',
                              phone: '',
                              address: ''
                            });
                            setPasswordStrength({ score: 0, feedback: '', color: '#dc3545', width: '0%' });
                            setErrors({});
                          }}
                          disabled={loading}
                        >
                          <i className="fas fa-undo mr-2"></i>
                          Reset Form
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
                </div>
              )}
              
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default CreateSupplier;
