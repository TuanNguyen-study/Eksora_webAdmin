import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '', // Giá vé
    price_child: '', // Giá trẻ em
    max_tickets_per_day: '', // Số lượng vé tối đa trong ngày
    image: [], // Change from [''] to [] to avoid empty string
    location: '',
    lat: '',
    lng: '',
    rating: '',
    cateID: { name: '', image: '' },
    supplier_id: '',
    // province: '',
    opening_time: '',
    closing_time: '',
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
        console.log('=== FETCHING USER INFO FOR ADDTOUR ===');
        const [role, userProfile] = await Promise.all([
          getCurrentUserRole(),
          getUser()
        ]);
        console.log('User Role:', role);
        console.log('User Profile:', userProfile);
        
        setUserRole(role);
        setCurrentUser(userProfile);
        
        // Nếu là supplier, tự động set supplier_id và status trong form
        if (role === 'supplier' && userProfile && userProfile._id) {
          console.log('Setting supplier form defaults:', {
            supplier_id: userProfile._id,
            status: 'requested'
          });
          
          setForm(prevForm => ({
            ...prevForm,
            supplier_id: userProfile._id,
            status: 'requested' // Tự động set trạng thái requested cho supplier
          }));
        }
        console.log('=====================================');
      } catch (error) {
        console.error('Error fetching user info:', error);
      }
    }
    
    fetchUserInfo();
    getCategories().then(setCategories).catch(() => setCategories([]));
    getSuppliers().then((suppliers) => {
      console.log('Suppliers loaded:', suppliers);
      console.log('Sample supplier data:', suppliers[0]);
      if (suppliers.length > 0) {
        console.log('Supplier fields available:', Object.keys(suppliers[0]));
      }
      setSuppliers(suppliers);
    }).catch(() => setSuppliers([]));
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
      } else if (name === 'max_tickets_per_day') {
        // Chỉ cho phép số nguyên dương cho số lượng vé
        const numericValue = value.replace(/\D/g, '');
        setForm({ ...form, [name]: numericValue });
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

  const handleServiceOptionChange = (serviceIdx, optionIdx, field, value) => {
    const newServices = [...form.services];
    if (field === 'price_extra') {
      newServices[serviceIdx].options[optionIdx][field] = Number(value) || 0;
    } else {
      newServices[serviceIdx].options[optionIdx][field] = value;
    }
    setForm({ ...form, services: newServices });
  };

  const handleAddService = () => {
    const newService = {
      id: Date.now(), // Generate ID only once when creating
      name: '',
      type: 'single', // Default to single
      options: [{ 
        id: Date.now() + 1, 
        title: '',
        price_extra: 0,
        description: ''
      }]
    };
    
    setForm({
      ...form,
      services: [...form.services, newService],
    });
  };

  const handleRemoveService = (idx) => {
    const newServices = form.services.filter((_, i) => i !== idx);
    setForm({ ...form, services: newServices });
  };

  const handleAddOption = (serviceIdx) => {
    const newServices = [...form.services];
    const newOption = {
      id: Date.now() + Math.random(), // Ensure unique ID
      title: '',
      price_extra: 0,
      description: ''
    };
    newServices[serviceIdx].options.push(newOption);
    setForm({ ...form, services: newServices });
  };

  const handleRemoveOption = (serviceIdx, optionIdx) => {
    const newServices = [...form.services];
    newServices[serviceIdx].options = newServices[serviceIdx].options.filter((_, i) => i !== optionIdx);
    setForm({ ...form, services: newServices });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    console.log('=== FORM SUBMIT DEBUG ===');
    console.log('Current form state:', form);
    console.log('User role:', userRole);
    console.log('Current user:', currentUser);
    console.log('=========================');
    
    // Kiểm tra các trường bắt buộc (đã loại bỏ province)
    const requiredFields = [
      { name: 'name', value: form.name },
      { name: 'description', value: form.description },
      { name: 'price', value: form.price },
      { name: 'price_child', value: form.price_child },
      { name: 'max_tickets_per_day', value: form.max_tickets_per_day },
      { name: 'location', value: form.location },
      { name: 'cateID.name', value: form.cateID.name },
      { name: 'image', value: form.image && form.image.length > 0 && form.image[0] },
      { name: 'opening_time', value: form.opening_time },
      { name: 'closing_time', value: form.closing_time },
      { name: 'status', value: form.status },
    ];

    // Luôn kiểm tra supplier_id, ngay cả với supplier (để đảm bảo có giá trị)
    requiredFields.push({ name: 'supplier_id', value: form.supplier_id });
    
    const missing = {};
    requiredFields.forEach(f => {
      if (!f.value || (typeof f.value === 'string' && !f.value.trim())) {
        missing[f.name] = true;
        console.log('Missing field:', f.name, 'Value:', f.value);
      }
    });
    
    setMissingFields(missing);
    if (Object.keys(missing).length > 0) {
      console.log('Missing fields detected:', missing);
      // Focus first missing field
      const first = requiredFields.find(f => missing[f.name]);
      if (first && document.getElementsByName(first.name)[0]) {
        document.getElementsByName(first.name)[0].focus();
      }
      return;
    }
    
    // Validate services với structure mới
    console.log('=== VALIDATING SERVICES ===');
    for (const [i, s] of form.services.entries()) {
      console.log(`Validating service ${i + 1}:`, s);
      
      if (!s.name.trim()) {
        alert(`Vui lòng nhập tên cho dịch vụ thứ ${i + 1}`);
        return;
      }
      if (!s.type.trim()) {
        alert(`Vui lòng chọn loại cho dịch vụ thứ ${i + 1}`);
        return;
      }
      if (!s.options.length) {
        alert(`Vui lòng thêm ít nhất một tùy chọn cho dịch vụ thứ ${i + 1}`);
        return;
      }
      
      // Validate options structure
      for (const [j, opt] of s.options.entries()) {
        if (!opt.title || !opt.title.trim()) {
          alert(`Vui lòng nhập tên cho tùy chọn ${j + 1} của dịch vụ ${i + 1}`);
          return;
        }
        if (opt.price_extra && isNaN(Number(opt.price_extra))) {
          alert(`Giá thêm cho tùy chọn ${j + 1} của dịch vụ ${i + 1} phải là số`);
          return;
        }
      }
    }
    console.log('Services validation completed successfully');
    console.log('===========================');
    
    try {
      // Kiểm tra xem có phải supplier và có supplier_id hợp lệ không
      if (userRole === 'supplier') {
        if (!currentUser || !currentUser._id) {
          alert('Lỗi: Không thể xác định thông tin supplier. Vui lòng đăng nhập lại.');
          return;
        }
        // Đảm bảo supplier_id trong form khớp với user hiện tại
        if (form.supplier_id !== currentUser._id) {
          console.log('Correcting supplier_id mismatch:', {
            formSupplierId: form.supplier_id,
            currentUserId: currentUser._id
          });
          setForm(prev => ({ ...prev, supplier_id: currentUser._id }));
        }
      }
      
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
      
      // Đối với supplier, sử dụng ID của user hiện tại
      if (userRole === 'supplier' && currentUser) {
        supplier_id = currentUser._id;
      }
      
      console.log('Final IDs:', {
        cateID,
        supplier_id,
        userRole,
        currentUserRole: userRole
      });
      
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
      const max_tickets_per_day = Number(form.max_tickets_per_day);
      
      // Validate prices
      if (isNaN(price) || price <= 0) {
        alert('Giá vé không hợp lệ!');
        return;
      }
      if (isNaN(price_child) || price_child <= 0) {
        alert('Giá trẻ em không hợp lệ!');
        return;
      }
      if (isNaN(max_tickets_per_day) || max_tickets_per_day <= 0) {
        alert('Số lượng vé tối đa trong ngày phải là số nguyên dương!');
        return;
      }
      
      // Định dạng lại services theo đúng API structure
      const services = form.services.length > 0 ? form.services.map(s => ({
        name: s.name,
        type: s.type,
        options: s.options.map(opt => ({
          title: opt.title || '',
          price_extra: Number(opt.price_extra) || 0,
          description: opt.description || ''
        }))
      })) : []; // Fallback to empty array if no services
      
      // Prepare final data with careful validation
      const tourData = {
        name: form.name.trim(),
        description: form.description.trim(),
        price,
        price_child,
        max_tickets_per_day,
        location: form.location.trim(),
        lat: form.lat ? parseFloat(form.lat) : 0,
        lng: form.lng ? parseFloat(form.lng) : 0,
        rating: form.rating || 0,
        cateID,
        supplier_id,
        opening_time: form.opening_time,
        closing_time: form.closing_time,
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
        { field: 'max_tickets_per_day', value: tourData.max_tickets_per_day },
        { field: 'location', value: tourData.location },
        { field: 'cateID', value: tourData.cateID },
        { field: 'supplier_id', value: tourData.supplier_id },
        { field: 'opening_time', value: tourData.opening_time },
        { field: 'closing_time', value: tourData.closing_time },
        { field: 'status', value: tourData.status },
        { field: 'image', value: tourData.image }
      ];
      
      console.log('=== TIME FIELDS DEBUG ===');
      console.log('Form opening_time:', form.opening_time, 'Type:', typeof form.opening_time);
      console.log('Form closing_time:', form.closing_time, 'Type:', typeof form.closing_time);
      console.log('Opening time empty?:', !form.opening_time);
      console.log('Closing time empty?:', !form.closing_time);
      console.log('TourData opening_time:', tourData.opening_time, 'Type:', typeof tourData.opening_time);
      console.log('TourData closing_time:', tourData.closing_time, 'Type:', typeof tourData.closing_time);
      console.log('============================');
      
      for (const check of requiredChecks) {
        if (!check.value || (Array.isArray(check.value) && check.value.length === 0)) {
          console.error(`Missing required field: ${check.field}`, check.value);
          alert(`Trường bắt buộc bị thiếu: ${check.field}`);
          return;
        }
      }
      
      console.log('Final tour data being sent:', tourData);
      console.log('User role for API call:', userRole);
      
      // Debug: Log individual fields to check for issues
      console.log('=== DETAILED TOUR DATA DEBUG ===');
      console.log('Name:', tourData.name, 'Type:', typeof tourData.name);
      console.log('Description length:', tourData.description?.length);
      console.log('Price:', tourData.price, 'Type:', typeof tourData.price);
      console.log('Price child:', tourData.price_child, 'Type:', typeof tourData.price_child);
      console.log('Max tickets per day:', tourData.max_tickets_per_day, 'Type:', typeof tourData.max_tickets_per_day);
      console.log('Location:', tourData.location, 'Type:', typeof tourData.location);
      console.log('Category ID:', tourData.cateID, 'Type:', typeof tourData.cateID);
      console.log('Supplier ID:', tourData.supplier_id, 'Type:', typeof tourData.supplier_id);
      console.log('Opening time:', tourData.opening_time);
      console.log('Closing time:', tourData.closing_time);
      console.log('Status:', tourData.status);
      console.log('Services count:', tourData.services?.length);
      if (tourData.services?.length > 0) {
        console.log('Services structure:');
        tourData.services.forEach((service, idx) => {
          console.log(`  Service ${idx + 1}:`, {
            name: service.name,
            type: service.type,
            optionsCount: service.options?.length
          });
          service.options?.forEach((option, optIdx) => {
            console.log(`    Option ${optIdx + 1}:`, {
              title: option.title,
              price_extra: option.price_extra,
              description: option.description
            });
          });
        });
      }
      console.log('Images count:', tourData.image?.length);
      if (tourData.image?.length > 0) {
        console.log('First image preview:', tourData.image[0].substring(0, 100) + '...');
      }
      console.log('===============================');
      
      // Gửi dữ liệu chuẩn hóa với userRole để chọn đúng endpoint
      await createTour(tourData, userRole);
      setMissingFields({});
      alert('Thêm tour thành công!');
      
      // Redirect to tours page and force refresh
      navigate('/tours');
      window.location.reload();
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
                <small className="text-muted ml-3">
                  <i className="fas fa-info-circle mr-1"></i>
                  Ví dụ: Lưu trú (single), Hướng dẫn viên (multiple)
                </small>
              </div>
              {form.services.length === 0 && (
                <div className="alert alert-info">
                  <strong>Hướng dẫn:</strong> Dịch vụ đi kèm giúp khách hàng tùy chọn thêm các tiện ích cho tour.
                  <br />
                  <strong>Single:</strong> Khách chỉ chọn được 1 tùy chọn (ví dụ: loại phòng khách sạn)
                  <br />
                  <strong>Multiple:</strong> Khách có thể chọn nhiều tùy chọn (ví dụ: hướng dẫn viên + bữa ăn)
                </div>
              )}
              {form.services.map((service, sIdx) => (
                <div key={service.id || `service-${sIdx}`} className="border rounded p-3 mb-3 bg-light position-relative">
                  <button type="button" className="btn btn-danger btn-sm position-absolute" style={{ top: 8, right: 8 }} onClick={() => handleRemoveService(sIdx)}>
                    Xóa
                  </button>
                  <div className="form-row">
                    <div className="form-group col-md-6">
                      <label>Tên dịch vụ</label>
                      <input type="text" className="form-control" value={service.name} onChange={e => handleServiceChange(sIdx, 'name', e.target.value)} placeholder="Ví dụ: Lưu trú" required />
                    </div>
                    <div className="form-group col-md-6">
                      <label>Loại dịch vụ</label>
                      <select className="form-control" value={service.type} onChange={e => handleServiceChange(sIdx, 'type', e.target.value)} required>
                        <option value="">-- Chọn loại --</option>
                        <option value="single">Chọn một (single)</option>
                        <option value="multiple">Chọn nhiều (multiple)</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label>Tùy chọn dịch vụ</label>
                    {service.options.map((opt, oIdx) => (
                      <div key={opt.id || `option-${sIdx}-${oIdx}`} className="border rounded p-2 mb-2 bg-white">
                        <div className="form-row">
                          <div className="form-group col-md-4">
                            <label className="small">Tên tùy chọn</label>
                            <input 
                              type="text" 
                              className="form-control form-control-sm" 
                              value={opt.title || ''} 
                              onChange={e => handleServiceOptionChange(sIdx, oIdx, 'title', e.target.value)} 
                              placeholder="Ví dụ: Khách sạn khu vực Phố cổ" 
                              required 
                            />
                          </div>
                          <div className="form-group col-md-3">
                            <label className="small">Giá thêm (VNĐ)</label>
                            <input 
                              type="text" 
                              className="form-control form-control-sm" 
                              value={opt.price_extra ? opt.price_extra.toLocaleString('vi-VN') : '0'} 
                              onChange={(e) => {
                                // Remove all dots and convert to number
                                const numericValue = parseInt(e.target.value.replace(/\./g, '')) || 0;
                                handleServiceOptionChange(sIdx, oIdx, 'price_extra', numericValue);
                              }}
                              onBlur={(e) => {
                                // Format number on blur
                                const numericValue = parseInt(e.target.value.replace(/\./g, '')) || 0;
                                handleServiceOptionChange(sIdx, oIdx, 'price_extra', numericValue);
                              }}
                              placeholder="0" 
                            />
                          </div>
                          <div className="form-group col-md-4">
                            <label className="small">Mô tả</label>
                            <input 
                              type="text" 
                              className="form-control form-control-sm" 
                              value={opt.description || ''} 
                              onChange={e => handleServiceOptionChange(sIdx, oIdx, 'description', e.target.value)} 
                              placeholder="Mô tả ngắn" 
                            />
                          </div>
                          <div className="form-group col-md-1 d-flex align-items-end">
                            <div className="btn-group-vertical btn-group-sm">
                              <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => handleRemoveOption(sIdx, oIdx)} disabled={service.options.length === 1}>
                                <i className="fas fa-trash"></i>
                              </button>
                              <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => handleAddOption(sIdx)}>
                                <i className="fas fa-plus"></i>
                              </button>
                            </div>
                          </div>
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
                  <div className="input-group-append"><span className="input-group-text">VNĐ</span></div>
                </div>
                {missingFields.price && <div style={{color:'red', fontSize:13, marginTop:4}}>Cần nhập thông tin</div>}
              </div>
              <div className="form-group col-md-6">
                <label>Giá trẻ em</label>
                <div className="input-group">
                  <input type="text" className="form-control bg-light" name="price_child" value={form.price_child} onChange={handleFormChange} required inputMode="numeric" pattern="[0-9.]*" />
                  <div className="input-group-append"><span className="input-group-text">VNĐ</span></div>
                </div>
                {missingFields.price_child && <div style={{color:'red', fontSize:13, marginTop:4}}>Cần nhập thông tin</div>}
              </div>
            </div>
            <div className="row">
              <div className="form-group col-md-6">
                <label>Số lượng vé tối đa trong ngày</label>
                <div className="input-group">
                  <input 
                    type="number" 
                    className="form-control bg-light" 
                    name="max_tickets_per_day" 
                    value={form.max_tickets_per_day} 
                    onChange={handleFormChange} 
                    required 
                    min="1"
                    step="1"
                    placeholder="Nhập số lượng vé tối đa"
                  />
                  <div className="input-group-append"><span className="input-group-text">vé</span></div>
                </div>
                {missingFields.max_tickets_per_day && <div style={{color:'red', fontSize:13, marginTop:4}}>Cần nhập thông tin</div>}
                <small className="text-muted">Số lượng vé tối đa có thể bán trong một ngày</small>
              </div>
            </div>
            <div className="row">
              <div className="form-group col-md-6">
                <label>Giờ mở cửa</label>
                <input type="time" className="form-control bg-light" name="opening_time" value={form.opening_time || ''} onChange={handleFormChange} required />
                {missingFields.opening_time && <div style={{color:'red', fontSize:13, marginTop:4}}>Cần nhập thông tin</div>}
                <small className="text-muted">Nhập giờ mở cửa của tour</small>
              </div>
              <div className="form-group col-md-6">
                <label>Giờ đóng cửa</label>
                <input type="time" className="form-control bg-light" name="closing_time" value={form.closing_time || ''} onChange={handleFormChange} required />
                {missingFields.closing_time && <div style={{color:'red', fontSize:13, marginTop:4}}>Cần nhập thông tin</div>}
                <small className="text-muted">Nhập giờ đóng cửa của tour</small>
              </div>
            </div>
            
            <div className="form-group">
              <label>Ảnh (chọn nhiều ảnh)</label>
              <input type="file" className="form-control-file" accept="image/*" multiple onChange={handleImageUpload} />
              {missingFields.image && <div style={{color:'red', fontSize:13, marginTop:4}}>Cần nhập thông tin</div>}
              <div className="d-flex flex-wrap mt-2">
                {form.image && form.image.map((img, idx) => (
                  <img key={`preview-img-${idx}`} src={img} alt="tour" style={{ width: 60, height: 40, objectFit: 'cover', marginRight: 8, marginBottom: 8 }} />
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
                    // Nếu là supplier, hiển thị tên của supplier hiện tại
                    <>
                      {currentUser && (currentUser.first_name || currentUser.name) ? (
                        <option value={currentUser._id}>
                          {currentUser.first_name || currentUser.name} (Bạn)
                        </option>
                      ) : (
                        <option value="">Đang tải thông tin supplier...</option>
                      )}
                    </>
                  ) : (
                    // Nếu là admin, hiển thị tất cả supplier với option mặc định
                    <>
                      <option value="">-- Chọn nhà cung cấp --</option>
                      {suppliers.map((sup, idx) => (
                        <option key={`all-supplier-${sup._id}-${idx}`} value={sup._id}>
                          {sup.first_name || sup.name || sup.email || `Supplier ${idx + 1}`}
                        </option>
                      ))}
                    </>
                  )}
                </select>
                {missingFields.supplier_id && <div style={{color:'red', fontSize:13, marginTop:4}}>Cần nhập thông tin</div>}
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
