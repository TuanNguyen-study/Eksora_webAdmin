import React from 'react';
import { FaTag, FaClock, FaList, FaMapMarkerAlt, FaAlignLeft } from 'react-icons/fa';
import CkeditorField from './CkeditorField';

function TourModal({
  show,
  onClose,
  modalType,
  form,
  setForm,
  handleFormChange,
  handleFormSubmit,
  editingDescription,
  setEditingDescription,
  categories,
  suppliers,
  handleImageUpload,
  formatNumberVN
}) {
  if (!show) return null;
  return (
    <div className="modal show d-block" tabIndex="-1" role="dialog" style={{ background: 'rgba(0,0,0,0.3)' }}>
      <div className="modal-dialog modal-lg" role="document">
        <div className="modal-content bg-white text-dark">
          <div className="modal-header bg-light">
            <h5 className="modal-title">
              {modalType === 'view' && 'Chi tiết Tour'}
              {modalType === 'edit' && 'Sửa Tour'}
              {modalType === 'add' && 'Thêm Tour mới'}
            </h5>
            <button type="button" className="close" onClick={onClose}>
              <span>&times;</span>
            </button>
          </div>
          <div className="modal-body">
            {modalType === 'view' ? (
              <div>Đang phát triển chế độ xem chi tiết...</div>
            ) : (
              <form onSubmit={handleFormSubmit} className="bg-white p-2 rounded">
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
                    <label><FaTag className="mr-1" />Giá vé người lớn</label>
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control bg-light"
                        name="price_adult"
                        value={formatNumberVN(form.price_adult)}
                        onChange={e => {
                          const raw = e.target.value.replace(/\D/g, '');
                          setForm({ ...form, price_adult: raw });
                        }}
                        required
                      />
                      <div className="input-group-append">
                        <span className="input-group-text">VNĐ</span>
                      </div>
                    </div>
                  </div>
                  <div className="form-group col-md-6">
                    <label><FaTag className="mr-1" />Giá mặc định</label>
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control bg-light"
                        name="price"
                        value={formatNumberVN(form.price)}
                        onChange={e => {
                          const raw = e.target.value.replace(/\D/g, '');
                          setForm({ ...form, price: raw });
                        }}
                        required
                      />
                      <div className="input-group-append">
                        <span className="input-group-text">VNĐ</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="form-row">
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
                  <div className="form-group col-md-6">
                    <label><FaList className="mr-1" />Danh mục</label>
                    <select className="form-control bg-light" name="cateID.name" value={form.cateID.name} onChange={handleFormChange} required>
                      <option value="">-- Chọn danh mục --</option>
                      {categories.map(cate => (
                        <option key={cate._id} value={cate.name}>{cate.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group col-md-6">
                    <label><FaList className="mr-1" />Nhà cung cấp</label>
                    <select className="form-control bg-light" name="supplier_id" value={form.supplier_id || ''} onChange={handleFormChange} required>
                      <option value="">-- Chọn nhà cung cấp --</option>
                      {suppliers.map(sup => (
                        <option key={sup._id} value={sup._id}>{sup.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group col-md-3">
                    <label><i className="fas fa-clock mr-1" />Giờ mở cửa</label>
                    <input type="time" className="form-control bg-light" name="open_time" value={form.open_time || ''} onChange={handleFormChange} required />
                  </div>
                  <div className="form-group col-md-3">
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
  );
}

export default TourModal;
