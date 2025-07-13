import React, { useEffect, useState } from 'react';
import { getAllBookings } from '../api/api';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

function Calendar() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBookings() {
      setLoading(true);
      try {
        const data = await getAllBookings();
        const mapped = data.map(b => {
          // Tính ngày kết thúc nếu có end_date hoặc duration
          let end = b.end_date;
          if (!end && b.tour_id?.duration) {
            // duration dạng '2 ngày 1 đêm' => lấy số ngày đầu tiên
            const match = b.tour_id.duration.match(/(\d+)/);
            if (match) {
              const days = parseInt(match[1], 10);
              const startDate = new Date(b.travel_date);
              const endDate = new Date(startDate);
              endDate.setDate(startDate.getDate() + days);
              end = endDate.toISOString().slice(0, 10);
            }
          }
          return {
            title: `${b.tour_id?.name || ''}\n${b.user_id?.first_name || ''} ${b.user_id?.last_name || ''} - ${b.user_id?.phone || ''}`,
            start: b.travel_date,
            end: end,
            allDay: true,
          };
        });
        setEvents(mapped);
      } catch (err) {
        setEvents([]);
      } finally {
        setLoading(false);
      }
    }
    fetchBookings();
  }, []);

  // Đánh dấu ngày bằng cách click (không làm mất data booking)
  const handleDateSelect = (selectInfo) => {
    setEvents(prev => ({
      ...prev,
      title: 'Đánh dấu',
      start: selectInfo.startStr,
      end: selectInfo.endStr,
      allDay: selectInfo.allDay,
      backgroundColor: '#3c8dbc',
      borderColor: '#3c8dbc',
      textColor: '#fff',
    }));
  };

  return (
    <div style={{ background: '#fff', borderRadius: 8, padding: 0 }}>
      {loading ? (
        <div className="p-3">Đang tải dữ liệu...</div>
      ) : (
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale="vi"
          events={events}
          eventContent={renderEventContent}
          height="auto"
          selectable={true}
          select={handleDateSelect}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,dayGridWeek'
          }}
        />
      )}
    </div>
  );
}

function renderEventContent(eventInfo) {
  const [tour, customerAndPhone] = eventInfo.event.title.split('\n');
  // Nếu có ribbonColor thì dùng làm background, không thì dùng backgroundColor mặc định
  const bgColor = eventInfo.event.extendedProps.ribbonColor || eventInfo.event.backgroundColor || '#f4f6f9';
  return (
    <div
      style={{
        whiteSpace: 'pre-line',
        fontSize: 13,
        padding: '6px 8px',
        marginBottom: 6,
        borderRadius: 4,
        background: bgColor,
        color: eventInfo.event.textColor || '#222',
        border: eventInfo.event.borderColor ? `1px solid ${eventInfo.event.borderColor}` : undefined,
        position: 'relative',
      }}
    >
      <b>{tour}</b>
      <br />
      <span>{customerAndPhone}</span>
    </div>
  );
}

export default Calendar;
