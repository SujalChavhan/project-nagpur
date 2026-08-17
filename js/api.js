/**
 * ZERO-MILE MEDCONNECT — API CLIENT & REAL-TIME BACKEND CONNECTOR
 * Seamlessly interfaces with Node.js/Express Backend REST API & Server-Sent Events (SSE) stream.
 * Handles cross-device real-time sync, JWT token management, automatic retries, and offline caching.
 */

class MedConnectAPI {
  constructor() {
    this.tokenKey = 'zero_mile_jwt_token';
    this.isBackendOnline = false;
    this.eventSource = null;
    this.eventListeners = [];
    this.determineBaseUrl();
  }

  determineBaseUrl() {
    if (typeof window !== 'undefined' && window.location) {
      const loc = window.location;
      if (loc.protocol === 'http:' || loc.protocol === 'https:') {
        // If served directly from Express on port 3000
        if (loc.port === '3000' || loc.port === '') {
          this.baseUrl = '';
        } else {
          // If served via Live Server (e.g. 5500)
          this.baseUrl = `${loc.protocol}//${loc.hostname}:3000`;
        }
      } else {
        // Local file system
        this.baseUrl = 'http://localhost:3000';
      }
    } else {
      this.baseUrl = 'http://localhost:3000';
    }
  }

  getToken() {
    try {
      return localStorage.getItem(this.tokenKey) || null;
    } catch (e) {
      return null;
    }
  }

  setToken(token) {
    try {
      if (token) {
        localStorage.setItem(this.tokenKey, token);
      } else {
        localStorage.removeItem(this.tokenKey);
      }
    } catch (e) {}
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

  async request(endpoint, options = {}, timeoutMs = 4000) {
    const url = `${this.baseUrl}${endpoint}`;
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
      this.isBackendOnline = false;
      throw err;
    }
  }

  // ==========================================
  // REAL-TIME SERVER-SENT EVENTS (SSE) LISTENER
  // ==========================================

  startEventStream(callback) {
    if (typeof EventSource === 'undefined') return;

    if (this.eventSource) {
      this.eventSource.close();
    }

    const sseUrl = `${this.baseUrl}/api/events`;

    try {
      this.eventSource = new EventSource(sseUrl);

      this.eventSource.onopen = () => {
        this.isBackendOnline = true;
        console.log('[SSE] Real-time stream connected to backend:', sseUrl);
      };

      const eventTypes = [
        'connected',
        'EMERGENCY_CREATED',
        'EMERGENCY_STATUS_UPDATED',
        'ALERT_ACCEPTED',
        'PATIENT_ADMITTED',
        'PATIENT_DISCHARGED',
        'HOSPITAL_INVENTORY_UPDATED',
        'DONOR_REGISTERED',
        'DONOR_CONTACTED',
        'BLOOD_REQ_CREATED'
      ];

      eventTypes.forEach(evtType => {
        this.eventSource.addEventListener(evtType, (e) => {
          try {
            const parsed = JSON.parse(e.data);
            if (callback) callback(evtType, parsed.data || parsed);
          } catch (err) {
            console.warn('[SSE Parse Error]:', err);
          }
        });
      });

      this.eventSource.onerror = (err) => {
        console.warn('[SSE Stream Disconnected - reconnecting in 3s...]');
        this.isBackendOnline = false;
        this.eventSource.close();
        setTimeout(() => this.startEventStream(callback), 3000);
      };
    } catch (e) {
      console.warn('[SSE Initialization failed]:', e);
    }
  }

  // --- Full Server State Synchronization ---
  async syncState() {
    return await this.request('/api/sync/state', {}, 2500);
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
      return await this.request('/api/auth/me', {}, 2000);
    } catch (e) {
      return { success: false, authenticated: false, user: null };
    }
  }

  logout() {
    this.setToken(null);
  }

  // --- Blood Donors ---
  async getDonors() {
    return await this.request('/api/donors', {}, 2000);
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
    return await this.request('/api/ambulance/active', {}, 2000);
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

  // --- Hospital Command Center & Bed Management ---
  async getHospitals() {
    return await this.request('/api/hospitals', {}, 2000);
  }

  async updateHospitalInventory(hospitalId, inventoryData) {
    return await this.request(`/api/hospitals/${hospitalId}/inventory`, {
      method: 'POST',
      body: JSON.stringify(inventoryData)
    });
  }

  async acceptHospitalAlert(hospitalId) {
    return await this.request(`/api/hospitals/${hospitalId}/accept-alert`, {
      method: 'POST'
    });
  }

  async admitPatient(hospitalId, requestId) {
    return await this.request(`/api/hospitals/${hospitalId}/admit-patient`, {
      method: 'POST',
      body: JSON.stringify({ requestId })
    });
  }

  async dischargePatient(hospitalId, requestId, feedback, outcome) {
    return await this.request(`/api/hospitals/${hospitalId}/discharge-patient`, {
      method: 'POST',
      body: JSON.stringify({ requestId, feedback, outcome })
    });
  }

  async rejectPatient(hospitalId, requestId, targetHospitalId, reason) {
    return await this.request(`/api/hospitals/${hospitalId}/reject-patient`, {
      method: 'POST',
      body: JSON.stringify({ requestId, targetHospitalId, reason })
    });
  }

  async updateHospitalSettings(hospitalId, settings) {
    return await this.request(`/api/hospitals/${hospitalId}/settings`, {
      method: 'POST',
      body: JSON.stringify(settings)
    });
  }

  // --- Blood Requests ---
  async getBloodRequests() {
    return await this.request('/api/blood-requests', {}, 2000);
  }

  async createBloodRequest(data) {
    return await this.request('/api/blood-requests', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // --- Admin Owner Dashboard ---
  async getAdminDashboard() {
    return await this.request('/api/admin/dashboard', {}, 2500);
  }

  async getAdminLogs() {
    return await this.request('/api/admin/logs', {}, 2500);
  }
}

// Global API instance
window.medApi = new MedConnectAPI();
