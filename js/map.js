/**
 * ZERO-MILE MEDCONNECT — LEAFLET LIVE EMERGENCY MAP (NAGPUR, MAHARASHTRA)
 * Professional vector & raster mapping with real-time route interpolation,
 * custom SVG emergency markers (Pickup, Ambulance, Hospital), and responsive auto-centering.
 */

class NagpurEmergencyMap {
  constructor(containerId = 'nagpurEmergencyMap') {
    this.containerId = containerId;
    this.map = null;
    this.ambulanceMarker = null;
    this.pickupMarker = null;
    this.hospitalMarker = null;
    this.routePolyline = null;
    this.routeGlowPolyline = null;
    this.hospitalMarkersLayer = null;
    this.isInitialized = false;
  }

  init() {
    const mapEl = document.getElementById(this.containerId);
    if (!mapEl) return;

    // Center on Nagpur, Maharashtra (Zero Mile Monument corridor)
    const nagpurCenter = [21.1458, 79.0882];

    if (typeof L === 'undefined') {
      console.warn("Leaflet library not loaded yet.");
      return;
    }

    if (this.map) {
      this.map.invalidateSize();
      this.updateEmergencyRoute();
      return;
    }

    try {
      this.map = L.map(this.containerId, {
        center: nagpurCenter,
        zoom: 13,
        zoomControl: false,
        attributionControl: false
      });

      // Clean modern OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        subdomains: ['a', 'b', 'c'],
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(this.map);

      // Zoom control in top right
      L.control.zoom({ position: 'topright' }).addTo(this.map);

      this.hospitalMarkersLayer = L.layerGroup().addTo(this.map);

      this.renderOtherHospitals();
      this.updateEmergencyRoute();
      this.isInitialized = true;

      // Ensure proper rendering without tile gaps
      setTimeout(() => {
        if (this.map) this.map.invalidateSize();
      }, 200);
    } catch (err) {
      console.warn("Map initialization error:", err);
    }
  }

  createCustomIcon(htmlContent, className = '', iconSize = [40, 40]) {
    return L.divIcon({
      html: htmlContent,
      className: `custom-map-icon ${className}`,
      iconSize: iconSize,
      iconAnchor: [iconSize[0] / 2, iconSize[1] / 2],
      popupAnchor: [0, -iconSize[1] / 2]
    });
  }

  renderOtherHospitals() {
    if (!this.map || !this.hospitalMarkersLayer || !window.NAGPUR_DATA) return;
    this.hospitalMarkersLayer.clearLayers();

    const emg = window.medStore.getActiveEmergency();
    const targetHospId = (emg && emg.destinationHospitalId) ? emg.destinationHospitalId : 'NCEH001';

    const hospitalList = Array.isArray(NAGPUR_DATA.hospitals)
      ? NAGPUR_DATA.hospitals
      : Object.values(window.medStore.state.hospitals || {});

    hospitalList.forEach(hosp => {
      if (hosp.id === targetHospId) return; // Target hospital has a specialized beacon

      const iconHtml = `
        <div style="background:#ffffff; border:2px solid #3b82f6; border-radius:50%; width:28px; height:28px; display:flex; align-items:center; justify-content:center; box-shadow:0 3px 8px rgba(0,0,0,0.25);">
          <span style="font-size:13px;">🏥</span>
        </div>
      `;
      const icon = this.createCustomIcon(iconHtml, '', [28, 28]);
      const marker = L.marker([hosp.lat || 21.1458, hosp.lng || 79.0882], { icon: icon }).addTo(this.hospitalMarkersLayer);
      
      marker.bindPopup(`
        <div style="font-family:'Plus Jakarta Sans',sans-serif; padding:4px;">
          <h4 style="margin:0 0 2px 0; font-size:12px; color:#0f172a; font-weight:700;">${hosp.name}</h4>
          <p style="margin:0 0 2px 0; font-size:10px; color:#475569;">📍 ${hosp.locality}, Nagpur</p>
          <div style="font-size:10px; font-weight:600; color:#16a34a;">ICU Beds Free: ${hosp.icuBedsAvailable || 4}</div>
        </div>
      `);
    });
  }

