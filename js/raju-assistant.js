/**
 * ZERO-MILE MEDCONNECT — DR. RAJU (AI HEALTH ASSISTANT)
 * Smart Compact Floating AI Assistant with Full Bilingual Language Matching (Hindi & English),
 * Detailed Clinical Symptom Evaluation (Causes, Actionable Care, Red Flags),
 * and Strict 1-Click Emergency Ambulance Integration for Critical Conditions.
 */

class DrRajuAssistant {
  constructor() {
    this.isExpanded = false;
    this.isListening = false;
    this.isTtsEnabled = true;
    this.recognition = null;
    this.currentLang = 'hi'; // 'hi' (Hindi/Hinglish) or 'en' (English)
    this.storageKey = 'zero_mile_raju_messages_v2';
    this.messages = [];
  }

  init() {
    this.injectDOM();
    this.bindEvents();
    this.initSpeechRecognition();
    this.loadInitialMessages();

    // Check visibility based on current role & view
    const role = window.medStore ? window.medStore.getCurrentRole() : 'guest';
    const appView = window.app ? window.app.currentView : '';
    if (role === 'citizen' && (appView === 'citizen' || appView === 'ambulance' || appView === 'blood' || appView === 'hospital-match')) {
      this.show();
    } else {
      this.hide();
    }
  }

  show() {
    this.injectDOM();
    const container = document.getElementById('rajuWidgetContainer');
    if (container) {
      container.style.display = 'block';
    }
  }

  hide() {
    const container = document.getElementById('rajuWidgetContainer');
    if (container) {
      container.style.display = 'none';
    }
    this.toggleChat(false);
    this.stopListening();
  }

  removeDOM() {
    const existing = document.getElementById('rajuWidgetContainer');
    if (existing) existing.remove();
    this.stopListening();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  }

  // --- 1. Language Detection Engine (Hindi/Hinglish vs English) ---
  detectLanguage(text) {
    const raw = (text || '').toLowerCase().trim();
    
    // 1. Devanagari script detection
    if (/[\u0900-\u097F]/.test(text || '')) {
      return 'hi';
    }

    // 2. Comprehensive Hindi/Hinglish phonetics and keyword markers
    const hindiKeywords = [
      'mujhe', 'mere', 'meri', 'mera', 'hum', 'hume', 'hai', 'hain', 'ho', 'tha', 'thi', 'the',
      'raha', 'rahi', 'rahe', 'dard', 'sar', 'sir', 'pet', 'chhati', 'seena', 'seene', 'bukhar',
      'sardi', 'jukham', 'khansi', 'gala', 'gale', 'kharash', 'thakan', 'thak', 'badan',
      'chakkar', 'ulti', 'dast', 'khoon', 'beh', 'chot', 'lagi', 'laga', 'gaya', 'gayi',
      'hua', 'hui', 'hue', 'kya', 'karu', 'kare', 'karein', 'kaise', 'kripya', 'namaste',
      'saans', 'saas', 'kamzori', 'aaram', 'batao', 'madad', 'behosh', 'haddi', 'pair',
      'haath', 'jalan', 'aag', 'jal gaya', 'ghutan', 'dum', 'bohot', 'jyada', 'bahut',
      'kam', 'theek', 'karna', 'khana', 'paani', 'peena', 'dawa', 'dawakhana', 'ilaj',
      'acidity', 'gas ho', 'pet kharab', 'chakkar aa', 'ghabrahat', 'chakkar'
    ];

    const words = raw.split(/\s+|[,\.!\?]+/);
    const hasHindiToken = words.some(w => hindiKeywords.includes(w));

    return hasHindiToken ? 'hi' : 'en';
  }

  // --- 2. DOM Injection ---
  injectDOM() {
    if (document.getElementById('rajuWidgetContainer')) return;

    const container = document.createElement('div');
    container.id = 'rajuWidgetContainer';
    container.innerHTML = `
      <!-- Floating Minimized Launcher -->
      <div class="raju-launcher animate-fade-in-up" id="rajuLauncher" title="Click to chat with Dr. Raju (AI Health Assistant)">
        <div class="raju-avatar-wrap">
          <span>🩺</span>
          <div class="raju-online-beacon"></div>
        </div>
        <div class="raju-launcher-text">
          <span class="raju-launcher-name">
            Dr. Raju <span class="raju-ai-badge">AI Health Assistant</span>
          </span>
          <span class="raju-launcher-sub">Hindi & English • Voice</span>
        </div>
      </div>

      <!-- Floating Teaser Notification Bubble -->
      <div class="raju-teaser-bubble" id="rajuTeaserBubble">
        <span>💬</span>
        <span>Have a health query or symptoms? Ask Dr. Raju (AI Health Assistant)!</span>
      </div>

      <!-- Expanded Floating Chat Window -->
      <div class="raju-chat-window minimized" id="rajuChatWindow">
        <!-- Header -->
        <div class="raju-chat-header">
          <div class="raju-header-info">
            <div class="raju-header-avatar">
              <span>🩺</span>
              <div class="raju-online-beacon"></div>
            </div>
            <div>
              <h4 class="raju-header-title">
                Dr. Raju (AI Health Assistant)
              </h4>
              <span class="raju-header-sub">
                <span class="live-dot-green" style="width:6px; height:6px;"></span> Zero-Mile Nagpur AI • Hindi & English Voice
              </span>
            </div>
          </div>
          <div class="raju-header-actions">
            <button class="raju-btn-icon active" id="rajuTtsToggleBtn" title="Toggle Voice Readout (Text-To-Speech)">
              🔊
            </button>
            <button class="raju-btn-icon" id="rajuClearChatBtn" title="Clear Chat History">
              🧹
            </button>
            <button class="raju-btn-icon" id="rajuMinimizeBtn" title="Minimize Chat">
              ✕
            </button>
          </div>
        </div>

        <!-- Chat Messages Body -->
        <div class="raju-chat-body" id="rajuMessages">
          <!-- Messages will be rendered here dynamically -->
        </div>

        <!-- Voice Listening Bar Overlay -->
        <div class="raju-voice-bar" id="rajuVoiceBar">
          <div style="display:flex; align-items:center; gap:8px;">
            <span>🎙️</span>
            <span id="rajuVoiceBarText">Listening in Hindi / English... Speak your symptoms!</span>
          </div>
          <div class="raju-voice-wave">
            <div class="raju-wave-bar"></div>
            <div class="raju-wave-bar"></div>
            <div class="raju-wave-bar"></div>
            <div class="raju-wave-bar"></div>
          </div>
        </div>

        <!-- Input Footer Bar -->
        <form class="raju-chat-footer" id="rajuInputForm">
          <button type="button" class="raju-btn-mic" id="rajuMicBtn" title="Click to Speak (Voice Input in Hindi / English)">
            🎙️
          </button>
          <input 
            type="text" 
            class="raju-input" 
            id="rajuInput" 
            placeholder="Type symptoms (e.g. 'sar dard', 'cold & cough', 'chest pain')..." 
            autocomplete="off"
            required
          />
          <button type="submit" class="raju-btn-send" id="rajuSendBtn" title="Send Message">
            ➤
          </button>
        </form>
      </div>
    `;

    document.body.appendChild(container);
  }

