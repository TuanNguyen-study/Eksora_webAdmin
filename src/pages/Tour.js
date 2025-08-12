import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTours, getCategories, getSuppliers, updateTour, deleteTour, getToursByRole, getSupplierTours, approveTour, toggleTourStatus, getCurrentUserRole, getUser, testEndpoints, debugSupplierTours } from '../api/api';
import { FaTag, FaClock, FaList, FaMapMarkerAlt, FaImage, FaAlignLeft, FaCheckCircle } from 'react-icons/fa';
import { uploadImageToCloudinary } from '../api/cloudinary';
import CkeditorField from '../components/CkeditorField';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix cho default markers trong Leaflet - sử dụng CDN thay vì require
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Add custom styles for map marker
const mapStyles = `
  .custom-map-marker {
    background: transparent !important;
    border: none !important;
  }
  
  .leaflet-container {
    font-family: inherit;
  }
  
  .leaflet-popup-content-wrapper {
    border-radius: 8px;
  }
  
  .leaflet-control-zoom a {
    font-size: 18px;
  }
  
  .map-search-suggestions {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    border: 1px solid #ddd;
    border-top: none;
    border-radius: 0 0 4px 4px;
    max-height: 200px;
    overflow-y: auto;
    z-index: 1000;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  
  .map-search-suggestion {
    padding: 8px 12px;
    cursor: pointer;
    border-bottom: 1px solid #eee;
  }
  
  .map-search-suggestion:hover {
    background: #f5f5f5;
  }
  
  .map-search-suggestion:last-child {
    border-bottom: none;
  }
`;

// Inject styles
if (!document.getElementById('tour-map-custom-styles')) {
  const styleElement = document.createElement('style');
  styleElement.id = 'tour-map-custom-styles';
  styleElement.textContent = mapStyles;
  document.head.appendChild(styleElement);
}

