import React, { useState, useEffect } from 'react';
import { getSuppliers, getTours, getAllBookings } from '../api/api';
import { FaUser, FaMapMarkerAlt, FaMoneyBillWave, FaChartLine, FaEye, FaSearch } from 'react-icons/fa';

const SupplierAnalytics = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [tours, setTours] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [analyticsData, setAnalyticsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [sortBy, setSortBy] = useState('tours'); // 'tours' or 'revenue'

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (suppliers.length > 0 && tours.length > 0 && bookings.length > 0) {
      calculateAnalytics();
    }
  }, [suppliers, tours, bookings]);

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching supplier analytics data...');
      
      const [suppliersData, toursData, bookingsData] = await Promise.all([
        getSuppliers(),
        getTours(),
        getAllBookings()
      ]);

      console.log('📊 Data received:', {
        suppliers: suppliersData?.length,
        tours: toursData?.length,
        bookings: bookingsData?.length
      });

      setSuppliers(suppliersData || []);
      setTours(toursData || []);
      setBookings(bookingsData || []);
    } catch (error) {
      console.error('❌ Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = () => {
    console.log('🔢 Calculating analytics...');
    
    const analytics = suppliers.map(supplier => {
      // Tìm tours của supplier này
      const supplierTours = tours.filter(tour => {
        const tourSupplierId = typeof tour.supplier_id === 'object' 
          ? tour.supplier_id?._id || tour.supplier_id?.id 
          : tour.supplier_id;
        return tourSupplierId === supplier._id || tourSupplierId === supplier.id;
      });

      console.log(`📊 Supplier ${supplier.email}:`, {
        id: supplier._id,
        toursFound: supplierTours.length,
        tourIds: supplierTours.map(t => t._id)
      });

      // Tính doanh thu từ bookings của các tours này
      let totalRevenue = 0;
      let totalBookings = 0;
      
      supplierTours.forEach(tour => {
        const tourBookings = bookings.filter(booking => {
          const bookingTourId = typeof booking.tour_id === 'object'
            ? booking.tour_id?._id || booking.tour_id?.id
            : booking.tour_id;
          return bookingTourId === tour._id && booking.status === 'confirmed';
        });
        
        tourBookings.forEach(booking => {
          totalRevenue += booking.totalCost || 0;
          totalBookings++;
        });
      });

      return {
        supplier,
        tourCount: supplierTours.length,
        totalRevenue,
        totalBookings,
        tours: supplierTours,
        averageRevenuePerTour: supplierTours.length > 0 ? totalRevenue / supplierTours.length : 0
      };
    });

    // Sắp xếp theo tiêu chí được chọn
    const sortedAnalytics = analytics.sort((a, b) => {
      if (sortBy === 'revenue') {
        return b.totalRevenue - a.totalRevenue;
      }
      return b.tourCount - a.tourCount;
    });

    console.log('📈 Analytics calculated:', sortedAnalytics);
    setAnalyticsData(sortedAnalytics);
  };

  const filteredAnalytics = analyticsData.filter(data => {
    const searchLower = searchTerm.toLowerCase();
    const supplier = data.supplier;
    const fullName = `${supplier.first_name || ''} ${supplier.last_name || ''}`.trim().toLowerCase();
    const email = supplier.email?.toLowerCase() || '';
    
    return fullName.includes(searchLower) || email.includes(searchLower);
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const getSupplierDisplayName = (supplier) => {
    const firstName = supplier.first_name || '';
    const lastName = supplier.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || supplier.email || 'Unnamed Supplier';
  };

  if (loading) {
    return (
      <div className="content-wrapper">
        <div className="content-header">
          <div className="container-fluid">
            <div className="row mb-2">
              <div className="col-sm-6">
                <h1 className="m-0">Supplier Analytics</h1>
              </div>
            </div>
          </div>
        </div>
        <section className="content">
          <div className="container-fluid">
            <div className="row">
              <div className="col-12">
                <div className="card">
                  <div className="card-body">
                    <div className="text-center">
                      <div className="spinner-border" role="status">
                        <span className="sr-only">Đang tải...</span>
                      </div>
                      <p className="mt-3">Đang tải dữ liệu phân tích supplier...</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="content-wrapper">
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">
                <FaChartLine className="mr-2" />
                Supplier Analytics
              </h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><a href="#!">Home</a></li>
                <li className="breadcrumb-item active">Supplier Analytics</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          {/* Summary Cards */}
          <div className="row">
            <div className="col-lg-3 col-6">
              <div className="small-box bg-info">
                <div className="inner">
                  <h3>{suppliers.length}</h3>
                  <p>Total Suppliers</p>
                </div>
                <div className="icon">
                  <FaUser />
                </div>
              </div>
            </div>
            <div className="col-lg-3 col-6">
              <div className="small-box bg-success">
                <div className="inner">
                  <h3>{tours.length}</h3>
                  <p>Total Tours</p>
                </div>
                <div className="icon">
                  <FaMapMarkerAlt />
                </div>
              </div>
            </div>
            <div className="col-lg-3 col-6">
              <div className="small-box bg-warning">
                <div className="inner">
                  <h3>{bookings.filter(b => b.status === 'confirmed').length}</h3>
                  <p>Confirmed Bookings</p>
                </div>
                <div className="icon">
                  <FaChartLine />
                </div>
              </div>
            </div>
            <div className="col-lg-3 col-6">
              <div className="small-box bg-danger">
                <div className="inner">
                  <h3>{formatCurrency(
                    bookings
                      .filter(b => b.status === 'confirmed')
                      .reduce((sum, b) => sum + (b.totalCost || 0), 0)
                  )}</h3>
                  <p>Total Revenue</p>
                </div>
                <div className="icon">
                  <FaMoneyBillWave />
                </div>
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="row">
            <div className="col-12">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Supplier Performance</h3>
                  <div className="card-tools">
                    <div className="input-group input-group-sm" style={{ width: '300px' }}>
                      <input
                        type="text"
                        name="search"
                        className="form-control float-right"
                        placeholder="Search suppliers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      <div className="input-group-append">
                        <button type="submit" className="btn btn-default">
                          <FaSearch />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="card-body p-0">
                  {/* Sort Options */}
                  <div className="p-3 border-bottom">
                    <div className="btn-group" role="group">
                      <button
                        type="button"
                        className={`btn btn-sm ${sortBy === 'tours' ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => setSortBy('tours')}
                      >
                        Sort by Tours
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${sortBy === 'revenue' ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => setSortBy('revenue')}
                      >
                        Sort by Revenue
                      </button>
                    </div>
                  </div>

                  {/* Suppliers List */}
                  <div className="table-responsive">
                    <table className="table table-striped">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Supplier Info</th>
                          <th>Tours Count</th>
                          <th>Total Bookings</th>
                          <th>Total Revenue</th>
                          <th>Avg Revenue/Tour</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAnalytics.map((data, index) => (
                          <tr key={data.supplier._id || data.supplier.id}>
                            <td>{index + 1}</td>
                            <td>
                              <div className="d-flex flex-column">
                                <strong>{getSupplierDisplayName(data.supplier)}</strong>
                                <small className="text-muted">{data.supplier.email}</small>
                                {data.supplier.phone && (
                                  <small className="text-muted">{data.supplier.phone}</small>
                                )}
                              </div>
                            </td>
                            <td>
                              <span className={`badge ${data.tourCount > 5 ? 'badge-success' : data.tourCount > 2 ? 'badge-warning' : 'badge-secondary'}`}>
                                {data.tourCount} tours
                              </span>
                            </td>
                            <td>
                              <span className="badge badge-info">
                                {data.totalBookings} bookings
                              </span>
                            </td>
                            <td>
                              <strong className={data.totalRevenue > 50000000 ? 'text-success' : data.totalRevenue > 10000000 ? 'text-warning' : 'text-muted'}>
                                {formatCurrency(data.totalRevenue)}
                              </strong>
                            </td>
                            <td>
                              <span className="text-info">
                                {formatCurrency(data.averageRevenuePerTour)}
                              </span>
                            </td>
                            <td>
                              <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => setSelectedSupplier(data)}
                                data-toggle="modal"
                                data-target="#supplierDetailModal"
                              >
                                <FaEye /> View Details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {filteredAnalytics.length === 0 && (
                    <div className="p-4 text-center text-muted">
                      <p>No suppliers found matching your search criteria.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Supplier Detail Modal */}
      {selectedSupplier && (
        <div className="modal fade" id="supplierDetailModal" tabIndex="-1" role="dialog">
          <div className="modal-dialog modal-lg" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {getSupplierDisplayName(selectedSupplier.supplier)} - Detailed Analytics
                </h5>
                <button type="button" className="close" data-dismiss="modal">
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6">
                    <h6>Supplier Information</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr>
                          <td><strong>Email:</strong></td>
                          <td>{selectedSupplier.supplier.email}</td>
                        </tr>
                        <tr>
                          <td><strong>Phone:</strong></td>
                          <td>{selectedSupplier.supplier.phone || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td><strong>Address:</strong></td>
                          <td>{selectedSupplier.supplier.address || 'N/A'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="col-md-6">
                    <h6>Performance Metrics</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr>
                          <td><strong>Total Tours:</strong></td>
                          <td>{selectedSupplier.tourCount}</td>
                        </tr>
                        <tr>
                          <td><strong>Total Bookings:</strong></td>
                          <td>{selectedSupplier.totalBookings}</td>
                        </tr>
                        <tr>
                          <td><strong>Total Revenue:</strong></td>
                          <td>{formatCurrency(selectedSupplier.totalRevenue)}</td>
                        </tr>
                        <tr>
                          <td><strong>Avg Revenue per Tour:</strong></td>
                          <td>{formatCurrency(selectedSupplier.averageRevenuePerTour)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <h6 className="mt-4">Tours by this Supplier</h6>
                <div className="table-responsive">
                  <table className="table table-sm table-striped">
                    <thead>
                      <tr>
                        <th>Tour Name</th>
                        <th>Location</th>
                        <th>Price</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSupplier.tours.map(tour => (
                        <tr key={tour._id}>
                          <td>{tour.name}</td>
                          <td>{tour.location}</td>
                          <td>{formatCurrency(tour.price)}</td>
                          <td>
                            <span className={`badge badge-${tour.status === 'active' ? 'success' : tour.status === 'pending' ? 'warning' : 'secondary'}`}>
                              {tour.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" data-dismiss="modal">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierAnalytics;
