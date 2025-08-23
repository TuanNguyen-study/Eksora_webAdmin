import axios from 'axios';

const AxiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Set up Axios interceptors (same as in main api.js)
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

// API để debug và xác định cấu trúc dữ liệu của tours
export const debugTourDataStructure = async () => {
  try {
    console.log('=== DEBUGGING TOUR DATA STRUCTURE ===');
    
    // 1. Test API call without populate
    console.log('🔍 TESTING API WITHOUT POPULATE:');
    const rawResponse = await AxiosInstance.get('/api/tours');
    console.log('Raw API response (first tour):', rawResponse.data?.[0]);
    
    // 2. Test API call with populate
    console.log('🔍 TESTING API WITH POPULATE:');
    const populatedResponse = await AxiosInstance.get('/api/tours?populate=supplier_id,cateID');
    console.log('Populated API response (first tour):', populatedResponse.data?.[0]);
    
    // 3. Analyze each tour's data structure
    if (Array.isArray(populatedResponse.data) && populatedResponse.data.length > 0) {
      console.log('🔍 ANALYZING TOUR DATA STRUCTURE:');
      
      populatedResponse.data.slice(0, 3).forEach((tour, index) => {
        console.log(`\n--- TOUR ${index + 1}: ${tour.name} ---`);
        
        // Basic fields
        console.log('📋 BASIC FIELDS:');
        console.log('  _id:', {
          value: tour._id,
          type: typeof tour._id,
          isObjectId: typeof tour._id === 'string' && tour._id.match(/^[0-9a-fA-F]{24}$/)
        });
        
        console.log('  name:', {
          value: tour.name,
          type: typeof tour.name
        });
        
        console.log('  description:', {
          value: tour.description?.substring(0, 50) + '...',
          type: typeof tour.description,
          length: tour.description?.length
        });
        
        console.log('  price:', {
          value: tour.price,
          type: typeof tour.price,
          isNumber: !isNaN(tour.price)
        });
        
        console.log('  price_child:', {
          value: tour.price_child,
          type: typeof tour.price_child,
          isNumber: !isNaN(tour.price_child)
        });
        
        console.log('  max_tickets_per_day:', {
          value: tour.max_tickets_per_day,
          type: typeof tour.max_tickets_per_day,
          isNumber: !isNaN(tour.max_tickets_per_day)
        });
        
        console.log('  location:', {
          value: tour.location,
          type: typeof tour.location
        });
        
        console.log('  rating:', {
          value: tour.rating,
          type: typeof tour.rating,
          isNumber: !isNaN(tour.rating)
        });
        
        console.log('  status:', {
          value: tour.status,
          type: typeof tour.status
        });
        
        // Time fields
        console.log('📅 TIME FIELDS:');
        console.log('  opening_time:', {
          value: tour.opening_time,
          type: typeof tour.opening_time
        });
        
        console.log('  closing_time:', {
          value: tour.closing_time,
          type: typeof tour.closing_time
        });
        
        console.log('  createdAt:', {
          value: tour.createdAt,
          type: typeof tour.createdAt,
          isDate: tour.createdAt ? new Date(tour.createdAt).toString() : 'Invalid'
        });
        
        console.log('  updatedAt:', {
          value: tour.updatedAt,
          type: typeof tour.updatedAt,
          isDate: tour.updatedAt ? new Date(tour.updatedAt).toString() : 'Invalid'
        });
        
        // Array fields
        console.log('📷 ARRAY FIELDS:');
        console.log('  image:', {
          value: tour.image,
          type: typeof tour.image,
          isArray: Array.isArray(tour.image),
          length: Array.isArray(tour.image) ? tour.image.length : 0,
          firstItem: Array.isArray(tour.image) && tour.image.length > 0 ? {
            value: tour.image[0]?.substring(0, 50) + '...',
            type: typeof tour.image[0]
          } : 'No items'
        });
        
        // Coordinate fields
        console.log('📍 COORDINATE FIELDS:');
        console.log('  lat:', {
          value: tour.lat,
          type: typeof tour.lat,
          isNumber: !isNaN(tour.lat)
        });
        
        console.log('  lng:', {
          value: tour.lng,
          type: typeof tour.lng,
          isNumber: !isNaN(tour.lng)
        });
        
        // CRITICAL: Supplier ID analysis
        console.log('🏢 SUPPLIER_ID ANALYSIS:');
        console.log('  supplier_id RAW:', tour.supplier_id);
        console.log('  supplier_id TYPE:', typeof tour.supplier_id);
        console.log('  supplier_id IS_NULL:', tour.supplier_id === null);
        console.log('  supplier_id IS_UNDEFINED:', tour.supplier_id === undefined);
        console.log('  supplier_id IS_STRING:', typeof tour.supplier_id === 'string');
        console.log('  supplier_id IS_OBJECT:', tour.supplier_id !== null && typeof tour.supplier_id === 'object');
        
        if (typeof tour.supplier_id === 'string') {
          console.log('  supplier_id STRING_LENGTH:', tour.supplier_id.length);
          console.log('  supplier_id IS_OBJECTID_FORMAT:', tour.supplier_id.match(/^[0-9a-fA-F]{24}$/));
        }
        
        if (tour.supplier_id && typeof tour.supplier_id === 'object') {
          console.log('  supplier_id OBJECT_KEYS:', Object.keys(tour.supplier_id));
          console.log('  supplier_id._id:', {
            value: tour.supplier_id._id,
            type: typeof tour.supplier_id._id
          });
          console.log('  supplier_id.first_name:', {
            value: tour.supplier_id.first_name,
            type: typeof tour.supplier_id.first_name
          });
          console.log('  supplier_id.last_name:', {
            value: tour.supplier_id.last_name,
            type: typeof tour.supplier_id.last_name
          });
          console.log('  supplier_id.email:', {
            value: tour.supplier_id.email,
            type: typeof tour.supplier_id.email
          });
          console.log('  supplier_id.role:', {
            value: tour.supplier_id.role,
            type: typeof tour.supplier_id.role
          });
        }
        
        // Category ID analysis
        console.log('🏷️ CATEID ANALYSIS:');
        console.log('  cateID RAW:', tour.cateID);
        console.log('  cateID TYPE:', typeof tour.cateID);
        console.log('  cateID IS_STRING:', typeof tour.cateID === 'string');
        console.log('  cateID IS_OBJECT:', tour.cateID !== null && typeof tour.cateID === 'object');
        
        if (typeof tour.cateID === 'string') {
          console.log('  cateID STRING_LENGTH:', tour.cateID.length);
          console.log('  cateID IS_OBJECTID_FORMAT:', tour.cateID.match(/^[0-9a-fA-F]{24}$/));
        }
        
        if (tour.cateID && typeof tour.cateID === 'object') {
          console.log('  cateID OBJECT_KEYS:', Object.keys(tour.cateID));
          console.log('  cateID._id:', {
            value: tour.cateID._id,
            type: typeof tour.cateID._id
          });
          console.log('  cateID.name:', {
            value: tour.cateID.name,
            type: typeof tour.cateID.name
          });
        }
        
        // Other possible fields
        console.log('🔍 OTHER FIELDS:');
        const knownFields = ['_id', 'name', 'description', 'price', 'price_child', 'max_tickets_per_day', 
                            'location', 'rating', 'status', 'opening_time', 'closing_time', 'createdAt', 
                            'updatedAt', 'image', 'lat', 'lng', 'supplier_id', 'cateID'];
        const otherFields = Object.keys(tour).filter(key => !knownFields.includes(key));
        
        otherFields.forEach(field => {
          console.log(`  ${field}:`, {
            value: tour[field],
            type: typeof tour[field]
          });
        });
      });
    }
    
    // 4. Summary
    console.log('\n🔍 DATA STRUCTURE SUMMARY:');
    console.log('Total tours:', populatedResponse.data?.length || 0);
    console.log('API populate working:', populatedResponse.data?.[0]?.supplier_id && typeof populatedResponse.data[0].supplier_id === 'object');
    
    return {
      rawData: rawResponse.data,
      populatedData: populatedResponse.data,
      summary: {
        totalTours: populatedResponse.data?.length || 0,
        populateWorking: populatedResponse.data?.[0]?.supplier_id && typeof populatedResponse.data[0].supplier_id === 'object'
      }
    };
    
  } catch (error) {
    console.error('❌ Error debugging tour data structure:', error);
    throw error;
  }
};
