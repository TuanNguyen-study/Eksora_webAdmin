
import React, { useEffect, useState } from 'react';
import { getAllBookings, updateBookingStatus, getCurrentUserRole, getUser } from '../api/api';
import { useLocation } from 'react-router-dom';

function Bookings() {
  const [userId, setUserId] = useState('');
  const [bookings, setBookings] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [productTypeFilter, setProductTypeFilter] = useState('all');
  const [userRole, setUserRole] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [calendarFilters, setCalendarFilters] = useState(null);
  const bookingsPerPage = 10;
  const location = useLocation();

  // Xử lý filters từ calendar
  useEffect(() => {
    if (location.state?.filters) {
      setCalendarFilters(location.state.filters);
      
      // Apply calendar filters
      const { date, tourId, tourName } = location.state.filters;
      
      if (date) {
        setDateFilter('custom');
        // Set date filter to specific date
      }
      
      if (tourId) {
        setProductTypeFilter(tourId);
      }
    }
  }, [location.state]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        // Lấy thông tin user, role và bookings
        const [role, userProfile, bookingsData] = await Promise.all([
          getCurrentUserRole(),
          getUser(),
          getAllBookings()
        ]);
        
        setUserRole(role);
        setCurrentUserId(userProfile._id);
        
        // Nếu là supplier, chỉ hiển thị bookings của tours mà supplier đó cung cấp
        if (role === 'supplier') {
          const supplierBookings = bookingsData.filter(booking => {
            // Kiểm tra nếu tour của booking có supplier_id trùng với current user
            return booking.tour_id?.supplier_id === userProfile._id || 
                   booking.tour_id?.supplier_id?._id === userProfile._id;
          });
          setBookings(supplierBookings);
          setAllBookings(supplierBookings);
        } else {
          // Admin thì hiển thị tất cả bookings
          setBookings(bookingsData);
          setAllBookings(bookingsData);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Không thể tải danh sách booking!');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Hàm lọc tổng hợp
  useEffect(() => {
    let filtered = allBookings;
    
    // Apply calendar filters first
    if (calendarFilters) {
      const { date, tourId } = calendarFilters;
      
      if (date) {
        filtered = filtered.filter(b => {
          // Sử dụng booking_date và so sánh theo ngày (bỏ qua giờ)
          const bookingDate = b.booking_date;
          if (!bookingDate) return false;
          return bookingDate.split('T')[0] === date.split('T')[0];
        });
      }
      
      if (tourId) {
        filtered = filtered.filter(b => {
          const bookingTourId = b.tour_id?._id || b.tour_id;
          return bookingTourId === tourId;
        });
      }
    }
    
    // Lọc theo tên người đặt
    if (searchName.trim()) {
      filtered = filtered.filter(b => {
        const fullName = `${b.user_id?.first_name || ''} ${b.user_id?.last_name || ''}`.toLowerCase();
        return fullName.includes(searchName.trim().toLowerCase());
      });
    }
    // Lọc theo ngày đặt
    if (dateFilter !== 'all' && dateFilter !== 'custom') {
      const today = new Date();
      filtered = filtered.filter(b => {
        if (!b.booking_date) return false;
        const bookingDate = new Date(b.booking_date);
        if (dateFilter === 'today') {
          return (
            bookingDate.getDate() === today.getDate() &&
            bookingDate.getMonth() === today.getMonth() &&
            bookingDate.getFullYear() === today.getFullYear()
          );
        }
        if (dateFilter === 'month') {
          return (
            bookingDate.getMonth() === today.getMonth() &&
            bookingDate.getFullYear() === today.getFullYear()
          );
        }
        if (dateFilter === 'year') {
          return bookingDate.getFullYear() === today.getFullYear();
        }
        return true;
      });
    }
    // Lọc theo trạng thái
    if (statusFilter !== 'all') {
      filtered = filtered.filter(b => b.status === statusFilter);
    }
    // Lọc theo loại sản phẩm
    if (productTypeFilter !== 'all') {
      filtered = filtered.filter(b => {
        if (productTypeFilter === 'tour') return b.tour_id;
        if (productTypeFilter === 'hotel') return b.hotel_id;
        if (productTypeFilter === 'flight') return b.flight_id;
        return true;
      });
    }
    setBookings(filtered);
    setCurrentPage(1);
    // eslint-disable-next-line
  }, [searchName, dateFilter, statusFilter, productTypeFilter, allBookings, calendarFilters]);

  const handleSearch = () => {
    if (!searchName.trim()) {
      setBookings(allBookings);
      return;
    }
    const filtered = allBookings.filter(b => {
      const fullName = `${b.user_id?.first_name || ''} ${b.user_id?.last_name || ''}`.toLowerCase();
      return fullName.includes(searchName.trim().toLowerCase());
    });
    setBookings(filtered);
    setCurrentPage(1);
  };

  const handleFilter = () => {
    let filtered = allBookings;

    // Lọc theo tên người đặt
    if (searchName.trim()) {
      filtered = filtered.filter(b => {
        const fullName = `${b.user_id?.first_name || ''} ${b.user_id?.last_name || ''}`.toLowerCase();
        return fullName.includes(searchName.trim().toLowerCase());
      });
    }

    // Lọc theo ngày đặt (booking_date)
    if (dateFilter !== 'all') {
      const today = new Date();
      filtered = filtered.filter(b => {
        if (!b.booking_date) return false;
        const bookingDate = new Date(b.booking_date);
        if (dateFilter === 'today') {
          return (
            bookingDate.getDate() === today.getDate() &&
            bookingDate.getMonth() === today.getMonth() &&
            bookingDate.getFullYear() === today.getFullYear()
          );
        }
        if (dateFilter === 'month') {
          return (
            bookingDate.getMonth() === today.getMonth() &&
            bookingDate.getFullYear() === today.getFullYear()
          );
        }
        if (dateFilter === 'year') {
          return bookingDate.getFullYear() === today.getFullYear();
        }
        return true;
      });
    }

    // Lọc theo trạng thái
    if (statusFilter !== 'all') {
      filtered = filtered.filter(b => b.status === statusFilter);
    }

    // Lọc theo loại sản phẩm
    if (productTypeFilter !== 'all') {
      filtered = filtered.filter(b => {
        if (productTypeFilter === 'tour') return b.tour_id;
        if (productTypeFilter === 'hotel') return b.hotel_id;
        if (productTypeFilter === 'flight') return b.flight_id;
        return true;
      });
    }

    setBookings(filtered);
    setCurrentPage(1);
  };

  const handleViewBooking = (booking) => {
    const today = new Date();
    const travelDate = booking.travel_date ? new Date(booking.travel_date) : null;
    const bookingDate = booking.booking_date ? new Date(booking.booking_date) : null;
    const createdAt = booking.created_at ? new Date(booking.created_at) : bookingDate;
    let updatedBooking = { ...booking };
    let showUnpaidTimeline = false;

    // --- Logic cho trạng thái expired ---
    let isExpired = false;
    if (
      booking.status === 'pending' &&
      createdAt &&
      (today - createdAt) > 24 * 60 * 60 * 1000 // quá 24h
    ) {
      isExpired = true;
      updatedBooking.status = 'expired';
      updatedBooking.expiredAt = today;
    }

    // --- Logic cho trạng thái refund_requested ---
    let canRefundRequest = false;
    let refundRequestReason = '';
    if (
      (booking.status === 'canceled' || booking.status === 'cancelled') &&
      booking.paid === true &&
      travelDate && travelDate > today &&
      travelDate && Math.floor((travelDate - today) / (24 * 60 * 60 * 1000)) >= 7
    ) {
      canRefundRequest = true;
      updatedBooking.refundRequestedAt = today;
    }

    setSelectedBooking({
      ...updatedBooking,
      showUnpaidTimeline,
      isExpired,
      canRefundRequest,
    });
    setShowModal(true);
  };

  // Hàm xác nhận booking
  const handleConfirmBooking = async (booking) => {
    try {
      await updateBookingStatus(booking._id, 'confirmed');
      // Cập nhật lại danh sách bookings
      const data = await getAllBookings();
      setBookings(data);
      setAllBookings(data);
      const updated = data.find(b => b._id === booking._id);
      if (updated) {
        handleViewBooking(updated); // Mở modal chi tiết booking đã xác nhận
      } else if (selectedBooking && selectedBooking._id === booking._id) {
        setSelectedBooking({ ...selectedBooking, status: 'confirmed' });
        setShowModal(true);
      }
    } catch (err) {
      alert('Lỗi khi xác nhận booking!');
    }
  };

  // Tự động chuyển trạng thái thành canceled nếu đã qua ngày tour
  useEffect(() => {
    const now = new Date();
    bookings.forEach(async (b) => {
      if (b.status === 'pending' && b.travel_date && new Date(b.travel_date) < now) {
        try {
          await updateBookingStatus(b._id, 'canceled');
        } catch {}
      }
    });
    // eslint-disable-next-line
  }, [bookings]);

  // Tính tổng doanh thu từ các booking đã thanh toán
  const totalRevenue = allBookings
    .filter(b => ['paid', 'completed', 'refunded'].includes(b.status))
    .reduce((sum, b) => sum + (b.totalPrice || 0), 0);

  // Tính tổng số booking và tổng doanh thu đã thanh toán trong tháng/năm hiện tại
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const bookingsInMonth = allBookings.filter(b => {
    const d = new Date(b.createdAt || b.booking_date);
    return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear;
  });
  const totalBookingMonth = bookingsInMonth.length;
  const totalRevenueMonth = bookingsInMonth
    .filter(b => ['paid', 'completed', 'refunded'].includes(b.status))
    .reduce((sum, b) => sum + (b.totalPrice || 0), 0);

  // Pagination logic
  const indexOfLastBooking = currentPage * bookingsPerPage;
  const indexOfFirstBooking = indexOfLastBooking - bookingsPerPage;
  const currentBookings = bookings.slice(indexOfFirstBooking, indexOfLastBooking);
  const totalPages = Math.ceil(bookings.length / bookingsPerPage);

  // Mở modal chi tiết booking nếu có bookingId trên URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const bookingId = params.get('bookingId');
    if (bookingId && allBookings.length > 0) {
      const found = allBookings.find(b => b._id === bookingId);
      if (found) {
        handleViewBooking(found);
      }
    }
    // eslint-disable-next-line
  }, [location.search, allBookings]);

  return (
    <div className="content-wrapper bg-white min-vh-100">
      <div className="content-header bg-white">
        <div className="container-fluid">
          {/* Calendar filter banner */}
          {calendarFilters && (
            <div className="row mb-3">
              <div className="col-12">
                <div className="alert alert-info alert-dismissible">
                  <button 
                    type="button" 
                    className="close" 
                    onClick={() => setCalendarFilters(null)}
                  >
                    <span>&times;</span>
                  </button>
                  <h6>
                    <i className="fas fa-calendar-alt mr-2"></i>
                    Đang xem booking từ Calendar
                  </h6>
                  <p className="mb-0">
                    {calendarFilters.date && (
                      <span className="badge badge-primary mr-2">
                        Ngày: {new Date(calendarFilters.date).toLocaleDateString('vi-VN')}
                      </span>
                    )}
                    {calendarFilters.tourName && (
                      <span className="badge badge-success mr-2">
                        Tour: {calendarFilters.tourName}
                      </span>
                    )}
                    <small className="text-muted">
                      Đóng thông báo này để xem tất cả booking
                    </small>
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="row mb-2">
            <div className="col-sm-6">
              <div className="d-flex align-items-center">
                <h1 className="text-dark mb-0">Quản lý Booking</h1>
                {userRole === 'supplier' && (
                  <small className="text-muted ml-3">
                    <i className="fas fa-info-circle mr-1"></i>
                    Hiển thị bookings cho tours của bạn cung cấp
                  </small>
                )}
              </div>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><a href="#">Home</a></li>
                <li className="breadcrumb-item active">Booking</li>
              </ol>
            </div>
          </div>
          {/* Tổng số booking và doanh thu tháng này */}
          <div className="row mb-2">
            <div className="col-md-8">
              <span className="badge badge-info" style={{fontSize: '1.1rem'}}>
                {userRole === 'supplier' ? 'Booking tours của bạn tháng này' : 'Tổng số Booking tháng này'}: {totalBookingMonth}
              </span>
              <span className="badge badge-warning ml-2" style={{fontSize: '1.1rem'}}>
                {userRole === 'supplier' ? 'Doanh thu tours của bạn' : 'Tổng doanh thu'}: {totalRevenueMonth.toLocaleString('vi-VN')} VNĐ
              </span>
            </div>
            <div className="col-md-4">
              <small className="text-muted">
                {userRole === 'supplier' && `Tổng cộng: ${allBookings.length} booking${allBookings.length > 1 ? 's' : ''} cho tours của bạn`}
              </small>
            </div>
          </div>
        </div>
      </div>
      <section className="content">
        <div className="container-fluid">
          {/* Bộ lọc giống ảnh minh họa */}
          <div className="mb-3 d-flex flex-wrap align-items-center gap-2">
            <div>
              <select
                className="form-control form-control-sm mr-2"
                style={{ width: 220, display: 'inline-block' }}
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="all">Tất cả trạng thái ({allBookings.length})</option>
                <option value="pending">Chờ xác nhận ({allBookings.filter(b=>b.status==='pending').length})</option>
                <option value="confirmed">Đã xác nhận ({allBookings.filter(b=>b.status==='confirmed').length})</option>
                <option value="paid">Đã thanh toán ({allBookings.filter(b=>b.status==='paid').length})</option>
                <option value="ongoing">Đang diễn ra ({allBookings.filter(b=>b.status==='ongoing').length})</option>
                <option value="completed">Hoàn thành ({allBookings.filter(b=>b.status==='completed').length})</option>
                <option value="canceled">Đã hủy ({allBookings.filter(b=>b.status==='canceled'||b.status==='cancelled').length})</option>
                <option value="refund_requested">Yêu cầu hoàn tiền ({allBookings.filter(b=>b.status==='refund_requested').length})</option>
                <option value="refunded">Đã hoàn tiền ({allBookings.filter(b=>b.status==='refunded').length})</option>
                <option value="expired">Quá hạn ({allBookings.filter(b=>b.status==='expired').length})</option>
              </select>
            </div>
            <select className="form-control form-control-sm mx-1" style={{ width: 120 }}>
              <option>Tác vụ</option>
              <option>Xóa</option>
              <option>Xác nhận</option>
            </select>
            <button className="btn btn-outline-primary btn-sm mx-1">Áp dụng</button>
            <select
              className="form-control form-control-sm mx-1"
              style={{ width: 140 }}
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
            >
              <option value="all">Tất cả các ngày</option>
              <option value="today">Hôm nay</option>
              <option value="month">Tháng này</option>
              <option value="year">Năm nay</option>
            </select>
            <select className="form-control form-control-sm mx-1" style={{ width: 180 }} value={productTypeFilter} onChange={e => setProductTypeFilter(e.target.value)}>
              <option value="all">Tất cả sản phẩm đặt được</option>
              <option value="tour">Tour</option>
              <option value="hotel">Khách sạn</option>
              <option value="flight">Vé máy bay</option>
            </select>
          </div>
          <div className="mb-3">
            <input
              type="text"
              className="form-control d-inline-block"
              style={{ width: 300, marginRight: 8 }}
              placeholder="Nhập tên người đặt..."
              value={searchName}
              onChange={e => setSearchName(e.target.value)}
            />
            <button className="btn btn-primary" onClick={handleSearch} disabled={loading || !searchName.trim()}>Tìm kiếm</button>
          </div>
          {loading && <div>Đang tải dữ liệu...</div>}
          {error && <div className="alert alert-danger">{error}</div>}
          {!loading && !error && (
            <div className="card">
              <div className="card-body">
                <table className="table table-bordered table-hover">
                  <thead>
                    <tr>
                      <th>Tên người đặt</th>
                      <th>Số điện thoại</th>
                      <th>Tour đặt</th>
                      <th>Ngày đặt</th>
                      <th>Thời gian đi</th>
                      <th>Số lượng người lớn</th>
                      <th>Số lượng trẻ em</th>
                      <th>Dịch vụ đi kèm</th>
                      <th>Thành Tiền</th>
                      <th>Trạng thái</th>
                      <th>Hành động</th>
                      <th>Xác nhận</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentBookings.map((b) => (
                      <tr key={b._id}>
                        <td>{b.user_id?.first_name} {b.user_id?.last_name}</td>
                        <td>{b.user_id?.phone || ''}</td>
                        <td>{b.tour_id?.name}</td>
                        <td>{b.booking_date ? new Date(b.booking_date).toLocaleDateString('vi-VN') : ''}</td>
                        <td>{b.travel_date ? new Date(b.travel_date).toLocaleDateString('vi-VN') : ''}</td>
                        <td>{b.quantity_nguoiLon}</td>
                        <td>{b.quantity_treEm}</td>
                        <td>
                          {b.selected_options && b.selected_options.length > 0
                            ? b.selected_options.map((opt, idx) => (
                                <span key={idx} style={{border: '1px solid #007bff', borderRadius: 6, padding: '2px 8px', marginRight: 4, display: 'inline-block', background: '#f4f8ff', color: '#007bff', fontSize: 13}}>
                                  {opt.option_service_id?.name}
                                </span>
                              ))
                            : <span style={{color:'#888'}}>Không có</span>}
                        </td>
                        <td>{b.totalPrice?.toLocaleString('vi-VN')} đ</td>
                        <td>
                          <span className={`badge badge-${b.status === 'pending' ? 'warning' : b.status === 'confirmed' ? 'info' : b.status === 'paid' ? 'primary' : b.status === 'ongoing' ? 'success' : b.status === 'completed' ? 'success' : b.status === 'canceled' || b.status === 'cancelled' ? 'danger' : b.status === 'refund_requested' ? 'warning' : b.status === 'refunded' ? 'info' : b.status === 'expired' ? 'secondary' : 'secondary'}`}>
                            {
                              b.status === 'pending' ? 'Chờ xác nhận' :
                              b.status === 'confirmed' ? 'Đã xác nhận' :
                              b.status === 'paid' ? 'Đã thanh toán' :
                              b.status === 'ongoing' ? 'Đang diễn ra' :
                              b.status === 'completed' ? 'Hoàn thành' :
                              b.status === 'canceled' || b.status === 'cancelled' ? 'Đã hủy' :
                              b.status === 'refund_requested' ? 'Yêu cầu hoàn tiền' :
                              b.status === 'refunded' ? 'Đã hoàn tiền' :
                              b.status === 'expired' ? 'Quá hạn' :
                              b.status
                            }
                          </span>
                        </td>
                        <td>
                          <button onClick={() => handleViewBooking(b)} className="btn btn-info btn-sm mr-1" title="Xem chi tiết">
                            Xem chi tiết
                          </button>
                        </td>
                        <td>
                          {b.status === 'pending' && (
                            <button onClick={() => handleConfirmBooking(b)} className="btn btn-success btn-sm">Confirm</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Pagination */}
                {totalPages > 1 && (
                  <nav className="mt-3">
                    <ul className="pagination justify-content-center mb-0">
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
          )}
        </div>
      </section>
      {/* Modal hiển thị chi tiết booking */}
      {showModal && selectedBooking && (
        <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.3)' }} tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Chi tiết Booking</h5>
                <button type="button" className="close" onClick={() => setShowModal(false)}>
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <table className="table table-sm table-borderless mb-2">
                  <tbody>
                    <tr><td><b>Tên tour:</b></td><td>{selectedBooking.tour_id?.name}</td></tr>
                    <tr><td><b>Thời lượng:</b></td><td>{selectedBooking.tour_id?.duration ? selectedBooking.tour_id.duration : ''}</td></tr>
                    <tr><td><b>Địa điểm:</b></td><td>{selectedBooking.tour_id?.location}</td></tr>
                    <tr><td colSpan={2}><hr className="my-2" /></td></tr>
                    <tr><td><b>Khách hàng:</b></td><td>{selectedBooking.user_id?.first_name} {selectedBooking.user_id?.last_name}</td></tr>
                    <tr><td><b>Số điện thoại:</b></td><td>{selectedBooking.user_id?.phone}</td></tr>
                    <tr><td><b>Ngày đi:</b></td><td>{selectedBooking.travel_date ? new Date(selectedBooking.travel_date).toLocaleDateString('vi-VN') : ''}</td></tr>
                    <tr><td><b>Ngày kết thúc:</b></td><td>{selectedBooking.end_date ? new Date(selectedBooking.end_date).toLocaleDateString('vi-VN') : ''}</td></tr>
                    <tr><td><b>Số lượng người lớn:</b></td><td>{selectedBooking.quantity_nguoiLon}</td></tr>
                    <tr><td><b>Số lượng trẻ em:</b></td><td>{selectedBooking.quantity_treEm}</td></tr>
                    <tr>
                      <td><b>Dịch vụ đi kèm:</b></td>
                      <td>
                        {selectedBooking.selected_options && selectedBooking.selected_options.length > 0
                          ? selectedBooking.selected_options.map((opt, idx) => (
                              <span key={idx} style={{border: '1px solid #007bff', borderRadius: 6, padding: '2px 8px', marginRight: 4, display: 'inline-block', background: '#f4f8ff', color: '#007bff', fontSize: 13}}>
                                {opt.option_service_id?.name}
                              </span>
                            ))
                          : <span style={{color:'#888'}}>Không có</span>}
                      </td>
                    </tr>
                    <tr><td><b>Tổng tiền:</b></td><td>{selectedBooking.totalPrice?.toLocaleString()} VNĐ</td></tr>
                    <tr><td><b>Trạng thái:</b></td><td>{selectedBooking.status === 'pending' ? 'Chưa thanh toán' : selectedBooking.status === 'confirmed' ? 'Đã xác nhận' : selectedBooking.status === 'success' ? 'Đã thanh toán' : selectedBooking.status === 'cancelled' ? 'Đã hủy' : selectedBooking.status}</td></tr>
                    <tr><td><b>Lần cập nhật trạng thái gần nhất:</b></td><td>{selectedBooking.last_update ? new Date(selectedBooking.last_update).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A'}</td></tr>
                  </tbody>
                </table>
                <hr />
                <h5 className="mb-3"><i className="fas fa-stream mr-2"></i>Lịch sử booking</h5>
                <div className="timeline">
                  {/* Đặt tour */}
                  <div className="time-label">
                    <span className="bg-primary">
                      {selectedBooking.booking_date ? new Date(selectedBooking.booking_date).toLocaleDateString('vi-VN') : ''}
                    </span>
                  </div>
                  <div>
                    <i className="fas fa-edit bg-blue"></i>
                    <div className="timeline-item">
                      <span className="time"><i className="fas fa-clock"></i> {selectedBooking.booking_date ? new Date(selectedBooking.booking_date).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}</span>
                      <h3 className="timeline-header">Đặt tour</h3>
                    </div>
                  </div>
                  {/* Đã xác nhận */}
                  {selectedBooking.status === 'confirmed' && (
                    <div>
                      <i className="fas fa-check bg-info"></i>
                      <div className="timeline-item">
                        <span className="time"><i className="fas fa-clock"></i> {selectedBooking.last_update && selectedBooking.status === 'confirmed'
                          ? new Date(selectedBooking.last_update).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
                          : (selectedBooking.confirmedAt ? new Date(selectedBooking.confirmedAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '')}
                        </span>
                        <h3 className="timeline-header">Đã xác nhận</h3>
                      </div>
                    </div>
                  )}
                  {/* Đã thanh toán */}
                  {selectedBooking.status === 'paid' && (
                    <div>
                      <i className="fas fa-credit-card bg-primary"></i>
                      <div className="timeline-item">
                        <span className="time"><i className="fas fa-clock"></i> {selectedBooking.last_update && selectedBooking.status === 'paid'
                          ? new Date(selectedBooking.last_update).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
                          : (selectedBooking.paidAt ? new Date(selectedBooking.paidAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '')}
                        </span>
                        <h3 className="timeline-header">Đã thanh toán</h3>
                      </div>
                    </div>
                  )}
                  {/* Đang diễn ra */}
                  {selectedBooking.status === 'ongoing' && (
                    <div>
                      <i className="fas fa-play bg-success"></i>
                      <div className="timeline-item">
                        <span className="time"><i className="fas fa-clock"></i> {selectedBooking.ongoingAt ? new Date(selectedBooking.ongoingAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}</span>
                        <h3 className="timeline-header">Tour đang diễn ra</h3>
                      </div>
                    </div>
                  )}
                  {/* Đã hoàn thành */}
                  {selectedBooking.status === 'completed' && (
                    <div>
                      <i className="fas fa-flag-checkered bg-success"></i>
                      <div className="timeline-item">
                        <span className="time"><i className="fas fa-clock"></i> {selectedBooking.completedAt ? new Date(selectedBooking.completedAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}</span>
                        <h3 className="timeline-header">Đã hoàn thành</h3>
                      </div>
                    </div>
                  )}
                  {/* Đã hủy */}
                  {(selectedBooking.status === 'canceled' || selectedBooking.status === 'cancelled') && (
                    <div>
                      <i className="fas fa-times-circle bg-danger"></i>
                      <div className="timeline-item">
                        <span className="time"><i className="fas fa-clock"></i> {selectedBooking.canceledAt ? new Date(selectedBooking.canceledAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}</span>
                        <h3 className="timeline-header">Đã hủy</h3>
                      </div>
                    </div>
                  )}
                  {/* Đã hoàn tiền */}
                  {selectedBooking.status === 'refunded' && (
                    <div>
                      <i className="fas fa-money-bill-wave bg-success"></i>
                      <div className="timeline-item">
                        <span className="time"><i className="fas fa-clock"></i> {selectedBooking.refundedAt ? new Date(selectedBooking.refundedAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}</span>
                        <h3 className="timeline-header">Đã hoàn tiền</h3>
                      </div>
                    </div>
                  )}
                  {/* Các trạng thái khác chỉ hiển thị nếu chưa hoàn thành, chưa hủy, chưa refund */}
                  {!(selectedBooking.status === 'completed' || selectedBooking.status === 'canceled' || selectedBooking.status === 'cancelled' || selectedBooking.status === 'refunded') && (
                    <>
                      {/* Đang diễn ra */}
                      {selectedBooking.status === 'ongoing' && (
                        <div>
                          <i className="fas fa-play bg-success"></i>
                          <div className="timeline-item">
                            <span className="time"><i className="fas fa-clock"></i> {selectedBooking.ongoingAt ? new Date(selectedBooking.ongoingAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}</span>
                            <h3 className="timeline-header">Tour đang diễn ra</h3>
                          </div>
                        </div>
                      )}
                      {/* Quá hạn thanh toán (expired) */}
                      {selectedBooking.isExpired && (
                        <div>
                          <i className="fas fa-hourglass-end bg-secondary"></i>
                          <div className="timeline-item">
                            <span className="time"><i className="fas fa-clock"></i> {selectedBooking.expiredAt ? new Date(selectedBooking.expiredAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}</span>
                            <h3 className="timeline-header">Quá hạn thanh toán</h3>
                          </div>
                        </div>
                      )}
                      {/* Yêu cầu hoàn tiền (refund_requested) */}
                      {selectedBooking.canRefundRequest && (
                        <div>
                          <i className="fas fa-undo bg-warning"></i>
                          <div className="timeline-item">
                            <span className="time"><i className="fas fa-clock"></i> {selectedBooking.refundRequestedAt ? new Date(selectedBooking.refundRequestedAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}</span>
                            <h3 className="timeline-header">Yêu cầu hoàn tiền (đủ điều kiện)</h3>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Đóng</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Bookings;
