import React, { useState, useEffect, useRef } from 'react';
import { getCategories, getSuppliers, createTour, getCurrentUserRole, getUser } from '../api/api';
import CkeditorField from '../components/CkeditorField';

// Google Maps script loader
const loadGoogleMapsScript = (apiKey, callback) => {
  if (window.google && window.google.maps) {
    callback();
    return;
  }
  const existing = document.getElementById('google-maps-script');
  if (existing) {
    existing.onload = callback;
    return;
  }
  const script = document.createElement('script');
  script.id = 'google-maps-script';
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
  script.async = true;
  script.onload = callback;
  document.body.appendChild(script);
};

function AddTour() {
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '', // Giá vé
    price_child: '', // Giá trẻ em
    image: [], // Change from [''] to [] to avoid empty string
    location: '',
    lat: '',
    lng: '',
    rating: '',
    cateID: { name: '', image: '' },
    supplier_id: '',
    // province: '',
    open_time: '',
    close_time: '',
    status: '',
    services: [],
  });
  // Track missing fields for inline validation
  const [missingFields, setMissingFields] = useState({});
  // Google Maps integration - DISABLED to avoid billing issues
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Disable Google Maps temporarily
  // useEffect(() => {
  //   loadGoogleMapsScript('AIzaSyDoknnrCZfxuuGWvKmngGC8dGHAQEQ4tlA', () => setMapLoaded(true));
  // }, []);

  // Disable Google Maps temporarily to avoid billing issues
  // useEffect(() => {
  //   if (!mapLoaded) return;
  //   if (!mapRef.current) return;
  //   // Default location: Hanoi
  //   const defaultLatLng = { lat: 21.028511, lng: 105.804817 };
  //   const lat = form.lat ? parseFloat(form.lat) : defaultLatLng.lat;
  //   const lng = form.lng ? parseFloat(form.lng) : defaultLatLng.lng;
  //   const map = new window.google.maps.Map(mapRef.current, {
  //     center: { lat, lng },
  //     zoom: 13,
  //   });
  //   let marker = markerRef.current;
  //   if (marker) marker.setMap(null);
  //   marker = new window.google.maps.Marker({
  //     position: { lat, lng },
  //     map,
  //     draggable: true,
  //   });
  //   markerRef.current = marker;
  //   // Update form when marker dragged
  //   marker.addListener('dragend', (e) => {
  //     const lat = e.latLng.lat();
  //     const lng = e.latLng.lng();
  //     setForm(f => ({ ...f, lat, lng }));
  //     // Reverse geocode to get address
  //     const geocoder = new window.google.maps.Geocoder();
  //     geocoder.geocode({ location: { lat, lng } }, (results, status) => {
  //       if (status === 'OK' && results[0]) {
  //         setForm(f => {
  //           // Update the input value directly for immediate UI feedback
  //           const input = document.getElementById('location-input');
  //           if (input) input.value = results[0].formatted_address;
  //           return { ...f, location: results[0].formatted_address };
  //         });
  //       }
  //     });
  //   });
  //   // Click on map to move marker
  //   map.addListener('click', (e) => {
  //     marker.setPosition(e.latLng);
  //     const lat = e.latLng.lat();
  //     const lng = e.latLng.lng();
  //     setForm(f => ({ ...f, lat, lng }));
  //     // Reverse geocode to get address
  //     const geocoder = new window.google.maps.Geocoder();
  //     geocoder.geocode({ location: { lat, lng } }, (results, status) => {
  //       if (status === 'OK' && results[0]) {
  //         setForm(f => {
  //           // Update the input value directly for immediate UI feedback
  //           const input = document.getElementById('location-input');
  //           if (input) input.value = results[0].formatted_address;
  //           return { ...f, location: results[0].formatted_address };
  //         });
  //       }
  //     });
  //   });
  //   // Autocomplete input
  //   const input = document.getElementById('location-input');
  //   if (input) {
  //     const autocomplete = new window.google.maps.places.Autocomplete(input);
  //     autocomplete.addListener('place_changed', () => {
  //       const place = autocomplete.getPlace();
  //       if (place.geometry) {
  //         const lat = place.geometry.location.lat();
  //         const lng = place.geometry.location.lng();
  //         map.setCenter({ lat, lng });
  //         marker.setPosition({ lat, lng });
  //         setForm(f => ({ ...f, lat, lng, location: place.formatted_address }));
  //       }
  //     });
  //   }
  //   // eslint-disable-next-line
  // }, [mapLoaded]);
  
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [editingDescription, setEditingDescription] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    // Lấy thông tin user và role hiện tại
    async function fetchUserInfo() {
      try {
        const [role, userProfile] = await Promise.all([
          getCurrentUserRole(),
          getUser()
        ]);
        setUserRole(role);
        setCurrentUser(userProfile);
        
        // Nếu là supplier, tự động set supplier_id trong form
        if (role === 'supplier' && userProfile && userProfile._id) {
          setForm(prevForm => ({
            ...prevForm,
            supplier_id: userProfile._id,
            status: 'requested' // Tự động set trạng thái requested cho supplier
          }));
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
      }
    }
    
    fetchUserInfo();
    getCategories().then(setCategories).catch(() => setCategories([]));
    getSuppliers().then(setSuppliers).catch(() => setSuppliers([]));
  }, []);

  // Ensure unique keys for categories

  // Định dạng số có dấu chấm mỗi 3 số
  const formatNumber = (value) => {
    if (!value) return '';
    // Xóa ký tự không phải số
    const raw = value.toString().replace(/\D/g, '');
    return raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleFormChange = (e) => {
    if (e && e.target) {
      const { name, value } = e.target;
      // Clear missing field on change
      setMissingFields(prev => ({ ...prev, [name]: false }));
      if (name.startsWith('cateID.')) {
        setForm({ ...form, cateID: { ...form.cateID, [name.split('.')[1]]: value } });
      } else if (name === 'image') {
        setForm({ ...form, image: value.split(',') });
      } else if (name === 'price' || name === 'price_child') {
        setForm({ ...form, [name]: formatNumber(value) });
      } else {
        setForm({ ...form, [name]: value });
      }
    } else if (e && e.name && typeof e.value === 'string') {
      setMissingFields(prev => ({ ...prev, [e.name]: false }));
      setForm({ ...form, [e.name]: e.value });
    }
  };

  // --- Service handlers ---
  const handleServiceChange = (idx, field, value) => {
    const newServices = [...form.services];
    if (field === 'price') {
      newServices[idx][field] = formatNumber(value);
    } else {
      newServices[idx][field] = value;
    }
    setForm({ ...form, services: newServices });
  };

  const handleServiceOptionChange = (serviceIdx, optionIdx, value) => {
    const newServices = [...form.services];
    newServices[serviceIdx].options[optionIdx] = value;
    setForm({ ...form, services: newServices });
  };

  const handleAddService = () => {
    setForm({
      ...form,
      services: [
        ...form.services,
        { name: '', type: '', price: '', options: [''] },
      ],
    });
  };

  const handleRemoveService = (idx) => {
    const newServices = form.services.filter((_, i) => i !== idx);
    setForm({ ...form, services: newServices });
  };

  const handleAddOption = (serviceIdx) => {
    const newServices = [...form.services];
    newServices[serviceIdx].options.push('');
    setForm({ ...form, services: newServices });
  };

  const handleRemoveOption = (serviceIdx, optionIdx) => {
    const newServices = [...form.services];
    newServices[serviceIdx].options = newServices[serviceIdx].options.filter((_, i) => i !== optionIdx);
    setForm({ ...form, services: newServices });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    // Kiểm tra các trường bắt buộc (đã loại bỏ province)
    const requiredFields = [
      { name: 'name', value: form.name },
      { name: 'description', value: form.description },
      { name: 'price', value: form.price },
      { name: 'price_child', value: form.price_child },
      { name: 'location', value: form.location },
      { name: 'cateID.name', value: form.cateID.name },
      { name: 'image', value: form.image && form.image.length > 0 && form.image[0] },
      { name: 'open_time', value: form.open_time },
      { name: 'close_time', value: form.close_time },
      { name: 'status', value: form.status },
    ];

    // Chỉ kiểm tra supplier_id nếu không phải role supplier (vì supplier đã được set tự động)
    if (userRole !== 'supplier') {
      requiredFields.push({ name: 'supplier_id', value: form.supplier_id });
    }
    const missing = {};
    requiredFields.forEach(f => {
      if (!f.value || (typeof f.value === 'string' && !f.value.trim())) {
        missing[f.name] = true;
      }
    });
    setMissingFields(missing);
    if (Object.keys(missing).length > 0) {
      // Focus first missing field
      const first = requiredFields.find(f => missing[f.name]);
      if (first && document.getElementsByName(first.name)[0]) {
        document.getElementsByName(first.name)[0].focus();
      }
      return;
    }
    // Validate services (optional: có thể bắt buộc nếu muốn)
    for (const [i, s] of form.services.entries()) {
      if (!s.name.trim()) {
        alert(`Vui lòng nhập tên cho service thứ ${i + 1}`);
        return;
      }
      if (!s.type.trim()) {
        alert(`Vui lòng nhập loại cho service thứ ${i + 1}`);
        return;
      }
      if (!s.options.length || s.options.some(opt => !opt.trim())) {
        alert(`Vui lòng nhập đầy đủ option cho service thứ ${i + 1}`);
        return;
      }
    }
    try {
      // Lấy đúng cateID và supplier_id là ID (string)
      let cateID = form.cateID;
      if (typeof cateID === 'object' && cateID.name) {
        const foundCate = categories.find(c => c.name === cateID.name);
        cateID = foundCate ? foundCate._id : cateID._id || '';
      }
      let supplier_id = form.supplier_id;
      if (typeof supplier_id === 'object' && supplier_id._id) {
        supplier_id = supplier_id._id;
      }
      
      // Log current form state for debugging
      console.log('Current form state:', form);
      console.log('Categories:', categories);
      console.log('Found cateID:', cateID);
      console.log('Supplier ID:', supplier_id);
      
      // Handle images - check if we have valid images
      let validImages = [];
      if (form.image && Array.isArray(form.image)) {
        validImages = form.image.filter(img => img && (img.startsWith('data:image/') || img.startsWith('http')));
      }
      
      // If no valid images but we have image data, try to process it
      if (validImages.length === 0 && form.image && form.image.length > 0) {
        console.log('No valid base64 images found, checking raw image data:', form.image);
        // If images are still files or blobs, process them
        validImages = form.image.filter(img => img && img !== '');
      }
      
      if (validImages.length === 0) {
        alert('Vui lòng chọn ít nhất một hình ảnh hợp lệ!');
        return;
      }
      
      console.log('Valid images:', validImages.length, 'images');
      
      // Chuyển các trường số về dạng number (bỏ dấu chấm)
      const price = Number(form.price.replace(/\./g, ''));
      const price_child = Number(form.price_child.replace(/\./g, ''));
      
      // Validate prices
      if (isNaN(price) || price <= 0) {
        alert('Giá vé không hợp lệ!');
        return;
      }
      if (isNaN(price_child) || price_child <= 0) {
        alert('Giá trẻ em không hợp lệ!');
        return;
      }
      
      // Định dạng lại giá cho từng service
      const services = form.services.map(s => ({
        ...s,
        price: s.price ? Number(s.price.replace(/\./g, '')) : 0
      }));
      
      // Prepare final data with careful validation
      const tourData = {
        name: form.name.trim(),
        description: form.description.trim(),
        price,
        price_child,
        location: form.location.trim(),
        lat: form.lat ? parseFloat(form.lat) : 0,
        lng: form.lng ? parseFloat(form.lng) : 0,
        rating: form.rating || 0,
        cateID,
        supplier_id,
        open_time: form.open_time,
        close_time: form.close_time,
        status: form.status,
        services,
        image: validImages,
      };
      
      // Validate all required fields one more time
      const requiredChecks = [
        { field: 'name', value: tourData.name },
        { field: 'description', value: tourData.description },
        { field: 'price', value: tourData.price },
        { field: 'price_child', value: tourData.price_child },
        { field: 'location', value: tourData.location },
        { field: 'cateID', value: tourData.cateID },
        { field: 'supplier_id', value: tourData.supplier_id },
        { field: 'open_time', value: tourData.open_time },
        { field: 'close_time', value: tourData.close_time },
        { field: 'status', value: tourData.status },
        { field: 'image', value: tourData.image }
      ];
      
      for (const check of requiredChecks) {
        if (!check.value || (Array.isArray(check.value) && check.value.length === 0)) {
          console.error(`Missing required field: ${check.field}`, check.value);
          alert(`Trường bắt buộc bị thiếu: ${check.field}`);
          return;
        }
      }
      
      console.log('Final tour data being sent:', tourData);
      console.log('User role for API call:', userRole);
      
      // Gửi dữ liệu chuẩn hóa với userRole để chọn đúng endpoint
      await createTour(tourData, userRole);
      setMissingFields({});
      alert('Thêm tour thành công!');
      window.history.back();
    } catch (err) {
      console.error('Error creating tour:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      alert('Lỗi khi tạo tour: ' + (err.response?.data?.message || err.message || 'Unknown error'));
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    
    console.log('Selected files:', files.length);
    
    // Convert files to base64 instead of blob URLs for API compatibility
    const promises = files.map(file => {
      return new Promise((resolve, reject) => {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          reject(new Error(`File ${file.name} is not an image`));
          return;
        }
        
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          reject(new Error(`File ${file.name} is too large (max 5MB)`));
          return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
          console.log('File converted to base64:', file.name, e.target.result.substring(0, 50) + '...');
          resolve(e.target.result);
        };
        reader.onerror = (e) => {
          console.error('Error reading file:', file.name, e);
          reject(new Error(`Error reading file ${file.name}`));
        };
        reader.readAsDataURL(file);
      });
    });
    
    Promise.all(promises)
      .then(base64Images => {
        console.log('All images converted successfully:', base64Images.length);
        setForm({ ...form, image: base64Images });
      })
      .catch(error => {
        console.error('Error converting images:', error);
        alert('Lỗi khi xử lý ảnh: ' + error.message);
      });
  };

  // --- Layout giống WordPress Add New Post ---
  return (
    <div className="container-fluid mt-4 mb-5" style={{ paddingLeft: 260, minHeight: '100vh' }}>
      <div className="row">
        {/* Main content */}
        <div className="col-lg-9 col-md-8">
          <div className="d-flex align-items-center mb-3">
            <h2 className="mb-0">Thêm Tour mới</h2>
            {userRole === 'supplier' && (
              <small className="text-muted ml-3">
                <i className="fas fa-info-circle mr-1"></i>
                Tạo tour với thông tin nhà cung cấp của bạn
              </small>
            )}
          </div>
          <form onSubmit={handleFormSubmit} className="bg-white p-4 rounded shadow-sm" id="add-tour-form">
            <input
              type="text"
              className="form-control form-control-lg mb-3"
              name="name"
              placeholder="Nhập tên tour"
              value={form.name}
              onChange={handleFormChange}
              required
              style={{ fontWeight: 500 }}
            />
            {missingFields.name && <div style={{color:'red', fontSize:13, marginTop:-12, marginBottom:8}}>Cần nhập thông tin</div>}
            <div className="mb-3" style={{ minHeight: 700, maxHeight: 700, overflowY: 'auto', border: '1px solid #e0e0e0', borderRadius: 4 }}>
              <p className="font-weight-bold mb-2">Mô tả chi tiết</p>
              <CkeditorField
                name="description"
                value={form.description}
                onChange={handleFormChange}
              />
              {missingFields.description && <div style={{color:'red', fontSize:13, marginTop:4}}>Cần nhập thông tin</div>}
            </div>
            {/* --- Thêm Service động --- */}
            <div className="mb-4">
              <div className="d-flex align-items-center mb-2">
                <h5 className="mb-0 mr-2">Dịch vụ đi kèm</h5>
                <button type="button" className="btn btn-sm btn-success ml-2" onClick={handleAddService}>
                  + Thêm dịch vụ
                </button>
              </div>
              {form.services.length === 0 && (
                <div className="text-muted mb-2">Chưa có dịch vụ nào.</div>
              )}
              {form.services.map((service, sIdx) => (
                <div key={`service-${Date.now()}-${sIdx}`} className="border rounded p-3 mb-3 bg-light position-relative">
                  <button type="button" className="btn btn-danger btn-sm position-absolute" style={{ top: 8, right: 8 }} onClick={() => handleRemoveService(sIdx)}>
                    Xóa
                  </button>
                  <div className="form-row">
                    <div className="form-group col-md-4">
                      <label>Tên dịch vụ</label>
                      <input type="text" className="form-control" value={service.name} onChange={e => handleServiceChange(sIdx, 'name', e.target.value)} placeholder="Tên dịch vụ" required />
                    </div>
                    <div className="form-group col-md-4">
                      <label>Loại dịch vụ</label>
                      <input type="text" className="form-control" value={service.type} onChange={e => handleServiceChange(sIdx, 'type', e.target.value)} placeholder="Loại" required />
                    </div>
                    <div className="form-group col-md-4">
                      <label>Giá dịch vụ</label>
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control"
                          value={service.price}
                          onChange={e => handleServiceChange(sIdx, 'price', e.target.value)}
                          placeholder="Giá"
                          inputMode="numeric"
                          pattern="[0-9.]*"
                          required
                        />
                        <div className="input-group-append"><span className="input-group-text">VNĐ</span></div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label>Option dịch vụ</label>
                    {service.options.map((opt, oIdx) => (
                      <div key={`option-${Date.now()}-${sIdx}-${oIdx}`} className="input-group mb-2">
                        <input type="text" className="form-control" value={opt} onChange={e => handleServiceOptionChange(sIdx, oIdx, e.target.value)} placeholder={`Option ${oIdx + 1}`} required />
                        <div className="input-group-append">
                          <button type="button" className="btn btn-outline-danger" onClick={() => handleRemoveOption(sIdx, oIdx)} disabled={service.options.length === 1}>-</button>
                          <button type="button" className="btn btn-outline-primary ml-1" onClick={() => handleAddOption(sIdx)}>+</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="row">
              <div className="form-group col-md-6">
                <label>Địa điểm</label>
                <input
                  id="location-input"
                  type="text"
                  className="form-control bg-light mb-2"
                  name="location"
                  value={form.location}
                  onChange={handleFormChange}
                  placeholder="Nhập địa chỉ (Google Maps tạm thời bị tắt)"
                  autoComplete="off"
                  required
                />
                {missingFields.location && <div style={{color:'red', fontSize:13, marginTop:-8, marginBottom:8}}>Cần nhập thông tin</div>}
                {/* Google Maps disabled temporarily to avoid billing issues */}
                <div style={{ width: '100%', height: 250, borderRadius: 8, border: '1px solid #e0e0e0', backgroundColor: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="text-muted text-center">
                    <i className="fas fa-map-marker-alt mb-2" style={{ fontSize: 24 }}></i>
                    <div>Google Maps tạm thời bị tắt</div>
                    <small>Vui lòng nhập địa chỉ thủ công</small>
                  </div>
                </div>
                {form.lat && form.lng && (
                  <div className="small text-muted mt-1">Lat: {form.lat}, Lng: {form.lng}</div>
                )}
              </div>
            </div>
            <div className="row">
              <div className="form-group col-md-6">
                <label>Giá vé</label>
                <div className="input-group">
                  <input type="text" className="form-control bg-light" name="price" value={form.price} onChange={handleFormChange} required inputMode="numeric" pattern="[0-9.]*" />
                  {missingFields.price && <div style={{color:'red', fontSize:13, marginTop:4}}>Cần nhập thông tin</div>}
                  <div className="input-group-append"><span className="input-group-text">VNĐ</span></div>
                </div>
              </div>
              <div className="form-group col-md-6">
                <label>Giá trẻ em</label>
                <div className="input-group">
                  <input type="text" className="form-control bg-light" name="price_child" value={form.price_child} onChange={handleFormChange} required inputMode="numeric" pattern="[0-9.]*" />
                  {missingFields.price_child && <div style={{color:'red', fontSize:13, marginTop:4}}>Cần nhập thông tin</div>}
                  <div className="input-group-append"><span className="input-group-text">VNĐ</span></div>
                </div>
              </div>
            </div>
            <div className="row">
              <div className="form-group col-md-6">
                <label>Giờ mở cửa</label>
                <input type="time" className="form-control bg-light" name="open_time" value={form.open_time || ''} onChange={handleFormChange} />
                {missingFields.open_time && <div style={{color:'red', fontSize:13, marginTop:4}}>Cần nhập thông tin</div>}
              </div>
              <div className="form-group col-md-6">
                <label>Giờ đóng cửa</label>
                <input type="time" className="form-control bg-light" name="close_time" value={form.close_time || ''} onChange={handleFormChange} />
                {missingFields.close_time && <div style={{color:'red', fontSize:13, marginTop:4}}>Cần nhập thông tin</div>}
              </div>
            </div>
            
            <div className="form-group">
              <label>Ảnh (chọn nhiều ảnh)</label>
              <input type="file" className="form-control-file" accept="image/*" multiple onChange={handleImageUpload} />
              {missingFields.image && <div style={{color:'red', fontSize:13, marginTop:4}}>Cần nhập thông tin</div>}
              <div className="d-flex flex-wrap mt-2">
                {form.image && form.image.map((img, idx) => (
                  <img key={`preview-img-${Date.now()}-${idx}`} src={img} alt="tour" style={{ width: 60, height: 40, objectFit: 'cover', marginRight: 8, marginBottom: 8 }} />
                ))}
              </div>
            </div>
            {/* You can add more fields here if needed */}
          </form>
        </div>
        {/* Sidebar */}
        <div className="col-lg-3 col-md-4">
          <div className="card mb-3">
            <div className="card-header font-weight-bold">Xuất bản</div>
            <div className="card-body">
              <div className="form-group mb-2">
                <label className="font-weight-bold">
                  Trạng thái
                  {userRole === 'supplier' && (
                    <small className="text-muted ml-2">
                      <i className="fas fa-info-circle mr-1"></i>
                      Tour sẽ chờ admin duyệt
                    </small>
                  )}
                </label>
                <select 
                  className="form-control" 
                  name="status" 
                  value={form.status} 
                  onChange={handleFormChange} 
                  required
                  disabled={userRole === 'supplier'}
                >
                  <option value="">-- Chọn trạng thái --</option>
                  {userRole === 'supplier' ? (
                    // Supplier chỉ có thể tạo tour với trạng thái "requested"
                    <option value="requested">Requested (Chờ duyệt)</option>
                  ) : (
                    // Admin chỉ có thể chọn trạng thái "Công khai"
                    <option value="Công khai">Công khai</option>
                  )}
                </select>
                {missingFields.status && <div style={{color:'red', fontSize:13, marginTop:4}}>Cần nhập thông tin</div>}
                {userRole === 'supplier' && (
                  <small className="text-info mt-1 d-block">
                    <i className="fas fa-clock mr-1"></i>
                    Tour của bạn sẽ được gửi để admin duyệt
                  </small>
                )}
              </div>
              <button className="btn btn-primary btn-block" type="submit" form="add-tour-form">Xuất bản</button>
            </div>
          </div>
          <div className="card">
            <div className="card-header font-weight-bold">Danh mục</div>
            <div className="card-body" style={{ maxHeight: 500, overflowY: 'auto' }}>
              {/* <div className="form-group mb-2">
                <label className="font-weight-bold">Tỉnh/Thành</label>
                <input type="text" className="form-control" name="province" value={form.province} onChange={handleFormChange} />
              </div> */}
              <div className="form-group mb-2">
                <label className="font-weight-bold">Danh mục</label>
                <select className="form-control" name="cateID.name" value={form.cateID.name} onChange={handleFormChange} required>
                  <option value="">-- Chọn danh mục --</option>
                  {categories.map((cate, idx) => (
                    <option key={`category-${cate._id}-${idx}`} value={cate.name}>{cate.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group mb-2">
                <label className="font-weight-bold">
                  Nhà cung cấp
                  {userRole === 'supplier' && (
                    <small className="text-muted ml-2">
                      <i className="fas fa-info-circle mr-1"></i>
                      Tự động chọn tên nhà cung cấp của bạn
                    </small>
                  )}
                </label>
                <select 
                  className="form-control" 
                  name="supplier_id" 
                  value={form.supplier_id || ''} 
                  onChange={handleFormChange} 
                  required
                  disabled={userRole === 'supplier'}
                >
                  {userRole === 'supplier' ? (
                    // Nếu là supplier, chỉ hiển thị tên của supplier hiện tại
                    suppliers.filter(sup => sup._id === currentUser?._id).map((sup, idx) => (
                      <option key={`current-supplier-${sup._id}-${idx}`} value={sup._id}>
                        {sup.name}
                      </option>
                    ))
                  ) : (
                    // Nếu là admin, hiển thị tất cả supplier với option mặc định
                    <>
                      <option value="">-- Chọn nhà cung cấp --</option>
                      {suppliers.map((sup, idx) => (
                        <option key={`all-supplier-${sup._id}-${idx}`} value={sup._id}>
                          {sup.name}
                        </option>
                      ))}
                    </>
                  )}
                </select>
                {userRole === 'supplier' && (
                  <small className="text-info mt-1 d-block">
                    <i className="fas fa-lock mr-1"></i>
                    Chỉ có thể tạo tour với tên nhà cung cấp của bạn
                  </small>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default AddTour;
