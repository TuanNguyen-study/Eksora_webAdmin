import React, { useEffect, useState } from 'react';
import { getReviews } from '../api/api';

function StarRating({ rating }) {
  return (
    <span>
      {[1,2,3,4,5].map(i => (
        <i key={i} className={`fa${i <= rating ? 's' : 'r'} fa-star text-warning`} />
      ))}
    </span>
  );
}

function LastestReview() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ratingStats, setRatingStats] = useState({
    critical: 0,    // 1 sao
    average: 0,     // 2-3 sao
    good: 0         // 4-5 sao
  });

  useEffect(() => {
    getReviews()
      .then(data => {
        // Kiểm tra xem data có phải là array không
        if (Array.isArray(data)) {
          // Sắp xếp mới nhất lên đầu
          const sortedReviews = data.sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt));
          setReviews(sortedReviews.slice(0, 5));
          
          // Tính toán thống kê đánh giá theo mức độ
          const stats = { critical: 0, average: 0, good: 0 };
          data.forEach(review => {
            const rating = parseFloat(review.rating || 0);
            if (rating === 1) {
              stats.critical++;
            } else if (rating >= 2 && rating <= 3) {
              stats.average++;
            } else if (rating >= 4 && rating <= 5) {
              stats.good++;
            }
          });
          setRatingStats(stats);
        } else {
          console.error('Reviews data is not an array:', data);
          setReviews([]);
          setRatingStats({ critical: 0, average: 0, good: 0 });
        }
      })
      .catch(err => {
        console.error('Error fetching reviews:', err);
        setError('Không thể tải review!');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="card mt-4">
      <div className="card-header bg-primary text-white">
        <b>Review mới nhất</b>
      </div>
      
      {/* Rating Statistics Section */}
      <div className="card-body border-bottom">
        <h6 className="mb-3">
          <i className="fas fa-chart-bar mr-2"></i>
          Phân loại đánh giá theo mức độ
        </h6>
        <div className="row">
          <div className="col-md-4">
            <div className="info-box bg-danger">
              <span className="info-box-icon">
                <i className="fas fa-exclamation-triangle"></i>
              </span>
              <div className="info-box-content">
                <span className="info-box-text text-white">Nghiêm trọng</span>
                <span className="info-box-number text-white">{ratingStats.critical}</span>
                <div className="progress">
                  <div className="progress-bar" style={{width: '100%'}}></div>
                </div>
                <span className="progress-description text-white">
                  <i className="fas fa-star mr-1"></i>1 sao
                </span>
              </div>
            </div>
          </div>
          
          <div className="col-md-4">
            <div className="info-box bg-warning">
              <span className="info-box-icon">
                <i className="fas fa-meh"></i>
              </span>
              <div className="info-box-content">
                <span className="info-box-text text-white">Trung bình</span>
                <span className="info-box-number text-white">{ratingStats.average}</span>
                <div className="progress">
                  <div className="progress-bar" style={{width: '100%'}}></div>
                </div>
                <span className="progress-description text-white">
                  <i className="fas fa-star mr-1"></i>2-3 sao
                </span>
              </div>
            </div>
          </div>
          
          <div className="col-md-4">
            <div className="info-box bg-success">
              <span className="info-box-icon">
                <i className="fas fa-smile"></i>
              </span>
              <div className="info-box-content">
                <span className="info-box-text text-white">Tốt</span>
                <span className="info-box-number text-white">{ratingStats.good}</span>
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
      
      <div className="card-body">
        {loading && <div>Đang tải...</div>}
        {error && <div className="alert alert-danger">{error}</div>}
        {!loading && !error && reviews.length === 0 && <div>Chưa có review nào.</div>}
        {!loading && !error && reviews.length > 0 && (
          <ul className="list-group">
            {reviews.map((review, idx) => {
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
                <li key={review._id || idx} className="list-group-item">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center mb-1">
                        <b className="mr-2">{review.tour?.name || '---'}</b>
                        {ratingLevel && (
                          <span className={`badge ${badgeClass} mr-2`}>
                            <i className={`${iconClass} mr-1`}></i>
                            {ratingLevel}
                          </span>
                        )}
                      </div>
                      <div className="small text-muted mb-1">
                        <i className="fas fa-user mr-1"></i>
                        {review.user_name || (review.user ? ((review.user.first_name || '') + ' ' + (review.user.last_name || '')) : 'Ẩn danh')}
                      </div>
                      <div className="text-dark">
                        <i className="fas fa-quote-left text-muted mr-1"></i>
                        {review.comment || 'Không có bình luận'}
                      </div>
                    </div>
                    <div className="text-right ml-3">
                      <div className="mb-1">
                        <StarRating rating={rating} />
                      </div>
                      <small className="text-muted">
                        {rating.toFixed(1)}/5.0
                      </small>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default LastestReview;
