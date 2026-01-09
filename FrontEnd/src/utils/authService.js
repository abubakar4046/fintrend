// User database service using localStorage for demo purposes
// In production, this would be replaced with actual database calls

import { storage } from './helpers';

// Default admin user for testing
const DEFAULT_USERS = [
  {
    id: 1,
    name: 'Admin User',
    email: 'admin@stockpredict.ai',
    password: 'admin123', // In production, this would be hashed
    createdAt: new Date().toISOString(),
    role: 'admin'
  },
  {
    id: 2,
    name: 'Demo User',
    email: 'demo@stockpredict.ai',
    password: 'demo123',
    createdAt: new Date().toISOString(),
    role: 'user'
  }
];

class AuthService {
  constructor() {
    this.initializeUsers();
  }

  // Initialize users database if it doesn't exist
  initializeUsers() {
    const existingUsers = storage.get('users');
    if (!existingUsers) {
      storage.set('users', DEFAULT_USERS);
    }
  }

  // Get all users
  getUsers() {
    return storage.get('users') || [];
  }

  // Find user by email
  findUserByEmail(email) {
    const users = this.getUsers();
    return users.find(user => user.email.toLowerCase() === email.toLowerCase());
  }

  // Validate email format
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Validate password strength with comprehensive checks
  isValidPassword(password) {
    // TC02: Password is required
    if (!password || password.trim() === '') {
      return { valid: false, error: 'Password is required' };
    }

    // TC03: Minimum length (8 characters)
    if (password.length < 8) {
      return { valid: false, error: 'Password must be at least 8 characters' };
    }

    // TC04: Maximum length (20 characters)
    if (password.length > 20) {
      return { valid: false, error: 'Password too long (maximum 20 characters)' };
    }

    // TC05: Must contain uppercase letter
    if (!/[A-Z]/.test(password)) {
      return { valid: false, error: 'Must contain at least one uppercase letter' };
    }

    // TC06: Must contain lowercase letter
    if (!/[a-z]/.test(password)) {
      return { valid: false, error: 'Must contain at least one lowercase letter' };
    }

    // TC07: Must contain number
    if (!/[0-9]/.test(password)) {
      return { valid: false, error: 'Must contain at least one number' };
    }

    // TC08: Must contain special character
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return { valid: false, error: 'Must contain at least one special character' };
    }

