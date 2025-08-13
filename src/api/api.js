import axios from 'axios';
import { launchErrorToast } from '../components/ErrorToast';
import { launchSuccessToast } from '../components/SuccessToast';

const AxiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor để tự động thêm token vào header
AxiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor để xử lý response errors
AxiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token hết hạn hoặc không hợp lệ
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      localStorage.removeItem('isLoggedIn');
      sessionStorage.removeItem('isLoggedIn');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API tạo booking mới
export const createBooking = async (bookingData) => {
  try {
    const response = await AxiosInstance.post('/api/bookings', bookingData);
    return response.data;
  } catch (error) {
    throw error;
  }
}
// ...existing code...

// API lấy danh sách ưu đãi
export const getOffers = async () => {
  try {
    const response = await AxiosInstance.get('/offers');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch offers');
  }
};

// API lấy danh sách categories
export const getCategories = async () => {
  try {
    const response = await AxiosInstance.get('/api/categories');
    return response.data;
  } catch (error) {
    throw error;
  }
};

// API lấy danh sách các tour
export const getTours = async () => {
  try {
    // Thêm query parameter để populate supplier và category data
    const response = await AxiosInstance.get('/api/tours?populate=supplier_id,cateID');
    
    // Debug supplier data in each tour (commented for performance)
    /*
    if (Array.isArray(response.data)) {
      console.log('=== SUPPLIER DATA AUDIT IN TOURS ===');
      response.data.forEach((tour, index) => {
        console.log(`Tour ${index + 1}:`, {
          tourId: tour._id,
          name: tour.name,
          supplier_id_raw: tour.supplier_id,
          supplier_type: typeof tour.supplier_id,
          supplier_is_object: tour.supplier_id && typeof tour.supplier_id === 'object',
          supplier_keys: tour.supplier_id && typeof tour.supplier_id === 'object' ? Object.keys(tour.supplier_id) : null,
          supplier_details: tour.supplier_id && typeof tour.supplier_id === 'object' ? {
            id: tour.supplier_id._id || tour.supplier_id.id,
            email: tour.supplier_id.email,
            first_name: tour.supplier_id.first_name,
            last_name: tour.supplier_id.last_name,
            role: tour.supplier_id.role
          } : 'NOT_POPULATED_OR_STRING_ID'
        });
      });
      console.log('====================================');
    }
    */
    
    return response.data;
  } catch (error) {
    throw error;
  }
};

// API lấy tours của supplier hiện tại
export const getSupplierTours = async () => {
  try {
    console.log('Getting supplier tours...');
    // Thêm populate để lấy đầy đủ thông tin supplier và category
    const response = await AxiosInstance.get('/api/tours-by-supplier?populate=supplier_id,cateID');
    console.log('=== SUPPLIER TOURS API RESPONSE ===');
    console.log('Supplier tours response:', response.data);
    
    if (Array.isArray(response.data)) {
      console.log('Supplier tours count:', response.data.length);
      response.data.forEach((tour, index) => {
        console.log(`Supplier Tour ${index + 1}:`, {
          name: tour.name,
          id: tour._id,
          supplier_id: tour.supplier_id,
          supplier_details: tour.supplier_id ? {
            id: tour.supplier_id._id,
            email: tour.supplier_id.email,
            first_name: tour.supplier_id.first_name,
            last_name: tour.supplier_id.last_name
          } : 'NO SUPPLIER DATA'
        });
      });
    }
    console.log('===================================');
    
    return response.data;
  } catch (error) {
    throw error;
  }
};

// API test để debug supplier tours
export const debugSupplierTours = async () => {
  try {
    console.log('=== DEBUG SUPPLIER TOURS ===');
    
    // Get current user
    const userProfile = await getUser();
    const userRole = await getCurrentUserRole();
    console.log('Current user:', userProfile);
    console.log('Current role:', userRole);
    
    // Get all tours
    const allTours = await getTours();
    console.log('Total tours in system:', allTours?.length);
    
    // Log first tour structure in detail
    if (allTours.length > 0) {
      console.log('=== SAMPLE TOUR STRUCTURE ===');
      const sampleTour = allTours[0];
      console.log('Sample Tour Full Object:', sampleTour);
      console.log('Sample Tour Keys:', Object.keys(sampleTour));
      console.log('Sample Tour supplier_id:', sampleTour.supplier_id);
      console.log('Sample Tour supplierId:', sampleTour.supplierId);
      console.log('Sample Tour created_by:', sampleTour.created_by);
      console.log('Sample Tour createdBy:', sampleTour.createdBy);
      console.log('Sample Tour author:', sampleTour.author);
      console.log('Sample Tour user_id:', sampleTour.user_id);
      console.log('=============================');
    }
    
    // Check tours by all possible supplier fields
    console.log('Checking each tour for supplier match:');
    allTours.slice(0, 10).forEach((tour, index) => {
      const tourSupplierId = typeof tour.supplier_id === 'object' ? tour.supplier_id?._id : tour.supplier_id;
      console.log(`Tour ${index + 1}:`, {
        id: tour._id,
        name: tour.name,
        supplier_id_raw: tour.supplier_id,
        supplier_id_extracted: tourSupplierId,
        supplier_id_type: typeof tour.supplier_id,
        supplierId: tour.supplierId,
        created_by: tour.created_by,
        createdBy: tour.createdBy,
        author: tour.author,
        user_id: tour.user_id,
        current_user_id: userProfile._id,
        matches: {
          supplier_id: tourSupplierId === userProfile._id,
          supplierId: tour.supplierId === userProfile._id,
          created_by: tour.created_by === userProfile._id,
          createdBy: tour.createdBy === userProfile._id,
          author: tour.author === userProfile._id,
          user_id: tour.user_id === userProfile._id
        },
        status: tour.status
      });
    });
    
    // Filter for current supplier using all possible fields
    const myTours = allTours.filter(tour => {
      const tourSupplierId = typeof tour.supplier_id === 'object' ? tour.supplier_id?._id : tour.supplier_id;
      return tourSupplierId === userProfile._id || 
             tour.supplierId === userProfile._id ||
             tour.created_by === userProfile._id ||
             tour.createdBy === userProfile._id ||
             tour.author === userProfile._id ||
             tour.user_id === userProfile._id;
    });
    
    console.log('My tours count:', myTours.length);
    console.log('My tours:', myTours);
    console.log('===========================');
    
    return {
      userProfile,
      userRole,
      allTours: allTours.length,
      myTours: myTours.length,
      myToursData: myTours
    };
  } catch (error) {
    throw error;
  }
};

