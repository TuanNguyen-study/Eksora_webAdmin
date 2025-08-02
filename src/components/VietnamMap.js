import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Simplified Vietnamese major cities with expanded locations
const majorCities = [
  { name: 'Hà Nội', coords: [21.0285, 105.8542], region: 'Miền Bắc', searchKeys: ['hà nội', 'hanoi', 'thủ đô'] },
  { name: 'Hạ Long', coords: [20.9101, 107.1839], region: 'Miền Bắc', searchKeys: ['hạ long', 'quảng ninh', 'halong'] },
  { name: 'Sapa', coords: [22.4856, 103.9707], region: 'Miền Bắc', searchKeys: ['sapa', 'lào cai', 'sa pa'] },
  { name: 'Đà Nẵng', coords: [16.0544, 108.2022], region: 'Miền Trung', searchKeys: ['đà nẵng', 'da nang', 'danang'] },
  { name: 'Hội An', coords: [15.8801, 108.338], region: 'Miền Trung', searchKeys: ['hội an', 'quảng nam', 'hoi an'] },
  { name: 'Huế', coords: [16.4637, 107.5909], region: 'Miền Trung', searchKeys: ['huế', 'hue', 'thừa thiên huế'] },
  { name: 'Nha Trang', coords: [12.2388, 109.1967], region: 'Miền Trung', searchKeys: ['nha trang', 'khánh hòa', 'nhatrang'] },
  { name: 'Đà Lạt', coords: [11.9404, 108.4583], region: 'Miền Trung', searchKeys: ['đà lạt', 'da lat', 'dalat', 'lâm đồng'] },
  { name: 'Hồ Chí Minh', coords: [10.8231, 106.6297], region: 'Miền Nam', searchKeys: ['hồ chí minh', 'sài gòn', 'tp.hcm', 'hcm', 'saigon'] },
  { name: 'Vũng Tàu', coords: [10.4113, 107.1362], region: 'Miền Nam', searchKeys: ['vũng tàu', 'bà rịa', 'vung tau'] },
  { name: 'Phú Quốc', coords: [10.2899, 103.9840], region: 'Miền Nam', searchKeys: ['phú quốc', 'kiên giang', 'phu quoc'] },
  { name: 'Cần Thơ', coords: [10.0452, 105.7469], region: 'Miền Nam', searchKeys: ['cần thơ', 'can tho', 'mekong'] }
];

