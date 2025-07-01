import React, { useState, useEffect } from 'react';
import { getTours } from '../api/api';

function Tour() {
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTour, setSelectedTour] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('view'); // 'view', 'edit', 'add'
  const [form, setForm] = useState({ name: '', description: '', price: '', image: [''], duration: '', location: '', rating: '', cateID: { name: '', image: '' }, province: '', status: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    async function fetchTours() {
      setLoading(true);
      setError(null);
      try {
        const data = await getTours();
        setTours(data);
      } catch (err) {
        setError('Không thể tải danh sách tour!');
      } finally {
        setLoading(false);
      }
    }
    fetchTours();
  }, []);

  const handleView = (tour) => {
    setSelectedTour(tour);
    setModalType('view');
    setShowModal(true);
  };

  const handleEdit = (tour) => {
    setSelectedTour(tour);
    setForm({ ...tour, cateID: { ...tour.cateID } });
    setModalType('edit');
    setShowModal(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Bạn có chắc muốn xóa tour này?')) {
      setTours(tours.filter(t => t._id !== id));
    }
  };

  const handleAdd = () => {
    setForm({ name: '', description: '', price: '', image: [''], duration: '', location: '', rating: '', cateID: { name: '', image: '' }, province: '' });
    setModalType('add');
    setShowModal(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('cateID.')) {
      setForm({ ...form, cateID: { ...form.cateID, [name.split('.')[1]]: value } });
    } else if (name === 'image') {
      setForm({ ...form, image: value.split(',') });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (modalType === 'add') {
      const newTour = { ...form, _id: Date.now().toString() };
      setTours([...tours, newTour]);
    } else if (modalType === 'edit') {
      setTours(tours.map(t => t._id === selectedTour._id ? { ...form, _id: t._id } : t));
    }
    setShowModal(false);
  };

  // Pagination logic
  const totalPages = Math.ceil(tours.length / itemsPerPage);
  const pagedTours = tours.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Detect dark mode
  const isDark = document.body.classList.contains('dark-mode');

  return (
    <div className={`content-wrapper ${isDark ? 'bg-dark text-light' : 'bg-white'}`}>
      <div className={`content-header ${isDark ? 'bg-dark text-light' : 'bg-white'}`}>
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className={isDark ? 'text-light' : 'text-dark'}>Quản lý Tour</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><a href="#">Home</a></li>
                <li className="breadcrumb-item active">Tour</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
      <section className="content">
        <div className="container-fluid">
          <button className="btn btn-primary mb-3" onClick={handleAdd}>Thêm Tour mới</button>
          {loading && <div>Đang tải dữ liệu...</div>}
          {error && <div className="alert alert-danger">{error}</div>}
          {!loading && !error && (
            <>
              <div className={`card ${isDark ? 'bg-dark text-light' : ''}`}>
                <div className="card-body">
                  <table className={`table table-bordered ${isDark ? 'bg-dark text-light' : ''}`}>
                    <thead>
                      <tr>
                        <th>Ảnh</th>
                        <th>Tên Tour</th>
                        <th>Địa điểm</th>
                        <th>Giá</th>
                        <th>Thời lượng</th>
                        <th>Rating</th>
                        <th>Danh mục</th>
                        <th>Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedTours.map(tour => (
                        <tr key={tour._id}>
                          <td><img src={tour.image?.[0]} alt={tour.name} style={{ width: 60, height: 40, objectFit: 'cover' }} /></td>
                          <td>{tour.name}</td>
                          <td>{tour.location}</td>
                          <td>{tour.price?.toLocaleString()} đ</td>
                          <td>{tour.duration}</td>
                          <td>{tour.rating}</td>
                          <td>{tour.cateID?.name}</td>
                          <td>
                            <button className="btn btn-info btn-sm mr-2" onClick={() => handleView(tour)}>
                              <i className="fas fa-eye mr-1"></i> Xem
                            </button>
                            <button className="btn btn-warning btn-sm mr-2" onClick={() => handleEdit(tour)}>
                              <i className="fas fa-edit mr-1"></i> Sửa
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(tour._id)}>
                              <i className="fas fa-trash mr-1"></i> Xóa
                            </button>
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
      </section>
      <footer className={`main-footer ${isDark ? 'bg-dark text-light' : 'bg-white text-dark'}`}>
        <div className="float-right d-none d-sm-block">
          <b>Version</b> 3.2.0
        </div>
        <strong>Copyright &copy; 2014-2021 <a href="https://adminlte.io">AdminLTE.io</a>.</strong> All rights reserved.
      </footer>
      {showModal && (
        <div className="modal show d-block" tabIndex="-1" role="dialog" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <div className="modal-dialog modal-lg" role="document">
            <div className="modal-content bg-white text-dark">
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
                    <div className="mb-3 d-flex flex-wrap">
                      {selectedTour.image?.map((img, idx) => (
                        <img key={idx} src={img} alt="tour" style={{ width: 120, height: 80, objectFit: 'cover', marginRight: 8, marginBottom: 8 }} />
                      ))}
                    </div>
                    <p><b>Tên Tour:</b> {selectedTour.name}</p>
                    <p><b>Địa điểm:</b> {selectedTour.location}</p>
                    <p><b>Giá:</b> {selectedTour.price?.toLocaleString()} đ</p>
                    <p><b>Thời lượng:</b> {selectedTour.duration}</p>
                    <p><b>Rating:</b> {selectedTour.rating}</p>
                    <p><b>Danh mục:</b> {selectedTour.cateID?.name}</p>
                    <p><b>Tỉnh/Thành:</b> {selectedTour.province}</p>
                    <p><b>Mô tả:</b> {selectedTour.description}</p>
                    <p><b>Trạng thái:</b> {selectedTour.status === 'active' ? 'Active' : 'Deactive'}</p>
                  </div>
                ) : (
                  <form onSubmit={handleFormSubmit}>
                    <div className="form-group">
                      <label>Tên Tour</label>
                      <input type="text" className="form-control bg-light" name="name" value={form.name} onChange={handleFormChange} required />
                    </div>
                    <div className="form-group">
                      <label>Địa điểm</label>
                      <input type="text" className="form-control bg-light" name="location" value={form.location} onChange={handleFormChange} required />
                    </div>
                    <div className="form-group">
                      <label>Giá</label>
                      <input type="number" className="form-control bg-light" name="price" value={form.price} onChange={handleFormChange} required />
                    </div>
                    <div className="form-group">
                      <label>Thời lượng</label>
                      <input type="text" className="form-control bg-light" name="duration" value={form.duration} onChange={handleFormChange} required />
                    </div>
                    <div className="form-group">
                      <label>Rating</label>
                      <input type="number" step="0.1" className="form-control bg-light" name="rating" value={form.rating} onChange={handleFormChange} required />
                    </div>
                    <div className="form-group">
                      <label>Danh mục</label>
                      <input type="text" className="form-control bg-light" name="cateID.name" value={form.cateID.name} onChange={handleFormChange} required />
                    </div>
                    <div className="form-group">
                      <label>Tỉnh/Thành</label>
                      <input type="text" className="form-control bg-light" name="province" value={form.province} onChange={handleFormChange} required />
                    </div>
                    <div className="form-group">
                      <label>Ảnh (dán nhiều link, ngăn cách dấu phẩy)</label>
                      <input type="text" className="form-control bg-light" name="image" value={form.image.join(',')} onChange={handleFormChange} required />
                    </div>
                    <div className="form-group">
                      <label>Mô tả</label>
                      <textarea className="form-control bg-light" name="description" value={form.description} onChange={handleFormChange} required />
                    </div>
                    <div className="form-group">
                      <label>Trạng thái</label>
                      <select className="form-control bg-light" name="status" value={form.status || ''} onChange={handleFormChange} required>
                        <option value="active">Active</option>
                        <option value="deactive">Deactive</option>
                      </select>
                    </div>
                    <button type="submit" className="btn btn-success">Lưu</button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Tour;
