// API Client for MongoDB Backend
// Replaces the old LocalStorage implementation

const PRIMARY_API_BASE_URL = 'https://sisurat-gmit-yegar-sahaduta-bello-api.vercel.app/api';
const FALLBACK_API_BASE_URL = 'http://localhost:5000/api';
const API_BASE_URLS = [PRIMARY_API_BASE_URL, FALLBACK_API_BASE_URL];

const isNetworkError = (error) => {
  if (!error) return false;
  if (error.name === 'TypeError') return true;
  const message = String(error.message || '');
  return /failed to fetch|networkerror|load failed|network request failed/i.test(message);
};

const API = {
  async request(endpoint, method = 'GET', body = null) {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    const config = {
      method,
      headers,
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    const requestOnce = async (baseUrl) => {
      console.log(`🔗 API ${method} ${baseUrl}${endpoint}`);
      const response = await fetch(`${baseUrl}${endpoint}`, config);
      const data = await response.json();
      
      if (!response.ok) {
        console.error('❌ API Error:', response.status, data);
        throw new Error(data.message || 'Something went wrong');
      }
      
      console.log('✅ API Response:', data);
      return data;
    };

    for (let i = 0; i < API_BASE_URLS.length; i += 1) {
      const baseUrl = API_BASE_URLS[i];
      try {
        return await requestOnce(baseUrl);
      } catch (error) {
        if (isNetworkError(error) && i < API_BASE_URLS.length - 1) {
          console.warn(`⚠️ API unreachable at ${baseUrl}. Falling back to localhost.`);
          continue;
        }
        console.error('💥 API Request Error:', error);
        throw error;
      }
    }
  },

  // --- Users ---
  users: {
    login: (email, password) => API.request('/users/login', 'POST', { email, password }),
    register: (userData) => API.request('/users/register', 'POST', userData),
    getAll: () => API.request('/users'),
    getById: (id) => API.request(`/users/${id}`),
    update: (id, data) => API.request(`/users/${id}`, 'PUT', data),
    delete: (id) => API.request(`/users/${id}`, 'DELETE'),
  },

  // --- Pengajuan ---
  pengajuan: {
    create: (data) => API.request('/pengajuan', 'POST', data),
    getAll: (filters = {}) => {
      const queryString = new URLSearchParams(filters).toString();
      return API.request(`/pengajuan?${queryString}`);
    },
    getById: (id) => API.request(`/pengajuan/${id}`),
    update: (id, data) => API.request(`/pengajuan/${id}`, 'PUT', data),
    updateStatus: (id, statusData) => API.request(`/pengajuan/${id}/status`, 'PUT', statusData),
    delete: (id) => API.request(`/pengajuan/${id}`, 'DELETE'),
  },

  // --- Notifications ---
  notifications: {
    getAll: (filters = {}) => {
      const queryString = new URLSearchParams(filters).toString();
      return API.request(`/notifications?${queryString}`);
    },
    create: (data) => API.request('/notifications', 'POST', data),
    markAsRead: (id) => API.request(`/notifications/${id}/read`, 'PUT'),
    delete: (id) => API.request(`/notifications/${id}`, 'DELETE'),
  }
};

// Expose API globally
window.API = API;

// --- MongoDB Backend Adapter (LS) ---
// All data operations now go exclusively through MongoDB backend API
// No localStorage fallback - system requires backend connection

window.LS = {
  // Load Collection (Async - fetches from MongoDB via API)
  loadArray: async (key) => {
    try {
      if (key === 'users' || key === 'local_users') {
        return await API.users.getAll();
      }
      if (key === 'local_pengajuan') {
        return await API.pengajuan.getAll();
      }
      if (key === 'local_notifications') {
        return await API.notifications.getAll();
      }
      console.warn(`LS.loadArray: Unknown key '${key}', returning empty array`);
      return [];
    } catch (err) {
      console.error(`LS.loadArray('${key}') error:`, err);
      throw new Error(`Failed to load ${key} from database. Please ensure backend is running.`);
    }
  },

  // Save Collection (Deprecated - use API create/update instead)
  saveArray: (key, arr) => {
    throw new Error(`LS.saveArray('${key}') is deprecated. Use API.${key}.create() or API.${key}.update() instead.`);
  },

  // Find One (Async)
  find: async (key, predicate) => {
    const list = await window.LS.loadArray(key);
    return list.find(predicate);
  },

  // Push Item (Async - creates via API)
  pushItem: async (key, item) => {
    try {
      if (key === 'local_pengajuan') {
        return await API.pengajuan.create(item);
      }
      if (key === 'local_notifications') {
        return await API.notifications.create(item);
      }
      if (key === 'users' || key === 'local_users') {
        return await API.users.register(item);
      }
      // Fallback
      const arr = await window.LS.loadArray(key);
      arr.push(item);
      window.LS.saveArray(key, arr);
      return item;
    } catch (err) {
      console.error(`LS.pushItem('${key}') error:`, err);
      throw err;
    }
  },

  // Update By ID (Async - updates via API)
  updateById: async (key, id, updates) => {
    try {
      // Convert MongoDB _id to id if needed
      const actualId = updates._id || id;
      
      if (key === 'local_pengajuan') {
        return await API.pengajuan.update(actualId, updates);
      }
      if (key === 'users' || key === 'local_users') {
        return await API.users.update(actualId, updates);
      }
      if (key === 'local_notifications' && updates.is_read !== undefined) {
        return await API.notifications.markAsRead(actualId);
      }
      
      throw new Error(`Unknown collection key: ${key}`);
    } catch (err) {
      console.error(`LS.updateById('${key}', '${id}') error:`, err);
      throw err;
    }
  },

  // Remove By ID (Async - deletes via API)
  removeById: async (key, id) => {
    try {
      if (key === 'local_pengajuan') {
        return await API.pengajuan.delete(id);
      }
      if (key === 'users' || key === 'local_users') {
        return await API.users.delete(id);
      }
      if (key === 'local_notifications') {
        return await API.notifications.delete(id);
      }
      
      throw new Error(`Unknown collection key: ${key}`);
    } catch (err) {
      console.error(`LS.removeById('${key}', '${id}') error:`, err);
      throw err;
    }
  },
  
  // Helper to get current user (sync - uses localStorage for session)
  getCurrentUser: () => {
    try {
      return JSON.parse(localStorage.getItem('currentUser'));
    } catch (e) {
      return null;
    }
  },
  
  setCurrentUser: (user) => {
    localStorage.setItem('currentUser', JSON.stringify(user));
  },
  
  logout: () => {
    localStorage.removeItem('currentUser');
    try { localStorage.removeItem('token'); } catch(e){}
    const isLiveServer = /localhost:5500|127\.0\.0\.1:5500/i.test(window.location.origin);
    // Explicitly go to the Frontend login page when using Live Server
    window.location.href = isLiveServer ? '/Frontend/index.html' : 'index.html';
  }
};

// Keep DB_SCHEMA for frontend reference if needed
window.DB_SCHEMA = {
  COLLECTIONS: {
    USERS: 'users',
    PENGAJUAN: 'local_pengajuan',
    NOTIFICATIONS: 'local_notifications'
  }
};
