import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Footer from '../components/Footer';
import authService from '../utils/authService';
import '../styles/settings.css';

const Settings = ({ setIsAuthenticated }) => {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try {
      return window.innerWidth > 1024;
    } catch {
      return true;
    }
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  // Security modals/state (demo/localStorage)
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorEnabled: false,
    pin: ''
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPinSetupModal, setShowPinSetupModal] = useState(false);
  const [pinForm, setPinForm] = useState({
    pin: '',
    confirmPin: ''
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const navigate = useNavigate();

  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    company: ''
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailAlerts: true,
    priceAlerts: true,
    sentimentAlerts: true,
    predictionAlerts: true,
    newsAlerts: false,
    weeklyReport: true
  });

  const [displaySettings, setDisplaySettings] = useState({
    // Light is the default theme
    theme: 'light',
    chartType: 'candlestick',
    defaultTimeframe: '1D',
    currency: 'USD',
    dateFormat: 'MM/DD/YYYY'
  });


  useEffect(() => {
    const userData = authService.getCurrentUser();
    if (!userData) {
      setIsAuthenticated(false);
      navigate('/signin');
    } else {
      setCurrentUser(userData.user);
      setProfileData({
        name: userData.user.name || '',
        email: userData.user.email || '',
        phone: userData.user.phone || '',
        company: userData.user.company || ''
      });

      // Load saved settings from localStorage
      try {
        const ns = localStorage.getItem('notificationSettings');
        if (ns) setNotificationSettings((prev) => ({ ...prev, ...JSON.parse(ns) }));
      } catch {}
      try {
        const ds = localStorage.getItem('displaySettings');
        if (ds) setDisplaySettings((prev) => ({ ...prev, ...JSON.parse(ds) }));
      } catch {}
      try {
        const ss = localStorage.getItem('securitySettings');
        if (ss) setSecuritySettings((prev) => ({ ...prev, ...JSON.parse(ss) }));
      } catch {}
    }
  }, [setIsAuthenticated, navigate]);

  useEffect(() => {
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

  const showSavedToast = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const broadcastSettingsChanged = () => {
    // Storage events don't fire in the same tab that sets localStorage,
    // so we use a custom event to let other pages/components react immediately.
    try {
      window.dispatchEvent(new CustomEvent('settings:changed'));
    } catch {}
  };

  const updateDisplaySetting = (partial) => {
    // Apply display settings immediately so currency/chart type/theme changes reflect across the app
    // without requiring the user to hit "Save". (We keep the Save button too.)
    setDisplaySettings((prev) => {
      const next = { ...prev, ...partial };
      try {
        localStorage.setItem('displaySettings', JSON.stringify(next));
      } catch {}
      broadcastSettingsChanged();
      return next;
    });
  };

  const saveSettings = () => {
    // Save settings to localStorage
    localStorage.setItem('notificationSettings', JSON.stringify(notificationSettings));
    localStorage.setItem('displaySettings', JSON.stringify(displaySettings));
    localStorage.setItem('securitySettings', JSON.stringify(securitySettings));
    
    showSavedToast();
  };

  const saveProfile = async () => {
    setError(null);
    try {
      const updated = await authService.updateProfile({
        name: profileData.name,
        email: profileData.email,
        phone: profileData.phone,
        company: profileData.company
      });
      setCurrentUser(updated.user);
      showSavedToast();
    } catch (e) {
      setError(e?.message || 'Failed to save profile');
    }
  };

  const saveNotifications = () => {
    setError(null);
    try {
      localStorage.setItem('notificationSettings', JSON.stringify(notificationSettings));
      showSavedToast();
      broadcastSettingsChanged();
    } catch (e) {
      setError(e?.message || 'Failed to save notification settings');
    }
  };

  const saveDisplay = () => {
    setError(null);
    try {
      localStorage.setItem('displaySettings', JSON.stringify(displaySettings));
      showSavedToast();
      broadcastSettingsChanged();
    } catch (e) {
      setError(e?.message || 'Failed to save display settings');
    }
  };

  const toggle2FA = (enabled) => {
    if (enabled) {
      // Show PIN setup modal when enabling 2FA
      setShowPinSetupModal(true);
    } else {
      // Disable 2FA and clear PIN
      setSecuritySettings((prev) => {
        const next = { ...prev, twoFactorEnabled: false, pin: '' };
        localStorage.setItem('securitySettings', JSON.stringify(next));
        return next;
      });
      showSavedToast();
    }
  };

  const handleSetupPin = () => {
    setError(null);
    const { pin, confirmPin } = pinForm;
    
    // Validate PIN
    if (!pin || pin.length !== 4) {
      setError('PIN must be exactly 4 digits');
      return;
    }
    
    if (!/^\d{4}$/.test(pin)) {
      setError('PIN must contain only numbers');
      return;
    }
    
    if (pin !== confirmPin) {
      setError('PINs do not match');
      return;
    }
    
    // Save PIN and enable 2FA
    setSecuritySettings((prev) => {
      const next = { ...prev, twoFactorEnabled: true, pin: pin };
      localStorage.setItem('securitySettings', JSON.stringify(next));
      return next;
    });
    
    setShowPinSetupModal(false);
    setPinForm({ pin: '', confirmPin: '' });
    showSavedToast();
  };

  const handleChangePassword = async () => {
    setError(null);
    const { currentPassword, newPassword, confirmNewPassword } = passwordForm;
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setError('Please fill in all password fields');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('New password and confirm password do not match');
      return;
    }

    try {
      await authService.changePassword(currentPassword, newPassword);
      setShowPasswordModal(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
      showSavedToast();
    } catch (e) {
      setError(e?.message || 'Failed to change password');
    }
  };

  const handleDeleteAccount = async () => {
    setError(null);
    try {
      await authService.deleteAccount();
      setIsAuthenticated(false);
      navigate('/signin');
    } catch (e) {
      setError(e?.message || 'Failed to delete account');
    }
  };

  return (
    <div className="dashboard">
      <Sidebar 
        isOpen={sidebarOpen} 
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onLogout={handleLogout}
        activePage="settings"
      />
      
      <div className={`dashboard-main ${sidebarOpen ? '' : 'sidebar-closed'}`}>
        <Header 
          onLogout={handleLogout}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          currentUser={currentUser}
        />
        
        <div className="dashboard-content">
          <div className="page-header">
            <div>
              <h1>⚙️ Settings</h1>
              <p>Customize your FinTrend experience</p>
            </div>
            {saved && (
              <div className="save-notification">
                ✓ Settings saved successfully!
              </div>
            )}
          </div>

          {error && (
            <div style={{ marginBottom: '16px', color: '#ef4444', fontWeight: 600 }}>
              ❌ {error}
            </div>
          )}

          <div className="settings-container">
            <div className="settings-tabs">
              <button 
                className={activeTab === 'profile' ? 'active' : ''}
                onClick={() => setActiveTab('profile')}
              >
                👤 Profile
              </button>
              <button 
                className={activeTab === 'notifications' ? 'active' : ''}
                onClick={() => setActiveTab('notifications')}
              >
                🔔 Notifications
              </button>
              <button 
                className={activeTab === 'display' ? 'active' : ''}
                onClick={() => setActiveTab('display')}
              >
                🎨 Display
              </button>
              <button 
                className={activeTab === 'security' ? 'active' : ''}
                onClick={() => setActiveTab('security')}
              >
                🔒 Security
              </button>
            </div>

            <div className="settings-content">
              {activeTab === 'profile' && (
                <div className="settings-section">
                  <h2>Profile Information</h2>
                  <p className="section-description">Manage your personal information and preferences</p>
                  
                  <div className="form-group">
                    <label>Full Name</label>
                    <input 
                      type="text" 
                      value={profileData.name}
                      onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div className="form-group">
                    <label>Email Address</label>
                    <input 
                      type="email" 
                      value={profileData.email}
                      onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                      placeholder="your.email@example.com"
                    />
                  </div>

                  <div className="form-group">
                    <label>Phone Number</label>
                    <input 
                      type="tel" 
                      value={profileData.phone}
                      onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                      placeholder="+1 (123) 456-7890"
                    />
                  </div>

                  <div className="form-group">
                    <label>Company/Organization</label>
                    <input 
                      type="text" 
                      value={profileData.company}
                      onChange={(e) => setProfileData({...profileData, company: e.target.value})}
                      placeholder="Your company name"
                    />
                  </div>

                  <button className="save-btn" onClick={saveProfile}>💾 Save Profile</button>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="settings-section">
                  <h2>Notification Preferences</h2>
                  <p className="section-description">Choose how you want to be notified about market events</p>
                  
                  <div className="toggle-group">
                    <div className="toggle-item">
                      <div>
                        <h4>📧 Email Alerts</h4>
                        <p>Receive email notifications for important updates</p>
                      </div>
                      <label className="toggle-switch">
                        <input 
                          type="checkbox" 
                          checked={notificationSettings.emailAlerts}
                          onChange={(e) => setNotificationSettings({...notificationSettings, emailAlerts: e.target.checked})}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>

                    <div className="toggle-item">
                      <div>
                        <h4>💰 Price Movement Alerts</h4>
                        <p>Get notified when stock prices hit your targets</p>
                      </div>
                      <label className="toggle-switch">
                        <input 
                          type="checkbox" 
                          checked={notificationSettings.priceAlerts}
                          onChange={(e) => setNotificationSettings({...notificationSettings, priceAlerts: e.target.checked})}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>

                    <div className="toggle-item">
                      <div>
                        <h4>😊 Sentiment Shift Alerts</h4>
                        <p>Alerts for major sentiment changes in news analysis</p>
                      </div>
                      <label className="toggle-switch">
                        <input 
                          type="checkbox" 
                          checked={notificationSettings.sentimentAlerts}
                          onChange={(e) => setNotificationSettings({...notificationSettings, sentimentAlerts: e.target.checked})}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>

                    <div className="toggle-item">
                      <div>
                        <h4>📈 Prediction Alerts</h4>
                        <p>Notifications for bullish/bearish trend predictions</p>
                      </div>
                      <label className="toggle-switch">
                        <input 
                          type="checkbox" 
                          checked={notificationSettings.predictionAlerts}
                          onChange={(e) => setNotificationSettings({...notificationSettings, predictionAlerts: e.target.checked})}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>

                    <div className="toggle-item">
                      <div>
                        <h4>📰 Breaking News Alerts</h4>
                        <p>Real-time alerts for breaking financial news</p>
                      </div>
                      <label className="toggle-switch">
                        <input 
                          type="checkbox" 
                          checked={notificationSettings.newsAlerts}
                          onChange={(e) => setNotificationSettings({...notificationSettings, newsAlerts: e.target.checked})}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>

                    <div className="toggle-item">
                      <div>
                        <h4>📊 Weekly Summary Report</h4>
                        <p>Receive weekly performance summary via email</p>
                      </div>
                      <label className="toggle-switch">
                        <input 
                          type="checkbox" 
                          checked={notificationSettings.weeklyReport}
                          onChange={(e) => setNotificationSettings({...notificationSettings, weeklyReport: e.target.checked})}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                  </div>

                  <button className="save-btn" onClick={saveNotifications}>💾 Save Notification Settings</button>
                </div>
              )}

              {activeTab === 'display' && (
                <div className="settings-section">
                  <h2>Display Preferences</h2>
                  <p className="section-description">Customize how data is displayed in the application</p>
                  
                  <div className="form-group">
                    <label>Theme</label>
                    <select 
                      value={displaySettings.theme}
                      onChange={(e) => updateDisplaySetting({ theme: e.target.value })}
                    >
                      <option value="dark">🌙 Dark Mode</option>
                      <option value="light">☀️ Light Mode</option>
                      <option value="auto">🔄 Auto (System)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Chart Type</label>
                    <select 
                      value={displaySettings.chartType}
                      onChange={(e) => updateDisplaySetting({ chartType: e.target.value })}
                    >
                      <option value="candlestick">📊 Candlestick</option>
                      <option value="line">📈 Line Chart</option>
                      <option value="area">🏔️ Area Chart</option>
                      <option value="bar">📊 Bar Chart</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Default Timeframe</label>
                    <select 
                      value={displaySettings.defaultTimeframe}
                      onChange={(e) => updateDisplaySetting({ defaultTimeframe: e.target.value })}
                    >
                      <option value="1D">1 Day</option>
                      <option value="1W">1 Week</option>
                      <option value="1M">1 Month</option>
                      <option value="3M">3 Months</option>
                      <option value="1Y">1 Year</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Currency</label>
                    <select 
                      value={displaySettings.currency}
                      onChange={(e) => updateDisplaySetting({ currency: e.target.value })}
                    >
                      <option value="USD">🇺🇸 USD - US Dollar</option>
                      <option value="EUR">🇪🇺 EUR - Euro</option>
                      <option value="GBP">🇬🇧 GBP - British Pound</option>
                      <option value="JPY">🇯🇵 JPY - Japanese Yen</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Date Format</label>
                    <select 
                      value={displaySettings.dateFormat}
                      onChange={(e) => updateDisplaySetting({ dateFormat: e.target.value })}
                    >
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>

                  <button className="save-btn" onClick={saveDisplay}>💾 Save Display Settings</button>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="settings-section">
                  <h2>Security & Privacy</h2>
                  <p className="section-description">Manage your account security settings</p>
                  
                  <div className="security-card">
                    <h4>🔐 Change Password</h4>
                    <p>Update your account password</p>
                    <button className="secondary-btn" onClick={() => setShowPasswordModal(true)}>
                      Change Password
                    </button>
                  </div>

                  <div className="security-card">
                    <h4>🛡️ Two-Factor Authentication</h4>
                    <p>Add an extra layer of security to your account</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                      <span style={{ color: '#6b7280', fontWeight: 600 }}>
                        {securitySettings.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={securitySettings.twoFactorEnabled}
                          onChange={(e) => toggle2FA(e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                  </div>

                  <div className="security-card">
                    <h4>📱 Active Sessions</h4>
                    <p>Manage devices currently logged into your account</p>
                    <button className="secondary-btn" onClick={() => setShowSessionsModal(true)}>
                      View Sessions
                    </button>
                  </div>

                  <div className="security-card">
                    <h4>🗑️ Delete Account</h4>
                    <p>Permanently delete your account and all data</p>
                    <button className="danger-btn" onClick={() => setShowDeleteModal(true)}>
                      Delete Account
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <Footer />
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Change Password</h2>
              <button className="close-btn" onClick={() => setShowPasswordModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  value={passwordForm.confirmNewPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmNewPassword: e.target.value })}
                />
              </div>
              <small>
                Password must be 8-20 chars, include uppercase, lowercase, number, and special character.
              </small>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowPasswordModal(false)}>Cancel</button>
              <button className="confirm-btn" onClick={handleChangePassword}>Save Password</button>
            </div>
          </div>
        </div>
      )}

      {/* Sessions Modal */}
      {showSessionsModal && (
        <div className="modal-overlay" onClick={() => setShowSessionsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Active Sessions</h2>
              <button className="close-btn" onClick={() => setShowSessionsModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ marginTop: 0, color: '#6b7280' }}>
                Demo app: only your current session is stored locally.
              </p>
              <div className="security-card" style={{ marginBottom: 0 }}>
                <h4>Current Session</h4>
                <p style={{ marginBottom: 8 }}><strong>User:</strong> {currentUser?.email}</p>
                <p style={{ marginBottom: 8 }}><strong>Login:</strong> {authService.getCurrentUser()?.loginTime}</p>
                <p style={{ marginBottom: 0 }}><strong>Expires:</strong> {authService.getCurrentUser()?.expiresAt}</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowSessionsModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Delete Account</h2>
              <button className="close-btn" onClick={() => setShowDeleteModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ marginTop: 0, color: '#991b1b', fontWeight: 700 }}>
                This will permanently delete your account (demo localStorage) and sign you out.
              </p>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button className="danger-btn" onClick={handleDeleteAccount}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* PIN Setup Modal */}
      {showPinSetupModal && (
        <div className="modal-overlay" onClick={() => setShowPinSetupModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🔐 Set Up 2FA PIN</h2>
              <button className="close-btn" onClick={() => setShowPinSetupModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ marginTop: 0, color: '#6b7280' }}>
                Create a 4-digit PIN that you'll enter each time you sign in.
              </p>
              <div className="form-group">
                <label>Enter 4-Digit PIN</label>
                <input
                  type="password"
                  maxLength={4}
                  value={pinForm.pin}
                  onChange={(e) => setPinForm({ ...pinForm, pin: e.target.value.replace(/\D/g, '') })}
                  placeholder="••••"
                  style={{ 
                    textAlign: 'center', 
                    fontSize: '24px', 
                    letterSpacing: '8px',
                    fontFamily: 'monospace'
                  }}
                />
              </div>
              <div className="form-group">
                <label>Confirm PIN</label>
                <input
                  type="password"
                  maxLength={4}
                  value={pinForm.confirmPin}
                  onChange={(e) => setPinForm({ ...pinForm, confirmPin: e.target.value.replace(/\D/g, '') })}
                  placeholder="••••"
                  style={{ 
                    textAlign: 'center', 
                    fontSize: '24px', 
                    letterSpacing: '8px',
                    fontFamily: 'monospace'
                  }}
                />
              </div>
              <small style={{ color: '#6b7280' }}>
                You'll need to enter this PIN after your password when signing in.
              </small>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => {
                setShowPinSetupModal(false);
                setPinForm({ pin: '', confirmPin: '' });
              }}>Cancel</button>
              <button className="confirm-btn" onClick={handleSetupPin}>Enable 2FA</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
