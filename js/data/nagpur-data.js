/**
 * ZERO-MILE MEDCONNECT — NAGPUR GEOGRAPHIC & MEDICAL DATASET
 * Accurate geospatial coordinates, 3 independent demo hospitals, blood banks, and donor network
 */

const NAGPUR_DATA = {
  center: {
    lat: 21.1498,
    lng: 79.0806,
    name: "Zero Mile Stone (Geographical Center of India)",
    description: "The historic monument in Nagpur from which all distances across India were measured."
  },

  // 3 Primary Demo Hospitals (with independent accounts & resources)
  hospitals: [
    {
      id: "NCEH001",
      name: "Nagpur Central Emergency Hospital",
      code: "NCEH001",
      loginId: "NCEH001",
      locality: "Civil Lines / Central Nagpur",
      lat: 21.1552,
      lng: 79.0865,
      traumaLevel: "Level 1 Apex Trauma",
      emergencyContact: "+91 712 255 1001",
      icuBedsTotal: 24,
      icuBedsAvailable: 4,
      ventilatorsTotal: 18,
      ventilatorsAvailable: 3,
      traumaUnitsTotal: 6,
      traumaUnitsAvailable: 2,
      emergencyTeamStatus: "Available (Trauma Team Alpha Ready)",
      cathLabReady: true,
      bloodBankOnsite: true,
      rating: 4.9,
      specialties: ["Polytrauma", "Interventional Cardiology", "Neuro Critical Care", "Emergency Resuscitation"]
    },
    {
      id: "OCMC002",
      name: "Orange City Medical Center",
      code: "OCMC002",
      loginId: "OCMC002",
      locality: "Khamla / Ring Road",
      lat: 21.1114,
      lng: 79.0664,
      traumaLevel: "Level 1 Multi-Speciality",
      emergencyContact: "+91 712 228 3200",
      icuBedsTotal: 20,
      icuBedsAvailable: 2,
      ventilatorsTotal: 15,
      ventilatorsAvailable: 1, // Limited
      traumaUnitsTotal: 4,
      traumaUnitsAvailable: 1,
      emergencyTeamStatus: "Available (Team Beta Standing By)",
      cathLabReady: true,
      bloodBankOnsite: true,
      rating: 4.8,
      specialties: ["Cardiac Emergency", "General Trauma", "Pulmonology"]
    },
    {
      id: "CIEC003",
      name: "Central India Emergency Care",
      code: "CIEC003",
      loginId: "CIEC003",
      locality: "Wardha Road / MIHAN Corridor",
      lat: 21.0336,
      lng: 79.0275,
      traumaLevel: "Secondary Emergency Care",
      emergencyContact: "+91 712 298 0501",
      icuBedsTotal: 16,
      icuBedsAvailable: 3,
      ventilatorsTotal: 12,
      ventilatorsAvailable: 2,
      traumaUnitsTotal: 4,
      traumaUnitsAvailable: 0, // 🔴 Unavailable
      emergencyTeamStatus: "Delayed (Handling Mass Casualty)",
      cathLabReady: false,
      bloodBankOnsite: true,
      rating: 4.5,
      specialties: ["General Medicine", "Pediatric ER", "Basic Resuscitation"]
    }
  ],

  // Emergency Conditions and Predefined Resource Rule Matrix
  conditionRules: {
    "Accident / Trauma": {
      icon: "🚗",
      name: "Accident / Trauma",
      requiredResources: ["Trauma Unit", "ICU", "Emergency Team", "Ventilator"],
      criticalSpecialty: "Polytrauma",
      bloodRequirement: "Blood Bank Onsite Recommended",
      priority: "CRITICAL"
    },
    "Chest Pain": {
      icon: "❤️",
      name: "Chest Pain",
      requiredResources: ["Emergency Team", "ICU", "Cath Lab"],
      criticalSpecialty: "Interventional Cardiology",
      bloodRequirement: "2 Units Standby",
      priority: "CRITICAL"
    },
    "Breathing Difficulty": {
      icon: "🫁",
      name: "Breathing Difficulty",
      requiredResources: ["ICU", "Ventilator", "Emergency Team"],
      criticalSpecialty: "Pulmonology",
      bloodRequirement: "None",
      priority: "URGENT"
    },
    "Stroke Symptoms": {
      icon: "🧠",
      name: "Stroke Symptoms",
      requiredResources: ["Emergency Team", "ICU", "Neuro Critical Care"],
      criticalSpecialty: "Neuro Critical Care",
      bloodRequirement: "None",
      priority: "CRITICAL"
    },
    "Severe Bleeding": {
      icon: "🩸",
      name: "Severe Bleeding",
      requiredResources: ["Emergency Team", "ICU", "Trauma Unit", "Blood Bank Onsite"],
      criticalSpecialty: "General Trauma",
      bloodRequirement: "Immediate Whole Blood",
      priority: "CRITICAL"
    },
    "Burn Injury": {
      icon: "🔥",
      name: "Burn Injury",
      requiredResources: ["Trauma Unit", "ICU", "Emergency Team"],
      criticalSpecialty: "General Trauma",
      bloodRequirement: "Plasma / Saline Reserve",
      priority: "URGENT"
    },
    "Other Emergency": {
      icon: "⚠️",
      name: "Other Emergency",
      requiredResources: ["Emergency Team", "ICU"],
      criticalSpecialty: "Emergency Resuscitation",
      bloodRequirement: "Standard",
      priority: "NORMAL"
    }
  },

  localities: [
    { name: "Dharampeth", lat: 21.1432, lng: 79.0621, zone: "West Nagpur", zip: "440010" },
    { name: "Ramdaspeth", lat: 21.1390, lng: 79.0740, zone: "Central Nagpur", zip: "440010" },
    { name: "Sitabuldi", lat: 21.1458, lng: 79.0831, zone: "Central Hub", zip: "440012" },
    { name: "Dhantoli", lat: 21.1367, lng: 79.0864, zone: "Medical District", zip: "440012" },
    { name: "Wardha Road", lat: 21.0950, lng: 79.0620, zone: "South Corridor", zip: "440015" },
    { name: "Shankar Nagar", lat: 21.1365, lng: 79.0601, zone: "West Nagpur", zip: "440010" },
    { name: "Trimurti Nagar", lat: 21.1150, lng: 79.0480, zone: "South-West", zip: "440022" },
    { name: "IT Park (Parsodi)", lat: 21.1250, lng: 79.0490, zone: "Tech Corridor", zip: "440022" },
    { name: "Sadar", lat: 21.1610, lng: 79.0820, zone: "North-Central", zip: "440001" },
    { name: "Civil Lines", lat: 21.1530, lng: 79.0720, zone: "Administrative Hub", zip: "440001" }
  ],

  bloodBanks: [
    {
      id: "bb-1",
      name: "Dr. Hedgewar Blood Centre",
      locality: "Dharampeth, Nagpur",
      lat: 21.1440,
      lng: 79.0635,
      contact: "+91 712 254 7799",
      isOpen24x7: true,
      stock: { "O+": 28, "O-": 6, "A+": 22, "A-": 4, "B+": 34, "B-": 5, "AB+": 14, "AB-": 3 }
    },
    {
      id: "bb-2",
      name: "Lifeline Blood Bank & Component Centre",
      locality: "Ramdaspeth, Nagpur",
      lat: 21.1382,
      lng: 79.0755,
      contact: "+91 712 242 0920",
      isOpen24x7: true,
      stock: { "O+": 35, "O-": 8, "A+": 26, "A-": 5, "B+": 42, "B-": 9, "AB+": 18, "AB-": 4 }
    },
    {
      id: "bb-3",
      name: "GMCH Apex Model Blood Bank",
      locality: "Medical Square, Nagpur",
      lat: 21.1298,
      lng: 79.0995,
      contact: "+91 712 274 0123",
      isOpen24x7: true,
      stock: { "O+": 60, "O-": 12, "A+": 45, "A-": 8, "B+": 58, "B-": 11, "AB+": 24, "AB-": 7 }
    },
    {
      id: "bb-4",
      name: "Indian Red Cross Society Blood Centre",
      locality: "Civil Lines, Nagpur",
      lat: 21.1525,
      lng: 79.0730,
      contact: "+91 712 256 1234",
      isOpen24x7: true,
      stock: { "O+": 22, "O-": 4, "A+": 18, "A-": 3, "B+": 28, "B-": 4, "AB+": 10, "AB-": 2 }
    }
  ],

  donors: [
    {
      id: "donor-1",
      name: "Amit Sharma",
      bloodGroup: "O+",
      locality: "Dharampeth",
      lat: 21.1445,
      lng: 79.0615,
      distanceKm: 3.2,
      status: "Available",
      lastDonated: "4 months ago",
      donationsCount: 8,
      responseTimeAvg: "6 mins",
      phoneMasked: "+91 98220 •••••",
      verified: true
    },
    {
      id: "donor-2",
      name: "Pooja Deshmukh",
      bloodGroup: "O+",
      locality: "Ramdaspeth",
      lat: 21.1395,
      lng: 79.0732,
      distanceKm: 2.1,
      status: "Available",
      lastDonated: "5 months ago",
      donationsCount: 5,
      responseTimeAvg: "8 mins",
      phoneMasked: "+91 94221 •••••",
      verified: true
    },
    {
      id: "donor-3",
      name: "Siddharth Patil",
      bloodGroup: "O+",
      locality: "Shankar Nagar",
      lat: 21.1370,
      lng: 79.0585,
      distanceKm: 1.4,
      status: "Available",
      lastDonated: "3 months ago",
      donationsCount: 12,
      responseTimeAvg: "4 mins",
      phoneMasked: "+91 98902 •••••",
      verified: true
    },
    {
      id: "donor-4",
      name: "Dr. Ananya Joshi",
      bloodGroup: "B+",
      locality: "Dhantoli",
      lat: 21.1360,
      lng: 79.0850,
      distanceKm: 2.8,
      status: "Available",
      lastDonated: "6 months ago",
      donationsCount: 14,
      responseTimeAvg: "5 mins",
      phoneMasked: "+91 97644 •••••",
      verified: true
    },
    {
      id: "donor-5",
      name: "Rohan Kulkarni",
      bloodGroup: "B+",
      locality: "Trimurti Nagar",
      lat: 21.1165,
      lng: 79.0495,
      distanceKm: 4.2,
      status: "Available",
      lastDonated: "4 months ago",
      donationsCount: 6,
      responseTimeAvg: "9 mins",
      phoneMasked: "+91 98231 •••••",
      verified: true
    },
    {
      id: "donor-6",
      name: "Sneha Nair",
      bloodGroup: "A+",
      locality: "Civil Lines",
      lat: 21.1540,
      lng: 79.0710,
      distanceKm: 3.6,
      status: "Available",
      lastDonated: "5 months ago",
      donationsCount: 7,
      responseTimeAvg: "7 mins",
      phoneMasked: "+91 98811 •••••",
      verified: true
    },
    {
      id: "donor-7",
      name: "Vikram Rathi",
      bloodGroup: "O-",
      locality: "Sadar",
      lat: 21.1620,
      lng: 79.0810,
      distanceKm: 4.8,
      status: "Available",
      lastDonated: "3 months ago",
      donationsCount: 18,
      responseTimeAvg: "5 mins",
      phoneMasked: "+91 93700 •••••",
      verified: true
    },
    {
      id: "donor-8",
      name: "Meera Vaidya",
      bloodGroup: "AB+",
      locality: "IT Park (Parsodi)",
      lat: 21.1240,
      lng: 79.0485,
      distanceKm: 3.9,
      status: "Available",
      lastDonated: "7 months ago",
      donationsCount: 4,
      responseTimeAvg: "11 mins",
      phoneMasked: "+91 99230 •••••",
      verified: true
    }
  ],

  // Realistic Route Waypoints for Demo Emergency Simulation
  demoRouteWaypoints: [
    { lat: 21.1448, lng: 79.0625, name: "Pickup: West High Court Rd, Dharampeth", etaSec: 1080 },
    { lat: 21.1415, lng: 79.0620, name: "Laxmi Nagar / Coffee House Square", etaSec: 990 },
    { lat: 21.1365, lng: 79.0601, name: "Shankar Nagar Square Corridor", etaSec: 920 },
    { lat: 21.1310, lng: 79.0615, name: "Entering Wardha Road Arterial", etaSec: 892 },
    { lat: 21.1245, lng: 79.0630, name: "Passing Ajni Flyover Junction", etaSec: 720 },
    { lat: 21.1185, lng: 79.0645, name: "Pratap Nagar Square Corridor", etaSec: 480 },
    { lat: 21.1140, lng: 79.0655, name: "Khamla Ring Road Approach", etaSec: 240 },
    { lat: 21.1114, lng: 79.0664, name: "Destination: Nagpur Central Emergency Hospital", etaSec: 0 }
  ],

  getLocalityCoordinates(name) {
    if (!name) return { lat: 21.1432, lng: 79.0621, name: "Dharampeth" };
    const clean = name.toLowerCase();
    const loc = this.localities.find(l => clean.includes(l.name.toLowerCase()) || l.name.toLowerCase().includes(clean));
    if (loc) return { lat: loc.lat, lng: loc.lng, name: loc.name };
    return { lat: 21.1432, lng: 79.0621, name: name };
  },

  getHospitalCoordinates(hospitalIdOrName) {
    if (!hospitalIdOrName) return { lat: 21.1552, lng: 79.0865, name: "Nagpur Central Emergency Hospital", code: "NCEH001", locality: "Civil Lines" };
    const found = this.hospitals.find(h => h.id === hospitalIdOrName || h.code === hospitalIdOrName || (h.name && h.name.toLowerCase().includes(String(hospitalIdOrName).toLowerCase())));
    if (found) return { lat: found.lat, lng: found.lng, name: found.name, code: found.code, locality: found.locality };
    return { lat: 21.1552, lng: 79.0865, name: "Nagpur Central Emergency Hospital", code: "NCEH001", locality: "Civil Lines" };
  },

  generateRouteWaypoints(pickup, hospital) {
    const pCoords = this.getLocalityCoordinates(pickup && (pickup.name || pickup));
    const hCoords = this.getHospitalCoordinates(hospital && (hospital.id || hospital.code || hospital.name || hospital));

    const pLat = (pickup && pickup.lat) || pCoords.lat;
    const pLng = (pickup && pickup.lng) || pCoords.lng;
    const hLat = (hospital && hospital.lat) || hCoords.lat;
    const hLng = (hospital && hospital.lng) || hCoords.lng;

    const dLat = hLat - pLat;
    const dLng = hLng - pLng;

    return [
      { lat: pLat, lng: pLng, name: `Pickup: ${pCoords.name}` },
      { lat: pLat + dLat * 0.20 + (dLng >= 0 ? 0.0012 : -0.0012), lng: pLng + dLng * 0.18, name: "Nagpur Central Arterial" },
      { lat: pLat + dLat * 0.45 + (dLat >= 0 ? -0.0010 : 0.0010), lng: pLng + dLng * 0.42, name: "Zero-Mile Green Corridor" },
      { lat: pLat + dLat * 0.70 + (dLng >= 0 ? 0.0010 : -0.0010), lng: pLng + dLng * 0.68, name: "Flyover Approach Corridor" },
      { lat: pLat + dLat * 0.88, lng: pLng + dLng * 0.88, name: "Hospital Emergency Lane Entry" },
      { lat: hLat, lng: hLng, name: `Destination: ${hCoords.name}` }
    ];
  }
};

// Global reference
window.NAGPUR_DATA = NAGPUR_DATA;

