# 🚑 Zero-Mile MedConnect (Project Nagpur)
> **Nagpur's Smart Real-Time Emergency Coordination & Hospital Bed Orchestration Network**
> 
> *Bridging Citizens, Ambulances, and Emergency Trauma Centers with Sub-Second Telemetry & Cross-Device Synchronization.*

---

## 🌟 Overview
**Zero-Mile MedConnect** is a healthcare coordination platform built for the **Zero-Mile City of Nagpur, Maharashtra**. It integrates **GPS-based ambulance dispatching**, **15-minute pre-arrival hospital alerts**, **live bed/seat inventory management**, and **blood donor grids** into a real-time reactive network.

---

## ✨ Key Features

### 1. ⚡ Real-Time Multi-Device Synchronization (SSE + Polling Fallback)
- **Zero-Latency Event Stream (`/api/events`)**: When a citizen books an emergency on a mobile phone, connected hospital laptops and admin command centers receive instant acoustic siren alerts and live telemetry without refreshing.
- **2.5s Resilient Sync Loop (`/api/sync/state`)**: Ensures zero disruption if a mobile device turns off its screen or temporarily switches Wi-Fi.

### 2. 🛏️ Live Hospital Bed & Seat Inventory Management
- **Hospital Command Center (EOC)** features an interactive bed management panel.
- Staff can adjust **ICU Beds**, **General Ward Beds / Seats**, **Ventilators**, and **Trauma Bays** with `[+]` / `[-]` controls.
- **Auto-Decrement**: Creating an emergency automatically reserves and decrements the available bed count by 1.
- **Broadcast on Save**: Manual inventory adjustments broadcast in real time to all public recommendation widgets.

### 3. 🏥 Patient Admission, Doctor Feedback & Bed Release (+1)
- Hospital can accept inbound ambulances and mark patients as **"Admitted in ER"**.
- Staff can complete treatment with the **Doctor Feedback Modal**:
  - Sets clinical feedback note: *"This person is fine, received emergency treatment from our hospital, and is good now. Vitals have fully normalized."*
- On discharge:
  - Hospital bed/seat availability is **restored (+1 Bed Free)**.
  - The patient's mobile phone displays a green celebration recovery banner with doctor feedback.

### 4. 🗺️ GPS Ambulance Telemetry & Leaflet Routing
- Real-time GPS ambulance telemetry moving through key Nagpur corridors (Civil Lines, Sitabuldi, Dharampeth, Wardha Road, Ring Road).
- Live heart rate & vital jitter telemetry with HTML5 Canvas ECG visualizer.

### 5. 🩸 Nagpur Emergency Blood Grid
- Donor directory across Nagpur localities (Ramdaspeth, Dhantoli, Sitabuldi, Dharampeth, Civil Lines).
- 1-Click automated SMS & WhatsApp dispatch to compatible donors.

---

## 🚀 Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)
- Modern Web Browser (Chrome, Edge, Firefox, Safari)

### Installation & Run

```bash
# 1. Clone the repository
git clone https://github.com/SujalChavhan/project-nagpur.git
cd project-nagpur

# 2. Install dependencies
npm install

# 3. Start the server
npm start
```

---

## 📱 Multi-Device Testing (For Judges & Evaluators)

1. Start the server on your main laptop: `npm start`
2. Look at the terminal output for the **Phone / Judge URL** (e.g. `http://192.168.X.X:3000` or `http://10.X.X.X:3000`).
3. Connect your mobile phone to the **same Wi-Fi network**.
4. Open the displayed URL in your phone's browser.
5. **Test Workflow**:
   - **Device 1 (Laptop)**: Log in to Hospital EOC (`NCEH001` / `hospital123`).
   - **Device 2 (Judge's Phone)**: Open Citizen Portal $\rightarrow$ Request Ambulance.
   - **Instant Result**: Device 1 sounds a siren alert and shows the new patient in the Inbound Queue with decremented bed count!
   - **Discharge**: Device 1 clicks *Complete Treatment & Discharge* $\rightarrow$ Device 2 immediately receives the doctor recovery note and Device 1 bed count increments (+1)!

---

## 🔐 Demo Credentials

| Role | Username / ID | Password | Access View |
|---|---|---|---|
| **Citizen / Patient** | Any name & phone | *(No password required)* | Citizen Portal & GPS Tracking |
| **Nagpur Central Hospital** | `NCEH001` | `hospital123` | Hospital EOC & Bed Controller |
| **Orange City Medical Center** | `OCMC002` | `hospital123` | Hospital EOC & Bed Controller |
| **Platform Owner / Admin** | `admin` | `admin123` | Master Admin Audit & Fleet Overview |

---

## 🔄 Syncing Updates to GitHub

To commit and push all latest code changes to GitHub, run:
```bash
npm run push
```
Or double-click `sync-github.bat` in the project root folder.

---

## 📄 License
ISC License © 2026 Zero-Mile Health Care.