    // TC01: All requirements met
    return { valid: true };
  }

  // Sign in user
  async signIn(email, password) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          // Validate input
          if (!email || !password) {
            reject({ message: 'Please fill in all fields' });
            return;
          }

          if (!this.isValidEmail(email)) {
            reject({ message: 'Please enter a valid email address' });
            return;
          }

          // Find user
          const user = this.findUserByEmail(email);
          if (!user) {
            reject({ message: 'Invalid email or password' });
            return;
          }

          // Check password (in production, this would compare hashed passwords)
          if (user.password !== password) {
            reject({ message: 'Invalid email or password' });
            return;
          }

          // Create session
          const sessionData = {
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role
            },
            loginTime: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
          };

          storage.set('currentUser', sessionData);
          resolve(sessionData);

        } catch (error) {
          reject({ message: 'An error occurred during sign in' });
        }
      }, 1000); // Simulate network delay
    });
  }

  // Sign up new user
  async signUp(userData) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          const { name, email, password, confirmPassword } = userData;

          // Validate input
          if (!name || !email || !password || !confirmPassword) {
            reject({ message: 'Please fill in all fields' });
            return;
          }

          if (!this.isValidEmail(email)) {
            reject({ message: 'Please enter a valid email address' });
            return;
          }

          // Comprehensive password validation
          const passwordValidation = this.isValidPassword(password);
          if (!passwordValidation.valid) {
            reject({ message: passwordValidation.error });
            return;
          }

          // TC09: Check if passwords match
          if (password !== confirmPassword) {
            reject({ message: 'Passwords do not match' });
            return;
          }

          // Check if user already exists
          if (this.findUserByEmail(email)) {
            reject({ message: 'An account with this email already exists' });
            return;
          }

          // Create new user
          const users = this.getUsers();
          const newUser = {
            id: Date.now(), // Simple ID generation
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: password, // In production, this would be hashed
            createdAt: new Date().toISOString(),
            role: 'user'
          };

          users.push(newUser);
          storage.set('users', users);

          // Create session for new user
          const sessionData = {
            user: {
              id: newUser.id,
              name: newUser.name,
              email: newUser.email,
              role: newUser.role
            },
            loginTime: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          };

          storage.set('currentUser', sessionData);
          resolve(sessionData);

        } catch (error) {
          reject({ message: 'An error occurred during registration' });
        }
      }, 1000);
    });
  }

  // Get current user session
  getCurrentUser() {
    const sessionData = storage.get('currentUser');
    if (!sessionData) {
      return null;
    }

    // Check if session has expired
    if (new Date() > new Date(sessionData.expiresAt)) {
      this.signOut();
      return null;
    }

    return sessionData;
  }

  // Check if user is authenticated
  isAuthenticated() {
    return this.getCurrentUser() !== null;
  }

  // Sign out user
  signOut() {
    storage.remove('currentUser');
  }

  // Update user profile
  async updateProfile(userData) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          const currentSession = this.getCurrentUser();
          if (!currentSession) {
            reject({ message: 'User not authenticated' });
            return;
          }

          const users = this.getUsers();
          const userIndex = users.findIndex(user => user.id === currentSession.user.id);
          
          if (userIndex === -1) {
            reject({ message: 'User not found' });
            return;
          }

          // Update user data
          users[userIndex] = { ...users[userIndex], ...userData };
          storage.set('users', users);

          // Update session
          const updatedSession = {
            ...currentSession,
            user: { ...currentSession.user, ...userData }
          };
          storage.set('currentUser', updatedSession);

          resolve(updatedSession);

        } catch (error) {
          reject({ message: 'An error occurred while updating profile' });
        }
      }, 500);
    });
  }

  // Change password for current user (demo/localStorage)
  async changePassword(currentPassword, newPassword) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          const currentSession = this.getCurrentUser();
          if (!currentSession) {
            reject({ message: 'User not authenticated' });
            return;
          }

          const users = this.getUsers();
          const userIndex = users.findIndex(user => user.id === currentSession.user.id);
          if (userIndex === -1) {
            reject({ message: 'User not found' });
            return;
          }

          if (users[userIndex].password !== currentPassword) {
            reject({ message: 'Current password is incorrect' });
            return;
          }

          const passwordValidation = this.isValidPassword(newPassword);
          if (!passwordValidation.valid) {
            reject({ message: passwordValidation.error });
            return;
          }

          users[userIndex] = { ...users[userIndex], password: newPassword };
          storage.set('users', users);
          resolve({ success: true });
        } catch (error) {
          reject({ message: 'An error occurred while changing password' });
        }
      }, 500);
    });
  }

  // Delete account for current user (demo/localStorage)
  async deleteAccount() {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          const currentSession = this.getCurrentUser();
          if (!currentSession) {
            reject({ message: 'User not authenticated' });
            return;
          }

          const users = this.getUsers();
          const updatedUsers = users.filter(u => u.id !== currentSession.user.id);
          storage.set('users', updatedUsers);
          this.signOut();
          resolve({ success: true });
        } catch (error) {
          reject({ message: 'An error occurred while deleting account' });
        }
      }, 500);
    });
  }

  // Check if 2FA is enabled for current user
  is2FAEnabled() {
    try {
      const securitySettings = storage.get('securitySettings');
      return securitySettings?.twoFactorEnabled === true && securitySettings?.pin;
    } catch {
      return false;
    }
  }

  // Get stored PIN (for verification)
  getStoredPin() {
    try {
      const securitySettings = storage.get('securitySettings');
      return securitySettings?.pin || null;
    } catch {
      return null;
    }
  }

  // Verify PIN
  verifyPin(enteredPin) {
    const storedPin = this.getStoredPin();
    if (!storedPin) {
      return { success: false, message: 'No PIN configured' };
    }
    if (enteredPin === storedPin) {
      return { success: true };
    }
    return { success: false, message: 'Incorrect PIN' };
  }
}

// Export singleton instance
const authService = new AuthService();
export default authService;