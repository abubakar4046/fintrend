import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Footer from '../components/Footer';
import authService from '../utils/authService';
import '../styles/profile.css';

const Profile = ({ setIsAuthenticated }) => {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try {
      return window.innerWidth > 1024;
    } catch {
      return true;
    }
  });
  const [session, setSession] = useState(null);
  const navigate = useNavigate();

  React.useEffect(() => {
    const current = authService.getCurrentUser();
    if (!current) {
      setIsAuthenticated(false);
      navigate('/signin');
    } else {
      setSession(current);
    }
  }, [setIsAuthenticated, navigate]);

  React.useEffect(() => {
    const onResize = () => {
      try {
        if (window.innerWidth <= 1024) setSidebarOpen(false);
      } catch {}
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleLogout = () => {
    authService.signOut();
    setIsAuthenticated(false);
    navigate('/signin');
  };

  const user = session?.user;

  return (
    <div className="dashboard">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onLogout={handleLogout}
        activePage="profile"
      />

      <div className={`dashboard-main ${sidebarOpen ? '' : 'sidebar-closed'}`}>
        <Header
          onLogout={handleLogout}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          currentUser={user}
        />

        <div className="dashboard-content">
          <div className="profile-hero">
            <h1>Your Profile</h1>
            <p className="profile-subtitle">Account details for your FinTrend session</p>
          </div>

          <div className="profile-card">
            <div className="profile-row">
              <span className="profile-label">Name</span>
              <span className="profile-value">{user?.name || '—'}</span>
            </div>
            <div className="profile-row">
              <span className="profile-label">Email</span>
              <span className="profile-value">{user?.email || '—'}</span>
            </div>
            <div className="profile-row">
              <span className="profile-label">Role</span>
              <span className="profile-value">{user?.role || '—'}</span>
            </div>
            <div className="profile-row">
              <span className="profile-label">Last Login</span>
              <span className="profile-value">{session?.loginTime ? new Date(session.loginTime).toLocaleString() : '—'}</span>
            </div>

            <div className="profile-actions">
              <button className="profile-btn" onClick={() => navigate('/settings')}>
                Edit Profile in Settings
              </button>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
};

export default Profile;


