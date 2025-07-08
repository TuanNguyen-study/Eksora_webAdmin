import React, { useState, useEffect } from 'react';
import { getAllBookings } from '../api/api';
import { getTours } from '../api/api';

function UserProfileModal({ user, show, onClose }) {
  const [bookings, setBookings] = useState([]);
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (show && user && user._id && !loaded) {
      setLoading(true);
      Promise.all([
        getAllBookings(),
        getTours()
      ])
        .then(([allBookings, allTours]) => {
          const userBookings = allBookings.filter(b => b.user_id === user._id || b.user_id?._id === user._id);
          setBookings(userBookings);
          setTours(allTours);
          setLoaded(true);
        })
        .catch(() => setError('Không thể tải danh sách tour đã đặt!'))
        .finally(() => setLoading(false));
    }
    if (!show) {
      setLoaded(false);
      setBookings([]);
      setTours([]);
      setError(null);
    }
  }, [show, user, loaded]);

  // Hàm chuyển trạng thái booking sang tiếng Việt
  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return 'Chờ xác nhận';
      case 'confirmed': return 'Đã xác nhận';
      case 'paid': return 'Đã thanh toán';
      case 'ongoing': return 'Đang diễn ra';
      case 'completed': return 'Hoàn thành';
      case 'canceled':
      case 'cancelled': return 'Đã hủy';
      case 'refund_requested': return 'Yêu cầu hoàn tiền';
      case 'refunded': return 'Đã hoàn tiền';
      case 'expired': return 'Quá hạn';
      default: return status;
    }
  };

  // Hàm trả về class màu cho trạng thái booking
  const getStatusClass = (status) => {
    switch (status) {
      case 'pending': return 'badge badge-warning';
      case 'confirmed': return 'badge badge-primary';
      case 'paid': return 'badge badge-success';
      case 'ongoing': return 'badge badge-info';
      case 'completed': return 'badge badge-dark';
      case 'canceled':
      case 'cancelled': return 'badge badge-danger';
      case 'refund_requested': return 'badge badge-warning';
      case 'refunded': return 'badge badge-secondary';
      case 'expired': return 'badge badge-secondary';
      default: return 'badge badge-light';
    }
  };

  return (
    <div className={`modal fade${show ? ' show d-block' : ''}`} tabIndex="-1" role="dialog" style={{ background: 'rgba(0,0,0,0.3)' }}>
      <div className="modal-dialog modal-lg" role="document">
        <div className="modal-content bg-white text-dark">
          <div className="modal-header bg-light">
            <h5 className="modal-title">
              Thống kê Tour đã đặt của {user?.first_name} {user?.last_name}
            </h5>
            <button type="button" className="close" onClick={onClose}>
              <span>&times;</span>
            </button>
          </div>
          <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {loading && <div>Đang tải dữ liệu...</div>}
            {error && <div className="alert alert-danger">{error}</div>}
            {!loading && !error && (
              bookings.length === 0 ? (
                <div>Chưa có tour nào được đặt.</div>
              ) : (
                <div className="timeline">
                  {(() => {
                    let lastDate = null;
                    return bookings
                      .sort((a, b) => new Date(b.booking_date) - new Date(a.booking_date))
                      .map((b, idx) => {
                        const dateStr = b.booking_date ? new Date(b.booking_date).toLocaleDateString('vi-VN') : 'N/A';
                        const showDate = dateStr !== lastDate;
                        lastDate = dateStr;
                        // Lấy tour từ danh sách tours API
                        let tour = null;
                        if (b.tour_id && typeof b.tour_id === 'object' && b.tour_id._id) {
                          tour = tours.find(t => t._id === b.tour_id._id);
                        } else if (typeof b.tour_id === 'string') {
                          tour = tours.find(t => t._id === b.tour_id);
                        }
                        // Ưu tiên lấy ảnh từ object Tour, lấy phần tử đầu tiên nếu là mảng
                        let imgSrc =
                          (Array.isArray(tour?.image) && tour.image.length > 0)
                            ? tour.image[0]
                            : (tour?.image || tour?.img || (tour?.images && Array.isArray(tour.images) && tour.images.length > 0 ? tour.images[0] : null) || '/img/default-tour.jpg');
                        // Nếu là đường dẫn tương đối, thêm domain
                        if (imgSrc && imgSrc.startsWith('/')) {
                          const baseUrl = process.env.REACT_APP_API_BASE_URL || window.location.origin;
                          imgSrc = baseUrl.replace(/\/$/, '') + imgSrc;
                        }
                        return (
                          <div key={b._id || idx} className="timeline-item mb-4 d-flex align-items-start">
                            <div style={{ minWidth: 80, textAlign: 'center' }}>
                              {showDate && (
                                <div className="badge badge-info">{dateStr}</div>
                              )}
                            </div>
                            <div className="ml-3 flex-grow-1 d-flex align-items-center">
                              <img
                                src={imgSrc}
                                alt={tour?.name || b.tour_id?.name || 'Tour'}
                                style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 8, marginRight: 16, border: '1px solid #eee' }}
                              />
                              <div>
                                <div className="font-weight-bold">{tour?.name || b.tour_id?.name || 'N/A'}</div>
                                <div>Trạng thái: <span className={getStatusClass(b.status)}>{getStatusLabel(b.status)}</span></div>
                                <div>Giá: <span className="text-danger">{tour?.price ? Number(tour.price).toLocaleString('vi-VN') + ' VNĐ' : (b.tour_id?.price ? Number(b.tour_id.price).toLocaleString('vi-VN') + ' VNĐ' : 'N/A')}</span></div>
                              </div>
                            </div>
                          </div>
                        );
                      });
                  })()}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserProfileModal;