  // --- 3. Event Listeners ---
  bindEvents() {
    const launcher = document.getElementById('rajuLauncher');
    const teaser = document.getElementById('rajuTeaserBubble');
    const minimizeBtn = document.getElementById('rajuMinimizeBtn');
    const clearBtn = document.getElementById('rajuClearChatBtn');
    const ttsBtn = document.getElementById('rajuTtsToggleBtn');
    const form = document.getElementById('rajuInputForm');
    const micBtn = document.getElementById('rajuMicBtn');

    if (launcher) launcher.addEventListener('click', () => this.toggleChat(true));
    if (teaser) teaser.addEventListener('click', () => this.toggleChat(true));
    if (minimizeBtn) minimizeBtn.addEventListener('click', () => this.toggleChat(false));

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.messages = [];
        localStorage.removeItem(this.storageKey);
        this.loadInitialMessages();
        if (window.app) window.app.showToast('Dr. Raju conversation cleared', 'neutral');
      });
    }

    if (ttsBtn) {
      ttsBtn.addEventListener('click', () => {
        this.isTtsEnabled = !this.isTtsEnabled;
        ttsBtn.classList.toggle('active', this.isTtsEnabled);
        ttsBtn.innerHTML = this.isTtsEnabled ? '🔊' : '🔇';
        if (window.app) {
          window.app.showToast(this.isTtsEnabled ? 'Dr. Raju Voice Readout Enabled' : 'Dr. Raju Voice Readout Muted', 'neutral');
        }
        if (!this.isTtsEnabled && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
      });
    }

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('rajuInput');
        const query = input ? input.value.trim() : '';
        if (!query) return;
        input.value = '';
        this.handleUserQuery(query);
      });
    }

    if (micBtn) {
      micBtn.addEventListener('click', () => this.toggleVoiceRecognition());
    }

    // Auto-hide teaser after 12s
    setTimeout(() => {
      if (teaser) teaser.style.display = 'none';
    }, 12000);
  }

  // --- 4. Toggle Chat Window ---
  toggleChat(open) {
    const win = document.getElementById('rajuChatWindow');
    const teaser = document.getElementById('rajuTeaserBubble');
    const launcher = document.getElementById('rajuLauncher');

    this.isExpanded = open !== undefined ? open : !this.isExpanded;

    if (this.isExpanded) {
      if (win) win.classList.remove('minimized');
      if (teaser) teaser.style.display = 'none';
      if (launcher) launcher.style.opacity = '0.4';
      const input = document.getElementById('rajuInput');
      if (input) setTimeout(() => input.focus(), 150);
      this.scrollToBottom();
    } else {
      if (win) win.classList.add('minimized');
      if (launcher) launcher.style.opacity = '1';
      this.stopListening();
    }
  }

  // --- 5. Web Speech API (Voice Recognition) ---
  initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('[Dr. Raju] Web Speech API not supported in this browser.');
      return;
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = 'hi-IN'; // Default Indian multilingual recognition

      this.recognition.onstart = () => {
        this.isListening = true;
        this.updateMicUI(true);
      };

      this.recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }

        const input = document.getElementById('rajuInput');
        if (input) input.value = transcript;

        const voiceText = document.getElementById('rajuVoiceBarText');
        if (voiceText) voiceText.innerText = `"${transcript}"`;

        if (event.results[0].isFinal) {
          setTimeout(() => {
            this.stopListening();
            if (transcript.trim().length > 1) {
              this.handleUserQuery(transcript.trim());
              if (input) input.value = '';
            }
          }, 600);
        }
      };

      this.recognition.onerror = (err) => {
        console.warn('[Dr. Raju Voice Error]:', err);
        this.stopListening();
        if (err.error === 'not-allowed') {
          this.addBotMessage({
            lang: 'en',
            level: 1,
            severity: 'NORMAL',
            conditionName: 'Microphone Permission',
            summary: "⚠️ Microphone permission was denied. Please allow microphone access in your browser settings to speak to Dr. Raju."
          });
        }
      };

      this.recognition.onend = () => {
        this.stopListening();
      };
    } catch (e) {
      console.warn('[Dr. Raju Voice Init Failed]:', e);
    }
  }

  toggleVoiceRecognition() {
    if (!this.recognition) {
      if (window.app) window.app.showToast("Voice input is not supported on this browser. Please type your query.", "warning");
      return;
    }

    if (this.isListening) {
      this.stopListening();
    } else {
      this.startListening();
    }
  }

  startListening() {
    if (!this.recognition) return;
    try {
      this.recognition.start();
      const voiceText = document.getElementById('rajuVoiceBarText');
      if (voiceText) voiceText.innerText = "🎙️ Listening in Hindi / English... Speak your symptoms!";
      if (window.medAudio) window.medAudio.playSuccessChime();
    } catch (e) {
      // recognition might already be active
    }
  }

  stopListening() {
    this.isListening = false;
    this.updateMicUI(false);
    if (this.recognition) {
      try { this.recognition.stop(); } catch (e) {}
    }
  }

  updateMicUI(listening) {
    const micBtn = document.getElementById('rajuMicBtn');
    const voiceBar = document.getElementById('rajuVoiceBar');
    if (micBtn) {
      micBtn.classList.toggle('listening', listening);
      micBtn.innerHTML = listening ? '🔴' : '🎙️';
    }
    if (voiceBar) {
      voiceBar.classList.toggle('active', listening);
    }
  }

  // --- 6. Initial Welcome Messages & Quick Chips ---
  loadInitialMessages() {
    const container = document.getElementById('rajuMessages');
    if (!container) return;

    container.innerHTML = `
      <div class="raju-msg bot">
        <span class="raju-msg-sender">🩺 Dr. Raju (AI Health Assistant)</span>
        <div class="raju-msg-bubble">
          <p style="margin:0 0 8px 0;">
            <strong>Namaste! 🙏 I am Dr. Raju (AI Health Assistant)</strong>, your 24/7 smart health, home care, and emergency triage companion.
          </p>
          <p style="margin:0 0 8px 0; font-size:0.8rem; color:#cbd5e1; line-height: 1.45;">
            Type or speak 🎙️ your symptoms in <strong>Hindi, Hinglish or English</strong> (e.g. <em>"mujhe sar dard hai"</em>, <em>"sardi aur khansi"</em>, <em>"chest pain"</em>). I will detect your language, explain possible causes, and give step-by-step home remedies.
          </p>
          <p style="margin:0 0 8px 0; font-size:0.75rem; color:#38bdf8; font-weight:700;">
            💡 Quick Demo Queries (Click to test):
          </p>
          <div class="raju-quick-chips">
            <!-- Hindi Queries -->
            <button type="button" class="raju-chip-btn" onclick="window.rajuAssistant.handleQuickQuery('Mujhe halka sar dard aur screen strain ho raha hai')">
              🟢 मुझे सर दर्द है (Mild Headache)
            </button>
            <button type="button" class="raju-chip-btn" onclick="window.rajuAssistant.handleQuickQuery('Sardi, jukham aur gale me kharash hai')">
              🟢 सर्दी व जुकाम (Cold & Cough)
            </button>
            <button type="button" class="raju-chip-btn" onclick="window.rajuAssistant.handleQuickQuery('Pet me halki gas aur acidity ho rahi hai')">
              🟢 एसिडिटी व गैस (Acidity & Gas)
            </button>
            <button type="button" class="raju-chip-btn" onclick="window.rajuAssistant.handleQuickQuery('102 degree bukhar hai aur 2 din se nahi utar raha')">
              🟡 102° तेज़ बुखार (Persistent Fever)
            </button>
            <button type="button" class="raju-chip-btn" onclick="window.rajuAssistant.handleQuickQuery('Mujhe severe chest pain aur sweating ho rahi hai')">
              🔴 सीने में तेज़ दर्द (Chest Pain - Critical)
            </button>

            <!-- English Queries -->
            <button type="button" class="raju-chip-btn" onclick="window.rajuAssistant.handleQuickQuery('I have a mild tension headache from working on laptop')">
              🟢 I have a mild headache
            </button>
            <button type="button" class="raju-chip-btn" onclick="window.rajuAssistant.handleQuickQuery('I have severe chest pain radiating to left arm and shortness of breath')">
              🔴 Severe chest pain & breathlessness
            </button>
          </div>
        </div>
      </div>
    `;
  }

  handleQuickQuery(text) {
    this.handleUserQuery(text);
  }

  // --- 7. User Query Pipeline & AI Evaluation ---
  async handleUserQuery(query) {
    const lang = this.detectLanguage(query);
    this.currentLang = lang;

    this.addUserMessage(query);
    this.showTypingIndicator(lang);

    setTimeout(async () => {
      let triageResult = null;

      // 1. Backend AI Triage Endpoint (supports /api/ai/symptom-check and /api/ai/triage)
      if (window.medApi && window.medApi.isBackendOnline) {
        try {
          const res = await window.medApi.request('/api/ai/symptom-check', {
            method: 'POST',
            body: JSON.stringify({ query })
          }, 1500);
          if (res && res.success && res.triage) {
            triageResult = res.triage;
          }
        } catch (err) {
          // fallback to client-side rule engine
        }
      }

      // 2. Client-Side Medical Intelligence Engine (Instant & 100% Offline Reliable)
      if (!triageResult) {
        triageResult = this.evaluateSymptomsLocally(query, lang);
      }

      this.hideTypingIndicator();
      this.addBotMessage(triageResult);

      // Trigger TTS Audio Readout in user's detected language
      if (this.isTtsEnabled) {
        this.speakAdvice(triageResult.speechText || triageResult.summary, triageResult.lang || lang);
      }
    }, 450);
  }

  addUserMessage(text) {
    const container = document.getElementById('rajuMessages');
    if (!container) return;

    const div = document.createElement('div');
    div.className = 'raju-msg user';
    div.innerHTML = `
      <span class="raju-msg-sender">You</span>
      <div class="raju-msg-bubble">${this.escapeHTML(text)}</div>
    `;
    container.appendChild(div);
    this.scrollToBottom();
  }

  showTypingIndicator(lang) {
    const container = document.getElementById('rajuMessages');
    if (!container) return;

    const existing = document.getElementById('rajuTyping');
    if (existing) existing.remove();

    const isHindi = lang === 'hi';
    const div = document.createElement('div');
    div.id = 'rajuTyping';
    div.className = 'raju-msg bot';
    div.innerHTML = `
      <span class="raju-msg-sender">🩺 Dr. Raju ${isHindi ? 'लक्षणों का विश्लेषण कर रहे हैं...' : 'is analyzing symptoms...'}</span>
      <div class="raju-typing-indicator">
        <div class="raju-typing-dot"></div>
        <div class="raju-typing-dot"></div>
        <div class="raju-typing-dot"></div>
      </div>
    `;
    container.appendChild(div);
    this.scrollToBottom();
  }

  hideTypingIndicator() {
    const el = document.getElementById('rajuTyping');
    if (el) el.remove();
  }

  // --- 8. Structured Bot Response Renderer (Language-Aware & Triage-Aware) ---
  addBotMessage(triage) {
    const container = document.getElementById('rajuMessages');
    if (!container) return;

    const isHindi = triage.lang === 'hi';
    const level = triage.level || (triage.severity === 'CRITICAL' ? 3 : (triage.severity === 'MODERATE' || triage.severity === 'URGENT' ? 2 : 1));
    const isCritical = level === 3 || triage.severity === 'CRITICAL';
    const isModerate = level === 2 || triage.severity === 'MODERATE' || triage.severity === 'URGENT';
    const isMild = !isCritical && !isModerate;

    const severityClass = isCritical ? 'raju-severity-critical' : (isModerate ? 'raju-severity-moderate' : 'raju-severity-normal');
    const severityIcon = isCritical ? '🔴' : (isModerate ? '🟡' : '🟢');
    
    let levelBadgeText = '';
    if (isCritical) {
      levelBadgeText = isHindi ? 'लेवल 3: क्रिटिकल इमरजेंसी' : 'Level 3: Critical Emergency';
    } else if (isModerate) {
      levelBadgeText = isHindi ? 'लेवल 2: मध्यम समस्या (क्लिनिक सलाह)' : 'Level 2: Moderate (Clinic Advice)';
    } else {
      levelBadgeText = isHindi ? 'लेवल 1: सामान्य / घरेलू देखभाल' : 'Level 1: Mild / Home Care';
    }

    const div = document.createElement('div');
    div.className = 'raju-msg bot';
    div.innerHTML = `
      <span class="raju-msg-sender">🩺 Dr. Raju (AI Health Assistant)</span>
      <div class="raju-msg-bubble">
        <!-- Severity & Category Tag -->
        <div class="raju-severity-tag ${severityClass}">
          ${severityIcon} ${levelBadgeText} • ${triage.conditionName || 'Triage'}
        </div>
        
        <!-- Summary / Introduction -->
        <div style="font-size: 0.86rem; color: #f8fafc; line-height: 1.45; margin-bottom: 6px;">
          ${triage.summary}
        </div>

        <!-- 1. Possible Cause & Medical Overview -->
        ${triage.causeOverview ? `
          <div class="raju-overview-box">
            <strong>${isHindi ? '🔍 संभावित कारण / स्थिति:' : '🔍 Possible Cause & Overview:'}</strong> ${triage.causeOverview}
          </div>
        ` : ''}

        <!-- 2. Step-by-Step Actionable Care / First-Aid -->
        ${triage.firstAidSteps && triage.firstAidSteps.length > 0 ? `
          <div class="raju-firstaid-box">
            <div class="raju-firstaid-title">
              <span>🩺</span> ${isCritical 
                ? (isHindi ? '🚨 तत्काल जीवन रक्षक कदम:' : '🚨 Immediate Life-Saving Action:') 
                : (isModerate 
                  ? (isHindi ? '📋 प्राथमिक उपचार और देखभाल:' : '📋 First-Aid & Care Measures:') 
                  : (isHindi ? '🌿 घरेलू उपाय और प्राथमिक देखभाल:' : '🌿 Actionable Home Care & Relief:'))}
            </div>
            ${triage.firstAidSteps.map(step => `
              <div class="raju-firstaid-item">
                <span>•</span> <span>${step}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <!-- 3. Red Flags & When to Seek Medical Attention -->
        ${triage.redFlags ? `
          <div class="raju-redflags-box">
            <div class="raju-redflags-title">
              <span>⚠️</span> ${isHindi ? 'डॉक्टर से कब संपर्क करें / ख़तरे के संकेत:' : 'When to Seek Medical Attention / Red Flags:'}
            </div>
            <span>${triage.redFlags}</span>
          </div>
        ` : ''}

        <!-- 4. TIER 3 ONLY: Interactive Emergency Ambulance Dispatch CTA -->
        ${isCritical ? `
          <div class="raju-emergency-cta">
            <div class="raju-cta-title">
              <span>🚨</span>
              <span>${isHindi ? 'Raju: यह गंभीर स्थिति हो सकती है, क्या अभी एम्बुलेंस बुक करें?' : 'Raju: This could be a critical emergency. Book an ambulance now?'}</span>
            </div>
            <button 
              type="button" 
              class="raju-dispatch-btn" 
              onclick="window.rajuAssistant.bookAmbulanceForCondition('${triage.mappedCondition || 'Other Emergency'}', '${triage.severity}')"
            >
              <span>🚑</span> ${isHindi ? '🚨 तुरंत इमरजेंसी एम्बुलेंस बुक करें ➔' : '🚨 Book Emergency Ambulance Now ➔'}
            </button>
          </div>
        ` : ''}

        <!-- TIER 2: Helpful Clinic Recommendation Banner -->
        ${isModerate ? `
          <div style="margin-top: 8px; padding: 8px 12px; background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 8px; font-size: 0.76rem; color: #fde68a;">
            💡 <em>${isHindi ? 'डॉ. राजू की सलाह: यदि लक्षण 24-48 घंटे से अधिक बने रहते हैं, तो कृपया नज़दीकी क्लिनिक या अस्पताल OPD में डॉक्टर से जांच करवाएं।' : "Raju's Advice: If symptoms persist beyond 24-48 hours, please consult a physician at a local Nagpur clinic or hospital OPD."}</em>
          </div>
        ` : ''}

        <!-- TIER 1: Reassuring Comfort Note -->
        ${isMild ? `
          <div style="margin-top: 8px; padding: 8px 12px; background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; font-size: 0.76rem; color: #a7f3d0;">
            🌿 <em>${isHindi ? 'डॉ. राजू का सुझाव: तनाव न लें, गुनगुना पानी पिएं और पर्याप्त आराम करें। आप जल्द पूरी तरह स्वस्थ हो जाएंगे!' : "Raju's Tip: Relax, stay hydrated with warm fluids, and take plenty of restful sleep. You will feel much better soon!"}</em>
          </div>
        ` : ''}
      </div>
    `;

    container.appendChild(div);
    this.scrollToBottom();
  }

  // --- 9. 1-Click Condition-Based Ambulance Dispatch (Level 3 Only) ---
  bookAmbulanceForCondition(conditionName, severity) {
    console.log(`[Dr. Raju Dispatch] Initiating ambulance modal for: ${conditionName} (${severity})`);

    // 1. Minimize Raju widget so user sees modal clearly
    this.toggleChat(false);

    // 2. Pre-populate condition and severity in requestAmbulanceModal
    const condSelect = document.getElementById('reqAmbCondition');
    if (condSelect) {
      let matched = false;
      for (let i = 0; i < condSelect.options.length; i++) {
        if (condSelect.options[i].value.toLowerCase().includes(conditionName.toLowerCase()) || 
            conditionName.toLowerCase().includes(condSelect.options[i].value.toLowerCase())) {
          condSelect.selectedIndex = i;
          matched = true;
          break;
        }
      }
      if (!matched && condSelect.options.length > 0) {
        condSelect.value = "Other Emergency";
      }
    }

    const sevSelect = document.getElementById('reqAmbSeverity');
    if (sevSelect) {
      sevSelect.value = severity || 'CRITICAL';
    }

    // 3. Pre-populate patient name if logged in as citizen
    const nameInput = document.getElementById('reqAmbPatientName');
    if (nameInput && !nameInput.value) {
      if (window.medStore && window.medStore.state.session.citizen.name && window.medStore.state.session.citizen.name !== 'Guest Citizen') {
        nameInput.value = window.medStore.state.session.citizen.name;
      } else {
        nameInput.value = "Emergency Patient";
      }
    }

    // 4. Open modal
    if (window.app) {
      window.app.openModal('requestAmbulanceModal');
      window.app.showToast(`🚨 Dr. Raju initiated Emergency Triage for ${conditionName}! Confirm details to dispatch.`, 'critical', 6000);
      if (window.medAudio) window.medAudio.playEmergencyAlert();
    }
  }

  // --- 10. Comprehensive Bilingual Local Medical Triage Engine ---
  evaluateSymptomsLocally(text, lang) {
    const raw = (text || '').toLowerCase().trim();
    const isHindi = lang === 'hi';

    // ========================================================
    // TIER 3: CRITICAL / LIFE-THREATENING EMERGENCIES ONLY
    // ========================================================

    // 1. Cardiac / Heart Attack / Chest Pain
    if (
      raw.includes('heart attack') || raw.includes('dil ka daura') || 
      (raw.includes('chest') && (raw.includes('pain') || raw.includes('dard') || raw.includes('tight') || raw.includes('heavy') || raw.includes('pressure'))) ||
      (raw.includes('chhati') && raw.includes('dard')) || 
      (raw.includes('seene') && raw.includes('dard')) ||
      raw.includes('cardiac') || raw.includes('angina') ||
      (raw.includes('left arm') && raw.includes('pain'))
    ) {
      if (isHindi) {
        return {
          lang: 'hi',
          level: 3,
          severity: 'CRITICAL',
          conditionName: 'हृदय रोग / कार्डियक इमरजेंसी (Chest Pain)',
          mappedCondition: 'Chest Pain',
          causeOverview: 'सीने में दबाव या दर्द हृदय की मांसपेशियों में रक्त प्रवाह की कमी (Angina/Heart strain) का संकेत हो सकता है। यह गोल्डन ऑवर (Golden Hour) की गंभीर स्थिति है।',
          firstAidSteps: [
            'तुरंत आरामदायक स्थिति में बैठ जाएं और चलना-फिरना बिल्कुल बंद कर दें।',
            'गर्दन, छाती और कमर के टाइट कपड़े ढीले करें ताकि सांस लेने में आसानी हो।',
            'धीरे-धीरे लंबी और गहरी सांसें लें ताकि फेफड़ों में ऑक्सीजन का स्तर बना रहे।',
            'यदि डॉक्टर द्वारा पहले से बताई गई हो और एलर्जी न हो, तो डॉक्टर की सलाह अनुसार चबाने वाली एस्पिरिन (300mg Aspirin) या Sorbitrate ले सकते हैं।',
            'तुरंत एडवांस्ड लाइफ सपोर्ट (ALS) एम्बुलेंस बुक करें।'
          ],
          redFlags: 'दर्द का बाएं हाथ, जबड़े, गर्दन या पीठ तक फैलना, ठंडा पसीना आना और चक्कर।',
          summary: '🚨 <strong>गंभीर कार्डियक चेतावनी:</strong> सीने में दर्द एक आपातकालीन स्थिति हो सकती है। तुरंत एम्बुलेंस बुक करें।',
          speechText: 'सावधान: सीने में दर्द एक गंभीर स्थिति हो सकती है। कृपया शांत होकर बैठ जाएं, हम तुरंत एम्बुलेंस बुक कर रहे हैं।'
        };
      } else {
        return {
          lang: 'en',
          level: 3,
          severity: 'CRITICAL',
          conditionName: 'Suspected Cardiac / Heart Emergency',
          mappedCondition: 'Chest Pain',
          causeOverview: 'Acute thoracic discomfort, pressure, or radiating pain may indicate myocardial ischemia, angina pectoris, or acute cardiovascular strain requiring immediate clinical stabilization.',
          firstAidSteps: [
            'Stop all physical exertion immediately and sit upright in a comfortable position (High Fowler’s position).',
            'Loosen all tight clothing around the neck, chest, and waist.',
            'Take slow, controlled deep breaths to maintain blood oxygen saturation.',
            'If prescribed by a cardiologist and not allergic, chew a 300mg Aspirin or Sorbitrate under medical advice.',
            'Dispatch an Advanced Life Support (ALS) Ambulance immediately!'
          ],
          redFlags: 'Pain radiating to the left arm, jaw, neck, or back, accompanied by cold profuse sweating, shortness of breath, or nausea.',
          summary: '🚨 <strong>Critical Cardiac Warning:</strong> Acute chest symptoms require immediate emergency triage. Every minute counts in the Golden Hour.',
          speechText: 'Warning: Potential cardiac emergency detected. Please sit down, stay calm, and let us dispatch an emergency ambulance right away.'
        };
      }
    }

    // 2. Severe Breathing / Dyspnea / Asthma Attack / Choking
    if (
      raw.includes('cannot breathe') || raw.includes('cant breathe') || raw.includes('saans nahi aa rahi') || 
      raw.includes('saans phool') || raw.includes('dum ghut') || raw.includes('choking') || 
      raw.includes('severe asthma attack') || raw.includes('acute breathlessness') || raw.includes('gasping for air') ||
      (raw.includes('oxygen') && (raw.includes('kam') || raw.includes('low') || raw.includes('drop')))
    ) {
      if (isHindi) {
        return {
          lang: 'hi',
          level: 3,
          severity: 'CRITICAL',
          conditionName: 'तीव्र सांस की तकलीफ (Acute Respiratory Distress)',
          mappedCondition: 'Breathing Difficulty',
          causeOverview: 'सांस लेने में गंभीर कठिनाई फेफड़ों में ऑक्सीजन की कमी (Hypoxia), तीव्र अस्थमा का दौरा या ब्रोंकियल संकुचन के कारण होती है।',
          firstAidSteps: [
            'मरीज को सीधा बैठाएं (High Fowler’s स्थिति) — कभी भी पीठ के बल लेटने न दें।',
            'कमरे की खिड़कियां खोलें और ताज़ा हवा का प्रवाह सुनिश्चित करें।',
            'यदि मरीज को अस्थमा है, तो तुरंत डॉक्टर द्वारा निर्धारित रेस्क्यू इनहेलर (Asthalin / Salbutamol) के 2-4 पफ दें।',
            'मरीज को शांत और तनावमुक्त रखने की कोशिश करें ताकि ऑक्सीजन की खपत कम हो।',
            'तुरंत ऑक्सीजन युक्त एम्बुलेंस बुलाएं।'
          ],
          redFlags: 'होंठ या नाखूनों का नीला पड़ना (Cyanosis), पूरे वाक्य न बोल पाना, या बेहोशी छाना।',
          summary: '🚨 <strong>गंभीर श्वसन चेतावनी:</strong> सांस लेने में गंभीर तकलीफ के लिए तत्काल ऑक्सीजन और मेडिकल सहायता चाहिए।',
          speechText: 'सांस की गंभीर तकलीफ पाई गई है। मरीज को सीधा बैठाएं और तुरंत ऑक्सीजन एम्बुलेंस बुक करें।'
        };
      } else {
        return {
          lang: 'en',
          level: 3,
          severity: 'CRITICAL',
          conditionName: 'Acute Respiratory Distress',
          mappedCondition: 'Breathing Difficulty',
          causeOverview: 'Severe shortness of breath indicates bronchial constriction, acute asthma exacerbation, pulmonary congestion, or systemic hypoxia requiring urgent oxygen support.',
          firstAidSteps: [
            'Keep the patient sitting fully upright (High Fowler’s position) — do NOT lay them flat.',
            'Open all windows and ensure maximum fresh air circulation around the patient.',
            'If the patient is asthmatic, administer 2 to 4 puffs of their prescribed rescue inhaler (Salbutamol / Asthalin).',
            'Encourage slow pursed-lip breathing to stabilize pulmonary ventilation.',
            'Dispatch an Oxygen-equipped ALS Ambulance immediately!'
          ],
          redFlags: 'Bluish tint on lips/fingertips (cyanosis), inability to speak full sentences, or confusion.',
          summary: '🚨 <strong>Critical Breathing Alert:</strong> Difficulty breathing requires immediate oxygen stabilization and medical evaluation.',
          speechText: 'Critical breathing difficulty detected. Keep patient sitting upright and dispatch an oxygen equipped ambulance immediately.'
        };
      }
    }

    // 3. Stroke / Paralysis / Slurred Speech
    if (
      raw.includes('stroke') || raw.includes('paralysis') || raw.includes('lakwa') || 
      raw.includes('chehra tedha') || raw.includes('slurred speech') || raw.includes('bol nahi pa raha') || 
      raw.includes('sudden arm weakness') || raw.includes('face drooping') || raw.includes('falij')
    ) {
      if (isHindi) {
        return {
          lang: 'hi',
          level: 3,
          severity: 'CRITICAL',
          conditionName: 'ब्रेन स्ट्रोक / पक्षाघात (Acute Stroke)',
          mappedCondition: 'Stroke Symptoms',
          causeOverview: 'मस्तिष्क की नस में रक्त का थक्का जमने या रक्तस्त्राव से स्ट्रोक होता है। समय रहते अस्पताल पहुंचना मस्तिष्क की कोशिकाओं को बचाने के लिए अति आवश्यक है।',
          firstAidSteps: [
            'FAST नियम जांचें: Face (चेहरा टेढ़ा होना), Arms (हाथ में कमजोरी), Speech (बोलने में लड़खड़ाहट), Time (तुरंत समय नोट करें)।',
            'मरीज को खाने या पीने के लिए कुछ भी न दें (गले में अटकने का गंभीर खतरा)।',
            'मरीज को करवट के बल लिटाएं और सिर को 15-30 डिग्री ऊंचा रखें।',
            'लक्षण शुरू होने का सही समय नोट करें और डॉक्टरों को बताएं।',
            'तुरंत स्ट्रोक-रेडी सुपर स्पेशियलिटी अस्पताल के लिए एम्बुलेंस बुक करें।'
          ],
          redFlags: 'शरीर के एक तरफ अचानक सुन्नपन, नज़र कमजोर होना या अचानक संतुलन खोना।',
          summary: '🚨 <strong>स्ट्रोक अलर्ट:</strong> स्ट्रोक के लक्षण दिखने पर तुरंत अस्पताल पहुंचना ज़रूरी है।',
          speechText: 'सावधान: स्ट्रोक के लक्षण दिखे हैं। तुरंत एम्बुलेंस बुक करें ताकि समय पर क्लॉट रिकवरी हो सके।'
        };
      } else {
        return {
          lang: 'en',
          level: 3,
          severity: 'CRITICAL',
          conditionName: 'Suspected Acute Brain Stroke',
          mappedCondition: 'Stroke Symptoms',
          causeOverview: 'Acute neurological deficit caused by cerebral ischemia or hemorrhage. Rapid thrombolytic therapy within the golden window is vital for neurological preservation.',
          firstAidSteps: [
            'Check FAST protocol: Face drooping? Arm weakness? Slurred speech? Time to act!',
            'Do NOT give anything to eat, drink, or swallow (high aspiration risk).',
            'Lay the patient on their side (recovery position) with head elevated 15-30 degrees.',
            'Record the exact time symptoms began for the hospital emergency stroke team.',
            'Dispatch ambulance to an Apex Stroke-Ready Hospital immediately!'
          ],
          redFlags: 'Sudden unilateral weakness, facial numbness, vision loss, or severe ataxia.',
          summary: '🚨 <strong>Acute Brain Stroke Alert:</strong> Immediate hospitalization is required for emergency CT scan and intervention.',
          speechText: 'Warning: Possible stroke symptoms detected. Time to hospital is critical for clot recovery. Please book an ambulance now.'
        };
      }
    }

    // 4. Major Accident / Trauma / Unconscious / Head Injury
    if (
      raw.includes('road accident') || raw.includes('car crash') || raw.includes('bike accident') || 
      raw.includes('behosh') || raw.includes('unconscious') || raw.includes('head trauma') ||
      (raw.includes('sar') && raw.includes('gehri chot')) || raw.includes('compound fracture') ||
      (raw.includes('accident') && (raw.includes('serious') || raw.includes('khoon') || raw.includes('chot')))
    ) {
      if (isHindi) {
        return {
          lang: 'hi',
          level: 3,
          severity: 'CRITICAL',
          conditionName: 'दुर्घटना एवं गंभीर ट्रॉमा (Major Trauma Injury)',
          mappedCondition: 'Accident / Trauma',
          causeOverview: 'सड़क दुर्घटना या ऊंचाई से गिरने पर सिर, रीढ़ की हड्डी या आंतरिक अंगों में गंभीर चोट लग सकती है।',
          firstAidSteps: [
            'मरीज की गर्दन और रीढ़ की हड्डी को बिल्कुल न हिलाएं (Spinal Immobilization जरूरी है)।',
            'बहते हुए खून पर साफ़ कपड़े या गेज से लगातार सीधा दबाव बनाए रखें।',
            'सांस की जांच करें; यदि उल्टी हो रही हो तो पूरी बॉडी को एक साथ करवट में लाएं।',
            'मरीज को गर्म रखने के लिए कपड़े या कंबल से ढकें ताकि शॉक से बचाया जा सके।',
            'तुरंत लेवल-1 ट्रॉमा केयर एम्बुलेंस बुक करें।'
          ],
          redFlags: 'कान/नाक से खून या पानी जैसा तरल निकलना, बेहोशी या टूटी हुई हड्डी का बाहर निकलना।',
          summary: '🚨 <strong>गंभीर ट्रॉमा अलर्ट:</strong> मरीज को हिलाए बिना तुरंत इमरजेंसी एम्बुलेंस बुलाएं।',
          speechText: 'दुर्घटना की आपातकालीन स्थिति है। गर्दन और रीढ़ को हिलाए बिना तुरंत ट्रॉमा एम्बुलेंस बुक करें।'
        };
      } else {
        return {
          lang: 'en',
          level: 3,
          severity: 'CRITICAL',
          conditionName: 'Major Trauma & Accident Injury',
          mappedCondition: 'Accident / Trauma',
          causeOverview: 'High-energy kinetic trauma with risk of cervical spine instability, intracranial hematoma, internal hemorrhage, or compound orthopedic fractures.',
          firstAidSteps: [
            'Do NOT move or twist the patient’s neck or spine unless in imminent life danger.',
            'Apply firm continuous direct pressure to actively bleeding wounds with clean cloth.',
            'Maintain clear patent airway; if vomiting, log-roll the entire body simultaneously to the side.',
            'Cover patient with a clean blanket to prevent hypothermia and trauma shock.',
            'Dispatch a Level-1 Trauma ALS Ambulance immediately!'
          ],
          redFlags: 'Loss of consciousness, clear CSF fluid from nose/ears, unequal pupils, or severe pelvic instability.',
          summary: '🚨 <strong>Critical Trauma Alert:</strong> High-energy trauma requires cervical immobilization and emergency surgical triage.',
          speechText: 'Trauma accident alert. Do not move patient spinal cord and dispatch an emergency ambulance right away.'
        };
      }
    }

    // 5. Severe Hemorrhage / Uncontrolled Bleeding
    if (
      raw.includes('nas kat gayi') || raw.includes('heavy bleeding') || raw.includes('khoon ki ulti') || 
      raw.includes('vomiting blood') || raw.includes('uncontrolled bleeding') || raw.includes('arterial bleed')
    ) {
      if (isHindi) {
        return {
          lang: 'hi',
          level: 3,
          severity: 'CRITICAL',
          conditionName: 'गंभीर रक्तस्त्राव (Severe Hemorrhage)',
          mappedCondition: 'Severe Bleeding',
          causeOverview: 'गहरी नस या धमनी कटने पर तेजी से खून बहने से शरीर हाइपोवोलेमिक शॉक (Hypovolemic Shock) में जा सकता है।',
          firstAidSteps: [
            'घाव पर साफ़ कपड़े या गेज से कम से कम 10 मिनट तक बिना हटाए कसकर दबाव बनाए रखें।',
            'चोट लगे अंग (हाथ/पैर) को हृदय के स्तर से ऊपर उठाएं।',
            'यदि घाव में कांच या नुकीली चीज़ फंसी हो, तो उसे न निकालें, उसके चारों ओर पैड लगाएं।',
            'मरीज को शांत लिटाएं और पैर थोड़े ऊंचे रखें।',
            'तुरंत टांके और ब्लड रिजर्व के लिए एम्बुलेंस बुलाएं।'
          ],
          redFlags: 'चक्कर आना, त्वचा का पीला पड़ना, नाड़ी का बहुत तेज या कमजोर होना।',
          summary: '🚨 <strong>भारी रक्तस्त्राव चेतावनी:</strong> तुरंत दबाव बनाए रखें और एम्बुलेंस बुक करें।',
          speechText: 'खून बहने की गंभीर स्थिति है। साफ़ कपड़े से कसकर दबाव बनाएं और तुरंत एम्बुलेंस बुक करें।'
        };
      } else {
        return {
          lang: 'en',
          level: 3,
          severity: 'CRITICAL',
          conditionName: 'Severe Hemorrhage / Active Bleeding',
          mappedCondition: 'Severe Bleeding',
          causeOverview: 'Uncontrolled vascular or arterial laceration leading to rapid volume depletion and hypovolemic shock.',
          firstAidSteps: [
            'Apply continuous, firm direct pressure directly over the wound using sterile gauze or a clean cloth.',
            'Elevate the bleeding extremity above heart level to reduce vascular pressure.',
            'Do NOT remove deeply embedded objects; pack firmly around the object.',
            'Maintain unbroken pressure for at least 10 minutes without lifting the dressing.',
            'Dispatch an emergency ambulance for surgical suture and blood reserves!'
          ],
          redFlags: 'Rapid pulse, cold clammy extremities, dizziness, or pallor indicative of hemorrhagic shock.',
          summary: '🚨 <strong>Severe Bleeding Warning:</strong> Uncontrolled blood loss requires emergency surgical stabilization.',
          speechText: 'Severe bleeding alert. Apply direct firm pressure with clean cloth and book an ambulance.'
        };
      }
    }

    // ========================================================
    // TIER 2: MODERATE CONDITIONS (Clinic / Doctor Checkup)
    // ========================================================

    // 6. Persistent / High Fever (101-103°F)
    if (
      raw.includes('102') || raw.includes('103') || raw.includes('104') || 
      raw.includes('tez bukhar') || raw.includes('high fever') || raw.includes('chills with fever') ||
      raw.includes('dengue') || raw.includes('malaria') || raw.includes('bukhar nahi utar')
    ) {
      if (isHindi) {
        return {
          lang: 'hi',
          level: 2,
          severity: 'MODERATE',
          conditionName: 'मध्यम से तेज़ बुखार (Pyrexia / Fever)',
          mappedCondition: 'Other Emergency',
          causeOverview: '101°F से 103°F का बुखार शरीर में सक्रिय वायरल या बैक्टीरियल संक्रमण (जैसे मौसमी फ्लू, डेंगू या मलेरिया) का प्रतिरक्षात्मक संकेत है।',
          firstAidSteps: [
            'माथे, गर्दन और बगलों पर सामान्य तापमान के पानी की गीली पट्टी रखें (बर्फ का इस्तेमाल न करें)।',
            'डिहाइड्रेशन से बचने के लिए भरपूर ORS, नारियल पानी, हल्का सूप और गुनगुना पानी पिएं।',
            'हल्के और ढीले सूती कपड़े पहनें और कमरे में ताज़ा हवा आने दें।',
            'डॉक्टर के निर्देशानुसार बुखार कम करने के लिए पैरासिटामोल (Paracetamol) ले सकते हैं।',
            'पर्याप्त आराम करें और भारी काम बिल्कुल न करें।'
          ],
          redFlags: 'यदि बुखार 48 घंटे से अधिक बना रहे, शरीर पर दाने (rashes) दिखें, या कंपकंपी के साथ बहुत तेज ठंड लगे, तो तुरंत क्लिनिक जाएं।',
          summary: '🌡️ <strong>तेज़ बुखार देखभाल:</strong> ठंडे पानी की पट्टी रखें और हाइड्रेटेड रहें। 2 दिन से अधिक होने पर डॉक्टर से जांच करवाएं।',
          speechText: 'तेज़ बुखार के लिए माथे पर गीले कपड़े की पट्टी रखें और खूब पानी पिएं। दो दिन से अधिक होने पर नज़दीकी क्लिनिक जाकर डॉक्टर से मिलें।'
        };
      } else {
        return {
          lang: 'en',
          level: 2,
          severity: 'MODERATE',
          conditionName: 'Moderate Pyrexia / Persistent Fever',
          mappedCondition: 'Other Emergency',
          causeOverview: 'Elevated core temperature (101°F–103°F) reflects systemic immune defense against viral, bacterial, or tropical vector-borne infections (e.g., dengue, malaria, influenza).',
          firstAidSteps: [
            'Apply lukewarm water sponge compresses to forehead, neck, and underarms to facilitate evaporative cooling.',
            'Maintain high fluid intake with Oral Rehydration Salts (ORS), coconut water, and clean soups.',
            'Wear lightweight, breathable cotton clothing in a well-ventilated room.',
            'Take Paracetamol (500-650mg) as per recommended adult medical guidelines for symptomatic comfort.',
            'Get plenty of bed rest to allow the immune system to recover.'
          ],
          redFlags: 'Fever persisting over 48 hours, petechial rash, severe chills, or localized severe pain requires local clinic OPD evaluation.',
          summary: '🌡️ <strong>Moderate Fever Protocol:</strong> Keep hydrated and apply cool water sponge. Consult a physician if fever lasts over 2 days.',
          speechText: 'For persistent fever, apply cool water sponging on your forehead and stay hydrated. If it persists beyond two days, please visit a local clinic.'
        };
      }
    }

    // 7. Moderate Gastric Pain / Food Poisoning / Frequent Vomiting
    if (
      (raw.includes('pet') && (raw.includes('dard') || raw.includes('cramp') || raw.includes('tez'))) || 
      (raw.includes('stomach') && raw.includes('pain')) ||
      raw.includes('food poisoning') || raw.includes('bar bar ulti') || raw.includes('continuous vomiting') ||
      (raw.includes('dast') && raw.includes('tez')) || raw.includes('severe diarrhea')
    ) {
      if (isHindi) {
        return {
          lang: 'hi',
          level: 2,
          severity: 'MODERATE',
          conditionName: 'पेट दर्द व संक्रमण (Acute Gastric Distress / Food Poisoning)',
          mappedCondition: 'Other Emergency',
          causeOverview: 'दूषित भोजन या पानी से पेट में बैक्टीरियल/वायरल इन्फेक्शन (Gastroenteritis) होने से ऐंठन, उल्टी और दस्त होते हैं।',
          firstAidSteps: [
            'हर 15 मिनट में 2-3 घूंट ORS का घोल या गुनगुना इलेक्ट्रोलाइट पानी धीरे-धीरे पिएं ताकि शरीर में पानी की कमी न हो।',
            'ठोस, मसालेदार, तला-भुना और दूध से बनी चीज़ें आज पूरी तरह बंद रखें।',
            'पेट की मांसपेशियों को आराम देने के लिए घुटने मोड़कर करवट के बल लेटें।',
            'उल्टी रुकने के 4-6 घंटे बाद हल्का दही-चावल, मूंग दाल की खिचड़ी या केला ले सकते हैं।',
            'बिना डॉक्टर से पूछे भारी दर्द निवारक दवाएं (Painkillers) न लें।'
          ],
          redFlags: 'पेट के निचले दाएं हिस्से में असहनीय दर्द (Appendicitis का खतरा), उल्टी में खून, या 24 घंटे से अधिक लगातार उल्टी होना।',
          summary: '🤢 <strong>पेट दर्द व उल्टी देखभाल:</strong> थोड़ा-थोड़ा ORS पिएं और हल्का भोजन लें। दर्द न घटने पर क्लिनिक चेकअप करवाएं।',
          speechText: 'पेट दर्द और उल्टी के लिए थोड़ा-थोड़ा ORS पानी पिएं और आराम करें। यदि दर्द तेज रहे तो नज़दीकी क्लिनिक जाएं।'
        };
      } else {
        return {
          lang: 'en',
          level: 2,
          severity: 'MODERATE',
          conditionName: 'Acute Gastric Distress / Infection',
          mappedCondition: 'Other Emergency',
          causeOverview: 'Gastrointestinal inflammation, food-borne bacterial intoxication, or acute gastroenteritis causing mucosal spasms, vomiting, and fluid loss.',
          firstAidSteps: [
            'Sip Oral Rehydration Solution (ORS) or electrolyte water in small amounts (30-50ml) every 15 minutes.',
            'Follow the BRAT diet (Bananas, Rice, Applesauce, Toast) once vomiting subsides; avoid dairy, fats, and spices.',
            'Rest in a comfortable side-lying position with knees slightly bent towards the abdomen.',
            'Avoid heavy NSAID painkillers which can irritate gastric mucosal lining.',
            'Rest your digestive tract with clear broths and herbal mint tea.'
          ],
          redFlags: 'Severe localized right lower quadrant pain, inability to keep fluids down for 24 hours, or blood in stool/vomitus.',
          summary: '🤢 <strong>Gastric Distress Care:</strong> Sip electrolyte fluids frequently and rest. Visit a clinic if dehydration or sharp localized pain occurs.',
          speechText: 'For stomach cramps, sip ORS water frequently and rest. Please visit a nearby clinic if pain does not subside.'
        };
      }
    }

    // 8. Burn & Scald Injury
    if (
      raw.includes('burn') || raw.includes('jal gaya') || raw.includes('aag') || 
      raw.includes('scald') || raw.includes('garam tel') || raw.includes('boiling water')
    ) {
      if (isHindi) {
        return {
          lang: 'hi',
          level: 2,
          severity: 'MODERATE',
          conditionName: 'जलने की चोट (Burn & Scald Care)',
          mappedCondition: 'Burn Injury',
          causeOverview: 'गर्म पानी, तेल या भाप से त्वचा की ऊपरी परत (Epidermis) जलने से जलन और फफोले पड़ते हैं।',
          firstAidSteps: [
            'जले हुए हिस्से को तुरंत नल के सामान्य बहते पानी के नीचे 15-20 मिनट तक रखें (बर्फ का उपयोग बिल्कुल न करें)।',
            'जले स्थान पर कभी भी टूथपेस्ट, मक्खन, तेल या हल्दी न लगाएं (इससे इन्फेक्शन बढ़ता है)।',
            'सूजन आने से पहले अंगूठी, घड़ी या टाइट कपड़े सावधानी से उतार दें।',
            'साफ़, सूखे और गैर-चिपचिपे कपड़े या स्टाइल ड्रेसिंग से हल्के से ढकें।',
            'फफोलों (Blisters) को कभी भी न फोड़ें।'
          ],
          redFlags: 'चेहरे, जोड़ों या बड़े हिस्से पर जलना, या घाव का सुन्न पड़ जाना। तुरंत क्लिनिक में ड्रेसिंग करवाएं।',
          summary: '🔥 <strong>जलने पर प्राथमिक उपचार:</strong> 15-20 मिनट सामान्य नल के पानी से धोएं और क्लिनिक पर ड्रेसिंग करवाएं।',
          speechText: 'जलने पर तुरंत सामान्य बहते पानी के नीचे 15 मिनट रखें। टूथपेस्ट न लगाएं और क्लिनिक जाकर ड्रेसिंग करवाएं।'
        };
      } else {
        return {
          lang: 'en',
          level: 2,
          severity: 'MODERATE',
          conditionName: 'Burn & Scald Injury',
          mappedCondition: 'Burn Injury',
          causeOverview: 'Thermal or scald damage to superficial epidermal layers requiring immediate heat dissipation to halt progressive tissue coagulation.',
          firstAidSteps: [
            'Immerse or run cool tap water over the burn continuously for 15 to 20 minutes (do NOT use ice).',
            'Never apply butter, toothpaste, oils, or raw remedies to burned skin.',
            'Gently remove restrictive jewelry or clothing before tissue edema develops.',
            'Cover the area loosely with clean, non-adherent sterile dressing or clean plastic film.',
            'Do not pop or drain blisters to prevent bacterial infection.'
          ],
          redFlags: 'Burns spanning larger than palm size, circumferential burns, or blistering over face/joints require clinic evaluation.',
          summary: '🔥 <strong>Burn Protocol:</strong> Running room-temperature water is essential. Visit a clinic for sterile burn dressing.',
          speechText: 'Burn injury detected. Cool area with running room-temperature water for 15 minutes and seek doctor dressing.'
        };
      }
    }

    // 9. Joint Sprains & Soft Tissue Swelling
    if (
      raw.includes('sprain') || raw.includes('moch') || raw.includes('pair mud gaya') || 
      raw.includes('swelling') || raw.includes('joint pain') || raw.includes('haddi me dard')
    ) {
      if (isHindi) {
        return {
          lang: 'hi',
          level: 2,
          severity: 'MODERATE',
          conditionName: 'मोच व जोड़ में सूजन (Joint Sprain / Soft Tissue Strain)',
          mappedCondition: 'Other Emergency',
          causeOverview: 'पैर मुड़ने या झटके से लिगामेंट (Ligament) खिंच जाने से जोड़ के चारों ओर सूजन और दर्द होता है।',
          firstAidSteps: [
            'R.I.C.E नियम अपनाएं: Rest (आराम करें), Ice (बर्फ की सिंकाई), Compression (क्रेप बैंडेज), Elevation (पैर ऊंचा रखें)।',
            'कपड़े में लपेटकर बर्फ से 15 मिनट तक सिंकाई करें (सीधे त्वचा पर बर्फ न लगाएं)।',
            'क्रेप बैंडेज (गरम पट्टी) को सहारा देने के लिए बांधें, लेकिन बहुत ज्यादा टाइट न करें।',
            'बैठते या लेटते समय पैर को तकिए पर रखकर दिल के स्तर से थोड़ा ऊंचा रखें।',
            'चोट लगे पैर पर पूरा वजन देकर न चलें।'
          ],
          redFlags: 'यदि जोड़ से खट की आवाज़ आई हो, बिल्कुल पैर न रखा जा रहा हो, तो फ्रैक्चर जांच के लिए X-Ray करवाएं।',
          summary: '🦵 <strong>मोच की देखभाल:</strong> बर्फ की सिंकाई करें और पैर को ऊंचा रखकर आराम दें।',
          speechText: 'मोच के लिए बर्फ से सिंकाई करें, गरम पट्टी बांधें और पैर पर ज्यादा जोर न दें।'
        };
      } else {
        return {
          lang: 'en',
          level: 2,
          severity: 'MODERATE',
          conditionName: 'Joint Sprain / Soft Tissue Injury',
          mappedCondition: 'Other Emergency',
          causeOverview: 'Ligamentous micro-tears or articular strain resulting in localized inflammatory effusion and mechanical pain.',
          firstAidSteps: [
            'Follow the R.I.C.E protocol: Rest, Ice, Compression, Elevation.',
            'Apply an ice pack wrapped in a towel for 15-20 minutes every 3-4 hours to diminish swelling.',
            'Apply a supportive elastic crepe compression bandage without cutting off capillary flow.',
            'Elevate the injured limb on pillows above heart level while resting.',
            'Avoid weight-bearing on the affected joint until assessed.'
          ],
          redFlags: 'Inability to bear any weight, gross joint deformity, or severe focal bone tenderness requiring an X-ray.',
          summary: '🦵 <strong>Sprain Care:</strong> Follow R.I.C.E protocol to reduce swelling. Visit an orthopedic clinic if unable to walk.',
          speechText: 'For joint sprains, apply ice packs, rest the joint, and visit an orthopedic clinic if unable to bear weight.'
        };
      }
    }

    // ========================================================
    // TIER 1: MILD / EVERYDAY SYMPTOMS (Calm Home Remedies)
    // ========================================================

    // 10. Common Mild Headache / Tension
    if (
      raw.includes('sar dard') || raw.includes('sir dard') || raw.includes('headache') || 
      raw.includes('sar me dard') || raw.includes('head pain') || raw.includes('halka sar')
    ) {
      if (isHindi) {
        return {
          lang: 'hi',
          level: 1,
          severity: 'NORMAL',
          conditionName: 'सामान्य सर दर्द (Mild Headache & Tension Relief)',
          mappedCondition: 'Other Emergency',
          causeOverview: 'सर दर्द आमतौर पर पानी की कमी (Dehydration), मोबाइल/लैपटॉप स्क्रीन का तनाव, नींद पूरी न होना या मानसिक थकान के कारण होता है। घबराने की बिल्कुल ज़रूरत नहीं है!',
          firstAidSteps: [
            'पानी पिएं: सबसे पहले 1-2 बड़े गिलास (300-500ml) गुनगुना या सादा पानी पिएं (अक्सर डिहाइड्रेशन से सर दर्द होता है)।',
            'स्क्रीन से दूरी: मोबाइल और लैपटॉप बंद करें, कमरे की लाइट धीमी करें और 20-30 मिनट शांति से आंखें बंद करके लेटें।',
            'हल्की मालिश: माथे और कनपटी (Temples) पर हल्के हाथों से बादाम तेल या हल्के बाम से गोलाकार मालिश करें।',
            'गहरी सांसें लें: 4-7-8 गहरी सांस लेने की तकनीक से गर्दन और सिर की मांसपेशियों का तनाव दूर करें।',
            'आरामदायक झपकी: 20-30 मिनट की एक छोटी झपकी (Power Nap) लें, अधिकांश तनाव सिरदर्द आराम से ठीक हो जाते हैं।'
          ],
          redFlags: 'यदि सर दर्द अचानक बहुत तेज़ हो ("बिजली कड़कने जैसा"), या साथ में उल्टी, तेज़ बुखार और गर्दन में अकड़न हो, तब डॉक्टर को दिखाएं।',
          summary: '😊 <strong>सामान्य सर दर्द:</strong> पानी पिएं, स्क्रीन से दूरी बनाएं और 20 मिनट शांत कमरे में आराम करें। आप जल्दी ठीक हो जाएंगे।',
          speechText: 'घबराने की कोई बात नहीं है। यह एक सामान्य सर दर्द है। एक गिलास पानी पिएं और थोड़ी देर शांत कमरे में आंखें बंद करके आराम करें।'
        };
      } else {
        return {
          lang: 'en',
          level: 1,
          severity: 'NORMAL',
          conditionName: 'Mild Headache & Tension Relief',
          mappedCondition: 'Other Emergency',
          causeOverview: 'Tension-type cephalalgia commonly triggered by ocular strain from digital screens, mild dehydration, insufficient restorative sleep, or cervical posture fatigue.',
          firstAidSteps: [
            'Hydration: Drink 1-2 tall glasses (300-500ml) of room-temperature or electrolyte water.',
            'Screen Break: Step away from all digital screens, dim ambient lighting, and rest your eyes for 20-30 minutes.',
            'Temple & Neck Massage: Gently massage the temples, forehead, and occipital base with light circular finger pressure.',
            'Controlled Breathing: Practice slow diaphragmatic breathing to release muscular scalp tension.',
            'Restorative Rest: A 20-30 minute power nap in a quiet, dark room resolves most tension headaches naturally.'
          ],
          redFlags: 'Sudden explosive "thunderclap" headache, or headache accompanied by neck rigidity, vomiting, or high fever.',
          summary: '😊 <strong>Common Headache Care:</strong> Rehydrate with water, take a break from screens, and rest in a dark room.',
          speechText: "Don't worry! This looks like a common mild headache. Drink a glass of water, rest your eyes in a quiet room, and you will feel much better."
        };
      }
    }

    // 11. Common Cold / Runny Nose / Sneezing
    if (
      raw.includes('cold') || raw.includes('sardi') || raw.includes('jukham') || 
      raw.includes('runny nose') || raw.includes('naak') || raw.includes('chheenk') || 
      raw.includes('sneez') || raw.includes('stuffy nose')
    ) {
      if (isHindi) {
        return {
          lang: 'hi',
          level: 1,
          severity: 'NORMAL',
          conditionName: 'सामान्य सर्दी-जुकाम (Common Cold & Nasal Relief)',
          mappedCondition: 'Other Emergency',
          causeOverview: 'मौसम बदलने या सामान्य वायरल इन्फेक्शन से नाक की झिल्ली में सूजन आ जाती है। यह 3 से 5 दिनों में घरेलू उपायों और आराम से पूरी तरह ठीक हो जाता है।',
          firstAidSteps: [
            'भाप लें (Steam): सादे गर्म पानी की भाप दिन में 2 बार 5-10 मिनट लें, इससे बंद नाक तुरंत खुलती है।',
            'गर्म पेय पदार्थ: अदरक-तुलसी की चाय, गर्म पानी या वेज/चिकन सूप का दिनभर थोड़ा-थोड़ा सेवन करें।',
            'हल्दी दूध: रात को सोने से पहले एक गिलास गुनगुने दूध में एक चुटकी हल्दी मिलाकर पिएं।',
            'ठंडी चीज़ों से बचाव: फ्रिज का ठंडा पानी, आइसक्रीम और सीधे एसी की हवा से बचें।',
            'भरपूर नींद: शरीर की रोग प्रतिरोधक क्षमता (Immunity) मजबूत करने के लिए 7-8 घंटे की अच्छी नींद लें।'
          ],
          redFlags: 'यदि जुकाम 7 दिन से ज़्यादा रहे, या नाक से गाढ़ा पीला मवाद जैसा बलगम आए और कान में तेज दर्द हो।',
          summary: '😊 <strong>सर्दी-जुकाम घरेलू उपाय:</strong> गर्म पानी की भाप लें, अदरक-तुलसी की चाय पिएं और अच्छी नींद लें।',
          speechText: 'यह सामान्य सर्दी-जुकाम है। गर्म पानी की भाप और अदरक-तुलसी का पानी लें, आपको जल्द राहत मिलेगी।'
        };
      } else {
        return {
          lang: 'en',
          level: 1,
          severity: 'NORMAL',
          conditionName: 'Common Cold & Nasal Relief',
          mappedCondition: 'Other Emergency',
          causeOverview: 'Viral upper respiratory tract congestion (Rhinovirus) causing mucosal inflammation and mild rhinorrhea, typically self-limiting within 4-7 days.',
          firstAidSteps: [
            'Steam Inhalation: Inhale plain hot water steam for 5-10 minutes twice daily to loosen nasal mucus congestion.',
            'Warm Hydration: Sip warm ginger-tulsi tea, clear broth, or warm lemon-honey water continuously through the day.',
            'Turmeric Milk: Drink a cup of warm turmeric milk before bedtime for soothing anti-inflammatory comfort.',
            'Avoid Cold Drafts: Protect yourself from direct cold air conditioning drafts and avoid chilled beverages.',
            'Immune Rest: Ensure 7-8 hours of uninterrupted sleep to support natural immune antibody production.'
          ],
          redFlags: 'Symptoms persisting over 10 days, severe sinus pressure with high fever, or difficulty swallowing.',
          summary: '😊 <strong>Common Cold Protocol:</strong> Steam inhalation, warm herbal tea, and quality rest will relieve nasal congestion.',
          speechText: 'This seems to be a common cold. Steam inhalation and warm ginger water will give you quick relief. Take good rest!'
        };
      }
    }

    // 12. Cough & Throat Irritation
    if (
      raw.includes('cough') || raw.includes('khansi') || raw.includes('gale me kharash') || 
      raw.includes('sore throat') || raw.includes('gala kharab') || raw.includes('throat pain')
    ) {
      if (isHindi) {
        return {
          lang: 'hi',
          level: 1,
          severity: 'NORMAL',
          conditionName: 'खांसी व गले में खराश (Mild Cough & Throat Soothing)',
          mappedCondition: 'Other Emergency',
          causeOverview: 'मौसम बदलने, धूल-धुएं या हल्के वायरल संक्रमण से गले में सूजन और खुजली होती है।',
          firstAidSteps: [
            'नमक पानी के गरारे: एक गिलास गुनगुने पानी में आधा चम्मच नमक मिलाकर दिन में 2-3 बार गरारे (Gargle) करें।',
            'अदरक और शहद: 1 चम्मच शुद्ध शहद में 4-5 बूंद अदरक का रस मिलाकर दिन में 2 बार लें, इससे गले की खराश तुरंत शांत होती है।',
            'गले को नम रखें: दिनभर थोड़ा-थोड़ा गुनगुना पानी पीते रहें ताकि गला सूखा न रहे।',
            'मुलेठी या लौंग: गले की खराश के लिए मुलेठी का छोटा टुकड़ा या भुनी हुई लौंग मुंह में रखें।',
            'परहेज़: तली-भुनी, अत्यधिक तीखी, खट्टी और ठंडी चीज़ों का सेवन बिल्कुल न करें।'
          ],
          redFlags: 'यदि खांसी 2 हफ्ते से अधिक रहे, या खांसी में खून आए, या सांस लेने में घरघराहट (Wheezing) हो।',
          summary: '😊 <strong>खांसी व गले की खराश:</strong> गुनगुने नमक पानी के गरारे करें और शहद-अदरक का रस लें।',
          speechText: 'गले की खराश और खांसी के लिए नमक के पानी से गरारे करें और शहद लें। ठंडी चीज़ों से परहेज़ रखें।'
        };
      } else {
        return {
          lang: 'en',
          level: 1,
          severity: 'NORMAL',
          conditionName: 'Mild Cough & Throat Soothing',
          mappedCondition: 'Other Emergency',
          causeOverview: 'Pharyngeal mucosal irritation or post-nasal drip following weather transitions or mild viral exposure.',
          firstAidSteps: [
            'Warm Salt Gargles: Dissolve 1/2 teaspoon of salt in warm water and gargle for 30 seconds 2-3 times daily.',
            'Honey & Ginger: Take 1 teaspoon of raw honey with fresh ginger juice to coat and soothe the pharyngeal lining.',
            'Throat Hydration: Sip warm water at regular intervals to maintain mucosal moisture.',
            'Herbal Lozenges: Use licorice (mulethi) or herbal throat drops for throat comfort.',
            'Avoid Irritants: Refrain from cold drinks, oily fried snacks, and exposure to smoke or dust.'
          ],
          redFlags: 'Cough lasting over 2 weeks, hemoptysis (blood in sputum), or accompanied by wheezing breathlessness.',
          summary: '😊 <strong>Cough & Throat Care:</strong> Warm salt water gargles and honey provide fast, effective relief.',
          speechText: 'For mild cough and throat irritation, warm salt water gargling and honey are very effective. Avoid cold foods.'
        };
      }
    }

    // 13. Fatigue, Weakness & Body Ache
    if (
      raw.includes('thakan') || raw.includes('fatigue') || raw.includes('tired') || 
      raw.includes('body ache') || raw.includes('badan dard') || raw.includes('kamzori') || 
      raw.includes('weakness') || raw.includes('neend') || raw.includes('exhaust')
    ) {
      if (isHindi) {
        return {
          lang: 'hi',
          level: 1,
          severity: 'NORMAL',
          conditionName: 'थकान व बदन दर्द (General Fatigue & Body Recovery)',
          mappedCondition: 'Other Emergency',
          causeOverview: 'अधिक शारीरिक मेहनत, तनाव, पानी की कमी या नींद पूरी न होने से मांसपेशियों में लैक्टिक एसिड जमा होकर थकान पैदा करता है।',
          firstAidSteps: [
            'इलेक्ट्रोलाइट्स पिएं: नारियल पानी, नींबू पानी में चुटकीभर सेंधा नमक, या ORS का घोल पिएं।',
            'गुनगुने पानी से स्नान: हल्के गर्म पानी से नहाने से मांसपेशियों की अकड़न तुरंत खुलती है।',
            'पौष्टिक भोजन: हल्का, सुपाच्य और ताजा खाना (दलिया, हरी सब्जियां, फल) खाएं।',
            'हल्की स्ट्रेचिंग: शरीर को धीरे-धीरे स्ट्रेच करें और पैरों की हल्की मालिश करें।',
            'पूरी नींद: आज रात बिना फोन देखे 7-8 घंटे की गहरी आरामदायक नींद लें।'
          ],
          redFlags: 'यदि कमजोरी के साथ चक्कर आकर बेहोशी हो, या सांस फूलने लगे।',
          summary: '😊 <strong>थकान व बदन दर्द:</strong> नारियल पानी पिएं, गुनगुने पानी से नहाएं और पूरी नींद लें।',
          speechText: 'थकान और बदन दर्द आराम की कमी से होता है। पर्याप्त पानी पिएं और आज रात अच्छी नींद लें।'
        };
      } else {
        return {
          lang: 'en',
          level: 1,
          severity: 'NORMAL',
          conditionName: 'General Fatigue & Muscle Recovery',
          mappedCondition: 'Other Emergency',
          causeOverview: 'Systemic muscular exhaustion and mild electrolyte depletion from physical overexertion, sleep deficit, or dehydration.',
          firstAidSteps: [
            'Electrolyte Balance: Drink fresh coconut water, lemonade with a pinch of rock salt, or an ORS solution.',
            'Warm Bath: Take a warm shower to relieve skeletal muscle stiffness and promote peripheral blood flow.',
            'Nutritional Recovery: Consume a balanced meal with fresh fruits, greens, and complex carbohydrates.',
            'Light Stretching: Perform gentle mobility stretches to release back and leg muscle tension.',
            'Restorative Sleep: Prioritize 8 hours of uninterrupted, screen-free sleep tonight.'
          ],
          redFlags: 'Unexplained chronic lethargy, syncopal episodes (fainting), or severe muscular weakness.',
          summary: '😊 <strong>Fatigue Recovery Protocol:</strong> Rehydrate with electrolytes, take a warm bath, and sleep well.',
          speechText: "Body ache and fatigue are usually due to tiredness. Drink plenty of fluids, eat well, and get a good night's rest."
        };
      }
    }

    // 14. Mild Acidity & Gas
    if (
      raw.includes('acidity') || raw.includes('gas') || raw.includes('pet bhari') || 
      raw.includes('indigestion') || raw.includes('khatti dakar') || raw.includes('bloat')
    ) {
      if (isHindi) {
        return {
          lang: 'hi',
          level: 1,
          severity: 'NORMAL',
          conditionName: 'एसिडिटी व गैस (Mild Acidity & Digestive Ease)',
          mappedCondition: 'Other Emergency',
          causeOverview: 'ज्यादा तला-भुना/तीखा खाना, देर रात भोजन, चाय-कॉफी या लंबे समय खाली पेट रहने से पेट में एसिड की मात्रा बढ़ जाती है।',
          firstAidSteps: [
            'ठंडा दूध: आधा कप ठंडा सादा दूध या मट्ठा (छाछ) पिएं, यह पेट के अतिरिक्त एसिड को तुरंत शांत करता है।',
            'सौंफ और अजवाइन: 1 चम्मच सौंफ और चुटकीभर अजवाइन को गुनगुने पानी के साथ लें, इससे गैस और भारीपन दूर होता है।',
            'खाने के बाद न लेटें: भोजन के तुरंत बाद लेटने से बचें; 10-15 मिनट धीरे-धीरे टहलें।',
            'हल्का खाना: आज सादा भोजन जैसे दही-चावल, मूंग दाल खिचड़ी या दलिया ही लें।',
            'परहेज़: चाय, कॉफी, तली हुई चीज़ें, कोल्ड ड्रिंक्स और सिगरेट से पूरी तरह दूर रहें।'
          ],
          redFlags: 'यदि सीने में चुभन के साथ बाएं हाथ में दर्द हो (Heart Attack से अलग पहचानें), या उल्टी में खून आए।',
          summary: '😊 <strong>एसिडिटी से राहत:</strong> थोड़ा ठंडा दूध पिएं, सौंफ-अजवाइन लें और हल्का भोजन करें।',
          speechText: 'एसिडिटी के लिए थोड़ा ठंडा दूध पिएं और तीखे खाने से बचें। खाने के बाद 10 मिनट टहलना फायदेमंद है।'
        };
      } else {
        return {
          lang: 'en',
          level: 1,
          severity: 'NORMAL',
          conditionName: 'Mild Acidity & Digestion Ease',
          mappedCondition: 'Other Emergency',
          causeOverview: 'Gastric hyperacidity or mild gastroesophageal reflux provoked by spicy meals, irregular meal timings, or caffeine intake.',
          firstAidSteps: [
            'Cold Milk / Water: Drink half a glass of chilled skim milk or plain room-temperature water to neutralize gastric acid.',
            'Fennel & Ajwain: Chew half a teaspoon of fennel seeds (saunf) or sip warm carom seed water for gas relief.',
            'Stay Upright: Avoid reclining or sleeping flat for at least 2 hours following a meal.',
            'Gentle Stroll: Take a gentle 10-15 minute walk to stimulate healthy gastrointestinal peristalsis.',
            'Bland Diet: Eat soothing, easily digestible meals (curd rice, oatmeal, khichdi) and avoid citrus/spices today.'
          ],
          redFlags: 'Severe burning radiating to back, coffee-ground vomiting, or difficulty swallowing.',
          summary: '😊 <strong>Acidity Relief Protocol:</strong> Drink cold milk, avoid spicy food, and remain upright after eating.',
          speechText: 'For mild acidity and gas, drink a little cold milk or warm water and avoid spicy foods. Light walking helps digestion.'
        };
      }
    }

    // 15. Minor Scratch / Cut
    if (
      raw.includes('minor cut') || raw.includes('chhoti chot') || raw.includes('scratch') || 
      raw.includes('halka cut') || raw.includes('scraped') || raw.includes('khila')
    ) {
      if (isHindi) {
        return {
          lang: 'hi',
          level: 1,
          severity: 'NORMAL',
          conditionName: 'हल्की खरोंच व कट (Minor Scratch First-Aid)',
          mappedCondition: 'Other Emergency',
          causeOverview: 'त्वचा की ऊपरी परत छिलने या छोटा कट लगने पर प्राथमिक एंटीसेप्टिक सफाई ही पर्याप्त होती है।',
          firstAidSteps: [
            'कट को साफ़ बहते पानी और हल्के साबुन से धोएं ताकि धूल-मिट्टी निकल जाए।',
            'साफ़ कपड़े या कॉटन से थपथपाकर सुखाएं।',
            'एंटीसेप्टिक क्रीम (जैसे Betadine या Neosporin) लगाएं।',
            'धूल और मक्खियों से बचाने के लिए साफ़ बैंड-एड (Band-Aid) लगाएं।'
          ],
          redFlags: 'यदि कट गहरा हो, टांके लगाने की जरूरत लगे, या पिछले 5 साल में टिटनेस (Tetanus) का टीका न लगा हो।',
          summary: '🩹 <strong>छोटी चोट की देखभाल:</strong> साफ़ पानी से धोकर एंटीसेप्टिक क्रीम और बैंड-एड लगाएं।',
          speechText: 'छोटी चोट को साफ़ पानी से धोएं, एंटीसेप्टिक क्रीम लगाएं और बैंड-एड से ढकें।'
        };
      } else {
        return {
          lang: 'en',
          level: 1,
          severity: 'NORMAL',
          conditionName: 'Minor Scratch & First-Aid Care',
          mappedCondition: 'Other Emergency',
          causeOverview: 'Superficial cutaneous abrasion or minor laceration requiring basic antiseptic wound toilet.',
          firstAidSteps: [
            'Wash the affected area gently under clean running tap water with mild soap.',
            'Pat dry with a clean sterile gauze or fresh tissue.',
            'Apply an over-the-counter antiseptic ointment (e.g., Betadine, Neosporin).',
            'Cover with a clean adhesive bandage (Band-Aid) to shield from contaminants.'
          ],
          redFlags: 'Deep gaping wound requiring sutures, animal bite, or rusty metal cut requiring a Tetanus booster.',
          summary: '🩹 <strong>Minor Wound Care:</strong> Clean with water, apply antiseptic cream, and cover with a bandage.',
          speechText: 'Wash the minor cut with clean water, apply antiseptic cream, and cover with a band-aid.'
        };
      }
    }

    // Default Fallback
    if (isHindi) {
      return {
        lang: 'hi',
        level: 1,
        severity: 'NORMAL',
        conditionName: 'सामान्य स्वास्थ्य मार्गदर्शन (Health Guidance)',
        mappedCondition: 'Other Emergency',
        causeOverview: `डॉ. राजू ने आपके लक्षण "${this.escapeHTML(text)}" का मूल्यांकन किया है।`,
        firstAidSteps: [
          'पर्याप्त मात्रा में पानी और पौष्टिक तरल पदार्थ पिएं।',
          'आरामदायक नींद लें और भारी तनाव से बचें।',
          'लक्षणों पर नज़र रखें; यदि तकलीफ बढ़े तो डॉक्टर से परामर्श लें।'
        ],
        redFlags: 'सांस लेने में दिक्कत, सीने में दर्द या भारी रक्तस्त्राव होने पर तुरंत एम्बुलेंस बुक करें।',
        summary: '🌿 <strong>सामान्य स्वास्थ्य सुझाव:</strong> हाइड्रेटेड रहें, हल्का भोजन लें और आराम करें।',
        speechText: 'आपके सवाल के लिए धन्यवाद। पर्याप्त पानी पिएं, आराम करें और जरूरत पड़ने पर डॉक्टर से सलाह लें।'
      };
    } else {
      return {
        lang: 'en',
        level: 1,
        severity: 'NORMAL',
        conditionName: 'General Health Guidance',
        mappedCondition: 'Other Emergency',
        causeOverview: `Dr. Raju evaluated your query: "${this.escapeHTML(text)}".`,
        firstAidSteps: [
          'Ensure optimal hydration with water and balanced electrolytes.',
          'Get restorative sleep and avoid strenuous physical exertion.',
          'Monitor your symptoms closely over the next 24 hours.'
        ],
        redFlags: 'If shortness of breath, chest discomfort, or severe pain arises, seek urgent medical care.',
        summary: '🌿 <strong>General Health Care:</strong> Stay well-hydrated, eat light meals, and get adequate rest.',
        speechText: 'Thank you for sharing your symptoms. Please stay well-hydrated, rest, and consult a doctor if you feel unwell.'
      };
    }
  }

  // --- 11. Speech Synthesis (Text-To-Speech Output in Matched Language) ---
  speakAdvice(text, lang) {
    if (!this.isTtsEnabled || !window.speechSynthesis) return;

    try {
      window.speechSynthesis.cancel(); // Stop ongoing speech

      const cleanText = (text || '').replace(/<[^>]*>?/gm, ''); // Strip HTML tags
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      if (lang === 'hi') {
        utterance.lang = 'hi-IN';
        const hindiVoice = voices.find(v => v.lang.includes('hi') || v.lang.includes('hi-IN')) || voices[0];
        if (hindiVoice) utterance.voice = hindiVoice;
      } else {
        utterance.lang = 'en-IN';
        const englishVoice = voices.find(v => v.lang.includes('en-IN') || v.lang.includes('en-GB') || v.lang.includes('en-US')) || voices[0];
        if (englishVoice) utterance.voice = englishVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('[Dr. Raju TTS error]:', e);
    }
  }

  // --- Helper: Scroll to bottom of chat ---
  scrollToBottom() {
    const container = document.getElementById('rajuMessages');
    if (container) {
      setTimeout(() => {
        container.scrollTop = container.scrollHeight;
      }, 50);
    }
  }

  // --- Helper: Escape HTML ---
  escapeHTML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// Global instance
window.rajuAssistant = new DrRajuAssistant();

// Safe Auto-initialize when DOM is ready in Citizen environment
function autoInitDrRaju() {
  if (typeof window !== 'undefined' && window.location) {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('hospital-eoc') || path.includes('hospital')) {
      return; // Never init on hospital dashboard
    }
  }
  if (window.medStore) {
    const role = window.medStore.getCurrentRole();
    if (role === 'citizen') {
      window.rajuAssistant.init();
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => autoInitDrRaju());
} else {
  autoInitDrRaju();
}
