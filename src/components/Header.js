import React, { useEffect, useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { getAllBookings, getTours } from '../api/api';
import { useNavigate } from 'react-router-dom';

const Header = forwardRef(({ onNotificationClick }, ref) => {
  const [isDark, setIsDark] = useState(false);
  // Lưu notification vào localStorage để không hiển thị lại khi đã xem
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('eksora_notifications');
    return saved ? JSON.parse(saved) : [];
  });
  const [tours, setTours] = useState([]);
  const prevBookingsRef = useRef([]);
  const navigate = useNavigate();

  useImperativeHandle(ref, () => ({
    addNotification: (noti) => {
      setNotifications(prev => {
        const merged = [noti, ...prev].slice(0, 20);
        localStorage.setItem('eksora_notifications', JSON.stringify(merged));
        return merged;
      });
    },
    clearNotifications: () => {
      setNotifications([]);
      localStorage.removeItem('eksora_notifications');
    },
    removeNotification: (bookingId) => {
      setNotifications(prev => {
        const updated = prev.filter(n => n.booking._id !== bookingId);
        localStorage.setItem('eksora_notifications', JSON.stringify(updated));
        return updated;
      });
    },
    getNotifications: () => notifications,
  }));

  useEffect(() => {
    document.body.classList.remove('dark-mode');
  }, []);

  // Poll bookings mỗi 20s
  useEffect(() => {
    async function fetchData() {
      const [bookings, toursData] = await Promise.all([
        getAllBookings(),
        getTours()
      ]);
      setTours(toursData);
      const prevBookings = prevBookingsRef.current;
      let newNotifications = [];
      bookings.forEach(b => {
        const prev = prevBookings.find(pb => pb._id === b._id);
        if (!prev) {
          newNotifications.push({
            type: 'new',
            booking: b,
            tour: toursData.find(t => t._id === b.tour_id || t._id === b.tour_id?._id),
          });
        } else if (prev.status !== b.status) {
          newNotifications.push({
            type: 'status',
            booking: b,
            tour: toursData.find(t => t._id === b.tour_id || t._id === b.tour_id?._id),
          });
        }
      });
      setNotifications(prev => {
        const merged = [...newNotifications, ...prev]
          .filter((n, idx, arr) => arr.findIndex(x => x.booking._id === n.booking._id && x.type === n.type) === idx)
          .slice(0, 20);
        localStorage.setItem('eksora_notifications', JSON.stringify(merged));
        return merged;
      });
      prevBookingsRef.current = bookings;
    }
    fetchData();
    const interval = setInterval(fetchData, 20000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      if (next) {
        document.body.classList.add('dark-mode');
      } else {
        document.body.classList.remove('dark-mode');
      }
      return next;
    });
  };

  const handleNotificationClick = (bookingId) => {
    setNotifications(prev => {
      const updated = prev.filter(n => n.booking._id !== bookingId);
      localStorage.setItem('eksora_notifications', JSON.stringify(updated));
      return updated;
    });
    if (onNotificationClick) onNotificationClick(bookingId);
    navigate(`/bookings?bookingId=${bookingId}`);
  };

  return (
    <div >   
    {/* Navbar */}
<nav className="main-header navbar navbar-expand navbar-white navbar-light">
  {/* Left navbar links */}
  <ul className="navbar-nav">
    <li className="nav-item">
      <a className="nav-link" data-widget="pushmenu" href="#" role="button"><i className="fas fa-bars" /></a>
    </li>
  </ul>
  {/* Right navbar links */}
  <ul className="navbar-nav ml-auto">
    {/* Navbar Search */}
    <li className="nav-item">
      <a className="nav-link" data-widget="navbar-search" href="#" role="button">
        <i className="fas fa-search" />
      </a>
      <div className="navbar-search-block">
        <form className="form-inline">
          <div className="input-group input-group-sm">
            <input className="form-control form-control-navbar" type="search" placeholder="Search" aria-label="Search" />
            <div className="input-group-append">
              <button className="btn btn-navbar" type="submit">
                <i className="fas fa-search" />
              </button>
              <button className="btn btn-navbar" type="button" data-widget="navbar-search">
                <i className="fas fa-times" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </li>
    {/* Notifications Dropdown Menu */}
    <li className="nav-item dropdown">
      <a className="nav-link" data-toggle="dropdown" href="#">
        <i className="far fa-bell" />
        {notifications.length > 0 && <span className="badge badge-warning navbar-badge">{notifications.length}</span>}
      </a>
      <div className="dropdown-menu dropdown-menu-lg dropdown-menu-right p-2" style={{ maxHeight: 400, overflowY: 'auto', width: 370 }}>
        {notifications.length === 0 && <div className="text-center text-muted">Không có thông báo mới</div>}
        {notifications.map((n, idx) => (
          <div
            key={n.booking._id}
            className="notification-item d-flex align-items-center mb-2 p-2 rounded"
            style={{ cursor: 'pointer', background: '#f8f9fa' }}
            onClick={() => handleNotificationClick(n.booking._id)}
          >
            <img
              src={n.tour?.image?.[0] || '/img/default-tour.jpg'}
              alt="tour"
              style={{ width: 48, height: 32, objectFit: 'cover', borderRadius: 4, marginRight: 10 }}
            />
            <div style={{ flex: 1 }}>
              <div>
                <b>{n.tour?.name || 'Tour'}</b>
                <span className="ml-2 badge badge-info">{n.type === 'new' ? 'Đặt mới' : 'Đổi trạng thái'}</span>
              </div>
              <div>
                <span>Khách: <b>{n.booking.user_name || n.booking.user_id?.first_name + ' ' + n.booking.user_id?.last_name}</b></span>
              </div>
              <div>
                Ngày đặt: {n.booking.booking_date ? new Date(n.booking.booking_date).toLocaleDateString('vi-VN') : ''}
                <span className="ml-2">Trạng thái: <b>{n.booking.status}</b></span>
              </div>
              <div>
                Thành tiền: <b>{Number(n.booking.totalPrice || 0).toLocaleString('vi-VN')} VNĐ</b>
              </div>
            </div>
          </div>
        ))}
      </div>
    </li>
    <li className="nav-item">
      <a className="nav-link" data-widget="fullscreen" href="#" role="button">
        <i className="fas fa-expand-arrows-alt" />
      </a>
    </li>
    <button className="btn btn-outline-secondary ml-2" onClick={handleToggleTheme} title="Toggle Light/Dark Mode">
      {isDark ? (
        <i className="fas fa-sun"></i>
      ) : (
        <i className="fas fa-moon"></i>
      )}
    </button>
  </ul>
</nav>
{/* /.navbar */}

    </div>
  );
});

export default Header;
