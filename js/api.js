/**
 * ZERO-MILE MEDCONNECT — API CLIENT & BACKEND CONNECTOR
 * Seamlessly interfaces with Node.js/Express Backend REST API (port 3000 or current origin)
 * Handles JWT token storage, automatic authentication headers, offline fallback, and reactive updates.
 */

class MedConnectAPI {
  constructor() {
    this.tokenKey = 'zero_mile_jwt_token';
    this.isBackendOnline = false;
    this.determineBaseUrl();
  }

  determineBaseUrl() {
    if (typeof window !== 'undefined' && window.location) {
      const loc = window.location;
      if (loc.protocol === 'http:' || loc.protocol === 'https:') {
        // If served from Express backend directly (port 3000)
        if (loc.port === '3000') {
          this.baseUrl = '';
        } else {
          // If served via Live Server (5500) or other port
          this.baseUrl = `${loc.protocol}//${loc.hostname}:3000`;
        }
      } else {
        // file:/// protocol
        this.baseUrl = 'http://localhost:3000';
      }
    } else {
      this.baseUrl = 'http://localhost:3000';
    }
  }

  getToken() {
    return localStorage.getItem(this.tokenKey) || null;
  }

  setToken(token) {
    if (token) {
      localStorage.setItem(this.tokenKey, token);
    } else {
      localStorage.removeItem(this.tokenKey);
    }
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async request(endpoint, options = {}, timeoutMs = 3000) {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Quick AbortController timeout to prevent hanging UI
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const config = {
      ...options,
      signal: controller.signal,
      headers: {
        ...this.getHeaders(),
        ...(options.headers || {})
      }
    };

    try {
      const response = await fetch(url, config);
      clearTimeout(timeoutId);
      this.isBackendOnline = true;

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || `Request failed with status ${response.status}`);
      }
      return data;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        console.warn(`[API Timeout] Backend at ${this.baseUrl} did not respond within ${timeoutMs}ms. Using local fallback.`);
      } else {
        console.warn(`[API Notice] Backend request to ${endpoint} failed: ${err.message}. Using local storage fallback.`);
      }
      this.isBackendOnline = false;
      throw err;
    }
  }

  // --- Auth APIs ---
  async register(userData) {
    const res = await this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    if (res.token) this.setToken(res.token);
    return res;
  }

  async login(username, password, role = 'citizen') {
    const res = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password, role })
    });
    if (res.token) this.setToken(res.token);
    return res;
  }

  async getCurrentUser() {
    try {
      return await this.request('/api/auth/me', {}, 1500);
    } catch (e) {
      return { success: false, authenticated: false, user: null };
    }
  }

  logout() {
    this.setToken(null);
  }

  // --- Blood Donors ---
  async getDonors() {
    return await this.request('/api/donors', {}, 1500);
  }

  async registerDonor(donorData) {
    return await this.request('/api/donors/register', {
      method: 'POST',
      body: JSON.stringify(donorData)
    });
  }

  async contactDonor(donorId, patientDetails = {}) {
    return await this.request('/api/donors/contact', {
      method: 'POST',
      body: JSON.stringify({ donorId, ...patientDetails })
    });
  }

  // --- Ambulance & Emergencies ---
  async getActiveEmergency() {
    return await this.request('/api/ambulance/active', {}, 1500);
  }

  async requestAmbulance(emergencyData) {
    return await this.request('/api/ambulance/request', {
      method: 'POST',
      body: JSON.stringify(emergencyData)
    });
  }

  async updateAmbulanceStatus(id, updates) {
    return await this.request(`/api/ambulance/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  }

  // --- Hospital Command Center ---
  async getHospitals() {
    return await this.request('/api/hospitals', {}, 1500);
  }

  async acceptHospitalAlert(hospitalId) {
    return await this.request(`/api/hospitals/${hospitalId}/accept-alert`, {
      method: 'POST'
    });
  }

  // --- Blood Requests ---
  async getBloodRequests() {
    return await this.request('/api/blood-requests', {}, 1500);
  }

  async createBloodRequest(data) {
    return await this.request('/api/blood-requests', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // --- Admin Owner Dashboard (Restricted) ---
  async getAdminDashboard() {
    return await this.request('/api/admin/dashboard', {}, 2000);
  }

  async getAdminLogs() {
    return await this.request('/api/admin/logs', {}, 2000);
  }
}

// Global API instance
window.medApi = new MedConnectAPI();
