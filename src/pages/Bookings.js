import React, { useEffect, useState } from 'react';
import { getAllBookings, updateBookingStatus } from '../api/api';

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
  const bookingsPerPage = 10;

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const data = await getAllBookings();
        setBookings(data);
        setAllBookings(data); // Lưu toàn bộ bookings để lọc sau này
      } catch (err) {
        setError('Không thể tải danh sách booking!');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

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
      if (selectedBooking && selectedBooking._id === booking._id) {
        setSelectedBooking({ ...selectedBooking, status: 'confirmed' });
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

  // Pagination logic
  const indexOfLastBooking = currentPage * bookingsPerPage;
  const indexOfFirstBooking = indexOfLastBooking - bookingsPerPage;
  const currentBookings = bookings.slice(indexOfFirstBooking, indexOfLastBooking);
  const totalPages = Math.ceil(bookings.length / bookingsPerPage);

  return (
    <div className="content-wrapper bg-white min-vh-100">
      <div className="content-header bg-white">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="text-dark">Quản lý Booking</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><a href="#">Home</a></li>
                <li className="breadcrumb-item active">Booking</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
      <section className="content">
        <div className="container-fluid">
          {/* Bộ lọc giống ảnh minh họa */}
          <div className="mb-3 d-flex flex-wrap align-items-center gap-2">
            <div>
              <span className="mr-2 font-weight-bold" style={{ color: '#212529' }}>Tất cả ({allBookings.length})</span>
              <a href="#" className="mr-2" style={{ color: '#0073aa' }}>Của tôi (0)</a>
              <a href="#" className="mr-2" style={{ color: '#0073aa' }}>Hoàn thành (0)</a>
              <a href="#" className="mr-2" style={{ color: '#0073aa' }}>Paid &amp; Confirmed (0)</a>
              <a href="#" className="mr-2" style={{ color: '#0073aa' }}>Un-paid (0)</a>
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
            <select className="form-control form-control-sm mx-1" style={{ width: 180 }}>
              <option>Tất cả sản phẩm đặt được</option>
              <option>Tour</option>
              <option>Khách sạn</option>
              <option>Vé máy bay</option>
            </select>
            <button
              className="btn btn-outline-secondary btn-sm mx-1"
              onClick={handleFilter}
            >
              Lọc
            </button>
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
                      <th>Tour đặt</th>
                      <th>Thời gian tour</th>
                      <th>Ngày đặt</th>
                      <th>Số lượng người lớn</th>
                      <th>Số lượng trẻ em</th>
                      <th>Dịch vụ đi kèm</th>
                      <th>Thành Tiền</th>
                      <th>Trạng thái</th>
                      <th>Hành động</th>
                      <th>Xác nhận</th> {/* Thêm cột mới cho Confirm */}
                    </tr>
                  </thead>
                  <tbody>
                    {currentBookings.map((b) => (
                      <tr key={b._id}>
                        <td>{b.user_id?.first_name} {b.user_id?.last_name}</td>
                        <td>{b.tour_id?.name}</td>
                        <td>{b.tour_id?.duration}</td>
                        <td>{b.travel_date ? new Date(b.travel_date).toLocaleDateString('vi-VN') : 'dd/mm/yyyy'}</td>
                        <td>{b.quantity_nguoiLon}</td>
                        <td>{b.quantity_treEm}</td>
                        <td>{b.services ? b.services.join(', ') : 'N/A'}</td>
                        <td>{b.totalPrice?.toLocaleString('vi-VN')} đ</td>
                        <td>
                          <span className={`badge badge-${b.status === 'pending' ? 'warning' : b.status === 'confirmed' ? 'info' : b.status === 'paid' ? 'primary' : b.status === 'ongoing' ? 'success' : b.status === 'completed' ? 'success' : b.status === 'canceled' ? 'danger' : b.status === 'expired' ? 'secondary' : 'secondary'}`}>
                            {b.status}
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
                    <tr><td><b>Thời lượng:</b></td><td>{selectedBooking.tour_id?.duration}</td></tr>
                    <tr><td><b>Địa điểm:</b></td><td>{selectedBooking.tour_id?.location}</td></tr>
                    <tr><td colSpan={2}><hr className="my-2" /></td></tr>
                    <tr><td><b>Khách hàng:</b></td><td>{selectedBooking.user_id?.first_name} {selectedBooking.user_id?.last_name}</td></tr>
                    <tr><td><b>Số điện thoại:</b></td><td>{selectedBooking.user_id?.phone}</td></tr>
                    <tr><td><b>Ngày đi:</b></td><td>{selectedBooking.travel_date ? new Date(selectedBooking.travel_date).toLocaleDateString('vi-VN') : ''}</td></tr>
                    <tr><td><b>Ngày kết thúc:</b></td><td>{selectedBooking.end_date ? new Date(selectedBooking.end_date).toLocaleDateString('vi-VN') : ''}</td></tr>
                    <tr><td><b>Số lượng người lớn:</b></td><td>{selectedBooking.quantity_nguoiLon}</td></tr>
                    <tr><td><b>Số lượng trẻ em:</b></td><td>{selectedBooking.quantity_treEm}</td></tr>
                    <tr><td><b>Tổng tiền:</b></td><td>{selectedBooking.totalPrice?.toLocaleString()} VNĐ</td></tr>
                    <tr><td><b>Trạng thái:</b></td><td>{selectedBooking.status === 'pending' ? 'Chưa thanh toán' : selectedBooking.status === 'confirmed' ? 'Đã xác nhận' : selectedBooking.status === 'success' ? 'Đã thanh toán' : selectedBooking.status === 'cancelled' ? 'Đã hủy' : selectedBooking.status}</td></tr>
                    <tr><td><b>Mã thanh toán:</b></td><td>{selectedBooking.order_code || 'N/A'}</td></tr>
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
                      <span className="time"><i className="fas fa-clock"></i> {selectedBooking.booking_date ? new Date(selectedBooking.booking_date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}</span>
                      <h3 className="timeline-header">Đặt tour</h3>
                    </div>
                  </div>
                  {/* Đã xác nhận */}
                  {selectedBooking.status === 'confirmed' && (
                    <div>
                      <i className="fas fa-check bg-info"></i>
                      <div className="timeline-item">
                        <span className="time"><i className="fas fa-clock"></i> {selectedBooking.confirmedAt ? new Date(selectedBooking.confirmedAt).toLocaleTimeString('vi-VN') : ''}</span>
                        <h3 className="timeline-header">Đã xác nhận</h3>
                      </div>
                    </div>
                  )}
                  {/* Đã thanh toán */}
                  {selectedBooking.status === 'paid' && (
                    <div>
                      <i className="fas fa-credit-card bg-primary"></i>
                      <div className="timeline-item">
                        <span className="time"><i className="fas fa-clock"></i> {selectedBooking.paidAt ? new Date(selectedBooking.paidAt).toLocaleTimeString('vi-VN') : ''}</span>
                        <h3 className="timeline-header">Đã thanh toán</h3>
                      </div>
                    </div>
                  )}
                  {/* Đang diễn ra */}
                  {selectedBooking.status === 'ongoing' && (
                    <div>
                      <i className="fas fa-play bg-success"></i>
                      <div className="timeline-item">
                        <span className="time"><i className="fas fa-clock"></i> {selectedBooking.ongoingAt ? new Date(selectedBooking.ongoingAt).toLocaleTimeString('vi-VN') : ''}</span>
                        <h3 className="timeline-header">Tour đang diễn ra</h3>
                      </div>
                    </div>
                  )}
                  {/* Đã hoàn thành */}
                  {selectedBooking.status === 'completed' && (
                    <div>
                      <i className="fas fa-flag-checkered bg-success"></i>
                      <div className="timeline-item">
                        <span className="time"><i className="fas fa-clock"></i> {selectedBooking.completedAt ? new Date(selectedBooking.completedAt).toLocaleTimeString('vi-VN') : ''}</span>
                        <h3 className="timeline-header">Đã hoàn thành</h3>
                      </div>
                    </div>
                  )}
                  {/* Đã hủy */}
                  {(selectedBooking.status === 'canceled' || selectedBooking.status === 'cancelled') && (
                    <div>
                      <i className="fas fa-times-circle bg-danger"></i>
                      <div className="timeline-item">
                        <span className="time"><i className="fas fa-clock"></i> {selectedBooking.canceledAt ? new Date(selectedBooking.canceledAt).toLocaleTimeString('vi-VN') : ''}</span>
                        <h3 className="timeline-header">Đã hủy</h3>
                      </div>
                    </div>
                  )}
                  {/* Quá hạn thanh toán (expired) */}
                  {selectedBooking.isExpired && (
                    <div>
                      <i className="fas fa-hourglass-end bg-secondary"></i>
                      <div className="timeline-item">
                        <span className="time"><i className="fas fa-clock"></i> {selectedBooking.expiredAt ? new Date(selectedBooking.expiredAt).toLocaleTimeString('vi-VN') : ''}</span>
                        <h3 className="timeline-header">Quá hạn thanh toán</h3>
                      </div>
                    </div>
                  )}
                  {/* Yêu cầu hoàn tiền (refund_requested) */}
                  {selectedBooking.canRefundRequest && (
                    <div>
                      <i className="fas fa-undo bg-warning"></i>
                      <div className="timeline-item">
                        <span className="time"><i className="fas fa-clock"></i> {selectedBooking.refundRequestedAt ? new Date(selectedBooking.refundRequestedAt).toLocaleTimeString('vi-VN') : ''}</span>
                        <h3 className="timeline-header">Yêu cầu hoàn tiền (đủ điều kiện)</h3>
                      </div>
                    </div>
                  )}
                  {/* Đã hoàn tiền */}
                  {selectedBooking.status === 'refunded' && (
                    <div>
                      <i className="fas fa-money-bill-wave bg-success"></i>
                      <div className="timeline-item">
                        <span className="time"><i className="fas fa-clock"></i> {selectedBooking.refundedAt ? new Date(selectedBooking.refundedAt).toLocaleTimeString('vi-VN') : ''}</span>
                        <h3 className="timeline-header">Đã hoàn tiền</h3>
                      </div>
                    </div>
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
