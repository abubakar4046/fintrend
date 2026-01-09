import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/header.css';

const Header = ({ onLogout, selectedStock, onMenuToggle, currentUser }) => {
  const navigate = useNavigate();

  return (
    <header className="header">
      <div className="header-left">
        {onMenuToggle && (
          <button className="menu-toggle" onClick={onMenuToggle} aria-label="Toggle sidebar">
            ☰
          </button>
        )}
        <div className="header-brand" aria-label="FinTrend logo">
          <img
            className="header-logo"
            src="/fintrend-logo.png"
            alt="FinTrend"
            onError={(e) => {
              if (!e.currentTarget.src.endsWith('/fintrend-logo.jpg')) {
                e.currentTarget.src = '/fintrend-logo.jpg';
                return;
              }
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
        <div className="header-info">
          <h1 className="header-title">Welcome to FinTrend</h1>
          <p className="header-subtitle">AI-powered insights, forecasts & sentiment analysis</p>
        </div>
      </div>

      <div className="header-center">
      </div>

      <div className="header-right">
        <div className="market-status">
          <div className="status-indicator active"></div>
          <span className="status-text">Market Open</span>
        </div>
        
        <div className="user-menu">
          <div className="user-info">
            <span className="user-name">{currentUser?.name || 'User'}</span>
            <span className="user-email">{currentUser?.email}</span>
          </div>
          <div className="user-avatar">
            <span>{currentUser?.name?.charAt(0).toUpperCase() || 'U'}</span>
          </div>
          <div className="user-dropdown">
            <button className="dropdown-item" onClick={() => navigate('/profile')}>Profile</button>
            <button className="dropdown-item" onClick={() => navigate('/settings')}>Settings</button>
            <button className="dropdown-item" onClick={onLogout}>Logout</button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;