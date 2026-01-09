import React from 'react';
import '../styles/footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="dashboard-footer">
      <div className="footer-content">
        <div className="footer-section">
          <h4>FinTrend AI</h4>
          <p>AI-Powered Stock Prediction & Sentiment Analysis Platform</p>
        </div>

        <div className="footer-section">
          <h4>Quick Links</h4>
          <ul>
            <li><a href="/dashboard">Dashboard</a></li>
            <li><a href="/prediction">Stock Prediction</a></li>
            <li><a href="/news">News Sentiment</a></li>
            <li><a href="/watchlist">Watchlist</a></li>
          </ul>
        </div>

        <div className="footer-section">
          <h4>Technology</h4>
          <ul>
            <li>🤖 FinBERT Sentiment Analysis</li>
            <li>📊 LSTM/GRU Forecasting</li>
            <li>⚡ Real-time Data Processing</li>
            <li>🔒 Secure & Compliant</li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; {currentYear} FinTrend AI. All rights reserved.</p>
        <div className="footer-social">
          <a href="#twitter" title="Twitter">🐦</a>
          <a href="#linkedin" title="LinkedIn">💼</a>
          <a href="#github" title="GitHub">💻</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
