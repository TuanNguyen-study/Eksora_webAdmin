import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTours, getCategories, getSuppliers, updateTour } from '../api/api';
import { FaTag, FaClock, FaList, FaMapMarkerAlt, FaImage, FaAlignLeft, FaCheckCircle } from 'react-icons/fa';
import { uploadImageToCloudinary } from '../api/cloudinary';
import CkeditorField from '../components/CkeditorField';

function Tour() {
  const navigate = useNavigate();
  // Kiểm tra đăng nhập (ví dụ dùng localStorage key 'isLoggedIn')
  useEffect(() => {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true' || sessionStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn) {
      navigate('/login');
    }
  }, [navigate]);

  const [tours, setTours] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTour, setSelectedTour] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('view'); // 'view', 'edit', 'add'
  const [form, setForm] = useState({ name: '', description: '', price: '', image: [''], duration: '', location: '', rating: '', cateID: { name: '', image: '' }, province: '', status: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [editingDescription, setEditingDescription] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(10000000);
  const [priceRange, setPriceRange] = useState([0, 10000000]);
  // Thêm state cho filter TourFilter
  const [tourFilter, setTourFilter] = useState({ date: 'all', price: [0, 12333334], instant: false });
  // 1. Thêm state để lọc theo province/category khi click thumbnail
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedCategoryForProvince, setSelectedCategoryForProvince] = useState('');
  const [provinceList, setProvinceList] = useState([]);

  useEffect(() => {
    async function fetchTours() {
      setLoading(true);
      setError(null);
      try {
        let data = await getTours();
        // Lọc theo danh mục nếu có chọn
        if (selectedCategory) {
          data = data.filter(t => t.cateID && (t.cateID._id === selectedCategory || t.cateID.name === selectedCategory));
        }
        // Lọc theo tháng/năm nếu có chọn
        if (selectedMonth && selectedYear) {
          data = data.filter(t => {
            if (!t.created_at) return true;
            const d = new Date(t.created_at);
            return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
          });
        }
        // Lọc theo filter từ TourFilter
        if (tourFilter) {
          // Lọc theo ngày
          if (tourFilter.date === 'today') {
            const today = new Date();
            data = data.filter(t => {
              if (!t.created_at) return true;
              const d = new Date(t.created_at);
              return d.toDateString() === today.toDateString();
            });
          } else if (tourFilter.date === 'tomorrow') {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            data = data.filter(t => {
              if (!t.created_at) return true;
              const d = new Date(t.created_at);
              return d.toDateString() === tomorrow.toDateString();
            });
          }
          // Lọc theo giá
          if (tourFilter.price) {
            data = data.filter(t => {
              const price = Number(t.price) || 0;
              return price >= tourFilter.price[0] && price <= tourFilter.price[1];
            });
          }
          // Lọc xác nhận tức thời (giả sử có trường instantConfirm)
          if (tourFilter.instant) {
            data = data.filter(t => t.instantConfirm === true);
          }
        }
        // Tìm min/max giá từ dữ liệu (sau khi lọc)
        if (data.length > 0) {
          const prices = data.map(t => Number(t.price) || 0);
          const min = Math.min(...prices);
          const max = Math.max(...prices);
          setMinPrice(min);
          setMaxPrice(max);
          setPriceRange(prev => (prev[0] === 0 && prev[1] === 10000000) ? [min, max] : prev);
        }
        setTours(data);
        // Lấy danh sách province duy nhất từ tất cả tour
        const provinces = [...new Set(data.map(t => t.province).filter(Boolean))];
        setProvinceList(provinces);
      } catch (err) {
        setError('Không thể tải danh sách tour!');
      } finally {
        setLoading(false);
      }
    }
    fetchTours();
    // Lấy danh mục
    getCategories().then(setCategories).catch(() => setCategories([]));
    // Lấy nhà cung cấp
    getSuppliers().then(setSuppliers).catch(() => setSuppliers([]));
  }, [selectedCategory, selectedMonth, selectedYear, priceRange, tourFilter, selectedProvince, selectedCategoryForProvince]);

  const handleView = (tour) => {
    setSelectedTour(tour);
    setModalType('view');
    setShowModal(true);
  };

  const handleEdit = (tour) => {
    setSelectedTour(tour);
    setForm({ ...tour, cateID: { ...tour.cateID } });
    setModalType('edit');
    setShowModal(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Bạn có chắc muốn xóa tour này?')) {
      setTours(tours.filter(t => t._id !== id));
    }
  };

  const handleAdd = () => {
    setForm({ name: '', description: '', price: '', image: [''], duration: '', location: '', rating: '', cateID: { name: '', image: '' }, province: '' });
    setModalType('add');
    setShowModal(true);
  };

  const handleFormChange = (e) => {
    // Hỗ trợ cả event từ input/select và object từ CKEditor
    if (e && e.target) {
      const { name, value } = e.target;
      if (name.startsWith('cateID.')) {
        setForm({ ...form, cateID: { ...form.cateID, [name.split('.')[1]]: value } });
      } else if (name === 'image') {
        setForm({ ...form, image: value.split(',') });
      } else {
        setForm({ ...form, [name]: value });
      }
    } else if (e && e.name && typeof e.value === 'string') {
      // Trường hợp CKEditor trả về { name, value }
      setForm({ ...form, [e.name]: e.value });
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (modalType === 'add') {
      try {
        const newTour = { ...form, _id: Date.now().toString() };
        setTours([...tours, newTour]);
        alert('Thêm tour thành công!');
        setShowModal(false);
      } catch (err) {
        alert('Lỗi khi tạo tour!');
      }
    } else if (modalType === 'edit') {
      try {
        const updated = await updateTour(selectedTour._id, form);
        setTours(tours.map(t => t._id === selectedTour._id ? updated : t));
        alert('Cập nhật tour thành công!');
        setShowModal(false);
      } catch (err) {
        alert('Lỗi khi cập nhật tour!');
      }
    }
  };

  // Xử lý upload ảnh từ máy tính lên Cloudinary
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    try {
      const urls = await Promise.all(files.map(file => uploadImageToCloudinary(file)));
      setForm({ ...form, image: urls });
    } catch (err) {
      alert('Lỗi upload ảnh!');
    }
  };

  // Pagination logic
  const totalPages = Math.ceil(tours.length / itemsPerPage);
  const pagedTours = tours.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Detect dark mode
  // const isDark = document.body.classList.contains('dark-mode');
  const isDark = false; // Luôn dùng theme sáng

  // Hàm format số có dấu chấm ngăn cách
  function formatNumberVN(value) {
    if (!value) return '';
    // Xóa ký tự không phải số
    const number = value.toString().replace(/\D/g, '');
    return number.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  return (
    <div className={`content-wrapper bg-white text-dark`} style={{ position: 'relative' }}>
      {/* Overlay loading */}
      {loading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(255,255,255,0.7)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div className="spinner-border text-primary" style={{ width: 60, height: 60 }} role="status">
            <span className="sr-only">Đang tải...</span>
          </div>
        </div>
      )}
      <div className={`content-header bg-white text-dark`}>
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className={isDark ? 'text-light' : 'text-dark'}>Quản lý Tour</h1>
            </div>
            <div className="col-sm-6 d-flex justify-content-end align-items-center">
              <ol className="breadcrumb float-sm-right mb-0 mr-3">
                <li className="breadcrumb-item"><a href="#">Home</a></li>
                <li className="breadcrumb-item active">Tour</li>
              </ol>
              
            </div>
          </div>
        </div>
      </div>
      <section className="content">
        <div className="container-fluid">
          <div className="row">
            
            <div className="col-md-12">
              <div className="row">
                <div className="col-12 mb-3 d-flex flex-wrap align-items-center gap-2">
                  <select value={selectedCategory} onChange={e => { setSelectedCategory(e.target.value); setCurrentPage(1); }} className="form-control w-auto mr-2">
                    <option value="">Tất cả danh mục</option>
                    {categories.map(cate => (
                      <option key={cate._id} value={cate._id}>{cate.name}</option>
                    ))}
                  </select>
                  <select value={selectedProvince} onChange={e => { setSelectedProvince(e.target.value); setCurrentPage(1); }} className="form-control w-auto mr-2">
                    <option value="">Tất cả địa điểm</option>
                    {provinceList.map(province => (
                      <option key={province} value={province}>{province}</option>
                    ))}
                  </select>
                  <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} className="form-control w-auto mr-2">
                    {[...Array(12)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>
                    ))}
                  </select>
                  <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="form-control w-auto mr-2">
                    {[...Array(6)].map((_, i) => {
                      const year = new Date().getFullYear() - 3 + i;
                      return <option key={year} value={year}>{year}</option>;
                    })}
                  </select>
                  {(selectedProvince || selectedCategory) && (
                    <button className="btn btn-outline-secondary btn-sm ml-2" onClick={() => { setSelectedProvince(''); setSelectedCategory(''); setCurrentPage(1); }}>Hiển thị tất cả tour</button>
                  )}
                </div>
                {/* Bảng tour */}
                <div className="col-md-12">
                  <button className="btn btn-primary mb-3" onClick={handleAdd}>Thêm Tour mới</button>
                  {loading && <div>Đang tải dữ liệu...</div>}
                  {error && <div className="alert alert-danger">{error}</div>}
                  {!loading && !error && (
                    <>
                      <div className={`card`}>
                        <div className="card-body">
                          <div className="d-flex flex-wrap align-items-center mb-3">
                            <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="form-control w-auto mr-2">
                              <option value="">Tất cả danh mục</option>
                              {categories.map(cate => (
                                <option key={cate._id} value={cate._id}>{cate.name}</option>
                              ))}
                            </select>
                            <select value={selectedProvince} onChange={e => setSelectedProvince(e.target.value)} className="form-control w-auto mr-2">
                              <option value="">Tất cả địa điểm</option>
                              {provinceList.map(province => (
                                <option key={province} value={province}>{province}</option>
                              ))}
                            </select>
                            <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} className="form-control w-auto mr-2">
                              {[...Array(12)].map((_, i) => (
                                <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>
                              ))}
                            </select>
                            <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="form-control w-auto mr-2">
                              {[...Array(6)].map((_, i) => {
                                const year = new Date().getFullYear() - 3 + i;
                                return <option key={year} value={year}>{year}</option>;
                              })}
                            </select>
                          </div>
                          <table className={`table table-bordered`}>
                            <thead>
                              <tr>
                                <th>Tên Tour</th>
                                <th>Địa điểm</th>
                                <th>Giá</th>
                                <th>Thời lượng</th>
                                <th>Danh mục</th>
                                <th>Hành động</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pagedTours
                                .filter(tour =>
                                  (!selectedProvince || tour.province === selectedProvince) &&
                                  (!selectedCategory || (tour.cateID && (tour.cateID._id === selectedCategory || tour.cateID.name === categories.find(c => c._id === selectedCategory)?.name)))
                                )
                                .map(tour => (
                                  <tr key={tour._id}>
                                    <td>{tour.name}</td>
                                    <td>{tour.location}</td>
                                    <td>{Number(tour.price).toLocaleString('vi-VN')}VNĐ</td>
                                    <td>{tour.duration}</td>
                                    <td>{tour.cateID?.name}</td>
                                    <td>
                                      <button className="btn btn-info btn-sm mr-2" onClick={() => handleView(tour)}>
                                        <i className="fas fa-eye mr-1"></i> Xem
                                      </button>
                                      <button className="btn btn-warning btn-sm mr-2" onClick={() => handleEdit(tour)}>
                                        <i className="fas fa-edit mr-1"></i> Sửa
                                      </button>
                                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(tour._id)}>
                                        <i className="fas fa-trash mr-1"></i> Xóa
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                          <div className="d-flex justify-content-between align-items-center mt-2">
                            <div>
                              {tours.length > 0 && (
                                <span>
                                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, tours.length)} of {tours.length} entries
                                </span>
                              )}
                            </div>
                            {totalPages > 1 && (
                              <nav>
                                <ul className="pagination mb-0">
                                  <li className={`page-item${currentPage === 1 ? ' disabled' : ''}`}>
                                    <button className="page-link bg-light text-dark" onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1}>Previous</button>
                                  </li>
                                  {Array.from({ length: totalPages }, (_, i) => (
                                    <li key={i + 1} className={`page-item${currentPage === i + 1 ? ' active' : ''}`}>
                                      <button className={`page-link bg-light${currentPage === i + 1 ? ' text-primary font-weight-bold' : ' text-dark'}`} onClick={() => setCurrentPage(i + 1)}>{i + 1}</button>
                                    </li>
                                  ))}
                                  <li className={`page-item${currentPage === totalPages ? ' disabled' : ''}`}>
                                    <button className="page-link bg-light text-dark" onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages}>Next</button>
                                  </li>
                                </ul>
                              </nav>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <footer className="main-footer bg-white text-dark">
        <div className="float-right d-none d-sm-block">
          <b>Version</b> 3.2.0
        </div>
        <strong>Copyright &copy; 2014-2021 <a href="https://adminlte.io">AdminLTE.io</a>.</strong> All rights reserved.
      </footer>
      {showModal && (
        <div className="modal show d-block" tabIndex="-1" role="dialog" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <div className="modal-dialog modal-lg" role="document">
            <div className="modal-content bg-white text-dark">
              <div className="modal-header bg-light">
                <h5 className="modal-title">
                  {modalType === 'view' && 'Chi tiết Tour'}
                  {modalType === 'edit' && 'Sửa Tour'}
                  {modalType === 'add' && 'Thêm Tour mới'}
                </h5>
                <button type="button" className="close" onClick={() => setShowModal(false)}>
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body">
                {modalType === 'view' ? (
                  <div>
                    <div className="mb-3 d-flex flex-wrap justify-content-center">
                      {selectedTour.image?.map((img, idx) => (
                        <img key={idx} src={img} alt="tour" style={{ width: 180, height: 120, objectFit: 'cover', marginRight: 8, marginBottom: 8, borderRadius: 8, boxShadow: '0 2px 8px #ccc' }} />
                      ))}
                    </div>
                    <div className="row">
                      <div className="col-md-6 mb-2">
                        <b>Tên Tour:</b> <span className="ml-1">{selectedTour.name}</span>
                      </div>
                      <div className="col-md-6 mb-2">
                        <b>Địa điểm:</b> <span className="ml-1">{selectedTour.location}</span>
                      </div>
                      <div className="col-md-6 mb-2">
                        <b>Giá:</b> <span className="ml-1">{Number(selectedTour.price).toLocaleString('vi-VN')}VNĐ</span>
                      </div>
                      <div className="col-md-6 mb-2">
                        <b>Thời lượng:</b> <span className="ml-1">{selectedTour.duration}</span>
                      </div>
                      <div className="col-md-6 mb-2">
                        <b>Danh mục:</b> <span className="ml-1">{selectedTour.cateID?.name}</span>
                      </div>
                      <div className="col-md-6 mb-2">
                        <b>Tỉnh/Thành:</b> <span className="ml-1">{selectedTour.province}</span>
                      </div>
                      <div className="col-md-6 mb-2">
                        <b>Đánh giá:</b> <span className="ml-1">{selectedTour.rating ? `${selectedTour.rating} ★` : 'Chưa có'}</span>
                      </div>
                      <div className="col-md-6 mb-2">
                        <b>Giờ mở cửa:</b> <span className="ml-1">{selectedTour.opening_time || selectedTour.open_time || 'N/A'}</span>
                      </div>
                      <div className="col-md-6 mb-2">
                        <b>Giờ đóng cửa:</b> <span className="ml-1">{selectedTour.closing_time || selectedTour.close_time || 'N/A'}</span>
                      </div>
                      <div className="col-md-6 mb-2">
                        <b>Trạng thái:</b> <span className="ml-1">{selectedTour.status === 'active' ? 'Active' : 'Deactive'}</span>
                      </div>
                    </div>
                    <div className="mt-3">
                      <b>Mô tả:</b>
                      <div style={{ maxHeight: 250, overflowY: 'auto', border: '1px solid #eee', borderRadius: 6, padding: 12, background: '#fafbfc', marginTop: 6 }}>
                        <span dangerouslySetInnerHTML={{ __html: selectedTour.description }} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleFormSubmit}>
                    {!editingDescription && (
                      <>
                        <div className="form-group">
                          <label><FaTag className="mr-1" />Tên Tour</label>
                          <input type="text" className="form-control bg-light" name="name" value={form.name} onChange={handleFormChange} required />
                        </div>
                        <div className="form-group">
                          <label><FaMapMarkerAlt className="mr-1" />Địa điểm</label>
                          <input type="text" className="form-control bg-light" name="location" value={form.location} onChange={handleFormChange} required />
                        </div>
                        <div className="form-row">
                          <div className="form-group col-md-6">
                            <label><FaTag className="mr-1" />Giá</label>
                            <div className="input-group">
                              <input
                                type="text"
                                className="form-control bg-light"
                                name="price"
                                value={formatNumberVN(form.price)}
                                onChange={e => {
                                  // Lưu giá trị số (không dấu chấm) vào state
                                  const raw = e.target.value.replace(/\D/g, '');
                                  setForm({ ...form, price: raw });
                                }}
                                required
                              />
                              <div className="input-group-append">
                                <span className="input-group-text">VNĐ</span>
                              </div>
                            </div>
                          </div>
                          <div className="form-group col-md-6">
                            <label><FaClock className="mr-1" />Thời lượng</label>
                            <select className="form-control bg-light" name="duration" value={form.duration} onChange={handleFormChange} required>
                              <option value="">-- Chọn thời lượng --</option>
                              <option value="Nửa ngày">Nửa ngày</option>
                              <option value="1 Ngày">1 Ngày</option>
                              <option value="2 Ngày 1 Đêm">2 Ngày 1 Đêm</option>
                              <option value="3 Ngày 2 Đêm">3 Ngày 2 Đêm</option>
                            </select>
                          </div>
                        </div>
                        <div className="form-group">
                          <label><FaList className="mr-1" />Danh mục</label>
                          <select className="form-control bg-light" name="cateID.name" value={form.cateID.name} onChange={handleFormChange} required>
                            <option value="">-- Chọn danh mục --</option>
                            {categories.map(cate => (
                              <option key={cate._id} value={cate.name}>{cate.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label><FaList className="mr-1" />Nhà cung cấp</label>
                          <select className="form-control bg-light" name="supplier_id" value={form.supplier_id || ''} onChange={handleFormChange} required>
                            <option value="">-- Chọn nhà cung cấp --</option>
                            {suppliers.map(sup => (
                              <option key={sup._id} value={sup._id}>{sup.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-row">
                          <div className="form-group col-md-6">
                            <label><i className="fas fa-clock mr-1" />Giờ mở cửa</label>
                            <input type="time" className="form-control bg-light" name="open_time" value={form.open_time || ''} onChange={handleFormChange} required />
                          </div>
                          <div className="form-group col-md-6">
                            <label><i className="fas fa-clock mr-1" />Giờ đóng cửa</label>
                            <input type="time" className="form-control bg-light" name="close_time" value={form.close_time || ''} onChange={handleFormChange} required />
                          </div>
                        </div>
                        <div className="form-group">
                          <label><span className="mr-1"><i className="fas fa-image" /></span>Ảnh (chọn nhiều ảnh)</label>
                          <input type="file" className="form-control-file" accept="image/*" multiple onChange={handleImageUpload} />
                          <div className="d-flex flex-wrap mt-2">
                            {form.image && form.image.map((img, idx) => (
                              <img key={idx} src={img} alt="tour" style={{ width: 60, height: 40, objectFit: 'cover', marginRight: 8, marginBottom: 8 }} />
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                    {/* Trường mô tả luôn hiển thị, nhưng khi edit thì các trường khác ẩn */}
                    <div className="form-group" style={{ position: 'relative' }}>
                      <label><FaAlignLeft className="mr-1" />Mô tả</label>
                      {!editingDescription && (
                        <button type="button" className="btn btn-sm btn-outline-primary ml-2" style={{ position: 'absolute', right: 0, top: 0 }} onClick={() => setEditingDescription(true)}>
                          Sửa mô tả
                        </button>
                      )}
                      <div style={{ maxHeight: editingDescription ? 400 : 120, overflowY: 'auto', transition: 'max-height 0.3s', border: editingDescription ? '1px solid #007bff' : undefined, borderRadius: 6, background: '#fff' }}>
                        <CkeditorField
                          name="description"
                          value={form.description}
                          onChange={handleFormChange}
                          readOnly={!editingDescription}
                        />
                      </div>
                      {editingDescription && (
                        <button type="button" className="btn btn-sm btn-success mt-2" onClick={() => setEditingDescription(false)}>
                          Lưu mô tả
                        </button>
                      )}
                    </div>
                    {!editingDescription && (
                      <button type="submit" className="btn btn-success"><i className="fas fa-save mr-1"></i>Lưu</button>
                    )}
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Tour;
