import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import authService from '../utils/authService';
import '../styles/auth.css';

const SignIn = ({ setIsAuthenticated }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPinStep, setShowPinStep] = useState(false);
  const [pin, setPin] = useState('');
  const [pendingSession, setPendingSession] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(''); // Clear error when user types
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // TC02: Validate password is not empty
    if (!formData.password || formData.password.trim() === '') {
      setError('Password is required');
      setLoading(false);
      return;
    }

    // Validate email is not empty
    if (!formData.email || formData.email.trim() === '') {
      setError('Email is required');
      setLoading(false);
      return;
    }

    try {
      const sessionData = await authService.signIn(formData.email, formData.password);
      
      // Check if 2FA is enabled
      if (authService.is2FAEnabled()) {
        // Show PIN verification step
        setPendingSession(sessionData);
        setShowPinStep(true);
        setLoading(false);
        return;
      }
      
      // No 2FA - proceed directly
      setIsAuthenticated(true);
      navigate('/dashboard');
      
      console.log('Login successful:', sessionData.user);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePinSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    if (!pin || pin.length !== 4) {
      setError('Please enter your 4-digit PIN');
      return;
    }
    
    const result = authService.verifyPin(pin);
    
    if (result.success) {
      // PIN verified - complete login
      setIsAuthenticated(true);
      navigate('/dashboard');
      console.log('Login successful with 2FA:', pendingSession?.user);
    } else {
      setError(result.message || 'Incorrect PIN');
      setPin('');
    }
  };

  const handleBackToPassword = () => {
    setShowPinStep(false);
    setPin('');
    setPendingSession(null);
    setError('');
    // Sign out the pending session
    authService.signOut();
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        {!showPinStep ? (
          // Step 1: Email & Password
          <>
            <div className="auth-header">
              <h1 className="auth-title">Welcome Back</h1>
              <p className="auth-subtitle">Sign in to your FinTrend account</p>
            </div>
            
            <form className="auth-form" onSubmit={handleSubmit}>
              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}
              
              <div className="form-group">
                <label htmlFor="email" className="form-label">Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="form-input"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password" className="form-label">Password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  className="form-input"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary auth-button"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="spinner"></div>
                    Signing In...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>

              <div className="auth-footer">
                <p>Don't have an account? <Link to="/signup" className="auth-link">Sign up here</Link></p>
                
                <div className="demo-credentials">
                  <h4>Demo Account:</h4>
                  
                  <div className="demo-account">
                    <strong>User:</strong> demo@stockpredict.ai / demo123
                  </div>
                </div>
              </div>
            </form>
          </>
        ) : (
          // Step 2: PIN Verification (2FA)
          <>
            <div className="auth-header">
              <h1 className="auth-title">🔐 Enter PIN</h1>
              <p className="auth-subtitle">Two-Factor Authentication</p>
            </div>
            
            <form className="auth-form" onSubmit={handlePinSubmit}>
              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}
              
              <div className="form-group">
                <label htmlFor="pin" className="form-label">Enter your 4-digit PIN</label>
                <input
                  type="password"
                  id="pin"
                  name="pin"
                  className="form-input"
                  placeholder="••••"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  maxLength={4}
                  autoFocus
                  style={{ 
                    textAlign: 'center', 
                    fontSize: '28px', 
                    letterSpacing: '12px',
                    fontFamily: 'monospace'
                  }}
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary auth-button"
              >
                Verify PIN
              </button>

              <div className="auth-footer">
                <button 
                  type="button" 
                  onClick={handleBackToPassword}
                  className="auth-link"
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  ← Back to password
                </button>
              </div>
            </form>
          </>
        )}
      </div>
      
      <div className="auth-background">
        <div className="floating-shape shape-1"></div>
        <div className="floating-shape shape-2"></div>
        <div className="floating-shape shape-3"></div>
      </div>
    </div>
  );
};

export default SignIn;