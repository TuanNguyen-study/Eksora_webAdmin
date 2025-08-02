import React, { useState, useEffect } from 'react';
import { getAllBookings, getCurrentUserRole } from '../api/api';
import { useNavigate } from 'react-router-dom';

function SimpleCalendar() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [bookingsData, setBookingsData] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // 'month' or 'week'
  
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const role = await getCurrentUserRole();
        setUserRole(role);
      } catch (error) {
        console.error('Error getting user role:', error);
      }
    };

    fetchUserRole();
  }, []);

  useEffect(() => {
    if (userRole === 'admin') {
      fetchBookings();
    }
  }, [userRole]);

  async function fetchBookings() {
    setLoading(true);
    
    try {
      const data = await getAllBookings();
      
      if (!data || !Array.isArray(data) || data.length === 0) {
        setEvents([]);
        setBookingsData([]);
        return;
      }
      
      setBookingsData(data);
      
      // Group bookings by date and tour
      const bookingsByDate = {};
      
      data.forEach((booking) => {
        if (booking.booking_date) {
          const bookingDate = new Date(booking.booking_date);
          const dateKey = bookingDate.toISOString().split('T')[0];
          const tourId = booking.tour_id?._id || booking.tour_id;
          const tourName = booking.tour_id?.name || `Tour ${tourId}`;
          
          if (!tourId) return;
          
          if (!bookingsByDate[dateKey]) {
            bookingsByDate[dateKey] = {};
          }
          
          if (!bookingsByDate[dateKey][tourId]) {
            bookingsByDate[dateKey][tourId] = {
              tourName: tourName,
              bookings: [],
              totalGuests: 0
            };
          }
          
          bookingsByDate[dateKey][tourId].bookings.push(booking);
          const adults = booking.quantity_nguoiLon || booking.adult_count || 1;
          const children = booking.quantity_treEm || booking.child_count || 0;
          bookingsByDate[dateKey][tourId].totalGuests += adults + children;
        }
      });
      
      // Convert to events
      const calendarEvents = [];
      Object.keys(bookingsByDate).forEach(dateKey => {
        Object.keys(bookingsByDate[dateKey]).forEach(tourId => {
          const tourData = bookingsByDate[dateKey][tourId];
          const bookingCount = tourData.bookings.length;
          const guestCount = tourData.totalGuests;
          
          let color = 'success';
          if (guestCount > 50) {
            color = 'danger';
          } else if (guestCount > 20) {
            color = 'warning';
          }
          
          calendarEvents.push({
            date: dateKey,
            tourId,
            tourName: tourData.tourName,
            bookingCount,
            guestCount,
            color,
            bookings: tourData.bookings
          });
        });
      });
      
      setEvents(calendarEvents);
      
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  // Get calendar days for current month or week
  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday
    
    const days = [];
    const currentDay = new Date(startDate);
    
    // Generate 42 days (6 weeks)
    for (let i = 0; i < 42; i++) {
      const dateString = currentDay.toISOString().split('T')[0];
      const dayEvents = events.filter(event => event.date === dateString);
      
      days.push({
        date: new Date(currentDay),
        dateString,
        isCurrentMonth: currentDay.getMonth() === month,
        isToday: currentDay.toDateString() === new Date().toDateString(),
        events: dayEvents
      });
      
      currentDay.setDate(currentDay.getDate() + 1);
    }
    
    return days;
  };

  // Get days for current week
  const getDaysInWeek = () => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day; // Start from Sunday
    startOfWeek.setDate(diff);
    
    const days = [];
    const currentDay = new Date(startOfWeek);
    
    // Generate 7 days for the week
    for (let i = 0; i < 7; i++) {
      const dateString = currentDay.toISOString().split('T')[0];
      const dayEvents = events.filter(event => event.date === dateString);
      
      days.push({
        date: new Date(currentDay),
        dateString,
        isToday: currentDay.toDateString() === new Date().toDateString(),
        events: dayEvents
      });
      
      currentDay.setDate(currentDay.getDate() + 1);
    }
    
    return days;
  };

  const handleEventClick = (event) => {
    navigate('/bookings', {
      state: {
        filters: {
          date: event.date,
          tourId: event.tourId,
          tourName: event.tourName
        }
      }
    });
  };

  const handleDateClick = (day) => {
    if (day.events.length > 0) {
      navigate('/bookings', {
        state: {
          filters: {
            date: day.dateString
          }
        }
      });
    }
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + direction);
    } else {
      newDate.setDate(newDate.getDate() + (direction * 7)); // Move by weeks
    }
    setCurrentDate(newDate);
  };

  const getDisplayTitle = () => {
    if (viewMode === 'month') {
      return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    } else {
      const weekDays = getDaysInWeek();
      const startDate = weekDays[0].date;
      const endDate = weekDays[6].date;
      const startMonth = monthNames[startDate.getMonth()];
      const endMonth = monthNames[endDate.getMonth()];
      
      if (startDate.getMonth() === endDate.getMonth()) {
        return `${startDate.getDate()}-${endDate.getDate()} ${startMonth} ${startDate.getFullYear()}`;
      } else {
        return `${startDate.getDate()} ${startMonth} - ${endDate.getDate()} ${endMonth} ${endDate.getFullYear()}`;
      }
    }
  };

  if (userRole !== 'admin') {
    return (
      <div style={{ background: '#fff', borderRadius: 8, padding: 20 }}>
        <div className="text-center">
          <h4>Không có quyền truy cập</h4>
          <p>Chỉ có Admin mới được xem lịch booking.</p>
        </div>
      </div>
    );
  }

  const days = viewMode === 'month' ? getDaysInMonth() : getDaysInWeek();
  const monthNames = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
  ];
  
  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  return (
    <div style={{ background: 'transparent', borderRadius: 0, padding: 0 }}>
      {loading ? (
        <div className="p-3 text-center">
          <div className="spinner-border spinner-border-sm mr-2" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          Đang tải dữ liệu lịch...
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="p-3 border-bottom bg-light">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <div className="d-flex align-items-center">
                <small className="text-muted mr-3">
                  <span className="badge badge-success mr-1">Xanh:</span> Ít khách (≤20)
                </small>
                <small className="text-muted mr-3">
                  <span className="badge badge-warning mr-1">Vàng:</span> Vừa (21-50)
                </small>
                <small className="text-muted mr-3">
                  <span className="badge badge-danger mr-1">Đỏ:</span> Nhiều (&gt;50)
                </small>
              </div>
              <button 
                className="btn btn-sm btn-outline-info"
                onClick={fetchBookings}
              >
                🔄 Tải lại
              </button>
            </div>
            <div className="d-flex align-items-center justify-content-between">
              <small className="text-info">
                <i className="fas fa-mouse-pointer mr-1"></i>
                Click vào tour để xem chi tiết booking
              </small>
              <div className="btn-group btn-group-sm">
                <button 
                  className={`btn ${viewMode === 'month' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setViewMode('month')}
                >
                  Tháng
                </button>
                <button 
                  className={`btn ${viewMode === 'week' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setViewMode('week')}
                >
                  Tuần
                </button>
              </div>
              <small className="text-success">
                <i className="fas fa-calendar-check mr-1"></i>
                {events.length} lịch trình
              </small>
            </div>
          </div>

          {/* Calendar Navigation */}
          <div className="d-flex align-items-center justify-content-between p-3 bg-white border-bottom">
            <button 
              className="btn btn-outline-secondary btn-sm"
              onClick={() => navigateMonth(-1)}
            >
              <i className="fas fa-chevron-left"></i>
            </button>
            
            <h5 className="mb-0">
              {getDisplayTitle()}
            </h5>
            
            <button 
              className="btn btn-outline-secondary btn-sm"
              onClick={() => navigateMonth(1)}
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="p-0">
            {/* Day headers */}
            <div className="d-flex bg-light border-bottom">
              {dayNames.map(dayName => (
                <div 
                  key={dayName}
                  className="flex-fill text-center py-2 border-right font-weight-bold small"
                  style={{ minHeight: '40px' }}
                >
                  {dayName}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            {viewMode === 'month' ? (
              // Month view - 6 weeks grid
              Array.from({ length: 6 }, (_, weekIndex) => (
                <div key={weekIndex} className="d-flex border-bottom">
                  {days.slice(weekIndex * 7, (weekIndex + 1) * 7).map((day, dayIndex) => (
                    <div 
                      key={dayIndex}
                      className={`flex-fill border-right position-relative ${
                        !day.isCurrentMonth ? 'bg-light text-muted' : ''
                      } ${day.isToday ? 'bg-info text-white' : ''}`}
                      style={{ 
                        minHeight: '80px',
                        cursor: day.events.length > 0 ? 'pointer' : 'default'
                      }}
                      onClick={() => handleDateClick(day)}
                    >
                      {/* Date number */}
                      <div className="p-1 small font-weight-bold">
                        {day.date.getDate()}
                      </div>
                      
                      {/* Events */}
                      <div className="px-1 pb-1">
                        {day.events.slice(0, 3).map((event, eventIndex) => (
                          <div
                            key={eventIndex}
                            className={`badge badge-${event.color} d-block mb-1 text-truncate`}
                            style={{ 
                              fontSize: '8px',
                              cursor: 'pointer',
                              maxWidth: '100%'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEventClick(event);
                            }}
                            title={`${event.tourName}\n${event.bookingCount} đơn - ${event.guestCount} khách`}
                          >
                            {event.tourName.substring(0, 15)}...
                            <br />
                            {event.bookingCount} đơn - {event.guestCount} khách
                          </div>
                        ))}
                        
                        {day.events.length > 3 && (
                          <div className="badge badge-secondary d-block" style={{ fontSize: '8px' }}>
                            +{day.events.length - 3} khác...
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))
            ) : (
              // Week view - single row with larger cells
              <div className="d-flex border-bottom">
                {days.map((day, dayIndex) => (
                  <div 
                    key={dayIndex}
                    className={`flex-fill border-right position-relative ${
                      day.isToday ? 'bg-info text-white' : ''
                    }`}
                    style={{ 
                      minHeight: '150px',
                      cursor: day.events.length > 0 ? 'pointer' : 'default'
                    }}
                    onClick={() => handleDateClick(day)}
                  >
                    {/* Date number */}
                    <div className="p-2 small font-weight-bold text-center">
                      {day.date.getDate()}
                      <div className="small text-muted">
                        {dayNames[day.date.getDay()]}
                      </div>
                    </div>
                    
                    {/* Events */}
                    <div className="px-2 pb-2">
                      {day.events.map((event, eventIndex) => (
                        <div
                          key={eventIndex}
                          className={`badge badge-${event.color} d-block mb-1`}
                          style={{ 
                            fontSize: '10px',
                            cursor: 'pointer',
                            whiteSpace: 'normal',
                            textAlign: 'left'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEventClick(event);
                          }}
                          title={`${event.tourName}\n${event.bookingCount} đơn - ${event.guestCount} khách`}
                        >
                          <div className="font-weight-bold">
                            {event.tourName.substring(0, 25)}...
                          </div>
                          <div>
                            {event.bookingCount} đơn - {event.guestCount} khách
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default SimpleCalendar;
