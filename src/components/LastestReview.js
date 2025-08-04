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

  useEffect(() => {
    getReviews()
      .then(data => {
        // Kiểm tra xem data có phải là array không
        if (Array.isArray(data)) {
          // Sắp xếp mới nhất lên đầu
          setReviews(data.sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt)).slice(0, 5));
        } else {
          console.error('Reviews data is not an array:', data);
          setReviews([]);
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
      <div className="card-body">
        {loading && <div>Đang tải...</div>}
        {error && <div className="alert alert-danger">{error}</div>}
        {!loading && !error && reviews.length === 0 && <div>Chưa có review nào.</div>}
        {!loading && !error && reviews.length > 0 && (
          <ul className="list-group">
            {reviews.map((review, idx) => (
              <li key={review._id || idx} className="list-group-item d-flex align-items-center justify-content-between">
                <div>
                  <b>{review.tour?.name || '---'}</b>
                  <div className="small text-muted">{review.user_name || (review.user ? ((review.user.first_name || '') + (review.user.last_name || '')) : 'Ẩn danh')}</div>
                  <div>{review.comment}</div>
                </div>
                <div>
                  <StarRating rating={review.rating} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default LastestReview;
