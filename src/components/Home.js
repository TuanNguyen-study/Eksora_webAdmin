import React, { useEffect, useState } from 'react';
import { getTours, getAllBookings, getAllUsers, getReviews } from '../api/api';
import Calendar from '../pages/Calendar';
import LastestReview from './LastestReview';
import { Bar } from 'react-chartjs-2';
import { Chart, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);
const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?name=User&background=dee2e6&color=495057&size=128';

function Home() {
  const [recentTours, setRecentTours] = useState([]);
  const [totalTours, setTotalTours] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0); // Thêm state tổng số review
  const [latestBookings, setLatestBookings] = useState([]);
  const [latestUsers, setLatestUsers] = useState([]);
  const [newMembersCount, setNewMembersCount] = useState(0);
  const [monthlyBookingStats, setMonthlyBookingStats] = useState({ labels: [], data: [] });
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

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
    async function fetchMonthlyBookingStats() {
      try {
        const data = await getAllBookings();
        const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
        // Trục y: 0, 10, 20, 40, 60
        const yLabels = [0, 10, 20, 40, 60];
        const labels = Array.from({ length: daysInMonth }, (_, i) => `${i + 1}`);
        const counts = Array(daysInMonth).fill(0);
        data.forEach(b => {
          const d = new Date(b.createdAt);
          if (d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear) {
            counts[d.getDate() - 1]++;
          }
        });
        setMonthlyBookingStats({ labels, data: counts, yLabels });
      } catch (err) {
        setMonthlyBookingStats({ labels: [], data: [], yLabels: [] });
      }
    }
    fetchMonthlyBookingStats();
  }, [selectedMonth, selectedYear]);
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
                          <Bar
                            data={{
                              labels: monthlyBookingStats.labels,
                              datasets: [
                                {
                                  label: 'Bookings',
                                  data: monthlyBookingStats.data,
                                  backgroundColor: 'rgba(54, 162, 235, 0.7)',
                                  borderColor: 'rgba(54, 162, 235, 1)',
                                  borderWidth: 1,
                                },
                              ],
                            }}
                            options={{
                              responsive: true,
                              plugins: {
                                legend: { display: false },
                                tooltip: { enabled: true },
                              },
                              scales: {
                                x: { title: { display: true, text: 'Ngày trong tháng' } },
                                y: {
                                  title: { display: true, text: 'Số lượng Booking' },
                                  beginAtZero: true,
                                  ticks: {
                                    stepSize: 10,
                                    callback: function(value) {
                                      // Hiển thị nhãn trục y: 0,10,20,40,60
                                      if (monthlyBookingStats.yLabels && monthlyBookingStats.yLabels.includes(value)) return value;
                                      if (value === 0) return value;
                                      return '';
                                    }
                                  }
                                },
                              },
                            }}
                            height={180}
                          />
                        </div>
                        <div className="text-center mt-2">
                          <span className="badge badge-info" style={{fontSize: '1.1rem'}}>Tổng số Booking tháng này: {monthlyBookingStats.data.reduce((a, b) => a + b, 0)}</span>
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
                          <h5 className="description-header">$35,210.43</h5>
                          <span className="description-text">TOTAL REVENUE</span>
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
                              {tour.description?.slice(0, 50)}{tour.description?.length > 50 ? '...' : ''}
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