function Tour() {
  const navigate = useNavigate();
  // Kiểm tra đăng nhập (ví dụ dùng localStorage key 'isLoggedIn')
  useEffect(() => {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true' || sessionStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn) {
      navigate('/login');
    }
  }, [navigate]);

  const [tours, setTours] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTour, setSelectedTour] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('view'); // 'view', 'edit', 'add'
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    max_tickets_per_day: '',
    image: [''],
    location: '',
    rating: '',
    cateID: { _id: '', name: '', image: '' },
    supplier_id: '', // Chỉ lưu ID string của supplier
    opening_time: '',
    closing_time: '',
    services: []
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [editingDescription, setEditingDescription] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(10000000);
  const [priceRange, setPriceRange] = useState([0, 10000000]);
  // Thêm state cho filter TourFilter
  const [tourFilter, setTourFilter] = useState({ date: 'all', price: [0, 12333334], instant: false });
  // 1. Thêm state để lọc theo province/category khi click thumbnail
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedCategoryForProvince, setSelectedCategoryForProvince] = useState('');
  const [provinceList, setProvinceList] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Thêm state cho bộ lọc giá
  const [priceFilter, setPriceFilter] = useState({
    minPrice: '',
    maxPrice: ''
  });

  // Map states
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [isInitializingMap, setIsInitializingMap] = useState(false);
  
  // Location search states  
  const [locationQuery, setLocationQuery] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCoordinates, setSelectedCoordinates] = useState(null);

  // Helper function để kiểm tra quyền admin
  const isAdmin = () => userRole === 'admin';

  // Vietnamese location database for autocomplete
  const vietnameseLocations = [
    // Major cities
    { name: 'Hà Nội', lat: 21.0285, lng: 105.8542, type: 'city' },
    { name: 'Thành phố Hồ Chí Minh', lat: 10.8231, lng: 106.6297, type: 'city' },
    { name: 'Đà Nẵng', lat: 16.0471, lng: 108.2068, type: 'city' },
    { name: 'Hải Phòng', lat: 20.8449, lng: 106.6881, type: 'city' },
    { name: 'Cần Thơ', lat: 10.0452, lng: 105.7469, type: 'city' },
    { name: 'Nha Trang', lat: 12.2388, lng: 109.1967, type: 'city' },
    { name: 'Huế', lat: 16.4637, lng: 107.5909, type: 'city' },
    { name: 'Hạ Long', lat: 20.9101, lng: 107.1839, type: 'city' },
    { name: 'Vũng Tàu', lat: 10.4113, lng: 107.1362, type: 'city' },
    { name: 'Đà Lạt', lat: 11.9404, lng: 108.4583, type: 'city' },
    { name: 'Quy Nhon', lat: 13.7830, lng: 109.2190, type: 'city' },
    { name: 'Phan Thiết', lat: 10.9289, lng: 108.1022, type: 'city' },
    { name: 'Buôn Ma Thuột', lat: 12.6667, lng: 108.0500, type: 'city' },
    { name: 'Pleiku', lat: 13.9833, lng: 108.0000, type: 'city' },
    { name: 'Long Xuyên', lat: 10.3833, lng: 105.4333, type: 'city' },
    
    // Tourist destinations
    { name: 'Vịnh Hạ Long, Quảng Ninh', lat: 20.9101, lng: 107.1839, type: 'tourist' },
    { name: 'Sapa, Lào Cai', lat: 22.3380, lng: 103.8442, type: 'tourist' },
    { name: 'Hội An, Quảng Nam', lat: 15.8801, lng: 108.3380, type: 'tourist' },
    { name: 'Mỹ Sơn, Quảng Nam', lat: 15.7649, lng: 108.1217, type: 'tourist' },
    { name: 'Phong Nha-Kẻ Bàng, Quảng Bình', lat: 17.5083, lng: 106.2639, type: 'tourist' },
    { name: 'Cù Lao Chàm, Quảng Nam', lat: 15.9500, lng: 108.5167, type: 'tourist' },
    { name: 'Côn Đảo, Bà Rịa-Vũng Tàu', lat: 8.6833, lng: 106.6000, type: 'tourist' },
    { name: 'Phú Quốc, Kiên Giang', lat: 10.2899, lng: 103.9840, type: 'tourist' },
    { name: 'Cát Bà, Hải Phòng', lat: 20.8078, lng: 107.0611, type: 'tourist' },
    { name: 'Tam Cốc, Ninh Bình', lat: 20.2441, lng: 105.9194, type: 'tourist' },
    { name: 'Tràng An, Ninh Bình', lat: 20.2597, lng: 105.9011, type: 'tourist' },
    { name: 'Bái Đính, Ninh Bình', lat: 20.2167, lng: 106.0500, type: 'tourist' },
    { name: 'Mường Thanh, Điện Biên', lat: 21.3891, lng: 103.0197, type: 'tourist' },
    
    // Beaches  
    { name: 'Bãi Dài, Phú Quốc', lat: 10.1833, lng: 103.9667, type: 'beach' },
    { name: 'Bãi Sao, Phú Quốc', lat: 10.1167, lng: 103.9667, type: 'beach' },
    { name: 'Mũi Né, Phan Thiết', lat: 10.9347, lng: 108.2967, type: 'beach' },
    { name: 'Cửa Đại, Hội An', lat: 15.8667, lng: 108.3667, type: 'beach' },
    { name: 'An Bàng, Hội An', lat: 15.8833, lng: 108.3500, type: 'beach' },
    { name: 'Lăng Cô, Huế', lat: 16.2333, lng: 108.1167, type: 'beach' },
    
    // Mountains and nature
    { name: 'Fansipan, Lào Cai', lat: 22.3019, lng: 103.7756, type: 'mountain' },
    { name: 'Bà Nà Hills, Đà Nẵng', lat: 15.9969, lng: 107.9953, type: 'mountain' },
    { name: 'Núi Bà Đen, Tây Ninh', lat: 11.3667, lng: 106.1000, type: 'mountain' },
    { name: 'Đỉnh Lảng, Cao Bằng', lat: 22.6667, lng: 106.2500, type: 'mountain' },
    
    // Provinces
    { name: 'An Giang', lat: 10.3883, lng: 105.1258, type: 'province' },
    { name: 'Bà Rịa-Vũng Tàu', lat: 10.5417, lng: 107.2431, type: 'province' },
    { name: 'Bắc Giang', lat: 21.2731, lng: 106.1946, type: 'province' },
    { name: 'Bắc Kạn', lat: 22.1472, lng: 105.8348, type: 'province' },
    { name: 'Bạc Liêu', lat: 9.2940, lng: 105.7215, type: 'province' },
    { name: 'Bắc Ninh', lat: 21.1861, lng: 106.0763, type: 'province' },
    { name: 'Bến Tre', lat: 10.2433, lng: 106.3755, type: 'province' },
    { name: 'Bình Định', lat: 14.1665, lng: 108.9021, type: 'province' },
    { name: 'Bình Dương', lat: 11.3254, lng: 106.4772, type: 'province' },
    { name: 'Bình Phước', lat: 11.7512, lng: 106.7234, type: 'province' },
    { name: 'Bình Thuận', lat: 11.0904, lng: 108.0721, type: 'province' },
    { name: 'Cà Mau', lat: 9.1769, lng: 105.1524, type: 'province' },
    { name: 'Cao Bằng', lat: 22.6359, lng: 106.2621, type: 'province' },
    { name: 'Đắk Lắk', lat: 12.7100, lng: 108.2378, type: 'province' },
    { name: 'Đắk Nông', lat: 12.2646, lng: 107.6098, type: 'province' },
    { name: 'Điện Biên', lat: 21.8042, lng: 103.2303, type: 'province' },
    { name: 'Đồng Nai', lat: 11.0686, lng: 107.1676, type: 'province' },
    { name: 'Đồng Tháp', lat: 10.4938, lng: 105.6881, type: 'province' },
    { name: 'Gia Lai', lat: 13.8078, lng: 108.1094, type: 'province' },
    { name: 'Hà Giang', lat: 22.8025, lng: 104.9784, type: 'province' },
    { name: 'Hà Nam', lat: 20.5835, lng: 105.9226, type: 'province' },
    { name: 'Hà Tĩnh', lat: 18.3559, lng: 105.8877, type: 'province' },
    { name: 'Hải Dương', lat: 20.9373, lng: 106.3147, type: 'province' },
    { name: 'Hậu Giang', lat: 9.7781, lng: 105.6412, type: 'province' },
    { name: 'Hòa Bình', lat: 20.6861, lng: 105.3131, type: 'province' },
    { name: 'Hưng Yên', lat: 20.6464, lng: 106.0514, type: 'province' },
    { name: 'Khánh Hòa', lat: 12.2585, lng: 109.0526, type: 'province' },
    { name: 'Kiên Giang', lat: 9.8349, lng: 105.1200, type: 'province' },
    { name: 'Kon Tum', lat: 14.3497, lng: 108.0005, type: 'province' },
    { name: 'Lai Châu', lat: 22.3864, lng: 103.4709, type: 'province' },
    { name: 'Lâm Đồng', lat: 11.5752, lng: 108.1429, type: 'province' },
    { name: 'Lạng Sơn', lat: 21.8537, lng: 106.7611, type: 'province' },
    { name: 'Lào Cai', lat: 22.4809, lng: 103.9710, type: 'province' },
    { name: 'Long An', lat: 10.6953, lng: 106.2431, type: 'province' },
    { name: 'Nam Định', lat: 20.4388, lng: 106.1621, type: 'province' },
    { name: 'Nghệ An', lat: 19.2342, lng: 104.9200, type: 'province' },
    { name: 'Ninh Bình', lat: 20.2506, lng: 105.9745, type: 'province' },
    { name: 'Ninh Thuận', lat: 11.6739, lng: 108.8629, type: 'province' },
    { name: 'Phú Thọ', lat: 21.2682, lng: 105.2045, type: 'province' },
    { name: 'Phú Yên', lat: 13.1673, lng: 109.1684, type: 'province' },
    { name: 'Quảng Bình', lat: 17.6102, lng: 106.3487, type: 'province' },
    { name: 'Quảng Nam', lat: 15.5394, lng: 108.0191, type: 'province' },
    { name: 'Quảng Ngãi', lat: 15.1214, lng: 108.8044, type: 'province' },
    { name: 'Quảng Ninh', lat: 21.0064, lng: 107.2925, type: 'province' },
    { name: 'Quảng Trị', lat: 16.7943, lng: 107.1856, type: 'province' },
    { name: 'Sóc Trăng', lat: 9.6003, lng: 105.9800, type: 'province' },
    { name: 'Sơn La', lat: 21.3256, lng: 103.9188, type: 'province' },
    { name: 'Tây Ninh', lat: 11.3100, lng: 106.0998, type: 'province' },
    { name: 'Thái Bình', lat: 20.4464, lng: 106.3364, type: 'province' },
    { name: 'Thái Nguyên', lat: 21.5674, lng: 105.8252, type: 'province' },
    { name: 'Thanh Hóa', lat: 19.8087, lng: 105.7764, type: 'province' },
    { name: 'Thừa Thiên Huế', lat: 16.4674, lng: 107.5905, type: 'province' },
    { name: 'Tiền Giang', lat: 10.4493, lng: 106.3420, type: 'province' },
    { name: 'Trà Vinh', lat: 9.9477, lng: 106.3254, type: 'province' },
    { name: 'Tuyên Quang', lat: 21.8237, lng: 105.2280, type: 'province' },
    { name: 'Vĩnh Long', lat: 10.2397, lng: 105.9571, type: 'province' },
    { name: 'Vĩnh Phúc', lat: 21.3608, lng: 105.6049, type: 'province' },
    { name: 'Yên Bái', lat: 21.6837, lng: 104.4551, type: 'province' }
  ];

  // Initialize map function
  const initializeMap = useCallback(() => {
    console.log('=== TOUR MAP INITIALIZATION START ===');
    
    if (isInitializingMap) {
      console.log('Map initialization already in progress, skipping...');
      return;
    }

    if (!mapRef.current) {
      console.log('Map container not available yet, will retry...');
      setTimeout(() => initializeMap(), 100);
      return;
    }

    if (mapInstanceRef.current) {
      console.log('Map already exists, skipping initialization');
      return;
    }

    try {
      setIsInitializingMap(true);
      console.log('Creating new map instance...');

      const mapInstance = L.map(mapRef.current, {
        center: [16.0583, 108.2772], // Vietnam center
        zoom: 6,
        zoomControl: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        dragging: true,
        attributionControl: true
      });

      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(mapInstance);

      mapInstanceRef.current = mapInstance;

      // Handle map click for location selection
      mapInstance.on('click', (e) => {
        console.log('Map clicked at:', e.latlng);
        const { lat, lng } = e.latlng;
        
        // Update marker position
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          markerRef.current = L.marker([lat, lng], {
            draggable: true
          }).addTo(mapInstance);
          
          // Handle marker drag
          markerRef.current.on('dragend', (event) => {
            const marker = event.target;
            const position = marker.getLatLng();
            console.log('Marker dragged to:', position);
            setSelectedCoordinates({ lat: position.lat, lng: position.lng });
            performReverseGeocoding(position.lat, position.lng);
          });
        }
        
        setSelectedCoordinates({ lat, lng });
        performReverseGeocoding(lat, lng);
      });

      console.log('Map initialization completed successfully');
      setMapLoaded(true);
      setMapError(null);

    } catch (error) {
      console.error('Error initializing map:', error);
      setMapError(error.message);
      setMapLoaded(false);
    } finally {
      setIsInitializingMap(false);
      console.log('=== TOUR MAP INITIALIZATION END ===');
    }
  }, [isInitializingMap]);

  // Reverse geocoding function
  const performReverseGeocoding = async (lat, lng) => {
    console.log(`Performing reverse geocoding for: ${lat}, ${lng}`);
    
    const corsProxies = [
      'https://api.codetabs.com/v1/proxy?quest=',
      'https://api.allorigins.win/raw?url=',
      'https://cors.sh/'
    ];

    const baseUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=vi,en`;

    for (const proxy of corsProxies) {
      try {
        console.log(`Trying reverse geocoding with proxy: ${proxy}`);
        const response = await fetch(`${proxy}${encodeURIComponent(baseUrl)}`, {
          headers: {
            'User-Agent': 'TourApp/1.0'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log('Reverse geocoding result:', data);

        if (data && data.display_name) {
          const locationName = data.display_name;
          console.log('Setting location to:', locationName);
          
          setForm(prev => ({
            ...prev,
            location: locationName
          }));
          setLocationQuery(locationName);
          
          // Update marker popup
          if (markerRef.current) {
            markerRef.current.bindPopup(`<b>Vị trí đã chọn:</b><br>${locationName}`).openPopup();
          }
          
          return;
        }
      } catch (error) {
        console.log(`Reverse geocoding failed with ${proxy}:`, error.message);
      }
    }

    console.log('All reverse geocoding attempts failed, using coordinates');
    const fallbackLocation = `Tọa độ: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    setForm(prev => ({
      ...prev,
      location: fallbackLocation
    }));
    setLocationQuery(fallbackLocation);
  };

  // Location search function
  const handleLocationSearch = async (query) => {
    if (!query || query.length < 2) {
      setLocationSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    console.log(`Searching for location: "${query}"`);
    setIsSearching(true);

    try {
      // First, search in Vietnamese locations database
      const localResults = vietnameseLocations.filter(location => 
        location.name.toLowerCase().includes(query.toLowerCase()) ||
        location.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(
          query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        )
      ).slice(0, 5);

      console.log(`Found ${localResults.length} local results:`, localResults);

      if (localResults.length > 0) {
        setLocationSuggestions(localResults.map(loc => ({
          display_name: loc.name,
          lat: loc.lat,
          lng: loc.lng,
          type: 'local'
        })));
        setShowSuggestions(true);
        setIsSearching(false);
        return;
      }

      // If no local results, try online search with CORS proxies
      const corsProxies = [
        'https://api.codetabs.com/v1/proxy?quest=',
        'https://api.allorigins.win/raw?url=',
        'https://cors.sh/'
      ];

      const searchUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&accept-language=vi,en&countrycodes=vn`;

      for (const proxy of corsProxies) {
        try {
          console.log(`Trying online search with proxy: ${proxy}`);
          
          const response = await fetch(`${proxy}${encodeURIComponent(searchUrl)}`, {
            headers: {
              'User-Agent': 'TourApp/1.0'
            }
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const data = await response.json();
          console.log(`Online search results:`, data);

          if (data && Array.isArray(data) && data.length > 0) {
            const suggestions = data.map(item => ({
              display_name: item.display_name,
              lat: parseFloat(item.lat),
              lng: parseFloat(item.lon),
              type: 'online'
            }));

            setLocationSuggestions(suggestions);
            setShowSuggestions(true);
            setIsSearching(false);
            return;
          }
        } catch (error) {
          console.log(`Online search failed with ${proxy}:`, error.message);
        }
      }

      console.log('All search attempts failed');
      setLocationSuggestions([]);
      setShowSuggestions(false);

    } catch (error) {
      console.error('Location search error:', error);
      setLocationSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle location selection
  const selectLocation = (suggestion) => {
    console.log('Selected location:', suggestion);
    
    setLocationQuery(suggestion.display_name);
    setForm(prev => ({
      ...prev,
      location: suggestion.display_name
    }));
    setSelectedCoordinates({ lat: suggestion.lat, lng: suggestion.lng });
    setShowSuggestions(false);

    // Update map if available
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([suggestion.lat, suggestion.lng], 15);
      
      // Update or create marker
      if (markerRef.current) {
        markerRef.current.setLatLng([suggestion.lat, suggestion.lng]);
      } else {
        markerRef.current = L.marker([suggestion.lat, suggestion.lng], {
          draggable: true
        }).addTo(mapInstanceRef.current);
        
        markerRef.current.on('dragend', (event) => {
          const marker = event.target;
          const position = marker.getLatLng();
          console.log('Marker dragged to:', position);
          setSelectedCoordinates({ lat: position.lat, lng: position.lng });
          performReverseGeocoding(position.lat, position.lng);
        });
      }
      
      markerRef.current.bindPopup(`<b>Vị trí đã chọn:</b><br>${suggestion.display_name}`).openPopup();
    }
  };

  useEffect(() => {
    async function fetchTours() {
      setLoading(true);
      setError(null);
      try {
        // Lấy thông tin user và role trước
        const [role, userProfile] = await Promise.all([
          getCurrentUserRole(),
          getUser()
        ]);
        setUserRole(role);
        setCurrentUser(userProfile);
        
        // Lấy tours theo role
        let data = await getToursByRole();
        
        console.log('=== TOURS FROM API (BY ROLE) ===');
        console.log('User role:', role);
        console.log('Total tours:', data.length);
        console.log('Sample tour IDs:');
        data.slice(0, 5).forEach((tour, index) => {
          console.log(`Tour ${index + 1}: ID=${tour._id}, Name=${tour.name}, Status=${tour.status}`);
          console.log(`  Time data: opening_time=${tour.opening_time}, closing_time=${tour.closing_time}`);
          console.log(`  Legacy time data: open_time=${tour.open_time}, close_time=${tour.close_time}`);
        });
        console.log('Full tours data:', data);
        console.log('====================================');
        
        console.log('=== FILTER DEBUG ===');
        console.log('selectedCategory:', selectedCategory);
        console.log('selectedMonth:', selectedMonth);
        console.log('selectedYear:', selectedYear);
        console.log('priceFilter:', priceFilter);
        console.log('====================');
        
        // TEMPORARY: Enable only price filter for now
        console.log('=== APPLYING PRICE FILTER ONLY ===');
        
        // Lọc theo giá từ bộ lọc người dùng thiết lập
        if (priceFilter.minPrice || priceFilter.maxPrice) {
          console.log('Applying price filter...');
          const beforeFilter = data.length;
          data = data.filter(t => {
            const price = Number(t.price) || 0;
            const min = priceFilter.minPrice ? Number(priceFilter.minPrice.replace(/\./g, '')) : 0;
            const max = priceFilter.maxPrice ? Number(priceFilter.maxPrice.replace(/\./g, '')) : Infinity;
            const match = price >= min && price <= max;
            console.log(`Tour ${t.name}: price=${price}, min=${min}, max=${max}, match=${match}`);
            return match;
          });
          console.log(`Price filter: ${beforeFilter} -> ${data.length} tours`);
        }
        
        /*
        // Lọc theo danh mục nếu có chọn
        if (selectedCategory) {
          console.log('Filtering by category...');
          const beforeFilter = data.length;
          data = data.filter(t => {
            const match = t.cateID && (t.cateID._id === selectedCategory || t.cateID.name === selectedCategory);
            console.log(`Tour ${t.name}: cateID=${t.cateID?._id}, match=${match}`);
            return match;
          });
          console.log(`Category filter: ${beforeFilter} -> ${data.length} tours`);
        }
        // Lọc theo tháng/năm nếu có chọn
        if (selectedMonth && selectedYear) {
          data = data.filter(t => {
            if (!t.created_at) return true;
            const d = new Date(t.created_at);
            return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
          });
        }
        // Lọc theo filter từ TourFilter
        if (tourFilter) {
          // Lọc theo ngày
          if (tourFilter.date === 'today') {
            const today = new Date();
            data = data.filter(t => {
              if (!t.created_at) return true;
              const d = new Date(t.created_at);
              return d.toDateString() === today.toDateString();
            });
          } else if (tourFilter.date === 'tomorrow') {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            data = data.filter(t => {
              if (!t.created_at) return true;
              const d = new Date(t.created_at);
              return d.toDateString() === tomorrow.toDateString();
            });
          }
          // Lọc theo giá
          if (tourFilter.price) {
            data = data.filter(t => {
              const price = Number(t.price) || 0;
              return price >= tourFilter.price[0] && price <= tourFilter.price[1];
            });
          }
          // Lọc xác nhận tức thời (giả sử có trường instantConfirm)
          if (tourFilter.instant) {
            data = data.filter(t => t.instantConfirm === true);
          }
        }
        */
        // Tìm min/max giá từ dữ liệu (sau khi lọc)
        if (data.length > 0) {
          const prices = data.map(t => Number(t.price) || 0);
          const min = Math.min(...prices);
          const max = Math.max(...prices);
          setMinPrice(min);
          setMaxPrice(max);
          setPriceRange(prev => (prev[0] === 0 && prev[1] === 10000000) ? [min, max] : prev);
        }
        console.log('=== FINAL TOURS BEFORE SET STATE ===');
        console.log('Final tours count:', data.length);
        console.log('Final tours data:', data);
        console.log('=====================================');
        setTours(data);
        // Lấy danh sách province duy nhất từ tất cả tour
        const provinces = [...new Set(data.map(t => t.province).filter(Boolean))];
        setProvinceList(provinces);
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
    getSuppliers().then(data => {
      console.log('=== SUPPLIERS LOADED IN TOUR.JS ===');
      console.log('Suppliers data from API:', data);
      console.log('Suppliers count:', data?.length);
      
      // Kiểm tra và loại bỏ duplicate IDs
      const supplierArray = Array.isArray(data) ? data : [];
      console.log('Supplier array length:', supplierArray.length);
      
      // Debug mỗi supplier
      supplierArray.forEach((supplier, index) => {
        console.log(`Supplier ${index + 1}:`, {
          _id: supplier._id,
          id: supplier.id, 
          email: supplier.email,
          first_name: supplier.first_name,
          last_name: supplier.last_name,
          name: supplier.name,
          role: supplier.role
        });
      });
      
      const ids = supplierArray.map(s => s._id || s.id);
      const uniqueIds = [...new Set(ids)];
      
      if (ids.length !== uniqueIds.length) {
        console.warn('FOUND DUPLICATE SUPPLIER IDs:', ids.filter((id, index) => ids.indexOf(id) !== index));
        console.warn('Filtering out duplicates...');
        
        // Lọc suppliers unique theo _id, giữ supplier đầu tiên cho mỗi ID
        const uniqueSuppliers = supplierArray.filter((supplier, index, self) => 
          index === self.findIndex(s => (s._id || s.id) === (supplier._id || supplier.id))
        );
        
        console.log('Original suppliers count:', supplierArray.length);
        console.log('Unique suppliers count:', uniqueSuppliers.length);
        setSuppliers(uniqueSuppliers);
      } else {
        console.log('No duplicate supplier IDs found');
        setSuppliers(supplierArray);
      }
      console.log('===================================');
    }).catch(error => {
      console.error('=== ERROR LOADING SUPPLIERS IN TOUR.JS ===');
      console.error('Error loading suppliers:', error);
      console.error('==========================================');
      setSuppliers([]);
    });
  }, [selectedCategory, selectedMonth, selectedYear, priceRange, tourFilter, selectedProvince, selectedCategoryForProvince, priceFilter]);

  // Initialize map when edit modal opens
  useEffect(() => {
    if (showModal && modalType === 'edit') {
      console.log('Edit modal opened, initializing map...');
      // Delay to ensure DOM is ready
      setTimeout(() => {
        initializeMap();
      }, 300);
    }

    // Cleanup when modal closes
    if (!showModal && mapInstanceRef.current) {
      console.log('Modal closed, cleaning up map...');
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
      setMapLoaded(false);
      setMapError(null);
      setIsInitializingMap(false);
    }
  }, [showModal, modalType, initializeMap]);

  // Handle location query changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (locationQuery && showModal && modalType === 'edit') {
        handleLocationSearch(locationQuery);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [locationQuery, showModal, modalType]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.position-relative')) {
        setShowSuggestions(false);
      }
    };

    if (showSuggestions) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showSuggestions]);

  const handleView = (tour) => {
    setSelectedTour(tour);
    setModalType('view');
    setShowModal(true);
  };

  const handleEdit = (tour) => {
    console.log('=== EDIT TOUR DEBUG ===');
    console.log('Selected tour object:', tour);
    console.log('Tour ID:', tour._id);
    console.log('Tour ID type:', typeof tour._id);
    console.log('Tour cateID:', tour.cateID);
    console.log('Tour cateID type:', typeof tour.cateID);
    console.log('Tour supplier_id:', tour.supplier_id);
    console.log('Tour supplier_id type:', typeof tour.supplier_id);
    console.log('Tour location:', tour.location);
    console.log('=======================');
    
    // Extract supplier ID - chỉ lưu ID string, không lưu object
    let supplierIdValue = '';
    if (tour.supplier_id && typeof tour.supplier_id === 'object') {
      supplierIdValue = tour.supplier_id._id || tour.supplier_id.id || '';
      console.log('Extracted supplier ID from object:', supplierIdValue);
    } else if (tour.supplier_id && typeof tour.supplier_id === 'string') {
      supplierIdValue = tour.supplier_id;
      console.log('Using supplier ID string:', supplierIdValue);
    }
    
    console.log('Final supplier_id value for form:', supplierIdValue);
    
    setSelectedTour(tour);
    
    // Reset form hoàn toàn trước khi set dữ liệu mới
    const newForm = { 
      name: tour.name || '',
      description: tour.description || '',
      price: tour.price || '',
      max_tickets_per_day: tour.max_tickets_per_day || 1,
      image: tour.image || [],
      location: tour.location || '',
      opening_time: tour.opening_time || '',
      closing_time: tour.closing_time || '',
      cateID: tour.cateID || { _id: '', name: '', image: '' },
      supplier_id: supplierIdValue, // Chỉ lưu ID string
      services: tour.services || []
    };
    
    console.log('=== FORM RESET DEBUG ===');
    console.log('New form object:', newForm);
    console.log('New form supplier_id:', newForm.supplier_id);
    console.log('========================');
    
    setForm(newForm);
    
    // Set location query for map search
    setLocationQuery(tour.location || '');
    setShowSuggestions(false);
    setSelectedCoordinates(null);
    
    // Reset map states
    setMapLoaded(false);
    setMapError(null);
    setIsInitializingMap(false);
    
    setModalType('edit');
    setShowModal(true);
    
    console.log('=== MODAL OPENED DEBUG ===');
    console.log('Modal type:', 'edit');
    console.log('Show modal:', true);
    console.log('==========================');
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc muốn xóa tour này?')) {
      try {
        console.log('=== DELETE TOUR DEBUG ===');
        console.log('Deleting tour with ID:', id);
        console.log('ID type:', typeof id);
        console.log('========================');
        
        await deleteTour(id);
        
        // Reload tours list after successful deletion
        console.log('Reloading tours after deletion...');
        const refreshedTours = await getToursByRole();
        if (refreshedTours && Array.isArray(refreshedTours)) {
          setTours(refreshedTours);
        } else {
          // Fallback to local deletion if refresh fails
          setTours(tours.filter(t => t._id !== id));
        }
        
        console.log('Tour deleted successfully');
      } catch (error) {
        console.error('Error deleting tour:', error);
        // Error toast is already handled in the API function
      }
    }
  };

  const handleAdd = () => {
    navigate('/add-tour');
  };

  // Hàm xử lý approve tour (chỉ dành cho admin)
  const handleApproveTour = async (tourId, approved = true) => {
    // Kiểm tra quyền admin trước khi thực hiện
    if (userRole !== 'admin') {
      alert('Bạn không có quyền thực hiện hành động này!');
      return;
    }

    try {
      await approveTour(tourId, approved);
      
      // Reload tours sau khi approve/reject
      console.log('Reloading tours after approval...');
      const data = await getToursByRole();
      setTours(data);
      
      // Toast message đã được hiển thị trong API, không cần alert thêm
      console.log('Tour approval completed successfully');
    } catch (error) {
      console.error('Error approving tour:', error);
      
      // Toast error message đã được hiển thị trong API, không cần alert thêm
      console.log('Error toast should be displayed by API layer');
    }
  };

  // Hàm xử lý thay đổi trạng thái tour (chỉ dành cho admin)
  const handleToggleStatus = async (tourId, currentStatus) => {
    // Kiểm tra quyền admin trước khi thực hiện
    if (userRole !== 'admin') {
      alert('Bạn không có quyền thực hiện hành động này!');
      return;
    }

    console.log('=== HANDLE TOGGLE STATUS DEBUG ===');
    console.log('Tour ID:', tourId);
    console.log('Current Status:', currentStatus);
    console.log('User Role:', userRole);
    console.log('===================================');

    // Test endpoints trước khi toggle
    console.log('Testing available endpoints...');
    await testEndpoints(tourId);

    try {
      const isCurrentlyActive = currentStatus === 'active';
      const newStatus = !isCurrentlyActive;
      
      console.log('Is Currently Active:', isCurrentlyActive);
      console.log('New Status (boolean):', newStatus);
      
      await toggleTourStatus(tourId, newStatus);
      
      // Reload tours sau khi thay đổi trạng thái
      console.log('Reloading tours after status change...');
      const data = await getToursByRole();
      setTours(data);
      
      // Toast message đã được hiển thị trong API, không cần alert thêm
      console.log('Status toggle completed successfully');
    } catch (error) {
      console.error('=== FRONTEND ERROR DETAILS ===');
      console.error('Error toggling tour status:', error);
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Error response status:', error.response?.status);
      console.error('Error response data:', error.response?.data);
      console.error('==============================');
      
      // Toast error message đã được hiển thị trong API, không cần alert thêm
      console.log('Error toast should be displayed by API layer');
    }
  };

  const handleFormChange = (e) => {
    // Hỗ trợ cả event từ input/select và object từ CKEditor
    if (e && e.target) {
      const { name, value } = e.target;
      if (name.startsWith('cateID.')) {
        // Handle category selection by name, find the actual category object
        const selectedCategory = categories.find(cat => cat.name === value);
        setForm({ ...form, cateID: selectedCategory || { _id: '', name: value } });
      } else if (name === 'supplier_id') {
        console.log('=== SUPPLIER SELECTION DEBUG ===');
        console.log('Selected supplier ID:', value);
        console.log('Available suppliers:', suppliers);
        console.log('Current form before change:', form);
        
        // Tìm supplier object từ danh sách để debug, nhưng chỉ lưu ID
        const selectedSupplier = suppliers.find(sup => (sup._id === value) || (sup.id === value));
        
        console.log('Found supplier:', selectedSupplier);
        console.log('Will save supplier_id as:', value);
        
        // Chỉ lưu ID string của supplier, không lưu object
        const newForm = { ...form, supplier_id: value };
        console.log('New form after supplier change:', newForm);
        console.log('===============================');
        
        setForm(newForm);
      } else if (name === 'price') {
        // Handle price formatting
        const raw = value.replace(/\D/g, '');
        const formatted = formatNumberVN(raw);
        setForm({ ...form, [name]: formatted });
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
        console.log('=== FORM SUBMIT DEBUG ===');
        console.log('Selected tour:', selectedTour);
        console.log('Form data:', form);
        console.log('Selected tour ID:', selectedTour?._id);
        console.log('ID exists:', !!selectedTour?._id);
        
        if (!selectedTour || !selectedTour._id) {
          alert('Lỗi: Không tìm thấy ID tour để cập nhật');
          return;
        }
        
        // Check if tour still exists in current tours list
        const tourExists = tours.find(t => t._id === selectedTour._id);
        if (!tourExists) {
          alert('Lỗi: Tour không còn tồn tại trong danh sách. Vui lòng refresh trang.');
          setShowModal(false);
          return;
        }
        
        console.log('Tour exists in current list:', !!tourExists);
        
        // Find the selected supplier object from suppliers list
        const selectedSupplierObject = suppliers.find(sup => 
          (sup.id && sup.id === form.supplier_id) || 
          (sup._id && sup._id === form.supplier_id)
        );
        
        console.log('=== SUPPLIER OBJECT PREPARATION ===');
        console.log('Form supplier_id:', form.supplier_id);
        console.log('Found supplier object:', selectedSupplierObject);
        console.log('Suppliers available:', suppliers.length);
        console.log('====================================');
        
        // Prepare data for update - match exact API format
        const updateData = {
          name: form.name,
          description: form.description,
          price: typeof form.price === 'string' ? Number(form.price.replace(/\./g, '')) : Number(form.price),
          max_tickets_per_day: Number(form.max_tickets_per_day) || 1,
          image: Array.isArray(form.image) ? form.image : [form.image || ''],
          cateID: form.cateID?._id || null,
          supplier_id: form.supplier_id || null, // Send string ID to backend
          location: form.location,
          opening_time: form.opening_time,
          closing_time: form.closing_time,
          services: (form.services || []).map(service => ({
            name: service.name,
            type: service.type,
            options: (service.options || []).map(option => ({
              title: option.title,
              price_extra: Number(option.price_extra) || 0,
              description: option.description || ''
            }))
          }))
        };
        
        console.log('=== FINAL FORM DATA DEBUG ===');
        console.log('Current form object:', form);
        console.log('Form supplier_id value:', form.supplier_id);
        console.log('Form supplier_id type:', typeof form.supplier_id);
        console.log('UpdateData supplier_id:', updateData.supplier_id);
        console.log('Data being sent to API:', updateData);
        console.log('=============================');
        console.log('Form cateID object:', form.cateID);
        console.log('Original tour cateID:', selectedTour.cateID);
        console.log('Tour ID being sent:', selectedTour._id);
        console.log('API call: updateTour(' + selectedTour._id + ', updateData)');
        console.log('========================');
        
        const updated = await updateTour(selectedTour._id, updateData);
        
        console.log('API Response:', updated);
        console.log('API Response supplier_id:', updated.supplier_id);
        console.log('API Response supplier_id type:', typeof updated.supplier_id);
        
        // Ensure we have complete data structure, merge with current form data if needed
        const updatedTour = {
          ...selectedTour,  // Keep original data as fallback
          ...updated,       // Apply API response
          ...updateData,    // Ensure our form data is preserved
          _id: selectedTour._id,  // Preserve ID
          // Preserve populated fields that might not be returned by API
          cateID: updated.cateID && typeof updated.cateID === 'object' ? updated.cateID : selectedTour.cateID,
          // IMPORTANT: Store the complete supplier object for display purposes
          supplier_id: selectedSupplierObject || updated.supplier_id || selectedTour.supplier_id
        };
        
        console.log('=== UPDATED TOUR PROCESSING ===');
        console.log('Selected supplier object to store:', selectedSupplierObject);
        console.log('Final supplier_id in updatedTour:', updatedTour.supplier_id);
        console.log('Final supplier_id type:', typeof updatedTour.supplier_id);
        console.log('Form data supplier_id:', updateData.supplier_id);
        console.log('Final supplier_id used:', updatedTour.supplier_id);
        console.log('Final updated tour object:', updatedTour);
        console.log('Final cateID:', updatedTour.cateID);
        console.log('===============================');
        
        // Update both tours list and selectedTour
        setTours(tours.map(t => t._id === selectedTour._id ? updatedTour : t));
        setSelectedTour(updatedTour);  // Update selectedTour for immediate view update
        
        // Reload tours list to ensure data consistency (optional but recommended)
        try {
          const refreshedTours = await getToursByRole();
          if (refreshedTours && Array.isArray(refreshedTours)) {
            setTours(refreshedTours);
            // Find and update selectedTour from refreshed data
            const refreshedSelectedTour = refreshedTours.find(t => t._id === selectedTour._id);
            if (refreshedSelectedTour) {
              setSelectedTour(refreshedSelectedTour);
            }
          }
        } catch (refreshError) {
          console.warn('Warning: Could not refresh tours list:', refreshError);
          // Continue with local update if refresh fails
        }
        
        alert('Cập nhật tour thành công!');
        
        // Switch back to view mode to see updated data
        setModalType('view');
        setForm({});  // Clear form data
        setShowModal(false);
      } catch (err) {
        console.error('Error updating tour:', err);
        alert('Lỗi khi cập nhật tour: ' + (err.message || 'Unknown error'));
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
  // const isDark = document.body.classList.contains('dark-mode');
  const isDark = false; // Luôn dùng theme sáng

  // Hàm format số có dấu chấm ngăn cách
  function formatNumberVN(value) {
    if (!value) return '';
    // Xóa ký tự không phải số
    const number = value.toString().replace(/\D/g, '');
    return number.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  // Debug tours trước khi render
  console.log('=== RENDER DEBUG ===');
  console.log('tours length:', tours.length);
  console.log('pagedTours length:', pagedTours.length);
  console.log('loading:', loading);
  console.log('error:', error);
  console.log('currentPage:', currentPage);
  console.log('tours data:', tours);
  console.log('pagedTours data:', pagedTours);
  console.log('===================');

  return (
    <div className={`content-wrapper bg-white text-dark`} style={{ position: 'relative' }}>
      {/* Overlay loading */}
      {loading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(255,255,255,0.7)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div className="spinner-border text-primary" style={{ width: 60, height: 60 }} role="status">
            <span className="sr-only">Đang tải...</span>
          </div>
        </div>
      )}
      <div className={`content-header bg-white text-dark`}>
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <div className="d-flex align-items-center">
                <h1 className={isDark ? 'text-light' : 'text-dark'}>Quản lý Tour</h1>
                {isAdmin() && (
                  <small className="text-muted ml-3">
                    <i className="fas fa-info-circle mr-1"></i>
                    Hiển thị tất cả tours (đã duyệt và chờ duyệt)
                  </small>
                )}
                {userRole === 'supplier' && (
                  <small className="text-muted ml-3">
                    <i className="fas fa-info-circle mr-1"></i>
                    Hiển thị tours của bạn
                  </small>
                )}
              </div>
            </div>
            <div className="col-sm-6 d-flex justify-content-end align-items-center">
              <ol className="breadcrumb float-sm-right mb-0 mr-3">
                <li className="breadcrumb-item"><a href="#">Home</a></li>
                <li className="breadcrumb-item active">Tour</li>
              </ol>
              
            </div>
          </div>
        </div>
      </div>
      <section className="content">
        <div className="container-fluid">
          <div className="row">
            
            <div className="col-md-12">
              <div className="row">
                <div className="col-12 mb-3">
                  {/* Row 1: Category and Province filters */}
                  <div className="d-flex flex-wrap align-items-center mb-2">
                    <select value={selectedCategory} onChange={e => { setSelectedCategory(e.target.value); setCurrentPage(1); }} className="form-control w-auto mr-2 mb-2">
                      <option value="">Tất cả danh mục</option>
                      {categories.map(cate => (
                        <option key={cate._id} value={cate._id}>{cate.name}</option>
                      ))}
                    </select>
                    <select value={selectedProvince} onChange={e => { setSelectedProvince(e.target.value); setCurrentPage(1); }} className="form-control w-auto mr-2 mb-2">
                      <option value="">Tất cả địa điểm</option>
                      {provinceList.map(province => (
                        <option key={province} value={province}>{province}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Row 2: Price filters */}
                  <div className="d-flex flex-wrap align-items-center mb-2">
                    <div className="d-flex align-items-center mr-3 mb-2">
                      <span className="text-muted mr-2">Giá từ:</span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Tối thiểu"
                        style={{ width: '100px' }}
                        value={priceFilter.minPrice}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          const formatted = value ? value.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : '';
                          setPriceFilter(prev => ({ ...prev, minPrice: formatted }));
                          setCurrentPage(1);
                        }}
                      />
                      <span className="mx-2">-</span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Tối đa"
                        style={{ width: '100px' }}
                        value={priceFilter.maxPrice}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          const formatted = value ? value.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : '';
                          setPriceFilter(prev => ({ ...prev, maxPrice: formatted }));
                          setCurrentPage(1);
                        }}
                      />
                      <span className="text-muted ml-2">VNĐ</span>
                    </div>
                    
                    {/* Quick price filter buttons */}
                    <div className="d-flex flex-wrap align-items-center mr-2 mb-2">
                      <span className="text-muted mr-2">Nhanh:</span>
                      <button 
                        className="btn btn-outline-info btn-sm mr-1 mb-1"
                        onClick={() => {
                          setPriceFilter({ minPrice: '', maxPrice: '500.000' });
                          setCurrentPage(1);
                        }}
                      >
                        &lt; 500K
                      </button>
                      <button 
                        className="btn btn-outline-info btn-sm mr-1 mb-1"
                        onClick={() => {
                          setPriceFilter({ minPrice: '500.000', maxPrice: '1.000.000' });
                          setCurrentPage(1);
                        }}
                      >
                        500K - 1M
                      </button>
                      <button 
                        className="btn btn-outline-info btn-sm mr-1 mb-1"
                        onClick={() => {
                          setPriceFilter({ minPrice: '1.000.000', maxPrice: '3.000.000' });
                          setCurrentPage(1);
                        }}
                      >
                        1M - 3M
                      </button>
                      <button 
                        className="btn btn-outline-info btn-sm mb-1"
                        onClick={() => {
                          setPriceFilter({ minPrice: '3.000.000', maxPrice: '' });
                          setCurrentPage(1);
                        }}
                      >
                        &gt; 3M
                      </button>
                    </div>
                  </div>
                  
                  {/* Row 3: Clear filters button */}
                  {(selectedProvince || selectedCategory || priceFilter.minPrice || priceFilter.maxPrice) && (
                    <div className="d-flex align-items-center">
                      <button className="btn btn-outline-secondary btn-sm" onClick={() => { 
                        setSelectedProvince(''); 
                        setSelectedCategory(''); 
                        setPriceFilter({ minPrice: '', maxPrice: '' });
                        setCurrentPage(1); 
                      }}>
                        <i className="fas fa-times mr-1"></i>
                        Xóa tất cả bộ lọc
                      </button>
                      <span className="text-muted ml-3">
                        <i className="fas fa-filter mr-1"></i>
                        Đang lọc: {[
                          selectedCategory && `Danh mục`,
                          selectedProvince && `Địa điểm`, 
                          (priceFilter.minPrice || priceFilter.maxPrice) && `Giá`
                        ].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                </div>
                {/* Bảng tour */}
                <div className="col-md-12">
                  {userRole === 'supplier' && (
                    <div className="mb-3">
                      <button className="btn btn-primary mr-2" onClick={handleAdd}>Thêm Tour mới</button>
                      <button className="btn btn-success btn-sm mr-2" onClick={() => {
                        setSelectedCategory('');
                        setSelectedProvince('');
                        setPriceFilter({ minPrice: '', maxPrice: '' });
                        setCurrentPage(1);
                        window.location.reload(); // Force refresh
                      }}>Reset & Refresh</button>
                    </div>
                  )}
                  {!userRole === 'supplier' && (
                    <div className="mb-3">
                      <button className="btn btn-success btn-sm mr-2" onClick={() => {
                        setSelectedCategory('');
                        setSelectedProvince('');
                        setPriceFilter({ minPrice: '', maxPrice: '' });
                        setCurrentPage(1);
                        window.location.reload(); // Force refresh
                      }}>Reset & Refresh</button>
                    </div>
                  )}
                  {loading && <div>Đang tải dữ liệu...</div>}
                  {error && <div className="alert alert-danger">{error}</div>}
                  {!loading && !error && (
                    <>
                      <div className="mb-2">
                        <small className="text-muted">
                          <i className="fas fa-info-circle mr-1"></i>
                          Debug Info: Tổng {tours.length} tours, hiển thị {pagedTours.length} tours trang {currentPage}
                          {selectedCategory && `, đã lọc theo danh mục: ${categories.find(c => c._id === selectedCategory)?.name}`}
                          {selectedProvince && `, đã lọc theo địa điểm: ${selectedProvince}`}
                        </small>
                      </div>
                      <div className={`card`}>
                        <div className="card-body">
                          <table className={`table table-bordered`}>
                            <thead>
                              <tr>
                                <th>Tên Tour</th>
                                <th>Địa điểm</th>
                                <th>Giá </th>
                                <th>Thời gian hoạt động</th>
                                <th>Danh mục</th>
                                <th>Trạng thái</th>
                                {isAdmin() && <th>Nhà cung cấp</th>}
                                <th>Hành động</th>
                              </tr>
                            </thead>
                            <tbody>
                              {/* Debug logs commented for performance
                               console.log('=== RENDERING TBODY ===') || 
                               console.log('pagedTours for render:', pagedTours) || 
                               console.log('selectedProvince:', selectedProvince) || 
                               console.log('selectedCategory:', selectedCategory) || 
                               '' */}
                              {pagedTours.length === 0 && (
                                <tr>
                                  <td colSpan="8" className="text-center text-muted">
                                    Không có tour nào để hiển thị
                                  </td>
                                </tr>
                              )}
                              {pagedTours.map((tour, index) => {
                                console.log(`Rendering tour ${index}:`, tour.name);
                                return (
                                  <tr key={`tour-${tour._id}-${index}`}>
                                    <td>{tour.name}</td>
                                    <td>{tour.location}</td>
                                    <td>
                                      {Number(tour.price).toLocaleString('vi-VN')}VNĐ
                                    </td>
                                    <td>
                                      {(tour.opening_time || tour.open_time || 'N/A') + ' - ' + (tour.closing_time || tour.close_time || 'N/A')}
                                    </td>
                                    <td>{tour.cateID?.name}</td>
                                    <td>
                                      <span className={`badge badge-${
                                        tour.status === 'requested' ? 'warning' : 
                                        tour.status === 'active' ? 'success' : 
                                        tour.status === 'deactive' ? 'danger' : 
                                        'secondary'
                                      }`}>
                                        {tour.status === 'requested' ? 'Chờ duyệt' : 
                                         tour.status === 'active' ? 'Active' :
                                         tour.status === 'deactive' ? 'Deactive' : tour.status}
                                      </span>
                                    </td>
                                    {isAdmin() && (
                                      <td>
                                        {(() => {
                                          // Debug supplier data (commented for performance)
                                          // console.log('=== SUPPLIER DEBUG FOR TOUR ===');
                                          // console.log('Tour ID:', tour._id);
                                          // console.log('Tour Name:', tour.name);
                                          // console.log('Supplier ID raw:', tour.supplier_id);
                                          
                                          // Check for null or undefined first - FIXED CONDITION
                                          if (!tour.supplier_id) {
                                            return (
                                              <div className="text-muted">
                                                <i className="fas fa-exclamation-triangle mr-1"></i>
                                                Chưa có nhà cung cấp
                                              </div>
                                            );
                                          }
                                          
                                          // If supplier_id is just an ID string (not populated), tìm từ suppliers list
                                          if (typeof tour.supplier_id === 'string') {
                                            console.log('Searching for supplier ID:', tour.supplier_id);
                                            console.log('Available suppliers:', suppliers);
                                            
                                            // Tìm supplier từ danh sách đã load (ưu tiên field 'id' trước, sau đó '_id')
                                            const foundSupplier = suppliers.find(sup => sup.id === tour.supplier_id) ||
                                                                suppliers.find(sup => sup._id === tour.supplier_id);
                                            
                                            console.log('Found supplier by ID lookup:', foundSupplier);
                                            
                                            if (foundSupplier) {
                                              // Ưu tiên fullName, sau đó ghép first_name + last_name, cuối cùng là name
                                              const supplierName = foundSupplier.fullName || 
                                                                  `${foundSupplier.first_name || ''} ${foundSupplier.last_name || ''}`.trim() || 
                                                                  foundSupplier.name || 'Tên không xác định';
                                              
                                              return (
                                                <div>
                                                  <div className="font-weight-bold text-success">
                                                    {supplierName}
                                                  </div>
                                                  {foundSupplier.email && (
                                                    <small className="text-muted">
                                                      <i className="fas fa-envelope mr-1"></i>
                                                      {foundSupplier.email}
                                                    </small>
                                                  )}
                                                  {foundSupplier.phone && (
                                                    <small className="text-muted d-block">
                                                      <i className="fas fa-phone mr-1"></i>
                                                      {foundSupplier.phone}
                                                    </small>
                                                  )}
                                                </div>
                                              );
                                            } else {
                                              return (
                                                <div className="text-warning">
                                                  <i className="fas fa-search mr-1"></i>
                                                  ID: {tour.supplier_id}
                                                  <br />
                                                  <small className="text-muted">(Không tìm thấy thông tin supplier)</small>
                                                </div>
                                              );
                                            }
                                          }
                                          
                                          // If supplier_id is an object (populated) and not null
                                          if (typeof tour.supplier_id === 'object' && tour.supplier_id !== null) {
                                            // Ưu tiên fullName, sau đó ghép first_name + last_name, cuối cùng là name  
                                            const supplierName = tour.supplier_id.fullName ||
                                                                `${tour.supplier_id.first_name || ''} ${tour.supplier_id.last_name || ''}`.trim() || 
                                                                tour.supplier_id.name || 'Tên không xác định';
                                            
                                            return (
                                              <div>
                                                <div className="font-weight-bold">
                                                  {supplierName}
                                                </div>
                                                {tour.supplier_id.email && (
                                                  <small className="text-muted">
                                                    <i className="fas fa-envelope mr-1"></i>
                                                    {tour.supplier_id.email}
                                                  </small>
                                                )}
                                                {tour.supplier_id.phone && (
                                                  <small className="text-muted d-block">
                                                    <i className="fas fa-phone mr-1"></i>
                                                    {tour.supplier_id.phone}
                                                  </small>
                                                )}
                                              </div>
                                            );
                                          }
                                          
                                          return (
                                            <div className="text-danger">
                                              <i className="fas fa-bug mr-1"></i>
                                              Lỗi dữ liệu supplier
                                            </div>
                                          );
                                        })()}
                                      </td>
                                    )}
                                    <td>
                                      <button className="btn btn-info btn-sm mr-2" onClick={() => handleView(tour)}>
                                        <i className="fas fa-eye mr-1"></i> Xem
                                      </button>
                                      {(userRole === 'supplier' || isAdmin()) && (
                                        <button className="btn btn-warning btn-sm mr-2" onClick={() => handleEdit(tour)}>
                                          <i className="fas fa-edit mr-1"></i> Sửa
                                        </button>
                                      )}
                                      {isAdmin() && tour.status === 'requested' && (
                                        <>
                                          <button 
                                            className="btn btn-success btn-sm mr-2" 
                                            onClick={() => handleApproveTour(tour._id, true)}
                                            title="Duyệt tour"
                                          >
                                            <i className="fas fa-check mr-1"></i> Duyệt
                                          </button>
                                          <button 
                                            className="btn btn-danger btn-sm mr-2" 
                                            onClick={() => handleApproveTour(tour._id, false)}
                                            title="Từ chối tour"
                                          >
                                            <i className="fas fa-times mr-1"></i> Từ chối
                                          </button>
                                        </>
                                      )}
                                      {isAdmin() && (tour.status === 'active' || tour.status === 'deactive') && (
                                        <button 
                                          className={`btn btn-sm mr-2 ${tour.status === 'active' ? 'btn-warning' : 'btn-success'}`}
                                          onClick={() => handleToggleStatus(tour._id, tour.status)}
                                          title={tour.status === 'active' ? 'Hủy kích hoạt tour' : 'Kích hoạt tour'}
                                        >
                                          <i className={`fas ${tour.status === 'active' ? 'fa-eye-slash' : 'fa-eye'} mr-1`}></i>
                                          {tour.status === 'active' ? 'Deactive' : 'Active'}
                                        </button>
                                      )}
                                      {userRole === 'supplier' && (
                                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(tour._id)}>
                                          <i className="fas fa-trash mr-1"></i> Xóa
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
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
              </div>
            </div>
          </div>
        </div>
      </section>
      <footer className="main-footer bg-white text-dark">
        <div className="float-right d-none d-sm-block">
          <b>Version</b> 3.2.0
        </div>
        <strong>Copyright &copy; 2014-2021 <a href="https://adminlte.io">AdminLTE.io</a>.</strong> All rights reserved.
      </footer>
      {showModal && (
        <div className="modal show d-block" tabIndex="-1" role="dialog" style={{ background: 'rgba(0,0,0,0.3)' }}>
        <div
          className="modal-dialog modal-lg"
          role="document"
          style={{
            maxWidth: 900,
            width: '100%',
            maxHeight: 'calc(100vh - 40px)',
            margin: '20px auto',
            boxSizing: 'border-box',
          }}
        >
            <div className="modal-content bg-white text-dark" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 100px)' }}>
              <div className="modal-header bg-light">
                <h5 className="modal-title">
                  {modalType === 'view' && 'Chi tiết Tour'}
                  {modalType === 'edit' && userRole === 'supplier' && 'Sửa Tour của bạn'}
                  {modalType === 'edit' && userRole === 'admin' && 'Sửa Tour'}
                  {modalType === 'add' && 'Thêm Tour mới'}
                  {modalType === 'edit' && userRole === 'supplier' && (
                    <small className="text-muted ml-2">
                      <i className="fas fa-info-circle mr-1"></i>
                      Bạn chỉ có thể sửa thông tin cơ bản
                    </small>
                  )}
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
                        <img key={`view-img-${selectedTour._id}-${idx}`} src={img} alt="tour" style={{ width: 180, height: 120, objectFit: 'cover', marginRight: 8, marginBottom: 8, borderRadius: 8, boxShadow: '0 2px 8px #ccc' }} />
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
                        <b>Giá:</b> <span className="ml-1 text-primary font-weight-bold">{Number(selectedTour.price).toLocaleString('vi-VN')} VNĐ</span>
                      </div>
                      <div className="col-md-6 mb-2">
                        <b>Số vé tối đa/ngày:</b> <span className="ml-1">{selectedTour.max_tickets_per_day || 'N/A'} vé</span>
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
                        <b>Đánh giá:</b> <span className="ml-1">{selectedTour.rating ? `${selectedTour.rating} ★` : 'Chưa có'}</span>
                      </div>
                      <div className="col-md-6 mb-2">
                        <b>Giờ mở cửa:</b> <span className="ml-1">{selectedTour.opening_time || selectedTour.open_time || 'N/A'}</span>
                      </div>
                      <div className="col-md-6 mb-2">
                        <b>Giờ đóng cửa:</b> <span className="ml-1">{selectedTour.closing_time || selectedTour.close_time || 'N/A'}</span>
                      </div>
                      <div className="col-md-6 mb-2">
                        <b>Trạng thái:</b> 
                        <span className={`ml-1 badge badge-${
                          selectedTour.status === 'requested' ? 'warning' : 
                          selectedTour.status === 'active' ? 'success' : 
                          selectedTour.status === 'deactive' ? 'danger' : 
                          'secondary'
                        }`}>
                          {selectedTour.status === 'requested' ? 'Chờ duyệt' : 
                           selectedTour.status === 'active' ? 'Active' :
                           selectedTour.status === 'deactive' ? 'Deactive' : selectedTour.status}
                        </span>
                      </div>
                      {isAdmin() && (
                        <div className="col-md-6 mb-2">
                          <b>Nhà cung cấp:</b> <span className="ml-1">
                            {selectedTour.supplier_id ? (
                              <div>
                                <div className="font-weight-bold d-inline">
                                  {`${selectedTour.supplier_id.first_name || ''} ${selectedTour.supplier_id.last_name || ''}`.trim() || 
                                   selectedTour.supplier_id.name || 'Tên không xác định'}
                                </div>
                                {selectedTour.supplier_id.email && (
                                  <div className="mt-1">
                                    <small className="text-muted">
                                      <i className="fas fa-envelope mr-1"></i>
                                      Email: {selectedTour.supplier_id.email}
                                    </small>
                                  </div>
                                )}
                                {selectedTour.supplier_id.phone && (
                                  <div className="mt-1">
                                    <small className="text-muted">
                                      <i className="fas fa-phone mr-1"></i>
                                      Điện thoại: {selectedTour.supplier_id.phone}
                                    </small>
                                  </div>
                                )}
                                {selectedTour.supplier_id.address && (
                                  <div className="mt-1">
                                    <small className="text-muted">
                                      <i className="fas fa-map-marker-alt mr-1"></i>
                                      Địa chỉ: {selectedTour.supplier_id.address}
                                    </small>
                                  </div>
                                )}
                              </div>
                            ) : 'N/A'}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="mt-3">
                      <b>Mô tả:</b>
                      <div style={{ maxHeight: 250, overflowY: 'auto', border: '1px solid #eee', borderRadius: 6, padding: 12, background: '#fafbfc', marginTop: 6 }}>
                        <span dangerouslySetInnerHTML={{ __html: selectedTour.description }} />
                      </div>
                    </div>
                    
                    {/* Services Section - View Mode */}
                    <div className="mt-3">
                      <b><i className="fas fa-concierge-bell mr-2 text-info"></i>Dịch vụ đi kèm:</b>
                      {selectedTour.services && selectedTour.services.length > 0 ? (
                        <div className="row mt-2">
                          {selectedTour.services.map((service, serviceIndex) => (
                            <div key={serviceIndex} className="col-md-6 mb-3">
                              <div className="card h-100 shadow-sm">
                                <div className="card-body p-3">
                                  <div className="d-flex align-items-center mb-2">
                                    <h6 className="card-title mb-0 text-primary">
                                      <i className="fas fa-cog mr-1"></i>
                                      {service.name}
                                    </h6>
                                    <span className={`ml-auto badge ${service.type === 'single' ? 'badge-info' : 'badge-success'}`}>
                                      {service.type === 'single' ? 'Chọn một' : 'Chọn nhiều'}
                                    </span>
                                  </div>
                                  
                                  {service.options && service.options.length > 0 ? (
                                    <div className="mt-2">
                                      <small className="text-muted font-weight-bold d-block mb-1">Tùy chọn:</small>
                                      {service.options.map((option, optionIndex) => (
                                        <div key={optionIndex} className="d-flex justify-content-between align-items-center py-1 border-bottom">
                                          <div>
                                            <span className="font-weight-medium">{option.title}</span>
                                            {option.description && (
                                              <div>
                                                <small className="text-muted">{option.description}</small>
                                              </div>
                                            )}
                                          </div>
                                          {option.price_extra > 0 && (
                                            <span className="badge badge-warning">
                                              +{option.price_extra.toLocaleString('vi-VN')} VNĐ
                                            </span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-muted text-center py-2">
                                      <small><i className="fas fa-info-circle mr-1"></i>Chưa có tùy chọn nào</small>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="alert alert-light mt-2 mb-0">
                          <div className="d-flex align-items-center">
                            <i className="fas fa-info-circle mr-2 text-muted"></i>
                            <span className="text-muted">Chưa có dịch vụ đi kèm nào cho tour này.</span>
                          </div>
                        </div>
                      )}
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
                          <div className="position-relative">
                            <input 
                              type="text" 
                              className="form-control bg-light" 
                              name="location" 
                              value={locationQuery}
                              onChange={(e) => {
                                const value = e.target.value;
                                setLocationQuery(value);
                                setForm(prev => ({ ...prev, location: value }));
                              }}
                              onFocus={() => {
                                if (locationSuggestions.length > 0) {
                                  setShowSuggestions(true);
                                }
                              }}
                              placeholder="Nhập địa điểm hoặc click trên bản đồ..."
                              required 
                            />
                            
                            {/* Loading indicator */}
                            {isSearching && (
                              <div className="position-absolute" style={{ right: '10px', top: '50%', transform: 'translateY(-50%)' }}>
                                <div className="spinner-border spinner-border-sm" role="status">
                                  <span className="sr-only">Đang tìm...</span>
                                </div>
                              </div>
                            )}
                            
                            {/* Search suggestions */}
                            {showSuggestions && locationSuggestions.length > 0 && (
                              <div className="map-search-suggestions">
                                {locationSuggestions.map((suggestion, index) => (
                                  <div
                                    key={index}
                                    className="map-search-suggestion"
                                    onClick={() => selectLocation(suggestion)}
                                  >
                                    <i className="fas fa-map-marker-alt mr-2 text-primary"></i>
                                    {suggestion.display_name}
                                    <small className="text-muted ml-2">
                                      ({suggestion.type === 'local' ? 'Địa điểm Việt Nam' : 'Tìm kiếm online'})
                                    </small>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          {/* Map container */}
                          <div className="mt-3">
                            <div 
                              ref={mapRef}
                              style={{ 
                                height: '450px', 
                                width: '100%',
                                border: '1px solid #ddd',
                                borderRadius: '4px'
                              }}
                            >
                              {/* Map will be initialized here */}
                            </div>
                            
                            {/* Map status indicators */}
                            {isInitializingMap && (
                              <div className="text-center mt-2">
                                <small className="text-muted">
                                  <i className="fas fa-spinner fa-spin mr-1"></i>
                                  Đang khởi tạo bản đồ...
                                </small>
                              </div>
                            )}
                            
                            {mapError && (
                              <div className="alert alert-warning mt-2 mb-0">
                                <i className="fas fa-exclamation-triangle mr-1"></i>
                                Lỗi tải bản đồ: {mapError}
                              </div>
                            )}
                            
                            {mapLoaded && !mapError && selectedCoordinates && (
                              <div className="alert alert-info mt-2 mb-0">
                                <i className="fas fa-check-circle mr-1"></i>
                                Đã chọn vị trí: {selectedCoordinates.lat.toFixed(6)}, {selectedCoordinates.lng.toFixed(6)}
                              </div>
                            )}
                            
                            <small className="text-muted">
                              Click trên bản đồ để chọn vị trí chính xác cho tour của bạn
                            </small>
                          </div>
                        </div>
                        <div className="form-row">
                          <div className="form-group col-md-6">
                            <label><FaTag className="mr-1" />Giá vé</label>
                            <div className="input-group">
                              <input
                                type="text"
                                className="form-control bg-light"
                                name="price"
                                value={formatNumberVN(form.price)}
                                onChange={handleFormChange}
                                required
                              />
                              <div className="input-group-append">
                                <span className="input-group-text">VNĐ</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="form-group">
                          <label><i className="fas fa-ticket-alt mr-1" />Số lượng vé tối đa trong ngày</label>
                          <div className="input-group">
                            <input 
                              type="number" 
                              className="form-control bg-light" 
                              name="max_tickets_per_day" 
                              value={form.max_tickets_per_day || ''} 
                              onChange={handleFormChange} 
                              required 
                              min="1"
                              step="1"
                              placeholder="Nhập số lượng vé tối đa"
                            />
                            <div className="input-group-append">
                              <span className="input-group-text">vé</span>
                            </div>
                          </div>
                          <small className="text-muted">Số lượng vé tối đa có thể bán trong một ngày</small>
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
                        
                        {/* Supplier selector - chỉ hiển thị cho admin */}
                        {isAdmin() && (
                          <div className="form-group">
                            <label>
                              <i className="fas fa-building mr-1"></i>
                              Nhà cung cấp
                            </label>
                            <select 
                              className="form-control bg-light" 
                              name="supplier_id" 
                              value={(() => {
                                const currentValue = typeof form.supplier_id === 'object' ? 
                                  (form.supplier_id._id || form.supplier_id.id || '') : 
                                  form.supplier_id || '';
                                console.log('=== DROPDOWN VALUE DEBUG ===');
                                console.log('Form supplier_id:', form.supplier_id);
                                console.log('Dropdown current value:', currentValue);
                                console.log('============================');
                                return currentValue;
                              })()} 
                              onChange={handleFormChange} 
                              required
                            >
                              <option value="">-- Chọn nhà cung cấp --</option>
                              {suppliers.map(supplier => {
                                const supplierId = supplier.id || supplier._id; // Ưu tiên 'id' trước
                                // Ưu tiên fullName, sau đó ghép first_name + last_name, cuối cùng là name
                                const supplierName = supplier.fullName || 
                                                    `${supplier.first_name || ''} ${supplier.last_name || ''}`.trim() || 
                                                    supplier.name || 'Tên không xác định';
                                
                                // Debug cho option được selected
                                const isSelected = (typeof form.supplier_id === 'object' ? 
                                  (form.supplier_id._id || form.supplier_id.id || '') : 
                                  form.supplier_id || '') === supplierId;
                                
                                if (isSelected) {
                                  console.log('=== SELECTED SUPPLIER DEBUG ===');
                                  console.log('Selected supplier:', supplier);
                                  console.log('Selected supplier ID:', supplierId);
                                  console.log('Selected supplier name:', supplierName);
                                  console.log('Form supplier_id value:', form.supplier_id);
                                  console.log('==============================');
                                }
                                
                                return (
                                  <option key={supplierId} value={supplierId}>
                                    {supplierName}
                                    {supplier.email && ` (${supplier.email})`}
                                  </option>
                                );
                              })}
                            </select>
                            <small className="text-muted">
                              Chọn nhà cung cấp sở hữu tour này
                            </small>
                          </div>
                        )}
                        <div className="form-row">
                          <div className="form-group col-md-6">
                            <label><i className="fas fa-clock mr-1" />Giờ mở cửa</label>
                            <input type="time" className="form-control bg-light" name="opening_time" value={form.opening_time || ''} onChange={handleFormChange} required />
                          </div>
                          <div className="form-group col-md-6">
                            <label><i className="fas fa-clock mr-1" />Giờ đóng cửa</label>
                            <input type="time" className="form-control bg-light" name="closing_time" value={form.closing_time || ''} onChange={handleFormChange} required />
                          </div>
                        </div>
                        <div className="form-group">
                          <label><span className="mr-1"><i className="fas fa-image" /></span>Ảnh (chọn nhiều ảnh)</label>
                          <input type="file" className="form-control-file" accept="image/*" multiple onChange={handleImageUpload} />
                          <div className="d-flex flex-wrap mt-2">
                            {form.image && form.image.map((img, idx) => (
                              <img key={`form-img-${idx}-${form.name || 'new'}-${Date.now()}`} src={img} alt="tour" style={{ width: 60, height: 40, objectFit: 'cover', marginRight: 8, marginBottom: 8 }} />
                            ))}
                          </div>
                        </div>
                        {/* Services Section - Improved */}
                        <div className="form-group">
                          <div className="d-flex align-items-center justify-content-between mb-3">
                            <label className="mb-0"><i className="fas fa-concierge-bell mr-2" />Dịch vụ đi kèm</label>
                            <button
                              type="button"
                              className="btn btn-outline-success btn-sm"
                              onClick={() => {
                                const newService = {
                                  name: '',
                                  type: 'single',
                                  options: [{ title: '', price_extra: 0, description: '' }]
                                };
                                setForm({ ...form, services: [...(form.services || []), newService] });
                              }}
                            >
                              <i className="fas fa-plus mr-1"></i>Thêm dịch vụ
                            </button>
                          </div>
                          
                          {(!form.services || form.services.length === 0) && (
                            <div className="alert alert-info">
                              <div className="d-flex align-items-center">
                                <i className="fas fa-info-circle mr-2"></i>
                                <div>
                                  <strong>Chưa có dịch vụ nào.</strong> Click "Thêm dịch vụ" để thêm các dịch vụ đi kèm cho tour của bạn.
                                  <br />
                                  <small className="text-muted">
                                    Ví dụ: Hướng dẫn viên, Bữa ăn, Phòng khách sạn, v.v.
                                  </small>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="border rounded p-3" style={{ backgroundColor: '#f8f9fa', maxHeight: '400px', overflowY: 'auto' }}>
                            {form.services && form.services.map((service, serviceIndex) => (
                              <div key={serviceIndex} className="mb-3 p-3 border rounded bg-white shadow-sm">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                  <h6 className="mb-0 text-primary">
                                    <i className="fas fa-cog mr-1"></i>
                                    Dịch vụ {serviceIndex + 1}
                                  </h6>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => {
                                      const newServices = form.services.filter((_, idx) => idx !== serviceIndex);
                                      setForm({ ...form, services: newServices });
                                    }}
                                    title="Xóa dịch vụ này"
                                  >
                                    <i className="fas fa-trash"></i>
                                  </button>
                                </div>
                                
                                <div className="form-row mb-3">
                                  <div className="col-md-8">
                                    <label className="font-weight-bold">Tên dịch vụ</label>
                                    <input
                                      type="text"
                                      className="form-control"
                                      value={service.name || ''}
                                      onChange={(e) => {
                                        const newServices = [...form.services];
                                        newServices[serviceIndex].name = e.target.value;
                                        setForm({ ...form, services: newServices });
                                      }}
                                      placeholder="Ví dụ: Hướng dẫn viên du lịch"
                                    />
                                  </div>
                                  <div className="col-md-4">
                                    <label className="font-weight-bold">Loại lựa chọn</label>
                                    <select
                                      className="form-control"
                                      value={service.type || 'single'}
                                      onChange={(e) => {
                                        const newServices = [...form.services];
                                        newServices[serviceIndex].type = e.target.value;
                                        setForm({ ...form, services: newServices });
                                      }}
                                    >
                                      <option value="single">Chọn một (Single)</option>
                                      <option value="multiple">Chọn nhiều (Multiple)</option>
                                    </select>
                                    <small className="text-muted">
                                      {service.type === 'single' ? 'Khách hàng chỉ chọn 1 tùy chọn' : 'Khách hàng có thể chọn nhiều tùy chọn'}
                                    </small>
                                  </div>
                                </div>

                                <div className="mb-2">
                                  <div className="d-flex align-items-center justify-content-between">
                                    <label className="font-weight-bold mb-0">Tùy chọn dịch vụ</label>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-primary"
                                      onClick={() => {
                                        const newServices = [...form.services];
                                        if (!newServices[serviceIndex].options) {
                                          newServices[serviceIndex].options = [];
                                        }
                                        newServices[serviceIndex].options.push({ title: '', price_extra: 0, description: '' });
                                        setForm({ ...form, services: newServices });
                                      }}
                                    >
                                      <i className="fas fa-plus mr-1"></i>Thêm tùy chọn
                                    </button>
                                  </div>
                                </div>

                                {service.options && service.options.map((option, optionIndex) => (
                                  <div key={optionIndex} className="mb-2 p-2 border rounded" style={{ backgroundColor: '#fdfdfd' }}>
                                    <div className="form-row align-items-center">
                                      <div className="col-md-4">
                                        <label className="small font-weight-bold">Tên tùy chọn</label>
                                        <input
                                          type="text"
                                          className="form-control form-control-sm"
                                          placeholder="Ví dụ: Hướng dẫn viên tiếng Anh"
                                          value={option.title || ''}
                                          onChange={(e) => {
                                            const newServices = [...form.services];
                                            newServices[serviceIndex].options[optionIndex].title = e.target.value;
                                            setForm({ ...form, services: newServices });
                                          }}
                                        />
                                      </div>
                                      <div className="col-md-3">
                                        <label className="small font-weight-bold">Giá phụ thu (VNĐ)</label>
                                        <input
                                          type="text"
                                          className="form-control form-control-sm"
                                          placeholder="0"
                                          value={option.price_extra ? option.price_extra.toLocaleString('vi-VN') : '0'}
                                          onChange={(e) => {
                                            const newServices = [...form.services];
                                            // Remove all dots and convert to number
                                            const numericValue = parseInt(e.target.value.replace(/\./g, '')) || 0;
                                            newServices[serviceIndex].options[optionIndex].price_extra = numericValue;
                                            setForm({ ...form, services: newServices });
                                          }}
                                          onBlur={(e) => {
                                            // Format number on blur
                                            const newServices = [...form.services];
                                            const numericValue = parseInt(e.target.value.replace(/\./g, '')) || 0;
                                            newServices[serviceIndex].options[optionIndex].price_extra = numericValue;
                                            setForm({ ...form, services: newServices });
                                          }}
                                        />
                                      </div>
                                      <div className="col-md-4">
                                        <label className="small font-weight-bold">Mô tả ngắn</label>
                                        <input
                                          type="text"
                                          className="form-control form-control-sm"
                                          placeholder="Mô tả chi tiết..."
                                          value={option.description || ''}
                                          onChange={(e) => {
                                            const newServices = [...form.services];
                                            newServices[serviceIndex].options[optionIndex].description = e.target.value;
                                            setForm({ ...form, services: newServices });
                                          }}
                                        />
                                      </div>
                                      <div className="col-md-1 text-center">
                                        <label className="small d-block">&nbsp;</label>
                                        <button
                                          type="button"
                                          className="btn btn-sm btn-outline-danger"
                                          onClick={() => {
                                            const newServices = [...form.services];
                                            newServices[serviceIndex].options = newServices[serviceIndex].options.filter((_, idx) => idx !== optionIndex);
                                            setForm({ ...form, services: newServices });
                                          }}
                                          title="Xóa tùy chọn này"
                                          disabled={service.options.length === 1}
                                        >
                                          <i className="fas fa-times"></i>
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                                
                                {(!service.options || service.options.length === 0) && (
                                  <div className="text-center text-muted py-2">
                                    <i className="fas fa-info-circle mr-1"></i>
                                    Chưa có tùy chọn nào. Click "Thêm tùy chọn" để thêm.
                                  </div>
                                )}
                              </div>
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
                      <div className="d-flex justify-content-between align-items-center">
                        <button type="submit" className="btn btn-success">
                          <i className="fas fa-save mr-1"></i>Lưu thay đổi
                        </button>
                        {userRole === 'supplier' && (
                          <small className="text-muted">
                            <i className="fas fa-info-circle mr-1"></i>
                            Thay đổi sẽ được cập nhật ngay lập tức
                          </small>
                        )}
                        {isAdmin() && (
                          <small className="text-muted">
                            <i className="fas fa-user-cog mr-1"></i>
                            Bạn đang sửa tour với quyền Admin
                          </small>
                        )}
                      </div>
                    )}
                  </form>
                )}
              </div>
              {/* Footer cho modal edit */}
              {modalType === 'edit' && (
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                    <i className="fas fa-times mr-1"></i>Hủy
                  </button>
                  {userRole === 'supplier' && (
                    <small className="text-muted mr-auto">
                      <i className="fas fa-info-circle mr-1"></i>
                      Bạn đang chỉnh sửa tour của mình
                    </small>
                  )}
                  {isAdmin() && (
                    <small className="text-muted mr-auto">
                      <i className="fas fa-user-shield mr-1"></i>
                      Admin có thể chỉnh sửa mọi tour trong hệ thống
                    </small>
                  )}
                </div>
              )}
              {modalType === 'view' && selectedTour && (
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                    <i className="fas fa-times mr-1"></i>Đóng
                  </button>
                  {isAdmin() && selectedTour.status === 'requested' && (
                    <>
                      <button 
                        type="button" 
                        className="btn btn-success" 
                        onClick={() => {
                          handleApproveTour(selectedTour._id, true);
                          setShowModal(false);
                        }}
                      >
                        <i className="fas fa-check mr-1"></i>Duyệt Tour
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-danger" 
                        onClick={() => {
                          handleApproveTour(selectedTour._id, false);
                          setShowModal(false);
                        }}
                      >
                        <i className="fas fa-times mr-1"></i>Từ chối Tour
                      </button>
                    </>
                  )}
                  {isAdmin() && (selectedTour.status === 'active' || selectedTour.status === 'deactive') && (
                    <>
                      <button 
                        type="button" 
                        className={`btn ${selectedTour.status === 'active' ? 'btn-warning' : 'btn-success'}`}
                        onClick={() => {
                          handleToggleStatus(selectedTour._id, selectedTour.status);
                          setShowModal(false);
                        }}
                      >
                        <i className={`fas ${selectedTour.status === 'active' ? 'fa-eye-slash' : 'fa-eye'} mr-1`}></i>
                        {selectedTour.status === 'active' ? 'Deactive Tour' : 'Active Tour'}
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-danger" 
                        onClick={() => {
                          handleDelete(selectedTour._id);
                          setShowModal(false);
                        }}
                      >
                        <i className="fas fa-trash mr-1"></i>Xóa Tour
                      </button>
                    </>
                  )}
                  {userRole === 'supplier' && (
                    <>
                      <button 
                        type="button" 
                        className="btn btn-warning mr-2" 
                        onClick={() => handleEdit(selectedTour)}
                      >
                        <i className="fas fa-edit mr-1"></i>Sửa Tour
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-danger" 
                        onClick={() => {
                          handleDelete(selectedTour._id);
                          setShowModal(false);
                        }}
                      >
                        <i className="fas fa-trash mr-1"></i>Xóa Tour
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Tour;
