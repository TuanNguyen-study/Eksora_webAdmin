import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTours, getCategories, getSuppliers, updateTour, getToursByRole, approveTour, toggleTourStatus, getCurrentUserRole, getUser, testEndpoints } from '../api/api';
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
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    price_child: '',
    image: [''],
    location: '',
    rating: '',
    cateID: { _id: '', name: '', image: '' },
    supplier_id: { _id: '', name: '', email: '', phone: '', address: '', description: '' },
    opening_time: '',
    closing_time: '',
    services: []
  });
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
  const [userRole, setUserRole] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // Helper function để kiểm tra quyền admin
  const isAdmin = () => userRole === 'admin';

  useEffect(() => {
    async function fetchTours() {
      setLoading(true);
      setError(null);
      try {
        // Lấy thông tin user và role trước
        const [role, userProfile] = await Promise.all([
          getCurrentUserRole(),
          getUser()
        ]);
        setUserRole(role);
        setCurrentUser(userProfile);
        
        // Lấy tours theo role
        let data = await getToursByRole();
        
        console.log('=== TOURS FROM API (BY ROLE) ===');
        console.log('User role:', role);
        console.log('Total tours:', data.length);
        console.log('Sample tour IDs:');
        data.slice(0, 5).forEach((tour, index) => {
          console.log(`Tour ${index + 1}: ID=${tour._id}, Name=${tour.name}, Status=${tour.status}`);
        });
        console.log('====================================');
        
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
    getSuppliers().then(data => {
      console.log('Suppliers data:', data);
      console.log('Suppliers count:', data?.length);
      
      // Kiểm tra và loại bỏ duplicate IDs
      const supplierArray = Array.isArray(data) ? data : [];
      const ids = supplierArray.map(s => s._id);
      const uniqueIds = [...new Set(ids)];
      
      if (ids.length !== uniqueIds.length) {
        console.warn('FOUND DUPLICATE SUPPLIER IDs:', ids.filter((id, index) => ids.indexOf(id) !== index));
        console.warn('Filtering out duplicates...');
        
        // Lọc suppliers unique theo _id, giữ supplier đầu tiên cho mỗi ID
        const uniqueSuppliers = supplierArray.filter((supplier, index, self) => 
          index === self.findIndex(s => s._id === supplier._id)
        );
        
        console.log('Original suppliers count:', supplierArray.length);
        console.log('Unique suppliers count:', uniqueSuppliers.length);
        setSuppliers(uniqueSuppliers);
      } else {
        console.log('No duplicate supplier IDs found');
        setSuppliers(supplierArray);
      }
    }).catch(error => {
      console.error('Error loading suppliers:', error);
      setSuppliers([]);
    });
  }, [selectedCategory, selectedMonth, selectedYear, priceRange, tourFilter, selectedProvince, selectedCategoryForProvince]);

  const handleView = (tour) => {
    setSelectedTour(tour);
    setModalType('view');
    setShowModal(true);
  };

  const handleEdit = (tour) => {
    console.log('=== EDIT TOUR DEBUG ===');
    console.log('Selected tour object:', tour);
    console.log('Tour ID:', tour._id);
    console.log('Tour ID type:', typeof tour._id);
    console.log('=======================');
    
    setSelectedTour(tour);
    setForm({ 
      ...tour, 
      cateID: tour.cateID || { _id: '', name: '', image: '' },
      supplier_id: tour.supplier_id || { _id: '', name: '', email: '', phone: '', address: '', description: '' },
      services: tour.services || []
    });
    setModalType('edit');
    setShowModal(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Bạn có chắc muốn xóa tour này?')) {
      setTours(tours.filter(t => t._id !== id));
    }
  };

  const handleAdd = () => {
    navigate('/add-tour');
  };

  // Hàm xử lý approve tour (chỉ dành cho admin)
  const handleApproveTour = async (tourId, approved = true) => {
    // Kiểm tra quyền admin trước khi thực hiện
    if (userRole !== 'admin') {
      alert('Bạn không có quyền thực hiện hành động này!');
      return;
    }

    try {
      await approveTour(tourId, approved);
      
      // Reload tours sau khi approve/reject
      console.log('Reloading tours after approval...');
      const data = await getToursByRole();
      setTours(data);
      
      // Toast message đã được hiển thị trong API, không cần alert thêm
      console.log('Tour approval completed successfully');
    } catch (error) {
      console.error('Error approving tour:', error);
      
      // Toast error message đã được hiển thị trong API, không cần alert thêm
      console.log('Error toast should be displayed by API layer');
    }
  };

  // Hàm xử lý thay đổi trạng thái tour (chỉ dành cho admin)
  const handleToggleStatus = async (tourId, currentStatus) => {
    // Kiểm tra quyền admin trước khi thực hiện
    if (userRole !== 'admin') {
      alert('Bạn không có quyền thực hiện hành động này!');
      return;
    }

    console.log('=== HANDLE TOGGLE STATUS DEBUG ===');
    console.log('Tour ID:', tourId);
    console.log('Current Status:', currentStatus);
    console.log('User Role:', userRole);
    console.log('===================================');

    // Test endpoints trước khi toggle
    console.log('Testing available endpoints...');
    await testEndpoints(tourId);

    try {
      const isCurrentlyActive = currentStatus === 'active';
      const newStatus = !isCurrentlyActive;
      
      console.log('Is Currently Active:', isCurrentlyActive);
      console.log('New Status (boolean):', newStatus);
      
      await toggleTourStatus(tourId, newStatus);
      
      // Reload tours sau khi thay đổi trạng thái
      console.log('Reloading tours after status change...');
      const data = await getToursByRole();
      setTours(data);
      
      // Toast message đã được hiển thị trong API, không cần alert thêm
      console.log('Status toggle completed successfully');
    } catch (error) {
      console.error('=== FRONTEND ERROR DETAILS ===');
      console.error('Error toggling tour status:', error);
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Error response status:', error.response?.status);
      console.error('Error response data:', error.response?.data);
      console.error('==============================');
      
      // Toast error message đã được hiển thị trong API, không cần alert thêm
      console.log('Error toast should be displayed by API layer');
    }
  };

  const handleFormChange = (e) => {
    // Hỗ trợ cả event từ input/select và object từ CKEditor
    if (e && e.target) {
      const { name, value } = e.target;
      if (name.startsWith('cateID.')) {
        // Handle category selection by name, find the actual category object
        const selectedCategory = categories.find(cat => cat.name === value);
        setForm({ ...form, cateID: selectedCategory || { _id: '', name: value } });
      } else if (name === 'supplier_id') {
        // Tìm supplier object từ danh sách
        const selectedSupplier = suppliers.find(sup => sup._id === value);
        setForm({ ...form, supplier_id: selectedSupplier || { _id: value } });
      } else if (name === 'price' || name === 'price_child') {
        // Handle price formatting
        const raw = value.replace(/\D/g, '');
        const formatted = formatNumberVN(raw);
        setForm({ ...form, [name]: formatted });
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
        console.log('=== FORM SUBMIT DEBUG ===');
        console.log('Selected tour:', selectedTour);
        console.log('Form data:', form);
        console.log('Selected tour ID:', selectedTour?._id);
        console.log('ID exists:', !!selectedTour?._id);
        
        if (!selectedTour || !selectedTour._id) {
          alert('Lỗi: Không tìm thấy ID tour để cập nhật');
          return;
        }
        
        // Check if tour still exists in current tours list
        const tourExists = tours.find(t => t._id === selectedTour._id);
        if (!tourExists) {
          alert('Lỗi: Tour không còn tồn tại trong danh sách. Vui lòng refresh trang.');
          setShowModal(false);
          return;
        }
        
        console.log('Tour exists in current list:', !!tourExists);
        
        // Prepare data for update - match exact API format
        const updateData = {
          name: form.name,
          description: form.description,
          price: typeof form.price === 'string' ? Number(form.price.replace(/\./g, '')) : Number(form.price),
          price_child: typeof form.price_child === 'string' ? Number(form.price_child.replace(/\./g, '')) : Number(form.price_child),
          image: Array.isArray(form.image) ? form.image : [form.image || ''],
          cateID: form.cateID?._id || null,
          supplier_id: form.supplier_id?._id || null,
          location: form.location,
          opening_time: form.opening_time,
          closing_time: form.closing_time,
          services: (form.services || []).map(service => ({
            name: service.name,
            type: service.type,
            options: (service.options || []).map(option => ({
              title: option.title,
              price_extra: Number(option.price_extra) || 0
            }))
          }))
        };
        
        console.log('Data being sent to API:', updateData);
        console.log('Tour ID being sent:', selectedTour._id);
        console.log('API call: updateTour(' + selectedTour._id + ', updateData)');
        console.log('========================');
        
        const updated = await updateTour(selectedTour._id, updateData);
        setTours(tours.map(t => t._id === selectedTour._id ? updated : t));
        alert('Cập nhật tour thành công!');
        setShowModal(false);
      } catch (err) {
        console.error('Error updating tour:', err);
        alert('Lỗi khi cập nhật tour: ' + (err.message || 'Unknown error'));
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
              <div className="d-flex align-items-center">
                <h1 className={isDark ? 'text-light' : 'text-dark'}>Quản lý Tour</h1>
                {isAdmin() && (
                  <small className="text-muted ml-3">
                    <i className="fas fa-info-circle mr-1"></i>
                    Hiển thị tất cả tours (đã duyệt và chờ duyệt)
                  </small>
                )}
                {userRole === 'supplier' && (
                  <small className="text-muted ml-3">
                    <i className="fas fa-info-circle mr-1"></i>
                    Hiển thị tours của bạn
                  </small>
                )}
              </div>
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
                  {(selectedProvince || selectedCategory) && (
                    <button className="btn btn-outline-secondary btn-sm ml-2" onClick={() => { setSelectedProvince(''); setSelectedCategory(''); setCurrentPage(1); }}>Hiển thị tất cả tour</button>
                  )}
                </div>
                {/* Bảng tour */}
                <div className="col-md-12">
                  {userRole === 'supplier' && (
                    <button className="btn btn-primary mb-3" onClick={handleAdd}>Thêm Tour mới</button>
                  )}
                  {loading && <div>Đang tải dữ liệu...</div>}
                  {error && <div className="alert alert-danger">{error}</div>}
                  {!loading && !error && (
                    <>
                      <div className={`card`}>
                        <div className="card-body">
                          <table className={`table table-bordered`}>
                            <thead>
                              <tr>
                                <th>Tên Tour</th>
                                <th>Địa điểm</th>
                                <th>Giá (Người lớn / Trẻ em)</th>
                                <th>Thời gian hoạt động</th>
                                <th>Danh mục</th>
                                {isAdmin() && <th>Trạng thái</th>}
                                {isAdmin() && <th>Nhà cung cấp</th>}
                                <th>Hành động</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pagedTours
                                .filter(tour =>
                                  (!selectedProvince || tour.province === selectedProvince) &&
                                  (!selectedCategory || (tour.cateID && (tour.cateID._id === selectedCategory || tour.cateID.name === categories.find(c => c._id === selectedCategory)?.name)))
                                )
                                .map((tour, index) => (
                                  <tr key={`tour-${tour._id}-${index}`}>
                                    <td>{tour.name}</td>
                                    <td>{tour.location}</td>
                                    <td>
                                      {Number(tour.price).toLocaleString('vi-VN')}VNĐ
                                      {typeof tour.price_child !== 'undefined' &&
                                        <>
                                          <br/>
                                          <span style={{ color: '#888', fontSize: 13 }}>
                                            {Number(tour.price_child).toLocaleString('vi-VN')}VNĐ (trẻ em)
                                          </span>
                                        </>
                                      }
                                    </td>
                                    <td>
                                      {(tour.open_time || tour.opening_time || 'N/A') + ' - ' + (tour.close_time || tour.closing_time || 'N/A')}
                                    </td>
                                    <td>{tour.cateID?.name}</td>
                                    {isAdmin() && (
                                      <td>
                                        <span className={`badge badge-${
                                          tour.status === 'requested' ? 'warning' : 
                                          tour.status === 'active' ? 'success' : 
                                          tour.status === 'deactive' ? 'danger' : 
                                          'secondary'
                                        }`}>
                                          {tour.status === 'requested' ? 'Chờ duyệt' : 
                                           tour.status === 'active' ? 'Active' :
                                           tour.status === 'deactive' ? 'Deactive' : tour.status}
                                        </span>
                                      </td>
                                    )}
                                    {isAdmin() && (
                                      <td>{tour.supplier_id?.name || 'N/A'}</td>
                                    )}
                                    <td>
                                      <button className="btn btn-info btn-sm mr-2" onClick={() => handleView(tour)}>
                                        <i className="fas fa-eye mr-1"></i> Xem
                                      </button>
                                      {userRole === 'supplier' && (
                                        <button className="btn btn-warning btn-sm mr-2" onClick={() => handleEdit(tour)}>
                                          <i className="fas fa-edit mr-1"></i> Sửa
                                        </button>
                                      )}
                                      {isAdmin() && tour.status === 'requested' && (
                                        <>
                                          <button 
                                            className="btn btn-success btn-sm mr-2" 
                                            onClick={() => handleApproveTour(tour._id, true)}
                                            title="Duyệt tour"
                                          >
                                            <i className="fas fa-check mr-1"></i> Duyệt
                                          </button>
                                          <button 
                                            className="btn btn-danger btn-sm mr-2" 
                                            onClick={() => handleApproveTour(tour._id, false)}
                                            title="Từ chối tour"
                                          >
                                            <i className="fas fa-times mr-1"></i> Từ chối
                                          </button>
                                        </>
                                      )}
                                      {isAdmin() && (tour.status === 'active' || tour.status === 'deactive') && (
                                        <button 
                                          className={`btn btn-sm mr-2 ${tour.status === 'active' ? 'btn-warning' : 'btn-success'}`}
                                          onClick={() => handleToggleStatus(tour._id, tour.status)}
                                          title={tour.status === 'active' ? 'Hủy kích hoạt tour' : 'Kích hoạt tour'}
                                        >
                                          <i className={`fas ${tour.status === 'active' ? 'fa-eye-slash' : 'fa-eye'} mr-1`}></i>
                                          {tour.status === 'active' ? 'Deactive' : 'Active'}
                                        </button>
                                      )}
                                      {userRole === 'supplier' && (
                                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(tour._id)}>
                                          <i className="fas fa-trash mr-1"></i> Xóa
                                        </button>
                                      )}
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
        <div
          className="modal-dialog modal-lg"
          role="document"
          style={{
            maxWidth: 900,
            width: '100%',
            maxHeight: 'calc(100vh - 40px)',
            margin: '20px auto',
            boxSizing: 'border-box',
          }}
        >
            <div className="modal-content bg-white text-dark" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 100px)' }}>
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
                        <img key={`view-img-${selectedTour._id}-${idx}`} src={img} alt="tour" style={{ width: 180, height: 120, objectFit: 'cover', marginRight: 8, marginBottom: 8, borderRadius: 8, boxShadow: '0 2px 8px #ccc' }} />
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
                      {isAdmin() && (
                        <div className="col-md-6 mb-2">
                          <b>Trạng thái:</b> 
                          <span className={`ml-1 badge badge-${
                            selectedTour.status === 'requested' ? 'warning' : 
                            selectedTour.status === 'active' ? 'success' : 
                            selectedTour.status === 'deactive' ? 'danger' : 
                            'secondary'
                          }`}>
                            {selectedTour.status === 'requested' ? 'Chờ duyệt' : 
                             selectedTour.status === 'active' ? 'Active' :
                             selectedTour.status === 'deactive' ? 'Deactive' : selectedTour.status}
                          </span>
                        </div>
                      )}
                      {isAdmin() && (
                        <div className="col-md-6 mb-2">
                          <b>Nhà cung cấp:</b> <span className="ml-1">{selectedTour.supplier_id?.name || 'N/A'}</span>
                        </div>
                      )}
                      {userRole === 'supplier' && (
                        <div className="col-md-6 mb-2">
                          <b>Trạng thái:</b> <span className="ml-1">{selectedTour.status === 'active' ? 'Active' : 'Deactive'}</span>
                        </div>
                      )}
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
                            <label><FaTag className="mr-1" />Giá người lớn</label>
                            <div className="input-group">
                              <input
                                type="text"
                                className="form-control bg-light"
                                name="price"
                                value={formatNumberVN(form.price)}
                                onChange={handleFormChange}
                                required
                              />
                              <div className="input-group-append">
                                <span className="input-group-text">VNĐ</span>
                              </div>
                            </div>
                          </div>
                          <div className="form-group col-md-6">
                            <label><FaTag className="mr-1" />Giá trẻ em</label>
                            <div className="input-group">
                              <input
                                type="text"
                                className="form-control bg-light"
                                name="price_child"
                                value={formatNumberVN(form.price_child)}
                                onChange={handleFormChange}
                                required
                              />
                              <div className="input-group-append">
                                <span className="input-group-text">VNĐ</span>
                              </div>
                            </div>
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
                          <select className="form-control bg-light" name="supplier_id" value={form.supplier_id?._id || ''} onChange={handleFormChange} required>
                            <option value="">-- Chọn nhà cung cấp --</option>
                            {suppliers.map((sup, idx) => (
                              <option key={`supplier-${sup._id || 'unknown'}-${idx}`} value={sup._id}>{sup.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-row">
                          <div className="form-group col-md-6">
                            <label><i className="fas fa-clock mr-1" />Giờ mở cửa</label>
                            <input type="time" className="form-control bg-light" name="opening_time" value={form.opening_time || ''} onChange={handleFormChange} required />
                          </div>
                          <div className="form-group col-md-6">
                            <label><i className="fas fa-clock mr-1" />Giờ đóng cửa</label>
                            <input type="time" className="form-control bg-light" name="closing_time" value={form.closing_time || ''} onChange={handleFormChange} required />
                          </div>
                        </div>
                        <div className="form-group">
                          <label><span className="mr-1"><i className="fas fa-image" /></span>Ảnh (chọn nhiều ảnh)</label>
                          <input type="file" className="form-control-file" accept="image/*" multiple onChange={handleImageUpload} />
                          <div className="d-flex flex-wrap mt-2">
                            {form.image && form.image.map((img, idx) => (
                              <img key={`form-img-${idx}-${form.name || 'new'}-${Date.now()}`} src={img} alt="tour" style={{ width: 60, height: 40, objectFit: 'cover', marginRight: 8, marginBottom: 8 }} />
                            ))}
                          </div>
                        </div>
                        {/* Services Section */}
                        <div className="form-group">
                          <label><i className="fas fa-concierge-bell mr-1" />Dịch vụ</label>
                          <div className="border rounded p-3" style={{ backgroundColor: '#f8f9fa' }}>
                            {form.services && form.services.map((service, serviceIndex) => (
                              <div key={serviceIndex} className="mb-3 p-3 border rounded bg-white">
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                  <h6 className="mb-0">Dịch vụ {serviceIndex + 1}</h6>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-danger"
                                    onClick={() => {
                                      const newServices = form.services.filter((_, idx) => idx !== serviceIndex);
                                      setForm({ ...form, services: newServices });
                                    }}
                                  >
                                    <i className="fas fa-trash"></i>
                                  </button>
                                </div>
                                
                                <div className="form-row mb-2">
                                  <div className="col-md-8">
                                    <label>Tên dịch vụ</label>
                                    <input
                                      type="text"
                                      className="form-control"
                                      value={service.name || ''}
                                      onChange={(e) => {
                                        const newServices = [...form.services];
                                        newServices[serviceIndex].name = e.target.value;
                                        setForm({ ...form, services: newServices });
                                      }}
                                      placeholder="Ví dụ: Loại hướng dẫn viên"
                                    />
                                  </div>
                                  <div className="col-md-4">
                                    <label>Loại</label>
                                    <select
                                      className="form-control"
                                      value={service.type || 'single'}
                                      onChange={(e) => {
                                        const newServices = [...form.services];
                                        newServices[serviceIndex].type = e.target.value;
                                        setForm({ ...form, services: newServices });
                                      }}
                                    >
                                      <option value="single">Chọn một</option>
                                      <option value="multiple">Chọn nhiều</option>
                                    </select>
                                  </div>
                                </div>

                                <label>Tùy chọn</label>
                                {service.options && service.options.map((option, optionIndex) => (
                                  <div key={optionIndex} className="form-row mb-2 align-items-end">
                                    <div className="col-md-6">
                                      <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Tên tùy chọn"
                                        value={option.title || ''}
                                        onChange={(e) => {
                                          const newServices = [...form.services];
                                          newServices[serviceIndex].options[optionIndex].title = e.target.value;
                                          setForm({ ...form, services: newServices });
                                        }}
                                      />
                                    </div>
                                    <div className="col-md-4">
                                      <input
                                        type="number"
                                        className="form-control"
                                        placeholder="Giá thêm"
                                        value={option.price_extra || 0}
                                        onChange={(e) => {
                                          const newServices = [...form.services];
                                          newServices[serviceIndex].options[optionIndex].price_extra = parseInt(e.target.value) || 0;
                                          setForm({ ...form, services: newServices });
                                        }}
                                      />
                                    </div>
                                    <div className="col-md-2">
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-danger"
                                        onClick={() => {
                                          const newServices = [...form.services];
                                          newServices[serviceIndex].options = newServices[serviceIndex].options.filter((_, idx) => idx !== optionIndex);
                                          setForm({ ...form, services: newServices });
                                        }}
                                      >
                                        <i className="fas fa-times"></i>
                                      </button>
                                    </div>
                                  </div>
                                ))}
                                
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() => {
                                    const newServices = [...form.services];
                                    if (!newServices[serviceIndex].options) {
                                      newServices[serviceIndex].options = [];
                                    }
                                    newServices[serviceIndex].options.push({ title: '', price_extra: 0 });
                                    setForm({ ...form, services: newServices });
                                  }}
                                >
                                  <i className="fas fa-plus mr-1"></i>Thêm tùy chọn
                                </button>
                              </div>
                            ))}
                            
                            <button
                              type="button"
                              className="btn btn-outline-success btn-sm"
                              onClick={() => {
                                const newService = {
                                  name: '',
                                  type: 'single',
                                  options: [{ title: '', price_extra: 0 }]
                                };
                                setForm({ ...form, services: [...(form.services || []), newService] });
                              }}
                            >
                              <i className="fas fa-plus mr-1"></i>Thêm dịch vụ
                            </button>
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
              {modalType === 'view' && selectedTour && (
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                    <i className="fas fa-times mr-1"></i>Đóng
                  </button>
                  {isAdmin() && selectedTour.status === 'requested' && (
                    <>
                      <button 
                        type="button" 
                        className="btn btn-success" 
                        onClick={() => {
                          handleApproveTour(selectedTour._id, true);
                          setShowModal(false);
                        }}
                      >
                        <i className="fas fa-check mr-1"></i>Duyệt Tour
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-danger" 
                        onClick={() => {
                          handleApproveTour(selectedTour._id, false);
                          setShowModal(false);
                        }}
                      >
                        <i className="fas fa-times mr-1"></i>Từ chối Tour
                      </button>
                    </>
                  )}
                  {isAdmin() && (selectedTour.status === 'active' || selectedTour.status === 'deactive') && (
                    <button 
                      type="button" 
                      className={`btn ${selectedTour.status === 'active' ? 'btn-warning' : 'btn-success'}`}
                      onClick={() => {
                        handleToggleStatus(selectedTour._id, selectedTour.status);
                        setShowModal(false);
                      }}
                    >
                      <i className={`fas ${selectedTour.status === 'active' ? 'fa-eye-slash' : 'fa-eye'} mr-1`}></i>
                      {selectedTour.status === 'active' ? 'Deactive Tour' : 'Active Tour'}
                    </button>
                  )}
                  {userRole === 'supplier' && (
                    <button 
                      type="button" 
                      className="btn btn-warning" 
                      onClick={() => handleEdit(selectedTour)}
                    >
                      <i className="fas fa-edit mr-1"></i>Sửa Tour
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Tour;
