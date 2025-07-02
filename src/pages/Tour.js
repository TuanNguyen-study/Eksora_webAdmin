import React, { useState, useEffect } from 'react';
import { getTours, getCategories, getSuppliers, updateTour } from '../api/api';
import { FaTag, FaClock, FaList, FaMapMarkerAlt, FaImage, FaAlignLeft, FaCheckCircle } from 'react-icons/fa';
import { uploadImageToCloudinary } from '../api/cloudinary';
import CkeditorField from '../components/CkeditorField';

function Tour() {
  const [tours, setTours] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTour, setSelectedTour] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('view'); // 'view', 'edit', 'add'
  const [form, setForm] = useState({ name: '', description: '', price: '', image: [''], duration: '', location: '', rating: '', cateID: { name: '', image: '' }, province: '', status: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [editingDescription, setEditingDescription] = useState(false);

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
    // Lấy danh mục
    getCategories().then(setCategories).catch(() => setCategories([]));
    // Lấy nhà cung cấp
    getSuppliers().then(setSuppliers).catch(() => setSuppliers([]));
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
    // Hỗ trợ cả event từ input/select và object từ CKEditor
    if (e && e.target) {
      const { name, value } = e.target;
      if (name.startsWith('cateID.')) {
        setForm({ ...form, cateID: { ...form.cateID, [name.split('.')[1]]: value } });
      } else if (name === 'image') {
        setForm({ ...form, image: value.split(',') });
      } else {
        setForm({ ...form, [name]: value });
      }
    } else if (e && e.name && typeof e.value === 'string') {
      // Trường hợp CKEditor trả về { name, value }
      setForm({ ...form, [e.name]: e.value });
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (modalType === 'add') {
      try {
        const newTour = { ...form, _id: Date.now().toString() };
        setTours([...tours, newTour]);
        alert('Thêm tour thành công!');
        setShowModal(false);
      } catch (err) {
        alert('Lỗi khi tạo tour!');
      }
    } else if (modalType === 'edit') {
      try {
        const updated = await updateTour(selectedTour._id, form);
        setTours(tours.map(t => t._id === selectedTour._id ? updated : t));
        alert('Cập nhật tour thành công!');
        setShowModal(false);
      } catch (err) {
        alert('Lỗi khi cập nhật tour!');
      }
    }
  };

  // Xử lý upload ảnh từ máy tính lên Cloudinary
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    try {
      const urls = await Promise.all(files.map(file => uploadImageToCloudinary(file)));
      setForm({ ...form, image: urls });
    } catch (err) {
      alert('Lỗi upload ảnh!');
    }
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
                          <td>{Number(tour.price).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</td>
                          <td>{tour.duration}</td>
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
                    <div className="mb-3 d-flex flex-wrap justify-content-center">
                      {selectedTour.image?.map((img, idx) => (
                        <img key={idx} src={img} alt="tour" style={{ width: 180, height: 120, objectFit: 'cover', marginRight: 8, marginBottom: 8, borderRadius: 8, boxShadow: '0 2px 8px #ccc' }} />
                      ))}
                    </div>
                    <div className="row">
                      <div className="col-md-6 mb-2">
                        <b>Tên Tour:</b> <span className="ml-1">{selectedTour.name}</span>
                      </div>
                      <div className="col-md-6 mb-2">
                        <b>Địa điểm:</b> <span className="ml-1">{selectedTour.location}</span>
                      </div>
                      <div className="col-md-6 mb-2">
                        <b>Giá:</b> <span className="ml-1">{Number(selectedTour.price).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</span>
                      </div>
                      <div className="col-md-6 mb-2">
                        <b>Thời lượng:</b> <span className="ml-1">{selectedTour.duration}</span>
                      </div>
                      <div className="col-md-6 mb-2">
                        <b>Danh mục:</b> <span className="ml-1">{selectedTour.cateID?.name}</span>
                      </div>
                      <div className="col-md-6 mb-2">
                        <b>Tỉnh/Thành:</b> <span className="ml-1">{selectedTour.province}</span>
                      </div>
                      <div className="col-md-6 mb-2">
                        <b>Trạng thái:</b> <span className="ml-1">{selectedTour.status === 'active' ? 'Active' : 'Deactive'}</span>
                      </div>
                    </div>
                    <div className="mt-3">
                      <b>Mô tả:</b>
                      <div style={{ maxHeight: 250, overflowY: 'auto', border: '1px solid #eee', borderRadius: 6, padding: 12, background: '#fafbfc', marginTop: 6 }}>
                        <span dangerouslySetInnerHTML={{ __html: selectedTour.description }} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleFormSubmit}>
                    {!editingDescription && (
                      <>
                        <div className="form-group">
                          <label><FaTag className="mr-1" />Tên Tour</label>
                          <input type="text" className="form-control bg-light" name="name" value={form.name} onChange={handleFormChange} required />
                        </div>
                        <div className="form-group">
                          <label><FaMapMarkerAlt className="mr-1" />Địa điểm</label>
                          <input type="text" className="form-control bg-light" name="location" value={form.location} onChange={handleFormChange} required />
                        </div>
                        <div className="form-row">
                          <div className="form-group col-md-6">
                            <label><FaTag className="mr-1" />Giá</label>
                            <input type="number" className="form-control bg-light" name="price" value={form.price} onChange={handleFormChange} required />
                          </div>
                          <div className="form-group col-md-6">
                            <label><FaClock className="mr-1" />Thời lượng</label>
                            <select className="form-control bg-light" name="duration" value={form.duration} onChange={handleFormChange} required>
                              <option value="">-- Chọn thời lượng --</option>
                              <option value="Nửa ngày">Nửa ngày</option>
                              <option value="1 Ngày">1 Ngày</option>
                              <option value="2 Ngày 1 Đêm">2 Ngày 1 Đêm</option>
                              <option value="3 Ngày 2 Đêm">3 Ngày 2 Đêm</option>
                            </select>
                          </div>
                        </div>
                        <div className="form-group">
                          <label><FaList className="mr-1" />Danh mục</label>
                          <select className="form-control bg-light" name="cateID.name" value={form.cateID.name} onChange={handleFormChange} required>
                            <option value="">-- Chọn danh mục --</option>
                            {categories.map(cate => (
                              <option key={cate._id} value={cate.name}>{cate.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label><FaList className="mr-1" />Nhà cung cấp</label>
                          <select className="form-control bg-light" name="supplier_id" value={form.supplier_id || ''} onChange={handleFormChange} required>
                            <option value="">-- Chọn nhà cung cấp --</option>
                            {suppliers.map(sup => (
                              <option key={sup._id} value={sup._id}>{sup.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-row">
                          <div className="form-group col-md-6">
                            <label><i className="fas fa-clock mr-1" />Giờ mở cửa</label>
                            <input type="time" className="form-control bg-light" name="open_time" value={form.open_time || ''} onChange={handleFormChange} required />
                          </div>
                          <div className="form-group col-md-6">
                            <label><i className="fas fa-clock mr-1" />Giờ đóng cửa</label>
                            <input type="time" className="form-control bg-light" name="close_time" value={form.close_time || ''} onChange={handleFormChange} required />
                          </div>
                        </div>
                        <div className="form-group">
                          <label><span className="mr-1"><i className="fas fa-image" /></span>Ảnh (chọn nhiều ảnh)</label>
                          <input type="file" className="form-control-file" accept="image/*" multiple onChange={handleImageUpload} />
                          <div className="d-flex flex-wrap mt-2">
                            {form.image && form.image.map((img, idx) => (
                              <img key={idx} src={img} alt="tour" style={{ width: 60, height: 40, objectFit: 'cover', marginRight: 8, marginBottom: 8 }} />
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                    {/* Trường mô tả luôn hiển thị, nhưng khi edit thì các trường khác ẩn */}
                    <div className="form-group" style={{ position: 'relative' }}>
                      <label><FaAlignLeft className="mr-1" />Mô tả</label>
                      {!editingDescription && (
                        <button type="button" className="btn btn-sm btn-outline-primary ml-2" style={{ position: 'absolute', right: 0, top: 0 }} onClick={() => setEditingDescription(true)}>
                          Sửa mô tả
                        </button>
                      )}
                      <div style={{ maxHeight: editingDescription ? 400 : 120, overflowY: 'auto', transition: 'max-height 0.3s', border: editingDescription ? '1px solid #007bff' : undefined, borderRadius: 6, background: '#fff' }}>
                        <CkeditorField
                          name="description"
                          value={form.description}
                          onChange={handleFormChange}
                          readOnly={!editingDescription}
                        />
                      </div>
                      {editingDescription && (
                        <button type="button" className="btn btn-sm btn-success mt-2" onClick={() => setEditingDescription(false)}>
                          Lưu mô tả
                        </button>
                      )}
                    </div>
                    {!editingDescription && (
                      <button type="submit" className="btn btn-success"><i className="fas fa-save mr-1"></i>Lưu</button>
                    )}
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
