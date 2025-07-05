import axios from 'axios';
import { launchErrorToast } from '../components/ErrorToast';

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
};

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

export const getAllBookings = async () => {
  try {
    const response = await AxiosInstance.get('/api/bookings/all');
    return response.data;
  } catch (error) {
    console.error('Lỗi khi lấy tất cả thông tin booking:', error);
    throw error;
  }
};

// API tạo tour mới
export const createTour = async (tourData) => {
  try {
    const response = await AxiosInstance.post('/api/tours', tourData);
    return response.data;
  } catch (error) {
    launchErrorToast('Lỗi khi tạo tour!');
    throw error;
  }
};

// API cập nhật tour theo id
export const updateTour = async (_id, tourData) => {
  try {
    const response = await AxiosInstance.put(`/api/tours/${_id}`, tourData);
    return response.data;
  } catch (error) {
    launchErrorToast('Lỗi khi cập nhật tour!');
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

