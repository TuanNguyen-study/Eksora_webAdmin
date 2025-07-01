import React, { useEffect, useState } from 'react';
import { getAllBookings } from '../api/api';

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
    // Kiểm tra nếu đã qua ngày đi mà vẫn chưa thanh toán thì cập nhật trạng thái và thêm mốc timeline
    const today = new Date();
    const travelDate = booking.travel_date ? new Date(booking.travel_date) : null;
    let updatedBooking = { ...booking };
    let showUnpaidTimeline = false;

    if (
      booking.status === 'pending' &&
      travelDate &&
      today > travelDate
    ) {
      updatedBooking = {
        ...booking,
        status: 'cancelled', // cập nhật trạng thái
        wasUnpaid: true, // flag để hiển thị mốc timeline "Chưa thanh toán"
      };
      showUnpaidTimeline = true;
    }

    setSelectedBooking({ ...updatedBooking, showUnpaidTimeline });
    setShowModal(true);
  };

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
                          <span className={`badge badge-${b.status === 'pending' ? 'warning' : b.status === 'success' ? 'success' : 'secondary'}`}>
                            {b.status === 'pending' ? 'Chưa thanh toán' : b.status}
                          </span>
                        </td>
                        <td>
                          <button onClick={() => handleViewBooking(b)} className="btn btn-info btn-sm" title="Xem chi tiết">
                            <i className="fas fa-eye"></i>
                          </button>
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
                    <tr><td><b>Trạng thái:</b></td><td>{selectedBooking.status === 'pending' ? 'Chưa thanh toán' : selectedBooking.status === 'success' ? 'Đã thanh toán' : selectedBooking.status === 'cancelled' ? 'Đã hủy' : selectedBooking.status}</td></tr>
                  </tbody>
                </table>
                <hr />
                <h5 className="mb-3"><i className="fas fa-stream mr-2"></i>Lịch sử booking</h5>
                <div className="timeline">
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
                  <div>
                    <i className="fas fa-credit-card bg-yellow"></i>
                    <div className="timeline-item">
                      <span className="time"><i className="fas fa-clock"></i> {selectedBooking.booking_date ? new Date(selectedBooking.booking_date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}</span>
                      <h3 className="timeline-header">
                        {selectedBooking.status === 'pending' && 'Chờ thanh toán'}
                        {selectedBooking.status === 'success' && 'Đã thanh toán'}
                        {selectedBooking.status === 'cancelled' && selectedBooking.showUnpaidTimeline && 'Chưa thanh toán'}
                        {selectedBooking.status === 'cancelled' && !selectedBooking.showUnpaidTimeline && 'Đã hủy'}
                        {selectedBooking.status !== 'pending' && selectedBooking.status !== 'success' && selectedBooking.status !== 'cancelled' && selectedBooking.status}
                      </h3>
                    </div>
                  </div>
                  {/* Nếu là hủy do chưa thanh toán, thêm mốc timeline "Chưa thanh toán" */}
                  {selectedBooking.showUnpaidTimeline && (
                    <div>
                      <i className="fas fa-times-circle bg-danger"></i>
                      <div className="timeline-item">
                        <span className="time"><i className="fas fa-clock"></i> {selectedBooking.travel_date ? new Date(selectedBooking.travel_date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}</span>
                        <h3 className="timeline-header">Chưa thanh toán - Đơn đã bị hủy</h3>
                      </div>
                    </div>
                  )}
                  <div>
                    <i className={`fas fa-check-circle ${selectedBooking.status === 'success' ? 'bg-green' : selectedBooking.status === 'cancelled' ? 'bg-danger' : 'bg-gray'}`}></i>
                    <div className="timeline-item">
                      <span className="time"><i className="fas fa-clock"></i> {selectedBooking.booking_date ? new Date(selectedBooking.booking_date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}</span>
                      <h3 className="timeline-header">
                        {selectedBooking.status === 'success' && 'Hoàn thành'}
                        {selectedBooking.status === 'cancelled' && 'Đã hủy'}
                        {selectedBooking.status !== 'success' && selectedBooking.status !== 'cancelled' && 'Chưa hoàn thành'}
                      </h3>
                    </div>
                  </div>
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
