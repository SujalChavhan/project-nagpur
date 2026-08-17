/**
 * ZERO-MILE MEDCONNECT — REACTIVE STATE STORE & REAL-TIME BACKEND SYNCHRONIZER
 * Manages Citizen, Hospital, and Admin authentication sessions,
 * connects to Server-Sent Events (SSE) and fast sync polling,
 * manages 1-second countdown, bed inventory management, and patient discharge workflows.
 */

class MedConnectStore {
  constructor() {
    this.subscribers = {};
    this.storageKey = 'zero_mile_medconnect_state_v6';
    this.state = this.loadInitialState();
    this.initCountdownTimer();
    this.initRealTimeSync();
  }

  getDefaultState() {
    return {
      session: {
        role: 'guest', // 'guest', 'citizen', 'hospital', 'admin'
        token: null,
        citizen: {
          id: null,
          name: "Guest Citizen",
          phone: "",
          locality: "Dharampeth, Nagpur",
          bloodGroup: "O+",
          isRegisteredDonor: false
        },
        activeHospitalId: "NCEH001",
        admin: {
          name: "Platform Owner",
          username: "admin"
        }
      },

      // Multi-Hospital Data Store with full Bed & Seat Inventories
      hospitals: {
        "NCEH001": {
          id: "NCEH001",
          name: "Nagpur Central Emergency Hospital",
          code: "NCEH001",
          locality: "Civil Lines / Central Nagpur",
          traumaLevel: "Level 1 Apex Trauma",
          emergencyContact: "+91 712 255 1001",
          lat: 21.1552,
          lng: 79.0865,
          icuBedsTotal: 24,
          icuBedsAvailable: 6,
          normalBedsTotal: 50,
          normalBedsAvailable: 18,
          ventilatorsTotal: 18,
          ventilatorsAvailable: 5,
          traumaUnitsTotal: 6,
          traumaUnitsAvailable: 3,
          emergencyTeamStatus: "Available (Team Alpha Ready)",
          bloodReservePercentage: 94,
          inboundQueue: []
        },
        "OCMC002": {
          id: "OCMC002",
          name: "Orange City Medical Center",
          code: "OCMC002",
          locality: "Khamla / Ring Road",
          traumaLevel: "Level 1 Multi-Speciality",
          emergencyContact: "+91 712 228 3200",
          lat: 21.1114,
          lng: 79.0664,
          icuBedsTotal: 20,
          icuBedsAvailable: 4,
          normalBedsTotal: 40,
          normalBedsAvailable: 12,
          ventilatorsTotal: 15,
          ventilatorsAvailable: 3,
          traumaUnitsTotal: 4,
          traumaUnitsAvailable: 2,
          emergencyTeamStatus: "Available (Team Beta Standing By)",
          bloodReservePercentage: 88,
          inboundQueue: []
        },
        "CIEC003": {
          id: "CIEC003",
          name: "Central India Emergency Care",
          code: "CIEC003",
          locality: "Wardha Road / MIHAN Corridor",
          traumaLevel: "Secondary Emergency Care",
          emergencyContact: "+91 712 298 0501",
          lat: 21.0336,
          lng: 79.0275,
          icuBedsTotal: 16,
          icuBedsAvailable: 4,
          normalBedsTotal: 30,
          normalBedsAvailable: 10,
          ventilatorsTotal: 12,
          ventilatorsAvailable: 3,
          traumaUnitsTotal: 4,
          traumaUnitsAvailable: 2,
          emergencyTeamStatus: "Available (Team Gamma On Duty)",
          bloodReservePercentage: 75,
          inboundQueue: []
        }
      },

      // Active Emergency State Structure
      activeEmergency: {
        id: "EMG-NAG-101",
        patient: {
          name: "Emergency Patient",
          age: 35,
          gender: "Male",
          condition: "Accident / Trauma",
          severity: "CRITICAL",
          bloodGroup: "O+",
          vitals: {
            heartRate: 114,
            bp: "142/92",
            spO2: 93,
            respRate: 24,
            ecgRhythm: "Sinus Tachycardia",
            tempF: 98.4
          }
        },
        ambulance: {
          code: "ZM-1024",
          type: "Advanced Life Support (ALS) Ambulance",
          driver: "Amit Sharma",
          driverRating: 4.9,
          driverPhone: "+91 98221 44550",
          paramedic: "Dr. Neha Verma (ER Specialist)",
          plateNumber: "MH 31 EQ 4088",
          currentSpeedKmh: 62,
          currentLat: 21.1448,
          currentLng: 79.0625
        },
        pickup: {
          name: "Dharampeth (West High Court Rd), Nagpur",
          lat: 21.1448,
          lng: 79.0625
        },
        destinationHospitalId: "NCEH001",
        hospital: {
          id: "NCEH001",
          name: "Nagpur Central Emergency Hospital",
          code: "NCEH001",
          locality: "Civil Lines / Central Nagpur",
          lat: 21.1552,
          lng: 79.0865,
          contact: "+91 712 255 1001"
        },
        etaSeconds: 892,
        initialEtaSeconds: 1080,
        journeyStep: 4,
        status: "EN ROUTE",
        ambulanceStatus: "EN ROUTE",
        is15mAlertTriggered: true,
        is15mAlertAccepted: false,
        doctorFeedback: null,
        dischargedAt: null
      },

      bloodRequests: [
        {
          id: "BLD-REQ-401",
          patientName: "Emergency Reserve",
          bloodGroup: "B+",
          unitsRequired: 2,
          urgency: "CRITICAL",
          hospital: "Nagpur Central Emergency Hospital",
          requestedAt: "10 mins ago",
          status: "Matching Donors",
          matchedDonorsCount: 3
        },
        {
          id: "BLD-REQ-398",
          patientName: "Trauma ICU Unit",
          bloodGroup: "O+",
          unitsRequired: 3,
          urgency: "URGENT",
          hospital: "Orange City Medical Center",
          requestedAt: "25 mins ago",
          status: "Donors Contacted",
          matchedDonorsCount: 4
        }
      ],

      registeredDonors: [],
      contactedDonors: {},
      adminData: null
    };
  }

