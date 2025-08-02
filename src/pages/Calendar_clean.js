import React, { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { getAllBookings } from '../api/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Calendar() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingsData, setBookingsData] = useState([]);
  const { user } = useAuth();
  const userRole = user?.role;
  const navigate = useNavigate();
  const calendarRef = useRef(null);

  // Load calendar data when component mounts
  useEffect(() => {
    if (userRole) {
      fetchBookings();
    }
  }, [userRole]);

  // Cleanup function to prevent FullCalendar destroy errors
  useEffect(() => {
    return () => {
      if (calendarRef.current) {
        try {
          const calendarApi = calendarRef.current.getApi();
          if (calendarApi && typeof calendarApi.destroy === 'function') {
            calendarApi.destroy();
          }
        } catch (error) {
          // Ignore cleanup errors - calendar may already be destroyed
          console.log('Calendar cleanup handled gracefully:', error.message);
        }
      }
    };
  }, []);

  async function fetchBookings() {
    setLoading(true);
    console.log('=== STARTING CALENDAR DATA FETCH ===');
    try {
      const data = await getAllBookings();
      console.log('=== CALENDAR DEBUG ===');
      console.log('Raw booking data:', data);
      console.log('Total bookings:', data?.length);
      console.log('Data type:', typeof data);
      console.log('Is array:', Array.isArray(data));
      
      if (!data) {
        console.error('API returned null/undefined');
        setEvents([]);
        setBookingsData([]);
        return;
      }
      
      if (!Array.isArray(data)) {
        console.error('API did not return an array:', data);
        setEvents([]);
        setBookingsData([]);
        return;
      }
      
      if (data.length === 0) {
        console.log('No bookings found - empty array');
        setEvents([]);
        setBookingsData([]);
        return;
      }
      
      console.log('First booking sample:', data[0]);
      setBookingsData(data);
      
      // Xử lý dữ liệu booking thật
      console.log('Processing real booking data...');
      
      // Group bookings by date and tour
      const bookingsByDate = {};
      
      data.forEach((booking, index) => {
        console.log(`Processing booking ${index + 1}:`, booking);
        
        // Sử dụng booking_date thay vì travel_date
        if (booking.booking_date) {
          // Đảm bảo format ngày đúng cho FullCalendar (YYYY-MM-DD)
          const bookingDate = new Date(booking.booking_date);
          const dateKey = bookingDate.toISOString().split('T')[0]; // Format: YYYY-MM-DD
          const tourId = booking.tour_id?._id || booking.tour_id;
          const tourName = booking.tour_id?.name || `Tour ${tourId}`;
          
          console.log(`Booking date: ${booking.booking_date}, dateKey: ${dateKey}, tourId: ${tourId}, tourName: ${tourName}`);
          
          if (!tourId) {
            console.log('Skipping booking - no tour ID');
            return;
          }
          
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
          // Use appropriate guest count fields
          const adults = booking.quantity_nguoiLon || booking.adult_count || 1;
          const children = booking.quantity_treEm || booking.child_count || 0;
          bookingsByDate[dateKey][tourId].totalGuests += adults + children;
        } else {
          console.log('Skipping booking - no booking_date:', booking);
        }
      });
      
      console.log('Grouped bookings by date:', bookingsByDate);
      
      // Convert to FullCalendar events
      const calendarEvents = [];
      
      Object.keys(bookingsByDate).forEach(dateKey => {
        Object.keys(bookingsByDate[dateKey]).forEach(tourId => {
          const tourData = bookingsByDate[dateKey][tourId];
          const bookingCount = tourData.bookings.length;
          const guestCount = tourData.totalGuests;
          
          // Color based on number of guests
          let backgroundColor = '#28a745'; // Green for low
          if (guestCount > 50) {
            backgroundColor = '#dc3545'; // Red for high
          } else if (guestCount > 20) {
            backgroundColor = '#ffc107'; // Yellow for medium
          }
          
          const eventData = {
            id: `${dateKey}-${tourId}`,
            title: `${tourData.tourName}\n${bookingCount} đơn - ${guestCount} khách`,
            start: dateKey,
            allDay: true,
            backgroundColor,
            borderColor: backgroundColor,
            textColor: '#fff',
            extendedProps: {
              tourId,
              tourName: tourData.tourName,
              bookingCount,
              guestCount,
              date: dateKey,
              bookings: tourData.bookings
            }
          };
          
          console.log('Adding real event:', eventData);
          calendarEvents.push(eventData);
        });
      });
      
      console.log('Real calendar events created:', calendarEvents.length, calendarEvents);
      setEvents(calendarEvents);
      
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  // Handle event click - navigate to booking page with filters
  const handleEventClick = (clickInfo) => {
    console.log('=== EVENT CLICKED ===');
    console.log('Event:', clickInfo.event);
    console.log('Event props:', clickInfo.event.extendedProps);
    
    const { tourId, tourName, date } = clickInfo.event.extendedProps;
    
    console.log('Navigation params:', { date, tourId, tourName });
    
    // Navigate to Booking page with filters
    navigate('/bookings', {
      state: {
        filters: {
          date: date,
          tourId: tourId,
          tourName: tourName
        }
      }
    });
    
    console.log('Navigation completed');
  };

  // Đánh dấu ngày bằng cách click (không làm mất data booking)
  const handleDateSelect = (selectInfo) => {
    const selectedDate = selectInfo.startStr;
    
    console.log('=== DATE SELECTED ===');
    console.log('Selected date:', selectedDate);
    
    // Check if there are any bookings on this date - sử dụng booking_date
    const dayBookings = bookingsData.filter(booking => {
      const bookingDate = booking.booking_date;
      return bookingDate && bookingDate.split('T')[0] === selectedDate;
    });
    
    console.log('Bookings found for this date:', dayBookings.length);
    
    if (dayBookings.length > 0) {
      console.log('Navigating to bookings page with date filter');
      // Navigate to booking page with date filter
      navigate('/bookings', {
        state: {
          filters: {
            date: selectedDate
          }
        }
      });
    } else {
      console.log('No bookings found, adding mark');
      // Add a mark for empty days
      setEvents(prev => [...prev, {
        title: 'Đánh dấu',
        start: selectInfo.startStr,
        end: selectInfo.endStr,
        allDay: selectInfo.allDay,
        backgroundColor: '#6c757d',
        borderColor: '#6c757d',
        textColor: '#fff',
      }]);
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
                onClick={() => {
                  console.log('=== DEBUG INFO ===');
                  console.log('Events:', events);
                  console.log('Bookings Data:', bookingsData);
                  console.log('Loading:', loading);
                  fetchBookings();
                }}
              >
                🔍 Debug & Reload
              </button>
            </div>
            <div className="d-flex align-items-center">
              <small className="text-info mr-3">
                <i className="fas fa-mouse-pointer mr-1"></i>
                Click vào tour để xem chi tiết booking
              </small>
              <small className="text-secondary">
                <i className="fas fa-calendar-day mr-1"></i>
                Click vào ngày trống để xem tất cả booking ngày đó
              </small>
              <small className="text-success ml-3">
                <i className="fas fa-database mr-1"></i>
                {events.length} events | {bookingsData.length} bookings
              </small>
            </div>
          </div>
          <div className="p-0">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              events={events}
              eventContent={renderEventContent}
              eventClick={handleEventClick}
              height="500"
              selectable={true}
              select={handleDateSelect}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth'
              }}
              // Simplified config to avoid any locale or formatting errors
            />
            {events.length === 0 && !loading && (
              <div className="p-4 text-center text-muted position-absolute w-100" style={{ top: '50%', transform: 'translateY(-50%)' }}>
                <i className="fas fa-calendar-times fa-3x mb-3"></i>
                <h5>Không có booking nào</h5>
                <p>Chưa có booking nào được tạo trong hệ thống.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function renderEventContent(eventInfo) {
  const [tourName, bookingInfo] = eventInfo.event.title.split('\n');
  const { guestCount, bookingCount } = eventInfo.event.extendedProps;
  
  return (
    <div
      style={{
        whiteSpace: 'pre-line',
        fontSize: 10,
        padding: '3px 5px',
        marginBottom: 1,
        borderRadius: 3,
        background: eventInfo.event.backgroundColor || '#f4f6f9',
        color: eventInfo.event.textColor || '#fff',
        border: eventInfo.event.borderColor ? `1px solid ${eventInfo.event.borderColor}` : undefined,
        position: 'relative',
        cursor: 'pointer',
        minHeight: '20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}
      title={`${tourName} - ${bookingCount} booking, ${guestCount} khách\nClick để xem chi tiết`}
    >
      <div style={{ 
        fontWeight: 'bold', 
        fontSize: '9px',
        lineHeight: '1.1',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        {tourName}
      </div>
      <div style={{ 
        fontSize: '8px',
        lineHeight: '1',
        opacity: 0.9
      }}>
        {bookingCount} đơn • {guestCount} khách
      </div>
    </div>
  );
}

export default Calendar;