const VietnamMap = ({ allBookings = [] }) => {
  const [cityBookingData, setCityBookingData] = useState([]);
  
  // Vietnam bounds to restrict view to Vietnam only
  const vietnamBounds = [
    [8.5, 102.0], // Southwest corner
    [23.5, 109.5]  // Northeast corner
  ];

  useEffect(() => {
    // Process booking data to match with cities
    const cityData = majorCities.map(city => {
      const cityBookings = allBookings.filter(booking => {
        const tourName = (booking.tour_id?.name || '').toLowerCase();
        const categoryName = (booking.tour_id?.cateID?.name || '').toLowerCase();
        const location = (booking.tour_id?.location || '').toLowerCase();
        
        return city.searchKeys.some(key => 
          tourName.includes(key) || 
          categoryName.includes(key) || 
          location.includes(key)
        );
      });

      const totalBookings = cityBookings.length;
      const totalGuests = cityBookings.reduce((sum, booking) => 
        sum + (booking.quantity_nguoiLon || 0) + (booking.quantity_treEm || 0), 0
      );
      const totalRevenue = cityBookings.reduce((sum, booking) => 
        sum + (booking.total_price || 0), 0
      );

      return {
        ...city,
        bookingCount: totalBookings,
        totalGuests,
        totalRevenue,
        bookings: cityBookings
      };
    });

    setCityBookingData(cityData);
  }, [allBookings]);

  return (
    <div className="vietnam-map-wrapper">
      <div className="card">
        <div className="card-header">
          <h5 className="card-title mb-0">
            <i className="fas fa-map-marked-alt mr-2"></i>
            Bản đồ Việt Nam - Thống kê Booking
          </h5>
          <div className="card-tools">
            <span className="badge badge-info">
              {cityBookingData.reduce((sum, city) => sum + city.bookingCount, 0)} tổng booking
            </span>
          </div>
        </div>
        <div className="card-body">
          <MapContainer
            bounds={vietnamBounds}
            style={{ height: '400px', width: '100%', borderRadius: '8px' }}
            className="vietnam-map"
            maxBounds={vietnamBounds}
            maxBoundsViscosity={1.0}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              maxZoom={10}
              minZoom={5}
            />
            
            {/* Cities with booking data */}
            {cityBookingData.map((city, index) => (
              <Marker
                key={index}
                position={city.coords}
              >
                <Popup maxWidth={300}>
                  <div className="city-popup">
                    <h6 className="mb-2 text-primary font-weight-bold">
                      <i className="fas fa-map-marker-alt mr-2"></i>
                      {city.name}
                    </h6>
                    <p className="mb-2 text-muted small">{city.region}</p>
                    
                    {city.bookingCount > 0 ? (
                      <div className="booking-stats">
                        <div className="row mb-2">
                          <div className="col-6">
                            <div className="stat-item text-center p-2 bg-light rounded">
                              <div className="text-primary font-weight-bold">{city.bookingCount}</div>
                              <small className="text-muted">Booking</small>
                            </div>
                          </div>
                          <div className="col-6">
                            <div className="stat-item text-center p-2 bg-light rounded">
                              <div className="text-success font-weight-bold">{city.totalGuests}</div>
                              <small className="text-muted">Khách</small>
                            </div>
                          </div>
                        </div>
                        
                        {city.totalRevenue > 0 && (
                          <div className="revenue-info text-center p-2 bg-warning text-white rounded mb-2">
                            <strong>{city.totalRevenue.toLocaleString()}đ</strong>
                            <br/>
                            <small>Tổng doanh thu</small>
                          </div>
                        )}
                        
                        <div className="recent-tours">
                          <strong className="text-dark">Tours gần đây:</strong>
                          <ul className="list-unstyled mt-1 mb-0">
                            {city.bookings.slice(0, 3).map((booking, idx) => (
                              <li key={idx} className="small text-muted">
                                • {booking.tour_id?.name || 'Tour không xác định'}
                                <br/>
                                <span className="text-primary">
                                  {new Date(booking.booking_date).toLocaleDateString('vi-VN')}
                                </span>
                              </li>
                            ))}
                            {city.bookings.length > 3 && (
                              <li className="small text-info">...và {city.bookings.length - 3} booking khác</li>
                            )}
                          </ul>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-muted py-2">
                        <i className="fas fa-calendar-times mb-2"></i>
                        <br/>
                        <small>Chưa có booking nào</small>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
          
          {/* Enhanced legend with stats */}
          <div className="mt-3">
            <div className="row">
              <div className="col-md-8">
                <small className="text-muted font-weight-bold d-block mb-2">
                  <i className="fas fa-info-circle mr-1"></i>
                  Thống kê booking theo thành phố
                </small>
                <div className="d-flex flex-wrap">
                  {cityBookingData
                    .filter(city => city.bookingCount > 0)
                    .sort((a, b) => b.bookingCount - a.bookingCount)
                    .slice(0, 5)
                    .map((city, index) => (
                      <div key={city.name} className="mr-3 mb-2">
                        <small>
                          <strong>{city.name}:</strong> {city.bookingCount} booking
                        </small>
                      </div>
                    ))
                  }
                </div>
              </div>
              <div className="col-md-4 text-md-right">
                <div className="total-stats">
                  <small className="text-muted">Tổng cộng:</small>
                  <div className="d-flex justify-content-md-end">
                    <span className="badge badge-primary mr-2">
                      {cityBookingData.reduce((sum, city) => sum + city.bookingCount, 0)} booking
                    </span>
                    <span className="badge badge-success">
                      {cityBookingData.reduce((sum, city) => sum + city.totalGuests, 0)} khách
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VietnamMap;