// API lấy tours theo role (admin: tours requested, supplier: tours của mình)
export const getToursByRole = async () => {
  try {
    const [userRole, userProfile] = await Promise.all([
      getCurrentUserRole(),
      getUser()
    ]);
    
    console.log('=== GET TOURS BY ROLE DEBUG ===');
    console.log('User Role:', userRole);
    console.log('User Profile:', userProfile);
    console.log('User ID:', userProfile?._id);
    
    if (userRole === 'admin') {
      // Admin thấy tất cả tours (bao gồm cả đã duyệt và chờ duyệt)
      const allTours = await getTours();
      console.log('Admin role - returning all tours:', allTours?.length);
      
      // Populate supplier data for admin tours
      try {
        const allSuppliers = await getSuppliers();
        const toursWithSuppliers = allTours.map(tour => {
          if (typeof tour.supplier_id === 'string') {
            const matchedSupplier = allSuppliers.find(sup => 
              (sup.id && sup.id === tour.supplier_id) || 
              (sup._id && sup._id === tour.supplier_id)
            );
            if (matchedSupplier) {
              return { ...tour, supplier_id: matchedSupplier };
            }
          }
          return tour;
        });
        console.log('Populated supplier data for admin tours');
        return toursWithSuppliers;
      } catch (supplierError) {
        console.warn('Could not populate supplier data for admin tours:', supplierError);
        return allTours;
      }
    } else if (userRole === 'supplier') {
      // Try to get supplier-specific tours first
      try {
        console.log('Trying supplier-specific endpoint...');
        const supplierTours = await getSupplierTours();
        console.log('Found supplier tours via specific endpoint:', supplierTours?.length);
        return supplierTours;
      } catch (supplierEndpointError) {
        console.log('Supplier-specific endpoint failed, falling back to filtering all tours');
        console.log('Supplier endpoint error:', supplierEndpointError.response?.status, supplierEndpointError.message);
        
        // Fallback: get all tours and filter by supplier
        const allTours = await getTours();
        console.log('All Tours Count:', allTours?.length);
        console.log('Current User ID for filtering:', userProfile._id);
        
        const supplierTours = allTours.filter(tour => {
          // Kiểm tra tất cả các trường có thể chứa supplier ID
          const tourSupplierId = typeof tour.supplier_id === 'object' ? tour.supplier_id?._id : tour.supplier_id;
          const tourSupplierId2 = tour.supplierId; // Có thể có trường này
          const tourCreatedBy = tour.created_by; // Có thể có trường này
          const userSupplierId = userProfile._id;
          
          console.log('Filtering tour:', {
            tourId: tour._id,
            tourName: tour.name,
            tourSupplierId: tourSupplierId,
            tourSupplierId2: tourSupplierId2,
            tourCreatedBy: tourCreatedBy,
            userSupplierId: userSupplierId,
            tourSupplierType: typeof tour.supplier_id,
            tourSupplierFull: tour.supplier_id,
            allTourKeys: Object.keys(tour),
            match: tourSupplierId === userSupplierId || tourSupplierId2 === userSupplierId || tourCreatedBy === userSupplierId
          });
          
          // Kiểm tra multiple fields để match
          return tourSupplierId === userSupplierId || 
                 tourSupplierId2 === userSupplierId || 
                 tourCreatedBy === userSupplierId;
        });
        
        console.log('=== FILTERING RESULTS ===');
        console.log('Total tours:', allTours?.length);
        console.log('Supplier tours found:', supplierTours?.length);
        console.log('Supplier tours list:', supplierTours.map(t => ({ id: t._id, name: t.name, supplier_id: t.supplier_id })));
        console.log('========================');
        
        // Populate supplier data for supplier tours
        try {
          const allSuppliers = await getSuppliers();
          const toursWithSuppliers = supplierTours.map(tour => {
            if (typeof tour.supplier_id === 'string') {
              const matchedSupplier = allSuppliers.find(sup => 
                (sup.id && sup.id === tour.supplier_id) || 
                (sup._id && sup._id === tour.supplier_id)
              );
              if (matchedSupplier) {
                return { ...tour, supplier_id: matchedSupplier };
              }
            }
            return tour;
          });
          console.log('Populated supplier data for supplier tours');
          return toursWithSuppliers;
        } catch (supplierError) {
          console.warn('Could not populate supplier data for supplier tours:', supplierError);
          return supplierTours;
        }
      }
    } else {
      // Role khác (nếu có) thì thấy tất cả
      const allTours = await getTours();
      console.log('Other role - returning all tours:', allTours?.length);
      
      // Populate supplier data for other roles
      try {
        const allSuppliers = await getSuppliers();
        const toursWithSuppliers = allTours.map(tour => {
          if (typeof tour.supplier_id === 'string') {
            const matchedSupplier = allSuppliers.find(sup => 
              (sup.id && sup.id === tour.supplier_id) || 
              (sup._id && sup._id === tour.supplier_id)
            );
            if (matchedSupplier) {
              return { ...tour, supplier_id: matchedSupplier };
            }
          }
          return tour;
        });
        console.log('Populated supplier data for other role tours');
        return toursWithSuppliers;
      } catch (supplierError) {
        console.warn('Could not populate supplier data for other role tours:', supplierError);
        return allTours;
      }
    }
  } catch (error) {
    throw error;
  }
};

