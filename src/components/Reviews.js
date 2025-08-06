import React, { useEffect, useState } from 'react';
import { getReviews, getCurrentUserRole, getUser } from '../api/api';
import { useNavigate } from 'react-router-dom';

function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [userRole, setUserRole] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [selectedReview, setSelectedReview] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();
  const itemsPerPage = 10;

  useEffect(() => {
    document.title = 'Quản lý Review | Eksora Admin';
    
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        // Lấy thông tin user và role
        const [role, userProfile, reviewsData] = await Promise.all([
          getCurrentUserRole(),
          getUser(),
          getReviews()
        ]);
        
        setUserRole(role);
        setCurrentUserId(userProfile._id);
        
        // Nếu là supplier, chỉ hiển thị reviews của tours mà supplier đó cung cấp
        if (role === 'supplier') {
          const supplierReviews = reviewsData.filter(review => {
            // Kiểm tra nếu tour của review có supplier_id trùng với current user
            return review.tour?.supplier_id === userProfile._id || 
                   review.tour?.supplier_id?._id === userProfile._id;
          });
          setReviews(supplierReviews);
        } else {
          // Admin thì hiển thị tất cả reviews
          setReviews(reviewsData);
        }

      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Không thể tải danh sách review!');
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);

  // Phân trang
  const totalPages = Math.ceil(reviews.length / itemsPerPage);
  const pagedReviews = reviews.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="content-wrapper">
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">
                <i className="fas fa-star mr-2"></i>Quản lý Review
              </h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><a href="#">Dashboard</a></li>
                <li className="breadcrumb-item active">Reviews</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
         

          {/* Rating Statistics by Level */}
          <div className="row mb-3">
            <div className="col-md-12">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">
                    <i className="fas fa-chart-bar mr-2"></i>
                    Phân loại đánh giá theo mức độ
                  </h3>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-lg-4 col-md-6 col-sm-12">
                      <div className="info-box bg-danger">
                        <span className="info-box-icon">
                          <i className="fas fa-exclamation-triangle"></i>
                        </span>
                        <div className="info-box-content">
                          <span className="info-box-text text-white">Nghiêm trọng</span>
                          <span className="info-box-number text-white">
                            {reviews.filter(r => parseFloat(r.rating || 0) === 1).length}
                          </span>
                          <div className="progress">
                            <div className="progress-bar" style={{width: '100%'}}></div>
                          </div>
                          <span className="progress-description text-white">
                            <i className="fas fa-star mr-1"></i>1 sao
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="col-lg-4 col-md-6 col-sm-12">
                      <div className="info-box bg-warning">
                        <span className="info-box-icon">
                          <i className="fas fa-meh"></i>
                        </span>
                        <div className="info-box-content">
                          <span className="info-box-text text-white">Trung bình</span>
                          <span className="info-box-number text-white">
                            {reviews.filter(r => {
                              const rating = parseFloat(r.rating || 0);
                              return rating >= 2 && rating <= 3;
                            }).length}
                          </span>
                          <div className="progress">
                            <div className="progress-bar" style={{width: '100%'}}></div>
                          </div>
                          <span className="progress-description text-white">
                            <i className="fas fa-star mr-1"></i>2-3 sao
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="col-lg-4 col-md-6 col-sm-12">
                      <div className="info-box bg-success">
                        <span className="info-box-icon">
                          <i className="fas fa-smile"></i>
                        </span>
                        <div className="info-box-content">
                          <span className="info-box-text text-white">Tốt</span>
                          <span className="info-box-number text-white">
                            {reviews.filter(r => {
                              const rating = parseFloat(r.rating || 0);
                              return rating >= 4 && rating <= 5;
                            }).length}
                          </span>
                          <div className="progress">
                            <div className="progress-bar" style={{width: '100%'}}></div>
                          </div>
                          <span className="progress-description text-white">
                            <i className="fas fa-star mr-1"></i>4-5 sao
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {userRole === 'supplier' && (
            <div className="alert alert-info">
              <i className="fas fa-info-circle mr-2"></i>
              <strong>Lưu ý:</strong> Bạn chỉ có thể xem reviews cho các tours mà bạn cung cấp.
            </div>
          )}

          {/* Reviews Table Card */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <i className="fas fa-list mr-2"></i>Danh sách Reviews
              </h3>
              <div className="card-tools">
                <span className="badge badge-primary">
                  {reviews.length} review{reviews.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <div className="card-body p-0">
              {loading && (
                <div className="d-flex justify-content-center p-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="sr-only">Loading...</span>
                  </div>
                </div>
              )}
              
              {error && (
                <div className="alert alert-danger m-3">
                  <i className="fas fa-exclamation-triangle mr-2"></i>
                  {error}
                </div>
              )}
              
              {!loading && !error && reviews.length === 0 && (
                <div className="text-center p-4">
                  <i className="fas fa-comments fa-3x text-muted mb-3"></i>
                  <h4 className="text-muted">Chưa có review nào</h4>
                  <p className="text-muted">
                    {userRole === 'supplier' 
                      ? 'Chưa có review nào cho tours của bạn.' 
                      : 'Chưa có review nào trong hệ thống.'
                    }
                  </p>
                </div>
              )}
              
              {!loading && !error && reviews.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="thead-light">
                      <tr>
                        <th style={{width: '15%'}}>
                          <i className="fas fa-user mr-1"></i>Người dùng
                        </th>
                        <th style={{width: '20%'}}>
                          <i className="fas fa-map-marked-alt mr-1"></i>Tour
                        </th>
                        <th style={{width: '30%'}}>
                          <i className="fas fa-comment mr-1"></i>Bình luận
                        </th>
                        <th style={{width: '10%'}} className="text-center">
                          <i className="fas fa-star mr-1"></i>Đánh giá
                        </th>
                        <th style={{width: '12%'}} className="text-center">
                          <i className="fas fa-calendar mr-1"></i>Ngày
                        </th>
                        <th style={{width: '13%'}} className="text-center">
                          <i className="fas fa-cog mr-1"></i>Thao tác
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedReviews.map((review, idx) => {
                        const rating = parseFloat(review.rating || 0);
                        let ratingLevel = '';
                        let badgeClass = '';
                        let iconClass = '';
                        
                        if (rating === 1) {
                          ratingLevel = 'Nghiêm trọng';
                          badgeClass = 'badge-danger';
                          iconClass = 'fas fa-exclamation-triangle';
                        } else if (rating >= 2 && rating <= 3) {
                          ratingLevel = 'Trung bình';
                          badgeClass = 'badge-warning';
                          iconClass = 'fas fa-meh';
                        } else if (rating >= 4 && rating <= 5) {
                          ratingLevel = 'Tốt';
                          badgeClass = 'badge-success';
                          iconClass = 'fas fa-smile';
                        }
                        
                        return (
                        <tr key={review._id || idx}>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="avatar bg-primary text-white rounded-circle d-flex align-items-center justify-content-center mr-2" 
                                   style={{width: '32px', height: '32px', fontSize: '14px'}}>
                                {(review.user_name || review.user?.first_name || 'A')[0].toUpperCase()}
                              </div>
                              <div>
                                <div className="font-weight-bold">
                                  {review.user_name || 
                                   (review.user ? `${review.user.first_name || ''} ${review.user.last_name || ''}`.trim() : '') || 
                                   'Ẩn danh'}
                                </div>
                                {review.user?.email && (
                                  <small className="text-muted">{review.user.email}</small>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div>
                              <div className="d-flex align-items-center mb-1">
                                <div className="font-weight-bold text-primary mr-2">
                                  {review.tour?.name || '---'}
                                </div>
                                {ratingLevel && (
                                  <span className={`badge ${badgeClass} badge-sm`}>
                                    <i className={`${iconClass} mr-1`}></i>
                                    {ratingLevel}
                                  </span>
                                )}
                              </div>
                              {review.tour?.location && (
                                <small className="text-muted">
                                  <i className="fas fa-map-marker-alt mr-1"></i>
                                  {review.tour.location}
                                </small>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="review-comment" style={{maxHeight: '60px', overflow: 'hidden'}}>
                              {review.comment || <em className="text-muted">Không có bình luận</em>}
                            </div>
                          </td>
                          <td className="text-center">
                            <div className="rating-display">
                              <span className="badge badge-secondary font-weight-bold mb-1">
                                {rating.toFixed(1)}⭐
                              </span>
                              <div className="mt-1">
                                {[1, 2, 3, 4, 5].map(star => (
                                  <i 
                                    key={star}
                                    className={`fas fa-star ${
                                      star <= (review.rating || 0) ? 'text-warning' : 'text-muted'
                                    }`}
                                    style={{fontSize: '12px'}}
                                  />
                                ))}
                              </div>
                            </div>
                          </td>
                          <td className="text-center">
                            <div>
                              <div className="font-weight-bold">
                                {new Date(review.created_at || review.createdAt).toLocaleDateString('vi-VN')}
                              </div>
                              <small className="text-muted">
                                {new Date(review.created_at || review.createdAt).toLocaleTimeString('vi-VN', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </small>
                            </div>
                          </td>
                          <td className="text-center">
                            <div className="btn-group-vertical btn-group-sm">
                              {review.booking_id && (
                                <button 
                                  className="btn btn-outline-primary btn-sm mb-1"
                                  onClick={() => {
                                    // Chuyển đến trang bookings với booking ID
                                    navigate(`/bookings?highlight=${review.booking_id}`);
                                  }}
                                  title="Xem chi tiết booking"
                                >
                                  <i className="fas fa-eye mr-1"></i>
                                  Chi tiết
                                </button>
                              )}
                              <button 
                                className="btn btn-outline-info btn-sm"
                                onClick={() => {
                                  setSelectedReview(review);
                                  setShowModal(true);
                                }}
                                title="Xem chi tiết review"
                              >
                                <i className="fas fa-info mr-1"></i>
                                Review
                              </button>
                            </div>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            {/* Pagination */}
            {!loading && !error && totalPages > 1 && (
              <div className="card-footer">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <small className="text-muted">
                      Hiển thị {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, reviews.length)} 
                      của {reviews.length} reviews
                    </small>
                  </div>
                  <nav>
                    <ul className="pagination pagination-sm mb-0">
                      <li className={`page-item${currentPage === 1 ? ' disabled' : ''}`}>
                        <button 
                          className="page-link" 
                          onClick={() => setCurrentPage(currentPage - 1)} 
                          disabled={currentPage === 1}
                        >
                          <i className="fas fa-chevron-left"></i>
                        </button>
                      </li>
                      {Array.from({ length: totalPages }, (_, i) => (
                        <li key={i + 1} className={`page-item${currentPage === i + 1 ? ' active' : ''}`}>
                          <button className="page-link" onClick={() => setCurrentPage(i + 1)}>
                            {i + 1}
                          </button>
                        </li>
                      ))}
                      <li className={`page-item${currentPage === totalPages ? ' disabled' : ''}`}>
                        <button 
                          className="page-link" 
                          onClick={() => setCurrentPage(currentPage + 1)} 
                          disabled={currentPage === totalPages}
                        >
                          <i className="fas fa-chevron-right"></i>
                        </button>
                      </li>
                    </ul>
                  </nav>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Review Detail Modal */}
      {showModal && selectedReview && (
        <div className="modal fade show" style={{display: 'block', backgroundColor: 'rgba(0,0,0,0.5)'}} onClick={() => setShowModal(false)}>
          <div className="modal-dialog modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h4 className="modal-title">
                  <i className="fas fa-star mr-2"></i>
                  Chi tiết Review
                </h4>
                <button type="button" className="close text-white" onClick={() => setShowModal(false)}>
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6">
                    <div className="info-box border">
                      <span className="info-box-icon bg-primary">
                        <i className="fas fa-map-marked-alt"></i>
                      </span>
                      <div className="info-box-content">
                        <span className="info-box-text">Tour</span>
                        <span className="info-box-number">{selectedReview.tour?.name || 'N/A'}</span>
                        {selectedReview.tour?.location && (
                          <span className="progress-description">
                            <i className="fas fa-map-marker-alt mr-1"></i>
                            {selectedReview.tour.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="info-box border">
                      <span className="info-box-icon bg-info">
                        <i className="fas fa-user"></i>
                      </span>
                      <div className="info-box-content">
                        <span className="info-box-text">Khách hàng</span>
                        <span className="info-box-number">
                          {selectedReview.user_name || 
                           (selectedReview.user ? `${selectedReview.user.first_name || ''} ${selectedReview.user.last_name || ''}`.trim() : '') || 
                           'Ẩn danh'}
                        </span>
                        {selectedReview.user?.email && (
                          <span className="progress-description">
                            <i className="fas fa-envelope mr-1"></i>
                            {selectedReview.user.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6">
                    <div className="info-box border">
                      <span className="info-box-icon bg-warning">
                        <i className="fas fa-star"></i>
                      </span>
                      <div className="info-box-content">
                        <span className="info-box-text">Đánh giá</span>
                        <span className="info-box-number">{parseFloat(selectedReview.rating || 0).toFixed(1)}/5.0</span>
                        <div className="progress-description">
                          {[1, 2, 3, 4, 5].map(star => (
                            <i 
                              key={star}
                              className={`fas fa-star ${
                                star <= (selectedReview.rating || 0) ? 'text-warning' : 'text-muted'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="info-box border">
                      <span className="info-box-icon bg-success">
                        <i className="fas fa-calendar"></i>
                      </span>
                      <div className="info-box-content">
                        <span className="info-box-text">Ngày đánh giá</span>
                        <span className="info-box-number">
                          {new Date(selectedReview.created_at || selectedReview.createdAt).toLocaleDateString('vi-VN')}
                        </span>
                        <span className="progress-description">
                          <i className="fas fa-clock mr-1"></i>
                          {new Date(selectedReview.created_at || selectedReview.createdAt).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-12">
                    <div className="card">
                      <div className="card-header">
                        <h5 className="card-title">
                          <i className="fas fa-comment mr-2"></i>
                          Bình luận
                        </h5>
                      </div>
                      <div className="card-body">
                        <blockquote className="blockquote">
                          <p className="mb-0">
                            {selectedReview.comment || <em className="text-muted">Không có bình luận</em>}
                          </p>
                          <footer className="blockquote-footer mt-2">
                            <cite title="Source Title">
                              {selectedReview.user_name || 
                               (selectedReview.user ? `${selectedReview.user.first_name || ''} ${selectedReview.user.last_name || ''}`.trim() : '') || 
                               'Ẩn danh'}
                            </cite>
                          </footer>
                        </blockquote>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedReview.booking_id && (
                  <div className="row">
                    <div className="col-md-12">
                      <div className="alert alert-info">
                        <h6>
                          <i className="fas fa-info-circle mr-2"></i>
                          Thông tin booking
                        </h6>
                        <p className="mb-2">
                          <strong>Booking ID:</strong> {selectedReview.booking_id}
                        </p>
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            setShowModal(false);
                            navigate(`/bookings?highlight=${selectedReview.booking_id}`);
                          }}
                        >
                          <i className="fas fa-external-link-alt mr-1"></i>
                          Xem chi tiết booking
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  <i className="fas fa-times mr-1"></i>
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Reviews;
