import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/sidebar.css';

const Sidebar = ({ isOpen, onToggle, onLogout, activePage = 'dashboard' }) => {
  const navigate = useNavigate();

  const menuItems = [
    { icon: '🏠', text: 'Dashboard', id: 'dashboard', path: '/dashboard' },
    { icon: '📈', text: 'Stock Prediction', id: 'prediction', path: '/prediction' },
    { icon: '📰', text: 'News Sentiment', id: 'news', path: '/news' },
    { icon: '⭐', text: 'Watchlist', id: 'watchlist', path: '/watchlist' },
    { icon: '🔔', text: 'Alerts', id: 'alerts', path: '/alerts' },
    { icon: '⚙️', text: 'Settings', id: 'settings', path: '/settings' },
    { icon: '❓', text: 'Help & Support', id: 'help', path: '/help' },
    { icon: 'ℹ️', text: 'About', id: 'about', path: '/about' },
  ];

  const handleNavigation = (path) => {
    navigate(path);
    // Close sidebar on mobile after navigation
    if (window.innerWidth <= 1024 && onToggle) {
      onToggle();
    }
  };

  return (
    <>
      {/* Overlay for mobile - closes sidebar when clicking outside */}
      {isOpen && (
        <div 
          className="sidebar-overlay visible" 
          onClick={onToggle}
          aria-hidden="true"
        />
      )}
      
      <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon" aria-label="FinTrend logo">
              <img
                className="logo-img"
                src="/fintrend-logo.png"
                alt="FinTrend"
                onError={(e) => {
                  // fallback to JPG, then to text if image isn't present in /public
                  if (!e.currentTarget.src.endsWith('/fintrend-logo.jpg')) {
                    e.currentTarget.src = '/fintrend-logo.jpg';
                    return;
                  }
                  e.currentTarget.style.display = 'none';
                  const fb = e.currentTarget.parentElement?.querySelector('.logo-fallback');
                  if (fb) fb.style.display = 'inline-block';
                }}
              />
              <span className="logo-fallback">FT</span>
            </div>
            <span className="logo-text">FinTrend</span>
          </div>
        </div>

        <div className="sidebar-content">
          <div className="sidebar-menu">
            {menuItems.map((item) => (
              <div
                key={item.id}
                className={`menu-item ${activePage === item.id ? 'active' : ''}`}
                onClick={() => handleNavigation(item.path)}
              >
                <span className="menu-icon">{item.icon}</span>
                <span className="menu-text">{item.text}</span>
              </div>
            ))}
            
            <div className="menu-item logout" onClick={onLogout}>
              <span className="menu-icon">🚪</span>
              <span className="menu-text">Logout</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;