function SideNav() {
  return (
    <div>
    <aside className="main-sidebar sidebar-dark-primary elevation-4">
  {/* Brand Logo */}
  <a href="dashboard.html" className="brand-link">
    <img src="/eksora_admin/public/dist/img/logo.png" alt="AdminLTE Logo" className="brand-image img-circle elevation-3" style={{opacity: '.8'}} />
    <span className="brand-text font-weight-light">EKSORA ADMIN</span>
  </a>
  {/* Sidebar */}
  <div className="sidebar">
    {/* Sidebar user panel (optional) */}
    <div className="user-panel mt-3 pb-3 mb-3 d-flex">
      <div className="image">
        <img src="/img/user2-160x160.jpg" className="img-circle elevation-2" alt="User Image" />
      </div>
      <div className="info">
        <a href="#" className="d-block">Tuan Nguyen</a>
      </div>
    </div>
    {/* SidebarSearch Form */}
    <div className="form-inline">
      <div className="input-group" data-widget="sidebar-search">
        <input className="form-control form-control-sidebar" type="search" placeholder="Search" aria-label="Search" />
        <div className="input-group-append">
          <button className="btn btn-sidebar">
            <i className="fas fa-search fa-fw" />
          </button>
        </div>
      </div>
    </div>
    {/* Sidebar Menu */}
    <nav className="mt-2">
      <ul className="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu" data-accordion="false">
        {/* Add icons to the links using the .nav-icon class
         with font-awesome or any other icon font library */}
        <li className="nav-item menu-open">
          <a href="#" className="nav-link active">
            <i className="nav-icon fas fa-tachometer-alt" />
            <p>
              Dashboard
              <i className="right fas fa-angle-left" />
            </p>
          </a>
          <ul className="nav nav-treeview">
            <li className="nav-item">
              <a href="./dashboard" className="nav-link active">
                <i className="far fa-circle nav-icon" />
                <p>Dashboard</p>
              </a>
            </li>
          </ul>
        </li>

        {/* Danh mục */}
        <li className="nav-item menu-open">
          <a href="#" className="nav-link active">
            <i className="fa-solid fa fa-folder"></i>
            <i className="right fas fa-angle-left" />
             <p> Categories </p>
          </a>
          <ul className="nav nav-treeview">
            <li className="nav-item">
              <a href="" className="nav-link ">
                 <i className="far fa-circle nav-icon" />
                <p>Tours</p>
              </a>
            </li>
          </ul>
          <ul className="nav nav-treeview">
            <li className="nav-item">
              <a href="" className="nav-link ">
                <i className="far fa-circle nav-icon" />
                <p>Vouchers</p>
              </a>
            </li>
          </ul>
        </li>

      </ul>
    </nav>
    {/* /.sidebar-menu */}
  </div>
  {/* /.sidebar */}
</aside>

    </div>
  );
}

export default SideNav;