// API lấy danh sách các tour theo category ID
export const getToursByLocation = async (cateID) => {
  try {
    const response = await AxiosInstance.get('/api/categories/tours-by-location', {
      params: { cateID },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// API lấy danh sách chuyến đi
export const getTrips = async (userId) => {
  try {
    const response = await AxiosInstance.get(`/api/bookings/user/${userId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// API lấy danh sách yêu thích
export const getFavorites = async (user_id) => {
  try {
    const response = await AxiosInstance.get(`/api/favorites/${user_id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deleteFavorites = async (ids) => {
  try {
    const response = await AxiosInstance.delete(`/api/favorites`, {
      data: { ids },
    });
    return response.data;
  } catch (error) {
    console.error('Lỗi khi xoá favorites:', error);
    throw error;
  }
};

export const addFavorites = async (userId, tourId) => {
  try {
    const response = await AxiosInstance.post(`/api/favorites`, {
      user_id: userId,
      tour_id: tourId,
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const toggleFavorite = async (userId, tourId, isFavorite) => {
  try {
    if (isFavorite) {
      await deleteFavorites([tourId]);
      return { removed: true };
    } else {
      await addFavorites(userId, tourId);
      return { added: true };
    }
  } catch (err) {
    console.error('Lỗi toggleFavorite:', err);
    throw err;
  }
};

// API lấy danh sách Promotion
export const getPromotion = async () => {
  try {
    const response = await AxiosInstance.get('/api/vouchers');
    const data = response.data;
    
    // Đảm bảo luôn trả về một array
    if (Array.isArray(data)) {
      return data;
    } else if (data && typeof data === 'object') {
      // Nếu data là object, tìm array trong các properties
      const arrayValue = Object.values(data).find(value => Array.isArray(value));
      return arrayValue || [];
    }
    return [];
  } catch (error) {
    throw error;
  }
};

// API hiển thị user
export const getUser = async () => {
  try {
    const response = await AxiosInstance.get(`/api/profile`);
    if (response && response.data) {
      return response.data;
    } else {
      throw new Error('Dữ liệu trả về không hợp lệ');
    }
  } catch (error) {
    throw error;
  }
};

// API kiểm tra role của user hiện tại
export const getCurrentUserRole = async () => {
  try {
    const response = await AxiosInstance.get('/api/profile');
    return response.data?.role || null;
  } catch (error) {
    throw error;
  }
};

// API lấy danh sách điểm đến
export const getDestinations = async () => {
  try {
    const response = await AxiosInstance.get('/destinations');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch destinations');
  }
};

// API tìm kiếm vé
export const searchTickets = async (params) => {
  try {
    const response = await AxiosInstance.get('/tickets', { params });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to search tickets');
  }
};

// API lấy chi tiết tour
export const fetchTourDetail = async (tourId) => {
  if (!tourId) throw new Error('Tour ID không được cung cấp.');
  try {
    const response = await AxiosInstance.get(`/api/tours/${tourId}`);
    return response.data;
  } catch (err) {
    console.error(`Lỗi khi lấy chi tiết tour:`, err.response || err);
    if (err.response?.status === 404) {
      throw new Error('Không tìm thấy tour với ID đã cho.');
    }
    throw new Error('Không thể kết nối đến server hoặc đã có lỗi xảy ra.');
  }
};

// API lấy tất cả thông tin người dùng
export const getAllUsers = async () => {
  try {
    const response = await AxiosInstance.get('/api/all');
    return response.data;
  } catch (error) {
    throw error;
  }
};

// API lấy tất cả booking của hệ thống (dùng cho View Profile User, lọc theo user_id)
export const getAllBookings = async () => {
  try {
    const response = await AxiosInstance.get('/api/bookings/all');
    let arr = [];
    if (Array.isArray(response.data)) {
      arr = response.data;
    } else if (response.data && Array.isArray(response.data.bookings)) {
      arr = response.data.bookings;
    } else if (response.data && Array.isArray(response.data.data)) {
      arr = response.data.data;
    }
    // Nếu mỗi phần tử là { booking, selected_options }
    if (arr.length && arr[0].booking) {
      return arr.map(item => ({
        ...item.booking,
        selected_options: item.selected_options || []
      }));
    }
    return arr;
  } catch (error) {
    throw error;
  }
};

// API lấy booking theo ngày (dành cho Calendar)
export const getBookingsByDate = async (date) => {
  try {
    // Sử dụng getAllBookings vì không có API by-date
    const allBookings = await getAllBookings();
    const targetDate = new Date(date).toDateString();
    
    return allBookings.filter(booking => {
      if (booking.booking_date) {
        return new Date(booking.booking_date).toDateString() === targetDate;
      }
      return false;
    });
  } catch (error) {
    throw error;
  }
};

// API lấy thống kê booking theo tháng (dành cho Calendar view)
export const getBookingCalendarData = async (year, month) => {
  try {
    // Sử dụng getAllBookings vì không có API calendar-stats
    const allBookings = await getAllBookings();
    const calendarData = {};
    
    allBookings.forEach(booking => {
      if (booking.booking_date) {
        const bookingDate = new Date(booking.booking_date);
        const bookingYear = bookingDate.getFullYear();
        const bookingMonth = bookingDate.getMonth() + 1;
        
        if (bookingYear === year && bookingMonth === month) {
          const dateKey = bookingDate.toISOString().split('T')[0];
          if (!calendarData[dateKey]) {
            calendarData[dateKey] = {
              date: dateKey,
              tours: [],
              totalBookings: 0,
              totalGuests: 0
            };
          }
          
          // Find or add tour
          let tourEntry = calendarData[dateKey].tours.find(t => 
            t.tourId === (booking.tour_id?._id || booking.tour_id)
          );
          
          if (!tourEntry) {
            tourEntry = {
              tourId: booking.tour_id?._id || booking.tour_id,
              tourName: booking.tour_id?.name || 'Tour không xác định',
              bookings: 0,
              guests: 0
            };
            calendarData[dateKey].tours.push(tourEntry);
          }
          
          tourEntry.bookings += 1;
          tourEntry.guests += (booking.quantity_nguoiLon || 0) + (booking.quantity_treEm || 0);
          calendarData[dateKey].totalBookings += 1;
          calendarData[dateKey].totalGuests += (booking.quantity_nguoiLon || 0) + (booking.quantity_treEm || 0);
        }
      }
    });
    
    return calendarData;
  } catch (error) {
    throw error;
  }
};

// API tạo tour mới
export const createTour = async (tourData, userRole = null) => {
  // Kiểm tra dữ liệu đầu vào, cảnh báo rõ trường nào bị rỗng
  const requiredFields = [
    { key: 'name', label: 'Tên tour' },
    { key: 'description', label: 'Mô tả' },
    { key: 'price', label: 'Giá vé' },
    { key: 'max_tickets_per_day', label: 'Số lượng vé tối đa trong ngày' },
    { key: 'location', label: 'Địa điểm' },
    { key: 'cateID', label: 'Danh mục' },
    { key: 'supplier_id', label: 'Nhà cung cấp' },
    { key: 'image', label: 'Ảnh' },
    { key: 'opening_time', label: 'Giờ mở cửa' },
    { key: 'closing_time', label: 'Giờ đóng cửa' },
    { key: 'status', label: 'Trạng thái' },
  ];
  for (const field of requiredFields) {
    if (
      tourData[field.key] === undefined ||
      tourData[field.key] === null ||
      (typeof tourData[field.key] === 'string' && !tourData[field.key].trim()) ||
      (Array.isArray(tourData[field.key]) && (!tourData[field.key].length || !tourData[field.key][0] || tourData[field.key][0] === ''))
    ) {
      launchErrorToast(`Trường bắt buộc bị thiếu hoặc rỗng: ${field.label}`);
      throw new Error(`Trường bắt buộc bị thiếu hoặc rỗng: ${field.label}`);
    }
  }
  
  // Validate numeric fields
  const numericFields = ['price', 'max_tickets_per_day'];
  for (const field of numericFields) {
    if (tourData[field] !== undefined && tourData[field] !== null) {
      const value = Number(tourData[field]);
      if (isNaN(value) || value <= 0) {
        console.error(`Invalid numeric field: ${field}`, tourData[field]);
        launchErrorToast(`Trường ${field} phải là số dương hợp lệ`);
        throw new Error(`Trường ${field} phải là số dương hợp lệ`);
      }
    }
  }
  
  // Đảm bảo cateID và supplier_id là ID (string), không phải object
  const dataToSend = {
    ...tourData,
    cateID: typeof tourData.cateID === 'object' && tourData.cateID?._id ? tourData.cateID._id : tourData.cateID,
    supplier_id: typeof tourData.supplier_id === 'object' && tourData.supplier_id?._id ? tourData.supplier_id._id : tourData.supplier_id,
  };
  
  // Clean up services data - remove id fields that are only for UI
  if (dataToSend.services && Array.isArray(dataToSend.services)) {
    dataToSend.services = dataToSend.services.map(service => {
      const cleanService = { ...service };
      delete cleanService.id; // Remove UI-only id field
      return cleanService;
    });
  }
  
  try {
    // Determine API endpoint based on user role
    const apiEndpoint = userRole === 'supplier' ? '/api/create-by-supplier' : '/api/tours';
    
    const response = await AxiosInstance.post(apiEndpoint, dataToSend);
    launchSuccessToast('Tạo tour thành công!');
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      const errorMessage = error.response.data.message || error.response.data.error || 'Unknown error';
      launchErrorToast('Lỗi khi tạo tour: ' + errorMessage);
    } else {
      launchErrorToast('Lỗi khi tạo tour!');
    }
    throw error;
  }
};

// API cập nhật tour theo id (chỉ dành cho supplier)
export const updateTour = async (_id, tourData) => {
  try {
    // Supplier debug logs - keep these
    console.log('🔍 SUPPLIER UPDATE: tourData.supplier_id:', tourData.supplier_id);
    console.log('🔍 SUPPLIER UPDATE: supplier_id type:', typeof tourData.supplier_id);
    
    if (!_id) {
      throw new Error('Tour ID is required');
    }
    
    // Kiểm tra role trước khi cập nhật
    const userRole = await getCurrentUserRole();
    if (userRole !== 'supplier' && userRole !== 'admin') {
      throw new Error('Chỉ có Admin hoặc Supplier mới được phép sửa tour!');
    }
    
    // Sử dụng endpoint cố định /api/update-tours/{_id}
    const response = await AxiosInstance.put(`/api/update-tours/${_id}`, tourData);
    
    // Check if we need to populate supplier data manually
    let updatedTour = response.data?.tour || response.data;
    
    // If supplier_id is just a string ID, try to populate it with supplier info
    if (updatedTour && typeof updatedTour.supplier_id === 'string') {
      console.log('🔍 SUPPLIER UPDATE: Supplier ID is string, attempting to populate...');
      try {
        const allSuppliers = await getSuppliers();
        const matchedSupplier = allSuppliers.find(sup => 
          (sup.id && sup.id === updatedTour.supplier_id) || 
          (sup._id && sup._id === updatedTour.supplier_id)
        );
        
        if (matchedSupplier) {
          console.log('🔍 SUPPLIER UPDATE: Found matching supplier, populating tour data:', matchedSupplier);
          updatedTour = {
            ...updatedTour,
            supplier_id: matchedSupplier
          };
        }
      } catch (supplierError) {
        console.warn('🔍 SUPPLIER UPDATE: Could not populate supplier data:', supplierError);
      }
    }
    
    launchSuccessToast('Cập nhật tour thành công!');
    return updatedTour;
  } catch (error) {
    console.error('=== API ERROR ===');
    console.error('Error updating tour:', error);
    console.error('Error response:', error.response);
    console.error('Error status:', error.response?.status);
    console.error('Error data:', error.response?.data);
    console.error('Request URL:', error.config?.url);
    console.error('================');
    
    if (error.message && (error.message.includes('Supplier') || error.message.includes('Admin'))) {
      launchErrorToast(error.message);
    } else if (error.response?.status === 404) {
      launchErrorToast('Không tìm thấy tour hoặc endpoint API không tồn tại!');
    } else if (error.response && error.response.data) {
      launchErrorToast('Lỗi khi cập nhật tour: ' + (error.response.data.message || 'Unknown error'));
    } else {
      launchErrorToast('Lỗi khi cập nhật tour!');
    }
    throw error;
  }
};

// API xóa tour theo id
export const deleteTour = async (_id) => {
  try {
    console.log('=== API DELETE TOUR ===');
    console.log('ID received:', _id);
    console.log('ID type:', typeof _id);
    console.log('=======================');
    
    if (!_id) {
      throw new Error('Tour ID is required');
    }
    
    // Kiểm tra role trước khi xóa
    const userRole = await getCurrentUserRole();
    if (userRole !== 'admin' && userRole !== 'supplier') {
      throw new Error('Chỉ có Admin hoặc Supplier mới được phép xóa tour!');
    }
    
    // Sử dụng endpoint DELETE /api/tours/{_id}
    const response = await AxiosInstance.delete(`/api/tours/${_id}`);
    
    console.log('Delete response:', response.data);
    launchSuccessToast('Xóa tour thành công!');
    return response.data;
  } catch (error) {
    console.error('=== API ERROR ===');
    console.error('Error deleting tour:', error);
    console.error('Error response:', error.response);
    console.error('Error status:', error.response?.status);
    console.error('Error data:', error.response?.data);
    console.error('Request URL:', error.config?.url);
    console.error('================');
    
    if (error.message && (error.message.includes('Admin') || error.message.includes('Supplier'))) {
      launchErrorToast(error.message);
    } else if (error.response?.status === 401) {
      launchErrorToast('Bạn không có quyền thực hiện hành động này!');
    } else if (error.response?.status === 403) {
      launchErrorToast('Chỉ có Admin hoặc Supplier mới được phép xóa tour!');
    } else if (error.response?.status === 404) {
      launchErrorToast('Không tìm thấy tour hoặc endpoint API không tồn tại!');
    } else if (error.response && error.response.data) {
      launchErrorToast('Lỗi khi xóa tour: ' + (error.response.data.message || 'Unknown error'));
    } else {
      launchErrorToast('Lỗi khi xóa tour!');
    }
    throw error;
  }
};

// API admin duyệt tour (chỉ dành cho admin)
export const approveTour = async (_id, approved = true) => {
  try {
    console.log('=== API APPROVE TOUR ===');
    console.log('Tour ID:', _id);
    console.log('Approved:', approved);
    console.log('========================');
    
    if (!_id) {
      throw new Error('Tour ID is required');
    }
    
    // Kiểm tra role trước khi duyệt
    const userRole = await getCurrentUserRole();
    if (userRole !== 'admin') {
      throw new Error('Chỉ có Admin mới được phép duyệt tour!');
    }
    
    // Gửi request với trạng thái duyệt
    const response = await AxiosInstance.put(`/api/approve/${_id}`, { 
      approved,
      status: approved ? 'active' : 'rejected'
    });
    
    console.log('Approve response:', response.data);
    launchSuccessToast(approved ? 'Duyệt tour thành công!' : 'Từ chối tour thành công!');
    return response.data;
  } catch (error) {
    console.error('=== API ERROR ===');
    console.error('Error approving tour:', error);
    console.error('Error response:', error.response);
    console.error('Error status:', error.response?.status);
    console.error('Error data:', error.response?.data);
    console.error('Request URL:', error.config?.url);
    console.error('================');
    
    if (error.message && error.message.includes('Admin')) {
      launchErrorToast(error.message);
    } else if (error.response?.status === 401) {
      launchErrorToast('Bạn không có quyền thực hiện hành động này!');
    } else if (error.response?.status === 403) {
      launchErrorToast('Chỉ có Admin mới được phép duyệt tour!');
    } else if (error.response?.status === 404) {
      launchErrorToast('Không tìm thấy tour hoặc endpoint API không tồn tại!');
    } else if (error.response && error.response.data) {
      launchErrorToast('Lỗi khi duyệt tour: ' + (error.response.data.message || 'Unknown error'));
    } else {
      launchErrorToast('Lỗi khi duyệt tour!');
    }
    throw error;
  }
};

// API để test endpoints có sẵn
export const testEndpoints = async (_id) => {
  const endpoints = [
    `/api/tours/${_id}/status`,
    `/api/tours/${_id}/toggle-status`, 
    `/api/toggle-tour-status/${_id}`,
    `/api/tours/${_id}`,
    `/api/approve/${_id}`,
    `/api/tour-status/${_id}`,
    `/api/update-tour-status/${_id}`
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Testing GET ${endpoint}...`);
      const response = await AxiosInstance.get(endpoint);
      console.log(`✅ ${endpoint} - Works!`, response.status);
    } catch (error) {
      console.log(`❌ ${endpoint} - ${error.response?.status || 'Failed'}`);
    }
  }
};

// API thay đổi trạng thái tour (Active/Deactive) - chỉ dành cho admin
export const toggleTourStatus = async (_id, isActive = true) => {
  try {
    console.log('=== API TOGGLE TOUR STATUS ===');
    console.log('Tour ID:', _id);
    console.log('Is Active:', isActive);
    console.log('===============================');
    
    if (!_id) {
      throw new Error('Tour ID is required');
    }
    
    // Kiểm tra role trước khi thay đổi trạng thái
    const userRole = await getCurrentUserRole();
    if (userRole !== 'admin') {
      throw new Error('Chỉ có Admin mới được phép thay đổi trạng thái tour!');
    }
    
    // Sử dụng endpoint approve với status mới - dựa trên pattern đã hoạt động
    const status = isActive ? 'active' : 'deactive';
    console.log('Using approve endpoint with status:', status);
    
    const response = await AxiosInstance.put(`/api/approve/${_id}`, { 
      approved: true, // Luôn là true vì tour đã được approve trước đó
      status: status  // Thay đổi status theo yêu cầu
    });
    
    console.log('Toggle status response:', response.data);
    
    // Toast success message
    const successMessage = isActive ? 'Kích hoạt tour thành công!' : 'Hủy kích hoạt tour thành công!';
    console.log('Showing success toast:', successMessage);
    launchSuccessToast(successMessage);
    
    return response.data;
  } catch (error) {
    console.error('=== API ERROR ===');
    console.error('Error toggling tour status:', error);
    console.error('Error response:', error.response);
    console.error('Error status:', error.response?.status);
    console.error('Error data:', error.response?.data);
    console.error('================');
    
    // Xử lý và hiển thị toast error messages
    let errorMessage = 'Lỗi khi thay đổi trạng thái tour!';
    
    if (error.message && error.message.includes('Admin')) {
      errorMessage = error.message;
    } else if (error.response?.status === 401) {
      errorMessage = 'Bạn không có quyền thực hiện hành động này!';
    } else if (error.response?.status === 403) {
      errorMessage = 'Chỉ có Admin mới được phép thay đổi trạng thái tour!';
    } else if (error.response?.status === 404) {
      errorMessage = 'Không tìm thấy tour hoặc endpoint API không tồn tại!';
    } else if (error.response && error.response.data && error.response.data.message) {
      errorMessage = 'Lỗi khi thay đổi trạng thái tour: ' + error.response.data.message;
    }
    
    console.log('Showing error toast:', errorMessage);
    launchErrorToast(errorMessage);
    
    throw error;
  }
};

// API lấy danh sách đối tác (suppliers)
export const getSuppliers = async () => {
  try {
    console.log('=== GET SUPPLIERS FROM /api/all ===');
    console.log('Getting all users and filtering suppliers...');
    
    const response = await AxiosInstance.get('/api/all');
    console.log('Total users count:', response.data?.length);
    
    // Filter users with role 'supplier'
    const allUsers = response.data;
    const suppliers = allUsers.filter(user => user.role === 'supplier');
    
    console.log('=== SUPPLIER FILTERING RESULTS ===');
    console.log('All users count:', allUsers?.length);
    console.log('Suppliers found:', suppliers?.length);
    console.log('===================================');
    
    // Đảm bảo mỗi supplier có _id field
    const normalizedSuppliers = suppliers.map(supplier => ({
      ...supplier,
      _id: supplier._id || supplier.id, // Đảm bảo có _id field
      id: supplier._id || supplier.id   // Đảm bảo có id field
    }));
    
    console.log('Normalized suppliers returned:', normalizedSuppliers.length);
    return normalizedSuppliers;
  } catch (error) {
    console.error('=== ERROR GETTING SUPPLIERS ===');
    console.error('Error:', error);
    console.error('Error response:', error.response);
    console.error('Error status:', error.response?.status);
    console.error('Error data:', error.response?.data);
    console.error('===============================');
    throw error;
  }
};

// API tạo supplier mới
export const createSupplier = async (supplierData) => {
  try {
    console.log('Creating supplier with data:', supplierData);
    
    // Kiểm tra token trước khi gửi request
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      throw new Error('Token không tồn tại. Vui lòng đăng nhập lại.');
    }

    // Kiểm tra role của user hiện tại
    console.log('Checking user role...');
    let userRole;
    try {
      userRole = await getCurrentUserRole();
      console.log('Current user role:', userRole);
    } catch (roleError) {
      console.error('Failed to get user role:', roleError);
      throw new Error('Không thể xác minh quyền truy cập. Vui lòng thử lại.');
    }

    // Chỉ cho phép admin tạo supplier
    if (userRole !== 'admin') {
      throw new Error('Chỉ có tài khoản Admin mới được phép tạo Supplier!');
    }
    
    console.log('User role verified. Proceeding with supplier creation...');
    const response = await AxiosInstance.post('/api/admin/create-supplier', supplierData);
    launchSuccessToast('Tạo supplier thành công!');
    return response.data;
  } catch (error) {
    console.error('Lỗi khi tạo supplier:', error);
    
    if (error.message && error.message.includes('Admin')) {
      launchErrorToast(error.message);
    } else if (error.response?.status === 401) {
      launchErrorToast('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!');
      // Redirect to login sẽ được xử lý bởi interceptor
    } else if (error.response?.status === 403) {
      launchErrorToast('Bạn không có quyền tạo supplier!');
    } else if (error.response && error.response.data) {
      launchErrorToast('Lỗi khi tạo supplier: ' + (error.response.data.message || 'Unknown error'));
    } else if (error.message) {
      launchErrorToast(error.message);
    } else {
      launchErrorToast('Lỗi khi tạo supplier!');
    }
    throw error;
  }
};

// API lấy danh sách reviews
export const getReviews = async () => {
  try {
    const response = await AxiosInstance.get('/api/reviews');
    // Xử lý trường hợp response.data có thể là object chứa array
    let reviewsArray = response.data;
    if (reviewsArray && typeof reviewsArray === 'object' && !Array.isArray(reviewsArray)) {
      // Nếu là object, tìm property chứa array
      if (reviewsArray.reviews && Array.isArray(reviewsArray.reviews)) {
        reviewsArray = reviewsArray.reviews;
      } else if (reviewsArray.data && Array.isArray(reviewsArray.data)) {
        reviewsArray = reviewsArray.data;
      } else {
        // Nếu không tìm thấy array, trả về empty array
        reviewsArray = [];
      }
    }
    return Array.isArray(reviewsArray) ? reviewsArray : [];
  } catch (error) {
    console.error('Lỗi khi lấy danh sách reviews:', error);
    throw error;
  }
};

// API đăng nhập bằng email
export const loginWithEmail = async (email, password) => {
  try {
    const response = await AxiosInstance.post('/api/login-email', { email, password });
    return response.data;
  } catch (error) {
    console.error('Lỗi khi đăng nhập:', error);
    throw error;
  }
};

// API thay đổi trạng thái booking
export const updateBookingStatus = async (bookingId, status) => {
  try {
    const response = await AxiosInstance.put(`/api/bookings/${bookingId}`, { status });
    return response.data;
  } catch (error) {
    console.error('Lỗi khi cập nhật trạng thái booking:', error);
    throw error;
  }
};

// API xóa user theo user_id
export const deleteUser = async (_id) => {
  try {
    const response = await AxiosInstance.delete(`/api/${_id}`);
    return response.data;
  } catch (error) {
    console.error('Lỗi khi xóa user:', error);
    throw error;
  }
};
// API xóa voucher theo id
export const deleteVoucher = async (_id) => {
  try {
    console.log('=== API DELETE VOUCHER ===');
    console.log('Voucher ID:', _id);
    console.log('ID type:', typeof _id);
    console.log('===========================');
    
    if (!_id) {
      throw new Error('Voucher ID is required');
    }
    
    // Kiểm tra role trước khi xóa
    const userRole = await getCurrentUserRole();
    if (userRole !== 'admin') {
      throw new Error('Chỉ có Admin mới được phép xóa voucher!');
    }
    
    // Sử dụng endpoint DELETE /api/vouchers/{_id}
    const response = await AxiosInstance.delete(`/api/vouchers/${_id}`);
    
    console.log('Delete voucher response:', response.data);
    launchSuccessToast('Xóa voucher thành công!');
    return response.data;
  } catch (error) {
    console.error('=== API ERROR ===');
    console.error('Error deleting voucher:', error);
    console.error('Error response:', error.response);
    console.error('Error status:', error.response?.status);
    console.error('Error data:', error.response?.data);
    console.error('Request URL:', error.config?.url);
    console.error('================');
    
    if (error.message && error.message.includes('Admin')) {
      launchErrorToast(error.message);
    } else if (error.response?.status === 401) {
      launchErrorToast('Bạn không có quyền thực hiện hành động này!');
    } else if (error.response?.status === 403) {
      launchErrorToast('Chỉ có Admin mới được phép xóa voucher!');
    } else if (error.response?.status === 404) {
      launchErrorToast('Không tìm thấy voucher hoặc endpoint API không tồn tại!');
    } else if (error.response && error.response.data) {
      launchErrorToast('Lỗi khi xóa voucher: ' + (error.response.data.message || 'Unknown error'));
    } else {
      launchErrorToast('Lỗi khi xóa voucher!');
    }
    throw error;
  }
};

// API tạo voucher mới cho tour
export const createVoucher = async (voucherData) => {
  try {
    console.log('=== API CREATE VOUCHER ===');
    console.log('Voucher data:', voucherData);
    console.log('===========================');
    
    // Validate required fields
    const requiredFields = [
      { key: 'tour_id', label: 'Tour ID' },
      { key: 'code', label: 'Mã voucher' },
      { key: 'discount', label: 'Phần trăm giảm giá' },
      { key: 'condition', label: 'Điều kiện áp dụng' },
      { key: 'start_date', label: 'Ngày bắt đầu' },
      { key: 'end_date', label: 'Ngày kết thúc' }
    ];
    
    for (const field of requiredFields) {
      if (!voucherData[field.key] || 
          (typeof voucherData[field.key] === 'string' && !voucherData[field.key].trim())) {
        console.error(`Missing field: ${field.label}`, voucherData[field.key]);
        launchErrorToast(`Trường bắt buộc bị thiếu: ${field.label}`);
        throw new Error(`Trường bắt buộc bị thiếu: ${field.label}`);
      }
    }
    
    // Validate discount is a valid number between 1-100
    const discount = Number(voucherData.discount);
    if (isNaN(discount) || discount <= 0 || discount > 100) {
      console.error('Invalid discount value:', voucherData.discount);
      launchErrorToast('Phần trăm giảm giá phải là số từ 1 đến 100');
      throw new Error('Phần trăm giảm giá phải là số từ 1 đến 100');
    }
    
    // Validate dates
    const startDate = new Date(voucherData.start_date);
    const endDate = new Date(voucherData.end_date);
    const currentDate = new Date();
    
    if (startDate >= endDate) {
      launchErrorToast('Ngày bắt đầu phải nhỏ hơn ngày kết thúc');
      throw new Error('Ngày bắt đầu phải nhỏ hơn ngày kết thúc');
    }
    
    if (endDate <= currentDate) {
      launchErrorToast('Ngày kết thúc phải lớn hơn ngày hiện tại');
      throw new Error('Ngày kết thúc phải lớn hơn ngày hiện tại');
    }
    
    // Kiểm tra role trước khi tạo
    const userRole = await getCurrentUserRole();
    if (userRole !== 'admin') {
      throw new Error('Chỉ có Admin mới được phép tạo voucher!');
    }
    
    // Prepare data to send
    const dataToSend = {
      tour_id: voucherData.tour_id,
      code: voucherData.code.toUpperCase().trim(),
      discount: discount,
      condition: voucherData.condition.trim(),
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString()
    };
    
    console.log('Data to send:', dataToSend);
    
    // Sử dụng endpoint POST /api/vouchers
    const response = await AxiosInstance.post('/api/vouchers', dataToSend);
    
    console.log('Create voucher response:', response.data);
    launchSuccessToast('Tạo voucher thành công!');
    return response.data;
  } catch (error) {
    console.error('=== API ERROR ===');
    console.error('Error creating voucher:', error);
    console.error('Error response:', error.response);
    console.error('Error status:', error.response?.status);
    console.error('Error data:', error.response?.data);
    console.error('Request URL:', error.config?.url);
    console.error('================');
    
    if (error.message && error.message.includes('Admin')) {
      launchErrorToast(error.message);
    } else if (error.message && (error.message.includes('Trường bắt buộc') || 
                                error.message.includes('Phần trăm giảm giá') ||
                                error.message.includes('Ngày'))) {
      // Error message already shown by validation
    } else if (error.response?.status === 401) {
      launchErrorToast('Bạn không có quyền thực hiện hành động này!');
    } else if (error.response?.status === 403) {
      launchErrorToast('Chỉ có Admin mới được phép tạo voucher!');
    } else if (error.response?.status === 409) {
      launchErrorToast('Mã voucher đã tồn tại. Vui lòng chọn mã khác!');
    } else if (error.response?.status === 404) {
      launchErrorToast('Tour không tồn tại!');
    } else if (error.response && error.response.data) {
      launchErrorToast('Lỗi khi tạo voucher: ' + (error.response.data.message || 'Unknown error'));
    } else {
      launchErrorToast('Lỗi khi tạo voucher!');
    }
    throw error;
  }
};

// API thay đổi trạng thái voucher (Active/Deactive) - chỉ dành cho admin
export const toggleVoucherStatus = async (_id, isActive = true) => {
  try {
    console.log('=== API TOGGLE VOUCHER STATUS ===');
    console.log('Voucher ID:', _id);
    console.log('Is Active:', isActive);
    console.log('=================================');
    
    if (!_id) {
      throw new Error('Voucher ID is required');
    }
    
    // Kiểm tra role trước khi thay đổi trạng thái
    const userRole = await getCurrentUserRole();
    if (userRole !== 'admin') {
      throw new Error('Chỉ có Admin mới được phép thay đổi trạng thái voucher!');
    }
    
    // Sử dụng endpoint PUT /api/vouchers/voucher/status/{_id}
    const status = isActive ? 'active' : 'deactive';
    console.log('Sending status:', status);
    
    const response = await AxiosInstance.put(`/api/vouchers/voucher/status/${_id}`, { 
      status: status
    });
    
    console.log('Toggle voucher status response:', response.data);
    
    // Toast success message
    const successMessage = isActive ? 'Kích hoạt voucher thành công!' : 'Hủy kích hoạt voucher thành công!';
    console.log('Showing success toast:', successMessage);
    launchSuccessToast(successMessage);
    
    return response.data;
  } catch (error) {
    console.error('=== API ERROR ===');
    console.error('Error toggling voucher status:', error);
    console.error('Error response:', error.response);
    console.error('Error status:', error.response?.status);
    console.error('Error data:', error.response?.data);
    console.error('================');
    
    // Xử lý và hiển thị toast error messages
    let errorMessage = 'Lỗi khi thay đổi trạng thái voucher!';
    
    if (error.message && error.message.includes('Admin')) {
      errorMessage = error.message;
    } else if (error.response?.status === 401) {
      errorMessage = 'Bạn không có quyền thực hiện hành động này!';
    } else if (error.response?.status === 403) {
      errorMessage = 'Chỉ có Admin mới được phép thay đổi trạng thái voucher!';
    } else if (error.response?.status === 404) {
      errorMessage = 'Không tìm thấy voucher hoặc endpoint API không tồn tại!';
    } else if (error.response && error.response.data && error.response.data.message) {
      errorMessage = 'Lỗi khi thay đổi trạng thái voucher: ' + error.response.data.message;
    }
    
    console.log('Showing error toast:', errorMessage);
    launchErrorToast(errorMessage);
    
    throw error;
  }
};

