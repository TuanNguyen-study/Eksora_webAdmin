import React, { useEffect, useState } from 'react';
import { getReviews } from '../api/api';

function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    document.title = 'Quản lý Review | Eksora Admin';
    async function fetchReviews() {
      setLoading(true);
      setError(null);
      try {
        const data = await getReviews();
        setReviews(data);
      } catch (err) {
        setError('Không thể tải danh sách review!');
      } finally {
        setLoading(false);
      }
    }
    fetchReviews();
  }, []);

  // Phân trang
  const totalPages = Math.ceil(reviews.length / itemsPerPage);
  const pagedReviews = reviews.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="container mt-3">
      <h2>Danh sách Review</h2>
      {loading && <div>Đang tải dữ liệu...</div>}
      {error && <div className="alert alert-danger">{error}</div>}
      {!loading && !error && (
        <div>
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
                  <td>{review.rating}</td>
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
        </div>
      )}
    </div>
  );
}

export default Reviews;
