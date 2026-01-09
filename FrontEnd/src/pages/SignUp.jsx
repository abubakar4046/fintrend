import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import authService from '../utils/authService';
import '../styles/auth.css';

const SignUp = ({ setIsAuthenticated }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordErrors, setPasswordErrors] = useState([]);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    setError(''); // Clear error when user types
    
    // Validate password in real-time
    if (name === 'password') {
      validatePassword(value);
    }
    
    // Check password match in real-time
    if (name === 'confirmPassword' || (name === 'password' && formData.confirmPassword)) {
      const pwd = name === 'password' ? value : formData.password;
      const confirmPwd = name === 'confirmPassword' ? value : formData.confirmPassword;
      if (confirmPwd && pwd !== confirmPwd) {
        setError('Passwords do not match');
      } else {
        setError('');
      }
    }
  };

  const validatePassword = (password) => {
    const errors = [];
    
    // TC02: Check if password is empty
    if (!password || password.trim() === '') {
      errors.push('Password is required');
      setPasswordErrors(errors);
      return false;
    }
    
    // TC03: Check minimum length (8 characters)
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    
    // TC04: Check maximum length (20 characters)
    if (password.length > 20) {
      errors.push('Password too long (maximum 20 characters)');
    }
    
    // TC05: Check for uppercase letter
    if (!/[A-Z]/.test(password)) {
      errors.push('Must contain at least one uppercase letter');
    }
    
    // TC06: Check for lowercase letter
    if (!/[a-z]/.test(password)) {
      errors.push('Must contain at least one lowercase letter');
    }
    
    // TC07: Check for number
    if (!/[0-9]/.test(password)) {
      errors.push('Must contain at least one number');
    }
    
    // TC08: Check for special character
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Must contain at least one special character');
    }
    
    setPasswordErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate all fields before submission
    if (!formData.name.trim()) {
      setError('Name is required');
      setLoading(false);
      return;
    }

    if (!formData.email.trim()) {
      setError('Email is required');
      setLoading(false);
      return;
    }

    // TC02: Validate password is not empty
    if (!formData.password || formData.password.trim() === '') {
      setError('Password is required');
      setLoading(false);
      return;
    }

    // Validate password meets all requirements
    const isPasswordValid = validatePassword(formData.password);
    if (!isPasswordValid) {
      setError('Please fix the password requirements shown below');
      setLoading(false);
      return;
    }

    // TC09: Check if passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const sessionData = await authService.signUp(formData);
      
      // Store user data and set authentication state
      setIsAuthenticated(true);
      navigate('/dashboard');
      
      console.log('Registration successful:', sessionData.user);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">Join FinTrend and start analyzing market trends</p>
        </div>
        
        <form className="auth-form" onSubmit={handleSubmit}>
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="name" className="form-label">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              className="form-input"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

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
              className={`form-input ${passwordErrors.length > 0 ? 'input-error' : ''}`}
              placeholder="Create a password (e.g., Test@123)"
              value={formData.password}
              onChange={handleChange}
              required
            />
            {passwordErrors.length > 0 && (
              <div className="password-requirements">
                <p className="requirements-title">Password requirements:</p>
                <ul className="requirements-list">
                  {passwordErrors.map((error, index) => (
                    <li key={index} className="requirement-error">{error}</li>
                  ))}
                </ul>
              </div>
            )}
            {formData.password && passwordErrors.length === 0 && (
              <div className="password-requirements">
                <p className="requirements-success">✓ Password meets all requirements</p>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              className="form-input"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
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
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </button>

          <div className="auth-footer">
            <p>Already have an account? <Link to="/signin" className="auth-link">Sign in here</Link></p>
          </div>
        </form>
      </div>
      
      <div className="auth-background">
        <div className="floating-shape shape-1"></div>
        <div className="floating-shape shape-2"></div>
        <div className="floating-shape shape-3"></div>
      </div>
    </div>
  );
};

export default SignUp;