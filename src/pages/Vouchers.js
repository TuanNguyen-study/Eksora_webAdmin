import React, { useState, useEffect } from 'react';
import { getPromotion, deleteVoucher, createVoucher, getTours, toggleVoucherStatus } from '../api/api';

function Vouchers() {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('view'); // 'view', 'edit', 'add'
  const [form, setForm] = useState({ 
    tour_id: '', 
    code: '', 
    discount: '', 
    condition: '', 
    start_date: '', 
    end_date: '' 
  });
  const [tours, setTours] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const vouchersPerPage = 10;

  useEffect(() => {
    async function fetchVouchers() {
      setLoading(true);
      setError(null);
      try {
        const data = await getPromotion();
        // Đảm bảo data là array
        const voucherArray = Array.isArray(data) ? data : [];
        setVouchers(voucherArray);
      } catch (err) {
        setError('Không thể tải danh sách voucher!');
        setVouchers([]); // Set empty array khi có lỗi
      } finally {
        setLoading(false);
      }
    }
    fetchVouchers();
  }, []);

  useEffect(() => {
    async function fetchTours() {
      try {
        const data = await getTours();
        setTours(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Không thể tải danh sách tours:', err);
        setTours([]);
      }
    }
    fetchTours();
  }, []);

  const handleView = (voucher) => {
    setSelectedVoucher(voucher);
    setModalType('view');
    setShowModal(true);
  };

  const handleEdit = (voucher) => {
    setSelectedVoucher(voucher);
    setForm(voucher);
    setModalType('edit');
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc muốn xóa voucher này?')) {
      try {
        setLoading(true);
        await deleteVoucher(id);
        
        // Cập nhật lại danh sách voucher sau khi xóa thành công
        setVouchers(vouchers.filter(v => v._id !== id));
        
        // Nếu đang trong modal và xóa voucher hiện tại, đóng modal
        if (selectedVoucher && selectedVoucher._id === id) {
          setShowModal(false);
          setSelectedVoucher(null);
        }
      } catch (error) {
        console.error('Lỗi khi xóa voucher:', error);
        // Toast error đã được xử lý trong API
      } finally {
        setLoading(false);
      }
    }
  };

  const handleToggleStatus = async (voucher) => {
    try {
      setLoading(true);
      console.log('=== TOGGLE VOUCHER STATUS ===');
      console.log('Current voucher:', voucher);
      console.log('Current status:', voucher.status);
      
      // Determine new status - toggle current status
      const newStatus = voucher.status === 'active' ? false : true;
      console.log('New status will be:', newStatus ? 'active' : 'deactive');
      
      // Call API to toggle status
      await toggleVoucherStatus(voucher._id, newStatus);
      
      // Update voucher list with new status
      setVouchers(prevVouchers => 
        prevVouchers.map(v => 
          v._id === voucher._id 
            ? { ...v, status: newStatus ? 'active' : 'deactive' }
            : v
        )
      );
      
      console.log('Status toggled successfully');
    } catch (error) {
      console.error('Error toggling voucher status:', error);
      // Toast error đã được xử lý trong API
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setForm({ 
      tour_id: '', 
      code: '', 
      discount: '', 
      condition: '', 
      start_date: '', 
      end_date: '' 
    });
    setModalType('add');
    setShowModal(true);
  };

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    if (modalType === 'add') {
      try {
        setLoading(true);
        
        // Validate form
        if (!form.tour_id || !form.code || !form.discount || !form.condition || !form.start_date || !form.end_date) {
          alert('Vui lòng điền đầy đủ thông tin!');
          return;
        }
        
        const voucherData = {
          tour_id: form.tour_id,
          code: form.code,
          discount: parseInt(form.discount),
          condition: form.condition,
          start_date: form.start_date,
          end_date: form.end_date
        };
        
        const newVoucher = await createVoucher(voucherData);
        
        // Refresh voucher list
        const updatedVouchers = await getPromotion();
        setVouchers(Array.isArray(updatedVouchers) ? updatedVouchers : []);
        
        setShowModal(false);
        setForm({ 
          tour_id: '', 
          code: '', 
          discount: '', 
          condition: '', 
          start_date: '', 
          end_date: '' 
        });
      } catch (error) {
        console.error('Lỗi khi tạo voucher:', error);
        // Toast error đã được xử lý trong API
      } finally {
        setLoading(false);
      }
    } else if (modalType === 'edit') {
      // TODO: Implement edit functionality
      setVouchers(vouchers.map(v => v._id === selectedVoucher._id ? { ...form, _id: v._id } : v));
      setShowModal(false);
    }
  };

  // Phân trang
  const indexOfLastVoucher = currentPage * vouchersPerPage;
  const indexOfFirstVoucher = indexOfLastVoucher - vouchersPerPage;
  const currentVouchers = Array.isArray(vouchers) ? vouchers.slice(indexOfFirstVoucher, indexOfLastVoucher) : [];
  const totalPages = Math.ceil((vouchers?.length || 0) / vouchersPerPage);
  const isDark = document.body.classList.contains('dark-mode');

  return (
    <div className={`content-wrapper ${isDark ? 'bg-dark text-light' : 'bg-white'}`}>
      <div className={`content-header ${isDark ? 'bg-dark text-light' : 'bg-white'}`}>
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className={isDark ? 'text-light' : 'text-dark'}>Quản lý Voucher</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><a href="#">Home</a></li>
                <li className="breadcrumb-item active">Voucher</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
      <section className="content">
        <div className="container-fluid">
          <button className="btn btn-primary mb-3" onClick={handleAdd}>
            <i className="fas fa-plus mr-1"></i> Thêm Voucher mới
          </button>
          {loading && <div>Đang tải dữ liệu...</div>}
          {error && <div className="alert alert-danger">{error}</div>}
          {!loading && !error && (
            <>
              <div className={`card ${isDark ? 'bg-dark text-light' : ''}`}>
                <div className="card-body">
                  {currentVouchers && currentVouchers.length > 0 ? (
                    <>
                      <table className={`table table-bordered ${isDark ? 'bg-dark text-light' : ''}`}>
                        <thead>
                          <tr>
                            <th>Mã Voucher</th>
                            <th>Giảm giá (%)</th>
                            <th>Điều kiện</th>
                            <th>Ngày bắt đầu</th>
                            <th>Ngày kết thúc</th>
                            <th>Trạng thái</th>
                            <th>Hành động</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentVouchers.map(voucher => (
                            <tr key={voucher._id}>
                              <td>{voucher.code}</td>
                              <td>{voucher.discount}</td>
                              <td>{voucher.condition}</td>
                              <td>{voucher.start_date ? new Date(voucher.start_date).toLocaleDateString() : ''}</td>
                              <td>{voucher.end_date ? new Date(voucher.end_date).toLocaleDateString() : ''}</td>
                              <td>
                                <span className={`badge ${voucher.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                                  {voucher.status === 'active' ? 'Hoạt động' : 'Ngừng hoạt động'}
                                </span>
                              </td>
                              <td>
                                <button className="btn btn-info btn-sm mr-2" onClick={() => handleView(voucher)}>
                                  <i className="fas fa-eye mr-1"></i> Xem
                                </button>
                                <button 
                                  className={`btn btn-sm mr-2 ${voucher.status === 'active' ? 'btn-warning' : 'btn-success'}`}
                                  onClick={() => handleToggleStatus(voucher)}
                                  disabled={loading}
                                >
                                  {loading ? (
                                    <>
                                      <i className="fas fa-spinner fa-spin mr-1"></i> Đang cập nhật...
                                    </>
                                  ) : (
                                    voucher.status === 'active' ? (
                                      <>
                                        <i className="fas fa-pause-circle mr-1"></i> Tạm dừng
                                      </>
                                    ) : (
                                      <>
                                        <i className="fas fa-play-circle mr-1"></i> Kích hoạt
                                      </>
                                    )
                                  )}
                                </button>
                                <button 
                                  className="btn btn-danger btn-sm" 
                                  onClick={() => handleDelete(voucher._id)}
                                  disabled={loading}
                                >
                                  {loading ? (
                                    <>
                                      <i className="fas fa-spinner fa-spin mr-1"></i> Đang xóa...
                                    </>
                                  ) : (
                                    <>
                                      <i className="fas fa-trash mr-1"></i> Xóa
                                    </>
                                  )}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <i className="fas fa-inbox fa-3x mb-3 text-muted"></i>
                      <h5>Không có voucher nào</h5>
                      <p>Hiện tại chưa có voucher nào trong hệ thống.</p>
                    </div>
                  )}
                  <div className="d-flex justify-content-between align-items-center mt-2">
                    <div>
                      {vouchers && vouchers.length > 0 && (
                        <span>
                          Showing {indexOfFirstVoucher + 1} to {Math.min(indexOfLastVoucher, vouchers.length)} of {vouchers.length} Vouchers
                        </span>
                      )}
                    </div>
                    {totalPages > 1 && (
                      <nav>
                        <ul className="pagination mb-0">
                          <li className={`page-item${currentPage === 1 ? ' disabled' : ''}`}>
                            <button className="page-link" onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1}>Previous</button>
                          </li>
                          {Array.from({ length: totalPages }, (_, i) => (
                            <li key={i + 1} className={`page-item${currentPage === i + 1 ? ' active' : ''}`}>
                              <button className="page-link" onClick={() => setCurrentPage(i + 1)}>{i + 1}</button>
                            </li>
                          ))}
                          <li className={`page-item${currentPage === totalPages ? ' disabled' : ''}`}>
                            <button className="page-link" onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages}>Next</button>
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
      </section>
      <footer className={`main-footer ${isDark ? 'bg-dark text-light' : 'bg-white text-dark'}`}>
        <div className="float-right d-none d-sm-block">
          <b>Version</b> 3.2.0
        </div>
        <strong>Copyright &copy; 2014-2021 <a href="https://adminlte.io">AdminLTE.io</a>.</strong> All rights reserved.
      </footer>
      {showModal && (
        <div className={`modal show d-block ${isDark ? 'bg-dark text-light' : ''}`} tabIndex="-1" role="dialog" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <div className="modal-dialog" role="document">
            <div className={`modal-content ${isDark ? 'bg-dark text-light' : ''}`}>
              <div className={`modal-header ${isDark ? 'bg-dark text-light' : 'bg-light'}`}>
                <h5 className="modal-title">
                  {modalType === 'view' && 'Chi tiết Voucher'}
                  {modalType === 'edit' && 'Sửa Voucher'}
                  {modalType === 'add' && 'Thêm Voucher mới'}
                </h5>
                <button type="button" className="close" onClick={() => setShowModal(false)}>
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body">
                {modalType === 'view' ? (
                  <div>
                    <p><b>Tour:</b> {selectedVoucher.tour_id?.name || 'N/A'}</p>
                    <p><b>Mã Voucher:</b> {selectedVoucher.code}</p>
                    <p><b>Giảm giá:</b> {selectedVoucher.discount}%</p>
                    <p><b>Điều kiện:</b> {selectedVoucher.condition}</p>
                    <p><b>Ngày bắt đầu:</b> {selectedVoucher.start_date ? new Date(selectedVoucher.start_date).toLocaleDateString('vi-VN') : ''}</p>
                    <p><b>Ngày kết thúc:</b> {selectedVoucher.end_date ? new Date(selectedVoucher.end_date).toLocaleDateString('vi-VN') : ''}</p>
                  </div>
                ) : (
                  <form onSubmit={handleFormSubmit}>
                    <div className="form-group">
                      <label htmlFor="tour_id">
                        <i className="fas fa-map-marked-alt mr-1"></i>
                        Chọn Tour <span className="text-danger">*</span>
                      </label>
                      <select 
                        id="tour_id"
                        className={`form-control ${isDark ? 'bg-dark text-light' : ''}`} 
                        name="tour_id" 
                        value={form.tour_id} 
                        onChange={handleFormChange} 
                        required
                      >
                        <option value="">-- Chọn Tour --</option>
                        {tours.map(tour => (
                          <option key={tour._id} value={tour._id}>
                            {tour.name} - {tour.location}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="code">
                        <i className="fas fa-ticket-alt mr-1"></i>
                        Mã Voucher <span className="text-danger">*</span>
                      </label>
                      <input 
                        id="code"
                        type="text" 
                        className={`form-control ${isDark ? 'bg-dark text-light' : ''}`} 
                        name="code" 
                        value={form.code} 
                        onChange={handleFormChange} 
                        placeholder="VD: HNTOUR11034"
                        required 
                      />
                      <small className="form-text text-muted">
                        Mã voucher sẽ được tự động viết hoa
                      </small>
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="discount">
                        <i className="fas fa-percent mr-1"></i>
                        Giảm giá (%) <span className="text-danger">*</span>
                      </label>
                      <input 
                        id="discount"
                        type="number" 
                        className={`form-control ${isDark ? 'bg-dark text-light' : ''}`} 
                        name="discount" 
                        value={form.discount} 
                        onChange={handleFormChange} 
                        min="1" 
                        max="100" 
                        placeholder="25"
                        required 
                      />
                      <small className="form-text text-muted">
                        Nhập số từ 1 đến 100
                      </small>
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="condition">
                        <i className="fas fa-info-circle mr-1"></i>
                        Điều kiện áp dụng <span className="text-danger">*</span>
                      </label>
                      <textarea 
                        id="condition"
                        className={`form-control ${isDark ? 'bg-dark text-light' : ''}`} 
                        name="condition" 
                        value={form.condition} 
                        onChange={handleFormChange} 
                        rows="3"
                        placeholder="VD: Áp dụng cho tour vịnh hạ long"
                        required 
                      />
                    </div>
                    
                    <div className="row">
                      <div className="col-md-6">
                        <div className="form-group">
                          <label htmlFor="start_date">
                            <i className="fas fa-calendar-alt mr-1"></i>
                            Ngày bắt đầu <span className="text-danger">*</span>
                          </label>
                          <input 
                            id="start_date"
                            type="date" 
                            className={`form-control ${isDark ? 'bg-dark text-light' : ''}`} 
                            name="start_date" 
                            value={form.start_date?.slice(0,10) || ''} 
                            onChange={handleFormChange} 
                            min={new Date().toISOString().split('T')[0]}
                            required 
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-group">
                          <label htmlFor="end_date">
                            <i className="fas fa-calendar-check mr-1"></i>
                            Ngày kết thúc <span className="text-danger">*</span>
                          </label>
                          <input 
                            id="end_date"
                            type="date" 
                            className={`form-control ${isDark ? 'bg-dark text-light' : ''}`} 
                            name="end_date" 
                            value={form.end_date?.slice(0,10) || ''} 
                            onChange={handleFormChange} 
                            min={form.start_date || new Date().toISOString().split('T')[0]}
                            required 
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="d-flex justify-content-between">
                      <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                        <i className="fas fa-times mr-1"></i>
                        Hủy
                      </button>
                      <button type="submit" className="btn btn-success" disabled={loading}>
                        {loading ? (
                          <>
                            <i className="fas fa-spinner fa-spin mr-1"></i>
                            Đang xử lý...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-save mr-1"></i>
                            {modalType === 'add' ? 'Tạo Voucher' : 'Cập nhật'}
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
              <div className={`modal-footer ${isDark ? 'bg-dark' : 'bg-light'}`}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  <i className="fas fa-times mr-1"></i>Đóng
                </button>
                {modalType === 'view' && selectedVoucher && (
                  <>
                    <button 
                      type="button" 
                      className="btn btn-warning mr-2" 
                      onClick={() => handleEdit(selectedVoucher)}
                    >
                      <i className="fas fa-edit mr-1"></i>Sửa
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-danger" 
                      onClick={() => {
                        setShowModal(false);
                        handleDelete(selectedVoucher._id);
                      }}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <i className="fas fa-spinner fa-spin mr-1"></i>Đang xóa...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-trash mr-1"></i>Xóa
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Vouchers;
