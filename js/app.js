/**
 * ZERO-MILE MEDCONNECT — MAIN APPLICATION CONTROLLER
 * Real-time 1-second countdown, Leaflet Nagpur GPS tracking,
 * Node.js Express REST API synchronization, dynamic user session management,
 * and exclusive Owner / Admin Control Center.
 */

class MedConnectApp {
  constructor() {
    this.currentView = 'login';
    this.selectedBloodGroup = 'O+';
    this.currentAdminTab = 'donors';
    this.charts = {};
    this.ecgAnimationId = null;
    this.currentMatchingData = null;
  }

  init() {
    console.log("Initializing Zero-Mile MedConnect (Clean Architecture)...");

    // Setup Navigation & Portal Switchers
    this.setupNavigation();

    // Setup Modals & Event Listeners
    this.setupModalsAndActions();

    // Setup Store Subscriptions
    this.setupStoreSubscriptions();

    // Setup Live Continuous Telemetry & Canvas ECG
    this.startContinuousTelemetry();

    // Initial View Selection based on Active Session
    const currentRole = window.medStore.getCurrentRole();
    if (currentRole === 'citizen') {
      this.switchView('citizen');
    } else if (currentRole === 'hospital') {
      this.initHospitalSSE();
      this.switchView('hospital');
    } else if (currentRole === 'admin') {
      this.switchView('admin');
    } else {
      this.switchView('login');
    }

    // Initial Master Render
    this.renderAll();

    // Initialize Map if on ambulance view or prewarm
    setTimeout(() => {
      if (window.nagpurMap) {
        window.nagpurMap.init();
      }
    }, 300);

    // Initialize Analytics
    this.initAnalyticsCharts();

    // Initialize Dr. Raju AI Health Assistant
    if (window.rajuAssistant) {
      window.rajuAssistant.init();
    }
  }

  // --- Navigation & View Switching ---
  setupNavigation() {
    document.addEventListener('click', (e) => {
      const targetBtn = e.target.closest('[data-view-target]');
      if (targetBtn) {
        e.preventDefault();
        const targetView = targetBtn.getAttribute('data-view-target');
        this.switchView(targetView);
      }
    });

    // Sound toggle
    const soundToggleBtn = document.getElementById('soundToggleBtn');
    if (soundToggleBtn) {
      soundToggleBtn.addEventListener('click', () => {
        const isMuted = window.medAudio.toggleMute();
        soundToggleBtn.innerHTML = isMuted ? '🔇 Audio Off' : '🔊 Audio On';
        this.showToast(isMuted ? "Sound muted" : "Emergency audio enabled", "neutral");
      });
    }

    // Hospital switcher in EOC header
    const hospSelect = document.getElementById('eocHospitalSwitcher');
    if (hospSelect) {
      hospSelect.addEventListener('change', async (e) => {
        const newHospId = e.target.value;
        await window.medStore.loginAsHospital(newHospId);
        this.initHospitalSSE();
        this.showToast(`Switched to ${window.medStore.getCurrentHospitalData().name} (${newHospId})`, "primary");
      });
    }
  }

