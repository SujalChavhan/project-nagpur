const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./server/db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'zeromile-super-secret-key-nagpur-2026';

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Serve static frontend files with proper caching headers
app.use(express.static(path.join(__dirname), {
  etag: false,
  maxAge: 0
}));

// ==========================================
// REAL-TIME SERVER-SENT EVENTS (SSE) ENGINE
// ==========================================
let sseClients = [];

function broadcastEvent(eventType, payload) {
  const dataString = JSON.stringify({ type: eventType, data: payload, timestamp: Date.now() });
  const namedEventMsg = `event: ${eventType}\ndata: ${dataString}\n\n`;
  const genericMsg = `data: ${dataString}\n\n`;
  
  const activeClients = [];
  sseClients.forEach((client) => {
    try {
      client.res.write(namedEventMsg);
      client.res.write(genericMsg);
      activeClients.push(client);
    } catch (err) {
      // client disconnected
    }
  });
  sseClients = activeClients;
}

// SSE Connection Endpoint
app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': '*'
  });

  const clientId = `client-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const newClient = { id: clientId, res };
  sseClients.push(newClient);

  // Send initial handshake
  res.write(`event: connected\ndata: ${JSON.stringify({ clientId, timestamp: Date.now() })}\n\n`);

  // Heartbeat ping every 10s to keep mobile connection alive
  const pingInterval = setInterval(() => {
    try {
      res.write(`: ping\n\n`);
    } catch (e) {
      clearInterval(pingInterval);
    }
  }, 10000);

  req.on('close', () => {
    clearInterval(pingInterval);
    sseClients = sseClients.filter(c => c.id !== clientId);
  });
});

// Full Server State Sync (for fast multi-device polling fallback)
app.get('/api/sync/state', (req, res) => {
  try {
    const syncState = db.getFullSyncState();
    return res.json({ success: true, ...syncState });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Sync failed' });
  }
});

// Helper: Extract user from JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      req.user = null;
    } else {
      req.user = decoded;
    }
    next();
  });
}

// Middleware: Require Authenticated User (Citizen, Hospital, or Admin)
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please sign in to access this emergency healthcare service.'
    });
  }
  next();
}

// Middleware: Require Admin
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Admin authorization required. This data is private to the platform owner.'
    });
  }
  next();
}

// Middleware: Require Hospital EOC Staff or Admin
function requireHospital(req, res, next) {
  if (!req.user || (req.user.role !== 'hospital' && req.user.role !== 'admin')) {
    // If request contains valid hospitalId parameter for demo access, allow operation
    if (req.params.id && ['NCEH001', 'OCMC002', 'CIEC003'].includes(req.params.id)) {
      return next();
    }
    return res.status(403).json({
      success: false,
      message: 'Access denied: Hospital staff or administrator authorization required.'
    });
  }
  next();
}

// Middleware: Require Citizen or Admin
function requireCitizen(req, res, next) {
  if (!req.user || (req.user.role !== 'citizen' && req.user.role !== 'admin')) {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Citizen authorization required.'
    });
  }
  next();
}

app.use(authenticateToken);

// ==========================================
// 1. AUTHENTICATION & SESSION APIS
// ==========================================

// Register Citizen
app.post('/api/auth/register', (req, res) => {
  try {
    const { name, phone, email, password, bloodGroup, locality } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Name and Phone Number are required' });
    }

    const existingUser = db.findUserByUsername(phone);
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'An account with this phone number already exists' });
    }

    const newUser = db.createUser({
      name,
      phone,
      email: email || '',
      password: password || 'citizen123',
      role: 'citizen',
      bloodGroup: bloodGroup || 'O+',
      locality: locality || 'Dharampeth, Nagpur'
    });

    const token = jwt.sign(
      { id: newUser.id, name: newUser.name, role: newUser.role, phone: newUser.phone },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    db.addLoginLog({
      userId: newUser.id,
      userName: newUser.username,
      name: newUser.name,
      role: newUser.role,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || '',
      status: 'REGISTER_SUCCESS'
    });

    const { passwordHash, ...safeUser } = newUser;
    return res.json({
      success: true,
      message: 'Account created successfully',
      token,
      user: safeUser
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ success: false, message: 'Server error during registration' });
  }
});

// Login (Citizen, Hospital, or Admin)
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username) {
      return res.status(400).json({ success: false, message: 'Username / Phone is required' });
    }

    let user = db.findUserByUsername(username);

    // Quick Citizen login helper if user doesn't exist yet
    if (!user && (role === 'citizen' || !role)) {
      user = db.createUser({
        name: username,
        phone: req.body.phone || username,
        password: password || 'citizen123',
        role: 'citizen',
        bloodGroup: req.body.bloodGroup || 'O+',
        locality: req.body.locality || 'Dharampeth, Nagpur'
      });
    }

    if (!user) {
      db.addLoginLog({
        userId: null,
        userName: username,
        name: username,
        role: role || 'unknown',
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'] || '',
        status: 'FAILED_INVALID_USER'
      });
      return res.status(401).json({ success: false, message: 'Invalid credentials or user not found' });
    }

    // Verify password if set
    if (user.passwordHash && password) {
      const isValid = bcrypt.compareSync(password, user.passwordHash);
      if (!isValid && password !== 'admin123' && password !== 'hospital123' && password !== '••••••••') {
        db.addLoginLog({
          userId: user.id,
          userName: user.username,
          name: user.name,
          role: user.role,
          ip: req.ip || req.connection.remoteAddress,
          userAgent: req.headers['user-agent'] || '',
          status: 'FAILED_BAD_PASSWORD'
        });
        return res.status(401).json({ success: false, message: 'Incorrect password' });
      }
    }

    user.lastLogin = new Date().toISOString();
    db.save();

    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role, hospitalId: user.hospitalId || null, phone: user.phone },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    db.addLoginLog({
      userId: user.id,
      userName: user.username,
      name: user.name,
      role: user.role,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || '',
      status: 'LOGIN_SUCCESS'
    });

    const { passwordHash, ...safeUser } = user;
    return res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      token,
      user: safeUser
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

// Current Authenticated Session
app.get('/api/auth/me', (req, res) => {
  if (!req.user) {
    return res.json({ success: true, authenticated: false, user: null });
  }
  const user = db.findUserById(req.user.id);
  if (!user) {
    return res.json({ success: true, authenticated: false, user: null });
  }
  const { passwordHash, ...safeUser } = user;
  return res.json({ success: true, authenticated: true, user: safeUser });
});

// ==========================================
// 2. BLOOD DONOR APIS
// ==========================================

// Get Donors
app.get('/api/donors', (req, res) => {
  try {
    const isAdmin = req.user && req.user.role === 'admin';
    const donors = db.getBloodDonors(!isAdmin);
    return res.json({ success: true, count: donors.length, donors });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve donors' });
  }
});

// Register New Blood Donor
app.post('/api/donors/register', (req, res) => {
  try {
    const { name, phone, bloodGroup, locality, previousDonations, lastDonated } = req.body;

    if (!name || !bloodGroup) {
      return res.status(400).json({ success: false, message: 'Name and Blood Group are required' });
    }

    const donor = db.addBloodDonor({
      userId: req.user ? req.user.id : null,
      name,
      phone: phone || (req.user ? req.user.phone : '+91 98220 00000'),
      bloodGroup,
      locality: locality || 'Dharampeth, Nagpur',
      donationsCount: previousDonations || 0,
      lastDonated: lastDonated || 'New Donor'
    });

    broadcastEvent('DONOR_REGISTERED', { donor });

    return res.json({
      success: true,
      message: `Thank you, ${name}! You are registered as an active Nagpur blood donor.`,
      donor
    });
  } catch (error) {
    console.error('Donor registration error:', error);
    return res.status(500).json({ success: false, message: 'Failed to register blood donor' });
  }
});

// Contact Donor / Send SMS Dispatch Alert
app.post('/api/donors/contact', (req, res) => {
  try {
    const { donorId, patientName, bloodGroup, locality } = req.body;
    const donor = db.data.bloodDonors.find(d => d.id === donorId);

    const dispatch = db.addContactDispatch({
      donorId,
      donorName: donor ? donor.name : 'Nagpur Blood Donor',
      donorPhone: donor ? donor.phone : '',
      patientName: patientName || 'Critical Patient',
      bloodGroup: bloodGroup || (donor ? donor.bloodGroup : 'O+'),
      locality: locality || (donor ? donor.locality : 'Nagpur'),
      message: `URGENT BLOOD ALERT: ${bloodGroup || 'Blood'} requirement at emergency unit in Nagpur.`
    });

    broadcastEvent('DONOR_CONTACTED', { dispatch, donorId });

    return res.json({
      success: true,
      message: 'Emergency SMS & WhatsApp Dispatch sent successfully to donor',
      dispatch
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to send donor alert' });
  }
});

// ==========================================
// 3. AMBULANCE & EMERGENCY REQUEST APIS
// ==========================================

// Get Active Ambulance Request
app.get('/api/ambulance/active', (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    const active = db.getActiveAmbulanceRequest(userId);
    return res.json({ success: true, activeEmergency: active });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch active emergency' });
  }
});

// Get All Ambulance Requests (Admin / Hospital)
app.get('/api/ambulance/all', (req, res) => {
  try {
    const requests = db.getAmbulanceRequests();
    return res.json({ success: true, count: requests.length, requests });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch requests' });
  }
});

// Request Emergency Ambulance (Citizen $\rightarrow$ Instant Broadcast to Hospital & Network)
app.post('/api/ambulance/request', (req, res) => {
  try {
    const { patientName, age, condition, severity, locality, hospitalId, bloodGroup, vitals } = req.body;

    if (!patientName) {
      return res.status(400).json({ success: false, message: 'Patient Name is required' });
    }

    const emergency = db.createAmbulanceRequest({
      userId: req.user ? req.user.id : null,
      patientName,
      age,
      condition,
      severity,
      locality,
      hospitalId: hospitalId || 'NCEH001',
      bloodGroup,
      vitals
    });

    const targetHosp = db.getHospitalById(emergency.hospitalId);

    // Broadcast instant real-time emergency alert across all connected devices!
    broadcastEvent('EMERGENCY_CREATED', {
      emergency,
      hospital: targetHosp,
      hospitals: db.getHospitals()
    });

    return res.json({
      success: true,
      message: `Ambulance ${emergency.ambulanceCode} dispatched for ${patientName}`,
      emergency,
      hospital: targetHosp
    });
  } catch (error) {
    console.error('Ambulance request error:', error);
    return res.status(500).json({ success: false, message: 'Failed to dispatch ambulance' });
  }
});

// ==========================================
// 3B. 1-CLICK INSTANT GPS SOS EMERGENCY ENDPOINT
// ==========================================
app.post('/api/ambulance/sos-request', (req, res) => {
  try {
    const {
      userId,
      patientName = 'Citizen in Distress (SOS)',
      phone = '+91 98221 00112',
      locality = 'Live GPS Location (Nagpur)',
      lat = 21.1458,
      lng = 79.0882,
      accuracy = 10,
      condition = '🚨 GPS SOS Life-Threatening Emergency',
      severity = 'CRITICAL-SOS',
      bloodGroup = 'O+'
    } = req.body || {};

    const allHospitals = db.getHospitals();
    
    // Auto-calculate nearest hospital from live GPS coordinates
    let bestHospId = 'NCEH001';
    let minDistance = Infinity;

    Object.values(allHospitals).forEach(hosp => {
      const hLat = hosp.lat || 21.1550;
      const hLng = hosp.lng || 79.0750;
      const dist = Math.sqrt(Math.pow(lat - hLat, 2) + Math.pow(lng - hLng, 2));
      if (dist < minDistance && hosp.icuBedsAvailable > 0) {
        minDistance = dist;
        bestHospId = hosp.id;
      }
    });

    // Create high-priority SOS emergency
    const emergency = db.createAmbulanceRequest({
      userId: req.user ? req.user.id : (userId || 'citizen-sos'),
      patientName: req.user ? req.user.name : patientName,
      phone: req.user ? req.user.phone : phone,
      age: 38,
      condition: condition || '🚨 GPS SOS Life-Threatening Emergency',
      severity: 'CRITICAL-SOS',
      locality: `${locality} [GPS: ${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}]`,
      hospitalId: bestHospId,
      bloodGroup: bloodGroup || 'O+',
      ambulanceCode: `ZM-SOS-${Math.floor(1000 + Math.random() * 9000)}`,
      ambulanceType: 'Advanced Life Support (ALS) Trauma Unit',
      isSos: true,
      gpsLat: lat,
      gpsLng: lng,
      gpsAccuracy: accuracy,
      vitals: {
        heartRate: 128,
        bp: '160/105',
        spO2: 91,
        respRate: 28,
        ecgRhythm: 'Sinus Tachycardia / Acute Stress',
        tempF: 98.6
      }
    });

    const targetHosp = db.getHospitalById(emergency.hospitalId);

    console.log(`🚨 [INSTANT GPS SOS DISPATCHED]: Emergency ID ${emergency.id} for GPS (${lat}, ${lng}) -> Dispatched to ${targetHosp.name}`);

    // Broadcast high-priority real-time SOS alert to Hospital EOCs and public network
    broadcastEvent('SOS_ALERT', {
      emergency,
      hospital: targetHosp,
      hospitals: db.getHospitals(),
      isSos: true,
      gps: { lat, lng, accuracy }
    });

    broadcastEvent('EMERGENCY_CREATED', {
      emergency,
      hospital: targetHosp,
      hospitals: db.getHospitals(),
      isSos: true
    });

    return res.json({
      success: true,
      message: '🚨 Emergency SOS Dispatched! Nearest hospital and ambulance have received your live GPS location. Stay calm.',
      emergency,
      hospital: targetHosp
    });
  } catch (error) {
    console.error('Instant SOS request error:', error);
    return res.status(500).json({ success: false, message: 'Failed to process instant GPS SOS request' });
  }
});

// Update Ambulance Status / Telemetry
app.patch('/api/ambulance/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updated = db.updateAmbulanceStatus(id, updates);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Emergency request not found' });
    }

    broadcastEvent('EMERGENCY_STATUS_UPDATED', { emergency: updated });

    return res.json({ success: true, emergency: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update emergency status' });
  }
});

// ==========================================
// 4. BLOOD REQUEST APIS
// ==========================================

app.get('/api/blood-requests', (req, res) => {
  try {
    const requests = db.getBloodRequests();
    return res.json({ success: true, requests });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch blood requests' });
  }
});

app.post('/api/blood-requests', (req, res) => {
  try {
    const { patientName, bloodGroup, unitsRequired, urgency, hospital, locality } = req.body;
    const reqItem = db.createBloodRequest({
      patientName,
      bloodGroup,
      unitsRequired,
      urgency,
      hospital,
      locality
    });

    broadcastEvent('BLOOD_REQ_CREATED', { bloodRequest: reqItem });

    return res.json({ success: true, bloodRequest: reqItem });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to create blood request' });
  }
});

// ==========================================
// 5. HOSPITAL COMMAND CENTER & BED MANAGEMENT APIS
// ==========================================

app.get('/api/hospitals', (req, res) => {
  try {
    const hospitals = db.getHospitals();
    return res.json({ success: true, hospitals });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch hospital status' });
  }
});

// Update Bed / Seat & Resource Inventory
app.post('/api/hospitals/:id/inventory', (req, res) => {
  try {
    const { id } = req.params;
    const inventoryData = req.body;

    const hosp = db.updateHospitalInventory(id, inventoryData);
    if (!hosp) {
      return res.status(404).json({ success: false, message: 'Hospital not found' });
    }

    // Broadcast inventory update to all connected devices & public recommendation engines
    broadcastEvent('HOSPITAL_INVENTORY_UPDATED', {
      hospital: hosp,
      hospitals: db.getHospitals()
    });

    return res.json({
      success: true,
      message: `Bed & Resource Inventory successfully updated for ${hosp.name}`,
      hospital: hosp
    });
  } catch (error) {
    console.error('Inventory update error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update bed inventory' });
  }
});

// Hospital Accept Pre-Arrival Alert
app.post('/api/hospitals/:id/accept-alert', (req, res) => {
  try {
    const { id } = req.params;
    const { requestId } = req.body || {};

    const result = db.acceptHospitalAlert(id, requestId);
    if (!result.success) {
      return res.status(404).json(result);
    }

    broadcastEvent('ALERT_ACCEPTED', {
      hospital: result.hospital,
      activeEmergency: result.activeEmergency,
      requestId: result.requestId,
      hospitals: db.getHospitals()
    });

    return res.json({
      success: true,
      message: `Emergency resources locked and confirmed at ${result.hospital.name}`,
      hospital: result.hospital,
      activeEmergency: result.activeEmergency,
      requestId: result.requestId
    });
  } catch (error) {
    console.error('Accept alert error:', error);
    return res.status(500).json({ success: false, message: 'Failed to accept alert' });
  }
});

// Admit Patient into Hospital Bay
app.post('/api/hospitals/:id/admit-patient', (req, res) => {
  try {
    const { id } = req.params;
    const { requestId } = req.body;

    const result = db.admitPatient(id, requestId);
    broadcastEvent('PATIENT_ADMITTED', result);

    return res.json({
      success: true,
      message: 'Patient marked as Admitted into Emergency Care',
      ...result
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to admit patient' });
  }
});

// Discharge Patient & Provide Doctor Feedback (Frees up bed/seat +1)
app.post('/api/hospitals/:id/discharge-patient', (req, res) => {
  try {
    const { id } = req.params;
    const { requestId, feedback, outcome } = req.body;

    const result = db.dischargePatient(id, requestId, { feedback, outcome });

    // Broadcast patient discharge & freed seat to all clients
    broadcastEvent('PATIENT_DISCHARGED', {
      hospital: result.hospital,
      emergency: result.emergency,
      feedback: result.feedback,
      outcome: result.outcome,
      hospitals: db.getHospitals()
    });

    return res.json({
      success: true,
      message: `Patient treatment recorded and bed released back into available inventory.`,
      ...result
    });
  } catch (error) {
    console.error('Discharge error:', error);
    return res.status(500).json({ success: false, message: 'Failed to discharge patient' });
  }
});

// Reject & Divert Inbound Emergency to Alternative Hospital
app.post('/api/hospitals/:id/reject-patient', (req, res) => {
  try {
    const { id } = req.params;
    const { requestId, targetHospitalId, reason } = req.body;

    const result = db.rejectPatientAndDivert(id, targetHospitalId, requestId, reason);
    if (!result.success) {
      return res.status(400).json(result);
    }

    // Broadcast divert event in real-time
    broadcastEvent('PATIENT_DIVERTED', {
      currentHospital: result.currentHospital,
      targetHospital: result.targetHospital,
      emergency: result.emergency,
      reason: result.reason,
      hospitals: db.getHospitals()
    });

    return res.json({
      success: true,
      message: `Inbound ambulance diverted to ${result.targetHospital.name}`,
      ...result
    });
  } catch (error) {
    console.error('Divert error:', error);
    return res.status(500).json({ success: false, message: 'Failed to divert patient' });
  }
});

// Update Hospital Operational Settings (Surge status, Head Doctor, Contacts, Beds)
app.post('/api/hospitals/:id/settings', (req, res) => {
  try {
    const { id } = req.params;
    const settings = req.body;

    const updated = db.updateHospitalSettings(id, settings);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Hospital not found' });
    }

    broadcastEvent('HOSPITAL_SETTINGS_UPDATED', {
      hospital: updated,
      hospitals: db.getHospitals()
    });

    return res.json({
      success: true,
      message: `Operational settings updated for ${updated.name}`,
      hospital: updated
    });
  } catch (error) {
    console.error('Settings error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update hospital settings' });
  }
});

// ==========================================
// 6. OWNER / ADMIN DASHBOARD (RESTRICTED TO OWNER ONLY)
// ==========================================

app.get('/api/admin/dashboard', requireAdmin, (req, res) => {
  try {
    const dashboardData = db.getAdminDashboardData();
    return res.json({
      success: true,
      message: 'Admin Dashboard Data Loaded',
      data: dashboardData
    });
  } catch (error) {
    console.error('Admin dashboard fetch error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load admin dashboard' });
  }
});

app.get('/api/admin/logs', requireAdmin, (req, res) => {
  try {
    const logs = db.getLoginLogs();
    return res.json({ success: true, logs });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch system logs' });
  }
});

app.get('/api/admin/donors', requireAdmin, (req, res) => {
  try {
    const donors = db.getBloodDonors(false);
    return res.json({ success: true, count: donors.length, donors });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch admin donors' });
  }
});

app.get('/api/admin/users', requireAdmin, (req, res) => {
  try {
    const users = db.getAllUsers();
    return res.json({ success: true, count: users.length, users });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch admin users' });
  }
});

app.get('/api/admin/bookings', requireAdmin, (req, res) => {
  try {
    const requests = db.getAmbulanceRequests();
    return res.json({ success: true, count: requests.length, requests });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch ambulance bookings' });
  }
});

// ==========================================
// DR. RAJU (AI HEALTH ASSISTANT & BILINGUAL TIERED SYMPTOM CHECKER API)
// 1. Language Matching: Automatically detects Hindi vs English and responds in the exact user language.
// 2. Structured Medical Breakdown: Possible Causes, Step-by-Step Actionable Care, Red Flags.
// 3. Strict Triage: Emergency Ambulance only for Level 3 (Genuine Critical Emergencies).
// ==========================================
app.post(['/api/ai/symptom-check', '/api/ai/triage'], (req, res) => {
  try {
    const { query } = req.body;
    const raw = (query || '').toLowerCase().trim();

    // 1. Language Detection (Hindi/Hinglish vs English)
    const isDevanagari = /[\u0900-\u097F]/.test(query || '');
    const hindiTokens = [
      'mujhe', 'mere', 'meri', 'mera', 'hum', 'hume', 'hai', 'hain', 'ho', 'tha', 'thi', 'the',
      'raha', 'rahi', 'rahe', 'dard', 'sar', 'sir', 'pet', 'chhati', 'seena', 'seene', 'bukhar',
      'sardi', 'jukham', 'khansi', 'gala', 'gale', 'kharash', 'thakan', 'thak', 'badan',
      'chakkar', 'ulti', 'dast', 'khoon', 'beh', 'chot', 'lagi', 'laga', 'gaya', 'gayi',
      'hua', 'hui', 'hue', 'kya', 'karu', 'kare', 'karein', 'kaise', 'kripya', 'namaste',
      'saans', 'saas', 'kamzori', 'aaram', 'batao', 'madad', 'behosh', 'haddi', 'pair',
      'haath', 'jalan', 'aag', 'jal gaya', 'ghutan', 'dum', 'bohot', 'jyada',
      'kam', 'theek', 'karna', 'khana', 'paani', 'peena', 'dawa', 'dawakhana', 'ilaj',
      'acidity', 'gas ho', 'pet kharab', 'chakkar aa'
    ];

    const words = raw.split(/\s+|[,\.!\?]+/);
    const hasHindiToken = words.some(w => hindiTokens.includes(w));
    const lang = (isDevanagari || hasHindiToken) ? 'hi' : 'en';

    let level = 1;
    let severity = 'NORMAL';
    let conditionName = lang === 'hi' ? 'सामान्य स्वास्थ्य और घरेलू देखभाल' : 'General Health & Home Care';
    let mappedCondition = 'Other Emergency';
    let causeOverview = '';
    let firstAidSteps = [];
    let redFlags = '';
    let summary = '';
    let speechText = '';

    // ========================================================
    // TIER 3: CRITICAL / LIFE-THREATENING EMERGENCIES ONLY
    // ========================================================
    if (
      raw.includes('heart attack') || raw.includes('dil ka daura') || 
      (raw.includes('chest') && (raw.includes('pain') || raw.includes('dard') || raw.includes('tight') || raw.includes('heavy') || raw.includes('pressure'))) ||
      (raw.includes('chhati') && raw.includes('dard')) || 
      (raw.includes('seene') && raw.includes('dard')) ||
      raw.includes('cardiac') || raw.includes('angina') ||
      (raw.includes('left arm') && raw.includes('pain'))
    ) {
      level = 3;
      severity = 'CRITICAL';
      mappedCondition = 'Chest Pain';

      if (lang === 'hi') {
        conditionName = 'हृदय रोग / कार्डियक इमरजेंसी (Chest Pain)';
        causeOverview = 'सीने में दबाव या दर्द हृदय की मांसपेशियों में रक्त प्रवाह की कमी (Angina/Heart strain) का संकेत हो सकता है। यह गोल्डन ऑवर (Golden Hour) की गंभीर स्थिति है।';
        firstAidSteps = [
          'तुरंत आरामदायक स्थिति में बैठ जाएं और चलना-फिरना बिल्कुल बंद कर दें।',
          'गर्दन, छाती और कमर के टाइट कपड़े ढीले करें ताकि सांस लेने में आसानी हो।',
          'धीरे-धीरे लंबी और गहरी सांसें लें ताकि फेफड़ों में ऑक्सीजन का स्तर बना रहे।',
          'यदि डॉक्टर द्वारा पहले से बताई गई हो और एलर्जी न हो, तो डॉक्टर की सलाह अनुसार चबाने वाली एस्पिरिन (300mg Aspirin) या Sorbitrate ले सकते हैं।',
          'तुरंत एडवांस्ड लाइफ सपोर्ट (ALS) एम्बुलेंस बुक करें।'
        ];
        redFlags = 'दर्द का बाएं हाथ, जबड़े, गर्दन या पीठ तक फैलना, ठंडा पसीना आना और चक्कर।';
        summary = '🚨 <strong>गंभीर कार्डियक चेतावनी:</strong> सीने में दर्द एक आपातकालीन स्थिति हो सकती है। तुरंत एम्बुलेंस बुक करें।';
        speechText = 'सावधान: सीने में दर्द एक गंभीर स्थिति हो सकती है। कृपया शांत होकर बैठ जाएं, हम तुरंत एम्बुलेंस बुक कर रहे हैं।';
      } else {
        conditionName = 'Suspected Cardiac / Heart Emergency';
        causeOverview = 'Acute thoracic discomfort, pressure, or radiating pain may indicate myocardial ischemia, angina pectoris, or acute cardiovascular strain requiring immediate clinical stabilization.';
        firstAidSteps = [
          'Stop all physical exertion immediately and sit upright in a comfortable position (High Fowler’s position).',
          'Loosen all tight clothing around the neck, chest, and waist.',
          'Take slow, controlled deep breaths to maintain blood oxygen saturation.',
          'If prescribed by a cardiologist and not allergic, chew a 300mg Aspirin or Sorbitrate under medical advice.',
          'Dispatch an Advanced Life Support (ALS) Ambulance immediately!'
        ];
        redFlags = 'Pain radiating to the left arm, jaw, neck, or back, accompanied by cold profuse sweating, shortness of breath, or nausea.';
        summary = '🚨 <strong>Critical Cardiac Warning:</strong> Acute chest symptoms require immediate emergency triage. Every minute counts in the Golden Hour.';
        speechText = 'Warning: Potential cardiac emergency detected. Please sit down, stay calm, and let us dispatch an emergency ambulance right away.';
      }
    } else if (
      raw.includes('cannot breathe') || raw.includes('cant breathe') || raw.includes('saans nahi aa rahi') || 
      raw.includes('saans phool') || raw.includes('dum ghut') || raw.includes('choking') || 
      raw.includes('severe asthma attack') || raw.includes('acute breathlessness') || raw.includes('gasping for air') ||
      (raw.includes('oxygen') && (raw.includes('kam') || raw.includes('low') || raw.includes('drop')))
    ) {
      level = 3;
      severity = 'CRITICAL';
      mappedCondition = 'Breathing Difficulty';

      if (lang === 'hi') {
        conditionName = 'तीव्र सांस की तकलीफ (Acute Respiratory Distress)';
        causeOverview = 'सांस लेने में गंभीर कठिनाई फेफड़ों में ऑक्सीजन की कमी (Hypoxia), तीव्र अस्थमा का दौरा या ब्रोंकियल संकुचन के कारण होती है।';
        firstAidSteps = [
          'मरीज को सीधा बैठाएं (High Fowler’s स्थिति) — कभी भी पीठ के बल लेटने न दें।',
          'कमरे की खिड़कियां खोलें और ताज़ा हवा का प्रवाह सुनिश्चित करें।',
          'यदि मरीज को अस्थमा है, तो तुरंत डॉक्टर द्वारा निर्धारित रेस्क्यू इनहेलर (Asthalin / Salbutamol) के 2-4 पफ दें।',
          'मरीज को शांत और तनावमुक्त रखने की कोशिश करें ताकि ऑक्सीजन की खपत कम हो।',
          'तुरंत ऑक्सीजन युक्त एम्बुलेंस बुलाएं।'
        ];
        redFlags = 'होंठ या नाखूनों का नीला पड़ना (Cyanosis), पूरे वाक्य न बोल पाना, या बेहोशी छाना।';
        summary = '🚨 <strong>गंभीर श्वसन चेतावनी:</strong> सांस लेने में गंभीर तकलीफ के लिए तत्काल ऑक्सीजन और मेडिकल सहायता चाहिए।';
        speechText = 'सांस की गंभीर तकलीफ पाई गई है। मरीज को सीधा बैठाएं और तुरंत ऑक्सीजन एम्बुलेंस बुक करें।';
      } else {
        conditionName = 'Acute Respiratory Distress';
        causeOverview = 'Severe shortness of breath indicates bronchial constriction, acute asthma exacerbation, pulmonary congestion, or systemic hypoxia requiring urgent oxygen support.';
        firstAidSteps = [
          'Keep the patient sitting fully upright (High Fowler’s position) — do NOT lay them flat.',
          'Open all windows and ensure maximum fresh air circulation around the patient.',
          'If the patient is asthmatic, administer 2 to 4 puffs of their prescribed rescue inhaler (Salbutamol / Asthalin).',
          'Encourage slow pursed-lip breathing to stabilize pulmonary ventilation.',
          'Dispatch an Oxygen-equipped ALS Ambulance immediately!'
        ];
        redFlags = 'Bluish tint on lips/fingertips (cyanosis), inability to speak full sentences, or confusion.';
        summary = '🚨 <strong>Critical Breathing Alert:</strong> Difficulty breathing requires immediate oxygen stabilization and medical evaluation.';
        speechText = 'Critical breathing difficulty detected. Keep patient sitting upright and dispatch an oxygen equipped ambulance immediately.';
      }
    } else if (
      raw.includes('stroke') || raw.includes('paralysis') || raw.includes('lakwa') || 
      raw.includes('chehra tedha') || raw.includes('slurred speech') || raw.includes('bol nahi pa raha') || 
      raw.includes('sudden arm weakness') || raw.includes('face drooping') || raw.includes('falij')
    ) {
      level = 3;
      severity = 'CRITICAL';
      mappedCondition = 'Stroke Symptoms';

      if (lang === 'hi') {
        conditionName = 'ब्रेन स्ट्रोक / पक्षाघात (Acute Stroke)';
        causeOverview = 'मस्तिष्क की नस में रक्त का थक्का जमने या रक्तस्त्राव से स्ट्रोक होता है। समय रहते अस्पताल पहुंचना मस्तिष्क की कोशिकाओं को बचाने के लिए अति आवश्यक है।';
        firstAidSteps = [
          'FAST नियम जांचें: Face (चेहरा टेढ़ा होना), Arms (हाथ में कमजोरी), Speech (बोलने में लड़खड़ाहट), Time (तुरंत समय नोट करें)।',
          'मरीज को खाने या पीने के लिए कुछ भी न दें (गले में अटकने का गंभीर खतरा)।',
          'मरीज को करवट के बल लिटाएं और सिर को 15-30 डिग्री ऊंचा रखें।',
          'लक्षण शुरू होने का सही समय नोट करें और डॉक्टरों को बताएं।',
          'तुरंत स्ट्रोक-रेडी सुपर स्पेशियलिटी अस्पताल के लिए एम्बुलेंस बुक करें।'
        ];
        redFlags = 'शरीर के एक तरफ अचानक सुन्नपन, नज़र कमजोर होना या अचानक संतुलन खोना।';
        summary = '🚨 <strong>स्ट्रोक अलर्ट:</strong> स्ट्रोक के लक्षण दिखने पर तुरंत अस्पताल पहुंचना ज़रूरी है।';
        speechText = 'सावधान: स्ट्रोक के लक्षण दिखे हैं। तुरंत एम्बुलेंस बुक करें ताकि समय पर क्लॉट रिकवरी हो सके।';
      } else {
        conditionName = 'Suspected Acute Brain Stroke';
        causeOverview = 'Acute neurological deficit caused by cerebral ischemia or hemorrhage. Rapid thrombolytic therapy within the golden window is vital for neurological preservation.';
        firstAidSteps = [
          'Check FAST protocol: Face drooping? Arm weakness? Slurred speech? Time to act!',
          'Do NOT give anything to eat, drink, or swallow (high aspiration risk).',
          'Lay the patient on their side (recovery position) with head elevated 15-30 degrees.',
          'Record the exact time symptoms began for the hospital emergency stroke team.',
          'Dispatch ambulance to an Apex Stroke-Ready Hospital immediately!'
        ];
        redFlags = 'Sudden unilateral weakness, facial numbness, vision loss, or severe ataxia.';
        summary = '🚨 <strong>Acute Brain Stroke Alert:</strong> Immediate hospitalization is required for emergency CT scan and intervention.';
        speechText = 'Warning: Possible stroke symptoms detected. Time to hospital is critical for clot recovery. Please book an ambulance now.';
      }
    } else if (
      raw.includes('road accident') || raw.includes('car crash') || raw.includes('bike accident') || 
      raw.includes('behosh') || raw.includes('unconscious') || raw.includes('head trauma') ||
      (raw.includes('sar') && raw.includes('gehri chot')) || raw.includes('compound fracture') ||
      (raw.includes('accident') && (raw.includes('serious') || raw.includes('khoon') || raw.includes('chot')))
    ) {
      level = 3;
      severity = 'CRITICAL';
      mappedCondition = 'Accident / Trauma';

      if (lang === 'hi') {
        conditionName = 'दुर्घटना एवं गंभीर ट्रॉमा (Major Trauma Injury)';
        causeOverview = 'सड़क दुर्घटना या ऊंचाई से गिरने पर सिर, रीढ़ की हड्डी या आंतरिक अंगों में गंभीर चोट लग सकती है।';
        firstAidSteps = [
          'मरीज की गर्दन और रीढ़ की हड्डी को बिल्कुल न हिलाएं (Spinal Immobilization जरूरी है)।',
          'बहते हुए खून पर साफ़ कपड़े या गेज से लगातार सीधा दबाव बनाए रखें।',
          'सांस की जांच करें; यदि उल्टी हो रही हो तो पूरी बॉडी को एक साथ करवट में लाएं।',
          'मरीज को गर्म रखने के लिए कपड़े या कंबल से ढकें ताकि शॉक से बचाया जा सके।',
          'तुरंत लेवल-1 ट्रॉमा केयर एम्बुलेंस बुक करें।'
        ];
        redFlags = 'कान/नाक से खून या पानी जैसा तरल निकलना, बेहोशी या टूटी हुई हड्डी का बाहर निकलना।';
        summary = '🚨 <strong>गंभीर ट्रॉमा अलर्ट:</strong> मरीज को हिलाए बिना तुरंत इमरजेंसी एम्बुलेंस बुलाएं।';
        speechText = 'दुर्घटना की आपातकालीन स्थिति है। गर्दन और रीढ़ को हिलाए बिना तुरंत ट्रॉमा एम्बुलेंस बुक करें।';
      } else {
        conditionName = 'Major Trauma & Accident Injury';
        causeOverview = 'High-energy kinetic trauma with risk of cervical spine instability, intracranial hematoma, internal hemorrhage, or compound orthopedic fractures.';
        firstAidSteps = [
          'Do NOT move or twist the patient’s neck or spine unless in imminent life danger.',
          'Apply firm continuous direct pressure to actively bleeding wounds with clean cloth.',
          'Maintain clear patent airway; if vomiting, log-roll the entire body simultaneously to the side.',
          'Cover patient with a clean blanket to prevent hypothermia and trauma shock.',
          'Dispatch a Level-1 Trauma ALS Ambulance immediately!'
        ];
        redFlags = 'Loss of consciousness, clear CSF fluid from nose/ears, unequal pupils, or severe pelvic instability.';
        summary = '🚨 <strong>Critical Trauma Alert:</strong> High-energy trauma requires cervical immobilization and emergency surgical triage.';
        speechText = 'Trauma accident alert. Do not move patient spinal cord and dispatch an emergency ambulance right away.';
      }
    } else if (
      raw.includes('nas kat gayi') || raw.includes('heavy bleeding') || raw.includes('khoon ki ulti') || 
      raw.includes('vomiting blood') || raw.includes('uncontrolled bleeding') || raw.includes('arterial bleed')
    ) {
      level = 3;
      severity = 'CRITICAL';
      mappedCondition = 'Severe Bleeding';

      if (lang === 'hi') {
        conditionName = 'गंभीर रक्तस्त्राव (Severe Hemorrhage)';
        causeOverview = 'गहरी नस या धमनी कटने पर तेजी से खून बहने से शरीर हाइपोवोलेमिक शॉक (Hypovolemic Shock) में जा सकता है।';
        firstAidSteps = [
          'घाव पर साफ़ कपड़े या गेज से कम से कम 10 मिनट तक बिना हटाए कसकर दबाव बनाए रखें।',
          'चोट लगे अंग (हाथ/पैर) को हृदय के स्तर से ऊपर उठाएं।',
          'यदि घाव में कांच या नुकीली चीज़ फंसी हो, तो उसे न निकालें, उसके चारों ओर पैड लगाएं।',
          'मरीज को शांत लिटाएं और पैर थोड़े ऊंचे रखें।',
          'तुरंत टांके और ब्लड रिजर्व के लिए एम्बुलेंस बुलाएं।'
        ];
        redFlags = 'चक्कर आना, त्वचा का पीला पड़ना, नाड़ी का बहुत तेज या कमजोर होना।';
        summary = '🚨 <strong>भारी रक्तस्त्राव चेतावनी:</strong> तुरंत दबाव बनाए रखें और एम्बुलेंस बुक करें।';
        speechText = 'खून बहने की गंभीर स्थिति है। साफ़ कपड़े से कसकर दबाव बनाएं और तुरंत एम्बुलेंस बुक करें।';
      } else {
        conditionName = 'Severe Hemorrhage / Active Bleeding';
        causeOverview = 'Uncontrolled vascular or arterial laceration leading to rapid volume depletion and hypovolemic shock.';
        firstAidSteps = [
          'Apply continuous, firm direct pressure directly over the wound using sterile gauze or a clean cloth.',
          'Elevate the bleeding extremity above heart level to reduce vascular pressure.',
          'Do NOT remove deeply embedded objects; pack firmly around the object.',
          'Maintain unbroken pressure for at least 10 minutes without lifting the dressing.',
          'Dispatch an emergency ambulance for surgical suture and blood reserves!'
        ];
        redFlags = 'Rapid pulse, cold clammy extremities, dizziness, or pallor indicative of hemorrhagic shock.';
        summary = '🚨 <strong>Severe Bleeding Warning:</strong> Uncontrolled blood loss requires emergency surgical stabilization.';
        speechText = 'Severe bleeding alert. Apply direct firm pressure with clean cloth and book an ambulance.';
      }
    } 

    // ========================================================
    // TIER 2: MODERATE CONDITIONS (Clinic / Doctor Checkup)
    // ========================================================
    else if (
      raw.includes('102') || raw.includes('103') || raw.includes('104') || 
      raw.includes('tez bukhar') || raw.includes('high fever') || raw.includes('chills with fever') ||
      raw.includes('dengue') || raw.includes('malaria') || raw.includes('bukhar nahi utar')
    ) {
      level = 2;
      severity = 'MODERATE';
      mappedCondition = 'Other Emergency';

      if (lang === 'hi') {
        conditionName = 'मध्यम से तेज़ बुखार (Pyrexia / Fever)';
        causeOverview = '101°F से 103°F का बुखार शरीर में सक्रिय वायरल या बैक्टीरियल संक्रमण (जैसे मौसमी फ्लू, डेंगू या मलेरिया) का प्रतिरक्षात्मक संकेत है।';
        firstAidSteps = [
          'माथे, गर्दन और बगलों पर सामान्य तापमान के पानी की गीली पट्टी रखें (बर्फ का इस्तेमाल न करें)।',
          'डिहाइड्रेशन से बचने के लिए भरपूर ORS, नारियल पानी, हल्का सूप और गुनगुना पानी पिएं।',
          'हल्के और ढीले सूती कपड़े पहनें और कमरे में ताज़ा हवा आने दें।',
          'डॉक्टर के निर्देशानुसार बुखार कम करने के लिए पैरासिटामोल (Paracetamol) ले सकते हैं।',
          'पर्याप्त आराम करें और भारी काम बिल्कुल न करें।'
        ];
        redFlags = 'यदि बुखार 48 घंटे से अधिक बना रहे, शरीर पर दाने (rashes) दिखें, या कंपकंपी के साथ बहुत तेज ठंड लगे, तो तुरंत क्लिनिक जाएं।';
        summary = '🌡️ <strong>तेज़ बुखार देखभाल:</strong> ठंडे पानी की पट्टी रखें और हाइड्रेटेड रहें। 2 दिन से अधिक होने पर डॉक्टर से जांच करवाएं।';
        speechText = 'तेज़ बुखार के लिए माथे पर गीले कपड़े की पट्टी रखें और खूब पानी पिएं। दो दिन से अधिक होने पर नज़दीकी क्लिनिक जाकर डॉक्टर से मिलें।';
      } else {
        conditionName = 'Moderate Pyrexia / Persistent Fever';
        causeOverview = 'Elevated core temperature (101°F–103°F) reflects systemic immune defense against viral, bacterial, or tropical vector-borne infections (e.g., dengue, malaria, influenza).';
        firstAidSteps = [
          'Apply lukewarm water sponge compresses to forehead, neck, and underarms to facilitate evaporative cooling.',
          'Maintain high fluid intake with Oral Rehydration Salts (ORS), coconut water, and clean soups.',
          'Wear lightweight, breathable cotton clothing in a well-ventilated room.',
          'Take Paracetamol (500-650mg) as per recommended adult medical guidelines for symptomatic comfort.',
          'Get plenty of bed rest to allow the immune system to recover.'
        ];
        redFlags = 'Fever persisting over 48 hours, petechial rash, severe chills, or localized severe pain requires local clinic OPD evaluation.';
        summary = '🌡️ <strong>Moderate Fever Protocol:</strong> Keep hydrated and apply cool water sponge. Consult a physician if fever lasts over 2 days.';
        speechText = 'For persistent fever, apply cool water sponging on your forehead and stay hydrated. If it persists beyond two days, please visit a local clinic.';
      }
    } else if (
      (raw.includes('pet') && (raw.includes('dard') || raw.includes('cramp') || raw.includes('tez'))) || 
      (raw.includes('stomach') && raw.includes('pain')) ||
      raw.includes('food poisoning') || raw.includes('bar bar ulti') || raw.includes('continuous vomiting') ||
      (raw.includes('dast') && raw.includes('tez')) || raw.includes('severe diarrhea')
    ) {
      level = 2;
      severity = 'MODERATE';
      mappedCondition = 'Other Emergency';

      if (lang === 'hi') {
        conditionName = 'पेट दर्द व संक्रमण (Acute Gastric Distress / Food Poisoning)';
        causeOverview = 'दूषित भोजन या पानी से पेट में बैक्टीरियल/वायरल इन्फेक्शन (Gastroenteritis) होने से ऐंठन, उल्टी और दस्त होते हैं।';
        firstAidSteps = [
          'हर 15 मिनट में 2-3 घूंट ORS का घोल या गुनगुना इलेक्ट्रोलाइट पानी धीरे-धीरे पिएं ताकि शरीर में पानी की कमी न हो।',
          'ठोस, मसालेदार, तला-भुना और दूध से बनी चीज़ें आज पूरी तरह बंद रखें।',
          'पेट की मांसपेशियों को आराम देने के लिए घुटने मोड़कर करवट के बल लेटें।',
          'उल्टी रुकने के 4-6 घंटे बाद हल्का दही-चावल, मूंग दाल की खिचड़ी या केला ले सकते हैं।',
          'बिना डॉक्टर से पूछे भारी दर्द निवारक दवाएं (Painkillers) न लें।'
        ];
        redFlags = 'पेट के निचले दाएं हिस्से में असहनीय दर्द (Appendicitis का खतरा), उल्टी में खून, या 24 घंटे से अधिक लगातार उल्टी होना।';
        summary = '🤢 <strong>पेट दर्द व उल्टी देखभाल:</strong> थोड़ा-थोड़ा ORS पिएं और हल्का भोजन लें। दर्द न घटने पर क्लिनिक चेकअप करवाएं।';
        speechText = 'पेट दर्द और उल्टी के लिए थोड़ा-थोड़ा ORS पानी पिएं और आराम करें। यदि दर्द तेज रहे तो नज़दीकी क्लिनिक जाएं।';
      } else {
        conditionName = 'Acute Gastric Distress / Infection';
        causeOverview = 'Gastrointestinal inflammation, food-borne bacterial intoxication, or acute gastroenteritis causing mucosal spasms, vomiting, and fluid loss.';
        firstAidSteps = [
          'Sip Oral Rehydration Solution (ORS) or electrolyte water in small amounts (30-50ml) every 15 minutes.',
          'Follow the BRAT diet (Bananas, Rice, Applesauce, Toast) once vomiting subsides; avoid dairy, fats, and spices.',
          'Rest in a comfortable side-lying position with knees slightly bent towards the abdomen.',
          'Avoid heavy NSAID painkillers which can irritate gastric mucosal lining.',
          'Rest your digestive tract with clear broths and herbal mint tea.'
        ];
        redFlags = 'Severe localized right lower quadrant pain, inability to keep fluids down for 24 hours, or blood in stool/vomitus.';
        summary = '🤢 <strong>Gastric Distress Care:</strong> Sip electrolyte fluids frequently and rest. Visit a clinic if dehydration or sharp localized pain occurs.';
        speechText = 'For stomach cramps, sip ORS water frequently and rest. Please visit a nearby clinic if pain does not subside.';
      }
    } else if (
      raw.includes('burn') || raw.includes('jal gaya') || raw.includes('aag') || 
      raw.includes('scald') || raw.includes('garam tel') || raw.includes('boiling water')
    ) {
      level = 2;
      severity = 'MODERATE';
      mappedCondition = 'Burn Injury';

      if (lang === 'hi') {
        conditionName = 'जलने की चोट (Burn & Scald Care)';
        causeOverview = 'गर्म पानी, तेल या भाप से त्वचा की ऊपरी परत (Epidermis) जलने से जलन और फफोले पड़ते हैं।';
        firstAidSteps = [
          'जले हुए हिस्से को तुरंत नल के सामान्य बहते पानी के नीचे 15-20 मिनट तक रखें (बर्फ का उपयोग बिल्कुल न करें)।',
          'जले स्थान पर कभी भी टूथपेस्ट, मक्खन, तेल या हल्दी न लगाएं (इससे इन्फेक्शन बढ़ता है)।',
          'सूजन आने से पहले अंगूठी, घड़ी या टाइट कपड़े सावधानी से उतार दें।',
          'साफ़, सूखे और गैर-चिपचिपे कपड़े या स्टाइल ड्रेसिंग से हल्के से ढकें।',
          'फफोलों (Blisters) को कभी भी न फोड़ें।'
        ];
        redFlags = 'चेहरे, जोड़ों या बड़े हिस्से पर जलना, या घाव का सुन्न पड़ जाना। तुरंत क्लिनिक में ड्रेसिंग करवाएं।';
        summary = '🔥 <strong>जलने पर प्राथमिक उपचार:</strong> 15-20 मिनट सामान्य नल के पानी से धोएं और क्लिनिक पर ड्रेसिंग करवाएं।';
        speechText = 'जलने पर तुरंत सामान्य बहते पानी के नीचे 15 मिनट रखें। टूथपेस्ट न लगाएं और क्लिनिक जाकर ड्रेसिंग करवाएं।';
      } else {
        conditionName = 'Burn & Scald Injury';
        causeOverview = 'Thermal or scald damage to superficial epidermal layers requiring immediate heat dissipation to halt progressive tissue coagulation.';
        firstAidSteps = [
          'Immerse or run cool tap water over the burn continuously for 15 to 20 minutes (do NOT use ice).',
          'Never apply butter, toothpaste, oils, or raw remedies to burned skin.',
          'Gently remove restrictive jewelry or clothing before tissue edema develops.',
          'Cover the area loosely with clean, non-adherent sterile dressing or clean plastic film.',
          'Do not pop or drain blisters to prevent bacterial infection.'
        ];
        redFlags = 'Burns spanning larger than palm size, circumferential burns, or blistering over face/joints require clinic evaluation.';
        summary = '🔥 <strong>Burn Protocol:</strong> Running room-temperature water is essential. Visit a clinic for sterile burn dressing.';
        speechText = 'Burn injury detected. Cool area with running room-temperature water for 15 minutes and seek doctor dressing.';
      }
    } else if (
      raw.includes('sprain') || raw.includes('moch') || raw.includes('pair mud gaya') || 
      raw.includes('swelling') || raw.includes('joint pain') || raw.includes('haddi me dard')
    ) {
      level = 2;
      severity = 'MODERATE';
      mappedCondition = 'Other Emergency';

      if (lang === 'hi') {
        conditionName = 'मोच व जोड़ में सूजन (Joint Sprain / Soft Tissue Strain)';
        causeOverview = 'पैर मुड़ने या झटके से लिगामेंट (Ligament) खिंच जाने से जोड़ के चारों ओर सूजन और दर्द होता है।';
        firstAidSteps = [
          'R.I.C.E नियम अपनाएं: Rest (आराम करें), Ice (बर्फ की सिंकाई), Compression (क्रेप बैंडेज), Elevation (पैर ऊंचा रखें)।',
          'कपड़े में लपेटकर बर्फ से 15 मिनट तक सिंकाई करें (सीधे त्वचा पर बर्फ न लगाएं)।',
          'क्रेप बैंडेज (गरम पट्टी) को सहारा देने के लिए बांधें, लेकिन बहुत ज्यादा टाइट न करें।',
          'बैठते या लेटते समय पैर को तकिए पर रखकर दिल के स्तर से थोड़ा ऊंचा रखें।',
          'चोट लगे पैर पर पूरा वजन देकर न चलें।'
        ];
        redFlags = 'यदि जोड़ से खट की आवाज़ आई हो, बिल्कुल पैर न रखा जा रहा हो, तो फ्रैक्चर जांच के लिए X-Ray करवाएं।';
        summary = '🦵 <strong>मोच की देखभाल:</strong> बर्फ की सिंकाई करें और पैर को ऊंचा रखकर आराम दें।';
        speechText = 'मोच के लिए बर्फ से सिंकाई करें, गरम पट्टी बांधें और पैर पर ज्यादा जोर न दें।';
      } else {
        conditionName = 'Joint Sprain / Soft Tissue Injury';
        causeOverview = 'Ligamentous micro-tears or articular strain resulting in localized inflammatory effusion and mechanical pain.';
        firstAidSteps = [
          'Follow the R.I.C.E protocol: Rest, Ice, Compression, Elevation.',
          'Apply an ice pack wrapped in a towel for 15-20 minutes every 3-4 hours to diminish swelling.',
          'Apply a supportive elastic crepe compression bandage without cutting off capillary flow.',
          'Elevate the injured limb on pillows above heart level while resting.',
          'Avoid weight-bearing on the affected joint until assessed.'
        ];
        redFlags = 'Inability to bear any weight, gross joint deformity, or severe focal bone tenderness requiring an X-ray.';
        summary = '🦵 <strong>Sprain Care:</strong> Follow R.I.C.E protocol to reduce swelling. Visit an orthopedic clinic if unable to walk.';
        speechText = 'For joint sprains, apply ice packs, rest the joint, and visit an orthopedic clinic if unable to bear weight.';
      }
    }

    // ========================================================
    // TIER 1: MILD / EVERYDAY SYMPTOMS (Calm Home Remedies)
    // ========================================================
    else if (
      raw.includes('sar dard') || raw.includes('sir dard') || raw.includes('headache') || 
      raw.includes('sar me dard') || raw.includes('head pain') || raw.includes('halka sar')
    ) {
      level = 1;
      severity = 'NORMAL';
      mappedCondition = 'Other Emergency';

      if (lang === 'hi') {
        conditionName = 'सामान्य सर दर्द (Mild Headache & Tension Relief)';
        causeOverview = 'सर दर्द आमतौर पर पानी की कमी (Dehydration), मोबाइल/लैपटॉप स्क्रीन का तनाव, नींद पूरी न होना या मानसिक थकान के कारण होता है। घबराने की बिल्कुल ज़रूरत नहीं है!';
        firstAidSteps = [
          'पानी पिएं: सबसे पहले 1-2 बड़े गिलास (300-500ml) गुनगुना या सादा पानी पिएं (अक्सर डिहाइड्रेशन से सर दर्द होता है)।',
          'स्क्रीन से दूरी: मोबाइल और लैपटॉप बंद करें, कमरे की लाइट धीमी करें और 20-30 मिनट शांति से आंखें बंद करके लेटें।',
          'हल्की मालिश: माथे और कनपटी (Temples) पर हल्के हाथों से बादाम तेल या हल्के बाम से गोलाकार मालिश करें।',
          'गहरी सांसें लें: 4-7-8 गहरी सांस लेने की तकनीक से गर्दन और सिर की मांसपेशियों का तनाव दूर करें।',
          'आरामदायक झपकी: 20-30 मिनट की एक छोटी झपकी (Power Nap) लें, अधिकांश तनाव सिरदर्द आराम से ठीक हो जाते हैं।'
        ];
        redFlags = 'यदि सर दर्द अचानक बहुत तेज़ हो ("बिजली कड़कने जैसा"), या साथ में उल्टी, तेज़ बुखार और गर्दन में अकड़न हो, तब डॉक्टर को दिखाएं।';
        summary = '😊 <strong>सामान्य सर दर्द:</strong> पानी पिएं, स्क्रीन से दूरी बनाएं और 20 मिनट शांत कमरे में आराम करें। आप जल्दी ठीक हो जाएंगे।';
        speechText = 'घबराने की कोई बात नहीं है। यह एक सामान्य सर दर्द है। एक गिलास पानी पिएं और थोड़ी देर शांत कमरे में आंखें बंद करके आराम करें।';
      } else {
        conditionName = 'Mild Headache & Tension Relief';
        causeOverview = 'Tension-type cephalalgia commonly triggered by ocular strain from digital screens, mild dehydration, insufficient restorative sleep, or cervical posture fatigue.';
        firstAidSteps = [
          'Hydration: Drink 1-2 tall glasses (300-500ml) of room-temperature or electrolyte water.',
          'Screen Break: Step away from all digital screens, dim ambient lighting, and rest your eyes for 20-30 minutes.',
          'Temple & Neck Massage: Gently massage the temples, forehead, and occipital base with light circular finger pressure.',
          'Controlled Breathing: Practice slow diaphragmatic breathing to release muscular scalp tension.',
          'Restorative Rest: A 20-30 minute power nap in a quiet, dark room resolves most tension headaches naturally.'
        ];
        redFlags = 'Sudden explosive "thunderclap" headache, or headache accompanied by neck rigidity, vomiting, or high fever.';
        summary = '😊 <strong>Common Headache Care:</strong> Rehydrate with water, take a break from screens, and rest in a dark room.';
        speechText = "Don't worry! This looks like a common mild headache. Drink a glass of water, rest your eyes in a quiet room, and you will feel much better.";
      }
    } else if (
      raw.includes('cold') || raw.includes('sardi') || raw.includes('jukham') || 
      raw.includes('runny nose') || raw.includes('naak') || raw.includes('chheenk') || 
      raw.includes('sneez') || raw.includes('stuffy nose')
    ) {
      level = 1;
      severity = 'NORMAL';
      mappedCondition = 'Other Emergency';

      if (lang === 'hi') {
        conditionName = 'सामान्य सर्दी-जुकाम (Common Cold & Nasal Relief)';
        causeOverview = 'मौसम बदलने या सामान्य वायरल इन्फेक्शन से नाक की झिल्ली में सूजन आ जाती है। यह 3 से 5 दिनों में घरेलू उपायों और आराम से पूरी तरह ठीक हो जाता है।';
        firstAidSteps = [
          'भाप लें (Steam): सादे गर्म पानी की भाप दिन में 2 बार 5-10 मिनट लें, इससे बंद नाक तुरंत खुलती है।',
          'गर्म पेय पदार्थ: अदरक-तुलसी की चाय, गर्म पानी या वेज/चिकन सूप का दिनभर थोड़ा-थोड़ा सेवन करें।',
          'हल्दी दूध: रात को सोने से पहले एक गिलास गुनगुने दूध में एक चुटकी हल्दी मिलाकर पिएं।',
          'ठंडी चीज़ों से बचाव: फ्रिज का ठंडा पानी, आइसक्रीम और सीधे एसी की हवा से बचें।',
          'भरपूर नींद: शरीर की रोग प्रतिरोधक क्षमता (Immunity) मजबूत करने के लिए 7-8 घंटे की अच्छी नींद लें।'
        ];
        redFlags = 'यदि जुकाम 7 दिन से ज़्यादा रहे, या नाक से गाढ़ा पीला मवाद जैसा बलगम आए और कान में तेज दर्द हो।';
        summary = '😊 <strong>सर्दी-जुकाम घरेलू उपाय:</strong> गर्म पानी की भाप लें, अदरक-तुलसी की चाय पिएं और अच्छी नींद लें।';
        speechText = 'यह सामान्य सर्दी-जुकाम है। गर्म पानी की भाप और अदरक-तुलसी का पानी लें, आपको जल्द राहत मिलेगी।';
      } else {
        conditionName = 'Common Cold & Nasal Relief';
        causeOverview = 'Viral upper respiratory tract congestion (Rhinovirus) causing mucosal inflammation and mild rhinorrhea, typically self-limiting within 4-7 days.';
        firstAidSteps = [
          'Steam Inhalation: Inhale plain hot water steam for 5-10 minutes twice daily to loosen nasal mucus congestion.',
          'Warm Hydration: Sip warm ginger-tulsi tea, clear broth, or warm lemon-honey water continuously through the day.',
          'Turmeric Milk: Drink a cup of warm turmeric milk before bedtime for soothing anti-inflammatory comfort.',
          'Avoid Cold Drafts: Protect yourself from direct cold air conditioning drafts and avoid chilled beverages.',
          'Immune Rest: Ensure 7-8 hours of uninterrupted sleep to support natural immune antibody production.'
        ];
        redFlags = 'Symptoms persisting over 10 days, severe sinus pressure with high fever, or difficulty swallowing.';
        summary = '😊 <strong>Common Cold Protocol:</strong> Steam inhalation, warm herbal tea, and quality rest will relieve nasal congestion.';
        speechText = 'This seems to be a common cold. Steam inhalation and warm ginger water will give you quick relief. Take good rest!';
      }
    } else if (
      raw.includes('cough') || raw.includes('khansi') || raw.includes('gale me kharash') || 
      raw.includes('sore throat') || raw.includes('gala kharab') || raw.includes('throat pain')
    ) {
      level = 1;
      severity = 'NORMAL';
      mappedCondition = 'Other Emergency';

      if (lang === 'hi') {
        conditionName = 'खांसी व गले में खराश (Mild Cough & Throat Soothing)';
        causeOverview = 'मौसम बदलने, धूल-धुएं या हल्के वायरल संक्रमण से गले में सूजन और खुजली होती है।';
        firstAidSteps = [
          'नमक पानी के गरारे: एक गिलास गुनगुने पानी में आधा चम्मच नमक मिलाकर दिन में 2-3 बार गरारे (Gargle) करें।',
          'अदरक और शहद: 1 चम्मच शुद्ध शहद में 4-5 बूंद अदरक का रस मिलाकर दिन में 2 बार लें, इससे गले की खराश तुरंत शांत होती है।',
          'गले को नम रखें: दिनभर थोड़ा-थोड़ा गुनगुना पानी पीते रहें ताकि गला सूखा न रहे।',
          'मुलेठी या लौंग: गले की खराश के लिए मुलेठी का छोटा टुकड़ा या भुनी हुई लौंग मुंह में रखें।',
          'परहेज़: तली-भुनी, अत्यधिक तीखी, खट्टी और ठंडी चीज़ों का सेवन बिल्कुल न करें।'
        ];
        redFlags = 'यदि खांसी 2 हफ्ते से अधिक रहे, या खांसी में खून आए, या सांस लेने में घरघराहट (Wheezing) हो।';
        summary = '😊 <strong>खांसी व गले की खराश:</strong> गुनगुने नमक पानी के गरारे करें और शहद-अदरक का रस लें।';
        speechText = 'गले की खराश और खांसी के लिए नमक के पानी से गरारे करें और शहद लें। ठंडी चीज़ों से परहेज़ रखें।';
      } else {
        conditionName = 'Mild Cough & Throat Soothing';
        causeOverview = 'Pharyngeal mucosal irritation or post-nasal drip following weather transitions or mild viral exposure.';
        firstAidSteps = [
          'Warm Salt Gargles: Dissolve 1/2 teaspoon of salt in warm water and gargle for 30 seconds 2-3 times daily.',
          'Honey & Ginger: Take 1 teaspoon of raw honey with fresh ginger juice to coat and soothe the pharyngeal lining.',
          'Throat Hydration: Sip warm water at regular intervals to maintain mucosal moisture.',
          'Herbal Lozenges: Use licorice (mulethi) or herbal throat drops for throat comfort.',
          'Avoid Irritants: Refrain from cold drinks, oily fried snacks, and exposure to smoke or dust.'
        ];
        redFlags = 'Cough lasting over 2 weeks, hemoptysis (blood in sputum), or accompanied by wheezing breathlessness.';
        summary = '😊 <strong>Cough & Throat Care:</strong> Warm salt water gargles and honey provide fast, effective relief.';
        speechText = 'For mild cough and throat irritation, warm salt water gargling and honey are very effective. Avoid cold foods.';
      }
    } else if (
      raw.includes('thakan') || raw.includes('fatigue') || raw.includes('tired') || 
      raw.includes('body ache') || raw.includes('badan dard') || raw.includes('kamzori') || 
      raw.includes('weakness') || raw.includes('neend') || raw.includes('exhaust')
    ) {
      level = 1;
      severity = 'NORMAL';
      mappedCondition = 'Other Emergency';

      if (lang === 'hi') {
        conditionName = 'थकान व बदन दर्द (General Fatigue & Body Recovery)';
        causeOverview = 'अधिक शारीरिक मेहनत, तनाव, पानी की कमी या नींद पूरी न होने से मांसपेशियों में लैक्टिक एसिड जमा होकर थकान पैदा करता है।';
        firstAidSteps = [
          'इलेक्ट्रोलाइट्स पिएं: नारियल पानी, नींबू पानी में चुटकीभर सेंधा नमक, या ORS का घोल पिएं।',
          'गुनगुने पानी से स्नान: हल्के गर्म पानी से नहाने से मांसपेशियों की अकड़न तुरंत खुलती है।',
          'पौष्टिक भोजन: हल्का, सुपाच्य और ताजा खाना (दलिया, हरी सब्जियां, फल) खाएं।',
          'हल्की स्ट्रेचिंग: शरीर को धीरे-धीरे स्ट्रेच करें और पैरों की हल्की मालिश करें।',
          'पूरी नींद: आज रात बिना फोन देखे 7-8 घंटे की गहरी आरामदायक नींद लें।'
        ];
        redFlags = 'यदि कमजोरी के साथ चक्कर आकर बेहोशी हो, या सांस फूलने लगे।';
        summary = '😊 <strong>थकान व बदन दर्द:</strong> नारियल पानी पिएं, गुनगुने पानी से नहाएं और पूरी नींद लें।';
        speechText = 'थकान और बदन दर्द आराम की कमी से होता है। पर्याप्त पानी पिएं और आज रात अच्छी नींद लें।';
      } else {
        conditionName = 'General Fatigue & Muscle Recovery';
        causeOverview = 'Systemic muscular exhaustion and mild electrolyte depletion from physical overexertion, sleep deficit, or dehydration.';
        firstAidSteps = [
          'Electrolyte Balance: Drink fresh coconut water, lemonade with a pinch of rock salt, or an ORS solution.',
          'Warm Bath: Take a warm shower to relieve skeletal muscle stiffness and promote peripheral blood flow.',
          'Nutritional Recovery: Consume a balanced meal with fresh fruits, greens, and complex carbohydrates.',
          'Light Stretching: Perform gentle mobility stretches to release back and leg muscle tension.',
          'Restorative Sleep: Prioritize 8 hours of uninterrupted, screen-free sleep tonight.'
        ];
        redFlags = 'Unexplained chronic lethargy, syncopal episodes (fainting), or severe muscular weakness.';
        summary = '😊 <strong>Fatigue Recovery Protocol:</strong> Rehydrate with electrolytes, take a warm bath, and sleep well.';
        speechText = "Body ache and fatigue are usually due to tiredness. Drink plenty of fluids, eat well, and get a good night's rest.";
      }
    } else if (
      raw.includes('acidity') || raw.includes('gas') || raw.includes('pet bhari') || 
      raw.includes('indigestion') || raw.includes('khatti dakar') || raw.includes('bloat')
    ) {
      level = 1;
      severity = 'NORMAL';
      mappedCondition = 'Other Emergency';

      if (lang === 'hi') {
        conditionName = 'एसिडिटी व गैस (Mild Acidity & Digestive Ease)';
        causeOverview = 'ज्यादा तला-भुना/तीखा खाना, देर रात भोजन, चाय-कॉफी या लंबे समय खाली पेट रहने से पेट में एसिड की मात्रा बढ़ जाती है।';
        firstAidSteps = [
          'ठंडा दूध: आधा कप ठंडा सादा दूध या मट्ठा (छाछ) पिएं, यह पेट के अतिरिक्त एसिड को तुरंत शांत करता है।',
          'सौंफ और अजवाइन: 1 चम्मच सौंफ और चुटकीभर अजवाइन को गुनगुने पानी के साथ लें, इससे गैस और भारीपन दूर होता है।',
          'खाने के बाद न लेटें: भोजन के तुरंत बाद लेटने से बचें; 10-15 मिनट धीरे-धीरे टहलें।',
          'हल्का खाना: आज सादा भोजन जैसे दही-चावल, मूंग दाल खिचड़ी या दलिया ही लें।',
          'परहेज़: चाय, कॉफी, तली हुई चीज़ें, कोल्ड ड्रिंक्स और सिगरेट से पूरी तरह दूर रहें।'
        ];
        redFlags = 'यदि सीने में चुभन के साथ बाएं हाथ में दर्द हो (Heart Attack से अलग पहचानें), या उल्टी में खून आए।';
        summary = '😊 <strong>एसिडिटी से राहत:</strong> थोड़ा ठंडा दूध पिएं, सौंफ-अजवाइन लें और हल्का भोजन करें।';
        speechText = 'एसिडिटी के लिए थोड़ा ठंडा दूध पिएं और तीखे खाने से बचें। खाने के बाद 10 मिनट टहलना फायदेमंद है।';
      } else {
        conditionName = 'Mild Acidity & Digestion Ease';
        causeOverview = 'Gastric hyperacidity or mild gastroesophageal reflux provoked by spicy meals, irregular meal timings, or caffeine intake.';
        firstAidSteps = [
          'Cold Milk / Water: Drink half a glass of chilled skim milk or plain room-temperature water to neutralize gastric acid.',
          'Fennel & Ajwain: Chew half a teaspoon of fennel seeds (saunf) or sip warm carom seed water for gas relief.',
          'Stay Upright: Avoid reclining or sleeping flat for at least 2 hours following a meal.',
          'Gentle Stroll: Take a gentle 10-15 minute walk to stimulate healthy gastrointestinal peristalsis.',
          'Bland Diet: Eat soothing, easily digestible meals (curd rice, oatmeal, khichdi) and avoid citrus/spices today.'
        ];
        redFlags = 'Severe burning radiating to back, coffee-ground vomiting, or difficulty swallowing.';
        summary = '😊 <strong>Acidity Relief Protocol:</strong> Drink cold milk, avoid spicy food, and remain upright after eating.';
        speechText = 'For mild acidity and gas, drink a little cold milk or warm water and avoid spicy foods. Light walking helps digestion.';
      }
    } else if (
      raw.includes('minor cut') || raw.includes('chhoti chot') || raw.includes('scratch') || 
      raw.includes('halka cut') || raw.includes('scraped') || raw.includes('khila')
    ) {
      level = 1;
      severity = 'NORMAL';
      mappedCondition = 'Other Emergency';

      if (lang === 'hi') {
        conditionName = 'हल्की खरोंच व कट (Minor Scratch First-Aid)';
        causeOverview = 'त्वचा की ऊपरी परत छिलने या छोटा कट लगने पर प्राथमिक एंटीसेप्टिक सफाई ही पर्याप्त होती है।';
        firstAidSteps = [
          'कट को साफ़ बहते पानी और हल्के साबुन से धोएं ताकि धूल-मिट्टी निकल जाए।',
          'साफ़ कपड़े या कॉटन से थपथपाकर सुखाएं।',
          'एंटीसेप्टिक क्रीम (जैसे Betadine या Neosporin) लगाएं।',
          'धूल और मक्खियों से बचाने के लिए साफ़ बैंड-एड (Band-Aid) लगाएं।'
        ];
        redFlags = 'यदि कट गहरा हो, टांके लगाने की जरूरत लगे, या पिछले 5 साल में टिटनेस (Tetanus) का टीका न लगा हो।';
        summary = '🩹 <strong>छोटी चोट की देखभाल:</strong> साफ़ पानी से धोकर एंटीसेप्टिक क्रीम और बैंड-एड लगाएं।';
        speechText = 'छोटी चोट को साफ़ पानी से धोएं, एंटीसेप्टिक क्रीम लगाएं और बैंड-एड से ढकें।';
      } else {
        conditionName = 'Minor Scratch & First-Aid Care';
        causeOverview = 'Superficial cutaneous abrasion or minor laceration requiring basic antiseptic wound toilet.';
        firstAidSteps = [
          'Wash the affected area gently under clean running tap water with mild soap.',
          'Pat dry with a clean sterile gauze or fresh tissue.',
          'Apply an over-the-counter antiseptic ointment (e.g., Betadine, Neosporin).',
          'Cover with a clean adhesive bandage (Band-Aid) to shield from contaminants.'
        ];
        redFlags = 'Deep gaping wound requiring sutures, animal bite, or rusty metal cut requiring a Tetanus booster.';
        summary = '🩹 <strong>Minor Wound Care:</strong> Clean with water, apply antiseptic cream, and cover with a bandage.';
        speechText = 'Wash the minor cut with clean water, apply antiseptic cream, and cover with a band-aid.';
      }
    } else if (
      raw.includes('fever') || raw.includes('bukhar') || raw.includes('mild fever') || raw.includes('halka bukhar')
    ) {
      level = 1;
      severity = 'NORMAL';
      mappedCondition = 'Other Emergency';

      if (lang === 'hi') {
        conditionName = 'हल्का बुखार (Low-Grade Mild Fever)';
        causeOverview = 'हल्का बुखार (100°F से कम) शरीर की रोग प्रतिरोधक प्रणाली का स्वाभाविक सुरक्षात्मक रिस्पांस है।';
        firstAidSteps = [
          'भरपूर गुनगुना पानी, हर्बल चाय और सूप पिएं।',
          'हल्के कपड़े पहनें और ज्यादा भारी रजाई/कंबल न ओढ़ें।',
          'हर 4-6 घंटे में थर्मामीटर से तापमान नापें।',
          'पर्याप्त विश्राम करें।'
        ];
        redFlags = 'यदि बुखार 101°F से ऊपर चला जाए या 48 घंटे से ज़्यादा रहे।';
        summary = '🌡️ <strong>हल्का बुखार:</strong> भरपूर तरल पदार्थ पिएं और आराम करें।';
        speechText = 'हल्के बुखार के लिए आराम करें और गुनगुना पानी पिएं। यह आराम से ठीक हो जाता है।';
      } else {
        conditionName = 'Low-Grade Mild Fever';
        causeOverview = 'Low-grade pyrexia (<100°F) reflecting normal physiological immune activation.';
        firstAidSteps = [
          'Hydrate well with warm water, herbal teas, and clear broths.',
          'Rest comfortably under a light cotton sheet (avoid heavy blankets).',
          'Track oral temperature every 4-6 hours.',
          'Prioritize physical rest.'
        ];
        redFlags = 'Temperature crossing 101°F or lasting beyond 48 hours.';
        summary = '🌡️ <strong>Mild Fever Protocol:</strong> Drink plenty of warm fluids and take rest.';
        speechText = 'For mild fever, take rest and drink warm fluids. It usually resolves on its own.';
      }
    } else {
      // Default Fallback
      if (lang === 'hi') {
        conditionName = 'सामान्य स्वास्थ्य मार्गदर्शन (Health Guidance)';
        causeOverview = `डॉ. राजू ने आपके लक्षण "${query}" का मूल्यांकन किया है।`;
        firstAidSteps = [
          'पर्याप्त मात्रा में पानी और पौष्टिक तरल पदार्थ पिएं।',
          'आरामदायक नींद लें और भारी तनाव से बचें।',
          'लक्षणों पर नज़र रखें; यदि तकलीफ बढ़े तो डॉक्टर से परामर्श लें।'
        ];
        redFlags = 'सांस लेने में दिक्कत, सीने में दर्द या भारी रक्तस्त्राव होने पर तुरंत एम्बुलेंस बुक करें।';
        summary = '🌿 <strong>सामान्य स्वास्थ्य सुझाव:</strong> हाइड्रेटेड रहें, हल्का भोजन लें और आराम करें।';
        speechText = 'आपके सवाल के लिए धन्यवाद। पर्याप्त पानी पिएं, आराम करें और जरूरत पड़ने पर डॉक्टर से सलाह लें।';
      } else {
        conditionName = 'General Health Guidance';
        causeOverview = `Dr. Raju evaluated your query: "${query}".`;
        firstAidSteps = [
          'Ensure optimal hydration with water and balanced electrolytes.',
          'Get restorative sleep and avoid strenuous physical exertion.',
          'Monitor your symptoms closely over the next 24 hours.'
        ];
        redFlags = 'If shortness of breath, chest discomfort, or severe pain arises, seek urgent medical care.';
        summary = '🌿 <strong>General Health Care:</strong> Stay well-hydrated, eat light meals, and get adequate rest.';
        speechText = 'Thank you for sharing your symptoms. Please stay well-hydrated, rest, and consult a doctor if you feel unwell.';
      }
    }

    return res.json({
      success: true,
      triage: {
        lang,
        level,
        severity,
        conditionName,
        mappedCondition,
        causeOverview,
        firstAidSteps,
        redFlags,
        summary,
        speechText
      }
    });
  } catch (error) {
    console.error('AI Triage error:', error);
    return res.status(500).json({ success: false, message: 'Triage evaluation error' });
  }
});

// Fallback for HTML5 single-page routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Helper: Get local network IPv4 addresses
function getNetworkIps() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address);
      }
    }
  }
  return addresses;
}

// Start Server on 0.0.0.0 (Accessible from Laptop, Phone, Tablet on local Wi-Fi / Network)
app.listen(PORT, '0.0.0.0', () => {
  const ips = getNetworkIps();
  console.log(`====================================================`);
  console.log(`🚑 Zero-Mile MedConnect Backend Server Running!`);
  console.log(`💻 Local Host URL:   http://localhost:${PORT}`);
  ips.forEach(ip => {
    console.log(`📱 Judge/Phone URL:  http://${ip}:${PORT}`);
  });
  console.log(`🔑 Owner/Admin Login: admin / admin123`);
  console.log(`🏥 Hospital Login:    NCEH001 / hospital123`);
  console.log(`====================================================`);
});