  updateEmergencyRoute() {
    if (!this.map) return;

    const emg = window.medStore.getActiveEmergency();
    if (!emg) return;

    // Destination Hospital coordinates (selected hospital)
    const targetHospId = emg.destinationHospitalId || (emg.hospital && emg.hospital.id) || emg.hospitalId || 'NCEH001';
    let targetHosp = window.medStore.getHospitalById(targetHospId);
    if (!targetHosp && window.NAGPUR_DATA && NAGPUR_DATA.getHospitalCoordinates) {
      targetHosp = NAGPUR_DATA.getHospitalCoordinates(targetHospId);
    }
    if (!targetHosp) {
      targetHosp = {
        id: 'NCEH001',
        name: 'Nagpur Central Emergency Hospital',
        code: 'NCEH001',
        locality: 'Civil Lines, Nagpur',
        lat: 21.1552,
        lng: 79.0865
      };
    }

    const pCoords = (window.NAGPUR_DATA && NAGPUR_DATA.getLocalityCoordinates)
      ? NAGPUR_DATA.getLocalityCoordinates(emg.pickup && (emg.pickup.name || emg.pickup) || emg.locality)
      : { lat: 21.1432, lng: 79.0621, name: "Dharampeth" };

    const pickupLat = (emg.pickup && emg.pickup.lat) || pCoords.lat;
    const pickupLng = (emg.pickup && emg.pickup.lng) || pCoords.lng;
    const pickupName = (emg.pickup && emg.pickup.name) || emg.locality || pCoords.name || "Dharampeth, Nagpur";
    const patientName = (emg.patient && emg.patient.name) || emg.patientName || "Emergency Patient";
    const condition = (emg.patient && emg.patient.condition) || emg.condition || "Emergency";

    const destinationLatLng = [targetHosp.lat || 21.1552, targetHosp.lng || 79.0865];

    // Compute dynamic waypoints for this specific pickup & hospital pair
    let waypoints = emg.routeWaypoints;
    if (!waypoints || waypoints.length < 2) {
      if (window.NAGPUR_DATA && NAGPUR_DATA.generateRouteWaypoints) {
        waypoints = NAGPUR_DATA.generateRouteWaypoints({ lat: pickupLat, lng: pickupLng, name: pickupName }, targetHosp);
      } else {
        waypoints = [
          { lat: pickupLat, lng: pickupLng, name: `Pickup: ${pickupName}` },
          { lat: pickupLat + (destinationLatLng[0] - pickupLat) * 0.5, lng: pickupLng + (destinationLatLng[1] - pickupLng) * 0.5, name: "Nagpur Central Arterial" },
          { lat: destinationLatLng[0], lng: destinationLatLng[1], name: `Destination: ${targetHosp.name}` }
        ];
      }
    }

    const latLngs = waypoints.map(wp => [wp.lat, wp.lng]);

    // 1. Pickup Location Marker (Selected Nagpur locality)
    if (!this.pickupMarker) {
      const pickupHtml = `
        <div style="position:relative; width:42px; height:42px;">
          <div style="position:absolute; width:100%; height:100%; border-radius:50%; background:rgba(37,99,235,0.3); animation:emergencyStrobe 2s infinite;"></div>
          <div style="position:absolute; top:4px; left:4px; width:34px; height:34px; border-radius:50%; background:#2563eb; color:#ffffff; display:flex; align-items:center; justify-content:center; font-size:16px; font-weight:bold; box-shadow:0 3px 10px rgba(0,0,0,0.3); border:2px solid #ffffff;">
            📍
          </div>
          <div style="position:absolute; bottom:-16px; left:50%; transform:translateX(-50%); background:#1e293b; color:#ffffff; font-size:9px; font-weight:700; padding:1px 6px; border-radius:4px; white-space:nowrap; box-shadow:0 2px 6px rgba(0,0,0,0.3);">
            ${pickupName.split(',')[0]}
          </div>
        </div>
      `;
      this.pickupMarker = L.marker([pickupLat, pickupLng], {
        icon: this.createCustomIcon(pickupHtml, '', [42, 42]),
        zIndexOffset: 500
      }).addTo(this.map);
    } else {
      this.pickupMarker.setLatLng([pickupLat, pickupLng]);
    }
    this.pickupMarker.bindPopup(`<strong>📍 Pickup Location:</strong><br>${pickupName}<br>Patient: ${patientName} (${condition})`);

    // 2. Destination Hospital Marker (Selected Hospital)
    if (!this.hospitalMarker) {
      const hospitalHtml = `
        <div style="position:relative; width:48px; height:48px;">
          <div style="position:absolute; width:100%; height:100%; border-radius:50%; background:rgba(16,185,129,0.35); animation:emergencyStrobe 1.6s infinite;"></div>
          <div style="position:absolute; top:4px; left:4px; width:40px; height:40px; border-radius:50%; background:#059669; color:#ffffff; display:flex; align-items:center; justify-content:center; font-size:20px; font-weight:bold; box-shadow:0 4px 14px rgba(5,150,105,0.45); border:2px solid #ffffff;">
            🏥
          </div>
          <div style="position:absolute; bottom:-16px; left:50%; transform:translateX(-50%); background:#064e3b; color:#ffffff; font-size:9px; font-weight:700; padding:1px 6px; border-radius:4px; white-space:nowrap; box-shadow:0 2px 6px rgba(0,0,0,0.3);">
            ${targetHosp.code || 'HOSP'}
          </div>
        </div>
      `;
      this.hospitalMarker = L.marker(destinationLatLng, {
        icon: this.createCustomIcon(hospitalHtml, '', [48, 48]),
        zIndexOffset: 600
      }).addTo(this.map);
    } else {
      this.hospitalMarker.setLatLng(destinationLatLng);
    }
    this.hospitalMarker.bindPopup(`<strong>🏥 Destination Hospital:</strong><br>${targetHosp.name}<br>📍 ${targetHosp.locality || 'Nagpur'}<br>ICU & Emergency Bay Standing By`);

    // 3. Planned Route Polyline (Pickup -> Ambulance -> Hospital)
    if (this.routeGlowPolyline) this.map.removeLayer(this.routeGlowPolyline);
    if (this.routePolyline) this.map.removeLayer(this.routePolyline);

    // Glowing background path
    this.routeGlowPolyline = L.polyline(latLngs, {
      color: '#93c5fd',
      weight: 9,
      opacity: 0.5,
      lineCap: 'round'
    }).addTo(this.map);

    // Dynamic dashed active path
    this.routePolyline = L.polyline(latLngs, {
      color: '#2563eb',
      weight: 5,
      opacity: 0.9,
      dashArray: '8, 8',
      lineCap: 'round'
    }).addTo(this.map);

    // 4. Moving Ambulance Marker
    const ambLat = (emg.ambulance && emg.ambulance.currentLat) || waypoints[1].lat;
    const ambLng = (emg.ambulance && emg.ambulance.currentLng) || waypoints[1].lng;
    const ambCode = (emg.ambulance && emg.ambulance.code) || emg.ambulanceCode || "ZM-1024";
    const ambDriver = (emg.ambulance && emg.ambulance.driver) || emg.driverName || "Amit Sharma";
    const ambSpeed = (emg.ambulance && emg.ambulance.currentSpeedKmh) || 62;

    if (!this.ambulanceMarker) {
      const ambulanceHtml = `
        <div id="ambulanceLiveIcon" style="position:relative; width:48px; height:48px; transition:all 0.3s ease;">
          <div style="position:absolute; width:100%; height:100%; border-radius:50%; background:rgba(220,38,38,0.4); animation:emergencyStrobe 0.8s infinite;"></div>
          <div style="position:absolute; top:4px; left:4px; width:40px; height:40px; border-radius:50%; background:#dc2626; color:#ffffff; display:flex; align-items:center; justify-content:center; font-size:20px; font-weight:800; border:2px solid #ffffff; box-shadow:0 4px 16px rgba(220,38,38,0.55);">
            🚑
          </div>
          <div style="position:absolute; bottom:-16px; left:50%; transform:translateX(-50%); background:#0f172a; color:#38bdf8; font-family:'JetBrains Mono',monospace; font-size:9px; font-weight:bold; padding:1px 6px; border-radius:4px; border:1px solid rgba(255,255,255,0.25); white-space:nowrap;">
            ${ambCode} (ALS)
          </div>
        </div>
      `;
      this.ambulanceMarker = L.marker([ambLat, ambLng], {
        icon: this.createCustomIcon(ambulanceHtml, 'ambulance-marker', [48, 48]),
        zIndexOffset: 1000
      }).addTo(this.map);
    } else {
      this.ambulanceMarker.setLatLng([ambLat, ambLng]);
    }
    this.ambulanceMarker.bindPopup(`<strong>🚑 Ambulance ${ambCode}</strong><br>Driver: ${ambDriver}<br>Speed: ${ambSpeed} km/h`);

    // Auto-fit route bounds
    try {
      this.map.fitBounds(this.routePolyline.getBounds(), { padding: [60, 60] });
    } catch (e) {}

    this.renderOtherHospitals();
  }

  updateAmbulancePosition(lat, lng) {
    if (!this.ambulanceMarker || !this.map) return;
    this.ambulanceMarker.setLatLng([lat, lng]);
  }

  focusAmbulance() {
    if (this.ambulanceMarker && this.map) {
      this.map.panTo(this.ambulanceMarker.getLatLng(), { animate: true, duration: 0.5 });
    }
  }

  fitFullRoute() {
    if (this.routePolyline && this.map) {
      try {
        this.map.fitBounds(this.routePolyline.getBounds(), { padding: [60, 60], animate: true });
      } catch (e) {}
    }
  }

  invalidate() {
    if (this.map) {
      this.map.invalidateSize();
      this.fitFullRoute();
    }
  }
}

// Global map instances
window.nagpurMap = new NagpurEmergencyMap('nagpurEmergencyMap');
window.nagpurLandingMap = new NagpurEmergencyMap('nagpurLandingMap');

// Auto initialize landing map on load
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    if (window.nagpurLandingMap) window.nagpurLandingMap.init();
    if (window.nagpurMap) window.nagpurMap.init();
  }, 400);
});
