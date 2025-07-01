import './App.css';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './components/Home';
import SideNav from './components/SideNav';
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Tour from './pages/Tour';
import Vouchers from './pages/Vouchers';
import Users from './pages/Users';
import Bookings from './pages/Bookings';
import Calendar from './pages/Calendar';

function App() {
  return (
    <BrowserRouter>
      <div className="wrapper">
        <Header />
        <SideNav />
        <Routes>
          <Route path="/dashboard" element={<Home />} />
          <Route path="/tour" element={<Tour />} />
          <Route path="/vouchers" element={<Vouchers />} />
          <Route path="/users" element={<Users />} />
          <Route path="/bookings" element={<Bookings />} />
          <Route path="/calendar" element={<Calendar />} />
        </Routes>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
