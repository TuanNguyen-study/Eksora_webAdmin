import './App.css';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './components/Home';
import SideNav from './components/SideNav';
import React from 'react';


function App() {
  return (
    <div className="wrapper">
      <Header />
      <SideNav />
      <Home />
      <Footer />
    </div>
  );
}

export default App;
