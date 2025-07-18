import axios from 'axios';
import { launchErrorToast } from '../components/ErrorToast';
import { launchSuccessToast } from '../components/SuccessToast';

const AxiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
export const createTour = async (tourData) => {

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
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log('Dữ liệu gửi lên API tạo tour:', dataToSend);
    }
    const response = await AxiosInstance.post('/api/tours', dataToSend);
    launchSuccessToast('Tạo tour thành công!');
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      launchErrorToast('Lỗi khi tạo tour: ' + (error.response.data.message || 'Unknown error'));
    } else {
      launchErrorToast('Lỗi khi tạo tour!');
    }
    throw error;
  }
};

// API cập nhật tour theo id
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
    
    // Thử nhiều endpoint khác nhau
    let response;
    let lastError;
    const endpointsToTry = [
      { method: 'PUT', url: `/api/tours/${_id}`, name: 'PUT /api/tours/{id}' },
      { method: 'PATCH', url: `/api/tours/${_id}`, name: 'PATCH /api/tours/{id}' },
      { method: 'PUT', url: `/api/tours/update/${_id}`, name: 'PUT /api/tours/update/{id}' },
      { method: 'POST', url: `/api/tours/${_id}`, name: 'POST /api/tours/{id}' },
      { method: 'PUT', url: `/api/tours/edit/${_id}`, name: 'PUT /api/tours/edit/{id}' },
      { method: 'POST', url: `/api/tours/update/${_id}`, name: 'POST /api/tours/update/{id}' },
      { method: 'POST', url: `/api/tours/edit/${_id}`, name: 'POST /api/tours/edit/{id}' },
      { method: 'PUT', url: `/tours/${_id}`, name: 'PUT /tours/{id}' },
      { method: 'PATCH', url: `/tours/${_id}`, name: 'PATCH /tours/{id}' },
      { method: 'POST', url: `/tours/${_id}`, name: 'POST /tours/{id}' }
    ];
    
    for (const endpoint of endpointsToTry) {
      try {
        console.log(`Trying ${endpoint.name}: ${endpoint.method} ${endpoint.url}`);
        
        switch (endpoint.method) {
          case 'PUT':
            response = await AxiosInstance.put(endpoint.url, tourData);
            break;
          case 'PATCH':
            response = await AxiosInstance.patch(endpoint.url, tourData);
            break;
          case 'POST':
            response = await AxiosInstance.post(endpoint.url, tourData);
            break;
        }
        
        console.log(`${endpoint.name} success:`, response.data);
        break; // Thành công, thoát khỏi vòng lặp
      } catch (error) {
        console.log(`${endpoint.name} failed:`, error.response?.status || 'Network error');
        lastError = error;
        continue; // Thử endpoint tiếp theo
      }
    }
    
    if (response) {
      console.log('Update response:', response.data);
      launchSuccessToast('Cập nhật tour thành công!');
      return response.data;
    } else {
      throw lastError;
    }
  } catch (error) {
    console.error('=== API ERROR ===');
    console.error('Error updating tour:', error);
    console.error('Error response:', error.response);
    console.error('Error status:', error.response?.status);
    console.error('Error data:', error.response?.data);
    console.error('Request URL:', error.config?.url);
    console.error('All endpoints tried and failed. Backend may not have update functionality implemented.');
    console.error('================');
    
    if (error.response?.status === 404) {
      launchErrorToast('Không tìm thấy endpoint API để cập nhật tour. Backend chưa triển khai chức năng cập nhật!');
    } else if (error.response && error.response.data) {
      launchErrorToast('Lỗi khi cập nhật tour: ' + (error.response.data.message || 'Unknown error'));
    } else {
      launchErrorToast('Lỗi khi cập nhật tour!');
    }
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

