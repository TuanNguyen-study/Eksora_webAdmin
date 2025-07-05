import React, { useEffect, useState } from 'react';
import { getReviews } from '../api/api';
import { Link, useLocation } from 'react-router-dom';

function SideNavReviewsCount() {
  const [count, setCount] = useState(0);
  const location = useLocation();

  useEffect(() => {
    getReviews().then(data => setCount(data.length)).catch(() => setCount(0));
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
