const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial seed data
function getSeedData() {
  const salt = bcrypt.genSaltSync(10);
  const adminPasswordHash = bcrypt.hashSync('admin123', salt);
  const hospitalPasswordHash = bcrypt.hashSync('hospital123', salt);

  return {
    users: [
      {
        id: 'usr-admin-01',
        name: 'ZeroMile Platform Admin',
        username: 'admin',
        email: 'admin@zeromile.in',
        phone: '+91 712 255 0000',
        passwordHash: adminPasswordHash,
        role: 'admin',
        locality: 'Zero Mile, Nagpur',
        createdAt: new Date().toISOString(),
        lastLogin: null
      },
      {
        id: 'usr-hosp-01',
        name: 'Nagpur Central Emergency Hospital Staff',
        username: 'NCEH001',
        email: 'emergency@nceh-nagpur.gov.in',
        phone: '+91 712 255 1001',
        passwordHash: hospitalPasswordHash,
        role: 'hospital',
        hospitalId: 'NCEH001',
        locality: 'Civil Lines, Nagpur',
        createdAt: new Date().toISOString(),
        lastLogin: null
      },
      {
        id: 'usr-hosp-02',
        name: 'Orange City Medical Center Staff',
        username: 'OCMC002',
        email: 'er@orangecitymed.in',
        phone: '+91 712 228 3200',
        passwordHash: hospitalPasswordHash,
        role: 'hospital',
        hospitalId: 'OCMC002',
        locality: 'Khamla, Nagpur',
        createdAt: new Date().toISOString(),
        lastLogin: null
      },
      {
        id: 'usr-hosp-03',
        name: 'Central India Emergency Care Staff',
        username: 'CIEC003',
        email: 'admin@ciec-nagpur.in',
        phone: '+91 712 298 0501',
        passwordHash: hospitalPasswordHash,
        role: 'hospital',
        hospitalId: 'CIEC003',
        locality: 'Wardha Road, Nagpur',
        createdAt: new Date().toISOString(),
        lastLogin: null
      }
    ],

    bloodDonors: [
      {
        id: 'donor-101',
        userId: null,
        name: 'Dr. Alok Verma',
        phone: '+91 98220 11223',
        bloodGroup: 'O+',
        locality: 'Dharampeth',
        lat: 21.1440,
        lng: 79.0630,
        distanceKm: 2.1,
        donationsCount: 8,
        lastDonated: '45 days ago',
        status: 'Available',
        verified: true,
        registeredAt: new Date(Date.now() - 30 * 86400000).toISOString()
      },
      {
        id: 'donor-102',
        userId: null,
        name: 'Pooja Deshmukh',
        phone: '+91 94221 55667',
        bloodGroup: 'B+',
        locality: 'Ramdaspeth',
        lat: 21.1390,
        lng: 79.0720,
        distanceKm: 3.4,
        donationsCount: 4,
        lastDonated: '60 days ago',
        status: 'Available',
        verified: true,
        registeredAt: new Date(Date.now() - 20 * 86400000).toISOString()
      },
      {
        id: 'donor-103',
        userId: null,
        name: 'Gaurav Kulkarni',
        phone: '+91 97654 88990',
        bloodGroup: 'O-',
        locality: 'Sitabuldi',
        lat: 21.1480,
        lng: 79.0820,
        distanceKm: 1.8,
        donationsCount: 12,
        lastDonated: '90 days ago',
        status: 'Available',
        verified: true,
        registeredAt: new Date(Date.now() - 15 * 86400000).toISOString()
      },
      {
        id: 'donor-104',
        userId: null,
        name: 'Sneha Patil',
        phone: '+91 98901 22334',
        bloodGroup: 'A+',
        locality: 'Dhantoli',
        lat: 21.1350,
        lng: 79.0800,
        distanceKm: 2.9,
        donationsCount: 3,
        lastDonated: '30 days ago',
        status: 'Available',
        verified: true,
        registeredAt: new Date(Date.now() - 10 * 86400000).toISOString()
      },
      {
        id: 'donor-105',
        userId: null,
        name: 'Nikhil Meshram',
        phone: '+91 94032 66778',
        bloodGroup: 'AB+',
        locality: 'Civil Lines',
        lat: 21.1550,
        lng: 79.0750,
        distanceKm: 1.2,
        donationsCount: 5,
        lastDonated: '50 days ago',
        status: 'Available',
        verified: true,
        registeredAt: new Date(Date.now() - 5 * 86400000).toISOString()
      }
    ],

    ambulanceRequests: [],

    bloodRequests: [
      {
        id: 'BLD-REQ-401',
        patientName: 'Emergency Standby Reserve',
        bloodGroup: 'B+',
        unitsRequired: 2,
        urgency: 'CRITICAL',
        hospital: 'Nagpur Central Emergency Hospital',
        requestedAt: new Date(Date.now() - 15 * 60000).toISOString(),
        status: 'Donors Matched',
        matchedDonorsCount: 3
      },
      {
        id: 'BLD-REQ-398',
        patientName: 'ICU Trauma Patient #02',
        bloodGroup: 'O+',
        unitsRequired: 3,
        urgency: 'URGENT',
        hospital: 'Orange City Medical Center',
        requestedAt: new Date(Date.now() - 45 * 60000).toISOString(),
        status: 'Donors Contacted',
        matchedDonorsCount: 4
      }
    ],

    contactDispatches: [],

    loginLogs: [
      {
        id: 'log-seed-01',
        userId: 'usr-admin-01',
        userName: 'admin',
        name: 'ZeroMile Platform Admin',
        role: 'admin',
        ip: '127.0.0.1',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        status: 'SUCCESS'
      }
    ],

    hospitals: {
      NCEH001: {
        id: 'NCEH001',
        name: 'Nagpur Central Emergency Hospital',
        code: 'NCEH001',
        locality: 'Civil Lines / Central Nagpur',
        emergencyContact: '+91 712 255 1001',
        icuBedsTotal: 24,
        icuBedsAvailable: 4,
        ventilatorsTotal: 18,
        ventilatorsAvailable: 3,
        traumaUnitsTotal: 6,
        traumaUnitsAvailable: 2,
        emergencyTeamStatus: 'Available (Team Alpha Ready)',
        bloodReservePercentage: 94,
        inboundQueue: []
      },
      OCMC002: {
        id: 'OCMC002',
        name: 'Orange City Medical Center',
        code: 'OCMC002',
        locality: 'Khamla / Ring Road',
        emergencyContact: '+91 712 228 3200',
        icuBedsTotal: 20,
        icuBedsAvailable: 2,
        ventilatorsTotal: 15,
        ventilatorsAvailable: 1,
        traumaUnitsTotal: 4,
        traumaUnitsAvailable: 1,
        emergencyTeamStatus: 'Available (Team Beta Standing By)',
        bloodReservePercentage: 88,
        inboundQueue: []
      },
      CIEC003: {
        id: 'CIEC003',
        name: 'Central India Emergency Care',
        code: 'CIEC003',
        locality: 'Wardha Road / MIHAN Corridor',
        emergencyContact: '+91 712 298 0501',
        icuBedsTotal: 16,
        icuBedsAvailable: 3,
        ventilatorsTotal: 12,
        ventilatorsAvailable: 2,
        traumaUnitsTotal: 4,
        traumaUnitsAvailable: 0,
        emergencyTeamStatus: 'Delayed (Handling Mass Casualty)',
        bloodReservePercentage: 75,
        inboundQueue: []
      }
    }
  };
}

