import { Link, useLocation } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import SideNavReviewsCount from './SideNavReviewsCount';

function SideNav({ onLogoutClick }) {
  const location = useLocation();
  const isDashboardActive = location.pathname === '/dashboard ' || location.pathname === '/';
  const isCategoryActive = location.pathname.startsWith('/tour') || location.pathname.startsWith('/vouchers');

  // Detect sidebar mini mode
  const [isSidebarMini, setIsSidebarMini] = useState(false);
  useEffect(() => {
    const checkSidebarMini = () => {
      // Nếu body có sidebar-mini và chiều rộng sidebar nhỏ hơn 80px thì là mini
      const sidebar = document.querySelector('.main-sidebar');
      const isMini = document.body.classList.contains('sidebar-mini') && sidebar && sidebar.offsetWidth < 100;
      setIsSidebarMini(isMini);
    };
    checkSidebarMini();
    window.addEventListener('resize', checkSidebarMini);
    const observer = new MutationObserver(checkSidebarMini);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => {
      window.removeEventListener('resize', checkSidebarMini);
      observer.disconnect();
    };
  }, []);

  // Xác định active cho từng nhóm rõ ràng
  const isToursGroupActive = location.pathname === '/tour' || location.pathname === '/tour/' || location.pathname === '/add-tour';
  const isTourListActive = location.pathname === '/tour' || location.pathname === '/tour/';
  const isAddTourActive = location.pathname === '/add-tour';
  const isCategoryGroupActive = location.pathname.startsWith('/vouchers') || location.pathname.startsWith('/users');
  const isVouchersActive = location.pathname.startsWith('/vouchers');
  const isUsersActive = location.pathname.startsWith('/users');

  return (
    <div>
      <aside className="main-sidebar sidebar-light elevation-4" style={{ minHeight: '100vh', position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 1040 }}>
        {/* Brand Logo */}
        <a href="/dashboard" className="brand-link bg-light">
          <img src="/dist/img/logo.png" alt="EKSORA Logo" className="brand-image img-circle elevation-3" style={{ opacity: '.8' }} />
          <span className="brand-text font-weight-light text-dark">EKSORA ADMIN</span>
        </a>
        {/* Sidebar */}
        <div className="sidebar bg-light" style={{ minHeight: '100vh' }}>
          {/* Sidebar user panel (template mặc định, phía trên menu) */}
          {/* <div className="user-panel mt-3 pb-3 mb-3 d-flex bg-light">
            <div className="image">
              <img src="/dist/img/user2-160x160.jpg" className="img-circle elevation-2" alt="User Image" />
            </div>
            <div className="info">
              <a href="#" className="d-block text-dark">Tuan Nguyen</a>
            </div>
          </div> */}
          {/* SidebarSearch Form */}
          <div className="form-inline bg-light">
            <div className="input-group" data-widget="sidebar-search">
              <input
                className="form-control form-control-sidebar bg-light"
                type="search"
                placeholder="Search"
                aria-label="Search"
                style={{ color: '#212529', fontWeight: 'bold' }} // chữ đậm
              />
              <div className="input-group-append">
                <button className="btn btn-sidebar bg-light" style={{ color: '#212529', fontWeight: 'bold' }}>
                  <i className="fas fa-search fa-fw" />
                </button>
              </div>
            </div>
          </div>
          {/* Sidebar Menu */}
          <nav className="mt-2">
            <ul className="nav nav-pills nav-sidebar flex-column bg-light" data-widget="treeview" role="menu" data-accordion="false">
              {/* Dashboard */}
              <li className="nav-item menu-open">
                <Link to="/" className="nav-link" style={isDashboardActive ? { background: '#3f6791', color: '#fff' } : {}}>
                  <i className="nav-icon fas fa-tachometer-alt" />
                  <p>
                    Dashboard
                    <i className="right fas fa-angle-left" />
                  </p>
                </Link>
                <ul className="nav nav-treeview">
                  <li className="nav-item">
                    <Link to="/dashboard" className="nav-link" style={isDashboardActive ? { background: '#ebecec' } : {}}>
                      <i className="far fa-circle nav-icon" />
                      <p>Dashboard</p>
                    </Link>
                  </li>
                </ul>
              </li>

              {/* Danh mục Tours */}
              <li className={`nav-item menu-open${isToursGroupActive ? ' active' : ''}`}>
                <button type="button" className="nav-link w-100 text-left" style={isToursGroupActive ? { background: '#3f6791', color: '#fff' } : {}}>
                  <i className="fa-solid fa fa-map"></i>
                  <i className="right fas fa-angle-left" />
                  <p> Tours </p>
                </button>
                <ul className="nav nav-treeview">
                  <li className="nav-item">
                    <Link to="/tour" className="nav-link text-dark" style={isTourListActive ? { background: '#ebecec' } : {}}>
                      <i className="far fa-circle nav-icon" />
                      <p>Quản lý Tours</p>
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link to="/add-tour" className="nav-link text-dark" style={isAddTourActive ? { background: '#ebecec' } : {}}>
                      <i className="far fa-circle nav-icon" />
                      <p>Thêm Tour</p>
                    </Link>
                  </li>
                </ul>
              </li>
              {/* Danh mục khác */}
              <li className={`nav-item menu-open${isCategoryGroupActive ? ' active' : ''}`}>
                <button type="button" className="nav-link w-100 text-left" style={isCategoryGroupActive ? { background: '#3f6791', color: '#fff' } : {}}>
                  <i className="fa-solid fa fa-folder"></i>
                  <i className="right fas fa-angle-left" />
                  <p> Danh mục </p>
                </button>
                <ul className="nav nav-treeview">
                  <li className="nav-item">
                    <Link to="/vouchers" className="nav-link text-dark" style={isVouchersActive ? { background: '#ebecec' } : {}}>
                      <i className="far fa-circle nav-icon" />
                      <p>Vouchers</p>
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link to="/users" className="nav-link text-dark" style={isUsersActive ? { background: '#ebecec' } : {}}>
                      <i className="far fa-circle nav-icon" />
                      <p>Users</p>
                    </Link>
                  </li>
                </ul>
              </li>
              {/* Các mục khác */}
              <li className="nav-item">
                <Link to="/bookings" className="nav-link" style={location.pathname.startsWith('/bookings') ? { background: '#3f6791', color: '#fff' } : {}}>
                  <i className="nav-icon fas fa-book" style={location.pathname.startsWith('/bookings') ? { color: '#fff' } : {}}></i>
                  <p>Bookings</p>
                </Link>
              </li>
              <SideNavReviewsCount />
              {/* Nút Đăng xuất */}
              <li className="nav-item mt-3">
                <button
                  className="btn btn-outline-danger btn-block d-flex align-items-center justify-content-center"
                  onClick={onLogoutClick}
                  style={{ minHeight: 40 }}
                >
                  {isSidebarMini ? (
                    <i className="fas fa-sign-out-alt"></i>
                  ) : (
                    <><i className="fas fa-sign-out-alt mr-1"></i> Đăng xuất</>
                  )}
                </button>
              </li>
            </ul>
          </nav>
        </div>
        {/* /.sidebar */}
      </aside>
      {/* Để tránh SideNav đè lên nội dung Login, thêm padding/margin left cho nội dung chính nếu cần */}
    </div>
  );
}

export default SideNav;