  switchView(viewName) {
    this.currentView = viewName;

    // Update active navbar button
    document.querySelectorAll('[data-view-target]').forEach(btn => {
      if (btn.getAttribute('data-view-target') === viewName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Toggle view sections
    document.querySelectorAll('.view-section').forEach(sec => {
      if (sec.id === `view-${viewName}`) {
        sec.style.display = 'block';
        sec.classList.add('animate-fade-in-up');
      } else {
        sec.style.display = 'none';
        sec.classList.remove('animate-fade-in-up');
      }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Dr. Raju AI Assistant: Exclusively active in Citizen environment!
    if (window.rajuAssistant) {
      const role = window.medStore ? window.medStore.getCurrentRole() : 'guest';
      if (viewName === 'citizen' || (role === 'citizen' && (viewName === 'ambulance' || viewName === 'blood' || viewName === 'hospital-match'))) {
        window.rajuAssistant.show();
      } else {
        window.rajuAssistant.hide();
      }
    }

    // Handle view-specific renders
    if (viewName === 'ambulance') {
      setTimeout(() => {
        if (window.nagpurMap) {
          window.nagpurMap.init();
          window.nagpurMap.invalidate();
        }
      }, 150);
    } else if (viewName === 'analytics') {
      setTimeout(() => {
        this.renderAnalyticsCharts();
      }, 150);
    } else if (viewName === 'admin') {
      window.medStore.refreshAdminDashboard();
    } else if (viewName === 'hospital') {
      this.initHospitalSSE();
      this.renderHospitalEOC();
    }

    this.renderAll();
  }

  // --- Real-time Hospital EOC SSE Engine ---
  initHospitalSSE() {
    console.log('[Hospital EOC] Initializing SSE EventSource stream & synchronizing state...');
    if (window.medStore) {
      window.medStore.initRealTimeSync();
      window.medStore.syncWithBackend().then(() => {
        this.renderHospitalEOC();
      }).catch(err => {
        console.warn('[Hospital EOC Sync Note]:', err.message);
      });
    }
  }

  // --- Store Subscriptions ---
  setupStoreSubscriptions() {
    window.medStore.subscribe('SESSION_CHANGED', (session) => {
      this.renderNavSession();
      this.renderCitizenDashboard();
      this.renderHospitalEOC();
      if (session.role === 'hospital') {
        this.initHospitalSSE();
      }
      if (session.role === 'admin') {
        this.renderAdminDashboard();
      }
      if (session.role === 'guest' && this.currentView !== 'landing' && this.currentView !== 'login') {
        this.switchView('login');
      }
    });

    window.medStore.subscribe('EMERGENCY_UPDATED', (emg) => {
      this.renderAmbulanceTracking();
      this.renderHospitalAlertBanner();
      this.renderCitizenDashboard();
      if (window.nagpurMap) window.nagpurMap.updateEmergencyRoute();
      if (window.medStore.state.session.role === 'admin') {
        this.renderAdminDashboard();
      }
    });

    // Real-Time Cross-Device New Emergency Alert
    window.medStore.subscribe('EMERGENCY_CREATED', (payload) => {
      console.log('SSE Event Received:', payload);

      // Force immediate real-time DOM updates on Hospital EOC dashboard & inbound queue
      this.renderHospitalEOC();
      this.renderAmbulanceTracking();
      this.renderHospitalAlertBanner();
      this.renderCitizenDashboard();
      this.renderHeroStats();
      if (window.nagpurMap) window.nagpurMap.updateEmergencyRoute();

      const role = window.medStore.getCurrentRole();
      if (role === 'hospital' || role === 'admin') {
        if (window.medAudio) window.medAudio.playEmergencyAlert();
        const patName = (payload.emergency && payload.emergency.patientName) || 'Emergency Patient';
        const hospName = (payload.hospital && payload.hospital.name) || 'Hospital';
        this.showToast(`🚨 NEW EMERGENCY DISPATCH: ${patName} en route to ${hospName}! Available beds decremented by 1.`, "critical", 7000);
      }
    });

    // Real-Time Cross-Device Patient Discharge & Feedback Alert
    window.medStore.subscribe('PATIENT_DISCHARGED', (payload) => {
      this.renderAmbulanceTracking();
      this.renderHospitalEOC();
      this.renderCitizenDashboard();
      this.renderHeroStats();

      const role = window.medStore.getCurrentRole();
      if (role === 'citizen') {
        if (window.medAudio) window.medAudio.playSuccessChime();
        this.showToast(`🎉 Treatment Completed! Doctor Note: "${payload.feedback || 'Patient is fine, received treatment from our hospital, and is good now.'}"`, "success", 8000);
      } else {
        this.showToast(`✓ Patient discharged. 1 Bed/Seat restored to available inventory.`, "success");
      }
    });

    window.medStore.subscribe('HOSPITAL_DATA_UPDATED', (hosp) => {
      this.renderHospitalEOC();
      this.renderHospitalAlertBanner();
      this.renderHeroStats();
      this.renderLandingHospitalCapacityTable();
    });

    window.medStore.subscribe('PATIENT_DIVERTED', (payload) => {
      this.renderAmbulanceTracking();
      this.renderHospitalEOC();
      this.renderCitizenDashboard();
      this.renderHeroStats();
      this.renderLandingHospitalCapacityTable();
      if (window.nagpurMap) window.nagpurMap.updateEmergencyRoute();
    });

    window.medStore.subscribe('ALERT_15M_ACCEPTED', (payload) => {
      this.renderHospitalEOC();
      this.renderHospitalAlertBanner();
      this.renderAmbulanceTracking();
      this.renderCitizenDashboard();
      this.renderLandingHospitalCapacityTable();
    });

    window.medStore.subscribe('HOSPITAL_SETTINGS_UPDATED', () => {
      this.renderHospitalEOC();
      this.renderLandingHospitalCapacityTable();
    });

    // 1-Second Real-Time Countdown Tick
    window.medStore.subscribe('TICK_SECOND', (emg) => {
      this.updateCountdownClocks(emg);
    });

    window.medStore.subscribe('TELEMETRY_UPDATED', (emg) => {
      if (window.nagpurMap && emg.ambulance) {
        window.nagpurMap.updateAmbulancePosition(emg.ambulance.currentLat, emg.ambulance.currentLng);
      }
    });

    window.medStore.subscribe('DONOR_REGISTERED', () => {
      this.renderCitizenDashboard();
      this.renderDonorsList();
      if (window.medStore.state.session.role === 'admin') {
        this.renderAdminDashboard();
      }
    });

    window.medStore.subscribe('DONORS_UPDATED', () => {
      this.renderDonorsList();
    });

    window.medStore.subscribe('DONOR_CONTACTED', () => {
      this.renderDonorsList();
      if (window.medStore.state.session.role === 'admin') {
        this.renderAdminDashboard();
      }
    });

    window.medStore.subscribe('BLOOD_REQUEST_CREATED', () => {
      this.renderBloodRequests();
      if (window.medStore.state.session.role === 'admin') {
        this.renderAdminDashboard();
      }
    });

    window.medStore.subscribe('ADMIN_DATA_UPDATED', () => {
      this.renderAdminDashboard();
    });
  }

  // --- Master Render Engine ---
  renderAll() {
    this.renderNavSession();
    this.renderHeroStats();
    this.renderLandingHospitalCapacityTable();
    this.renderCitizenDashboard();
    this.renderAmbulanceTracking();
    this.renderHospitalAlertBanner();
    this.renderHospitalEOC();
    this.renderDonorsList();
    this.renderBloodRequests();
    this.renderBloodBankInventory();
    if (window.medStore.getCurrentRole() === 'admin') {
      this.renderAdminDashboard();
    }
  }

  // 1. Render Navigation Bar based on Session Role (Guest / Citizen / Hospital / Admin)
  renderNavSession() {
    const role = window.medStore.getCurrentRole();
    const guestNav = document.getElementById('navRoleGuest');
    const citizenNav = document.getElementById('navRoleCitizen');
    const hospitalNav = document.getElementById('navRoleHospital');
    const adminNav = document.getElementById('navRoleAdmin');
    const userBadge = document.getElementById('navUserBadge');

    if (guestNav) guestNav.style.display = role === 'guest' ? 'flex' : 'none';
    if (citizenNav) citizenNav.style.display = role === 'citizen' ? 'flex' : 'none';
    if (hospitalNav) hospitalNav.style.display = role === 'hospital' ? 'flex' : 'none';
    if (adminNav) adminNav.style.display = role === 'admin' ? 'flex' : 'none';

    if (userBadge) {
      if (role === 'citizen') {
        const c = window.medStore.state.session.citizen;
        userBadge.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="badge badge-primary" style="font-size:0.8rem; padding: 4px 10px;">👤 ${c.name}</span>
            <button class="btn btn-sm btn-ghost" style="color: #64748b;" onclick="window.medStore.logout(); window.app.switchView('login'); window.app.showToast('Logged out. Returned to Login Gateway.', 'neutral');">Logout</button>
          </div>
        `;
      } else if (role === 'hospital') {
        const hid = window.medStore.getCurrentHospitalId();
        const hosp = window.medStore.getCurrentHospitalData();
        userBadge.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="badge badge-critical" style="font-size:0.8rem; padding: 4px 10px;">🏥 ${hosp.code}</span>
            <button class="btn btn-sm btn-ghost" style="color: #64748b;" onclick="window.medStore.logout(); window.app.switchView('login'); window.app.showToast('Logged out. Returned to Login Gateway.', 'neutral');">Logout</button>
          </div>
        `;
      } else if (role === 'admin') {
        userBadge.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="badge badge-success" style="font-size:0.8rem; padding: 4px 10px; background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0;">🔐 Platform Owner</span>
            <button class="btn btn-sm btn-ghost" style="color: #dc2626;" onclick="window.medStore.logout(); window.app.switchView('login'); window.app.showToast('Logged out from Owner Admin', 'neutral');">Logout</button>
          </div>
        `;
      } else {
        userBadge.innerHTML = `
          <button class="btn btn-sm btn-primary btn-tactile" onclick="window.app.switchView('login')" style="font-weight: 700;">🔐 Sign In / Gateways</button>
        `;
      }
    }

    const hospSelect = document.getElementById('eocHospitalSwitcher');
    if (hospSelect) {
      hospSelect.value = window.medStore.getCurrentHospitalId();
    }
  }

  // 2. Landing Hero Stats
  renderHeroStats() {
    const hosp = window.medStore.getCurrentHospitalData();
    const allDonors = [...window.medStore.state.registeredDonors, ...NAGPUR_DATA.donors];

    const heroActiveCount = document.getElementById('heroActiveAmbulances');
    if (heroActiveCount) heroActiveCount.innerText = '18';

    const heroResponseTime = document.getElementById('heroAvgResponseTime');
    if (heroResponseTime) heroResponseTime.innerText = '8.4m';

    const heroDonorsCount = document.getElementById('heroTotalDonorsCount');
    if (heroDonorsCount) heroDonorsCount.innerText = `${allDonors.length}`;

    const heroIcuFree = document.getElementById('heroIcuAvailable');
    if (heroIcuFree && hosp) heroIcuFree.innerText = `${hosp.icuBedsAvailable}`;
  }

  // 3. Real-time Countdown Timer Formatting (MM:SS)
  updateCountdownClocks(emg) {
    if (!emg) return;

    const etaSeconds = emg.etaSeconds || 0;
    const mins = Math.floor(etaSeconds / 60);
    const secs = etaSeconds % 60;
    const formattedClock = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    // Citizen Tracking Screen ETA Clock
    const etaClockEl = document.getElementById('trackingEtaClock');
    if (etaClockEl) {
      if (etaSeconds <= 0) {
        etaClockEl.innerText = "00:00";
        etaClockEl.style.color = "var(--success-600)";
      } else {
        etaClockEl.innerText = formattedClock;
        etaClockEl.style.color = etaSeconds <= 180 ? "var(--warning-600)" : "var(--critical-600)";
      }
    }

    const etaSubEl = document.getElementById('trackingEtaSub');
    if (etaSubEl) {
      etaSubEl.innerText = etaSeconds <= 0 ? "✓ Ambulance Arrived" : "minutes remaining";
    }

    // Citizen Dashboard Active Emergency widget clock
    const citizenDashClock = document.getElementById('citizenDashEtaClock');
    if (citizenDashClock) {
      citizenDashClock.innerText = etaSeconds <= 0 ? "00:00 (ARRIVED)" : formattedClock;
    }

    // Status badges on citizen tracking
    const statusBadge = document.getElementById('citizenAmbStatusBadge');
    const statusText = document.getElementById('trackingAmbStatusText');
    const liveBadge = document.getElementById('citizenAmbLiveBadge');
    const currentAmbLoc = document.getElementById('trackingCurrentAmbLoc');
    const targetHosp = window.medStore.getHospitalById(emg.destinationHospitalId) || NAGPUR_DATA.hospitals[0];

    if (etaSeconds <= 0) {
      if (statusBadge) {
        statusBadge.className = "badge badge-success";
        statusBadge.innerText = "✓ Arrived";
      }
      if (statusText) {
        statusText.innerText = "✓ Arrived at Destination Hospital";
        statusText.style.color = "#10b981";
      }
      if (liveBadge) {
        liveBadge.className = "badge badge-success";
        liveBadge.innerText = "✓ ARRIVED";
      }
      if (currentAmbLoc) {
        currentAmbLoc.innerText = `Arrived at ${targetHosp.name}`;
      }
    } else {
      if (statusBadge) {
        statusBadge.className = "badge badge-success";
        statusBadge.innerText = "🟢 En Route";
      }
      if (statusText) {
        statusText.innerText = "🟢 En Route";
        statusText.style.color = "#059669";
      }
      if (liveBadge) {
        liveBadge.className = "badge badge-critical animate-critical-flash";
        liveBadge.innerText = "● LIVE TRACKING";
      }
      if (currentAmbLoc) {
        if (etaSeconds <= 180) {
          currentAmbLoc.innerText = `Approaching ${targetHosp.locality}, Nagpur`;
        } else {
          currentAmbLoc.innerText = `Wardha Road / Civil Lines corridor, Nagpur`;
        }
      }
    }
  }

  // 4. Citizen Tracking Screen
  renderAmbulanceTracking() {
    const emg = window.medStore.getActiveEmergency();
    if (!emg) return;

    const targetHosp = window.medStore.getHospitalById(emg.destinationHospitalId) || NAGPUR_DATA.hospitals[0];

    // Discharge & Doctor Feedback Banner
    const dischargeBanner = document.getElementById('citizenDischargeBanner');
    if (dischargeBanner) {
      if (emg.status === 'DISCHARGED') {
        dischargeBanner.style.display = 'block';
        dischargeBanner.innerHTML = `
          <div style="padding: 20px; background: #ecfdf5; border-radius: 16px; border: 2px solid #10b981; box-shadow: var(--shadow-md);" class="animate-fade-in-up">
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 1.8rem;">🎉</span>
                <div>
                  <h3 style="font-size: 1.3rem; color: #065f46; margin: 0;">Emergency Treatment Completed!</h3>
                  <span style="font-size: 0.8rem; color: #047857;">Treated at ${targetHosp.name}</span>
                </div>
              </div>
              <span class="badge badge-success" style="font-size: 0.9rem; padding: 6px 14px;">✓ ${emg.outcome || 'Fully Recovered & Discharged'}</span>
            </div>
            <div style="margin: 12px 0; padding: 14px 16px; background: #ffffff; border-radius: 10px; border: 1px solid #a7f3d0;">
              <span style="font-size: 0.72rem; font-weight: 800; color: #047857; text-transform: uppercase; display: block; margin-bottom: 4px;">DOCTOR & HOSPITAL CLINICAL FEEDBACK</span>
              <p style="font-size: 0.95rem; color: #065f46; font-weight: 600; margin: 0; line-height: 1.5;">
                "${emg.doctorFeedback || 'This person is fine, received treatment from our hospital, and is good now. Vitals normalized.'}"
              </p>
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; font-size: 0.82rem; color: #047857;">
              <span>✅ Hospital emergency bed / seat released back into public capacity.</span>
              <button class="btn btn-sm btn-success" onclick="window.app.switchView('citizen')">Back to Citizen Portal</button>
            </div>
          </div>
        `;
      } else {
        dischargeBanner.style.display = 'none';
      }
    }

    // 1. Destination Hospital details
    const targetHospName = document.getElementById('trackingTargetHospName');
    if (targetHospName) targetHospName.innerText = targetHosp.name;

    const targetHospLoc = document.getElementById('trackingTargetHospLoc');
    if (targetHospLoc) targetHospLoc.innerText = `${targetHosp.locality}, Nagpur`;

    // 2. Pickup & Current Locations
    const pickupLoc = document.getElementById('trackingPickupLoc');
    if (pickupLoc) pickupLoc.innerText = (emg.pickup && emg.pickup.name) || emg.locality || "Dharampeth, Nagpur";

    // 3. Ambulance Info
    const ambCode = document.getElementById('trackingAmbCode');
    if (ambCode) ambCode.innerText = emg.ambulance ? emg.ambulance.code : (emg.ambulanceCode || "ZM-1024");

    const ambType = document.getElementById('trackingAmbType');
    if (ambType) ambType.innerText = emg.ambulance ? emg.ambulance.type : (emg.ambulanceType || "Advanced Life Support (ALS)");

    const ambSpeed = document.getElementById('trackingAmbSpeed');
    if (ambSpeed) ambSpeed.innerText = `${(emg.ambulance && emg.ambulance.currentSpeedKmh) || 62} km/h`;

    // 4. Driver details
    const driverName = document.getElementById('trackingDriverName');
    if (driverName) driverName.innerText = (emg.ambulance && emg.ambulance.driver) || emg.driverName || "Amit Sharma";

    const driverPhone = document.getElementById('trackingDriverPhone');
    if (driverPhone) driverPhone.innerText = (emg.ambulance && emg.ambulance.driverPhone) || emg.driverPhone || "+91 98221 44550";

    const driverPhoneBtn = document.getElementById('trackingDriverPhoneBtn');
    if (driverPhoneBtn) {
      const phoneVal = (emg.ambulance && emg.ambulance.driverPhone) || emg.driverPhone || "+919822144550";
      driverPhoneBtn.href = `tel:${phoneVal.replace(/\s+/g, '')}`;
    }

    this.updateCountdownClocks(emg);
  }

  // 5. Hospital Portal 15-Minute Pre-Arrival Alert
  renderHospitalAlertBanner() {
    const bannerContainer = document.getElementById('eocHospitalAlertContainer');
    if (!bannerContainer) return;

    const currentHosp = window.medStore.getCurrentHospitalData();
    const alertData = currentHosp ? currentHosp.activeAlert15m : null;

    if (!alertData || !alertData.isTriggered) {
      bannerContainer.innerHTML = '';
      return;
    }

    const etaMins = Math.floor((alertData.etaSeconds || 892) / 60);
    const etaSecs = (alertData.etaSeconds || 892) % 60;
    const formattedClock = `${String(etaMins).padStart(2, '0')}:${String(etaSecs).padStart(2, '0')}`;

    const isSos = alertData.isSos || alertData.severity === 'CRITICAL-SOS';

    if (alertData.isAccepted) {
      bannerContainer.innerHTML = `
        <div class="alert-15min-banner alert-accepted-banner animate-fade-in-up">
          <div class="alert-grid">
            <div class="alert-eta-box" style="background: rgba(0,0,0,0.25);">
              <div class="alert-eta-label" style="color: #a7f3d0;">STATUS</div>
              <div class="alert-eta-clock" style="font-size: 1.8rem; color: #ffffff;">CONFIRMED</div>
              <div style="font-size: 0.75rem; color: #d1fae5;">ETA: ${formattedClock}</div>
            </div>
            <div class="alert-patient-details">
              <div class="alert-headline" style="color: #ffffff;">
                <span>✓ PREPARATION CONFIRMED — ER & TRAUMA TEAM STANDING BY</span>
              </div>
              <div class="alert-patient-meta">
                <span><strong>Patient:</strong> ${alertData.patientName} (${alertData.age || 38}y)</span>
                <span><strong>Severity:</strong> <span class="badge badge-critical">${alertData.severity}</span></span>
                <span><strong>Condition:</strong> ${alertData.condition}</span>
                <span><strong>Ambulance:</strong> ${alertData.ambulanceCode}</span>
                ${alertData.gpsLat ? `<span><strong>GPS:</strong> 📍 ${Number(alertData.gpsLat).toFixed(4)}, ${Number(alertData.gpsLng).toFixed(4)}</span>` : ''}
              </div>
              <div class="alert-requirements-pill-row">
                <span class="alert-req-pill">✓ ICU Bed Locked</span>
                <span class="alert-req-pill">✓ Trauma Team Ready</span>
                <span class="alert-req-pill">✓ Blood Standby Ready</span>
              </div>
            </div>
            <div class="alert-action-column">
              <span class="badge badge-success" style="font-size: 0.85rem; padding: 8px 16px;">
                ✓ ALLOCATED AT ${alertData.acceptedTimestamp || 'JUST NOW'}
              </span>
              <span style="font-size: 0.7rem; color: #d1fae5; margin-top: 4px;">Zero Admission Delay Guaranteed</span>
            </div>
          </div>
        </div>
      `;
    } else {
      bannerContainer.innerHTML = `
        <div class="alert-15min-banner ${isSos ? 'animate-sos-strobe' : 'alert-card-active'} animate-fade-in-up" style="${isSos ? 'border: 3px solid #fecaca; box-shadow: 0 0 35px rgba(239, 68, 68, 0.85);' : ''}">
          <div class="alert-grid">
            <div class="alert-eta-box" style="${isSos ? 'background: rgba(0,0,0,0.5);' : ''}">
              <div class="alert-eta-label">${isSos ? '🚨 INSTANT SOS' : '🚨 INCOMING ETA'}</div>
              <div class="alert-eta-clock">${formattedClock}</div>
              <div style="font-size: 0.75rem; color: #fca5a5;">${isSos ? 'LIVE GPS BEACON' : 'MINUTES AWAY'}</div>
            </div>
            <div class="alert-patient-details">
              <div class="alert-headline">
                <span class="live-dot-red"></span>
                <span>${isSos ? '🚨 CRITICAL GPS SOS BEACON RECEIVED — IMMEDIATE TRAUMA DISPATCH' : '🚨 CRITICAL PATIENT INCOMING — 15-MINUTE PRE-ARRIVAL PROTOCOL'}</span>
              </div>
              <div class="alert-patient-meta">
                <span><strong>Patient:</strong> ${alertData.patientName}</span>
                <span><strong>Age:</strong> ${alertData.age || 38}</span>
                <span><strong>Condition:</strong> ${alertData.condition}</span>
                <span><strong>Severity:</strong> <span class="badge badge-critical animate-critical-flash">${alertData.severity}</span></span>
                <span><strong>Ambulance:</strong> ${alertData.ambulanceCode}</span>
                ${alertData.gpsLat ? `<span><strong>GPS:</strong> 📍 ${Number(alertData.gpsLat).toFixed(4)}, ${Number(alertData.gpsLng).toFixed(4)}</span>` : ''}
              </div>
              <div class="alert-requirements-pill-row">
                <span class="alert-req-pill">⚠️ ICU Bed Reserved</span>
                <span class="alert-req-pill">⚠️ Emergency Surgical Team</span>
                <span class="alert-req-pill">⚠️ Blood Standby Ready</span>
              </div>
            </div>
            <div class="alert-action-column">
              <button id="acceptPrepareAlertBtn" class="btn btn-xl btn-tactile" style="background: #ffffff; color: #991b1b; box-shadow: 0 6px 20px rgba(0,0,0,0.3); font-weight: 800; font-size: 1.05rem;" onclick="window.medStore.acceptAndPrepare15mAlert('${currentHosp.id}', '${alertData.id}'); window.medAudio.playSuccessChime(); window.app.showToast('✓ PREPARATION CONFIRMED: Locked ICU resources for ${alertData.patientName}!', 'success');">
                ${isSos ? 'ASSIGN NEAREST AMBULANCE & PREPARE' : 'ACCEPT & PREPARE'}
              </button>
              <span style="font-size: 0.7rem; color: #fecaca; margin-top: 4px;">Locks ICU bed & alerts surgical trauma bay</span>
            </div>
          </div>
        </div>
      `;
    }
  }

  // 6. Citizen Dashboard View
  renderCitizenDashboard() {
    const citizen = window.medStore.state.session.citizen;
    const emg = window.medStore.getActiveEmergency();

    const citizenNameEl = document.getElementById('citizenDashName');
    if (citizenNameEl) {
      citizenNameEl.innerText = citizen.id ? citizen.name : "Citizen Dashboard";
    }

    const citizenLocEl = document.getElementById('citizenDashLocality');
    if (citizenLocEl) citizenLocEl.innerText = citizen.locality || "Dharampeth, Nagpur";

    const citizenBloodEl = document.getElementById('citizenDashBlood');
    if (citizenBloodEl) citizenBloodEl.innerText = citizen.bloodGroup || "O+";

    const donorBadge = document.getElementById('citizenDonorStatusBadge');
    if (donorBadge) {
      if (citizen.isRegisteredDonor) {
        donorBadge.className = "badge badge-success";
        donorBadge.innerText = "✓ Registered Blood Donor";
      } else {
        donorBadge.className = "badge badge-neutral";
        donorBadge.innerText = citizen.id ? "● Verified Citizen" : "● Standard Citizen";
      }
    }

    const activeEmgCard = document.getElementById('citizenActiveEmgCard');
    if (activeEmgCard) {
      if (emg && emg.status !== 'COMPLETED' && emg.status !== 'DISCHARGED') {
        const etaMins = Math.floor((emg.etaSeconds || 0) / 60);
        const etaSecs = (emg.etaSeconds || 0) % 60;
        const clock = `${String(etaMins).padStart(2, '0')}:${String(etaSecs).padStart(2, '0')}`;

        const pName = emg.patient ? emg.patient.name : emg.patientName;
        const pCond = emg.patient ? emg.patient.condition : emg.condition;
        const pSev = emg.patient ? emg.patient.severity : emg.severity;
        const ambCode = emg.ambulance ? emg.ambulance.code : emg.ambulanceCode;
        const hospName = emg.hospital ? emg.hospital.name : emg.hospitalName;
        const isSos = emg.isSos || emg.severity === 'CRITICAL-SOS';

        activeEmgCard.innerHTML = `
          <div class="card card-critical animate-fade-in-up" style="padding: var(--space-5); border: 2px solid #ef4444; box-shadow: 0 10px 30px rgba(220, 38, 38, 0.25);">
            ${isSos ? `
              <div style="padding: 8px 14px; background: rgba(220, 38, 38, 0.15); border-radius: 8px; border: 1px solid rgba(220, 38, 38, 0.4); margin-bottom: 12px; display: flex; align-items: center; gap: 8px; font-size: 0.88rem; font-weight: 800; color: #dc2626;">
                <span class="live-dot-red"></span>
                <span>🚨 SOS DISPATCHED: Nearest hospital and ambulance have received your live GPS location. Stay calm.</span>
              </div>
            ` : ''}
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="live-dot-red"></span>
                <strong style="color: var(--critical-700); font-size: 1rem;">ACTIVE EMERGENCY IN PROGRESS</strong>
              </div>
              <span class="badge badge-critical animate-critical-flash">${pSev}</span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr auto; gap: 16px; align-items: center;">
              <div>
                <div style="font-size: 0.88rem; color: #0f172a;"><strong>Patient:</strong> ${pName} (${pCond})</div>
                <div style="font-size: 0.8rem; color: #64748b; margin-top: 2px;">Assigned: <strong>${ambCode}</strong> • Target: <strong>${hospName}</strong></div>
              </div>
              <div>
                <div style="font-size: 0.75rem; color: #64748b; text-transform: uppercase;">Estimated Arrival</div>
                <div class="font-mono" id="citizenDashEtaClock" style="font-size: 1.6rem; font-weight: 800; color: #dc2626;">${clock}</div>
              </div>
              <button class="btn btn-sm btn-critical btn-tactile" data-view-target="ambulance">
                📍 Track Live GPS Route ➔
              </button>
            </div>
          </div>
        `;
      } else {
        activeEmgCard.innerHTML = `
          <div class="card" style="padding: var(--space-4); background: #f8fafc; border-style: dashed; text-align: center;">
            <p style="font-size: 0.85rem; color: #64748b; margin: 0;">No active emergency in progress. Click "Request Ambulance" or "Emergency SOS" to dispatch nearest Nagpur ambulance.</p>
          </div>
        `;
      }
    }
  }

  // 7. Condition-Based Smart Hospital Recommendation Screen
  showHospitalRecommendations(conditionName, severity, locality) {
    const evaluation = window.medStore.evaluateHospitalsForCondition(conditionName, severity, locality);
    this.currentMatchingData = {
      patientName: (this.currentMatchingData && this.currentMatchingData.patientName) || window.medStore.state.session.citizen.name || "Emergency Patient",
      age: (this.currentMatchingData && this.currentMatchingData.age) || 35,
      conditionName,
      severity,
      locality,
      evaluation
    };

    const condTitle = document.getElementById('matchPatientCondition');
    if (condTitle) condTitle.innerText = `${conditionName} (${severity})`;

    const condReqList = document.getElementById('matchRequiredResourcesList');
    if (condReqList && evaluation.condition && evaluation.condition.requiredResources) {
      condReqList.innerHTML = evaluation.condition.requiredResources.map(r => `
        <span class="alert-req-pill" style="background: rgba(37,99,235,0.1); color: #1d4ed8; border-color: #93c5fd;">
          ✓ ${r}
        </span>
      `).join('');
    }

    const cardsContainer = document.getElementById('hospitalRecommendationsGrid');
    if (cardsContainer) {
      cardsContainer.innerHTML = evaluation.hospitals.map((h, idx) => {
        const isTop = idx === 0 && h.isRecommended;
        const matchBadgeColor = h.matchScore >= 85 ? 'badge-success' : (h.matchScore >= 65 ? 'badge-urgent' : 'badge-critical');

        return `
          <div class="card ${isTop ? 'card-elevated' : ''}" style="padding: var(--space-6); border: ${isTop ? '2px solid #2563eb' : '1px solid #e2e8f0'}; position: relative; margin-bottom: var(--space-4); background: #ffffff;">
            ${isTop ? `
              <div style="position: absolute; top: -12px; right: 24px; background: #2563eb; color: #fff; font-size: 0.75rem; font-weight: 800; padding: 3px 12px; border-radius: 9999px; text-transform: uppercase;">
                ★ Top Recommendation
              </div>
            ` : ''}
            <div style="display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 16px;">
              <div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <h3 style="font-size: 1.25rem; color: var(--navy-900); margin: 0;">${h.name}</h3>
                  <span class="badge badge-neutral" style="font-size: 0.7rem;">${h.code}</span>
                </div>
                <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">📍 ${h.locality}, Nagpur</p>
              </div>
              <div style="text-align: right;">
                <span class="badge ${matchBadgeColor}" style="font-size: 1.1rem; padding: 6px 14px; font-weight: 800;">
                  ${h.matchScore}% Match
                </span>
                <div style="font-size: 0.8rem; font-weight: 700; color: #2563eb; margin-top: 4px;">
                  Ambulance ETA: ${h.etaMinutes} min
                </div>
              </div>
            </div>

            <!-- Resource Evaluation Breakdown -->
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; background: #f8fafc; padding: 12px; border-radius: 12px; margin-bottom: 16px; font-size: 0.8rem;">
              <div>
                <span style="color: #64748b; display: block; font-size: 0.7rem;">ICU Beds</span>
                <strong style="color: ${h.icuStatus === 'green' ? '#16a34a' : (h.icuStatus === 'amber' ? '#d97706' : '#dc2626')};">
                  ${h.icuStatus === 'green' ? '🟢' : (h.icuStatus === 'amber' ? '🟠' : '🔴')} ${h.icuAvailable} available
                </strong>
              </div>
              <div>
                <span style="color: #64748b; display: block; font-size: 0.7rem;">Trauma Unit</span>
                <strong style="color: ${h.traumaStatus === 'green' ? '#16a34a' : '#dc2626'};">
                  ${h.traumaStatus === 'green' ? '🟢' : '🔴'} ${h.traumaAvailable}
                </strong>
              </div>
              <div>
                <span style="color: #64748b; display: block; font-size: 0.7rem;">Ventilator</span>
                <strong style="color: ${h.ventilatorStatus === 'green' ? '#16a34a' : (h.ventilatorStatus === 'amber' ? '#d97706' : '#dc2626')};">
                  ${h.ventilatorStatus === 'green' ? '🟢' : (h.ventilatorStatus === 'amber' ? '🟠' : '🔴')} ${h.ventilatorAvailable}
                </strong>
              </div>
              <div>
                <span style="color: #64748b; display: block; font-size: 0.7rem;">Emergency Team</span>
                <strong style="color: ${h.emergencyTeamStatus === 'green' ? '#16a34a' : '#d97706'};">
                  ${h.emergencyTeamStatus === 'green' ? '🟢' : '🟠'} ${h.emergencyTeamAvailable}
                </strong>
              </div>
            </div>

            ${h.reasons && h.reasons.length > 0 ? `
              <div style="font-size: 0.75rem; color: #dc2626; margin-bottom: 12px;">
                ⚠️ Note: ${h.reasons.join(', ')}
              </div>
            ` : ''}

            <!-- CTA Action -->
            <div style="display: flex; align-items: center; justify-content: flex-end;">
              ${h.isRecommended ? `
                <button class="btn btn-primary btn-tactile" onclick="window.app.selectRecommendedHospital('${h.hospitalId}')">
                  ✓ SELECT THIS HOSPITAL
                </button>
              ` : `
                <div style="display: flex; align-items: center; gap: 10px;">
                  <span style="font-size: 0.8rem; color: #dc2626; font-weight: 700;">NOT RECOMMENDED (Missing Critical Resources)</span>
                  <button class="btn btn-secondary btn-sm" onclick="window.app.selectRecommendedHospital('${h.hospitalId}')">
                    Select Anyway
                  </button>
                </div>
              `}
            </div>
          </div>
        `;
      }).join('');
    }

    this.switchView('hospital-match');
  }

  async selectRecommendedHospital(hospitalId) {
    const patientName = (this.currentMatchingData && this.currentMatchingData.patientName) || window.medStore.state.session.citizen.name || "Emergency Patient";
    const age = (this.currentMatchingData && this.currentMatchingData.age) || 35;
    const condition = (this.currentMatchingData && this.currentMatchingData.conditionName) || "Accident / Trauma";
    const severity = (this.currentMatchingData && this.currentMatchingData.severity) || "CRITICAL";
    const locality = (this.currentMatchingData && this.currentMatchingData.locality) || "Dharampeth, Nagpur";

    await window.medStore.bookAmbulanceWithHospital(hospitalId, {
      patientName,
      age,
      condition,
      severity,
      locality
    });

    const hosp = window.medStore.getHospitalById(hospitalId) || { name: 'Emergency Hospital' };
    this.showToast(`✓ Ambulance Dispatched to ${hosp.name}!`, "success");
    if (window.medAudio) window.medAudio.playEmergencyAlert();

    this.switchView('ambulance');
    if (window.nagpurMap) {
      setTimeout(() => {
        window.nagpurMap.init();
        window.nagpurMap.updateEmergencyRoute();
        window.nagpurMap.focusAmbulance();
      }, 150);
    }
  }

  // 8. Hospital Command Center (EOC)
  renderHospitalEOC() {
    const hosp = window.medStore.getCurrentHospitalData();
    if (!hosp) return;

    const titleEl = document.getElementById('eocHospitalTitle');
    if (titleEl) titleEl.innerText = hosp.name;

    const codeEl = document.getElementById('eocHospitalCodeBadge');
    if (codeEl) codeEl.innerText = `ID: ${hosp.code} • ${hosp.locality}, Nagpur`;

    const eocIncoming = document.getElementById('eocIncomingVal');
    if (eocIncoming) {
      const activeInbound = (hosp.inboundQueue || []).filter(p => p.status !== 'DISCHARGED');
      eocIncoming.innerText = activeInbound.length;
    }

    const eocCritical = document.getElementById('eocCriticalVal');
    if (eocCritical) eocCritical.innerText = hosp.activeAlert15m && !hosp.activeAlert15m.isAccepted ? '1' : '0';

    const eocIcu = document.getElementById('eocIcuVal');
    if (eocIcu) eocIcu.innerText = hosp.icuBedsAvailable;

    const eocVent = document.getElementById('eocVentVal');
    if (eocVent) eocVent.innerText = hosp.ventilatorsAvailable;

    const eocBlood = document.getElementById('eocBloodVal');
    if (eocBlood) eocBlood.innerText = `${hosp.bloodReservePercentage || 90}%`;

    // Resource Progress Bars
    const icuFill = document.getElementById('icuBarFill');
    const icuLabel = document.getElementById('icuAvailableLabel');
    if (icuFill && icuLabel) {
      const pct = Math.round((hosp.icuBedsAvailable / (hosp.icuBedsTotal || 24)) * 100);
      icuFill.style.width = `${pct}%`;
      icuFill.style.backgroundColor = pct < 25 ? 'var(--critical-500)' : 'var(--success-500)';
      icuLabel.innerText = `${hosp.icuBedsAvailable} available (${hosp.icuBedsTotal || 24} total)`;
    }

    const ventFill = document.getElementById('ventBarFill');
    const ventLabel = document.getElementById('ventAvailableLabel');
    if (ventFill && ventLabel) {
      const pct = Math.round((hosp.ventilatorsAvailable / (hosp.ventilatorsTotal || 18)) * 100);
      ventFill.style.width = `${pct}%`;
      ventFill.style.backgroundColor = pct < 25 ? 'var(--critical-500)' : 'var(--primary-500)';
      ventLabel.innerText = `${hosp.ventilatorsAvailable} available (${hosp.ventilatorsTotal || 18} total)`;
    }

    const traumaFill = document.getElementById('traumaBarFill');
    const traumaLabel = document.getElementById('traumaAvailableLabel');
    if (traumaFill && traumaLabel) {
      const pct = Math.round((hosp.traumaUnitsAvailable / (hosp.traumaUnitsTotal || 6)) * 100);
      traumaFill.style.width = `${pct}%`;
      traumaFill.style.backgroundColor = hosp.traumaUnitsAvailable === 0 ? 'var(--critical-500)' : 'var(--warning-500)';
      traumaLabel.innerText = `${hosp.traumaUnitsAvailable} available (${hosp.traumaUnitsTotal || 6} total)`;
    }

    // ICU Slot Matrix
    const icuSlotsContainer = document.getElementById('icuSlotsGrid');
    if (icuSlotsContainer) {
      icuSlotsContainer.innerHTML = '';
      const total = hosp.icuBedsTotal || 24;
      for (let i = 0; i < total; i++) {
        const slot = document.createElement('div');
        slot.className = 'resource-slot';
        if (i < hosp.icuBedsAvailable) {
          slot.classList.add('available');
          slot.title = `ICU Bed #${i + 1}: Available`;
        } else if (i === hosp.icuBedsAvailable && hosp.activeAlert15m && !hosp.activeAlert15m.isAccepted) {
          slot.classList.add('reserved');
          slot.title = `ICU Bed #${i + 1}: Reserved (${hosp.activeAlert15m.patientName})`;
        } else {
          slot.classList.add('occupied');
          slot.title = `ICU Bed #${i + 1}: Occupied`;
        }
        icuSlotsContainer.appendChild(slot);
      }
    }

    // Populate Bed & Resource Management Form Inputs
    const invIcuAvail = document.getElementById('invIcuAvailable');
    const invIcuTot = document.getElementById('invIcuTotal');
    const invNormAvail = document.getElementById('invNormalAvailable');
    const invNormTot = document.getElementById('invNormalTotal');
    const invVentAvail = document.getElementById('invVentAvailable');
    const invVentTot = document.getElementById('invVentTotal');
    const invTraumaAvail = document.getElementById('invTraumaAvailable');
    const invTraumaTot = document.getElementById('invTraumaTotal');
    const invSurge = document.getElementById('invSurgeStatus');
    const invDoctor = document.getElementById('invHeadDoctor');
    const invPhone = document.getElementById('invEmergencyPhone');
    const invTeam = document.getElementById('invTeamStatus');
    const invBlood = document.getElementById('invBloodReserve');

    if (invIcuAvail) invIcuAvail.value = hosp.icuBedsAvailable;
    if (invIcuTot) invIcuTot.value = hosp.icuBedsTotal || 24;
    if (invNormAvail) invNormAvail.value = hosp.normalBedsAvailable !== undefined ? hosp.normalBedsAvailable : 18;
    if (invNormTot) invNormTot.value = hosp.normalBedsTotal || 50;
    if (invVentAvail) invVentAvail.value = hosp.ventilatorsAvailable;
    if (invVentTot) invVentTot.value = hosp.ventilatorsTotal || 18;
    if (invTraumaAvail) invTraumaAvail.value = hosp.traumaUnitsAvailable;
    if (invTraumaTot) invTraumaTot.value = hosp.traumaUnitsTotal || 6;
    if (invSurge && hosp.surgeStatus) invSurge.value = hosp.surgeStatus;
    if (invDoctor && hosp.headDoctor) invDoctor.value = hosp.headDoctor;
    if (invPhone && hosp.emergencyContact) invPhone.value = hosp.emergencyContact;
    if (invTeam && hosp.emergencyTeamStatus) invTeam.value = hosp.emergencyTeamStatus;
    if (invBlood) invBlood.value = hosp.bloodReservePercentage || 94;

    // Hospital Inbound Queue with Complete Patient Discharge & Feedback Actions
    const queueContainer = document.getElementById('hospitalInboundQueue');
    if (queueContainer) {
      if (!hosp.inboundQueue || hosp.inboundQueue.length === 0) {
        queueContainer.innerHTML = `<p style="font-size:0.85rem; color:#64748b; padding:16px; text-align:center;">No active incoming ambulances for ${hosp.name}.</p>`;
      } else {
        queueContainer.innerHTML = hosp.inboundQueue.map(p => {
          const isCritical = p.severity === 'CRITICAL';
          const isDischarged = p.status === 'DISCHARGED';
          const isAdmitted = p.status === 'ADMITTED';
          const badgeClass = isCritical ? 'badge-critical' : (p.severity === 'URGENT' ? 'badge-urgent' : 'badge-neutral');
          const mins = Math.floor((p.etaSeconds || 0) / 60);
          const secs = (p.etaSeconds || 0) % 60;
          const etaFormatted = isDischarged ? "DISCHARGED" : (p.etaSeconds === 0 || isAdmitted ? "ARRIVED" : `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);

          return `
            <div class="patient-inbound-card ${isCritical && !p.accepted && !isDischarged ? 'critical-state' : ''}" style="${isDischarged ? 'border-left: 4px solid #10b981; background: #f0fdf4;' : ''}">
              <div class="patient-info-main">
                <div class="patient-avatar-badge" style="${isDischarged ? 'background: #dcfce7; color: #15803d;' : ''}">${(p.patientName || 'P').charAt(0)}</div>
                <div style="flex: 1;">
                  <div class="patient-meta-name">
                    ${p.patientName} (${p.age || '40'}y)
                    <span class="badge ${isDischarged ? 'badge-success' : badgeClass}" style="margin-left: 6px;">
                      ${isDischarged ? '✓ Discharged & Good' : (isAdmitted ? '🏥 In Emergency Care' : p.severity)}
                    </span>
                  </div>
                  <div class="patient-meta-details">
                    <strong>Complaint:</strong> ${p.condition} • <strong>Ambulance:</strong> ${p.ambulanceCode}
                  </div>
                  <div style="font-size: 0.78rem; color: ${isDischarged ? '#15803d' : '#2563eb'}; font-weight: 600; margin-top: 3px;">
                    ${p.bedStatus || 'ICU Unit Reserved'}
                  </div>
                  ${isDischarged && p.doctorFeedback ? `
                    <div style="margin-top: 6px; padding: 8px 12px; background: #ffffff; border-radius: 8px; border: 1px solid #bbf7d0; font-size: 0.78rem; color: #166534; line-height: 1.4;">
                      💬 <strong>Doctor Feedback:</strong> "${p.doctorFeedback}"
                    </div>
                  ` : ''}
                </div>
              </div>
              <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 6px; min-width: 140px;">
                <div style="font-size: 0.7rem; color: #64748b; font-weight: 700; text-transform: uppercase;">
                  ${isDischarged ? 'Status' : 'ETA'}
                </div>
                <div class="font-mono" style="font-size: ${isDischarged ? '0.95rem' : '1.3rem'}; font-weight: 800; color: ${isDischarged ? '#10b981' : (p.etaSeconds === 0 ? '#10b981' : (isCritical ? 'var(--critical-600)' : 'var(--navy-900)'))};">
                  ${etaFormatted}
                </div>
                <div style="display: flex; flex-direction: column; gap: 4px; width: 100%;">
                  ${isDischarged ? `
                    <span class="badge badge-success" style="width: 100%; text-align: center;">✓ Seat Freed (+1)</span>
                  ` : (isAdmitted ? `
                    <button class="btn btn-sm btn-success btn-tactile" style="width: 100%; font-weight: 700;" onclick="window.app.openDischargeModal('${p.id}', '${p.patientName}', '${p.severity}', '${p.condition}', '${p.ambulanceCode}')">
                      🏥 Discharge Patient
                    </button>
                  ` : (p.accepted ? `
                    <button class="btn btn-sm btn-primary btn-tactile" style="width: 100%; font-weight: 600; margin-bottom: 2px;" onclick="window.medStore.admitPatient('${hosp.id}', '${p.id}')">
                      🏥 Mark Admitted
                    </button>
                    <button class="btn btn-sm btn-success btn-tactile" style="width: 100%; font-weight: 600;" onclick="window.app.openDischargeModal('${p.id}', '${p.patientName}', '${p.severity}', '${p.condition}', '${p.ambulanceCode}')">
                      Discharge & Free Bed
                    </button>
                  ` : `
                    <button class="btn btn-sm btn-critical btn-tactile" style="width: 100%; font-weight: 700;" onclick="window.medStore.acceptAndPrepare15mAlert('${hosp.id}', '${p.id}'); window.medAudio.playSuccessChime(); window.app.showToast('✓ PREPARATION CONFIRMED: Locked ICU bay for ${p.patientName}!', 'success');">
                      Accept Alert
                    </button>
                  `))}
                  ${!isDischarged ? `
                    <button class="btn btn-sm btn-ghost" style="width: 100%; color: #dc2626; border: 1px solid #fecdd3; font-size: 0.72rem; padding: 2px 6px; margin-top: 2px;" onclick="window.app.openDivertModal('${p.id}', '${p.patientName}', '${p.severity}', '${p.condition}', '${p.ambulanceCode}')">
                      ❌ Divert Ambulance
                    </button>
                  ` : ''}
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  }

  // 9. Blood Connect Rendering
  renderDonorsList() {
    const donorsContainer = document.getElementById('donorsListGrid');
    if (!donorsContainer) return;

    const allDonors = [...window.medStore.state.registeredDonors, ...NAGPUR_DATA.donors];
    const filtered = allDonors.filter(d => d.bloodGroup === this.selectedBloodGroup || this.selectedBloodGroup === 'ALL');

    const matchingCountEl = document.getElementById('matchingDonorsCount');
    if (matchingCountEl) matchingCountEl.innerText = `${filtered.length} Matching Donors Found in Nagpur`;

    donorsContainer.innerHTML = filtered.map(d => {
      const isContacted = window.medStore.state.contactedDonors[d.id];

      return `
        <div class="donor-card animate-fade-in-up">
          <div>
            <div class="donor-header-row">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div class="donor-blood-badge">${d.bloodGroup}</div>
                <div class="donor-meta">
                  <span class="donor-name">${d.name} ${d.verified ? '✓' : ''}</span>
                  <span class="donor-locality">📍 ${d.locality} (~${d.distanceKm || 2.5} km away)</span>
                </div>
              </div>
              <span class="badge badge-success">● ${d.status || 'Available'}</span>
            </div>
            <div class="donor-stats-row">
              <span><strong>Last:</strong> ${d.lastDonated || 'Recent'}</span>
              <span><strong>Donations:</strong> ${d.donationsCount || 0}</span>
              <span><strong>Avg Response:</strong> ${d.responseTimeAvg || '5 mins'}</span>
            </div>
          </div>
          <div style="margin-top: 12px;">
            ${isContacted ? `
              <button class="btn btn-sm btn-success" style="width: 100%;" disabled>
                ✓ Request Dispatched
              </button>
            ` : `
              <button class="btn btn-sm btn-critical btn-tactile" style="width: 100%;" onclick="window.app.openContactDonorModal('${d.id}')">
                CONTACT DONOR
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');
  }

  renderBloodRequests() {
    const requestsContainer = document.getElementById('activeBloodRequestsList');
    if (!requestsContainer) return;

    const reqs = window.medStore.getBloodRequests();
    requestsContainer.innerHTML = reqs.map(r => `
      <div style="padding: 14px 18px; background: #ffffff; border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 2px 6px rgba(15,23,42,0.04);">
        <div style="display: flex; align-items: center; gap: 14px;">
          <span style="font-weight: 900; font-size: 1.15rem; color: #dc2626; background: #fee2e2; border: 1px solid #fca5a5; padding: 4px 12px; border-radius: 10px;">${r.bloodGroup}</span>
          <div>
            <div style="font-weight: 800; color: var(--navy-900); font-size: 0.95rem;">${r.patientName} (${r.unitsRequired} Units)</div>
            <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">${r.hospital} • ${r.requestedAt || 'Active'}</div>
          </div>
        </div>
        <span class="badge ${r.urgency === 'CRITICAL' ? 'badge-critical' : 'badge-urgent'}">${r.urgency}</span>
      </div>
    `).join('');
  }

  renderBloodBankInventory() {
    const inventoryContainer = document.getElementById('bloodBankInventoryBody');
    if (!inventoryContainer) return;

    const banks = NAGPUR_DATA.bloodBanks;
    inventoryContainer.innerHTML = banks.map(b => `
      <tr>
        <td><strong style="color: var(--navy-900);">${b.name}</strong><br><span style="font-size: 0.78rem; color: var(--text-muted);">${b.locality}</span></td>
        <td><span class="badge badge-success">${b.stock['O+']} Units</span></td>
        <td><span class="badge badge-primary">${b.stock['B+']} Units</span></td>
        <td><span class="badge badge-neutral">${b.stock['A+']} Units</span></td>
        <td><span class="badge badge-neutral">${b.stock['AB+']} Units</span></td>
        <td><span class="badge badge-critical">${b.stock['O-']} Units</span></td>
        <td>
          <button class="btn btn-sm btn-secondary btn-tactile" onclick="window.app.showToast('Connecting to ${b.name} Dispatch: ${b.contact}', 'primary')">
            Direct Dispatch
          </button>
        </td>
      </tr>
    `).join('');
  }

  // ==========================================
  // 10. OWNER / ADMIN DASHBOARD RENDERING (RESTRICTED DATA VAULT)
  // ==========================================
  renderAdminDashboard() {
    const adminData = window.medStore.state.adminData;
    if (!adminData) return;

    const stats = adminData.stats || {};

    // 1. Fill KPI Metrics
    const statUsers = document.getElementById('adminStatUsers');
    if (statUsers) statUsers.innerText = stats.totalUsers || adminData.users.length;

    const statDonors = document.getElementById('adminStatDonors');
    if (statDonors) statDonors.innerText = stats.totalDonors || adminData.bloodDonors.length;

    const statAmbulance = document.getElementById('adminStatAmbulances');
    if (statAmbulance) statAmbulance.innerText = stats.totalAmbulanceRequests || adminData.ambulanceRequests.length;

    const statBloodReqs = document.getElementById('adminStatBloodReqs');
    if (statBloodReqs) statBloodReqs.innerText = stats.totalBloodRequests || adminData.bloodRequests.length;

    const statLogins = document.getElementById('adminStatLogins');
    if (statLogins) statLogins.innerText = stats.totalLoginEvents || adminData.loginLogs.length;

    // Badges in tab buttons
    const badgeDonors = document.getElementById('adminTabBadgeDonors');
    if (badgeDonors) badgeDonors.innerText = adminData.bloodDonors.length;

    const badgeAmb = document.getElementById('adminTabBadgeAmb');
    if (badgeAmb) badgeAmb.innerText = adminData.ambulanceRequests.length;

    const badgeUsers = document.getElementById('adminTabBadgeUsers');
    if (badgeUsers) badgeUsers.innerText = adminData.users.length;

    const badgeLogs = document.getElementById('adminTabBadgeLogs');
    if (badgeLogs) badgeLogs.innerText = adminData.loginLogs.length;

    // 2. Render Donors Table (Admin has full unmasked contact details)
    this.renderAdminDonorsTable(adminData.bloodDonors);

    // 3. Render Ambulance Requests Table
    this.renderAdminAmbulanceTable(adminData.ambulanceRequests);

    // 4. Render Users Table
    this.renderAdminUsersTable(adminData.users);

    // 5. Render Audit Logs Table
    this.renderAdminLogsTable(adminData.loginLogs);
  }

  renderAdminDonorsTable(donors) {
    const tbody = document.getElementById('adminDonorsTableBody');
    if (!tbody) return;

    if (!donors || donors.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 24px;">No blood donors registered yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = donors.map(d => `
      <tr>
        <td><code style="background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; padding: 3px 8px; border-radius: 6px; font-size: 0.8rem;">${d.id}</code></td>
        <td><strong style="color: var(--navy-900);">${d.name}</strong></td>
        <td><span class="badge badge-critical" style="font-weight: 900;">${d.bloodGroup}</span></td>
        <td>
          <a href="tel:${(d.phone || '').replace(/\s+/g, '')}" style="color: #059669; font-weight: 800; text-decoration: none;">
            📞 ${d.phone || '+91 98220 00000'}
          </a>
        </td>
        <td style="color: var(--text-main);">📍 ${d.locality}</td>
        <td><strong style="color: var(--navy-900);">${d.donationsCount || 0}</strong> donations</td>
        <td style="font-size: 0.82rem; color: var(--text-muted);">${d.registeredAt ? new Date(d.registeredAt).toLocaleDateString() : 'Active'}</td>
        <td><span class="badge badge-success">● ${d.status || 'Available'}</span></td>
        <td>
          <button class="btn btn-sm btn-primary btn-tactile" onclick="window.app.openContactDonorModal('${d.id}')">
            SMS Alert
          </button>
        </td>
      </tr>
    `).join('');
  }

  filterAdminDonors(query) {
    const adminData = window.medStore.state.adminData;
    if (!adminData || !adminData.bloodDonors) return;

    const q = query.toLowerCase().trim();
    if (!q) {
      this.renderAdminDonorsTable(adminData.bloodDonors);
      return;
    }

    const filtered = adminData.bloodDonors.filter(d =>
      d.name.toLowerCase().includes(q) ||
      d.bloodGroup.toLowerCase().includes(q) ||
      d.locality.toLowerCase().includes(q) ||
      (d.phone && d.phone.includes(q))
    );

    this.renderAdminDonorsTable(filtered);
  }

  renderAdminAmbulanceTable(requests) {
    const tbody = document.getElementById('adminAmbulanceTableBody');
    if (!tbody) return;

    if (!requests || requests.length === 0) {
      tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; color: var(--text-muted); padding: 24px;">No ambulance requests logged yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = requests.map(r => {
      const isCritical = r.severity === 'CRITICAL';
      const badgeClass = isCritical ? 'badge-critical' : (r.severity === 'URGENT' ? 'badge-urgent' : 'badge-neutral');
      const timeStr = r.createdAt ? new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active';

      return `
        <tr>
          <td><code style="background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; padding: 3px 8px; border-radius: 6px; font-size: 0.8rem;">${r.id}</code></td>
          <td><strong style="color: var(--navy-900);">${r.patientName}</strong></td>
          <td style="color: var(--text-muted);">${r.age}y</td>
          <td style="color: var(--navy-900); font-weight: 700;">${r.condition}</td>
          <td><span class="badge ${badgeClass}">${r.severity}</span></td>
          <td style="color: var(--text-main);">📍 ${r.locality}</td>
          <td><strong style="color: #059669;">${r.hospitalName || r.hospitalId}</strong></td>
          <td><span class="badge badge-primary font-mono">${r.ambulanceCode}</span></td>
          <td class="font-mono" style="font-weight: 800; color: #2563eb;">${r.etaMinutes || 14}m</td>
          <td><span class="badge badge-success">${r.status || 'EN ROUTE'}</span></td>
          <td style="font-size: 0.82rem; color: var(--text-muted);">${timeStr}</td>
        </tr>
      `;
    }).join('');
  }

  renderAdminUsersTable(users) {
    const tbody = document.getElementById('adminUsersTableBody');
    if (!tbody) return;

    if (!users || users.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 24px;">No users registered yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = users.map(u => {
      const roleBadge = u.role === 'admin' ? 'badge-critical' : (u.role === 'hospital' ? 'badge-urgent' : 'badge-primary');
      const createdStr = u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A';
      const lastLoginStr = u.lastLogin ? new Date(u.lastLogin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never';

      return `
        <tr>
          <td><code style="background: #f5f3ff; color: #7c3aed; border: 1px solid #ddd6fe; padding: 3px 8px; border-radius: 6px; font-size: 0.8rem;">${u.id}</code></td>
          <td><strong style="color: var(--navy-900);">${u.name}</strong></td>
          <td><a href="tel:${(u.phone || '').replace(/\s+/g, '')}" style="color: #2563eb; text-decoration: none;">${u.phone || u.username}</a></td>
          <td><span class="badge ${roleBadge}" style="text-transform: uppercase;">${u.role}</span></td>
          <td style="color: var(--text-main);">${u.locality || 'Nagpur'}</td>
          <td><span class="badge badge-neutral">${u.bloodGroup || 'O+'}</span></td>
          <td>${u.isRegisteredDonor ? '<span class="badge badge-success">✓ Donor</span>' : '<span style="color:var(--text-subtle);">No</span>'}</td>
          <td style="font-size: 0.82rem; color: var(--text-muted);">${createdStr}</td>
          <td style="font-size: 0.82rem; color: var(--text-muted);">${lastLoginStr}</td>
        </tr>
      `;
    }).join('');
  }

  renderAdminLogsTable(logs) {
    const tbody = document.getElementById('adminLogsTableBody');
    if (!tbody) return;

    if (!logs || logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">No audit logs recorded yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = logs.map(l => {
      const isSuccess = l.status.includes('SUCCESS');
      const statusClass = isSuccess ? 'badge-success' : 'badge-critical';
      const timeStr = l.timestamp ? new Date(l.timestamp).toLocaleString() : 'Just now';

      return `
        <tr>
          <td><code style="background: #f1f5f9; color: var(--navy-900); padding: 3px 8px; border-radius: 6px; font-size: 0.8rem;">${l.id}</code></td>
          <td><strong style="color: var(--navy-900);">${l.username || 'System'}</strong></td>
          <td><span class="badge badge-neutral">${l.role || 'GUEST'}</span></td>
          <td><span class="badge ${statusClass}">${l.status}</span></td>
          <td class="font-mono" style="color: var(--text-muted); font-size: 0.82rem;">${l.ipAddress || '127.0.0.1'}</td>
          <td style="font-size: 0.82rem; color: var(--text-muted);">${timeStr}</td>
        </tr>
      `;
    }).join('');
  }

  switchAdminTab(tabName) {
    this.currentAdminTab = tabName;

    // Switch buttons
    ['donors', 'ambulance', 'users', 'logs'].forEach(t => {
      const btn = document.getElementById(`adminTabBtn-${t}`);
      const pane = document.getElementById(`adminTabContent-${t}`);
      if (btn) {
        if (t === tabName) {
          btn.className = 'btn btn-sm btn-primary active';
        } else {
          btn.className = 'btn btn-sm btn-secondary';
        }
      }
      if (pane) {
        pane.style.display = t === tabName ? 'block' : 'none';
      }
    });

    if (this.currentView !== 'admin') {
      this.switchView('admin');
    }
  }

  // --- Modals and Form Handlers ---
  setupModalsAndActions() {
    document.querySelectorAll('.blood-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.blood-type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedBloodGroup = btn.getAttribute('data-blood-type');
        this.renderDonorsList();
      });
    });

    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.closeAllModals();
      });
    });

    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeAllModals();
        }
      });
    });

    // 1. Citizen Login Form
    const citizenLoginForm = document.getElementById('citizenLoginForm');
    if (citizenLoginForm) {
      citizenLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('loginCitizenName').value.trim();
        const phone = document.getElementById('loginCitizenPhone').value.trim();
        if (!name || !phone) return;

        await window.medStore.loginAsCitizen({ name, phone });
        this.closeAllModals();
        this.showToast(`👤 Welcome back, ${name}!`, "success");
        this.switchView('citizen');
      });
    }

    // 2. Citizen Register Form
    const citizenRegisterForm = document.getElementById('citizenRegisterForm');
    if (citizenRegisterForm) {
      citizenRegisterForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('regCitizenName').value.trim();
        const phone = document.getElementById('regCitizenPhone').value.trim();
        const bloodGroup = document.getElementById('regCitizenBlood').value;
        const locality = document.getElementById('regCitizenLocality').value;

        if (!name || !phone) return;

        if (window.medApi) {
          try {
            const res = await window.medApi.register({ name, phone, bloodGroup, locality });
            if (res.success && res.user) {
              window.medStore.state.session.citizen = {
                id: res.user.id,
                name: res.user.name,
                phone: res.user.phone,
                bloodGroup: res.user.bloodGroup,
                locality: res.user.locality,
                isRegisteredDonor: false
              };
              window.medStore.state.session.role = 'citizen';
              window.medStore.saveState();
              window.medStore.notify('SESSION_CHANGED', window.medStore.state.session);
            }
          } catch (err) {
            console.warn('Backend register note:', err.message);
            window.medStore.loginAsCitizen({ name, phone, bloodGroup, locality });
          }
        } else {
          window.medStore.loginAsCitizen({ name, phone, bloodGroup, locality });
        }

        this.closeAllModals();
        this.showToast(`👤 Citizen Account created for ${name}!`, "success");
        this.switchView('citizen');
      });
    }

    // 3. Hospital Login Form
    const hospitalLoginForm = document.getElementById('hospitalLoginForm');
    if (hospitalLoginForm) {
      hospitalLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const hospId = document.getElementById('loginHospitalId').value;
        const pass = document.getElementById('loginHospitalPassword') ? document.getElementById('loginHospitalPassword').value : 'hospital123';
        const success = await window.medStore.loginAsHospital(hospId, pass);
        if (success) {
          this.initHospitalSSE();
          this.closeAllModals();
          const hosp = window.medStore.getCurrentHospitalData();
          this.showToast(`🏥 Logged into ${hosp ? hosp.name : hospId} Command Center`, "success");
          this.switchView('hospital');
        } else {
          this.showToast("Invalid Hospital ID", "critical");
        }
      });
    }

    // 4. Owner / Admin Login Form
    const adminLoginForm = document.getElementById('adminLoginForm');
    if (adminLoginForm) {
      adminLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('loginAdminUsername').value.trim();
        const pass = document.getElementById('loginAdminPassword').value.trim();

        const res = await window.medStore.loginAsAdmin(username, pass);
        if (res && res.success) {
          this.closeAllModals();
          this.showToast("🔐 Logged in as Platform Owner & Administrator!", "success");
          this.switchView('admin');
        } else {
          this.showToast(res && res.message ? res.message : "Invalid Admin Credentials", "critical");
        }
      });
    }

    // 5. Condition-Based Ambulance Request Form (Step 1)
    const requestAmbulanceForm = document.getElementById('requestAmbulanceForm');
    if (requestAmbulanceForm) {
      requestAmbulanceForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const patientName = document.getElementById('reqAmbPatientName').value.trim() || window.medStore.state.session.citizen.name || "Emergency Patient";
        const age = document.getElementById('reqAmbAge').value || 35;
        const condition = document.getElementById('reqAmbCondition').value;
        const severity = document.getElementById('reqAmbSeverity').value;
        const locality = document.getElementById('reqAmbLocality').value;

        this.closeAllModals();
        this.currentMatchingData = { patientName, age, conditionName: condition, severity, locality };
        this.showHospitalRecommendations(condition, severity, locality);
      });
    }

    // 6. Donor Registration Form
    const donorRegForm = document.getElementById('donorRegistrationForm');
    if (donorRegForm) {
      donorRegForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('donorRegName').value.trim() || window.medStore.state.session.citizen.name;
        const phone = document.getElementById('donorRegPhone') ? document.getElementById('donorRegPhone').value.trim() : window.medStore.state.session.citizen.phone;
        const bloodGroup = document.getElementById('donorRegBlood').value;
        const locality = document.getElementById('donorRegLocality').value;
        const previousDonations = document.getElementById('donorRegCount').value;

        window.medStore.registerCitizenDonor({ name, phone, bloodGroup, locality, previousDonations });
        this.closeAllModals();
        this.showToast(`🩸 Thank you, ${name}! You are registered as an active blood donor in Nagpur.`, "success");
        if (window.medAudio) window.medAudio.playSuccessChime();
      });
    }

    // 7. Contact Donor Form
    const contactDonorForm = document.getElementById('contactDonorForm');
    if (contactDonorForm) {
      contactDonorForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const donorId = document.getElementById('contactDonorId').value;
        window.medStore.contactDonor(donorId);
        this.closeAllModals();
        this.showToast("✓ SMS & WhatsApp Emergency Alert Dispatched to Donor!", "success");
        if (window.medAudio) window.medAudio.playSuccessChime();
      });
    }

    // 8. Hospital Bed & Seat Inventory Form / Save Button
    const saveInventoryBtn = document.getElementById('saveHospitalInventoryBtn');
    if (saveInventoryBtn) {
      saveInventoryBtn.addEventListener('click', () => {
        this.saveHospitalInventory();
      });
    }

    // 9. Patient Discharge & Doctor Feedback Form
    const dischargeForm = document.getElementById('dischargePatientForm');
    if (dischargeForm) {
      dischargeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const requestId = document.getElementById('dischargeRequestId').value;
        const hospitalId = document.getElementById('dischargeHospitalId').value || window.medStore.getCurrentHospitalId();
        const outcome = document.getElementById('dischargeOutcomeSelect').value;
        const feedback = document.getElementById('dischargeFeedbackText').value.trim();

        await window.medStore.dischargePatientWithFeedback(hospitalId, requestId, feedback, outcome);
        this.closeAllModals();
        this.showToast("✓ Patient treatment completed & bed released back to inventory (+1)!", "success");
        if (window.medAudio) window.medAudio.playSuccessChime();
      });
    }

    // 10. Portal Dedicated Login Forms (Citizen, Hospital, Admin)
    // 10. Portal Dedicated Login Forms (Citizen, Hospital, Admin)
    const portalCitizenForm = document.getElementById('portalCitizenLoginForm');
    if (portalCitizenForm) {
      portalCitizenForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('portalCitizenName').value.trim();
        const phone = document.getElementById('portalCitizenPhone').value.trim();
        const bloodGroup = document.getElementById('portalCitizenBlood').value;
        const locality = document.getElementById('portalCitizenLocality').value;
        await window.medStore.loginAsCitizen({ name, phone, bloodGroup, locality });
        this.showToast(`Welcome ${name}! Citizen portal active.`, 'success');
        if (window.medAudio) window.medAudio.playSuccessChime();
        this.switchView('citizen');
      });
    }

    const portalHospitalForm = document.getElementById('portalHospitalLoginForm');
    if (portalHospitalForm) {
      portalHospitalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const hospId = document.getElementById('portalHospitalSelect').value;
        const pass = document.getElementById('portalHospitalPassword').value;
        await window.medStore.loginAsHospital(hospId, pass);
        this.initHospitalSSE();
        const hosp = window.medStore.getCurrentHospitalData();
        this.showToast(`🏥 Logged into ${hosp ? hosp.name : hospId} Command Center`, 'success');
        if (window.medAudio) window.medAudio.playSuccessChime();
        this.switchView('hospital');
      });
    }

    const portalAdminForm = document.getElementById('portalAdminLoginForm');
    if (portalAdminForm) {
      portalAdminForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('portalAdminUsername').value.trim();
        const pass = document.getElementById('portalAdminPassword').value.trim();
        const res = await window.medStore.loginAsAdmin(username, pass);
        if (res && res.success) {
          this.showToast('🔐 Master Admin Control Center Unlocked!', 'success');
          if (window.medAudio) window.medAudio.playSuccessChime();
          this.switchView('admin');
        } else {
          this.showToast('Invalid Admin Credentials', 'critical');
        }
      });
    }

    // 11. Divert Patient Form
    const divertForm = document.getElementById('divertPatientForm');
    if (divertForm) {
      divertForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const requestId = document.getElementById('divertRequestId').value;
        const curHospId = document.getElementById('divertCurrentHospitalId').value || window.medStore.getCurrentHospitalId();
        const targetHospId = document.getElementById('divertTargetHospitalSelect').value;
        const reason = document.getElementById('divertReasonSelect').value;

        await window.medStore.rejectAndDivertPatient(curHospId, requestId, targetHospId, reason);
        this.closeAllModals();
        const targetHosp = window.medStore.getHospitalById(targetHospId);
        this.showToast(`Ambulance diverted & re-routed to ${targetHosp ? targetHosp.name : targetHospId}!`, 'urgent');
        if (window.medAudio) window.medAudio.playSuccessChime();
      });
    }
  }

  // --- Role & Tab Navigation Helpers ---
  openLoginTab(role) {
    this.switchView('login');
    this.switchAuthTab(role);
  }

  switchAuthTab(role) {
    ['citizen', 'hospital', 'admin'].forEach(r => {
      const btn = document.getElementById(`authTabBtn-${r}`);
      const pane = document.getElementById(`authPane-${r}`);
      if (btn) {
        if (r === role) {
          btn.classList.add('active');
          btn.style.borderBottom = '3px solid #2563eb';
          btn.style.color = '#2563eb';
        } else {
          btn.classList.remove('active');
          btn.style.borderBottom = 'none';
          btn.style.color = 'var(--text-muted)';
        }
      }
      if (pane) {
        pane.style.display = r === role ? 'block' : 'none';
      }
    });
  }

  async quickDemoLogin(role, targetId) {
    if (role === 'citizen') {
      const name = targetId || 'Yash Rathod';
      await window.medStore.loginAsCitizen({
        name,
        phone: '+91 98221 00112',
        locality: 'Sitabuldi',
        bloodGroup: 'O+'
      });
      this.showToast(`Welcome ${name}! Logged in to Citizen Portal.`, 'success');
      if (window.medAudio) window.medAudio.playSuccessChime();
      this.switchView('citizen');
    } else if (role === 'hospital') {
      const hospId = targetId || 'NCEH001';
      await window.medStore.loginAsHospital(hospId, 'hospital123');
      this.initHospitalSSE();
      const hosp = window.medStore.getCurrentHospitalData();
      this.showToast(`Logged into ${hosp ? hosp.name : hospId} Emergency EOC!`, 'primary');
      if (window.medAudio) window.medAudio.playSuccessChime();
      this.switchView('hospital');
    } else if (role === 'admin') {
      await window.medStore.loginAsAdmin('admin', 'admin123');
      this.showToast('Authenticated as Platform Master Admin', 'success');
      if (window.medAudio) window.medAudio.playSuccessChime();
      this.switchView('admin');
    }
  }

  // --- 1-Click Instant GPS SOS Emergency System ---
  openSosModal() {
    const modal = document.getElementById('instantSosModal');
    if (!modal) return;

    // Reset status & button text
    const statusBox = document.getElementById('sosGpsStatusBox');
    const statusText = document.getElementById('sosGpsStatusText');
    const confirmBtn = document.getElementById('confirmSosDispatchBtn');

    if (statusBox) {
      statusBox.style.background = '#fef2f2';
      statusBox.style.borderColor = '#fecaca';
      statusBox.style.color = '#991b1b';
    }
    if (statusText) {
      statusText.innerHTML = '📍 Auto-detecting live GPS coordinates in Nagpur...';
    }
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = '🚨 YES, DISPATCH AMBULANCE NOW';
    }

    if (window.medAudio) window.medAudio.playEmergencyAlert();

    this.openModal('instantSosModal');

    // Pre-warm geolocation in background
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (statusText) {
            statusText.innerHTML = `📍 Precise GPS Locked: <strong>${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}</strong> (±${Math.round(pos.coords.accuracy)}m)`;
          }
          if (statusBox) {
            statusBox.style.background = '#ecfdf5';
            statusBox.style.borderColor = '#a7f3d0';
            statusBox.style.color = '#065f46';
          }
        },
        (err) => {
          if (statusText) {
            statusText.innerHTML = '📍 GPS Ready (Using Nagpur City Center fallback)';
          }
        },
        { enableHighAccuracy: true, timeout: 3000, maximumAge: 10000 }
      );
    }
  }

  async confirmSosDispatch() {
    const confirmBtn = document.getElementById('confirmSosDispatchBtn');
    const statusText = document.getElementById('sosGpsStatusText');

    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '⏳ Transmitting Live GPS & Dispatching...';
    }
    if (statusText) {
      statusText.innerHTML = '🛰️ Transmitting emergency telemetry to Nagpur EOC...';
    }

    // Capture live GPS with 3-second timeout
    let gpsCoords = { lat: 21.1458, lng: 79.0882, accuracy: 10 };

    if (navigator.geolocation) {
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 3000,
            maximumAge: 10000
          });
        });
        if (pos && pos.coords) {
          gpsCoords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy
          };
        }
      } catch (e) {
        console.warn('[GPS SOS note]: Using fallback coordinates');
      }
    }

    try {
      const emg = await window.medStore.triggerInstantSos(gpsCoords);
      this.closeAllModals();

      if (window.medAudio) window.medAudio.playEmergencyAlert();

      this.showToast('🚨 SOS DISPATCHED: ALS Ambulance en route to your live GPS coordinates! Nearest hospital notified.', 'critical');

      // Switch to tracking view
      this.switchView('ambulance');
    } catch (err) {
      this.showToast('Failed to dispatch SOS: ' + err.message, 'critical');
      if (confirmBtn) confirmBtn.disabled = false;
    }
  }

  renderLandingHospitalCapacityTable() {
    const rowsContainer = document.getElementById('landingHospitalCapacityRows');
    if (!rowsContainer) return;
    const hospitals = window.medStore.state.hospitals;
    if (!hospitals) return;

    rowsContainer.innerHTML = Object.values(hospitals).map(h => {
      const isLowIcu = h.icuBedsAvailable <= 2;
      const surgeMode = h.surgeStatus || "Normal Operations (Accepting All)";
      const isSurge = surgeMode.includes("Surge");
      const isDivert = surgeMode.includes("Divert") || surgeMode.includes("Bypass");
      const surgeBadgeClass = isDivert ? 'badge-critical' : (isSurge ? 'badge-urgent' : 'badge-success');

      return `
        <tr>
          <td>
            <div style="font-weight: 800; color: var(--navy-900); font-size: 0.95rem;">${h.name}</div>
            <div style="font-size: 0.78rem; color: var(--text-muted);">${h.code} • ${h.locality}, Nagpur</div>
          </td>
          <td>
            <span class="badge ${isLowIcu ? 'badge-critical' : 'badge-success'}" style="font-weight: 700;">
              ${h.icuBedsAvailable} / ${h.icuBedsTotal || 24} Open
            </span>
          </td>
          <td>
            <span class="badge badge-neutral" style="font-weight: 600;">
              ${h.normalBedsAvailable !== undefined ? h.normalBedsAvailable : 18} / ${h.normalBedsTotal || 50}
            </span>
          </td>
          <td>
            <span class="badge badge-primary" style="font-weight: 600;">
              ${h.ventilatorsAvailable} Ready
            </span>
          </td>
          <td>
            <span class="badge badge-neutral" style="font-weight: 600;">
              ${h.traumaUnitsAvailable} Bays
            </span>
          </td>
          <td>
            <span class="badge ${surgeBadgeClass}" style="font-weight: 700;">
              ${surgeMode.split('(')[0].trim()}
            </span>
          </td>
          <td>
            <button class="btn btn-sm btn-dark btn-tactile" onclick="window.app.quickDemoLogin('hospital', '${h.id}')" style="font-size: 0.75rem; padding: 4px 10px;">
              🏥 Staff EOC ➔
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  switchHospitalTab(tabName) {
    ['inbound', 'settings', 'analytics'].forEach(t => {
      const btn = document.getElementById(`hospTabBtn-${t}`);
      const pane = document.getElementById(`hospTabContent-${t}`);
      if (btn) {
        if (t === tabName) {
          btn.className = 'btn btn-primary active';
        } else {
          btn.className = 'btn btn-secondary';
        }
      }
      if (pane) {
        pane.style.display = t === tabName ? 'block' : 'none';
      }
    });
  }

  openDivertModal(requestId, patientName, severity, condition, ambulanceCode) {
    const curHosp = window.medStore.getCurrentHospitalData();
    const reqIdInput = document.getElementById('divertRequestId');
    const curHospInput = document.getElementById('divertCurrentHospitalId');
    const nameEl = document.getElementById('divertPatientName');
    const badgeEl = document.getElementById('divertSeverityBadge');
    const condEl = document.getElementById('divertConditionText');
    const targetSelect = document.getElementById('divertTargetHospitalSelect');

    if (reqIdInput) reqIdInput.value = requestId;
    if (curHospInput) curHospInput.value = curHosp.id;
    if (nameEl) nameEl.innerText = patientName || 'Emergency Patient';
    if (badgeEl) {
      badgeEl.innerText = severity || 'CRITICAL';
      badgeEl.className = `badge ${severity === 'CRITICAL' ? 'badge-critical' : 'badge-urgent'}`;
    }
    if (condEl) condEl.innerText = `${condition || 'Trauma'} • Ambulance: ${ambulanceCode || 'ZM-1024'}`;

    if (targetSelect) {
      const allHosps = window.medStore.state.hospitals;
      targetSelect.innerHTML = Object.values(allHosps)
        .filter(h => h.id !== curHosp.id)
        .map(h => `<option value="${h.id}">${h.name} (${h.locality}) — ${h.icuBedsAvailable} ICU Beds Open</option>`)
        .join('');
    }

    this.openModal('divertPatientModal');
  }

  // Helper: Increase / Decrease bed & resource numbers
  adjustInventoryField(fieldId, delta) {
    const input = document.getElementById(fieldId);
    if (input) {
      const currentVal = parseInt(input.value) || 0;
      input.value = Math.max(0, currentVal + delta);
    }
  }

  // Save Bed & Resource Inventory + Operational Settings to Server
  async saveHospitalInventory() {
    const hospId = window.medStore.getCurrentHospitalId();
    const invData = {
      icuBedsAvailable: parseInt(document.getElementById('invIcuAvailable').value) || 0,
      icuBedsTotal: parseInt(document.getElementById('invIcuTotal').value) || 24,
      normalBedsAvailable: parseInt(document.getElementById('invNormalAvailable').value) || 0,
      normalBedsTotal: parseInt(document.getElementById('invNormalTotal').value) || 50,
      ventilatorsAvailable: parseInt(document.getElementById('invVentAvailable').value) || 0,
      ventilatorsTotal: parseInt(document.getElementById('invVentTotal').value) || 18,
      traumaUnitsAvailable: parseInt(document.getElementById('invTraumaAvailable').value) || 0,
      traumaUnitsTotal: parseInt(document.getElementById('invTraumaTotal').value) || 6,
      surgeStatus: document.getElementById('invSurgeStatus') ? document.getElementById('invSurgeStatus').value : 'Normal Operations (Accepting All)',
      headDoctor: document.getElementById('invHeadDoctor') ? document.getElementById('invHeadDoctor').value : 'Dr. S. Deshmukh (Trauma Chief)',
      emergencyContact: document.getElementById('invEmergencyPhone') ? document.getElementById('invEmergencyPhone').value : '+91 712 255 1001',
      emergencyTeamStatus: document.getElementById('invTeamStatus') ? document.getElementById('invTeamStatus').value : 'Available (Team Alpha Ready)',
      bloodReservePercentage: parseInt(document.getElementById('invBloodReserve').value) || 94
    };

    const res = await window.medStore.saveHospitalSettings(hospId, invData);
    if (res && res.success) {
      this.showToast(`💾 Live Settings & Bed Inventory Broadcasted for ${window.medStore.getCurrentHospitalData().name}!`, "success");
      if (window.medAudio) window.medAudio.playSuccessChime();
    }
  }

  // Open Discharge & Doctor Feedback Modal
  openDischargeModal(requestId, patientName, severity, condition, ambulanceCode) {
    const reqInput = document.getElementById('dischargeRequestId');
    const hospInput = document.getElementById('dischargeHospitalId');
    const nameEl = document.getElementById('dischargePatientName');
    const badgeEl = document.getElementById('dischargeSeverityBadge');
    const condEl = document.getElementById('dischargeConditionText');

    if (reqInput) reqInput.value = requestId;
    if (hospInput) hospInput.value = window.medStore.getCurrentHospitalId();
    if (nameEl) nameEl.innerText = patientName || "Emergency Patient";
    if (badgeEl) {
      badgeEl.innerText = severity || "CRITICAL";
      badgeEl.className = severity === 'CRITICAL' ? 'badge badge-critical' : 'badge badge-primary';
    }
    if (condEl) condEl.innerText = `${condition || 'Accident / Trauma'} • Ambulance: ${ambulanceCode || 'ZM-1024'}`;

    this.openModal('dischargePatientModal');
  }

  openRequestAmbulanceStep1() {
    // Prefill with logged in user data if available
    const citizen = window.medStore.state.session.citizen;
    const nameInput = document.getElementById('reqAmbPatientName');
    if (nameInput && citizen && citizen.id) {
      nameInput.value = citizen.name;
    }
    this.openModal('requestAmbulanceModal');
  }

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      // Prefill donor form if opening
      if (modalId === 'donorRegistrationModal') {
        const citizen = window.medStore.state.session.citizen;
        const nameInput = document.getElementById('donorRegName');
        const phoneInput = document.getElementById('donorRegPhone');
        if (nameInput && citizen && citizen.id) nameInput.value = citizen.name;
        if (phoneInput && citizen && citizen.phone) phoneInput.value = citizen.phone;
      }
      modal.classList.add('open');
    }
  }

  closeAllModals() {
    document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('open'));
  }

  openContactDonorModal(donorId) {
    const allDonors = [...window.medStore.state.registeredDonors, ...NAGPUR_DATA.donors];
    const donor = allDonors.find(d => d.id === donorId);
    if (!donor) return;

    const idInput = document.getElementById('contactDonorId');
    if (idInput) idInput.value = donor.id;

    const nameModal = document.getElementById('contactDonorNameModal');
    if (nameModal) nameModal.innerText = donor.name;

    const bloodModal = document.getElementById('contactDonorBloodModal');
    if (bloodModal) bloodModal.innerText = donor.bloodGroup;

    const locModal = document.getElementById('contactDonorLocalityModal');
    if (locModal) locModal.innerText = `${donor.locality} (~${donor.distanceKm || 2.5} km away)`;

    this.openModal('contactDonorModal');
  }

  // --- Toast Notification Engine ---
  showToast(message, type = 'neutral', durationMs = 4000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type} toast-enter`;

    const icon = type === 'critical' ? '🚨' : (type === 'success' ? '✓' : 'ℹ️');
    toast.innerHTML = `
      <span style="font-size: 1.25rem;">${icon}</span>
      <div style="flex: 1; font-size: 0.85rem; line-height: 1.4;">${message}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.remove('toast-enter');
      toast.classList.add('toast-exit');
      setTimeout(() => toast.remove(), 300);
    }, durationMs);
  }

  // --- Continuous Telemetry & Canvas ECG ---
  startContinuousTelemetry() {
    this.initEcgCanvas();

    setInterval(() => {
      const emg = window.medStore.getActiveEmergency();
      if (!emg || !emg.patient || !emg.patient.vitals) return;

      const hrJitter = Math.floor(Math.random() * 5) - 2;
      emg.patient.vitals.heartRate = Math.max(95, Math.min(130, 114 + hrJitter));

      const vitalHr = document.getElementById('vitalHr');
      if (vitalHr) vitalHr.innerText = emg.patient.vitals.heartRate;
    }, 2000);
  }

  initEcgCanvas() {
    const canvas = document.getElementById('ecgLiveCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let x = 0;
    let y = 30;
    const width = canvas.width;
    const height = canvas.height;

    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.fillStyle = 'rgba(15, 27, 46, 0.08)';

    const drawEcg = () => {
      ctx.fillRect(x, 0, 10, height);

      ctx.beginPath();
      ctx.moveTo(x, y);

      x += 2;
      if (x > width) x = 0;

      const phase = x % 60;
      if (phase === 20) {
        y = 25;
      } else if (phase === 25) {
        y = 35;
      } else if (phase === 28) {
        y = 5;
      } else if (phase === 32) {
        y = 48;
      } else if (phase === 40) {
        y = 22;
      } else {
        y = 30;
      }

      ctx.lineTo(x, y);
      ctx.stroke();

      this.ecgAnimationId = requestAnimationFrame(drawEcg);
    };

    drawEcg();
  }

  // --- Analytics Charts ---
  initAnalyticsCharts() {
    if (typeof Chart === 'undefined') return;
    this.renderAnalyticsCharts();
  }

  renderAnalyticsCharts() {
    if (typeof Chart === 'undefined') return;

    Chart.defaults.color = '#94a3b8';
    Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.08)';
    Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif";

    const ctxSev = document.getElementById('severityChart');
    if (ctxSev && !this.charts.severity) {
      this.charts.severity = new Chart(ctxSev, {
        type: 'doughnut',
        data: {
          labels: ['Critical (Level 1)', 'Urgent (Level 2)', 'Moderate / Stable'],
          datasets: [{
            data: [38, 42, 20],
            backgroundColor: ['#ff1e56', '#f59e0b', '#00f2fe'],
            borderWidth: 2,
            borderColor: '#0b1426'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#cbd5e1', font: { weight: 700 } }
            }
          },
          cutout: '68%'
        }
      });
    }

    const ctxZones = document.getElementById('zoneResponseChart');
    if (ctxZones && !this.charts.zones) {
      this.charts.zones = new Chart(ctxZones, {
        type: 'bar',
        data: {
          labels: ['Civil Lines', 'Wardha Road', 'Sitabuldi', 'Dhantoli', 'Sadar', 'Khamla'],
          datasets: [
            {
              label: 'Zero-Mile MedConnect (mins)',
              data: [6.2, 7.8, 8.1, 7.4, 9.2, 8.5],
              backgroundColor: '#00f2fe',
              borderRadius: 8
            },
            {
              label: 'Conventional Nagpur Avg (mins)',
              data: [22.4, 26.5, 24.0, 21.8, 28.2, 25.0],
              backgroundColor: '#334155',
              borderRadius: 8
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#cbd5e1', font: { weight: 700 } }
            }
          },
          scales: {
            x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(255,255,255,0.05)' },
              ticks: { color: '#94a3b8' },
              title: { display: true, text: 'Response Time (Minutes)', color: '#cbd5e1' }
            }
          }
        }
      });
    }

    const ctxBlood = document.getElementById('bloodSupplyChart');
    if (ctxBlood && !this.charts.blood) {
      this.charts.blood = new Chart(ctxBlood, {
        type: 'bar',
        data: {
          labels: ['O+', 'B+', 'A+', 'AB+', 'O-', 'B-', 'A-', 'AB-'],
          datasets: [
            {
              label: 'Available Units in Bank',
              data: [145, 162, 111, 66, 30, 29, 20, 16],
              backgroundColor: '#00ff87',
              borderRadius: 6
            },
            {
              label: 'Active Emergency Demand',
              data: [42, 58, 28, 14, 18, 12, 8, 6],
              backgroundColor: '#ff1e56',
              borderRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#cbd5e1', font: { weight: 700 } }
            }
          },
          scales: {
            x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(255,255,255,0.05)' },
              ticks: { color: '#94a3b8' }
            }
          }
        }
      });
    }
  }
}

// Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new MedConnectApp();
  window.app.init();
});
