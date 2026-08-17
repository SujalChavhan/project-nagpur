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
        icuBedsAvailable: 6,
        normalBedsTotal: 50,
        normalBedsAvailable: 18,
        ventilatorsTotal: 18,
        ventilatorsAvailable: 5,
        traumaUnitsTotal: 6,
        traumaUnitsAvailable: 3,
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
        icuBedsAvailable: 4,
        normalBedsTotal: 40,
        normalBedsAvailable: 12,
        ventilatorsTotal: 15,
        ventilatorsAvailable: 3,
        traumaUnitsTotal: 4,
        traumaUnitsAvailable: 2,
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
        icuBedsAvailable: 4,
        normalBedsTotal: 30,
        normalBedsAvailable: 10,
        ventilatorsTotal: 12,
        ventilatorsAvailable: 3,
        traumaUnitsTotal: 4,
        traumaUnitsAvailable: 2,
        emergencyTeamStatus: 'Available (Team Gamma On Duty)',
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
        // Ensure hospitals have all bed fields and valid non-zero baseline
        if (this.data.hospitals) {
          for (const hid of Object.keys(seed.hospitals)) {
            if (!this.data.hospitals[hid]) {
              this.data.hospitals[hid] = seed.hospitals[hid];
            } else {
              const h = this.data.hospitals[hid];
              if (h.normalBedsTotal === undefined) h.normalBedsTotal = seed.hospitals[hid].normalBedsTotal;
              if (h.normalBedsAvailable === undefined) h.normalBedsAvailable = seed.hospitals[hid].normalBedsAvailable;
              if (h.icuBedsAvailable === 0 && (!h.inboundQueue || h.inboundQueue.length === 0)) {
                h.icuBedsAvailable = seed.hospitals[hid].icuBedsAvailable;
              }
            }
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
      return this.data.ambulanceRequests.find(req => req.userId === userId && req.status !== 'DISCHARGED' && req.status !== 'COMPLETED') || null;
    }
    return this.data.ambulanceRequests.find(req => req.status !== 'DISCHARGED' && req.status !== 'COMPLETED') || null;
  }

  createAmbulanceRequest(requestData) {
    const requestId = `EMG-NAG-${Math.floor(1000 + Math.random() * 9000)}`;
    const hosp = this.data.hospitals[requestData.hospitalId] || this.data.hospitals['NCEH001'];

    // Auto decrement available bed count on request
    if (hosp) {
      if (hosp.icuBedsAvailable > 0) hosp.icuBedsAvailable -= 1;
      else if (hosp.normalBedsAvailable > 0) hosp.normalBedsAvailable -= 1;
    }

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
      hospitalId: hosp ? hosp.id : 'NCEH001',
      hospitalName: hosp ? hosp.name : 'Nagpur Central Emergency Hospital',
      hospitalLocality: hosp ? hosp.locality : 'Civil Lines, Nagpur',
      hospitalContact: hosp ? hosp.emergencyContact : '+91 712 255 1001',
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
      doctorFeedback: null,
      dischargedAt: null,
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
      if (!hosp.inboundQueue) hosp.inboundQueue = [];
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
        accepted: false,
        status: 'INCOMING'
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
    if (hosp && hosp.inboundQueue) {
      const qItem = hosp.inboundQueue.find(p => p.id === id);
      if (qItem) {
        if (updates.etaSeconds !== undefined) {
          qItem.etaSeconds = updates.etaSeconds;
          qItem.etaMinutes = Math.ceil(updates.etaSeconds / 60);
        }
        if (updates.is15mAlertAccepted !== undefined) {
          qItem.accepted = updates.is15mAlertAccepted;
          qItem.bedStatus = '✓ ICU Bed & Trauma Bay Locked';
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

  // --- Hospitals & Live Bed / Seat Management ---
  getHospitals() {
    return this.data.hospitals;
  }

  getHospitalById(id) {
    return this.data.hospitals[id] || null;
  }

  updateHospitalInventory(id, inventoryData) {
    const hosp = this.getHospitalById(id);
    if (!hosp) return null;

    if (inventoryData.icuBedsTotal !== undefined) {
      hosp.icuBedsTotal = Math.max(1, parseInt(inventoryData.icuBedsTotal) || hosp.icuBedsTotal);
    }
    if (inventoryData.icuBedsAvailable !== undefined) {
      hosp.icuBedsAvailable = Math.max(0, Math.min(hosp.icuBedsTotal, parseInt(inventoryData.icuBedsAvailable)));
    }
    if (inventoryData.normalBedsTotal !== undefined) {
      hosp.normalBedsTotal = Math.max(1, parseInt(inventoryData.normalBedsTotal) || (hosp.normalBedsTotal || 40));
    }
    if (inventoryData.normalBedsAvailable !== undefined) {
      hosp.normalBedsAvailable = Math.max(0, Math.min(hosp.normalBedsTotal, parseInt(inventoryData.normalBedsAvailable)));
    }
    if (inventoryData.ventilatorsTotal !== undefined) {
      hosp.ventilatorsTotal = Math.max(0, parseInt(inventoryData.ventilatorsTotal) || hosp.ventilatorsTotal);
    }
    if (inventoryData.ventilatorsAvailable !== undefined) {
      hosp.ventilatorsAvailable = Math.max(0, Math.min(hosp.ventilatorsTotal, parseInt(inventoryData.ventilatorsAvailable)));
    }
    if (inventoryData.traumaUnitsTotal !== undefined) {
      hosp.traumaUnitsTotal = Math.max(0, parseInt(inventoryData.traumaUnitsTotal) || hosp.traumaUnitsTotal);
    }
    if (inventoryData.traumaUnitsAvailable !== undefined) {
      hosp.traumaUnitsAvailable = Math.max(0, Math.min(hosp.traumaUnitsTotal, parseInt(inventoryData.traumaUnitsAvailable)));
    }
    if (inventoryData.emergencyTeamStatus !== undefined) {
      hosp.emergencyTeamStatus = inventoryData.emergencyTeamStatus;
    }
    if (inventoryData.bloodReservePercentage !== undefined) {
      hosp.bloodReservePercentage = Math.max(0, Math.min(100, parseInt(inventoryData.bloodReservePercentage) || hosp.bloodReservePercentage));
    }

    this.save();
    return hosp;
  }

  // Discharge Patient with Doctor Feedback & Free up Bed/Seat (+1)
  dischargePatient(hospitalId, requestId, feedbackData = {}) {
    const hosp = this.getHospitalById(hospitalId);
    const req = this.getAmbulanceRequestById(requestId);

    const feedbackText = feedbackData.feedback || "Patient received prompt treatment at our hospital, vitals have normalized, and is doing good now.";
    const outcomeText = feedbackData.outcome || "Fully Recovered & Discharged";
    const dischargeTime = new Date().toISOString();

    if (req) {
      req.status = 'DISCHARGED';
      req.dischargeStatus = 'TREATED';
      req.doctorFeedback = feedbackText;
      req.outcome = outcomeText;
      req.dischargedAt = dischargeTime;
      req.dischargedByHospitalId = hospitalId;
      req.dischargedByHospitalName = hosp ? hosp.name : 'Hospital';
    }

    // In hospital inboundQueue, update status
    if (hosp && hosp.inboundQueue) {
      const qItem = hosp.inboundQueue.find(p => p.id === requestId);
      if (qItem) {
        qItem.status = 'DISCHARGED';
        qItem.bedStatus = `✓ Treatment Completed • ${outcomeText}`;
        qItem.doctorFeedback = feedbackText;
        qItem.dischargedAt = dischargeTime;
      }
    }

    // Free up available bed (+1 Available Bed / Seat)
    if (hosp) {
      if (hosp.icuBedsAvailable < hosp.icuBedsTotal) {
        hosp.icuBedsAvailable += 1;
      } else if (hosp.normalBedsAvailable !== undefined && hosp.normalBedsAvailable < hosp.normalBedsTotal) {
        hosp.normalBedsAvailable += 1;
      }
      if (hosp.ventilatorsAvailable < hosp.ventilatorsTotal) {
        hosp.ventilatorsAvailable += 1;
      }
      if (hosp.traumaUnitsAvailable < hosp.traumaUnitsTotal) {
        hosp.traumaUnitsAvailable += 1;
      }
    }

    this.save();
    return {
      success: true,
      hospital: hosp,
      emergency: req,
      feedback: feedbackText,
      outcome: outcomeText,
      dischargedAt: dischargeTime
    };
  }

  // Mark patient admitted
  admitPatient(hospitalId, requestId) {
    const hosp = this.getHospitalById(hospitalId);
    const req = this.getAmbulanceRequestById(requestId);

    if (req) {
      req.status = 'ADMITTED';
      req.journeyStep = 6;
    }

    if (hosp && hosp.inboundQueue) {
      const qItem = hosp.inboundQueue.find(p => p.id === requestId);
      if (qItem) {
        qItem.status = 'ADMITTED';
        qItem.bedStatus = '✓ Admitted & In Emergency Care';
      }
    }

    this.save();
    return { success: true, hospital: hosp, emergency: req };
  }

  // Reject & Divert Patient to Alternative Hospital
  rejectPatientAndDivert(currentHospitalId, targetHospitalId, requestId, reason = 'Surge Capacity Reached') {
    const curHosp = this.getHospitalById(currentHospitalId);
    const targetHosp = this.getHospitalById(targetHospitalId);
    const req = this.getAmbulanceRequestById(requestId);

    if (!curHosp || !targetHosp || !req) {
      return { success: false, message: 'Hospital or emergency record not found' };
    }

    // Remove from current hospital queue
    if (curHosp.inboundQueue) {
      const idx = curHosp.inboundQueue.findIndex(p => p.id === requestId);
      if (idx !== -1) {
        const removed = curHosp.inboundQueue.splice(idx, 1)[0];
        // If it was accepted and reserved bed, restore bed to current hospital
        if (removed.accepted && curHosp.icuBedsAvailable < curHosp.icuBedsTotal) {
          curHosp.icuBedsAvailable += 1;
        }
      }
    }

    // Re-assign emergency to target hospital
    req.hospitalId = targetHospitalId;
    req.destinationHospitalId = targetHospitalId;
    req.hospitalName = targetHosp.name;
    req.hospitalLocality = targetHosp.locality;
    req.hospitalContact = targetHosp.emergencyContact;
    req.status = 'DIVERTED';
    req.divertedFrom = curHosp.name;
    req.divertReason = reason;
    req.is15mAlertAccepted = false;

    // Add to target hospital inboundQueue
    if (!targetHosp.inboundQueue) targetHosp.inboundQueue = [];
    targetHosp.inboundQueue.push({
      id: req.id,
      patientName: req.patientName,
      age: req.age,
      condition: req.condition,
      severity: req.severity,
      ambulanceCode: req.ambulanceCode,
      etaMinutes: req.etaMinutes || 12,
      etaSeconds: req.etaSeconds || 720,
      assignedDoctor: "Dr. On Duty",
      bedStatus: `Diverted from ${curHosp.name} • ${reason}`,
      isAlert15m: true,
      accepted: false,
      status: 'INCOMING'
    });

    this.save();
    return {
      success: true,
      currentHospital: curHosp,
      targetHospital: targetHosp,
      emergency: req,
      reason
    };
  }

  // Update Hospital Operational Settings & Surge Mode
  updateHospitalSettings(hospitalId, settings = {}) {
    const hosp = this.getHospitalById(hospitalId);
    if (!hosp) return null;

    if (settings.surgeStatus !== undefined) hosp.surgeStatus = settings.surgeStatus;
    if (settings.headDoctor !== undefined) hosp.headDoctor = settings.headDoctor;
    if (settings.emergencyContact !== undefined) hosp.emergencyContact = settings.emergencyContact;
    if (settings.emergencyTeamStatus !== undefined) hosp.emergencyTeamStatus = settings.emergencyTeamStatus;
    if (settings.bloodReservePercentage !== undefined) hosp.bloodReservePercentage = parseInt(settings.bloodReservePercentage) || hosp.bloodReservePercentage;

    // Also update beds if provided
    if (settings.icuBedsAvailable !== undefined) hosp.icuBedsAvailable = Math.max(0, parseInt(settings.icuBedsAvailable));
    if (settings.icuBedsTotal !== undefined) hosp.icuBedsTotal = Math.max(1, parseInt(settings.icuBedsTotal));
    if (settings.normalBedsAvailable !== undefined) hosp.normalBedsAvailable = Math.max(0, parseInt(settings.normalBedsAvailable));
    if (settings.normalBedsTotal !== undefined) hosp.normalBedsTotal = Math.max(1, parseInt(settings.normalBedsTotal));
    if (settings.ventilatorsAvailable !== undefined) hosp.ventilatorsAvailable = Math.max(0, parseInt(settings.ventilatorsAvailable));
    if (settings.ventilatorsTotal !== undefined) hosp.ventilatorsTotal = Math.max(0, parseInt(settings.ventilatorsTotal));
    if (settings.traumaUnitsAvailable !== undefined) hosp.traumaUnitsAvailable = Math.max(0, parseInt(settings.traumaUnitsAvailable));
    if (settings.traumaUnitsTotal !== undefined) hosp.traumaUnitsTotal = Math.max(0, parseInt(settings.traumaUnitsTotal));

    this.save();
    return hosp;
  }

  // Full state synchronization payload
  getFullSyncState() {
    return {
      timestamp: Date.now(),
      hospitals: this.data.hospitals,
      ambulanceRequests: this.data.ambulanceRequests,
      bloodRequests: this.data.bloodRequests,
      bloodDonors: this.getBloodDonors(true),
      contactDispatches: this.data.contactDispatches
    };
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
        activeEmergencies: this.data.ambulanceRequests.filter(r => r.status !== 'DISCHARGED' && r.status !== 'COMPLETED').length
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