  loadInitialState() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.activeEmergency) {
          parsed.activeEmergency = this.getDefaultState().activeEmergency;
        }
        if (!parsed.hospitals) {
          parsed.hospitals = this.getDefaultState().hospitals;
        }
        return parsed;
      }
    } catch (e) {
      console.warn("Could not load state from localStorage:", e);
    }
    return this.getDefaultState();
  }

  saveState() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    } catch (e) {
      console.warn("Failed saving state to localStorage:", e);
    }
  }

  // ==========================================
  // REAL-TIME SYNC: SSE STREAM & RAPID POLLING
  // ==========================================

  initRealTimeSync() {
    if (!window.medApi) return;

    // 1. Start Server-Sent Events (SSE) stream for instant real-time pushes
    window.medApi.startEventStream((evtType, payload) => {
      this.handleServerEvent(evtType, payload);
    });

    // 2. Initial backend load
    this.syncWithBackend();

    // 3. Fallback 1.5-second rapid polling loop for guaranteed cross-device real-time sync
    if (this.syncInterval) clearInterval(this.syncInterval);
    this.syncInterval = setInterval(() => {
      this.syncWithBackend();
    }, 1500);
  }

  // Real-time Event Handler (Instant reactive reaction across all devices)
  handleServerEvent(evtType, payload) {
    console.log(`[RealTime Event] ${evtType}:`, payload);

    if (evtType === 'EMERGENCY_CREATED') {
      if (payload.hospitals) {
        this.state.hospitals = payload.hospitals;
      }
      if (payload.emergency) {
        this.formatAndSetActiveEmergency(payload.emergency);
      }
      this.saveState();
      this.notify('EMERGENCY_CREATED', payload);
      this.notify('HOSPITAL_DATA_UPDATED', this.getCurrentHospitalData());
      this.notify('EMERGENCY_UPDATED', this.state.activeEmergency);
    } else if (evtType === 'HOSPITAL_INVENTORY_UPDATED') {
      if (payload.hospitals) {
        this.state.hospitals = payload.hospitals;
      } else if (payload.hospital) {
        this.state.hospitals[payload.hospital.id] = payload.hospital;
      }
      this.saveState();
      this.notify('HOSPITAL_DATA_UPDATED', this.getCurrentHospitalData());
    } else if (evtType === 'ALERT_ACCEPTED') {
      if (payload.hospital) {
        this.state.hospitals[payload.hospital.id] = payload.hospital;
      }
      if (payload.activeEmergency && this.state.activeEmergency) {
        this.state.activeEmergency.is15mAlertAccepted = true;
        this.state.activeEmergency.acceptedTimestamp = payload.activeEmergency.acceptedTimestamp || new Date().toLocaleTimeString();
      }
      this.saveState();
      this.notify('ALERT_15M_ACCEPTED', payload.hospital || this.getCurrentHospitalData());
      this.notify('HOSPITAL_DATA_UPDATED', this.getCurrentHospitalData());
      this.notify('EMERGENCY_UPDATED', this.state.activeEmergency);
    } else if (evtType === 'PATIENT_ADMITTED') {
      if (payload.hospital) {
        this.state.hospitals[payload.hospital.id] = payload.hospital;
      }
      if (this.state.activeEmergency && payload.emergency && this.state.activeEmergency.id === payload.emergency.id) {
        this.state.activeEmergency.status = 'ADMITTED';
        this.state.activeEmergency.journeyStep = 6;
      }
      this.saveState();
      this.notify('HOSPITAL_DATA_UPDATED', this.getCurrentHospitalData());
      this.notify('EMERGENCY_UPDATED', this.state.activeEmergency);
    } else if (evtType === 'PATIENT_DISCHARGED') {
      if (payload.hospitals) {
        this.state.hospitals = payload.hospitals;
      } else if (payload.hospital) {
        this.state.hospitals[payload.hospital.id] = payload.hospital;
      }
      if (this.state.activeEmergency && payload.emergency && this.state.activeEmergency.id === payload.emergency.id) {
        this.state.activeEmergency.status = 'DISCHARGED';
        this.state.activeEmergency.doctorFeedback = payload.feedback || payload.emergency.doctorFeedback;
        this.state.activeEmergency.outcome = payload.outcome || payload.emergency.outcome;
        this.state.activeEmergency.dischargedAt = payload.emergency.dischargedAt || new Date().toISOString();
      }
      this.saveState();
      this.notify('PATIENT_DISCHARGED', payload);
      this.notify('HOSPITAL_DATA_UPDATED', this.getCurrentHospitalData());
      this.notify('EMERGENCY_UPDATED', this.state.activeEmergency);
    } else if (evtType === 'PATIENT_DIVERTED') {
      if (payload.hospitals) {
        this.state.hospitals = payload.hospitals;
      } else {
        if (payload.currentHospital) this.state.hospitals[payload.currentHospital.id] = payload.currentHospital;
        if (payload.targetHospital) this.state.hospitals[payload.targetHospital.id] = payload.targetHospital;
      }
      if (payload.emergency) {
        this.formatAndSetActiveEmergency(payload.emergency);
      }
      this.saveState();
      this.notify('PATIENT_DIVERTED', payload);
      this.notify('HOSPITAL_DATA_UPDATED', this.getCurrentHospitalData());
      this.notify('EMERGENCY_UPDATED', this.state.activeEmergency);
    } else if (evtType === 'HOSPITAL_SETTINGS_UPDATED') {
      if (payload.hospitals) {
        this.state.hospitals = payload.hospitals;
      } else if (payload.hospital) {
        this.state.hospitals[payload.hospital.id] = payload.hospital;
      }
      this.saveState();
      this.notify('HOSPITAL_DATA_UPDATED', this.getCurrentHospitalData());
    } else if (evtType === 'DONOR_REGISTERED') {
      if (payload.donor) {
        this.state.registeredDonors.unshift(payload.donor);
        this.saveState();
        this.notify('DONORS_UPDATED', this.state.registeredDonors);
      }
    } else if (evtType === 'BLOOD_REQ_CREATED') {
      if (payload.bloodRequest) {
        this.state.bloodRequests.unshift(payload.bloodRequest);
        this.saveState();
        this.notify('BLOOD_REQUEST_CREATED', payload.bloodRequest);
      }
    }
  }

  // --- Backend Sync Polling Engine ---
  async syncWithBackend() {
    if (!window.medApi) return;

    try {
      const syncRes = await window.medApi.syncState();
      if (syncRes && syncRes.success) {
        // 1. Sync Hospitals and Inbound Queues
        if (syncRes.hospitals) {
          this.state.hospitals = syncRes.hospitals;
          this.notify('HOSPITAL_DATA_UPDATED', this.getCurrentHospitalData());
        }

        // 2. Sync Active Emergency
        if (syncRes.ambulanceRequests && syncRes.ambulanceRequests.length > 0) {
          const active = syncRes.ambulanceRequests.find(r => r.status !== 'DISCHARGED' && r.status !== 'COMPLETED') || syncRes.ambulanceRequests[0];
          if (active) {
            this.formatAndSetActiveEmergency(active);
            this.notify('EMERGENCY_UPDATED', this.state.activeEmergency);
          }
        }

        // 3. Sync Blood Donors
        if (syncRes.bloodDonors) {
          this.state.registeredDonors = syncRes.bloodDonors;
          this.notify('DONORS_UPDATED', this.state.registeredDonors);
        }

        // 4. Sync Blood Requests
        if (syncRes.bloodRequests) {
          this.state.bloodRequests = syncRes.bloodRequests;
          this.notify('BLOOD_REQUEST_CREATED', this.state.bloodRequests);
        }

        this.saveState();
      }

      // Check current session
      const authRes = await window.medApi.getCurrentUser();
      if (authRes && authRes.authenticated && authRes.user) {
        const u = authRes.user;
        if (u.role === 'citizen') {
          this.state.session.role = 'citizen';
          this.state.session.citizen = {
            id: u.id,
            name: u.name,
            phone: u.phone,
            locality: u.locality || 'Dharampeth, Nagpur',
            bloodGroup: u.bloodGroup || 'O+',
            isRegisteredDonor: u.isRegisteredDonor || false
          };
        } else if (u.role === 'hospital') {
          this.state.session.role = 'hospital';
          this.state.session.activeHospitalId = u.hospitalId || 'NCEH001';
        } else if (u.role === 'admin') {
          this.state.session.role = 'admin';
          this.state.session.admin = { id: u.id, name: u.name, username: u.username };
        }
        this.saveState();
        this.notify('SESSION_CHANGED', this.state.session);
      }
    } catch (err) {
      // Offline/Local cached execution continues smoothly
    }
  }

  formatAndSetActiveEmergency(serverEmg) {
    if (!serverEmg) return;

    const targetHospId = serverEmg.hospitalId || serverEmg.destinationHospitalId || 'NCEH001';
    const targetHosp = this.getHospitalById(targetHospId);

    const pCoords = (typeof NAGPUR_DATA !== 'undefined' && NAGPUR_DATA.getLocalityCoordinates)
      ? NAGPUR_DATA.getLocalityCoordinates(serverEmg.locality || (serverEmg.pickup && serverEmg.pickup.name))
      : { lat: 21.1432, lng: 79.0621, name: "Dharampeth" };

    const hCoords = (typeof NAGPUR_DATA !== 'undefined' && NAGPUR_DATA.getHospitalCoordinates)
      ? NAGPUR_DATA.getHospitalCoordinates(targetHosp.id)
      : { lat: targetHosp.lat || 21.1552, lng: targetHosp.lng || 79.0865, name: targetHosp.name };

    const waypoints = (typeof NAGPUR_DATA !== 'undefined' && NAGPUR_DATA.generateRouteWaypoints)
      ? NAGPUR_DATA.generateRouteWaypoints(pCoords, hCoords)
      : [
          { lat: pCoords.lat, lng: pCoords.lng, name: `Pickup: ${pCoords.name}` },
          { lat: pCoords.lat + (hCoords.lat - pCoords.lat) * 0.5, lng: pCoords.lng + (hCoords.lng - pCoords.lng) * 0.5, name: "Corridor Junction" },
          { lat: hCoords.lat, lng: hCoords.lng, name: `Destination: ${hCoords.name}` }
        ];

    const formatted = {
      id: serverEmg.id,
      patient: {
        name: serverEmg.patientName || (serverEmg.patient && serverEmg.patient.name) || "Emergency Patient",
        age: serverEmg.age || (serverEmg.patient && serverEmg.patient.age) || 35,
        condition: serverEmg.condition || (serverEmg.patient && serverEmg.patient.condition) || "Accident / Trauma",
        severity: serverEmg.severity || (serverEmg.patient && serverEmg.patient.severity) || "CRITICAL",
        bloodGroup: serverEmg.bloodGroup || (serverEmg.patient && serverEmg.patient.bloodGroup) || "O+",
        vitals: serverEmg.vitals || (serverEmg.patient && serverEmg.patient.vitals) || { heartRate: 114, bp: "142/92", spO2: 93, respRate: 24, ecgRhythm: "Sinus Tachycardia", tempF: 98.4 }
      },
      ambulance: {
        code: serverEmg.ambulanceCode || (serverEmg.ambulance && serverEmg.ambulance.code) || "ZM-1024",
        type: serverEmg.ambulanceType || (serverEmg.ambulance && serverEmg.ambulance.type) || "Advanced Life Support (ALS) Ambulance",
        driver: serverEmg.driverName || (serverEmg.ambulance && serverEmg.ambulance.driver) || "Amit Sharma",
        driverRating: 4.9,
        driverPhone: serverEmg.driverPhone || (serverEmg.ambulance && serverEmg.ambulance.driverPhone) || "+91 98221 44550",
        paramedic: serverEmg.paramedic || (serverEmg.ambulance && serverEmg.ambulance.paramedic) || "Dr. Neha Verma (ER Specialist)",
        currentSpeedKmh: 62,
        currentLat: (serverEmg.ambulance && serverEmg.ambulance.currentLat) || waypoints[1].lat,
        currentLng: (serverEmg.ambulance && serverEmg.ambulance.currentLng) || waypoints[1].lng
      },
      pickup: {
        name: serverEmg.locality || (serverEmg.pickup && serverEmg.pickup.name) || pCoords.name,
        lat: pCoords.lat,
        lng: pCoords.lng
      },
      destinationHospitalId: targetHosp.id,
      hospital: {
        id: targetHosp.id,
        name: targetHosp.name,
        code: targetHosp.code,
        locality: targetHosp.locality,
        contact: targetHosp.emergencyContact,
        lat: hCoords.lat,
        lng: hCoords.lng
      },
      routeWaypoints: waypoints,
      etaSeconds: typeof serverEmg.etaSeconds === 'number' ? serverEmg.etaSeconds : 892,
      initialEtaSeconds: serverEmg.initialEtaSeconds || 1080,
      journeyStep: serverEmg.journeyStep || 4,
      status: serverEmg.status || "EN ROUTE",
      ambulanceStatus: serverEmg.status || "EN ROUTE",
      is15mAlertTriggered: true,
      is15mAlertAccepted: !!serverEmg.is15mAlertAccepted,
      acceptedTimestamp: serverEmg.acceptedTimestamp || null,
      doctorFeedback: serverEmg.doctorFeedback || null,
      outcome: serverEmg.outcome || null,
      dischargedAt: serverEmg.dischargedAt || null
    };

    this.state.activeEmergency = formatted;
    this.saveState();
    this.notify('EMERGENCY_UPDATED', this.state.activeEmergency);
    return formatted;
  }

  // --- Real-time 1-Second Master Countdown Timer ---
  initCountdownTimer() {
    if (this.countdownInterval) clearInterval(this.countdownInterval);

    this.countdownInterval = setInterval(() => {
      this.decrementEtaSecond();
    }, 1000);
  }

  decrementEtaSecond() {
    const emg = this.state.activeEmergency;
    if (!emg || emg.status === 'ARRIVED' || emg.status === 'COMPLETED' || emg.status === 'DISCHARGED') return;

    if (emg.etaSeconds > 0) {
      emg.etaSeconds -= 1;

      if (emg.etaSeconds <= 0) {
        emg.etaSeconds = 0;
        emg.journeyStep = 6;
        emg.status = "ARRIVED";
        emg.ambulanceStatus = "ARRIVED";
      } else if (emg.etaSeconds <= 180) {
        emg.journeyStep = 5;
        emg.status = "ARRIVING";
        emg.ambulanceStatus = "ARRIVING";
      } else if (emg.etaSeconds <= 900) {
        emg.journeyStep = 4;
        emg.status = "EN ROUTE (15m ALERT ACTIVE)";
        emg.ambulanceStatus = "EN ROUTE (15m ALERT ACTIVE)";
        emg.is15mAlertTriggered = true;
      } else {
        emg.journeyStep = 3;
        emg.status = "EN ROUTE";
        emg.ambulanceStatus = "EN ROUTE";
      }

      // Interpolate GPS coordinates along Nagpur route
      const waypoints = emg.routeWaypoints || (typeof NAGPUR_DATA !== 'undefined' ? NAGPUR_DATA.demoRouteWaypoints : null);
      if (waypoints && waypoints.length >= 2 && emg.ambulance) {
        const initialEta = emg.initialEtaSeconds || 1080;
        const progress = Math.max(0, Math.min(1, 1 - (emg.etaSeconds / initialEta)));
        const totalWp = waypoints.length;
        const curIdx = Math.min(totalWp - 1, Math.floor(progress * (totalWp - 1)));
        const nextIdx = Math.min(totalWp - 1, curIdx + 1);
        const segProg = (progress * (totalWp - 1)) - curIdx;

        const wpA = waypoints[curIdx];
        const wpB = waypoints[nextIdx];
        if (wpA && wpB) {
          emg.ambulance.currentLat = wpA.lat + (wpB.lat - wpA.lat) * segProg;
          emg.ambulance.currentLng = wpA.lng + (wpB.lng - wpA.lng) * segProg;
        }
      }

      this.notify('TICK_SECOND', emg);
      this.notify('TELEMETRY_UPDATED', emg);
    }
  }

  // --- Subscriptions ---
  subscribe(event, callback) {
    if (!this.subscribers[event]) {
      this.subscribers[event] = [];
    }
    this.subscribers[event].push(callback);
    return () => {
      this.subscribers[event] = this.subscribers[event].filter(cb => cb !== callback);
    };
  }

  notify(event, payload) {
    if (this.subscribers[event]) {
      this.subscribers[event].forEach(cb => {
        try {
          cb(payload);
        } catch (err) {
          console.error(`Error in subscriber for ${event}:`, err);
        }
      });
    }
  }

  // --- Session Management ---
  async loginAsCitizen(citizenData = {}) {
    this.state.session.role = 'citizen';
    if (citizenData.name) this.state.session.citizen.name = citizenData.name;
    if (citizenData.phone) this.state.session.citizen.phone = citizenData.phone;
    if (citizenData.locality) this.state.session.citizen.locality = citizenData.locality;
    if (citizenData.bloodGroup) this.state.session.citizen.bloodGroup = citizenData.bloodGroup;
    if (citizenData.id) this.state.session.citizen.id = citizenData.id;

    this.saveState();
    this.notify('SESSION_CHANGED', this.state.session);

    if (window.medApi && citizenData.phone) {
      try {
        const res = await window.medApi.login(citizenData.phone, citizenData.password || 'citizen123', 'citizen');
        if (res && res.user) {
          this.state.session.citizen.id = res.user.id;
          this.state.session.citizen.name = res.user.name;
          this.state.session.citizen.isRegisteredDonor = res.user.isRegisteredDonor || false;
          this.saveState();
          this.notify('SESSION_CHANGED', this.state.session);
        }
      } catch (err) {
        console.warn('Backend login fallback used');
      }
    }
  }

  async loginAsHospital(hospitalId = 'NCEH001', password = 'hospital123') {
    this.state.session.role = 'hospital';
    this.state.session.activeHospitalId = hospitalId;
    this.saveState();
    this.notify('SESSION_CHANGED', this.state.session);
    this.notify('HOSPITAL_DATA_UPDATED', this.getCurrentHospitalData());

    if (window.medApi) {
      try {
        await window.medApi.login(hospitalId, password, 'hospital');
      } catch (e) {
        console.warn('Backend hospital login fallback used');
      }
    }
    return true;
  }

  async loginAsAdmin(username = 'admin', password = 'admin123') {
    try {
      if (window.medApi) {
        const res = await window.medApi.login(username, password, 'admin');
        if (res && res.success) {
          this.state.session.role = 'admin';
          this.state.session.admin = {
            id: res.user.id,
            name: res.user.name,
            username: res.user.username
          };
          this.saveState();
          this.notify('SESSION_CHANGED', this.state.session);
          await this.refreshAdminDashboard();
          return { success: true, message: `Logged in as ${res.user.name}` };
        }
      }
    } catch (err) {
      if (username === 'admin' && (password === 'admin123' || password === 'admin')) {
        this.state.session.role = 'admin';
        this.state.session.admin = { id: 'usr-admin-01', name: 'ZeroMile Platform Admin', username: 'admin' };
        this.saveState();
        this.notify('SESSION_CHANGED', this.state.session);
        return { success: true, message: 'Logged in as Platform Admin (Local Mode)' };
      }
      return { success: false, message: err.message || 'Invalid admin credentials' };
    }
  }

  async refreshAdminDashboard() {
    if (window.medApi) {
      try {
        const res = await window.medApi.getAdminDashboard();
        if (res && res.success && res.data) {
          this.state.adminData = res.data;
          this.notify('ADMIN_DATA_UPDATED', this.state.adminData);
          return res.data;
        }
      } catch (err) {
        console.warn('Backend admin refresh note: using local dataset');
      }
    }
    return this.state.adminData;
  }

  logout() {
    this.state.session.role = 'guest';
    this.state.adminData = null;
    if (window.medApi) window.medApi.logout();
    this.saveState();
    this.notify('SESSION_CHANGED', this.state.session);
  }

  getCurrentRole() {
    return this.state.session.role;
  }

  getCurrentHospitalId() {
    return this.state.session.activeHospitalId || 'NCEH001';
  }

  getCurrentHospitalData() {
    const hid = this.getCurrentHospitalId();
    return this.getHospitalById(hid);
  }

  getHospitalById(hospitalId) {
    const hid = hospitalId || 'NCEH001';
    if (this.state.hospitals && this.state.hospitals[hid]) {
      return this.state.hospitals[hid];
    }
    if (typeof NAGPUR_DATA !== 'undefined' && Array.isArray(NAGPUR_DATA.hospitals)) {
      const found = NAGPUR_DATA.hospitals.find(h => h.id === hid);
      if (found) return found;
      return NAGPUR_DATA.hospitals[0];
    }
    return {
      id: hid,
      name: "Nagpur Central Emergency Hospital",
      code: hid,
      locality: "Civil Lines, Nagpur",
      emergencyContact: "+91 712 255 1001",
      lat: 21.1552,
      lng: 79.0865,
      icuBedsTotal: 24,
      icuBedsAvailable: 6,
      normalBedsTotal: 50,
      normalBedsAvailable: 18,
      ventilatorsTotal: 18,
      ventilatorsAvailable: 5,
      traumaUnitsTotal: 6,
      traumaUnitsAvailable: 3,
      inboundQueue: []
    };
  }

  // --- Hospital Bed & Resource Inventory Management ---
  async updateHospitalInventory(hospitalId, inventoryData) {
    const hid = hospitalId || this.getCurrentHospitalId();

    if (window.medApi) {
      try {
        const res = await window.medApi.updateHospitalInventory(hid, inventoryData);
        if (res && res.success && res.hospital) {
          this.state.hospitals[hid] = res.hospital;
          this.saveState();
          this.notify('HOSPITAL_DATA_UPDATED', res.hospital);
          return res;
        }
      } catch (err) {
        console.warn('Inventory API fallback locally:', err);
      }
    }

    // Local fallback
    const hosp = this.getHospitalById(hid);
    if (hosp) {
      Object.assign(hosp, inventoryData);
      this.saveState();
      this.notify('HOSPITAL_DATA_UPDATED', hosp);
    }
    return { success: true, hospital: hosp };
  }

  // --- Patient Discharge with Doctor Feedback & Seat Release (+1 Bed) ---
  async dischargePatientWithFeedback(hospitalId, requestId, feedbackText, outcomeText = "Fully Recovered & Discharged") {
    const hid = hospitalId || this.getCurrentHospitalId();

    if (window.medApi) {
      try {
        const res = await window.medApi.dischargePatient(hid, requestId, feedbackText, outcomeText);
        if (res && res.success) {
          if (res.hospital) this.state.hospitals[hid] = res.hospital;
          if (this.state.activeEmergency && this.state.activeEmergency.id === requestId) {
            this.state.activeEmergency.status = 'DISCHARGED';
            this.state.activeEmergency.doctorFeedback = feedbackText;
            this.state.activeEmergency.outcome = outcomeText;
            this.state.activeEmergency.dischargedAt = new Date().toISOString();
          }
          this.saveState();
          this.notify('PATIENT_DISCHARGED', res);
          this.notify('HOSPITAL_DATA_UPDATED', res.hospital);
          this.notify('EMERGENCY_UPDATED', this.state.activeEmergency);
          return res;
        }
      } catch (err) {
        console.warn('Discharge API fallback locally:', err);
      }
    }

    // Local fallback
    const hosp = this.getHospitalById(hid);
    if (hosp) {
      if (hosp.icuBedsAvailable < hosp.icuBedsTotal) hosp.icuBedsAvailable += 1;
      else if (hosp.normalBedsAvailable < hosp.normalBedsTotal) hosp.normalBedsAvailable += 1;

      if (hosp.inboundQueue) {
        const qItem = hosp.inboundQueue.find(p => p.id === requestId);
        if (qItem) {
          qItem.status = 'DISCHARGED';
          qItem.bedStatus = `✓ Treatment Completed • ${outcomeText}`;
          qItem.doctorFeedback = feedbackText;
        }
      }
    }

    if (this.state.activeEmergency && this.state.activeEmergency.id === requestId) {
      this.state.activeEmergency.status = 'DISCHARGED';
      this.state.activeEmergency.doctorFeedback = feedbackText;
      this.state.activeEmergency.outcome = outcomeText;
      this.state.activeEmergency.dischargedAt = new Date().toISOString();
    }

    this.saveState();
    this.notify('PATIENT_DISCHARGED', { hospital: hosp, emergency: this.state.activeEmergency, feedback: feedbackText, outcome: outcomeText });
    this.notify('HOSPITAL_DATA_UPDATED', hosp);
    this.notify('EMERGENCY_UPDATED', this.state.activeEmergency);
    return { success: true, hospital: hosp };
  }

  // --- Mark Patient Admitted ---
  async admitPatient(hospitalId, requestId) {
    const hid = hospitalId || this.getCurrentHospitalId();

    if (window.medApi) {
      try {
        const res = await window.medApi.admitPatient(hid, requestId);
        if (res && res.success) {
          if (res.hospital) this.state.hospitals[hid] = res.hospital;
          this.saveState();
          this.notify('HOSPITAL_DATA_UPDATED', res.hospital);
          return res;
        }
      } catch (err) {
        console.warn('Admit API fallback locally:', err);
      }
    }

    const hosp = this.getHospitalById(hid);
    if (hosp && hosp.inboundQueue) {
      const qItem = hosp.inboundQueue.find(p => p.id === requestId);
      if (qItem) {
        qItem.status = 'ADMITTED';
        qItem.bedStatus = '✓ Admitted & In Emergency Care';
      }
    }
    this.saveState();
    this.notify('HOSPITAL_DATA_UPDATED', hosp);
    return { success: true, hospital: hosp };
  }

  // --- Smart Hospital Recommendation Engine ---
  evaluateHospitalsForCondition(conditionName, severity = 'CRITICAL', pickupLocality = 'Dharampeth') {
    const rules = (typeof NAGPUR_DATA !== 'undefined' && NAGPUR_DATA.conditionRules && NAGPUR_DATA.conditionRules[conditionName])
      ? NAGPUR_DATA.conditionRules[conditionName]
      : { name: conditionName, requiredResources: ["ICU", "Emergency Team", "Trauma Unit"] };

    const requiredList = rules.requiredResources || [];
    const results = [];
    const hospitalEntries = Object.values(this.state.hospitals);

    hospitalEntries.forEach(hosp => {
      let matchScore = 100;
      let reasons = [];
      let isRecommended = true;

      let etaMin = 11;
      if (hosp.id === 'NCEH001') etaMin = 11;
      else if (hosp.id === 'OCMC002') etaMin = 14;
      else if (hosp.id === 'CIEC003') etaMin = 18;

      const hasIcu = hosp.icuBedsAvailable > 0;
      if (!hasIcu) {
        matchScore -= 35;
        reasons.push("No ICU beds available");
        isRecommended = false;
      }

      const needsTrauma = requiredList.includes("Trauma Unit");
      const hasTrauma = hosp.traumaUnitsAvailable > 0;
      if (needsTrauma && !hasTrauma) {
        matchScore -= 45;
        reasons.push("Trauma Unit unavailable");
        isRecommended = false;
      }

      const needsVent = requiredList.includes("Ventilator");
      const ventAvailable = hosp.ventilatorsAvailable;
      if (needsVent) {
        if (ventAvailable === 0) {
          matchScore -= 30;
          reasons.push("No ventilators available");
        } else if (ventAvailable <= 1) {
          matchScore -= 12;
        }
      }

      const teamReady = !hosp.emergencyTeamStatus.includes("Delayed");
      if (!teamReady) {
        matchScore -= 20;
        reasons.push("Emergency team delayed / occupied");
      }

      if (etaMin > 15) matchScore -= 8;
      matchScore = Math.max(35, Math.min(99, matchScore));

      if (conditionName === "Accident / Trauma") {
        if (hosp.id === 'NCEH001') matchScore = 96;
        else if (hosp.id === 'OCMC002') matchScore = 78;
        else if (hosp.id === 'CIEC003') {
          matchScore = 51;
          isRecommended = false;
        }
      }

      results.push({
        hospitalId: hosp.id,
        name: hosp.name,
        code: hosp.code,
        locality: hosp.locality,
        matchScore: matchScore,
        isRecommended: isRecommended && matchScore >= 60,
        etaMinutes: etaMin,
        icuAvailable: hosp.icuBedsAvailable,
        icuStatus: hosp.icuBedsAvailable > 2 ? 'green' : (hosp.icuBedsAvailable > 0 ? 'amber' : 'red'),
        traumaAvailable: hosp.traumaUnitsAvailable > 0 ? 'Available' : 'Unavailable',
        traumaStatus: hosp.traumaUnitsAvailable > 0 ? 'green' : 'red',
        ventilatorAvailable: hosp.ventilatorsAvailable > 1 ? `${hosp.ventilatorsAvailable} available` : (hosp.ventilatorsAvailable === 1 ? 'Limited (1 avail)' : 'None'),
        ventilatorStatus: hosp.ventilatorsAvailable > 1 ? 'green' : (hosp.ventilatorsAvailable === 1 ? 'amber' : 'red'),
        emergencyTeamAvailable: teamReady ? 'Available' : 'Occupied',
        emergencyTeamStatus: teamReady ? 'green' : 'amber',
        reasons: reasons
      });
    });

    results.sort((a, b) => b.matchScore - a.matchScore);

    return {
      condition: rules,
      hospitals: results
    };
  }

  // --- Dispatch Emergency Ambulance with Selected Hospital ---
  async bookAmbulanceWithHospital(hospitalId, requestDetails = {}) {
    const targetHosp = this.getHospitalById(hospitalId);
    const conditionName = requestDetails.condition || "Accident / Trauma";

    const emergencyPayload = {
      patientName: requestDetails.patientName || this.state.session.citizen.name || "Emergency Patient",
      age: parseInt(requestDetails.age) || 35,
      gender: requestDetails.gender || "Male",
      condition: conditionName,
      severity: requestDetails.severity || "CRITICAL",
      locality: requestDetails.locality || "Dharampeth, Nagpur",
      hospitalId: targetHosp.id,
      bloodGroup: requestDetails.bloodGroup || this.state.session.citizen.bloodGroup || "O+"
    };

    const pCoords = (typeof NAGPUR_DATA !== 'undefined' && NAGPUR_DATA.getLocalityCoordinates)
      ? NAGPUR_DATA.getLocalityCoordinates(emergencyPayload.locality)
      : { lat: 21.1432, lng: 79.0621, name: "Dharampeth" };

    const hCoords = (typeof NAGPUR_DATA !== 'undefined' && NAGPUR_DATA.getHospitalCoordinates)
      ? NAGPUR_DATA.getHospitalCoordinates(targetHosp.id)
      : { lat: targetHosp.lat || 21.1552, lng: targetHosp.lng || 79.0865, name: targetHosp.name };

    const waypoints = (typeof NAGPUR_DATA !== 'undefined' && NAGPUR_DATA.generateRouteWaypoints)
      ? NAGPUR_DATA.generateRouteWaypoints(pCoords, hCoords)
      : [
          { lat: pCoords.lat, lng: pCoords.lng, name: `Pickup: ${pCoords.name}` },
          { lat: pCoords.lat + (hCoords.lat - pCoords.lat) * 0.5, lng: pCoords.lng + (hCoords.lng - pCoords.lng) * 0.5, name: "Corridor Junction" },
          { lat: hCoords.lat, lng: hCoords.lng, name: `Destination: ${hCoords.name}` }
        ];

    let serverEmergency = null;
    if (window.medApi) {
      try {
        const res = await window.medApi.requestAmbulance(emergencyPayload);
        if (res && res.success && res.emergency) {
          serverEmergency = res.emergency;
        }
      } catch (err) {
        console.warn('Backend request note: dispatching via local store engine');
      }
    }

    if (serverEmergency) {
      return this.formatAndSetActiveEmergency(serverEmergency);
    }

    // Local instant creation
    const localEmg = {
      id: `EMG-NAG-${Math.floor(1000 + Math.random() * 9000)}`,
      patient: {
        name: emergencyPayload.patientName,
        age: emergencyPayload.age,
        condition: conditionName,
        severity: emergencyPayload.severity,
        bloodGroup: emergencyPayload.bloodGroup,
        vitals: { heartRate: 114, bp: "142/92", spO2: 93, respRate: 24, ecgRhythm: "Sinus Tachycardia", tempF: 98.4 }
      },
      ambulance: {
        code: `ZM-${Math.floor(1000 + Math.random() * 9000)}`,
        type: "Advanced Life Support (ALS) Ambulance",
        driver: "Amit Sharma",
        driverRating: 4.9,
        driverPhone: "+91 98221 44550",
        paramedic: "Dr. Neha Verma (ER Specialist)",
        plateNumber: "MH 31 EQ 4088",
        currentSpeedKmh: 62,
        currentLat: waypoints[1].lat,
        currentLng: waypoints[1].lng
      },
      pickup: { name: emergencyPayload.locality, lat: pCoords.lat, lng: pCoords.lng },
      destinationHospitalId: targetHosp.id,
      hospital: {
        id: targetHosp.id,
        name: targetHosp.name,
        code: targetHosp.code,
        locality: targetHosp.locality,
        contact: targetHosp.emergencyContact,
        lat: hCoords.lat,
        lng: hCoords.lng
      },
      routeWaypoints: waypoints,
      etaSeconds: 892,
      initialEtaSeconds: 1080,
      journeyStep: 4,
      status: "EN ROUTE",
      ambulanceStatus: "EN ROUTE",
      is15mAlertTriggered: true,
      is15mAlertAccepted: false,
      acceptedTimestamp: null
    };

    this.state.activeEmergency = localEmg;

    // Add to hospital inbound queue & decrement bed
    if (this.state.hospitals[targetHosp.id]) {
      if (this.state.hospitals[targetHosp.id].icuBedsAvailable > 0) {
        this.state.hospitals[targetHosp.id].icuBedsAvailable -= 1;
      }
      this.state.hospitals[targetHosp.id].inboundQueue.unshift({
        id: localEmg.id,
        patientName: localEmg.patient.name,
        age: localEmg.patient.age,
        condition: conditionName,
        severity: localEmg.patient.severity,
        ambulanceCode: localEmg.ambulance.code,
        etaMinutes: 14,
        etaSeconds: 892,
        assignedDoctor: "Dr. S. Deshmukh",
        bedStatus: "ICU / Trauma Unit Reserved",
        isAlert15m: true,
        accepted: false,
        status: 'INCOMING'
      });
    }

    this.saveState();
    this.notify('EMERGENCY_UPDATED', this.state.activeEmergency);
    this.notify('HOSPITAL_DATA_UPDATED', targetHosp);
    return this.state.activeEmergency;
  }

  // --- Hospital Portal: Accept & Prepare ---
  async acceptAndPrepare15mAlert(hospitalId = null) {
    const hid = hospitalId || this.getCurrentHospitalId();
    const hosp = this.getHospitalById(hid);
    if (!hosp) return null;

    const acceptedTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    if (window.medApi) {
      try {
        const res = await window.medApi.acceptHospitalAlert(hid);
        if (res && res.success) {
          if (res.hospital) this.state.hospitals[hid] = res.hospital;
          if (res.activeEmergency && this.state.activeEmergency) {
            this.state.activeEmergency.is15mAlertAccepted = true;
            this.state.activeEmergency.acceptedTimestamp = res.activeEmergency.acceptedTimestamp || acceptedTimeStr;
          }
        }
      } catch (err) {
        console.warn('Backend alert notice: accepted locally');
      }
    }

    if (hosp.icuBedsAvailable > 0) hosp.icuBedsAvailable -= 1;
    if (hosp.ventilatorsAvailable > 0) hosp.ventilatorsAvailable -= 1;
    if (hosp.traumaUnitsAvailable > 0) hosp.traumaUnitsAvailable -= 1;

    if (hosp.inboundQueue && Array.isArray(hosp.inboundQueue)) {
      hosp.inboundQueue.forEach(p => {
        p.accepted = true;
        p.bedStatus = '✓ ICU Bed & Trauma Bay Locked';
      });
    }

    if (this.state.activeEmergency) {
      this.state.activeEmergency.is15mAlertAccepted = true;
      this.state.activeEmergency.acceptedTimestamp = acceptedTimeStr;
    }

    this.saveState();
    this.notify('ALERT_15M_ACCEPTED', hosp);
    this.notify('HOSPITAL_DATA_UPDATED', hosp);
    this.notify('EMERGENCY_UPDATED', this.state.activeEmergency);
    return hosp;
  }

  // --- Register Blood Donor ---
  async registerCitizenDonor(donorData) {
    let savedDonor = null;

    if (window.medApi) {
      try {
        const res = await window.medApi.registerDonor({
          name: donorData.name || this.state.session.citizen.name,
          phone: donorData.phone || this.state.session.citizen.phone,
          bloodGroup: donorData.bloodGroup || "O+",
          locality: donorData.locality || "Dharampeth, Nagpur",
          previousDonations: parseInt(donorData.previousDonations) || 0
        });
        if (res && res.success && res.donor) {
          savedDonor = res.donor;
        }
      } catch (err) {
        console.warn('Backend donor notice: registered locally');
      }
    }

    if (!savedDonor) {
      savedDonor = {
        id: `donor-${Date.now()}`,
        name: donorData.name || this.state.session.citizen.name,
        phone: donorData.phone || this.state.session.citizen.phone || "+91 98220 00000",
        bloodGroup: donorData.bloodGroup || "O+",
        locality: donorData.locality || "Dharampeth, Nagpur",
        lat: 21.1440,
        lng: 79.0630,
        distanceKm: 2.5,
        status: "Available",
        lastDonated: "New Registered Donor",
        donationsCount: parseInt(donorData.previousDonations) || 0,
        verified: true,
        registeredAt: new Date().toISOString()
      };
    }

    this.state.registeredDonors.unshift(savedDonor);
    this.state.session.citizen.isRegisteredDonor = true;
    this.saveState();
    this.notify('DONOR_REGISTERED', savedDonor);
    this.notify('DONORS_UPDATED', this.state.registeredDonors);
    return savedDonor;
  }

  async contactDonor(donorId, patientDetails = {}) {
    if (window.medApi) {
      try {
        await window.medApi.contactDonor(donorId, patientDetails);
      } catch (err) {
        console.warn('Backend contact notice: logged locally');
      }
    }

    this.state.contactedDonors[donorId] = {
      timestamp: new Date().toISOString(),
      status: "Dispatched via SMS & WhatsApp"
    };
    this.saveState();
    this.notify('DONOR_CONTACTED', { donorId });
  }

  async createBloodRequest(requestData) {
    let newReq = null;
    if (window.medApi) {
      try {
        const res = await window.medApi.createBloodRequest(requestData);
        if (res && res.success && res.bloodRequest) {
          newReq = res.bloodRequest;
        }
      } catch (err) {
        console.warn('Backend blood notice: created locally');
      }
    }

    if (!newReq) {
      newReq = {
        id: `BLD-REQ-${Math.floor(100 + Math.random() * 900)}`,
        patientName: requestData.patientName,
        bloodGroup: requestData.bloodGroup,
        unitsRequired: parseInt(requestData.unitsRequired) || 2,
        urgency: requestData.urgency || "CRITICAL",
        hospital: requestData.hospital || "Nagpur Central Emergency Hospital",
        locality: requestData.locality || "Nagpur",
        requestedAt: "Just now",
        status: "Searching Donors",
        matchedDonorsCount: 3
      };
    }

    this.state.bloodRequests.unshift(newReq);
    this.saveState();
    this.notify('BLOOD_REQUEST_CREATED', newReq);
    return newReq;
  }

  // Reject & Divert Inbound Emergency to another Nagpur Hospital
  async rejectAndDivertPatient(hospitalId, requestId, targetHospitalId, reason) {
    if (window.medApi) {
      try {
        const res = await window.medApi.rejectPatient(hospitalId, requestId, targetHospitalId, reason);
        if (res && res.success) {
          if (res.currentHospital) this.state.hospitals[hospitalId] = res.currentHospital;
          if (res.targetHospital) this.state.hospitals[targetHospitalId] = res.targetHospital;
          if (res.emergency) this.formatAndSetActiveEmergency(res.emergency);
          this.saveState();
          this.notify('PATIENT_DIVERTED', res);
          this.notify('HOSPITAL_DATA_UPDATED', this.getCurrentHospitalData());
          return res;
        }
      } catch (err) {
        console.warn('Backend divert note: offline handling');
      }
    }

    // Local fallback
    const curHosp = this.getHospitalById(hospitalId);
    const targetHosp = this.getHospitalById(targetHospitalId);
    if (curHosp && curHosp.inboundQueue) {
      const idx = curHosp.inboundQueue.findIndex(p => p.id === requestId);
      if (idx !== -1) {
        const removed = curHosp.inboundQueue.splice(idx, 1)[0];
        if (targetHosp) {
          if (!targetHosp.inboundQueue) targetHosp.inboundQueue = [];
          targetHosp.inboundQueue.push({
            ...removed,
            bedStatus: `Diverted from ${curHosp.name} • ${reason}`,
            accepted: false
          });
        }
      }
    }
    this.saveState();
    this.notify('HOSPITAL_DATA_UPDATED', this.getCurrentHospitalData());
    return { success: true };
  }

  // Save Hospital Operational Settings (Surge mode, Head Doctor, Contacts, Beds)
  async saveHospitalSettings(hospitalId, settings) {
    if (window.medApi) {
      try {
        const res = await window.medApi.updateHospitalSettings(hospitalId, settings);
        if (res && res.success && res.hospital) {
          this.state.hospitals[hospitalId] = res.hospital;
          this.saveState();
          this.notify('HOSPITAL_SETTINGS_UPDATED', res.hospital);
          this.notify('HOSPITAL_DATA_UPDATED', this.getCurrentHospitalData());
          return res;
        }
      } catch (err) {
        console.warn('Backend settings note: offline handling');
      }
    }

    const hosp = this.getHospitalById(hospitalId);
    if (hosp) {
      Object.assign(hosp, settings);
      this.saveState();
      this.notify('HOSPITAL_DATA_UPDATED', hosp);
    }
    return { success: true, hospital: hosp };
  }

  getActiveEmergency() {
    return this.state.activeEmergency;
  }

  getBloodRequests() {
    return this.state.bloodRequests;
  }
}

// Global state instance
window.medStore = new MedConnectStore();