class Database {
  constructor() {
    this.data = null;
    this.init();
  }

  init() {
    if (!fs.existsSync(DB_FILE)) {
      this.data = getSeedData();
      this.save();
    } else {
      try {
        const content = fs.readFileSync(DB_FILE, 'utf8');
        this.data = JSON.parse(content);
        // Ensure all collections exist
        const seed = getSeedData();
        for (const key of Object.keys(seed)) {
          if (!this.data[key]) {
            this.data[key] = seed[key];
          }
        }
      } catch (err) {
        console.error('Error reading database file, reinitializing:', err);
        this.data = getSeedData();
        this.save();
      }
    }
  }

  save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (err) {
      console.error('Error writing database file:', err);
    }
  }

  // --- Users & Auth ---
  findUserByUsername(username) {
    if (!username) return null;
    return this.data.users.find(u => u.username.toLowerCase() === username.toLowerCase() || (u.email && u.email.toLowerCase() === username.toLowerCase()) || (u.phone && u.phone === username));
  }

  findUserById(id) {
    return this.data.users.find(u => u.id === id);
  }

  createUser(userData) {
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = userData.password ? bcrypt.hashSync(userData.password, salt) : null;

    const user = {
      id: `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: userData.name,
      username: userData.username || userData.phone || userData.email,
      email: userData.email || '',
      phone: userData.phone,
      passwordHash: passwordHash,
      role: userData.role || 'citizen',
      bloodGroup: userData.bloodGroup || 'O+',
      locality: userData.locality || 'Dharampeth, Nagpur',
      isRegisteredDonor: userData.isRegisteredDonor || false,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };

    this.data.users.unshift(user);
    this.save();
    return user;
  }

  updateUser(id, updates) {
    const user = this.findUserById(id);
    if (!user) return null;
    Object.assign(user, updates);
    this.save();
    return user;
  }

  getAllUsers() {
    return this.data.users.map(({ passwordHash, ...safeUser }) => safeUser);
  }

  // --- Blood Donors ---
  getBloodDonors(maskForPublic = true) {
    return this.data.bloodDonors.map(donor => {
      if (maskForPublic) {
        return {
          ...donor,
          phone: donor.phone ? donor.phone.replace(/(\+\d{2}\s\d{5})\s(\d{5})/, '$1 •••••') : '+91 98220 •••••'
        };
      }
      return donor;
    });
  }

  addBloodDonor(donorData) {
    const donor = {
      id: `donor-${Date.now()}`,
      userId: donorData.userId || null,
      name: donorData.name,
      phone: donorData.phone,
      bloodGroup: donorData.bloodGroup,
      locality: donorData.locality,
      lat: donorData.lat || 21.1450,
      lng: donorData.lng || 79.0700,
      distanceKm: donorData.distanceKm || +(1.5 + Math.random() * 4).toFixed(1),
      donationsCount: parseInt(donorData.donationsCount || donorData.previousDonations) || 0,
      lastDonated: donorData.lastDonated || 'Never (New Registered Donor)',
      status: 'Available',
      verified: true,
      registeredAt: new Date().toISOString()
    };

    this.data.bloodDonors.unshift(donor);

    // If linked to a user, update user donor flag
    if (donorData.userId) {
      const user = this.findUserById(donorData.userId);
      if (user) {
        user.isRegisteredDonor = true;
      }
    }

    this.save();
    return donor;
  }

  // --- Ambulance & Emergency Requests ---
  getAmbulanceRequests() {
    return this.data.ambulanceRequests;
  }

  getAmbulanceRequestById(id) {
    return this.data.ambulanceRequests.find(req => req.id === id);
  }

  getActiveAmbulanceRequest(userId = null) {
    if (userId) {
      return this.data.ambulanceRequests.find(req => req.userId === userId && req.status !== 'ARRIVED' && req.status !== 'COMPLETED') || null;
    }
    return this.data.ambulanceRequests.find(req => req.status !== 'ARRIVED' && req.status !== 'COMPLETED') || null;
  }

  createAmbulanceRequest(requestData) {
    const requestId = `EMG-NAG-${Math.floor(1000 + Math.random() * 9000)}`;
    const hosp = this.data.hospitals[requestData.hospitalId] || this.data.hospitals['NCEH001'];

    const request = {
      id: requestId,
      userId: requestData.userId || null,
      patientName: requestData.patientName || 'Emergency Patient',
      age: parseInt(requestData.age) || 40,
      gender: requestData.gender || 'Unknown',
      condition: requestData.condition || 'Accident / Trauma',
      severity: requestData.severity || 'CRITICAL',
      bloodGroup: requestData.bloodGroup || 'O+',
      locality: requestData.locality || 'Dharampeth, Nagpur',
      hospitalId: hosp.id,
      hospitalName: hosp.name,
      hospitalLocality: hosp.locality,
      hospitalContact: hosp.emergencyContact,
      ambulanceCode: requestData.ambulanceCode || `ZM-${Math.floor(1000 + Math.random() * 9000)}`,
      ambulanceType: requestData.ambulanceType || 'Advanced Life Support (ALS) Ambulance',
      driverName: 'Amit Sharma',
      driverPhone: '+91 98221 44550',
      driverRating: 4.9,
      paramedic: 'Dr. Neha Verma (ER Specialist)',
      etaMinutes: 14,
      etaSeconds: 892,
      initialEtaSeconds: 1080,
      status: 'EN ROUTE',
      journeyStep: 4, // Hospital alert active
      is15mAlertTriggered: true,
      is15mAlertAccepted: false,
      acceptedTimestamp: null,
      vitals: requestData.vitals || {
        heartRate: 114,
        bp: '142/92',
        spO2: 93,
        respRate: 24,
        ecgRhythm: 'Sinus Tachycardia',
        tempF: 98.4
      },
      createdAt: new Date().toISOString()
    };

    this.data.ambulanceRequests.unshift(request);

    // Add to hospital inbound queue
    if (hosp) {
      hosp.inboundQueue.unshift({
        id: request.id,
        patientName: request.patientName,
        age: request.age,
        condition: request.condition,
        severity: request.severity,
        ambulanceCode: request.ambulanceCode,
        etaMinutes: request.etaMinutes,
        etaSeconds: request.etaSeconds,
        assignedDoctor: 'Dr. S. Deshmukh',
        bedStatus: 'ICU / Trauma Unit Reserved',
        isAlert15m: true,
        accepted: false
      });
    }

    this.save();
    return request;
  }

  updateAmbulanceStatus(id, updates) {
    const req = this.getAmbulanceRequestById(id);
    if (!req) return null;
    Object.assign(req, updates);

    // Update in hospital queue as well
    const hosp = this.data.hospitals[req.hospitalId];
    if (hosp) {
      const qItem = hosp.inboundQueue.find(p => p.id === id);
      if (qItem) {
        if (updates.etaSeconds !== undefined) {
          qItem.etaSeconds = updates.etaSeconds;
          qItem.etaMinutes = Math.ceil(updates.etaSeconds / 60);
        }
        if (updates.is15mAlertAccepted !== undefined) {
          qItem.accepted = updates.is15mAlertAccepted;
          qItem.bedStatus = '✓ ICU-04 & Trauma Bay Locked';
        }
        if (updates.status === 'ARRIVED') {
          qItem.bedStatus = '✓ Patient Arrived at Emergency Bay';
        }
      }
    }

    this.save();
    return req;
  }

  // --- Blood Requests ---
  getBloodRequests() {
    return this.data.bloodRequests;
  }

  createBloodRequest(data) {
    const req = {
      id: `BLD-REQ-${Math.floor(100 + Math.random() * 900)}`,
      patientName: data.patientName,
      bloodGroup: data.bloodGroup,
      unitsRequired: parseInt(data.unitsRequired) || 2,
      urgency: data.urgency || 'CRITICAL',
      hospital: data.hospital || 'Nagpur Central Emergency Hospital',
      locality: data.locality || 'Nagpur',
      status: 'Matching Donors',
      matchedDonorsCount: 3,
      requestedAt: new Date().toISOString()
    };
    this.data.bloodRequests.unshift(req);
    this.save();
    return req;
  }

  // --- Contact Dispatches ---
  addContactDispatch(data) {
    const dispatch = {
      id: `disp-${Date.now()}`,
      donorId: data.donorId,
      donorName: data.donorName || 'Registered Donor',
      donorPhone: data.donorPhone || '',
      patientName: data.patientName || 'Emergency Patient',
      bloodGroup: data.bloodGroup || 'O+',
      locality: data.locality || 'Nagpur',
      message: data.message || 'Urgent blood requirement matching your group in Nagpur.',
      timestamp: new Date().toISOString(),
      status: 'SENT'
    };
    this.data.contactDispatches.unshift(dispatch);
    this.save();
    return dispatch;
  }

  getContactDispatches() {
    return this.data.contactDispatches;
  }

  // --- Login & Activity Logs ---
  addLoginLog(logData) {
    const log = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId: logData.userId || null,
      userName: logData.userName || 'Anonymous',
      name: logData.name || logData.userName,
      role: logData.role || 'citizen',
      ip: logData.ip || '127.0.0.1',
      userAgent: logData.userAgent || '',
      timestamp: new Date().toISOString(),
      status: logData.status || 'SUCCESS'
    };
    this.data.loginLogs.unshift(log);
    // Keep max 200 logs
    if (this.data.loginLogs.length > 200) {
      this.data.loginLogs = this.data.loginLogs.slice(0, 200);
    }
    this.save();
    return log;
  }

  getLoginLogs() {
    return this.data.loginLogs;
  }

  // --- Hospitals ---
  getHospitals() {
    return this.data.hospitals;
  }

  getHospitalById(id) {
    return this.data.hospitals[id] || null;
  }

  updateHospitalResources(id, updates) {
    const hosp = this.getHospitalById(id);
    if (!hosp) return null;
    Object.assign(hosp, updates);
    this.save();
    return hosp;
  }

  // --- Admin Comprehensive Overview ---
  getAdminDashboardData() {
    return {
      stats: {
        totalUsers: this.data.users.length,
        totalDonors: this.data.bloodDonors.length,
        totalAmbulanceRequests: this.data.ambulanceRequests.length,
        totalBloodRequests: this.data.bloodRequests.length,
        totalDispatches: this.data.contactDispatches.length,
        totalLoginEvents: this.data.loginLogs.length,
        activeEmergencies: this.data.ambulanceRequests.filter(r => r.status !== 'ARRIVED' && r.status !== 'COMPLETED').length
      },
      users: this.getAllUsers(),
      bloodDonors: this.getBloodDonors(false), // Admin gets FULL UNMASKED donor details & real phone numbers
      ambulanceRequests: this.data.ambulanceRequests,
      bloodRequests: this.data.bloodRequests,
      contactDispatches: this.data.contactDispatches,
      loginLogs: this.data.loginLogs,
      hospitals: this.data.hospitals
    };
  }
}

const db = new Database();
module.exports = db;
