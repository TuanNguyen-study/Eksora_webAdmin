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
    console.error('Lỗi khi tạo booking:', error);
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
    console.error('Lỗi khi lấy danh sách categories:', error);
    throw error;
  }
};

// API lấy danh sách các tour
export const getTours = async () => {
  try {
    const response = await AxiosInstance.get('/api/tours');
    return response.data;
  } catch (error) {
    console.error('Lỗi khi lấy danh sách các tour:', error);
    throw error;
  }
};

// API lấy tours theo role (admin: tours requested, supplier: tours của mình)
export const getToursByRole = async () => {
  try {
    const [userRole, userProfile, allTours] = await Promise.all([
      getCurrentUserRole(),
      getUser(),
      getTours()
    ]);
    
    if (userRole === 'admin') {
      // Admin thấy tất cả tours (bao gồm cả đã duyệt và chờ duyệt)
      return allTours;
    } else if (userRole === 'supplier') {
      // Supplier chỉ thấy tours của mình
      return allTours.filter(tour => 
        tour.supplier_id === userProfile._id || 
        tour.supplier_id?._id === userProfile._id
      );
    } else {
      // Role khác (nếu có) thì thấy tất cả
      return allTours;
    }
  } catch (error) {
    console.error('Lỗi khi lấy danh sách tour theo role:', error);
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
    console.error('Lỗi khi lấy danh sách tour theo cateID:', error);
    throw error;
  }
};

// API lấy danh sách chuyến đi
export const getTrips = async (userId) => {
  try {
    const response = await AxiosInstance.get(`/api/bookings/user/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Lỗi khi lấy danh sách bookings:', error);
    throw error;
  }
};

// API lấy danh sách yêu thích
export const getFavorites = async (user_id) => {
  try {
    const response = await AxiosInstance.get(`/api/favorites/${user_id}`);
    return response.data;
  } catch (error) {
    console.error('Lỗi khi lấy danh sách favorites:', error);
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
    console.error('Lỗi khi thêm vào yêu thích:', error);
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
    return response.data;
  } catch (error) {
    console.error('Lỗi khi lấy danh sách Promotion:', error);
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
    console.error('Lỗi khi hiển thị User:', error.message || error);
    throw error;
  }
};

// API kiểm tra role của user hiện tại
export const getCurrentUserRole = async () => {
  try {
    const response = await AxiosInstance.get('/api/profile');
    return response.data?.role || null;
  } catch (error) {
    console.error('Lỗi khi lấy thông tin role:', error);
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
    console.error('Lỗi khi lấy tất cả thông tin người dùng:', error);
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
    console.error('Lỗi khi lấy tất cả thông tin booking:', error);
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
    { key: 'price_child', label: 'Giá trẻ em' },
    { key: 'location', label: 'Địa điểm' },
    { key: 'cateID', label: 'Danh mục' },
    { key: 'supplier_id', label: 'Nhà cung cấp' },
    { key: 'image', label: 'Ảnh' },
    { key: 'open_time', label: 'Giờ mở cửa' },
    { key: 'close_time', label: 'Giờ đóng cửa' },
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
  try {
    // Đảm bảo cateID và supplier_id là ID (string), không phải object
    const dataToSend = {
      ...tourData,
      cateID: typeof tourData.cateID === 'object' && tourData.cateID?._id ? tourData.cateID._id : tourData.cateID,
      supplier_id: typeof tourData.supplier_id === 'object' && tourData.supplier_id?._id ? tourData.supplier_id._id : tourData.supplier_id,
    };
    
    // Determine API endpoint based on user role
    const apiEndpoint = userRole === 'supplier' ? '/api/create-by-supplier' : '/api/tours';
    
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log('API endpoint:', apiEndpoint);
      console.log('User role:', userRole);
      console.log('Dữ liệu gửi lên API tạo tour:', dataToSend);
    }
    
    const response = await AxiosInstance.post(apiEndpoint, dataToSend);
    launchSuccessToast('Tạo tour thành công!');
    return response.data;
  } catch (error) {
    console.error('Error creating tour:', error);
    if (error.response && error.response.data) {
      launchErrorToast('Lỗi khi tạo tour: ' + (error.response.data.message || 'Unknown error'));
    } else {
      launchErrorToast('Lỗi khi tạo tour!');
    }
    throw error;
  }
};

// API cập nhật tour theo id (chỉ dành cho supplier)
export const updateTour = async (_id, tourData) => {
  try {
    console.log('=== API UPDATE TOUR ===');
    console.log('ID received:', _id);
    console.log('ID type:', typeof _id);
    console.log('ID length:', _id?.length);
    console.log('Tour data:', tourData);
    console.log('======================');
    
    if (!_id) {
      throw new Error('Tour ID is required');
    }
    
    // Kiểm tra role trước khi cập nhật
    const userRole = await getCurrentUserRole();
    if (userRole !== 'supplier') {
      throw new Error('Chỉ có Supplier mới được phép sửa tour!');
    }
    
    // Sử dụng endpoint cố định /api/update-tours/{_id}
    const response = await AxiosInstance.put(`/api/update-tours/${_id}`, tourData);
    
    console.log('Update response:', response.data);
    launchSuccessToast('Cập nhật tour thành công!');
    return response.data;
  } catch (error) {
    console.error('=== API ERROR ===');
    console.error('Error updating tour:', error);
    console.error('Error response:', error.response);
    console.error('Error status:', error.response?.status);
    console.error('Error data:', error.response?.data);
    console.error('Request URL:', error.config?.url);
    console.error('================');
    
    if (error.message && error.message.includes('Supplier')) {
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
    const response = await AxiosInstance.get('/api/suppliers');
    return response.data;
  } catch (error) {
    console.error('Lỗi khi lấy danh sách suppliers:', error);
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
    return response.data;
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

