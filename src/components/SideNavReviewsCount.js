import React, { useEffect, useState } from 'react';
import { getReviews, getCurrentUserRole, getUser } from '../api/api';
import { Link, useLocation } from 'react-router-dom';

function SideNavReviewsCount() {
  const [count, setCount] = useState(0);
  const location = useLocation();

  useEffect(() => {
    async function fetchReviewCount() {
      try {
        // Lấy thông tin user và role
        const [role, userProfile, reviewsData] = await Promise.all([
          getCurrentUserRole(),
          getUser(),
          getReviews()
        ]);
        
        // Nếu là supplier, chỉ đếm reviews của tours mà supplier đó cung cấp
        if (role === 'supplier') {
          const supplierReviews = reviewsData.filter(review => {
            // Kiểm tra nếu tour của review có supplier_id trùng với current user
            return review.tour?.supplier_id === userProfile._id || 
                   review.tour?.supplier_id?._id === userProfile._id;
          });
          setCount(supplierReviews.length);
        } else {
          // Admin thì đếm tất cả reviews
          setCount(reviewsData.length);
        }
      } catch (error) {
        console.error('Error fetching review count:', error);
        setCount(0);
      }
    }
    
    fetchReviewCount();
  }, []);

  return (
    <li className="nav-item">
      <Link to="/reviews" className="nav-link" style={location.pathname.startsWith('/reviews') ? { background: '#3f6791', color: '#fff' } : {}}>
        <i className="nav-icon fas fa-star" style={location.pathname.startsWith('/reviews') ? { color: '#fff' } : {}}></i>
        <p>
          Reviews
          <span className="badge badge-info right ml-2">{count}</span>
        </p>
      </Link>
    </li>
  );
}

export default SideNavReviewsCount;
