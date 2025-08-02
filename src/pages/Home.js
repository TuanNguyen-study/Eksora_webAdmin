import React, { useEffect, useState } from 'react';
import { getTours, getAllBookings, getAllUsers, getReviews, getSuppliers, getCategories } from '../api/api';
import Calendar from './SimpleCalendar';
import LastestReview from '../components/LastestReview';
import VietnamMap from '../components/VietnamMap';
import { Line, Doughnut } from 'react-chartjs-2';
import { Chart, BarElement, CategoryScale, LinearScale, Tooltip, Legend, PointElement, LineElement, ArcElement } from 'chart.js';
Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend, PointElement, LineElement, ArcElement);
const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?name=User&background=dee2e6&color=495057&size=128';

function Home() {
  const [recentTours, setRecentTours] = useState([]);
  const [totalTours, setTotalTours] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0); 
  const [latestBookings, setLatestBookings] = useState([]);
  const [latestUsers, setLatestUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0); // Tổng số users (không bao gồm admin)
  const [newMembersCount, setNewMembersCount] = useState(0);
  const [monthlyBookingStats, setMonthlyBookingStats] = useState({ labels: [], data: [] });
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [chartLoading, setChartLoading] = useState(false);
  const [allBookings, setAllBookings] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalSuppliers, setTotalSuppliers] = useState(0);
  
  // New state for hot destinations and map data
  const [hotDestinations, setHotDestinations] = useState([]);
  const [categoryBookingData, setCategoryBookingData] = useState([]);
  const [mapChartData, setMapChartData] = useState(null);

  useEffect(() => {
    async function fetchRecentTours() {
      try {
        const data = await getTours();
        setTotalTours(data.length);
        // Lấy 4 tour mới nhất (giả sử data đã sort theo created_at giảm dần, nếu không thì sort)
        const sorted = data.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        setRecentTours(sorted.slice(0, 4));
      } catch (err) {
        setRecentTours([]);
        setTotalTours(0);
      }
    }
    fetchRecentTours();
  }, []);
  useEffect(() => {
    async function fetchLatestBookings() {
      try {
        const data = await getAllBookings();
        // Lấy 7 booking mới nhất
        const sorted = data.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        setLatestBookings(sorted.slice(0, 7));
      } catch (err) {
        setLatestBookings([]);
      }
    }
    fetchLatestBookings();
  }, []);
  useEffect(() => {
    async function fetchLatestUsers() {
      try {
        const data = await getAllUsers();
        
        // Tách users theo role
        const allNonAdminUsers = data.filter(u => u.role !== 'admin');
        const regularUsers = data.filter(u => u.role === 'user' || !u.role); // user hoặc không có role
        const suppliers = data.filter(u => u.role === 'supplier');
        
        // Sắp xếp theo ngày tạo mới nhất cho hiển thị
        const sorted = allNonAdminUsers.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        setLatestUsers(sorted.slice(0, 8));
        
        // Set tổng số users (chỉ user thường, không bao gồm supplier và admin)
        setTotalUsers(regularUsers.length);
        // Set tổng số suppliers
        setTotalSuppliers(suppliers.length);
        
        // Đếm số lượng user tạo trong 1 tháng gần nhất
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        setNewMembersCount(allNonAdminUsers.filter(u => new Date(u.createdAt) >= oneMonthAgo).length);
      } catch (err) {
        setLatestUsers([]);
        setTotalUsers(0);
        setNewMembersCount(0);
      }
    }
    fetchLatestUsers();
  }, []);
  useEffect(() => {
    async function fetchTotalReviews() {
      try {
        const data = await getReviews();
        setTotalReviews(data.length);
      } catch (err) {
        setTotalReviews(0);
      }
    }
    fetchTotalReviews();
  }, []);
  useEffect(() => {
    async function fetchAllBookings() {
      setChartLoading(true);
      try {
        const data = await getAllBookings();
        setAllBookings(data);
        // Tính toán chart ở useEffect bên dưới
      } catch {
        setAllBookings([]);
      } finally {
        setChartLoading(false);
      }
    }
    fetchAllBookings();
  }, []);
  useEffect(() => {
    // Tính toán chart từ allBookings
    setChartLoading(true);
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const labels = Array.from({ length: daysInMonth }, (_, i) => `${i + 1}`);
    // Số lượng booking mới mỗi ngày (giữ lại nếu cần)
    const bookingCounts = Array(daysInMonth).fill(0);
    // Số lượng booking đang có tại mỗi ngày
    const bookingActiveCounts = Array(daysInMonth).fill(0);
    const revenueCounts = Array(daysInMonth).fill(0);
    // Tính số lượng booking mới mỗi ngày
    allBookings.forEach(b => {
      const d = new Date(b.createdAt);
      if (d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear) {
        const dayIdx = d.getDate() - 1;
        bookingCounts[dayIdx]++;
        if (["paid","completed","refunded"].includes(b.status)) {
          revenueCounts[dayIdx] += b.totalPrice || 0;
        }
      }
    });
    // Tính số lượng booking đang có tại mỗi ngày
    for (let i = 0; i < daysInMonth; i++) {
      const currentDate = new Date(selectedYear, selectedMonth - 1, i + 1);
      bookingActiveCounts[i] = allBookings.filter(b => {
        // Ngày bắt đầu booking
        const start = new Date(b.booking_date || b.created_at);
        // Ngày kết thúc booking
        let end = null;
        if (["canceled","expired"].includes(b.status) && b.last_update) {
          end = new Date(b.last_update);
        } else if (b.travel_date) {
          end = new Date(b.travel_date);
        } else if (b.tour_date) {
          end = new Date(b.tour_date);
        } else if (b.endDate) {
          end = new Date(b.endDate);
        } else {
          end = start; // Nếu không có ngày kết thúc, chỉ tính ngày đặt
        }
        // Booking còn hiệu lực nếu: start <= currentDate <= end
        return start <= currentDate && currentDate <= end;
      }).length;
    }
    // Tính doanh thu theo ngày: tổng doanh thu của các booking có travel_date đúng ngày đó và đã thanh toán
    for (let i = 0; i < daysInMonth; i++) {
      const currentDate = new Date(selectedYear, selectedMonth - 1, i + 1);
      revenueCounts[i] = allBookings.filter(b => {
        // Ngày kết thúc booking (ưu tiên travel_date, tour_date, endDate)
        let end = null;
        if (b.travel_date) {
          end = new Date(b.travel_date);
        } else if (b.tour_date) {
          end = new Date(b.tour_date);
        } else if (b.endDate) {
          end = new Date(b.endDate);
        } else if (["paid","completed","refunded"].includes(b.status) && b.last_update) {
          end = new Date(b.last_update);
        }
        // Chỉ tính doanh thu nếu trạng thái đã thanh toán và ngày kết thúc đúng ngày hiện tại
        return end && end.getFullYear() === currentDate.getFullYear() && end.getMonth() === currentDate.getMonth() && end.getDate() === currentDate.getDate() && ["paid","completed","refunded"].includes(b.status);
      }).reduce((sum, b) => sum + (b.totalPrice || 0), 0);
    }
    setMonthlyBookingStats({ labels, bookingCounts, bookingActiveCounts, revenueCounts });
    // Tính tổng doanh thu đã thanh toán toàn hệ thống
    const totalRevenue = allBookings
      .filter(b => ["paid","completed","refunded"].includes(b.status))
      .reduce((sum, b) => sum + (b.totalPrice || 0), 0);
    setTotalRevenue(totalRevenue);
    setChartLoading(false);
  }, [selectedMonth, selectedYear, allBookings]);

  // Fetch hot destinations and category booking data
  useEffect(() => {
    async function fetchHotDestinationsAndCategoryData() {
      try {
        const [categoriesData, toursData] = await Promise.all([getCategories(), getTours()]);
        
        // Analyze booking frequency by category
        const categoryBookings = {};
        
        allBookings.forEach(booking => {
          if (booking.tour_id && booking.tour_id.cateID) {
            const cateID = typeof booking.tour_id.cateID === 'object' 
              ? booking.tour_id.cateID._id || booking.tour_id.cateID 
              : booking.tour_id.cateID;
            
            if (!categoryBookings[cateID]) {
              categoryBookings[cateID] = {
                categoryId: cateID,
                categoryName: '',
                bookingCount: 0,
                totalGuests: 0,
                totalRevenue: 0
              };
            }
            
            categoryBookings[cateID].bookingCount++;
            categoryBookings[cateID].totalGuests += (booking.quantity_nguoiLon || 0) + (booking.quantity_treEm || 0);
            if (['paid', 'completed', 'refunded'].includes(booking.status)) {
              categoryBookings[cateID].totalRevenue += booking.totalPrice || 0;
            }
          }
        });

        // Map category names and create hot destinations
        const hotDestinationsData = Object.values(categoryBookings).map(cat => {
          const category = categoriesData.find(c => c._id === cat.categoryId);
          const regionInfo = getVietnameseRegion(category?.name || 'Unknown');
          return {
            ...cat,
            categoryName: category?.name || 'Unknown',
            icon: getDestinationIcon(category?.name || 'Unknown'),
            region: regionInfo.region,
            province: regionInfo.province,
            coordinates: regionInfo.coordinates
          };
        }).sort((a, b) => b.bookingCount - a.bookingCount).slice(0, 6);

        setHotDestinations(hotDestinationsData);
        setCategoryBookingData(Object.values(categoryBookings));

        // Create enhanced map chart data with regional information
        const regionStats = {};
        hotDestinationsData.forEach(dest => {
          if (!regionStats[dest.region]) {
            regionStats[dest.region] = {
              region: dest.region,
              bookings: 0,
              guests: 0,
              revenue: 0,
              provinces: []
            };
          }
          regionStats[dest.region].bookings += dest.bookingCount;
          regionStats[dest.region].guests += dest.totalGuests;
          regionStats[dest.region].revenue += dest.totalRevenue;
          regionStats[dest.region].provinces.push({
            name: dest.province,
            bookings: dest.bookingCount,
            coordinates: dest.coordinates
          });
        });

        const chartData = {
          labels: Object.keys(regionStats),
          datasets: [{
            label: 'Số lượng booking theo vùng',
            data: Object.values(regionStats).map(region => region.bookings),
            backgroundColor: [
              '#FF6B6B', // Miền Bắc - Red
              '#4ECDC4', // Miền Trung - Teal
              '#45B7D1', // Miền Nam - Blue
              '#FFA07A', // Additional colors if needed
              '#98D8C8',
              '#F7DC6F'
            ],
            borderWidth: 3,
            borderColor: '#fff',
            hoverBorderWidth: 4,
            hoverBorderColor: '#333'
          }]
        };
        setMapChartData({ chartData, regionStats });

      } catch (error) {
        console.error('Error fetching hot destinations data:', error);
        setHotDestinations([]);
        setCategoryBookingData([]);
      }
    }

    if (allBookings.length > 0) {
      fetchHotDestinationsAndCategoryData();
    }
  }, [allBookings]);

  // Helper function to get destination icons
  const getDestinationIcon = (categoryName) => {
    const name = categoryName.toLowerCase();
    if (name.includes('beach') || name.includes('biển') || name.includes('đảo')) return 'fas fa-umbrella-beach';
    if (name.includes('mountain') || name.includes('núi') || name.includes('đồi')) return 'fas fa-mountain';
    if (name.includes('city') || name.includes('thành phố') || name.includes('urban')) return 'fas fa-city';
    if (name.includes('temple') || name.includes('chùa') || name.includes('đền')) return 'fas fa-place-of-worship';
    if (name.includes('forest') || name.includes('rừng') || name.includes('park')) return 'fas fa-tree';
    if (name.includes('adventure') || name.includes('thám hiểm') || name.includes('sport')) return 'fas fa-hiking';
    if (name.includes('food') || name.includes('ẩm thực') || name.includes('cuisine')) return 'fas fa-utensils';
    if (name.includes('culture') || name.includes('văn hóa') || name.includes('museum')) return 'fas fa-landmark';
    if (name.includes('water') || name.includes('nước') || name.includes('river')) return 'fas fa-water';
    return 'fas fa-map-marker-alt'; // Default icon
  };

  // Helper function to get Vietnamese region from category/location
  const getVietnameseRegion = (categoryName) => {
    const name = categoryName.toLowerCase();
    
    // Miền Bắc
    if (name.includes('hà nội') || name.includes('hanoi') || name.includes('thủ đô')) return { region: 'Miền Bắc', province: 'Hà Nội', coordinates: [21.0285, 105.8542] };
    if (name.includes('hạ long') || name.includes('quảng ninh')) return { region: 'Miền Bắc', province: 'Quảng Ninh', coordinates: [20.9101, 107.1839] };
    if (name.includes('sapa') || name.includes('lào cai')) return { region: 'Miền Bắc', province: 'Lào Cai', coordinates: [22.4856, 103.9707] };
    if (name.includes('ninh bình')) return { region: 'Miền Bắc', province: 'Ninh Bình', coordinates: [20.2506, 105.9744] };
    if (name.includes('hải phòng')) return { region: 'Miền Bắc', province: 'Hải Phòng', coordinates: [20.8449, 106.6881] };
    
    // Miền Trung
    if (name.includes('huế') || name.includes('thừa thiên')) return { region: 'Miền Trung', province: 'Thừa Thiên Huế', coordinates: [16.4637, 107.5909] };
    if (name.includes('hội an') || name.includes('quảng nam')) return { region: 'Miền Trung', province: 'Quảng Nam', coordinates: [15.8801, 108.338] };
    if (name.includes('đà nẵng')) return { region: 'Miền Trung', province: 'Đà Nẵng', coordinates: [16.0544, 108.2022] };
    if (name.includes('nha trang') || name.includes('khánh hòa')) return { region: 'Miền Trung', province: 'Khánh Hòa', coordinates: [12.2388, 109.1967] };
    if (name.includes('phú yên')) return { region: 'Miền Trung', province: 'Phú Yên', coordinates: [13.0882, 109.0929] };
    if (name.includes('quy nhon') || name.includes('bình định')) return { region: 'Miền Trung', province: 'Bình Định', coordinates: [13.7563, 109.2297] };
    
    // Miền Nam
    if (name.includes('hồ chí minh') || name.includes('sài gòn') || name.includes('tp hcm')) return { region: 'Miền Nam', province: 'TP.HCM', coordinates: [10.8231, 106.6297] };
    if (name.includes('vũng tàu') || name.includes('bà rịa')) return { region: 'Miền Nam', province: 'Bà Rịa - Vũng Tàu', coordinates: [10.4113, 107.1362] };
    if (name.includes('đà lạt') || name.includes('lâm đồng')) return { region: 'Miền Nam', province: 'Lâm Đồng', coordinates: [11.9404, 108.4583] };
    if (name.includes('phú quốc') || name.includes('kiên giang')) return { region: 'Miền Nam', province: 'Kiên Giang', coordinates: [10.2899, 103.9840] };
    if (name.includes('cần thơ')) return { region: 'Miền Nam', province: 'Cần Thơ', coordinates: [10.0452, 105.7469] };
    if (name.includes('mỹ tho') || name.includes('tiền giang')) return { region: 'Miền Nam', province: 'Tiền Giang', coordinates: [10.3600, 106.3552] };
    
    // Default to Ho Chi Minh City if no specific match
    return { region: 'Miền Nam', province: 'TP.HCM', coordinates: [10.8231, 106.6297] };
  };

  return (
    <>
      {/* Content Wrapper. Contains page content */}
      <div className="content-wrapper bg-light">
        {/* Content Header (Page header) */}
        <div className="content-header bg-light">
          <div className="container-fluid">
            <div className="row mb-2">
              <div className="col-sm-6">
                <h1 className="m-0 text-dark">Dashboard </h1>
              </div>{/* /.col */}
              <div className="col-sm-6">
                <ol className="breadcrumb float-sm-right bg-light">
                  <li className="breadcrumb-item"><a href="#" className="text-dark">Home</a></li>
                  <li className="breadcrumb-item active text-dark">Dashboard </li>
                </ol>
              </div>{/* /.col */}
            </div>{/* /.row */}
            {/* Tổng doanh thu đã thanh toán */}
            
          </div>{/* /.container-fluid */}
        </div>
        {/* /.content-header */}
        {/* Main content */}
        <section className="content bg-light">
          <div className="container-fluid bg-light">
            {/* Info boxes và các phần còn lại */}
            <div className="row">
              <div className="col-12 col-sm-6 col-md-3">
                <div className="info-box mb-3 bg-primary">
                  <span className="info-box-icon"><i className="fas fa-map-marked-alt" /></span>
                  <div className="info-box-content">
                    <span className="info-box-text text-white">Tours</span>
                    <span className="info-box-number text-white">{totalTours}</span>
                  </div>
                </div>
              </div>
              <div className="col-12 col-sm-6 col-md-3">
                <div className="info-box mb-3" style={{ background: 'linear-gradient(90deg, #f7971e 0%, #ffd200 100%)' }}>
                  <span className="info-box-icon"><i className="fas fa-star text-white" /></span>
                  <div className="info-box-content">
                    <span className="info-box-text text-white">Reviews</span>
                    <span className="info-box-number text-white">{totalReviews}</span>
                  </div>
                </div>
              </div>
              <div className="col-12 col-sm-6 col-md-3">
                <div className="info-box mb-3 bg-info">
                  <span className="info-box-icon"><i className="fas fa-users" /></span>
                  <div className="info-box-content">
                    <span className="info-box-text text-white">Users</span>
                    <span className="info-box-number text-white">{totalUsers}</span>
                  </div>
                </div>
              </div>
              <div className="col-12 col-sm-6 col-md-3">
                <div className="info-box mb-3 bg-danger">
                  <span className="info-box-icon"><i className="fas fa-building" /></span>
                  <div className="info-box-content">
                    <span className="info-box-text text-white">Suppliers</span>
                    <span className="info-box-number text-white">{totalSuppliers}</span>
                  </div>
                </div>
              </div>
            </div>
            {/* /.row */}
            
            {/* Hot Destinations Section */}
            <div className="row">
              <div className="col-md-8">
                <div className="card bg-white border-light">
                  <div className="card-header bg-light border-bottom-0">
                    <h5 className="card-title text-dark">
                      <i className="fas fa-fire text-danger mr-2"></i>
                      Điểm Đến Hot Nhất
                    </h5>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      {hotDestinations.map((destination, index) => (
                        <div key={destination.categoryId} className="col-md-4 col-sm-6 mb-3">
                          <div className="info-box bg-gradient-light shadow-sm">
                            <span className="info-box-icon bg-gradient-primary">
                              <i className={`${destination.icon} text-white`}></i>
                            </span>
                            <div className="info-box-content">
                              <span className="info-box-text text-dark font-weight-bold">
                                {destination.categoryName}
                              </span>
                              <span className="info-box-number text-primary">
                                {destination.bookingCount} tours
                              </span>
                              <div className="mb-1">
                                <small className="text-muted">
                                  <i className="fas fa-map-marker-alt mr-1"></i>
                                  {destination.province} - {destination.region}
                                </small>
                              </div>
                              <div className="progress">
                                <div 
                                  className="progress-bar bg-primary" 
                                  style={{ 
                                    width: `${Math.min((destination.bookingCount / Math.max(...hotDestinations.map(d => d.bookingCount)) * 100), 100)}%` 
                                  }}
                                ></div>
                              </div>
                              <span className="progress-description text-muted">
                                <i className="fas fa-users mr-1"></i>
                                {destination.totalGuests} khách
                                {destination.totalRevenue > 0 && (
                                  <span className="ml-2 text-success">
                                    <i className="fas fa-dollar-sign"></i>
                                    {destination.totalRevenue.toLocaleString()}đ
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Map Chart Section */}
              <div className="col-md-4">
                <div className="card bg-white border-light">
                  <div className="card-header bg-light border-bottom-0">
                    <h5 className="card-title text-dark">
                      <i className="fas fa-chart-pie text-info mr-2"></i>
                      Bản Đồ Booking Việt Nam
                    </h5>
                  </div>
                  <div className="card-body">
                    {mapChartData && mapChartData.chartData && (
                      <>
                        <div style={{ position: 'relative', height: '250px', marginBottom: '15px' }}>
                          <Doughnut 
                            data={mapChartData.chartData}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: {
                                legend: {
                                  position: 'bottom',
                                  labels: {
                                    boxWidth: 12,
                                    font: {
                                      size: 11
                                    },
                                    generateLabels: function(chart) {
                                      const data = chart.data;
                                      if (data.labels.length && data.datasets.length) {
                                        return data.labels.map((label, i) => {
                                          const regionData = mapChartData.regionStats[label];
                                          return {
                                            text: `${label} (${regionData.bookings})`,
                                            fillStyle: data.datasets[0].backgroundColor[i],
                                            strokeStyle: data.datasets[0].borderColor,
                                            lineWidth: data.datasets[0].borderWidth,
                                            hidden: false,
                                            index: i
                                          };
                                        });
                                      }
                                      return [];
                                    }
                                  }
                                },
                                tooltip: {
                                  callbacks: {
                                    label: function(context) {
                                      const region = context.label;
                                      const regionData = mapChartData.regionStats[region];
                                      return [
                                        `${region}: ${context.parsed} booking`,
                                        `Tổng khách: ${regionData.guests} người`,
                                        `Doanh thu: ${regionData.revenue.toLocaleString()}đ`,
                                        `Tỉnh/thành: ${regionData.provinces.length}`
                                      ];
                                    }
                                  }
                                }
                              }
                            }}
                          />
                        </div>
                        
                        {/* Vietnam Map Visualization */}
                        <div className="vietnam-map-container">
                          <div className="text-center mb-2">
                            <small className="text-muted font-weight-bold">Phân Bố Theo Vùng</small>
                          </div>
                          <div className="vietnam-regions">
                            {Object.entries(mapChartData.regionStats).map(([regionName, regionData], index) => (
                              <div key={regionName} className="region-item d-flex align-items-center justify-content-between mb-2 p-2 rounded" 
                                   style={{ backgroundColor: mapChartData.chartData.datasets[0].backgroundColor[index] + '20', border: `2px solid ${mapChartData.chartData.datasets[0].backgroundColor[index]}` }}>
                                <div className="d-flex align-items-center">
                                  <div className="region-marker mr-2" 
                                       style={{ 
                                         width: '12px', 
                                         height: '12px', 
                                         backgroundColor: mapChartData.chartData.datasets[0].backgroundColor[index],
                                         borderRadius: '50%'
                                       }}>
                                  </div>
                                  <div>
                                    <div className="font-weight-bold text-dark" style={{ fontSize: '12px' }}>
                                      {regionName}
                                    </div>
                                    <div className="text-muted" style={{ fontSize: '10px' }}>
                                      {regionData.provinces.length} tỉnh/thành
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-primary font-weight-bold" style={{ fontSize: '12px' }}>
                                    {regionData.bookings}
                                  </div>
                                  <div className="text-muted" style={{ fontSize: '10px' }}>
                                    tours
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                    {(!mapChartData || !mapChartData.chartData || hotDestinations.length === 0) && (
                      <div className="text-center text-muted py-4">
                        <i className="fas fa-map-marked-alt fa-3x mb-3"></i>
                        <p>Chưa có dữ liệu booking để hiển thị trên bản đồ</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            {/* /.row */}
            
            {/* Vietnamese Geographic Map Section */}
            <div className="row">
              <div className="col-md-12">
                <div className="card bg-white border-light">
                  <div className="card-header bg-light border-bottom-0">
                    <h5 className="card-title text-dark">
                      <i className="fas fa-map-marked-alt text-success mr-2"></i>
                      Bản Đồ Việt Nam
                    </h5>
                  </div>
                  <div className="card-body">
                    <VietnamMap allBookings={allBookings} />
                  </div>
                </div>
              </div>
            </div>
            {/* /.row */}
            
            <div className="row">
              <div className="col-md-12">
                <div className="card bg-white border-light">
                  <div className="card-header bg-light border-bottom-0">
                    <h5 className="card-title text-dark">Monthly Recap Report</h5>
                    <div className="card-tools">
                      <button type="button" className="btn btn-tool text-dark" data-card-widget="collapse">
                        <i className="fas fa-minus" />
                      </button>
                      <div className="btn-group">
                        <button type="button" className="btn btn-tool text-dark dropdown-toggle" data-toggle="dropdown">
                          <i className="fas fa-wrench" />
                        </button>
                        <div className="dropdown-menu dropdown-menu-right bg-white" role="menu">
                          <a href="#" className="dropdown-item text-dark">Action</a>
                          <a href="#" className="dropdown-item text-dark">Another action</a>
                          <a href="#" className="dropdown-item text-dark">Something else here</a>
                          <a className="dropdown-divider" />
                          <a href="#" className="dropdown-item text-dark">Separated link</a>
                        </div>
                      </div>
                      <button type="button" className="btn btn-tool text-dark" data-card-widget="remove">
                        <i className="fas fa-times" />
                      </button>
                    </div>
                  </div>
                  {/* /.card-header */}
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-9">
                        <div className=" justify-content-center align-items-center mb-2">
                          <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} className="form-control w-auto mx-2">
                            {[...Array(12)].map((_, i) => (
                              <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>
                            ))}
                          </select>
                          <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="form-control w-auto mx-2">
                            {[...Array(6)].map((_, i) => {
                              const year = new Date().getFullYear() - 3 + i;
                              return <option key={year} value={year}>{year}</option>;
                            })}
                          </select>
                        </div>
                        <p className="text-center">
                          <strong>Booking trong tháng {selectedMonth}/{selectedYear}</strong>
                        </p>
                        <div className="chart">
                          {chartLoading ? (
                            <div className="text-center py-5"><span>Đang tải biểu đồ...</span></div>
                          ) : (
                            <Line
                              data={{
                                labels: monthlyBookingStats.labels,
                                datasets: [
                                  {
                                    label: 'Số booking đang có',
                                    data: monthlyBookingStats.bookingActiveCounts,
                                    backgroundColor: 'rgba(54, 162, 235, 0.7)',
                                    borderColor: 'rgba(54, 162, 235, 1)',
                                    borderWidth: 2,
                                    pointRadius: 7,
                                    pointBackgroundColor: 'rgba(54, 162, 235, 1)',
                                    pointBorderColor: '#fff',
                                    fill: false,
                                    yAxisID: 'y',
                                    tension: 0.2,
                                    showLine: true,
                                  },
                                  {
                                    label: 'Doanh thu (VNĐ)',
                                    data: monthlyBookingStats.revenueCounts,
                                    backgroundColor: 'rgba(255, 206, 86, 0.5)',
                                    borderColor: 'rgba(255, 206, 86, 1)',
                                    borderWidth: 2,
                                    pointRadius: 0,
                                    fill: false,
                                    yAxisID: 'y1',
                                    tension: 0.2,
                                    showLine: true,
                                  },
                                ],
                              }}
                              options={{
                                responsive: true,
                                plugins: {
                                  legend: { display: true },
                                  tooltip: { enabled: true },
                                },
                                scales: {
                                  x: { title: { display: true, text: 'Ngày trong tháng' } },
                                  y: {
                                    title: { display: true, text: 'Số lượng Booking đang có' },
                                    beginAtZero: true,
                                    position: 'left',
                                  },
                                  y1: {
                                    title: { display: true, text: 'Doanh thu (VNĐ)' },
                                    beginAtZero: true,
                                    position: 'right',
                                    grid: { drawOnChartArea: false },
                                    ticks: {
                                      callback: function(value) {
                                        return value.toLocaleString();
                                      }
                                    }
                                  },
                                },
                              }}
                              height={180}
                            />
                          )}
                        </div>
                        <div className="text-center mt-2">
                          <span className="badge badge-info" style={{fontSize: '1.1rem'}}>
                            Tổng số Booking tháng này: {(() => {
                              // Lấy lại dữ liệu booking từ allBookings theo tháng/năm đang chọn
                              const count = allBookings.filter(b => {
                                const d = new Date(b.createdAt || b.booking_date);
                                return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
                              }).length;
                              return count;
                            })()}
                          </span>
                          <span className="badge badge-warning ml-2" style={{fontSize: '1.1rem'}}>
                            Tổng doanh thu: {(() => {
                              // Lấy lại doanh thu booking đã thanh toán theo tháng/năm đang chọn
                              const sum = allBookings.filter(b => {
                                const d = new Date(b.createdAt || b.booking_date);
                                return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear && ["paid","completed","refunded"].includes(b.status);
                              }).reduce((a, b) => a + (b.totalPrice || 0), 0);
                              return sum.toLocaleString('vi-VN');
                            })()} VNĐ
                          </span>
                        </div>
                        {/* /.chart-responsive */}
                      </div>

                    </div>
                    {/* /.row */}
                  </div>
                  {/* ./card-body */}
                  <div className="card-footer">
                    <div className="row">
                      <div className="col-sm-3 col-6">
                        <div className="description-block border-right">
                          <span className="description-percentage text-success"><i className="fas fa-caret-up" /> 17%</span>
                          <h5 className="description-header">{monthlyBookingStats.revenueCounts ? monthlyBookingStats.revenueCounts.reduce((a, b) => a + b, 0).toLocaleString('vi-VN') : 0} đ</h5>
                          <span className="description-text">TỔNG DOANH THU THÁNG NÀY</span>
                        </div>
                        {/* /.description-block */}
                      </div>
                      {/* /.col */}
                      <div className="col-sm-3 col-6">
                        <div className="description-block border-right">
                          <span className="description-percentage text-warning"><i className="fas fa-caret-left" /> 0%</span>
                          <h5 className="description-header">$10,390.90</h5>
                          <span className="description-text">TOTAL COST</span>
                        </div>
                        {/* /.description-block */}
                      </div>
                      {/* /.col */}
                      <div className="col-sm-3 col-6">
                        <div className="description-block border-right">
                          <span className="description-percentage text-success"><i className="fas fa-caret-up" /> 20%</span>
                          <h5 className="description-header">$24,813.53</h5>
                          <span className="description-text">TOTAL PROFIT</span>
                        </div>
                        {/* /.description-block */}
                      </div>
                      {/* /.col */}
                      <div className="col-sm-3 col-6">
                        <div className="description-block">
                          <span className="description-percentage text-danger"><i className="fas fa-caret-down" /> 18%</span>
                          <h5 className="description-header">1200</h5>
                          <span className="description-text">GOAL COMPLETIONS</span>
                        </div>
                        {/* /.description-block */}
                      </div>
                    </div>
                    {/* /.row */}
                  </div>
                  {/* /.card-footer */}
                </div>
                {/* /.card */}
              </div>
              {/* /.col */}
            </div>
            {/* /.row */}
             {/* Calendar riêng một dòng */}
            <div className="row mb-3">
              <div className="col-12">
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">
                      <i className="fas fa-calendar-alt mr-2"></i>
                      Lịch Booking Tours
                    </h3>
                    <div className="card-tools">
                      <small className="text-muted">
                        Click vào tour để xem chi tiết booking
                      </small>
                    </div>
                  </div>
                  <div className="card-body p-0">
                    <Calendar />
                  </div>
                </div>
              </div>
            </div>
            {/* Main row */}
            <div className="row">
              {/* Left col */}
              <div className="col-md-8">
                {/* TABLE: LATEST BOOKINGS */}
                <div className="card">
                  <div className="card-header border-transparent">
                    <h3 className="card-title">Latest Bookings</h3>
                    <div className="card-tools">
                      <button type="button" className="btn btn-tool" data-card-widget="collapse">
                        <i className="fas fa-minus" />
                      </button>
                      <button type="button" className="btn btn-tool" data-card-widget="remove">
                        <i className="fas fa-times" />
                      </button>
                    </div>
                  </div>
                  {/* /.card-header */}
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table m-0">
                        <thead>
                          <tr>
                            <th>Booking ID</th>
                            <th>Tour</th>
                            <th>User</th>
                            <th>Status</th>
                            <th>Ngày đặt</th>
                          </tr>
                        </thead>
                        <tbody>
                          {latestBookings.map(b => (
                            <tr key={b._id}>
                              <td>{
                                'EK' +
                                (b._id ? b._id.substring(0, 4) : '') +
                                (b.tour_id?._id ? b.tour_id._id.substring(0, 2) : '') +
                                (b.user_id?._id ? b.user_id._id.slice(-2) : '')
                              }</td>
                              <td>{b.tour_id?.name}</td>
                              <td>{b.user_id?.first_name} {b.user_id?.last_name}</td>
                              <td>{b.status === 'pending' ? 'Chưa thanh toán' : b.status === 'success' ? 'Đã thanh toán' : b.status === 'cancelled' ? 'Đã hủy' : b.status}</td>
                              <td>{b.createdAt ? new Date(b.createdAt).toLocaleDateString('vi-VN') : ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {/* /.table-responsive */}
                  </div>
                  {/* /.card-body */}
                  <div className="card-footer clearfix">
                    <a href="/bookings" className="btn btn-sm btn-info float-right">View All Bookings</a>
                  </div>
                  {/* /.card-footer */}
                </div>
                {/* /.card */}
                {/* Latest Review dưới bookings */}
                <LastestReview />
              </div>
              {/* /.col */}
              <div className="col-md-4">
               
                {/* PRODUCT LIST */}
                <div className="card bg-white border-light">
                  <div className="card-header bg-light border-bottom-0">
                    <h3 className="card-title text-dark">Recently Added Tours</h3>
                    <div className="card-tools">
                      <button type="button" className="btn btn-tool text-dark" data-card-widget="collapse">
                        <i className="fas fa-minus" />
                      </button>
                      <button type="button" className="btn btn-tool text-dark" data-card-widget="remove">
                        <i className="fas fa-times" />
                      </button>
                    </div>
                  </div>
                  {/* /.card-header */}
                  <div className="card-body p-0 bg-white">
                    <ul className="products-list product-list-in-card pl-2 pr-2">
                      {recentTours.map(tour => (
                        <li className="item" key={tour._id}>
                          <div className="product-img">
                            <img src={tour.image?.[0]} alt="Tour Image" className="img-size-50 border border-light" />
                          </div>
                          <div className="product-info">
                            <span className="product-title text-dark">{tour.name}
                              <span className="badge badge-primary float-right">{tour.price?.toLocaleString()} đ</span></span>
                            <span className="product-description text-secondary">
                              {tour.supplier_id?.name || tour.supplier_id || 'N/A'}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {/* /.card-body */}
                  <div className="card-footer text-center bg-light">
                    <a href="/tour" className="uppercase text-primary">View All Tours</a>
                  </div>
                  {/* /.card-footer */}
                </div>
                {/* /.card */}
              </div>
              {/* /.col */}
            </div>
          </div>{/*/. container-fluid */}
        </section>
        {/* /.content */}
      </div>
      {/* /.content-wrapper */}
    </>
  );
}

export default Home;
