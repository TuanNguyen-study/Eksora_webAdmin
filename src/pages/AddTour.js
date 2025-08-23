import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCategories, getSuppliers, createTour, getCurrentUserRole, getUser } from '../api/api';
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

  /* Responsive design for map */
  @media (max-width: 768px) {
    .leaflet-container {
      height: 350px !important;
    }
    
    .map-container {
      margin-bottom: 15px;
    }
    
    .btn-group .btn {
      font-size: 12px;
      padding: 4px 8px;
    }
  }

  @media (max-width: 576px) {
    .leaflet-container {
      height: 300px !important;
    }
    
    .btn-group {
      display: flex;
      flex-wrap: wrap;
      gap: 2px;
    }
    
    .btn-group .btn {
      flex: 1;
      min-width: auto;
    }
  }
`;

// Inject styles
if (!document.getElementById('map-custom-styles')) {
  const styleElement = document.createElement('style');
  styleElement.id = 'map-custom-styles';
  styleElement.textContent = mapStyles;
  document.head.appendChild(styleElement);
}

function AddTour() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '', // Giá vé
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
  // OpenStreetMap integration với Leaflet
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [isInitializingMap, setIsInitializingMap] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Find nearby known location from our database
  const findNearbyKnownLocation = useCallback((lat, lng) => {
    const knownLocations = [
      { name: 'Hà Nội', lat: 21.0285, lng: 105.8542 },
      { name: 'Hồ Chí Minh', lat: 10.8231, lng: 106.6297 },
      { name: 'Đà Nẵng', lat: 16.0544, lng: 108.2022 },
      { name: 'Cần Thơ', lat: 10.0452, lng: 105.7469 },
      { name: 'Hải Phòng', lat: 20.8449, lng: 106.6881 },
      { name: 'Đà Lạt', lat: 11.9404, lng: 108.4583 },
      { name: 'Nha Trang', lat: 12.2388, lng: 109.1967 },
      { name: 'Hội An', lat: 15.8801, lng: 108.3380 },
      { name: 'Hạ Long', lat: 20.9101, lng: 107.1839 },
      { name: 'Vũng Tàu', lat: 10.4113, lng: 107.1362 },
      { name: 'Phú Quốc', lat: 10.2899, lng: 103.9840 },
      { name: 'Sa Pa', lat: 22.3364, lng: 103.8438 }
    ];

    let nearest = null;
    let minDistance = Infinity;

    knownLocations.forEach(location => {
      const distance = Math.sqrt(
        Math.pow(lat - location.lat, 2) + Math.pow(lng - location.lng, 2)
      );
      if (distance < minDistance && distance < 1.0) { // Within ~111km
        minDistance = distance;
        nearest = location;
      }
    });

    return nearest;
  }, []);

  // Get general location context based on coordinates
  const getLocationContext = useCallback((lat, lng) => {
    // Northern Vietnam
    if (lat > 20) {
      return 'Miền Bắc Việt Nam';
    }
    // Central Vietnam
    else if (lat > 12) {
      return 'Miền Trung Việt Nam';
    }
    // Southern Vietnam
    else {
      return 'Miền Nam Việt Nam';
    }
  }, []);

  // Improved reverse geocoding with multiple fallback strategies
  const performReverseGeocoding = useCallback(async (lat, lng) => {
    try {
      // Strategy 1: Use CodeTabs proxy
      const response = await fetch(
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=vi,en`)}`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.display_name) {
          const input = document.getElementById('location-input');
          if (input) input.value = data.display_name;
          setForm(f => ({ ...f, location: data.display_name }));
          return;
        }
      }
    } catch (error) {
      console.log('CodeTabs reverse geocoding failed, trying AllOrigins...');
    }

    try {
      // Strategy 2: Use AllOrigins proxy
      const proxyResponse = await fetch(
        `https://api.allorigins.win/get?url=${encodeURIComponent(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=vi,en`)}`
      );
      
      if (proxyResponse.ok) {
        const result = await proxyResponse.json();
        const data = JSON.parse(result.contents);
        
        if (data.display_name) {
          const input = document.getElementById('location-input');
          if (input) input.value = data.display_name;
          setForm(f => ({ ...f, location: data.display_name }));
          return;
        }
      }
    } catch (error) {
      console.log('AllOrigins reverse geocoding failed...');
    }

    try {
      // Strategy 3: Try to find nearby known location from our database
      const nearbyLocation = findNearbyKnownLocation(lat, lng);
      if (nearbyLocation) {
        const locationText = `${nearbyLocation.name} (ước tính)`;
        const input = document.getElementById('location-input');
        if (input) input.value = locationText;
        setForm(f => ({ ...f, location: locationText }));
        return;
      }
    } catch (error) {
      console.log('Nearby location lookup failed...');
    }

    // Fallback: Use coordinates with location context
    const locationContext = getLocationContext(lat, lng);
    const locationText = `${locationContext} - Tọa độ: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    const input = document.getElementById('location-input');
    if (input) input.value = locationText;
    setForm(f => ({ ...f, location: locationText }));
  }, [findNearbyKnownLocation, getLocationContext]);

  // Initialize OpenStreetMap với Leaflet - improved version
  const initializeMap = useCallback(async () => {
    console.log('=== MAP INITIALIZATION DEBUG ===');
    console.log('mapRef.current:', mapRef.current);
    console.log('isInitializingMap:', isInitializingMap);
    console.log('mapInstanceRef.current:', mapInstanceRef.current);
    console.log('================================');
    
    if (!mapRef.current || isInitializingMap || mapInstanceRef.current) {
      console.log('Skipping initialization due to conditions');
      return;
    }

    setIsInitializingMap(true);
    setMapError(false);
    
    try {
      console.log('Starting map initialization...');
      
      // Default location: Hanoi
      const defaultLatLng = [21.028511, 105.804817];
      const lat = form.lat ? parseFloat(form.lat) : defaultLatLng[0];
      const lng = form.lng ? parseFloat(form.lng) : defaultLatLng[1];
      
      // Create map với improved error handling
      const map = L.map(mapRef.current, {
        center: [lat, lng],
        zoom: 13,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        dragging: true,
        zoomControl: true,
        attributionControl: true,
        preferCanvas: true // Better performance
      });
      
      // Add OpenStreetMap tiles với multiple tile servers for reliability
      const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        subdomains: ['a', 'b', 'c'],
        errorTileUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkxvYWRpbmcuLi48L3RleHQ+PC9zdmc+'
      });

      // Handle tile loading errors
      tileLayer.on('tileerror', (e) => {
        console.warn('Tile loading error:', e);
        // Try alternative tile server if original fails
        if (!e.target._alternativeUsed) {
          e.target._alternativeUsed = true;
          e.target.setUrl('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png');
        }
      });

      tileLayer.addTo(map);
      
      // Add marker with custom icon for better visibility
      const customIcon = L.divIcon({
        className: 'custom-map-marker',
        html: '<div style="background: #ff4444; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      const marker = L.marker([lat, lng], { 
        draggable: true,
        icon: customIcon 
      }).addTo(map);
      
      // Store references
      mapInstanceRef.current = map;
      markerRef.current = marker;
      
      // Handle marker drag with debouncing
      let dragTimeout;
      marker.on('dragend', (e) => {
        clearTimeout(dragTimeout);
        dragTimeout = setTimeout(async () => {
          const position = e.target.getLatLng();
          setForm(f => ({ ...f, lat: position.lat, lng: position.lng }));
          await performReverseGeocoding(position.lat, position.lng);
        }, 300);
      });
      
      // Handle map click with debouncing
      let clickTimeout;
      map.on('click', (e) => {
        clearTimeout(clickTimeout);
        clickTimeout = setTimeout(async () => {
          const { lat, lng } = e.latlng;
          marker.setLatLng([lat, lng]);
          setForm(f => ({ ...f, lat, lng }));
          await performReverseGeocoding(lat, lng);
        }, 200);
      });

      // Set map as loaded after everything is ready
      map.whenReady(() => {
        setMapLoaded(true);
        setMapError(false);
        console.log('Map loaded successfully');
        
        // Force map to resize properly - important for container sizing
        setTimeout(() => {
          if (map) {
            map.invalidateSize();
            console.log('Map size invalidated and refreshed');
          }
        }, 100);
      });

      // Handle map load error
      setTimeout(() => {
        if (!mapLoaded && map) {
          setMapLoaded(true); // Force load state even if not fully ready
          // Still try to resize
          setTimeout(() => {
            if (map) {
              map.invalidateSize();
            }
          }, 100);
        }
      }, 3000);
      
    } catch (error) {
      console.error('Error creating map:', error);
      setMapError(true);
      setMapLoaded(false);
    } finally {
      setIsInitializingMap(false);
    }
  }, [form.lat, form.lng, performReverseGeocoding]);

  useEffect(() => {
    console.log('=== MAP useEffect DEBUG ===');
    console.log('mapRef.current:', mapRef.current);
    console.log('mapInstanceRef.current:', mapInstanceRef.current);
    console.log('DOM element:', mapRef.current ? 'EXISTS' : 'NULL');
    console.log('===========================');
    
    if (mapRef.current && !mapInstanceRef.current) {
      console.log('Scheduling map initialization...');
      // Add small delay to ensure DOM is ready
      const timer = setTimeout(initializeMap, 100);
      return () => clearTimeout(timer);
    } else {
      console.log('Not scheduling map init - conditions not met');
    }
  }, [initializeMap]);

  // Cleanup function
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
        setMapLoaded(false);
      }
    };
  }, []);
  
  // Handle location input change for geocoding với improved fallback
  const handleLocationSearch = async (address) => {
    if (!address.trim()) {
      alert('Vui lòng nhập địa chỉ để tìm kiếm');
      return;
    }

    // Show loading state
    const searchButton = document.querySelector('button[onclick*="handleLocationSearch"]');
    const originalText = searchButton?.innerHTML;
    if (searchButton) {
      searchButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tìm...';
      searchButton.disabled = true;
    }
    
    // Expanded Vietnam locations database for better coverage
    const vietnamCities = {
      'hà nội': { lat: 21.0285, lng: 105.8542, name: 'Hà Nội, Việt Nam' },
      'hanoi': { lat: 21.0285, lng: 105.8542, name: 'Hà Nội, Việt Nam' },
      'hcm': { lat: 10.8231, lng: 106.6297, name: 'Hồ Chí Minh, Việt Nam' },
      'ho chi minh': { lat: 10.8231, lng: 106.6297, name: 'Hồ Chí Minh, Việt Nam' },
      'saigon': { lat: 10.8231, lng: 106.6297, name: 'Hồ Chí Minh, Việt Nam' },
      'tp hcm': { lat: 10.8231, lng: 106.6297, name: 'Hồ Chí Minh, Việt Nam' },
      'tp.hcm': { lat: 10.8231, lng: 106.6297, name: 'Hồ Chí Minh, Việt Nam' },
      'sài gòn': { lat: 10.8231, lng: 106.6297, name: 'Hồ Chí Minh, Việt Nam' },
      'đà nẵng': { lat: 16.0544, lng: 108.2022, name: 'Đà Nẵng, Việt Nam' },
      'da nang': { lat: 16.0544, lng: 108.2022, name: 'Đà Nẵng, Việt Nam' },
      'hải phòng': { lat: 20.8449, lng: 106.6881, name: 'Hải Phòng, Việt Nam' },
      'haiphong': { lat: 20.8449, lng: 106.6881, name: 'Hải Phòng, Việt Nam' },
      'đà lạt': { lat: 11.9404, lng: 108.4583, name: 'Đà Lạt, Lâm Đồng, Việt Nam' },
      'dalat': { lat: 11.9404, lng: 108.4583, name: 'Đà Lạt, Lâm Đồng, Việt Nam' },
      'nha trang': { lat: 12.2388, lng: 109.1967, name: 'Nha Trang, Khánh Hòa, Việt Nam' },
      'huế': { lat: 16.4637, lng: 107.5909, name: 'Huế, Thừa Thiên Huế, Việt Nam' },
      'hue': { lat: 16.4637, lng: 107.5909, name: 'Huế, Thừa Thiên Huế, Việt Nam' },
      'vũng tàu': { lat: 10.4113, lng: 107.1362, name: 'Vũng Tàu, Bà Rịa - Vũng Tàu, Việt Nam' },
      'vung tau': { lat: 10.4113, lng: 107.1362, name: 'Vũng Tàu, Bà Rịa - Vũng Tàu, Việt Nam' },
      'cần thơ': { lat: 10.0452, lng: 105.7469, name: 'Cần Thơ, Việt Nam' },
      'can tho': { lat: 10.0452, lng: 105.7469, name: 'Cần Thơ, Việt Nam' },
      'hạ long': { lat: 20.9101, lng: 107.1839, name: 'Hạ Long, Quảng Ninh, Việt Nam' },
      'ha long': { lat: 20.9101, lng: 107.1839, name: 'Hạ Long, Quảng Ninh, Việt Nam' },
      'phú quốc': { lat: 10.2899, lng: 103.9840, name: 'Phú Quốc, Kiên Giang, Việt Nam' },
      'phu quoc': { lat: 10.2899, lng: 103.9840, name: 'Phú Quốc, Kiên Giang, Việt Nam' },
      'sa pa': { lat: 22.3364, lng: 103.8438, name: 'Sa Pa, Lào Cai, Việt Nam' },
      'sapa': { lat: 22.3364, lng: 103.8438, name: 'Sa Pa, Lào Cai, Việt Nam' },
      'hội an': { lat: 15.8801, lng: 108.3380, name: 'Hội An, Quảng Nam, Việt Nam' },
      'hoi an': { lat: 15.8801, lng: 108.3380, name: 'Hội An, Quảng Nam, Việt Nam' },
      'mũi né': { lat: 10.9313, lng: 108.2530, name: 'Mũi Né, Bình Thuận, Việt Nam' },
      'mui ne': { lat: 10.9313, lng: 108.2530, name: 'Mũi Né, Bình Thuận, Việt Nam' },
      'quy nhon': { lat: 13.7563, lng: 109.2297, name: 'Quy Nhon, Bình Định, Việt Nam' },
      'quy nhơn': { lat: 13.7563, lng: 109.2297, name: 'Quy Nhon, Bình Định, Việt Nam' },
      'vinh': { lat: 18.6759, lng: 105.6922, name: 'Vinh, Nghệ An, Việt Nam' },
      'thái nguyên': { lat: 21.5944, lng: 105.8480, name: 'Thái Nguyên, Việt Nam' },
      'thai nguyen': { lat: 21.5944, lng: 105.8480, name: 'Thái Nguyên, Việt Nam' },
      'buôn ma thuột': { lat: 12.6667, lng: 108.0500, name: 'Buôn Ma Thuột, Đắk Lắk, Việt Nam' },
      'buon ma thuot': { lat: 12.6667, lng: 108.0500, name: 'Buôn Ma Thuột, Đắk Lắk, Việt Nam' },
      'tam cốc': { lat: 20.2416, lng: 105.9189, name: 'Tam Cốc, Ninh Bình, Việt Nam' },
      'tam coc': { lat: 20.2416, lng: 105.9189, name: 'Tam Cốc, Ninh Bình, Việt Nam' },
      'ninh bình': { lat: 20.2506, lng: 105.9756, name: 'Ninh Bình, Việt Nam' },
      'ninh binh': { lat: 20.2506, lng: 105.9756, name: 'Ninh Bình, Việt Nam' },
      'phong nha': { lat: 17.5943, lng: 106.2658, name: 'Phong Nha, Quảng Bình, Việt Nam' },
      'côn đảo': { lat: 8.6918, lng: 106.6072, name: 'Côn Đảo, Bà Rịa - Vũng Tàu, Việt Nam' },
      'con dao': { lat: 8.6918, lng: 106.6072, name: 'Côn Đảo, Bà Rịa - Vũng Tàu, Việt Nam' },
      'cà mau': { lat: 9.1768, lng: 105.1506, name: 'Cà Mau, Việt Nam' },
      'ca mau': { lat: 9.1768, lng: 105.1506, name: 'Cà Mau, Việt Nam' },
      // Add more locations for better coverage
      'bắc ninh': { lat: 21.1861, lng: 106.0763, name: 'Bắc Ninh, Việt Nam' },
      'bac ninh': { lat: 21.1861, lng: 106.0763, name: 'Bắc Ninh, Việt Nam' },
      'nam định': { lat: 20.4388, lng: 106.1621, name: 'Nam Định, Việt Nam' },
      'nam dinh': { lat: 20.4388, lng: 106.1621, name: 'Nam Định, Việt Nam' },
      'thanh hóa': { lat: 19.8067, lng: 105.7851, name: 'Thanh Hóa, Việt Nam' },
      'thanh hoa': { lat: 19.8067, lng: 105.7851, name: 'Thanh Hóa, Việt Nam' },
      'lạng sơn': { lat: 21.8537, lng: 106.7614, name: 'Lạng Sơn, Việt Nam' },
      'lang son': { lat: 21.8537, lng: 106.7614, name: 'Lạng Sơn, Việt Nam' }
    };
    
    // First, search in local database (most reliable approach)
    const searchKey = address.toLowerCase().trim();
    
    try {
      // Try exact match first
      let city = vietnamCities[searchKey];
      
      // If no exact match, try partial matching
      if (!city) {
        const cityKey = Object.keys(vietnamCities).find(key => 
          key.includes(searchKey) || 
          searchKey.includes(key) ||
          vietnamCities[key].name.toLowerCase().includes(searchKey)
        );
        
        if (cityKey) {
          city = vietnamCities[cityKey];
        }
      }

      if (city) {
        // Found in local database
        await updateMapLocation(city.lat, city.lng, city.name);
        alert(`✅ Đã tìm thấy: ${city.name}`);
        return;
      }

      // If not found in local database, try online geocoding
      await attemptOnlineGeocoding(address);

    } catch (error) {
      console.error('Search error:', error);
      handleGeocodingFallback(address);
    } finally {
      // Restore button state
      if (searchButton) {
        searchButton.innerHTML = originalText || '<i class="fas fa-search"></i> Tìm';
        searchButton.disabled = false;
      }
    }
  };

  // Attempt online geocoding with multiple strategies
  const attemptOnlineGeocoding = async (address) => {
    const searchQuery = `${address}, Vietnam`;

    // Strategy 1: Use a reliable CORS proxy service
    try {
      const proxyResponse = await fetch(
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&addressdetails=1&accept-language=vi,en`)}`
      );
      
      if (proxyResponse.ok) {
        const data = await proxyResponse.json();
        if (data && data.length > 0) {
          const location = data[0];
          const lat = parseFloat(location.lat);
          const lng = parseFloat(location.lon);
          
          await updateMapLocation(lat, lng, location.display_name);
          alert('✅ Đã tìm thấy địa điểm!');
          return;
        }
      }
    } catch (error) {
      console.log('CodeTabs proxy failed, trying AllOrigins...');
    }

    // Strategy 2: Use AllOrigins proxy (backup)
    try {
      const proxyResponse = await fetch(
        `https://api.allorigins.win/get?url=${encodeURIComponent(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&addressdetails=1&accept-language=vi,en`)}`
      );
      
      if (proxyResponse.ok) {
        const result = await proxyResponse.json();
        const data = JSON.parse(result.contents);
        
        if (data && data.length > 0) {
          const location = data[0];
          const lat = parseFloat(location.lat);
          const lng = parseFloat(location.lon);
          
          await updateMapLocation(lat, lng, location.display_name);
          alert('✅ Đã tìm thấy địa điểm!');
          return;
        }
      }
    } catch (error) {
      console.log('AllOrigins proxy failed, trying CORS.sh...');
    }

    // Strategy 3: Use CORS.sh proxy
    try {
      const proxyResponse = await fetch(
        `https://cors.sh/https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&addressdetails=1&accept-language=vi,en`,
        {
          headers: {
            'x-cors-api-key': 'temp_f8d4c8c0e8b4c5a9d7e6f3b2a1c9e8d7' // Free temporary key
          }
        }
      );
      
      if (proxyResponse.ok) {
        const data = await proxyResponse.json();
        if (data && data.length > 0) {
          const location = data[0];
          const lat = parseFloat(location.lat);
          const lng = parseFloat(location.lon);
          
          await updateMapLocation(lat, lng, location.display_name);
          alert('✅ Đã tìm thấy địa điểm!');
          return;
        }
      }
    } catch (error) {
      console.log('CORS.sh proxy failed, trying alternative geocoding...');
    }

    // Strategy 4: Use alternative geocoding service (OpenCage or similar)
    try {
      // For demo purposes, using a mock response based on common Vietnam locations
      const mockGeocoding = await mockGeocodingSearch(searchQuery);
      if (mockGeocoding) {
        await updateMapLocation(mockGeocoding.lat, mockGeocoding.lng, mockGeocoding.name);
        alert('✅ Đã tìm thấy địa điểm (dựa trên cơ sở dữ liệu mở rộng)!');
        return;
      }
    } catch (error) {
      console.log('Alternative geocoding failed...');
    }

    // If all strategies fail
    handleGeocodingFallback(address);
  };

  // Mock geocoding search for common Vietnam locations (extended database)
  const mockGeocodingSearch = async (query) => {
    const extendedLocations = {
      // Major cities
      'hà nội': { lat: 21.0285, lng: 105.8542, name: 'Hà Nội, Việt Nam' },
      'hanoi': { lat: 21.0285, lng: 105.8542, name: 'Hà Nội, Việt Nam' },
      'hồ chí minh': { lat: 10.8231, lng: 106.6297, name: 'Hồ Chí Minh, Việt Nam' },
      'ho chi minh': { lat: 10.8231, lng: 106.6297, name: 'Hồ Chí Minh, Việt Nam' },
      'đà nẵng': { lat: 16.0544, lng: 108.2022, name: 'Đà Nẵng, Việt Nam' },
      'da nang': { lat: 16.0544, lng: 108.2022, name: 'Đà Nẵng, Việt Nam' },
      'cần thơ': { lat: 10.0452, lng: 105.7469, name: 'Cần Thơ, Việt Nam' },
      'can tho': { lat: 10.0452, lng: 105.7469, name: 'Cần Thơ, Việt Nam' },
      'hải phòng': { lat: 20.8449, lng: 106.6881, name: 'Hải Phòng, Việt Nam' },
      
      // Tourist destinations
      'đà lạt': { lat: 11.9404, lng: 108.4583, name: 'Đà Lạt, Lâm Đồng, Việt Nam' },
      'nha trang': { lat: 12.2388, lng: 109.1967, name: 'Nha Trang, Khánh Hòa, Việt Nam' },
      'hội an': { lat: 15.8801, lng: 108.3380, name: 'Hội An, Quảng Nam, Việt Nam' },
      'hạ long': { lat: 20.9101, lng: 107.1839, name: 'Hạ Long, Quảng Ninh, Việt Nam' },
      'sa pa': { lat: 22.3364, lng: 103.8438, name: 'Sa Pa, Lào Cai, Việt Nam' },
      'sapa': { lat: 22.3364, lng: 103.8438, name: 'Sa Pa, Lào Cai, Việt Nam' },
      'phú quốc': { lat: 10.2899, lng: 103.9840, name: 'Phú Quốc, Kiên Giang, Việt Nam' },
      'phu quoc': { lat: 10.2899, lng: 103.9840, name: 'Phú Quốc, Kiên Giang, Việt Nam' },
      'vũng tàu': { lat: 10.4113, lng: 107.1362, name: 'Vũng Tàu, Bà Rịa - Vũng Tàu, Việt Nam' },
      'mũi né': { lat: 10.9313, lng: 108.2530, name: 'Mũi Né, Bình Thuận, Việt Nam' },
      
      // Districts and famous places
      'quận 1': { lat: 10.7769, lng: 106.7009, name: 'Quận 1, Hồ Chí Minh, Việt Nam' },
      'district 1': { lat: 10.7769, lng: 106.7009, name: 'Quận 1, Hồ Chí Minh, Việt Nam' },
      'hoàn kiếm': { lat: 21.0285, lng: 105.8542, name: 'Hoàn Kiếm, Hà Nội, Việt Nam' },
      'hoan kiem': { lat: 21.0285, lng: 105.8542, name: 'Hoàn Kiếm, Hà Nội, Việt Nam' },
      'old quarter': { lat: 21.0285, lng: 105.8542, name: 'Phố Cổ, Hà Nội, Việt Nam' },
      'phố cổ': { lat: 21.0285, lng: 105.8542, name: 'Phố Cổ, Hà Nội, Việt Nam' },
      'ben thanh': { lat: 10.7722, lng: 106.6980, name: 'Chợ Bến Thành, Hồ Chí Minh, Việt Nam' },
      'bến thành': { lat: 10.7722, lng: 106.6980, name: 'Chợ Bến Thành, Hồ Chí Minh, Việt Nam' },
      
      // Provinces
      'lâm đồng': { lat: 11.5753, lng: 108.1429, name: 'Lâm Đồng, Việt Nam' },
      'lam dong': { lat: 11.5753, lng: 108.1429, name: 'Lâm Đồng, Việt Nam' },
      'khánh hòa': { lat: 12.2585, lng: 109.0526, name: 'Khánh Hòa, Việt Nam' },
      'khanh hoa': { lat: 12.2585, lng: 109.0526, name: 'Khánh Hòa, Việt Nam' },
      'quảng nam': { lat: 15.5394, lng: 108.0191, name: 'Quảng Nam, Việt Nam' },
      'quang nam': { lat: 15.5394, lng: 108.0191, name: 'Quảng Nam, Việt Nam' },
      'quảng ninh': { lat: 21.0059, lng: 107.2925, name: 'Quảng Ninh, Việt Nam' },
      'quang ninh': { lat: 21.0059, lng: 107.2925, name: 'Quảng Ninh, Việt Nam' },
      'bình thuận': { lat: 11.0904, lng: 108.0721, name: 'Bình Thuận, Việt Nam' },
      'binh thuan': { lat: 11.0904, lng: 108.0721, name: 'Bình Thuận, Việt Nam' }
    };

    const searchKey = query.toLowerCase();
    
    // Try to find a match
    for (const [key, location] of Object.entries(extendedLocations)) {
      if (searchKey.includes(key) || key.includes(searchKey)) {
        return location;
      }
    }

    return null;
  };

  // Update map location helper
  const updateMapLocation = async (lat, lng, locationName) => {
    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.setView([lat, lng], 15);
      markerRef.current.setLatLng([lat, lng]);
    }
    
    // Update form
    setForm(f => ({ ...f, lat, lng, location: locationName }));
    
    // Update input field
    const input = document.getElementById('location-input');
    if (input) input.value = locationName;
  };

  // Get search suggestions based on input
  const getSearchSuggestions = (query) => {
    if (!query.trim() || query.length < 2) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const vietnamCities = {
      'hà nội': { lat: 21.0285, lng: 105.8542, name: 'Hà Nội, Việt Nam' },
      'hanoi': { lat: 21.0285, lng: 105.8542, name: 'Hà Nội, Việt Nam' },
      'hcm': { lat: 10.8231, lng: 106.6297, name: 'Hồ Chí Minh, Việt Nam' },
      'ho chi minh': { lat: 10.8231, lng: 106.6297, name: 'Hồ Chí Minh, Việt Nam' },
      'saigon': { lat: 10.8231, lng: 106.6297, name: 'Hồ Chí Minh, Việt Nam' },
      'tp hcm': { lat: 10.8231, lng: 106.6297, name: 'Hồ Chí Minh, Việt Nam' },
      'tp.hcm': { lat: 10.8231, lng: 106.6297, name: 'Hồ Chí Minh, Việt Nam' },
      'sài gòn': { lat: 10.8231, lng: 106.6297, name: 'Hồ Chí Minh, Việt Nam' },
      'đà nẵng': { lat: 16.0544, lng: 108.2022, name: 'Đà Nẵng, Việt Nam' },
      'da nang': { lat: 16.0544, lng: 108.2022, name: 'Đà Nẵng, Việt Nam' },
      'hải phòng': { lat: 20.8449, lng: 106.6881, name: 'Hải Phòng, Việt Nam' },
      'haiphong': { lat: 20.8449, lng: 106.6881, name: 'Hải Phòng, Việt Nam' },
      'đà lạt': { lat: 11.9404, lng: 108.4583, name: 'Đà Lạt, Lâm Đồng, Việt Nam' },
      'dalat': { lat: 11.9404, lng: 108.4583, name: 'Đà Lạt, Lâm Đồng, Việt Nam' },
      'nha trang': { lat: 12.2388, lng: 109.1967, name: 'Nha Trang, Khánh Hòa, Việt Nam' },
      'huế': { lat: 16.4637, lng: 107.5909, name: 'Huế, Thừa Thiên Huế, Việt Nam' },
      'hue': { lat: 16.4637, lng: 107.5909, name: 'Huế, Thừa Thiên Huế, Việt Nam' },
      'vũng tàu': { lat: 10.4113, lng: 107.1362, name: 'Vũng Tàu, Bà Rịa - Vũng Tàu, Việt Nam' },
      'vung tau': { lat: 10.4113, lng: 107.1362, name: 'Vũng Tàu, Bà Rịa - Vũng Tàu, Việt Nam' },
      'cần thơ': { lat: 10.0452, lng: 105.7469, name: 'Cần Thơ, Việt Nam' },
      'can tho': { lat: 10.0452, lng: 105.7469, name: 'Cần Thơ, Việt Nam' },
      'hạ long': { lat: 20.9101, lng: 107.1839, name: 'Hạ Long, Quảng Ninh, Việt Nam' },
      'ha long': { lat: 20.9101, lng: 107.1839, name: 'Hạ Long, Quảng Ninh, Việt Nam' },
      'phú quốc': { lat: 10.2899, lng: 103.9840, name: 'Phú Quốc, Kiên Giang, Việt Nam' },
      'phu quoc': { lat: 10.2899, lng: 103.9840, name: 'Phú Quốc, Kiên Giang, Việt Nam' },
      'sa pa': { lat: 22.3364, lng: 103.8438, name: 'Sa Pa, Lào Cai, Việt Nam' },
      'sapa': { lat: 22.3364, lng: 103.8438, name: 'Sa Pa, Lào Cai, Việt Nam' },
      'hội an': { lat: 15.8801, lng: 108.3380, name: 'Hội An, Quảng Nam, Việt Nam' },
      'hoi an': { lat: 15.8801, lng: 108.3380, name: 'Hội An, Quảng Nam, Việt Nam' },
      'mũi né': { lat: 10.9313, lng: 108.2530, name: 'Mũi Né, Bình Thuận, Việt Nam' },
      'mui ne': { lat: 10.9313, lng: 108.2530, name: 'Mũi Né, Bình Thuận, Việt Nam' },
      'quy nhon': { lat: 13.7563, lng: 109.2297, name: 'Quy Nhon, Bình Định, Việt Nam' },
      'quy nhơn': { lat: 13.7563, lng: 109.2297, name: 'Quy Nhon, Bình Định, Việt Nam' },
      'vinh': { lat: 18.6759, lng: 105.6922, name: 'Vinh, Nghệ An, Việt Nam' },
      'thái nguyên': { lat: 21.5944, lng: 105.8480, name: 'Thái Nguyên, Việt Nam' },
      'thai nguyen': { lat: 21.5944, lng: 105.8480, name: 'Thái Nguyên, Việt Nam' },
      'phong nha': { lat: 17.5943, lng: 106.2658, name: 'Phong Nha, Quảng Bình, Việt Nam' },
      'côn đảo': { lat: 8.6918, lng: 106.6072, name: 'Côn Đảo, Bà Rịa - Vũng Tàu, Việt Nam' },
      'con dao': { lat: 8.6918, lng: 106.6072, name: 'Côn Đảo, Bà Rịa - Vũng Tàu, Việt Nam' },
    };

    const searchKey = query.toLowerCase().trim();
    const matches = Object.keys(vietnamCities)
      .filter(key => 
        key.includes(searchKey) || 
        vietnamCities[key].name.toLowerCase().includes(searchKey)
      )
      .map(key => vietnamCities[key])
      .slice(0, 5); // Limit to 5 suggestions

    setSearchSuggestions(matches);
    setShowSuggestions(matches.length > 0);
  };

  // Handle suggestion click
  const handleSuggestionClick = async (suggestion) => {
    await updateMapLocation(suggestion.lat, suggestion.lng, suggestion.name);
    setShowSuggestions(false);
    setSearchSuggestions([]);
    alert(`✅ Đã chọn: ${suggestion.name}`);
  };

  // Get current location using browser's geolocation API
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Trình duyệt không hỗ trợ định vị!');
      return;
    }

    const button = document.querySelector('.btn-get-location');
    const originalText = button?.innerHTML;
    if (button) {
      button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang định vị...';
      button.disabled = true;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        await updateMapLocation(latitude, longitude, `Vị trí hiện tại: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        
        // Try to get address name
        await performReverseGeocoding(latitude, longitude);
        
        if (button) {
          button.innerHTML = originalText || '<i class="fas fa-location-arrow"></i> Vị trí của tôi';
          button.disabled = false;
        }
        
        alert('✅ Đã lấy vị trí hiện tại của bạn!');
      },
      (error) => {
        if (button) {
          button.innerHTML = originalText || '<i class="fas fa-location-arrow"></i> Vị trí của tôi';
          button.disabled = false;
        }
        
        let errorMessage = 'Không thể lấy vị trí hiện tại!';
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Bạn đã từ chối quyền truy cập vị trí. Vui lòng bật định vị trong trình duyệt.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Thông tin vị trí không khả dụng.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Yêu cầu định vị quá thời gian.';
            break;
          default:
            errorMessage = 'Lỗi không xác định khi lấy vị trí.';
            break;
        }
        alert('❌ ' + errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  // Reset map to default location (Hanoi)
  const resetMapToDefault = async () => {
    const defaultLat = 21.028511;
    const defaultLng = 105.804817;
    await updateMapLocation(defaultLat, defaultLng, 'Hà Nội, Việt Nam');
    alert('✅ Đã đặt lại bản đồ về Hà Nội');
  };
  
  // Fallback function when geocoding fails
  const handleGeocodingFallback = (address) => {
    alert(`❌ Không thể tìm thấy "${address}" do vấn đề kết nối.

🔍 Gợi ý tìm kiếm:
• Thử tên thành phố chính xác: "Hà Nội", "Hồ Chí Minh", "Đà Nẵng"
• Sử dụng tên tiếng Anh: "Hanoi", "Da Nang", "Ho Chi Minh"
• Thử tên vùng miền: "Sapa", "Hoi An", "Nha Trang"

🗺️ Cách khác để chọn vị trí:
1. Click trực tiếp trên bản đồ tại vị trí mong muốn
2. Kéo marker đỏ đến vị trí chính xác
3. Nhập tọa độ trực tiếp (nếu biết)

💡 Mẹo: Hãy zoom bản đồ để tìm vị trí và click vào đó!`);
  };
  
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
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
      } else if (name === 'price') {
        setForm({ ...form, [name]: formatNumber(value) });
      } else if (name === 'max_tickets_per_day') {
        // Chỉ cho phép số nguyên dương cho số lượng vé
        const numericValue = value.replace(/\D/g, '');
        setForm({ ...form, [name]: numericValue });
      } else if (name === 'location') {
        // Handle location input for geocoding
        setForm({ ...form, [name]: value });
      } else if (name === 'opening_time' || name === 'closing_time') {
        // Handle time validation
        const updatedForm = { ...form, [name]: value };
        setForm(updatedForm);
        
        // Real-time validation for time
        if (updatedForm.opening_time && updatedForm.closing_time) {
          const openTime = new Date(`1970-01-01T${updatedForm.opening_time}:00`);
          const closeTime = new Date(`1970-01-01T${updatedForm.closing_time}:00`);
          
          if (openTime >= closeTime) {
            setMissingFields(prev => ({ 
              ...prev, 
              opening_time: true, 
              closing_time: true 
            }));
          } else {
            // Clear time validation errors if times are valid
            setMissingFields(prev => ({ 
              ...prev, 
              opening_time: false, 
              closing_time: false 
            }));
          }
        }
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
    
    // Validate time: opening_time should be less than closing_time
    if (form.opening_time && form.closing_time) {
      const openTime = new Date(`1970-01-01T${form.opening_time}:00`);
      const closeTime = new Date(`1970-01-01T${form.closing_time}:00`);
      
      if (openTime >= closeTime) {
        alert('Giờ mở cửa phải nhỏ hơn giờ đóng cửa!');
        setMissingFields(prev => ({ 
          ...prev, 
          opening_time: true, 
          closing_time: true 
        }));
        return;
      }
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
      const max_tickets_per_day = Number(form.max_tickets_per_day);
      
      // Validate prices
      if (isNaN(price) || price <= 0) {
        alert('Giá vé không hợp lệ!');
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
            <div className="mb-3" style={{ minHeight: 550, maxHeight: 650, overflowY: 'auto', border: '1px solid #e0e0e0', borderRadius: 4 }}>
              <p className="font-weight-bold mb-2">Mô tả chi tiết</p>
              <CkeditorField
                name="description"
                value={form.description}
                onChange={handleFormChange}
                height={500}
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
              <div className="form-group col-md-12">  {/* Thay đổi từ col-md-6 thành col-md-12 */}
                <label>Địa điểm</label>
                <div className="input-group mb-2" style={{ position: 'relative' }}>
                  <input
                    id="location-input"
                    type="text"
                    className="form-control bg-light"
                    name="location"
                    value={form.location}
                    onChange={(e) => {
                      handleFormChange(e);
                      getSearchSuggestions(e.target.value);
                    }}
                    onFocus={(e) => {
                      if (e.target.value.length > 1) {
                        getSearchSuggestions(e.target.value);
                      }
                    }}
                    onBlur={() => {
                      // Delay hiding suggestions to allow click events
                      setTimeout(() => setShowSuggestions(false), 200);
                    }}
                    placeholder="Nhập địa chỉ để tìm kiếm (VD: Hà Nội, HCM, Đà Nẵng...)"
                    autoComplete="off"
                    required
                  />
                  <div className="input-group-append">
                    <button 
                      type="button" 
                      className="btn btn-outline-primary"
                      onClick={() => handleLocationSearch(form.location)}
                      disabled={!form.location.trim()}
                    >
                      <i className="fas fa-search"></i> Tìm
                    </button>
                  </div>
                  
                  {/* Search Suggestions Dropdown */}
                  {showSuggestions && searchSuggestions.length > 0 && (
                    <div className="map-search-suggestions">
                      {searchSuggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          className="map-search-suggestion"
                          onClick={() => handleSuggestionClick(suggestion)}
                        >
                          <i className="fas fa-map-marker-alt text-primary mr-2"></i>
                          {suggestion.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {missingFields.location && <div style={{color:'red', fontSize:13, marginTop:-8, marginBottom:8}}>Cần nhập thông tin</div>}
                <small className="text-muted mb-2 d-block">
                  <i className="fas fa-info-circle mr-1"></i>
                  <strong>OpenStreetMap miễn phí:</strong> Tìm kiếm thành phố lớn (Hà Nội, HCM, Đà Nẵng...), hoặc <strong>click trên bản đồ</strong> để chọn vị trí, <strong>kéo marker đỏ</strong> để di chuyển. Tọa độ sẽ được lưu tự động.
                </small>

                {/* Map Controls */}
                <div className="mb-2">
                  <div className="btn-group" role="group">
                    <button 
                      type="button" 
                      className="btn btn-sm btn-outline-success btn-get-location"
                      onClick={getCurrentLocation}
                      title="Sử dụng vị trí hiện tại của bạn"
                    >
                      <i className="fas fa-location-arrow"></i> Vị trí của tôi
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-sm btn-outline-primary"
                      onClick={resetMapToDefault}
                      title="Về Hà Nội"
                    >
                      <i className="fas fa-home"></i> Hà Nội
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-sm btn-outline-info"
                      onClick={() => updateMapLocation(10.8231, 106.6297, 'Hồ Chí Minh, Việt Nam')}
                      title="Đến TP.HCM"
                    >
                      <i className="fas fa-city"></i> HCM
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-sm btn-outline-warning"
                      onClick={() => updateMapLocation(16.0544, 108.2022, 'Đà Nẵng, Việt Nam')}
                      title="Đến Đà Nẵng"
                    >
                      <i className="fas fa-mountain"></i> Đà Nẵng
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => {
                        if (mapInstanceRef.current) {
                          mapInstanceRef.current.invalidateSize();
                          console.log('Map size manually refreshed');
                        }
                      }}
                      title="Sửa lỗi hiển thị bản đồ"
                    >
                      <i className="fas fa-expand-arrows-alt"></i> Resize
                    </button>
                  </div>
                </div>

                {/* Map Container with improved error handling */}
                <div className="map-container" style={{ position: 'relative' }}>
                  {/* Loading State */}
                  {!mapLoaded && !mapError && (
                    <div style={{ 
                      width: '100%', 
                      height: 400, 
                      borderRadius: 8, 
                      border: '1px solid #e0e0e0', 
                      backgroundColor: '#f8f9fa', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      flexDirection: 'column'
                    }}>
                      <div className="spinner-border text-primary mb-3" role="status">
                        <span className="sr-only">Loading...</span>
                      </div>
                      <div className="text-muted mb-2"><strong>Đang tải OpenStreetMap...</strong></div>
                      <small className="text-muted">Vui lòng chờ trong giây lát</small>
                      <button 
                        type="button" 
                        className="btn btn-sm btn-outline-primary mt-3"
                        onClick={() => {
                          setMapError(false);
                          setMapLoaded(false);
                          initializeMap();
                        }}
                      >
                        <i className="fas fa-redo"></i> Thử lại
                      </button>
                    </div>
                  )}

                  {/* Error State */}
                  {mapError && (
                    <div style={{ 
                      width: '100%', 
                      height: 400, 
                      borderRadius: 8, 
                      border: '1px solid #dc3545', 
                      backgroundColor: '#f8f9fa', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      flexDirection: 'column'
                    }}>
                      <div className="text-danger mb-2">
                        <i className="fas fa-exclamation-triangle fa-2x mb-2"></i>
                        <div><strong>Không thể tải bản đồ</strong></div>
                      </div>
                      <small className="text-muted text-center mb-3">
                        Có thể do vấn đề kết nối mạng.<br/>
                        Bạn vẫn có thể nhập tọa độ trực tiếp.
                      </small>
                      <div className="row">
                        <div className="col-6">
                          <input 
                            type="number" 
                            className="form-control form-control-sm" 
                            placeholder="Vĩ độ (lat)"
                            step="any"
                            value={form.lat || ''}
                            onChange={(e) => setForm(f => ({ ...f, lat: e.target.value }))}
                          />
                        </div>
                        <div className="col-6">
                          <input 
                            type="number" 
                            className="form-control form-control-sm" 
                            placeholder="Kinh độ (lng)"
                            step="any"
                            value={form.lng || ''}
                            onChange={(e) => setForm(f => ({ ...f, lng: e.target.value }))}
                          />
                        </div>
                      </div>
                      <button 
                        type="button" 
                        className="btn btn-sm btn-primary mt-3"
                        onClick={() => {
                          setMapError(false);
                          setMapLoaded(false);
                          initializeMap();
                        }}
                      >
                        <i className="fas fa-redo"></i> Thử lại tải bản đồ
                      </button>
                    </div>
                  )}

                  {/* Map Container - Always rendered for ref to work */}
                  <div 
                    ref={mapRef} 
                    style={{ 
                      width: '100%', 
                      height: '450px',
                      borderRadius: '8px', 
                      border: '1px solid #e0e0e0',
                      position: 'relative',
                      zIndex: 1,
                      backgroundColor: '#f8f9fa',
                      minHeight: '450px',
                      display: 'block',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                    id="leaflet-map-container"
                  ></div>

                  {/* Loading overlay */}
                  {!mapLoaded && !mapError && (
                    <div style={{ 
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      borderRadius: 8, 
                      backgroundColor: 'rgba(248, 249, 250, 0.95)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      flexDirection: 'column',
                      zIndex: 10
                    }}>
                      <div className="spinner-border text-primary mb-3" role="status">
                        <span className="sr-only">Loading...</span>
                      </div>
                      <div className="text-muted mb-2"><strong>Đang tải OpenStreetMap...</strong></div>
                      <small className="text-muted">Vui lòng chờ trong giây lát</small>
                      <button 
                        type="button" 
                        className="btn btn-sm btn-outline-primary mt-3"
                        onClick={() => {
                          console.log('Manual map reload triggered from loading overlay');
                          setMapError(false);
                          setMapLoaded(false);
                          setIsInitializingMap(false);
                          
                          // Clean up existing map
                          if (mapInstanceRef.current) {
                            mapInstanceRef.current.remove();
                            mapInstanceRef.current = null;
                            markerRef.current = null;
                          }
                          
                          // Force re-initialization
                          setTimeout(() => {
                            console.log('Starting forced re-initialization...');
                            initializeMap();
                          }, 100);
                        }}
                      >
                        <i className="fas fa-redo"></i> Thử lại
                      </button>
                    </div>
                  )}

                  {/* Map Controls Overlay */}
                  {mapLoaded && !mapError && (
                    <div style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      zIndex: 1000,
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      padding: '5px',
                      borderRadius: '5px',
                      fontSize: '12px'
                    }}>
                      <div className="text-muted">
                        <i className="fas fa-mouse-pointer"></i> Click để chọn vị trí<br/>
                        <i className="fas fa-arrows-alt"></i> Kéo marker để di chuyển
                      </div>
                    </div>
                  )}
                </div>
                {form.lat && form.lng && (
                  <div className="mt-2 p-2 bg-light rounded">
                    <div className="row">
                      <div className="col-md-6">
                        <label className="small font-weight-bold">Vĩ độ (Latitude)</label>
                        <input 
                          type="number" 
                          className="form-control form-control-sm" 
                          step="any"
                          value={form.lat || ''}
                          onChange={(e) => {
                            const newLat = parseFloat(e.target.value) || 0;
                            setForm(f => ({ ...f, lat: newLat }));
                            if (mapInstanceRef.current && markerRef.current && form.lng) {
                              mapInstanceRef.current.setView([newLat, form.lng], 13);
                              markerRef.current.setLatLng([newLat, form.lng]);
                            }
                          }}
                          placeholder="21.028511"
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="small font-weight-bold">Kinh độ (Longitude)</label>
                        <input 
                          type="number" 
                          className="form-control form-control-sm" 
                          step="any"
                          value={form.lng || ''}
                          onChange={(e) => {
                            const newLng = parseFloat(e.target.value) || 0;
                            setForm(f => ({ ...f, lng: newLng }));
                            if (mapInstanceRef.current && markerRef.current && form.lat) {
                              mapInstanceRef.current.setView([form.lat, newLng], 13);
                              markerRef.current.setLatLng([form.lat, newLng]);
                            }
                          }}
                          placeholder="105.804817"
                        />
                      </div>
                    </div>
                    <small className="text-muted">
                      <i className="fas fa-info-circle mr-1"></i>
                      Tọa độ chính xác: {parseFloat(form.lat).toFixed(6)}, {parseFloat(form.lng).toFixed(6)}
                    </small>
                  </div>
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
                {missingFields.opening_time && (
                  <div style={{color:'red', fontSize:13, marginTop:4}}>
                    {form.opening_time && form.closing_time && form.opening_time >= form.closing_time 
                      ? 'Giờ mở cửa phải nhỏ hơn giờ đóng cửa' 
                      : 'Cần nhập thông tin'}
                  </div>
                )}
                <small className="text-muted">Nhập giờ mở cửa của tour</small>
              </div>
              <div className="form-group col-md-6">
                <label>Giờ đóng cửa</label>
                <input type="time" className="form-control bg-light" name="closing_time" value={form.closing_time || ''} onChange={handleFormChange} required />
                {missingFields.closing_time && (
                  <div style={{color:'red', fontSize:13, marginTop:4}}>
                    {form.opening_time && form.closing_time && form.opening_time >= form.closing_time 
                      ? 'Giờ đóng cửa phải lớn hơn giờ mở cửa' 
                      : 'Cần nhập thông tin'}
                  </div>
                )}
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
