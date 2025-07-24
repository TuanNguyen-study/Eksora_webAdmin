import React, { useEffect, useState } from 'react';
import { getReviews, getCurrentUserRole, getUser } from '../api/api';

function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [userRole, setUserRole] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
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
    <div className="container mt-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Danh sách Review</h2>
        {userRole === 'supplier' && (
          <small className="text-muted">
            <i className="fas fa-info-circle mr-1"></i>
            Hiển thị reviews cho tours của bạn cung cấp
          </small>
        )}
      </div>
      {loading && <div>Đang tải dữ liệu...</div>}
      {error && <div className="alert alert-danger">{error}</div>}
      {!loading && !error && (
        <div>
          {reviews.length === 0 ? (
            <div className="alert alert-info">
              {userRole === 'supplier' 
                ? 'Chưa có review nào cho tours của bạn.' 
                : 'Chưa có review nào trong hệ thống.'
              }
            </div>
          ) : (
            <>
              <div className="mb-2">
                <small className="text-muted">
                  Tổng cộng: {reviews.length} review{reviews.length > 1 ? 's' : ''}
                </small>
              </div>
              <table className="table table-bordered">
                <thead>
                  <tr>
                    <th>Người dùng</th>
                    <th>Tour</th>
                    <th>Bình luận</th>
                    <th>Đánh giá</th>
                    <th>Ngày</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedReviews.map((review, idx) => (
                    <tr key={review._id || idx}>
                      <td>{review.user_name || (review.user ? ((review.user.first_name || '') + (review.user.last_name || '')) : 'Ẩn danh')}</td>
                      <td>{review.tour?.name || '---'}</td>
                      <td>{review.comment}</td>
                      <td>{parseFloat(review.rating || 0).toFixed(1)}</td>
                      <td>{new Date(review.created_at || review.createdAt).toLocaleString('vi-VN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Pagination */}
              {totalPages > 1 && (
                <nav>
                  <ul className="pagination">
                    <li className={`page-item${currentPage === 1 ? ' disabled' : ''}`}>
                      <button className="page-link" onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1}>Previous</button>
                    </li>
                    {Array.from({ length: totalPages }, (_, i) => (
                      <li key={i + 1} className={`page-item${currentPage === i + 1 ? ' active' : ''}`}>
                        <button className="page-link" onClick={() => setCurrentPage(i + 1)}>{i + 1}</button>
                      </li>
                    ))}
                    <li className={`page-item${currentPage === totalPages ? ' disabled' : ''}`}>
                      <button className="page-link" onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages}>Next</button>
                    </li>
                  </ul>
                </nav>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default Reviews;
