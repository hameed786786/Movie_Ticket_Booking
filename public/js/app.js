// Global app state and utilities
const API_BASE = '/api';

// Auth utilities
const Auth = {
  getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },
  
  setUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
  },
  
  removeUser() {
    localStorage.removeItem('user');
  },
  
  isLoggedIn() {
    return !!this.getUser();
  },
  
  async logout() {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    }
    this.removeUser();
    window.location.href = '/login.html';
  }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  // Update navigation
  updateNavigation();
  
  // Logout handler
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      Auth.logout();
    });
  }
});

// API utilities
const api = {
  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    
    const config = {
      ...options,
      credentials: 'include', // Important for session cookies
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };
    
    if (options.body && typeof options.body === 'object') {
      config.body = JSON.stringify(options.body);
    }
    
    try {
      const response = await fetch(url, config);
      
      // Check content type before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Expected JSON but got:', contentType);
        const text = await response.text();
        console.error('Response text:', text.substring(0, 200));
        throw new Error('Server returned non-JSON response. Check server logs.');
      }
      
      const data = await response.json();
      
      if (!response.ok) {
        // If unauthorized, clear user data and redirect to login
        if (response.status === 401) {
          Auth.removeUser();
          if (window.location.pathname !== '/login.html' && window.location.pathname !== '/register.html' && window.location.pathname !== '/') {
            window.location.href = '/login.html';
          }
        }
        throw new Error(data.message || 'Request failed');
      }
      
      return data;
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  },
  
  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },
  
  post(endpoint, body) {
    return this.request(endpoint, { method: 'POST', body });
  },
  
  put(endpoint, body) {
    return this.request(endpoint, { method: 'PUT', body });
  },
  
  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
};

// UI utilities
const UI = {
  showAlert(message, type = 'error') {
    // Create alert container if it doesn't exist
    let alertContainer = document.querySelector('.alert-container');
    if (!alertContainer) {
      alertContainer = document.createElement('div');
      alertContainer.className = 'alert-container';
      alertContainer.style.cssText = 'position: fixed; top: 80px; right: 20px; z-index: 9999; max-width: 400px;';
      document.body.appendChild(alertContainer);
    }
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    alertDiv.style.cssText = 'margin-bottom: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.3);';
    
    alertContainer.appendChild(alertDiv);
    
    setTimeout(() => {
      alertDiv.style.opacity = '0';
      alertDiv.style.transition = 'opacity 0.3s';
      setTimeout(() => alertDiv.remove(), 300);
    }, 5000);
  },
  
  showLoading(element) {
    element.innerHTML = '<div class="loading"><div class="spinner"></div>Loading...</div>';
  },
  
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  },
  
  formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  },
  
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  }
};

// Update navigation based on auth state
function updateNavigation() {
  const authLinks = document.getElementById('authLinks');
  const userMenu = document.getElementById('userMenu');
  const userName = document.getElementById('userName');
  
  if (!authLinks || !userMenu) return;
  
  if (Auth.isLoggedIn()) {
    const user = Auth.getUser();
    authLinks.style.display = 'none';
    userMenu.style.display = 'flex';
    if (userName && user) {
      userName.textContent = user.name;
    }
    
    // Add dashboard link based on role
    if (user && user.role === 'theater') {
      const dashLink = document.querySelector('a[href="/theater-dashboard.html"]');
      if (!dashLink) {
        const navLinks = document.querySelector('.nav-links');
        const link = document.createElement('a');
        link.href = '/theater-dashboard.html';
        link.textContent = 'Dashboard';
        navLinks.insertBefore(link, userMenu);
      }
    } else if (user && user.role === 'admin') {
      const dashLink = document.querySelector('a[href="/admin.html"]');
      if (!dashLink) {
        const navLinks = document.querySelector('.nav-links');
        const link = document.createElement('a');
        link.href = '/admin.html';
        link.textContent = 'Admin Panel';
        navLinks.insertBefore(link, userMenu);
      }
    }
  } else {
    authLinks.style.display = 'flex';
    userMenu.style.display = 'none';
  }
}


function initSocket() {
  if (typeof io !== 'undefined') {
    socket = io();
    
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });
    
    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });
  }
  return socket;
}

// Export for use in other scripts
window.Auth = Auth;
window.api = api;
window.UI = UI;
window.initSocket = initSocket;
