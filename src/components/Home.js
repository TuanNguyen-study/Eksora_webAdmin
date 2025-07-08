import React, { useEffect, useState } from 'react';
import { getTours, getAllBookings, getAllUsers, getReviews } from '../api/api';
import Calendar from '../pages/Calendar';
import LastestReview from './LastestReview';
import { Line } from 'react-chartjs-2';
import { Chart, BarElement, CategoryScale, LinearScale, Tooltip, Legend, PointElement, LineElement } from 'chart.js';
Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend, PointElement, LineElement);
const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?name=User&background=dee2e6&color=495057&size=128';

function Home() {
  const [recentTours, setRecentTours] = useState([]);
  const [totalTours, setTotalTours] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0); 
  const [latestBookings, setLatestBookings] = useState([]);
  const [latestUsers, setLatestUsers] = useState([]);
  const [newMembersCount, setNewMembersCount] = useState(0);
  const [monthlyBookingStats, setMonthlyBookingStats] = useState({ labels: [], data: [] });
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [chartLoading, setChartLoading] = useState(false);
  const [allBookings, setAllBookings] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);

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
        const users = data.filter(u => u.role !== 'admin');
        // Sắp xếp theo ngày tạo mới nhất
        const sorted = users.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        setLatestUsers(sorted.slice(0, 8));
        // Đếm số lượng user tạo trong 1 tháng gần nhất
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        setNewMembersCount(users.filter(u => new Date(u.createdAt) >= oneMonthAgo).length);
      } catch (err) {
        setLatestUsers([]);
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
                <div className="info-box mb-3 bg-success">
                  <span className="info-box-icon"><i className="fas fa-book" /></span>
                  <div className="info-box-content">
                    <span className="info-box-text text-white">Bookings</span>
                    <span className="info-box-number text-white">{latestBookings.length}</span>
                  </div>
                </div>
              </div>
              <div className="col-12 col-sm-6 col-md-3">
                <div className="info-box mb-3 bg-info">
                  <span className="info-box-icon"><i className="fas fa-users" /></span>
                  <div className="info-box-content">
                    <span className="info-box-text text-white">Users</span>
                    <span className="info-box-number text-white">{latestUsers.length}</span>
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
                      <div className="col-md-8">
                        <div className="d-flex justify-content-center align-items-center mb-2">
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
                      {/* /.col */}
                      <div className="col-md-4">
                        <p className="text-center">
                          <strong>Goal Completion</strong>
                        </p>
                        <div className="progress-group">
                          Add Products to Cart
                          <span className="float-right"><b>160</b>/200</span>
                          <div className="progress progress-sm">
                            <div className="progress-bar bg-primary" style={{width: '80%'}} />
                          </div>
                        </div>
                        {/* /.progress-group */}
                        <div className="progress-group">
                          Complete Purchase
                          <span className="float-right"><b>310</b>/400</span>
                          <div className="progress progress-sm">
                            <div className="progress-bar bg-danger" style={{width: '75%'}} />
                          </div>
                        </div>
                        {/* /.progress-group */}
                        <div className="progress-group">
                          <span className="progress-text">Visit Premium Page</span>
                          <span className="float-right"><b>480</b>/800</span>
                          <div className="progress progress-sm">
                            <div className="progress-bar bg-success" style={{width: '60%'}} />
                          </div>
                        </div>
                        {/* /.progress-group */}
                        <div className="progress-group">
                          Send Inquiries
                          <span className="float-right"><b>250</b>/500</span>
                          <div className="progress progress-sm">
                            <div className="progress-bar bg-warning" style={{width: '50%'}} />
                          </div>
                        </div>
                        {/* /.progress-group */}
                      </div>
                      {/* /.col */}
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
                    <h3 className="card-title">Lịch Booking</h3>
                  </div>
                  <div className="card-body">
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
                {/* Info Boxes Style 2 */}
                <div className="info-box mb-3 bg-warning">
                  <span className="info-box-icon"><i className="fas fa-tag" /></span>
                  <div className="info-box-content">
                    <span className="info-box-text">Inventory</span>
                    <span className="info-box-number">5,200</span>
                  </div>
                  {/* /.info-box-content */}
                </div>
                {/* /.info-box */}
                <div className="info-box mb-3 bg-success">
                  <span className="info-box-icon"><i className="far fa-heart" /></span>
                  <div className="info-box-content">
                    <span className="info-box-text">Mentions</span>
                    <span className="info-box-number">92,050</span>
                  </div>
                  {/* /.info-box-content */}
                </div>
                {/* /.info-box */}
                <div className="info-box mb-3 bg-danger">
                  <span className="info-box-icon"><i className="fas fa-cloud-download-alt" /></span>
                  <div className="info-box-content">
                    <span className="info-box-text">Downloads</span>
                    <span className="info-box-number">114,381</span>
                  </div>
                  {/* /.info-box-content */}
                </div>
                {/* /.info-box */}
                <div className="info-box mb-3 bg-info">
                  <span className="info-box-icon"><i className="far fa-comment" /></span>
                  <div className="info-box-content">
                    <span className="info-box-text">Direct Messages</span>
                    <span className="info-box-number">163,921</span>
                  </div>
                  {/* /.info-box-content */}
                </div>
                {/* /.info-box */}
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
