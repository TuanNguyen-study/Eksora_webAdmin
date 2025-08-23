import React, { useEffect, useState } from 'react';
import { getTours, getAllBookings, getAllUsers, getReviews, getCategories } from '../api/api';
import Calendar from './SimpleCalendar';
import LastestReview from '../components/LastestReview';
import VietnamMap from '../components/VietnamMap';
import { Line, Doughnut } from 'react-chartjs-2';
import { Chart, BarElement, CategoryScale, LinearScale, Tooltip, Legend, PointElement, LineElement, ArcElement } from 'chart.js';
Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend, PointElement, LineElement, ArcElement);

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
  
  // New state for month-over-month growth metrics
  const [revenueGrowth, setRevenueGrowth] = useState(0);
  const [bookingGrowth, setBookingGrowth] = useState(0);
  const [userGrowth, setUserGrowth] = useState(0);
  
  // New state for hot destinations and map data
  const [hotDestinations, setHotDestinations] = useState([]);
  const [categoryBookingData, setCategoryBookingData] = useState([]);
  const [mapChartData, setMapChartData] = useState(null);
  
  // State for responsive handling
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);


  // Helper functions for hot destinations
  const getDestinationIcon = (categoryName) => {
    const name = categoryName.toLowerCase();
    if (name.includes('biển') || name.includes('beach') || name.includes('đảo')) return 'fas fa-umbrella-beach';
    if (name.includes('núi') || name.includes('mountain') || name.includes('trekking')) return 'fas fa-mountain';
    if (name.includes('thành phố') || name.includes('city') || name.includes('urban')) return 'fas fa-city';
    if (name.includes('văn hóa') || name.includes('culture') || name.includes('museum')) return 'fas fa-landmark';
    if (name.includes('ẩm thực') || name.includes('food') || name.includes('culinary')) return 'fas fa-utensils';
    if (name.includes('lịch sử') || name.includes('history') || name.includes('historical')) return 'fas fa-monument';
    if (name.includes('thiên nhiên') || name.includes('nature') || name.includes('forest')) return 'fas fa-tree';
    if (name.includes('adventure') || name.includes('thể thao') || name.includes('sport')) return 'fas fa-hiking';
    return 'fas fa-map-marker-alt';
  };

  const getVietnameseRegion = (categoryName) => {
    const name = categoryName.toLowerCase();
    // Miền Bắc
    if (name.includes('hà nội') || name.includes('hanoi') || name.includes('thủ đô')) {
      return { region: 'Miền Bắc', province: 'Hà Nội', coordinates: [21.0285, 105.8542] };
    }
    if (name.includes('hạ long') || name.includes('quảng ninh')) {
      return { region: 'Miền Bắc', province: 'Quảng Ninh', coordinates: [20.9101, 107.1839] };
    }
    if (name.includes('sapa') || name.includes('lào cai')) {
      return { region: 'Miền Bắc', province: 'Lào Cai', coordinates: [22.4856, 103.9707] };
    }
    if (name.includes('ninh bình')) {
      return { region: 'Miền Bắc', province: 'Ninh Bình', coordinates: [20.2506, 105.9744] };
    }
    // Miền Trung
    if (name.includes('đà nẵng') || name.includes('da nang')) {
      return { region: 'Miền Trung', province: 'Đà Nẵng', coordinates: [16.0544, 108.2022] };
    }
    if (name.includes('hội an') || name.includes('quảng nam')) {
      return { region: 'Miền Trung', province: 'Quảng Nam', coordinates: [15.8801, 108.338] };
    }
    if (name.includes('huế') || name.includes('thừa thiên')) {
      return { region: 'Miền Trung', province: 'Thừa Thiên Huế', coordinates: [16.4637, 107.5909] };
    }
    if (name.includes('nha trang') || name.includes('khánh hòa')) {
      return { region: 'Miền Trung', province: 'Khánh Hòa', coordinates: [12.2388, 109.1967] };
    }
    if (name.includes('đà lạt') || name.includes('lâm đồng')) {
      return { region: 'Miền Trung', province: 'Lâm Đồng', coordinates: [11.9404, 108.4583] };
    }
    // Miền Nam
    if (name.includes('hồ chí minh') || name.includes('sài gòn') || name.includes('tp.hcm') || name.includes('hcm')) {
      return { region: 'Miền Nam', province: 'TP.HCM', coordinates: [10.8231, 106.6297] };
    }
    if (name.includes('vũng tàu') || name.includes('bà rịa')) {
      return { region: 'Miền Nam', province: 'Bà Rịa - Vũng Tàu', coordinates: [10.4113, 107.1362] };
    }
    if (name.includes('phú quốc') || name.includes('kiên giang')) {
      return { region: 'Miền Nam', province: 'Kiên Giang', coordinates: [10.2899, 103.9840] };
    }
    if (name.includes('cần thơ') || name.includes('mekong')) {
      return { region: 'Miền Nam', province: 'Cần Thơ', coordinates: [10.0452, 105.7469] };
    }
    // Default to TP.HCM if can't determine
    return { region: 'Miền Nam', province: 'TP.HCM', coordinates: [10.8231, 106.6297] };
  };

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
  
  // useEffect for responsive handling
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    
    // Cleanup function
    return () => {
      window.removeEventListener('resize', handleResize);
    };
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

  // Calculate month-over-month growth metrics
  useEffect(() => {
    if (allBookings.length > 0) {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      
      // Previous month
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      
      // Calculate current month metrics
      const currentMonthBookings = allBookings.filter(booking => {
        const bookingDate = new Date(booking.createdAt);
        return bookingDate.getMonth() === currentMonth && bookingDate.getFullYear() === currentYear;
      });
      
      const currentMonthRevenue = currentMonthBookings
        .filter(b => ["paid", "completed", "refunded"].includes(b.status))
        .reduce((sum, b) => sum + (b.totalPrice || 0), 0);
      
      // Calculate previous month metrics
      const prevMonthBookings = allBookings.filter(booking => {
        const bookingDate = new Date(booking.createdAt);
        return bookingDate.getMonth() === prevMonth && bookingDate.getFullYear() === prevYear;
      });
      
      const prevMonthRevenue = prevMonthBookings
        .filter(b => ["paid", "completed", "refunded"].includes(b.status))
        .reduce((sum, b) => sum + (b.totalPrice || 0), 0);
      
      // Calculate growth percentages
      const revenueGrowthPercent = prevMonthRevenue === 0 ? 100 : 
        ((currentMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100;
      
      const bookingGrowthPercent = prevMonthBookings.length === 0 ? 100 : 
        ((currentMonthBookings.length - prevMonthBookings.length) / prevMonthBookings.length) * 100;
      
      setRevenueGrowth(Math.round(revenueGrowthPercent));
      setBookingGrowth(Math.round(bookingGrowthPercent));
    }
  }, [allBookings]);

  // Calculate user growth month-over-month
  useEffect(() => {
    async function calculateUserGrowth() {
      try {
        const data = await getAllUsers();
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();
        
        // Previous month
        const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        
        const regularUsers = data.filter(u => u.role === 'user' || !u.role);
        
        const currentMonthUsers = regularUsers.filter(user => {
          const userDate = new Date(user.createdAt);
          return userDate.getMonth() === currentMonth && userDate.getFullYear() === currentYear;
        });
        
        const prevMonthUsers = regularUsers.filter(user => {
          const userDate = new Date(user.createdAt);
          return userDate.getMonth() === prevMonth && userDate.getFullYear() === prevYear;
        });
        
        const userGrowthPercent = prevMonthUsers.length === 0 ? 100 : 
          ((currentMonthUsers.length - prevMonthUsers.length) / prevMonthUsers.length) * 100;
        
        setUserGrowth(Math.round(userGrowthPercent));
      } catch (err) {
        setUserGrowth(0);
      }
    }
    calculateUserGrowth();
  }, []);

  // useEffect for top reviews of the month


  // New useEffect for hot destinations and category data
  useEffect(() => {
    async function fetchHotDestinationsAndCategoryData() {
      try {
        console.log('=== FETCHING HOT DESTINATIONS ===');
        console.log('allBookings length:', allBookings.length);
        
        const [categoriesData, toursData] = await Promise.all([getCategories(), getTours()]);
        console.log('categoriesData length:', categoriesData.length);
        console.log('toursData length:', toursData.length);
        
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

        console.log('categoryBookings:', categoryBookings);

        // Map category names and create hot destinations with random images
        const hotDestinationsData = Object.values(categoryBookings).map(cat => {
          const category = categoriesData.find(c => c._id === cat.categoryId);
          const regionInfo = getVietnameseRegion(category?.name || 'Unknown');
          
          // Find tours for this category to get random image
          const categoryTours = toursData.filter(tour => {
            const tourCateID = typeof tour.cateID === 'object' ? tour.cateID._id : tour.cateID;
            return tourCateID === cat.categoryId && tour.image && tour.image.length > 0;
          });
          
          // Get random image from tours in this category
          let randomImage = null;
          if (categoryTours.length > 0) {
            const randomTour = categoryTours[Math.floor(Math.random() * categoryTours.length)];
            if (randomTour.image && randomTour.image.length > 0) {
              randomImage = Array.isArray(randomTour.image) 
                ? randomTour.image[Math.floor(Math.random() * randomTour.image.length)]
                : randomTour.image;
            }
          }
          
          return {
            ...cat,
            categoryName: category?.name || 'Unknown',
            icon: getDestinationIcon(category?.name || 'Unknown'),
            region: regionInfo.region,
            province: regionInfo.province,
            coordinates: regionInfo.coordinates,
            randomImage: randomImage
          };
        }).sort((a, b) => b.bookingCount - a.bookingCount).slice(0, 6);

        console.log('hotDestinationsData final:', hotDestinationsData);
        
        // Always ensure we have at least demo data for regions
        let finalDestinationsForRegion = hotDestinationsData;
        if (hotDestinationsData.length === 0) {
          console.log('No booking data found, adding demo destinations');
          const demoDestinations = [
            {
              categoryId: 'demo1',
              categoryName: 'Thành phố Hồ Chí Minh',
              bookingCount: 6,
              totalGuests: 12,
              totalRevenue: 15000000,
              icon: 'fas fa-city',
              region: 'Miền Nam',
              province: 'TP.HCM',
              coordinates: [10.8231, 106.6297],
              randomImage: null
            },
            {
              categoryId: 'demo2', 
              categoryName: 'Hà Nội',
              bookingCount: 19,
              totalGuests: 38,
              totalRevenue: 45000000,
              icon: 'fas fa-landmark',
              region: 'Miền Bắc',
              province: 'Hà Nội',
              coordinates: [21.0285, 105.8542],
              randomImage: null
            },
            {
              categoryId: 'demo3', 
              categoryName: 'Đà Nẵng',
              bookingCount: 25,
              totalGuests: 50,
              totalRevenue: 60000000,
              icon: 'fas fa-water',
              region: 'Miền Trung',
              province: 'Đà Nẵng',
              coordinates: [16.0544, 108.2022],
              randomImage: null
            },
            {
              categoryId: 'demo4', 
              categoryName: 'Quảng Nam',
              bookingCount: 15,
              totalGuests: 30,
              totalRevenue: 35000000,
              icon: 'fas fa-mountain',
              region: 'Miền Trung',
              province: 'Quảng Nam',
              coordinates: [15.5394, 108.0191],
              randomImage: null
            },
            {
              categoryId: 'demo5', 
              categoryName: 'Khánh Hòa',
              bookingCount: 16,
              totalGuests: 32,
              totalRevenue: 40000000,
              icon: 'fas fa-umbrella-beach',
              region: 'Miền Trung',
              province: 'Khánh Hòa',
              coordinates: [12.2585, 109.0526],
              randomImage: null
            }
          ];
          setHotDestinations(demoDestinations);
          finalDestinationsForRegion = demoDestinations;
        } else {
          setHotDestinations(hotDestinationsData);
          finalDestinationsForRegion = hotDestinationsData;
        }
        
        setCategoryBookingData(Object.values(categoryBookings));

        // Create enhanced map chart data with regional information
        const regionStats = {};
        finalDestinationsForRegion.forEach(dest => {
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
          if (!regionStats[dest.region].provinces.includes(dest.province)) {
            regionStats[dest.region].provinces.push(dest.province);
          }
        });

        // Create chart data for regions
        const regionNames = Object.keys(regionStats);
        const regionBookings = regionNames.map(region => regionStats[region].bookings);
        
        if (regionNames.length > 0) {
          setMapChartData({
            regionStats,
            chartData: {
              labels: regionNames,
              datasets: [{
                data: regionBookings,
                backgroundColor: [
                  '#FF6B6B', // Miền Bắc - Red
                  '#4ECDC4', // Miền Trung - Teal  
                  '#45B7D1', // Miền Nam - Blue
                  '#96CEB4', // Extra colors if needed
                  '#FFEAA7',
                  '#DDA0DD'
                ],
                borderWidth: 2,
                borderColor: '#fff'
              }]
            }
          });
        }

      } catch (error) {
        console.error('Error fetching hot destinations data:', error);
        setHotDestinations([]);
        setCategoryBookingData([]);
        setMapChartData(null);
      }
    }

    if (allBookings.length > 0) {
      fetchHotDestinationsAndCategoryData();
    } else {
      // If no bookings, set demo data to show UI
      console.log('No bookings data, setting demo destinations');
      const demoDestinations = [
        {
          categoryId: 'demo1',
          categoryName: 'Thành phố Hồ Chí Minh',
          bookingCount: 0,
          totalGuests: 0,
          totalRevenue: 0,
          icon: 'fas fa-city',
          region: 'Miền Nam',
          province: 'TP.HCM',
          coordinates: [10.8231, 106.6297],
          randomImage: null
        },
        {
          categoryId: 'demo2', 
          categoryName: 'Hà Nội',
          bookingCount: 0,
          totalGuests: 0,
          totalRevenue: 0,
          icon: 'fas fa-landmark',
          region: 'Miền Bắc',
          province: 'Hà Nội',
          coordinates: [21.0285, 105.8542],
          randomImage: null
        }
      ];
      setHotDestinations(demoDestinations);
    }
  }, [allBookings]);
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
                  <li className="breadcrumb-item"><button type="button" className="btn btn-link p-0 text-dark border-0 bg-transparent">Home</button></li>
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
                          <button type="button" className="dropdown-item text-dark border-0 bg-transparent">Action</button>
                          <button type="button" className="dropdown-item text-dark border-0 bg-transparent">Another action</button>
                          <button type="button" className="dropdown-item text-dark border-0 bg-transparent">Something else here</button>
                          <div className="dropdown-divider" />
                          <button type="button" className="dropdown-item text-dark border-0 bg-transparent">Separated link</button>
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
                        <div className="text-center mb-3">
                          <h4 className="text-primary font-weight-bold mb-3">
                            <i className="fas fa-chart-line mr-2"></i>
                            Thống Kê Booking & Doanh Thu
                          </h4>
                          <div className="d-flex justify-content-center align-items-center mb-3">
                            <label className="mb-0 mr-2 font-weight-bold">Tháng:</label>
                            <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} 
                              className="form-control w-auto mx-2" style={{borderRadius: '20px'}}>
                              {[...Array(12)].map((_, i) => (
                                <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>
                              ))}
                            </select>
                            <label className="mb-0 mr-2 font-weight-bold">Năm:</label>
                            <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} 
                              className="form-control w-auto mx-2" style={{borderRadius: '20px'}}>
                              {[...Array(6)].map((_, i) => {
                                const year = new Date().getFullYear() - 3 + i;
                                return <option key={year} value={year}>{year}</option>;
                              })}
                            </select>
                          </div>
                        </div>
                        <div className="chart chart-container">
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
                                    backgroundColor: 'rgba(54, 162, 235, 0.8)',
                                    borderColor: 'rgba(54, 162, 235, 1)',
                                    borderWidth: 3,
                                    pointRadius: 6,
                                    pointHoverRadius: 8,
                                    pointBackgroundColor: 'rgba(54, 162, 235, 1)',
                                    pointBorderColor: '#fff',
                                    pointBorderWidth: 2,
                                    fill: false,
                                    yAxisID: 'y',
                                    tension: 0.3,
                                    showLine: true,
                                  },
                                  {
                                    label: 'Doanh thu (VNĐ)',
                                    data: monthlyBookingStats.revenueCounts,
                                    backgroundColor: 'rgba(255, 193, 7, 0.8)',
                                    borderColor: 'rgba(255, 193, 7, 1)',
                                    borderWidth: 3,
                                    pointRadius: 5,
                                    pointHoverRadius: 7,
                                    pointBackgroundColor: 'rgba(255, 193, 7, 1)',
                                    pointBorderColor: '#fff',
                                    pointBorderWidth: 2,
                                    fill: false,
                                    yAxisID: 'y1',
                                    tension: 0.3,
                                    showLine: true,
                                  },
                                ],
                              }}
                              options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                interaction: {
                                  mode: 'index',
                                  intersect: false,
                                },
                                plugins: {
                                  legend: { 
                                    display: true,
                                    position: 'top',
                                    labels: {
                                      boxWidth: 15,
                                      padding: 20,
                                      font: {
                                        size: 12,
                                        weight: 'bold'
                                      },
                                      color: '#333'
                                    }
                                  },
                                  tooltip: { 
                                    enabled: true,
                                    backgroundColor: 'rgba(0,0,0,0.8)',
                                    titleFont: { size: 14 },
                                    bodyFont: { size: 12 },
                                    padding: 12,
                                    cornerRadius: 8,
                                    callbacks: {
                                      label: function(context) {
                                        if (context.datasetIndex === 1) {
                                          return context.dataset.label + ': ' + context.parsed.y.toLocaleString('vi-VN') + ' VNĐ';
                                        }
                                        return context.dataset.label + ': ' + context.parsed.y;
                                      }
                                    }
                                  },
                                },
                                scales: {
                                  x: { 
                                    title: { 
                                      display: windowWidth > 768, 
                                      text: 'Ngày trong tháng',
                                      font: { size: 12, weight: 'bold' },
                                      color: '#666'
                                    },
                                    ticks: {
                                      maxTicksLimit: windowWidth > 768 ? 15 : 8,
                                      font: { size: 11 },
                                      color: '#666'
                                    },
                                    grid: {
                                      display: true,
                                      color: 'rgba(0,0,0,0.1)'
                                    }
                                  },
                                  y: {
                                    title: { 
                                      display: windowWidth > 768, 
                                      text: 'Số lượng Booking đang có',
                                      font: { size: 12, weight: 'bold' },
                                      color: '#2196F3'
                                    },
                                    beginAtZero: true,
                                    position: 'left',
                                    ticks: {
                                      font: { size: 11 },
                                      color: '#2196F3',
                                      stepSize: 1
                                    },
                                    grid: {
                                      display: true,
                                      color: 'rgba(33,150,243,0.2)'
                                    }
                                  },
                                  y1: {
                                    title: { 
                                      display: windowWidth > 768, 
                                      text: 'Doanh thu (VNĐ)',
                                      font: { size: 12, weight: 'bold' },
                                      color: '#FF9800'
                                    },
                                    beginAtZero: true,
                                    position: 'right',
                                    ticks: {
                                      font: { size: 11 },
                                      color: '#FF9800',
                                      callback: function(value) {
                                        return value.toLocaleString('vi-VN');
                                      }
                                    },
                                    grid: { 
                                      drawOnChartArea: false,
                                      color: 'rgba(255,152,0,0.2)'
                                    },
                                  },
                                },
                              }}
                              height={windowWidth > 768 ? 300 : 200}
                            />
                          )}
                        </div>
                        <div className="text-center mt-3 d-flex flex-wrap justify-content-center">
                          <div className="badge badge-info m-2 p-3" style={{
                            fontSize: windowWidth > 576 ? '1.2rem' : '1rem',
                            fontWeight: 'bold',
                            borderRadius: '10px',
                            boxShadow: '0 2px 8px rgba(33,150,243,0.3)'
                          }}>
                            <i className="fas fa-calendar-check mr-2"></i>
                            Booking tháng này: <strong>{(() => {
                              const count = allBookings.filter(b => {
                                const d = new Date(b.createdAt || b.booking_date);
                                return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
                              }).length;
                              return count;
                            })()}</strong>
                          </div>
                          <div className="badge badge-warning m-2 p-3" style={{
                            fontSize: windowWidth > 576 ? '1.2rem' : '1rem',
                            fontWeight: 'bold',
                            borderRadius: '10px',
                            boxShadow: '0 2px 8px rgba(255,193,7,0.3)'
                          }}>
                            <i className="fas fa-money-bill-wave mr-2"></i>
                            Doanh thu: <strong>{(() => {
                              const sum = allBookings.filter(b => {
                                const d = new Date(b.createdAt || b.booking_date);
                                return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear && ["paid","completed","refunded"].includes(b.status);
                              }).reduce((a, b) => a + (b.totalPrice || 0), 0);
                              return sum.toLocaleString('vi-VN');
                            })()} đ</strong>
                          </div>
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
                          <span className={`description-percentage ${revenueGrowth >= 0 ? 'text-success' : 'text-danger'}`}>
                            <i className={`fas fa-caret-${revenueGrowth >= 0 ? 'up' : 'down'}`} /> {Math.abs(revenueGrowth)}%
                          </span>
                          <h5 className="description-header">{monthlyBookingStats.revenueCounts ? monthlyBookingStats.revenueCounts.reduce((a, b) => a + b, 0).toLocaleString('vi-VN') : 0} đ</h5>
                          <span className="description-text">DOANH THU SO VỚI THÁNG TRƯỚC</span>
                        </div>
                        {/* /.description-block */}
                      </div>
                      {/* /.col */}
                      <div className="col-sm-3 col-6">
                        <div className="description-block border-right">
                          <span className={`description-percentage ${revenueGrowth >= 0 ? 'text-success' : 'text-danger'}`}>
                            <i className={`fas fa-caret-${revenueGrowth >= 0 ? 'up' : 'down'}`} /> {Math.abs(revenueGrowth)}%
                          </span>
                          <h5 className="description-header">{revenueGrowth >= 0 ? '+' : '-'}{Math.abs(revenueGrowth)}%</h5>
                          <span className="description-text">MỨC TĂNG TRƯỞNG DOANH THU</span>
                        </div>
                        {/* /.description-block */}
                      </div>
                      {/* /.col */}
                      <div className="col-sm-3 col-6">
                        <div className="description-block border-right">
                          <span className={`description-percentage ${userGrowth >= 0 ? 'text-success' : 'text-danger'}`}>
                            <i className={`fas fa-caret-${userGrowth >= 0 ? 'up' : 'down'}`} /> {Math.abs(userGrowth)}%
                          </span>
                          <h5 className="description-header">{newMembersCount}</h5>
                          <span className="description-text">THÀNH VIÊN SO VỚI THÁNG TRƯỚC</span>
                        </div>
                        {/* /.description-block */}
                      </div>
                      {/* /.col */}
                      <div className="col-sm-3 col-6">
                        <div className="description-block">
                          <span className="description-percentage text-info">
                            <i className="fas fa-chart-line" /> {totalSuppliers}
                          </span>
                          <h5 className="description-header">{totalSuppliers}</h5>
                          <span className="description-text">TỔNG SỐ NHÀ CUNG CẤP</span>
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
                    {console.log('Rendering hot destinations, count:', hotDestinations.length)}
                    {hotDestinations.length === 0 ? (
                      <div className="text-center py-4">
                        <i className="fas fa-map-marked-alt fa-3x text-muted mb-3"></i>
                        <h5>Đang tải dữ liệu địa điểm...</h5>
                        <p>Chưa có dữ liệu booking để hiển thị địa điểm hot.</p>
                      </div>
                    ) : (
                      <div className="row">
                        {hotDestinations.map((destination, index) => (
                          <div key={destination.categoryId} className="col-md-4 col-sm-6 mb-3">
                          <div className="info-box bg-gradient-light shadow-sm">
                            {destination.randomImage ? (
                              <span className="info-box-icon" style={{ padding: '0', overflow: 'hidden' }}>
                                <img 
                                  src={destination.randomImage} 
                                  alt={destination.categoryName}
                                  style={{ 
                                    width: '100%', 
                                    height: '100%', 
                                    objectFit: 'cover',
                                    borderRadius: '8px 0 0 8px'
                                  }}
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                  }}
                                />
                                <div 
                                  className="fallback-icon bg-gradient-primary"
                                  style={{ 
                                    display: 'none',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '100%',
                                    height: '100%'
                                  }}
                                >
                                  <i className={`${destination.icon} text-white`}></i>
                                </div>
                              </span>
                            ) : (
                              <span className="info-box-icon bg-gradient-primary">
                                <i className={`${destination.icon} text-white`}></i>
                              </span>
                            )}
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
                    )}
                  </div>
                </div>
              </div>
              
              {/* Map Chart Section */}
              <div className="col-md-4">
                <div className="card bg-white border-light">
                  <div className="card-header bg-light border-bottom-0">
                    <h5 className="card-title text-dark">
                      <i className="fas fa-chart-pie text-info mr-2"></i>
                      Phân Bố Booking Theo Vùng
                    </h5>
                  </div>
                  <div className="card-body">
                    {mapChartData && mapChartData.chartData && (
                      <>
                        <div className="chart-container" style={{ position: 'relative', height: windowWidth > 768 ? '350px' : '280px', marginBottom: '15px' }}>
                          <Doughnut 
                            data={mapChartData.chartData}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: {
                                legend: {
                                  position: windowWidth > 576 ? 'bottom' : 'right',
                                  labels: {
                                    boxWidth: windowWidth > 576 ? 12 : 8,
                                    font: {
                                      size: windowWidth > 576 ? 11 : 9
                                    },
                                    padding: windowWidth > 576 ? 10 : 5,
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
                                      const regionName = context.label;
                                      const regionData = mapChartData.regionStats[regionName];
                                      return [
                                        `${regionName}: ${context.parsed} booking`,
                                        `Khách: ${regionData.guests.toLocaleString()}`,
                                        `Doanh thu: ${regionData.revenue.toLocaleString()}đ`
                                      ];
                                    }
                                  }
                                }
                              }
                            }}
                          />
                        </div>
                        
                        {/* Region Statistics */}
                        <div className="region-stats">
                          {Object.entries(mapChartData.regionStats).map(([region, stats]) => (
                            <div key={region} className="d-flex justify-content-between align-items-center mb-2 p-2 bg-light rounded">
                              <div>
                                <strong className="text-dark">{region}</strong>
                                <br/>
                                <small className="text-muted">{stats.provinces.join(', ')}</small>
                              </div>
                              <div className="text-right">
                                <div className="text-primary font-weight-bold">{stats.bookings}</div>
                                <small className="text-muted">booking</small>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {(!mapChartData || !mapChartData.chartData) && (
                      <div className="text-center text-muted py-4">
                        <i className="fas fa-chart-pie fa-3x mb-3"></i>
                        <h6>Chưa có dữ liệu</h6>
                        <p>Khi có booking, biểu đồ sẽ hiển thị phân bố theo vùng miền</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            {/* /.row */}
            
          
            {/* /.row */}
            
            {/* Vietnamese Geographic Map Section */}
            <div className="row">
              <div className="col-md-12">
                <div className="card bg-white border-light">
                  <div className="card-header bg-light border-bottom-0">
                    <h5 className="card-title text-dark">
                      <i className="fas fa-map-marked-alt text-success mr-2"></i>
                      Bản Đồ Việt Nam - Thống Kê Booking
                    </h5>
                  </div>
                  <div className="card-body">
                    <VietnamMap allBookings={allBookings} />
                  </div>
                </div>
              </div>
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
                            <img src={tour.image?.[0]} alt="Tour" className="img-size-50 border border-light" />
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
