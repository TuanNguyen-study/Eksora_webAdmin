import React, { useState, useEffect } from 'react';
import UserProfileModal from '../components/UserProfileModal';
import { getAllBookings } from '../api/api';
import { getAllUsers } from '../api/api';
import { deleteUser } from '../api/api';

const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?name=User&background=dee2e6&color=495057&size=128';

function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 9;
  // State cho bộ lọc role
  const [roleFilter, setRoleFilter] = useState('all'); // 'all', 'user', 'supplier'
  // Thêm state cho modal và bookings
  const [selectedUser, setSelectedUser] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [userBookings, setUserBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [errorBookings, setErrorBookings] = useState(null);
  // Modal xác nhận xóa user
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  useEffect(() => {
    async function fetchUsers() {
      setLoading(true);
      try {
        const data = await getAllUsers();
        setUsers(data);
      } catch (err) {
        setUsers([]);
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  // Pagination với filter
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  
  // Lọc users theo role (loại bỏ admin và áp dụng filter role)
  const filteredUsers = users.filter(u => {
    // Luôn loại bỏ admin
    if (u.role === 'admin') return false;
    
    // Áp dụng filter role
    if (roleFilter === 'all') return true;
    if (roleFilter === 'user') return u.role === 'user' || !u.role; // user hoặc không có role
    if (roleFilter === 'supplier') return u.role === 'supplier';
    
    return true;
  });
  
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const isDark = document.body.classList.contains('dark-mode');

  // Hàm xử lý thay đổi filter
  const handleRoleFilterChange = (newFilter) => {
    setRoleFilter(newFilter);
    setCurrentPage(1); // Reset về trang đầu khi đổi filter
  };

  // Hàm xóa user
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await deleteUser(userToDelete._id);
      setUsers(prev => prev.filter(u => u._id !== userToDelete._id));
      setShowDeleteModal(false);
      setUserToDelete(null);
    } catch (err) {
      alert('Xóa user thất bại!');
      setShowDeleteModal(false);
      setUserToDelete(null);
    }
  };

  return (
    <div className={`content-wrapper ${isDark ? 'bg-dark text-light' : 'bg-white'}`}>
      <div className={`content-header ${isDark ? 'bg-dark text-light' : 'bg-white'}`}>
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className={isDark ? 'text-light' : 'text-dark'}>Users</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><a href="#">Home</a></li>
                <li className="breadcrumb-item active">Users</li>
              </ol>
            </div>
          </div>
          {/* Bộ lọc Role */}
          <div className="row mb-3">
            <div className="col-md-4">
              <label htmlFor="roleFilter" className={`form-label ${isDark ? 'text-light' : 'text-dark'}`}>
                Lọc theo Role:
              </label>
              <select 
                id="roleFilter"
                className="form-control"
                value={roleFilter}
                onChange={(e) => handleRoleFilterChange(e.target.value)}
              >
                <option value="all">Tất cả</option>
                <option value="user">User</option>
                <option value="supplier">Supplier</option>
              </select>
            </div>
            <div className="col-md-8 d-flex align-items-end">
              <div className={`text-muted ${isDark ? 'text-light' : ''}`}>
                Hiển thị {currentUsers.length} / {filteredUsers.length} users
              </div>
            </div>
          </div>
        </div>
      </div>
      <section className="content">
        <div className="card card-solid">
          <div className="card-body pb-0">
            {loading ? (
              <div>Đang tải dữ liệu...</div>
            ) : (
              <div className="row">
                {currentUsers.map((user, idx) => (
                  <div className="col-12 col-sm-6 col-md-4 d-flex align-items-stretch flex-column" key={user._id || idx}>
                    <div className="card bg-light d-flex flex-fill">
                      <div className="card-header text-muted border-bottom-0">
                        {user.role === 'admin' ? 'Admin' : user.role === 'supplier' ? 'Supplier' : 'User'}
                      </div>
                      <div className="card-body pt-0">
                        <div className="row">
                          <div className="col-7">
                            <h2 className="lead"><b>{user.first_name} {user.last_name}</b></h2>
                            <ul className="ml-4 mb-0 fa-ul text-muted">
                              {user.email && (
                                <li className="small"><span className="fa-li"><i className="fas fa-lg fa-envelope"></i></span> Email: {user.email}</li>
                              )}
                              {user.address && (
                                <li className="small"><span className="fa-li"><i className="fas fa-lg fa-building"></i></span> Address: {user.address}</li>
                              )}
                              {user.phone && (
                                <li className="small"><span className="fa-li"><i className="fas fa-lg fa-phone"></i></span> Phone #: {user.phone}</li>
                              )}
                            </ul>
                          </div>
                          <div className="col-5 text-center">
                            <img src={user.avatar || DEFAULT_AVATAR} alt="user-avatar" className="img-circle img-fluid" />
                          </div>
                        </div>
                      </div>
                      <div className="card-footer">
                        <div className="text-right">
                          <a href="#" className="btn btn-sm bg-teal">
                            <i className="fas fa-comments"></i>
                          </a>
                          <button className="btn btn-sm btn-primary" onClick={() => { setSelectedUser(user); setShowProfileModal(true); }}>
                            <i className="fas fa-user"></i> View Profile
                          </button>
                          <button className="btn btn-sm btn-danger ml-2" onClick={() => { setUserToDelete(user); setShowDeleteModal(true); }}>
                            <i className="fas fa-trash"></i> Xóa
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="card-footer">
              <nav aria-label="Users Page Navigation">
                <ul className="pagination justify-content-center m-0">
                  {Array.from({ length: totalPages }, (_, i) => (
                    <li key={i + 1} className={`page-item${currentPage === i + 1 ? ' active' : ''}`}>
                      <button className="page-link" onClick={() => setCurrentPage(i + 1)}>{i + 1}</button>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          )}
        </div>
      </section>
      <UserProfileModal user={selectedUser} show={showProfileModal} onClose={() => setShowProfileModal(false)} />
      {/* Modal xác nhận xóa user */}
      {showDeleteModal && (
        <div className="modal fade show d-block" tabIndex="-1" role="dialog" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <div className="modal-dialog" role="document">
            <div className="modal-content">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title">Xác nhận xóa User</h5>
                <button type="button" className="close text-white" onClick={() => setShowDeleteModal(false)}>
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <p>Bạn có chắc chắn muốn xóa user <b>{userToDelete?.first_name} {userToDelete?.last_name}</b> không?</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Hủy</button>
                <button type="button" className="btn btn-danger" onClick={handleDeleteUser}>Xóa</button>
              </div>
            </div>
          </div>
        </div>
      )}
      <footer className={`main-footer ${isDark ? 'bg-dark text-light' : 'bg-white text-dark'}`}>
        <div className="float-right d-none d-sm-block">
          <b>Version</b> 3.2.0
        </div>
        <strong>Copyright &copy; 2014-2021 <a href="https://adminlte.io">AdminLTE.io</a>.</strong> All rights reserved.
      </footer>
    </div>
  );
}

export default Users;
