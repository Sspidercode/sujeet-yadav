(function(){
  const chatLog = document.getElementById('chatLog');
  const chatInput = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendBtn');
  const suggestionsEl = document.getElementById('suggestions');
  const keyBtn = document.getElementById('keyBtn');
  const clearChatBtn = document.getElementById('clearChatBtn');
  const regenBtn = document.getElementById('regenBtn');
  const yearLabel = document.getElementById('year');
  if (yearLabel) yearLabel.textContent = new Date().getFullYear().toString();

  const settingsBtns = document.querySelectorAll('#toggleSettings');
  const settingsPanel = document.getElementById('settingsPanel');
  const gemKeyInput = document.getElementById('gemKey');
  const saveKeyBtn = document.getElementById('saveKey');
  const clearKeyBtn = document.getElementById('clearKey');
  const avatarInput = document.getElementById('avatarInput');
  const modalEl = document.getElementById('avatarModal');
  const presetGrid = document.getElementById('presetGrid');
  const modalAvatarInput = document.getElementById('modalAvatarInput');
  const avatarPreview = document.getElementById('avatarPreview');
  const saveAvatarBtn = document.getElementById('saveAvatarBtn');
  const profileNameInput = document.getElementById('profileNameInput');
  const profileGenderSelect = document.getElementById('profileGenderSelect');
  const profileAvatar = document.getElementById('profileAvatar');
  const profileName = document.getElementById('profileName');
  const profileGender = document.getElementById('profileGender');
  const editProfileBtn = document.getElementById('editProfileBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const voiceBtn = document.getElementById('voiceBtn');
  const ttsBtn = document.getElementById('ttsBtn');
  // API key modal elements
  const apiKeyModalEl = document.getElementById('apiKeyModal');
  const gemKeyModalInput = document.getElementById('gemKeyModalInput');
  const keySaveBtn = document.getElementById('keySaveBtn');
  const keyClearBtn = document.getElementById('keyClearBtn');
  const keyPreview = document.getElementById('keyPreview');
  // Loader overlay
  const aiLoader = document.getElementById('aiLoader');
  const aiLoaderMsg = document.getElementById('aiLoaderMsg');
  // Language selector
  const langSelect = document.getElementById('langSelect');

  // Language persistence
  const LANG_KEY = 'playground_lang';
  function loadLang(){ return localStorage.getItem(LANG_KEY) || 'hinglish'; }
  function saveLang(v){ localStorage.setItem(LANG_KEY, v); }
  function maskKey(k){
    if (!k) return 'Not set';
    const last4 = k.slice(-4);
    const masked = '•'.repeat(Math.max(8, k.length - 4)) + last4; // always at least 8 bullets for obfuscation
    return masked;
  }
  let isListening = false;
  let ttsEnabled = (localStorage.getItem('playground_tts_enabled') ?? 'true') !== 'false';
  let selectedVoice = null;
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  // Voice input enablement (disabled by default on refresh)
  const VOICE_INPUT_KEY = 'playground_voice_input_enabled';
  function loadVoiceEnabled(){ return localStorage.getItem(VOICE_INPUT_KEY) === 'true'; }
  function saveVoiceEnabled(v){ localStorage.setItem(VOICE_INPUT_KEY, String(!!v)); }
  let voiceInputEnabled = loadVoiceEnabled() || false;
  function setBtnState(btn, on){
    if (!btn) return;
    btn.classList.toggle('btn-primary-v2', !!on);
    btn.classList.toggle('btn-outline-v2', !on);
  }
  function updateUiStates(){
    setBtnState(ttsBtn, ttsEnabled);
    // Highlight mic if listening or enabled
    setBtnState(voiceBtn, isListening || voiceInputEnabled);
  }
  updateUiStates();
  // Prepare voices for TTS
  if ('speechSynthesis' in window) {
    const loadVoices = ()=>{
      const voices = window.speechSynthesis.getVoices() || [];
      const lang = loadLang();
      const pref = lang === 'english' ? /en-(IN|US)|English/i
                  : lang === 'punjabi' ? /pa-|Punjabi/i
                  : /hi-|en-IN|India|Hindi/i; // default Hinglish/Hindi/Bhojpuri
      selectedVoice = voices.find(v=>pref.test((v.lang||'')+' '+(v.name||''))) || voices[0] || null;
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }
  function stripCodeBlocks(text){
    return String(text || '').replace(/```[\s\S]*?```/g, ' ').replace(/\s{2,}/g, ' ').trim();
  }
  // Clean text so TTS doesn't read special characters/markdown/links/emojis
  function sanitizeForTTS(text){
    let s = String(text || '');
    // Drop fenced code blocks
    s = s.replace(/```[\s\S]*?```/g, ' ');
    // Keep only link text for markdown links
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
    // Remove inline code markers/backticks/markdown emphasis/headers/blockquote symbols
    s = s.replace(/[*_~`>#]+/g, '');
    // Remove list bullets (dash/star/dot) at line starts or inline
    s = s.replace(/(^|\n)\s*[-*•]\s+/g, '$1');
    s = s.replace(/\s[-*•]\s+/g, ' ');
    // Remove URLs
    s = s.replace(/https?:\/\/\S+/g, '');
    // Remove most symbols/emoji while keeping letters, numbers, whitespace and common punctuation
    s = s.replace(/[^\p{L}\p{M}\p{N}\s\.,!?\-;:'"()]/gu, ' ');
    // Collapse whitespace
    s = s.replace(/\s{2,}/g, ' ').trim();
    return s;
  }
  function speak(text){
    if (!ttsEnabled || !('speechSynthesis' in window)) return;
    const t = sanitizeForTTS(text);
    if (!t) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(t);
      if (selectedVoice) u.voice = selectedVoice;
      const l = loadLang();
      const langCode = l === 'english' ? 'en-IN' : (l === 'punjabi' ? 'pa-IN' : 'hi-IN');
      u.lang = (selectedVoice && selectedVoice.lang) || langCode;
      u.rate = 1.0;
      u.pitch = 1.0;
      window.speechSynthesis.speak(u);
    } catch {}
  }
  ttsBtn?.addEventListener('click', ()=>{
    ttsEnabled = !ttsEnabled;
    localStorage.setItem('playground_tts_enabled', String(ttsEnabled));
    updateUiStates();
    notify(ttsEnabled ? '🔊 Voice playback enabled.' : '🔇 Voice playback disabled.');
  });
  // Basic mobile/permission helpers
  let micStream = null;
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isSecure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  async function ensureMic(){
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return true; // try anyway
    if (micStream?.active) return true;
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      return true;
    } catch (err) {
      notify('🎤 Mic permission denied. Please allow microphone access.');
      return false;
    }
  }
  voiceBtn?.addEventListener('click', async ()=>{
    // First click toggles enablement; second click starts listening
    if (!voiceInputEnabled) {
      voiceInputEnabled = true;
      saveVoiceEnabled(true);
      updateUiStates();
      notify('🎙️ Voice input enabled. Tap mic again to start listening.');
      return;
    }
    if (!SpeechRecognition) { notify('🎤 Voice input not supported on this browser.'); return; }
    if (isMobile && !isSecure) { notify('🔒 Voice works best on HTTPS or localhost.'); }
    // If a prior SIGILL crash was detected, keep voice disabled for this session
    if (sessionStorage.getItem('voice_disabled_sigill') === '1') {
      notify('⚠️ Voice is disabled due to a prior device crash. Restart browser or update Chrome/WebView to re-enable.');
      return;
    }
    if (isListening) { try { recognition.stop(); } catch {} return; }
    // Avoid getUserMedia on mobile (can conflict with SpeechRecognition and cause native crashes)
    const ok = isMobile ? true : await ensureMic();
    if (!ok) return;
    startListening();
  });
  let recognition;
  function startListening(){
    try {
      recognition = new SpeechRecognition();
      // Map speech input language from selected language
      const l = loadLang();
      recognition.lang = l === 'english' ? 'en-IN' : 'hi-IN';
      // On some Android Chrome builds, continuous mode can crash (SIGILL). Keep it off.
      recognition.continuous = false;
      recognition.interimResults = false;      // keep simple to reduce crash surface
      recognition.maxAlternatives = 1;
      recognition.onstart = ()=>{ isListening = true; updateUiStates(); };
      recognition.onresult = (e)=>{
        // Collect final results only to send; ignore interim for send
        const res = e.results?.[0];
        const txt = res?.[0]?.transcript || '';
        if (txt) {
          if (chatInput) chatInput.value = txt;
          onSend();
        }
      };
      recognition.onerror = (e)=>{
        const err = e?.error || 'unknown';
        if (err === 'not-allowed') notify('🔒 Permission blocked. Allow mic in site settings.');
        else if (err === 'no-speech') notify('🤐 No speech detected. Please try again.');
        else if (err === 'audio-capture') notify('🎙️ No microphone found or busy.');
        else if ((e?.message||'').toUpperCase().includes('SIGILL')) {
          sessionStorage.setItem('voice_disabled_sigill', '1');
          notify('⚠️ Device audio crashed (SIGILL). Voice disabled for this session. Please update Chrome/WebView or restart the browser.');
        }
        else notify('🎤 Voice error: ' + err);
      };
      recognition.onend = ()=>{
        isListening = false;
        updateUiStates();
        // Do NOT auto-restart on mobile to avoid crashes (SIGILL).
      };
      recognition.start();
    } catch (e) {
      const msg = (e && (e.message||'')).toString();
      if (msg.toUpperCase().includes('SIGILL')) {
        sessionStorage.setItem('voice_disabled_sigill', '1');
        notify('⚠️ Voice engine crashed (SIGILL). Try updating Chrome/WebView or restarting the browser.');
      } else {
        notify('🎤 Unable to start voice input.');
      }
    }
  }

  // Stop recognition when page is hidden to avoid background crashes
  document.addEventListener('visibilitychange', ()=>{
    if (document.visibilityState !== 'visible') {
      try { recognition?.abort(); } catch {}
      isListening = false; updateUiStates();
    }
  });
  window.addEventListener('pagehide', ()=>{
    try { recognition?.abort(); } catch {}
    isListening = false; updateUiStates();
  });

  // ====================== Mini Dino Game ======================
  (function setupDino(){
    const startBtn = document.getElementById('dinoStart');
    const canvas = document.getElementById('dinoCanvas');
    const scoreEl = document.getElementById('dinoScore');
    const hintEl = document.getElementById('dinoHint');
    if (!startBtn || !canvas) return;
    const ctx = canvas.getContext('2d');
    let rafId = 0;
    let running = false;
    const W = canvas.width, H = canvas.height;
    const groundY = H - 20;
    const dino = { x: 50, y: groundY - 28, w: 28, h: 28, vy: 0, onGround: true };
    let obst = [];
    let spawnT = 0;
    let speed = 5;
    let score = 0;

    function reset(){
      dino.y = groundY - dino.h;
      dino.vy = 0;
      dino.onGround = true;
      obst = [];
      spawnT = 0;
      speed = 5;
      score = 0;
    }
    function jump(){
      if (!running) return;
      if (dino.onGround) {
        dino.vy = -10.5;
        dino.onGround = false;
      }
    }
    function rect(x,y,w,h,c){
      ctx.fillStyle = c;
      ctx.fillRect(x,y,w,h);
    }
    function drawGround(){
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.moveTo(0, groundY + 0.5);
      ctx.lineTo(W, groundY + 0.5);
      ctx.stroke();
    }
    function collide(a,b){
      return !(a.x + a.w < b.x || a.x > b.x + b.w || a.y + a.h < b.y || a.y > b.y + b.h);
    }
    function step(){
      ctx.clearRect(0,0,W,H);
      // physics
      dino.vy += 0.55;
      dino.y += dino.vy;
      if (dino.y >= groundY - dino.h) { dino.y = groundY - dino.h; dino.vy = 0; dino.onGround = true; }
      // spawn obstacles
      spawnT -= 1;
      if (spawnT <= 0){
        const w = 14 + Math.random()*12;
        const h = 18 + Math.random()*16;
        obst.push({ x: W + 10, y: groundY - h, w, h });
        spawnT = 60 + Math.random()*50;
      }
      // move obstacles
      for (let i=0;i<obst.length;i++){
        obst[i].x -= speed;
      }
      // remove off-screen
      obst = obst.filter(o => o.x + o.w > -20);
      // collisions
      for (const o of obst){
        if (collide(dino, o)) {
          gameOver();
          return;
        }
      }
      // draw
      drawGround();
      rect(dino.x, dino.y, dino.w, dino.h, '#ff5478'); // player
      ctx.fillStyle = '#c9d4f1';
      for (const o of obst){ rect(o.x, o.y, o.w, o.h, '#c9d4f1'); }
      // score & difficulty
      score += 1;
      if (score % 180 === 0) speed = Math.min(speed + 0.5, 12);
      if (scoreEl) { scoreEl.style.display = ''; scoreEl.textContent = 'Score: ' + Math.floor(score/6); }
      rafId = requestAnimationFrame(step);
    }
    function gameOver(){
      running = false;
      cancelAnimationFrame(rafId);
      // overlay
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0,0,W,H);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px Poppins, sans-serif';
      ctx.fillText('Game Over', W/2 - 50, H/2 - 8);
      ctx.font = '12px Poppins, sans-serif';
      ctx.fillText('Press Play to restart', W/2 - 62, H/2 + 12);
      if (startBtn) startBtn.textContent = 'Restart';
      if (hintEl) hintEl.style.display = '';
    }
    function startGame(){
      reset();
      running = true;
      if (canvas) canvas.style.display = '';
      if (hintEl) hintEl.style.display = 'none';
      if (startBtn) startBtn.textContent = 'Playing...';
      step();
    }
    startBtn.addEventListener('click', ()=>{
      if (!running) startGame();
    });
    // controls
    window.addEventListener('keydown', (e)=>{
      if (e.code === 'Space') {
        const t = e.target;
        const tag = (t && t.tagName) ? t.tagName.toLowerCase() : '';
        const isEditable = (tag === 'input' || tag === 'textarea' || (t && t.isContentEditable));
        // Do not block space when typing in inputs/textareas, and only capture during gameplay
        if (isEditable || !running) return;
        e.preventDefault();
        jump();
      }
    });
    canvas.addEventListener('pointerdown', ()=> jump());
  })();

  function loadKey(){ return localStorage.getItem('gemini_api_key') || 'AIzaSyDjqKy-GvXtMH-aIzUTi6XRqlsB5nO21D0'; }
  function saveKey(k){ localStorage.setItem('gemini_api_key', k); }
  function clearKey(){ localStorage.removeItem('gemini_api_key'); }

  if (gemKeyInput) gemKeyInput.value = loadKey();
  // Key button -> open modal
  keyBtn?.addEventListener('click', ()=>{
    if (window.bootstrap && apiKeyModalEl) {
      try {
        const inst = bootstrap.Modal.getOrCreateInstance(apiKeyModalEl);
        if (gemKeyModalInput) gemKeyModalInput.value = '';
        if (keyPreview) keyPreview.textContent = 'Saved key: ' + maskKey(loadKey());
        inst.show();
        setTimeout(()=>{ try{ gemKeyModalInput?.focus(); }catch{} }, 50);
      } catch {
        // fallback to prompt if modal fails
        const current = loadKey();
        const k = prompt('Enter your Gemini API key:', current || '');
        if (k === null) return;
        const v = (k || '').trim();
        if (!v) { clearKey(); notify('🔓 API key cleared. Using funny mode.'); }
        else { saveKey(v); notify('🔐 API key saved locally.'); }
      }
    } else {
      const current = loadKey();
      const k = prompt('Enter your Gemini API key:', current || '');
      if (k === null) return;
      const v = (k || '').trim();
      if (!v) { clearKey(); notify('🔓 API key cleared. Using funny mode.'); }
      else { saveKey(v); notify('🔐 API key saved locally.'); }
    }
  });
  keySaveBtn?.addEventListener('click', ()=>{
    const v = gemKeyModalInput?.value?.trim() || '';
    if (!v) { notify('Please paste a valid API key.'); return; }
    saveKey(v);
    notify('🔐 API key saved locally.');
    if (keyPreview) keyPreview.textContent = 'Saved key: ' + maskKey(loadKey());
    try { const inst = bootstrap.Modal.getInstance(apiKeyModalEl); inst?.hide(); } catch {}
    // After saving, try connection
    checkGeminiConnectivity();
  });
  keyClearBtn?.addEventListener('click', ()=>{
    clearKey();
    if (gemKeyModalInput) gemKeyModalInput.value = '';
    notify('🔓 API key cleared. Using funny mode.');
    if (keyPreview) keyPreview.textContent = 'Saved key: Not set';
  });

  // Initialize language selector
  if (langSelect) {
    try { langSelect.value = loadLang(); } catch {}
    langSelect.addEventListener('change', ()=>{
      const v = langSelect.value || 'hinglish';
      saveLang(v);
      notify(`Language set to: ${v}`);
    });
  }

  // Profile menu behavior (toggle + actions)
  (function setupProfileMenu(){
    const trigger = document.getElementById('pmTrigger');
    const dd = document.getElementById('pmDropdown');
    const btnEdit = document.getElementById('pmEdit');
    const btnLogout = document.getElementById('pmLogout');
    const btnView = document.getElementById('pmViewProfile');
    if (!trigger || !dd) return;
    trigger.addEventListener('click', (e)=>{ e.stopPropagation(); dd.classList.toggle('open'); });
    document.addEventListener('click', (e)=>{ if (!dd.classList.contains('open')) return; if (e.target.closest('#pmDropdown') || e.target.closest('#pmTrigger')) return; dd.classList.remove('open'); });
    btnEdit?.addEventListener('click', ()=>{ dd.classList.remove('open'); settingsBtns?.forEach(b=>b.click()); });
    btnLogout?.addEventListener('click', ()=>{ dd.classList.remove('open'); logoutBtn?.click(); });
    btnView?.addEventListener('click', ()=>{ dd.classList.remove('open'); try { document.querySelector('#profile')?.scrollIntoView({behavior:'smooth'}); } catch {} });
  })();

  settingsBtns?.forEach(btn => btn.addEventListener('click', ()=>{
    if (modalEl && window.bootstrap) {
      const inst = bootstrap.Modal.getOrCreateInstance(modalEl);
      // Initialize preview
      const existing = loadAvatar();
      if (avatarPreview) avatarPreview.src = existing || '';
      clearGridSelection();
      if (modalAvatarInput) modalAvatarInput.value = '';
      // Populate name/gender
      if (profileNameInput) profileNameInput.value = loadName();
      if (profileGenderSelect) profileGenderSelect.value = loadGender();
      inst.show();
    } else if (settingsPanel) {
      settingsPanel.style.display = settingsPanel.style.display === 'none' ? 'block' : 'none';
    }
  }));
  editProfileBtn?.addEventListener('click', ()=> settingsBtns?.forEach(btn=>btn.click()));
  saveKeyBtn?.addEventListener('click', ()=>{ saveKey(gemKeyInput.value.trim()); notify('Key saved locally.'); });
  clearKeyBtn?.addEventListener('click', ()=>{ clearKey(); gemKeyInput.value=''; notify('Key cleared.'); });
  avatarInput?.addEventListener('change', async (e)=>{
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await toDataUrl(file);
    if (url) { saveAvatar(url); notify('Avatar updated! New messages will use it.'); }
  });

  presetGrid?.addEventListener('click', (e)=>{
    const item = e.target.closest('.avatar-item');
    if (!item) return;
    const url = item.getAttribute('data-avatar-url');
    if (!url) return;
    if (avatarPreview) avatarPreview.src = url;
    if (modalAvatarInput) modalAvatarInput.value = '';
    selectGridItem(item);
  });
  modalAvatarInput?.addEventListener('change', async (e)=>{
    const file = e.target.files?.[0];
    if (!file || !avatarPreview) return;
    const url = await toDataUrl(file);
    if (url) {
      avatarPreview.src = url;
      clearGridSelection();
    }
  });
  saveAvatarBtn?.addEventListener('click', async ()=>{
    if (!avatarPreview) return;
    const src = avatarPreview.getAttribute('src') || '';
    if (!src) { notify('Please choose a preset or upload an image.'); return; }
    saveAvatar(src);
    saveName(profileNameInput?.value?.trim() || '');
    saveGender(profileGenderSelect?.value || '');
    renderProfile();
    notify('Avatar saved!');
    try {
      const inst = bootstrap.Modal.getInstance(modalEl);
      inst?.hide();
    } catch {}
  });

  function notify(text){
    addMessage('bot', `ℹ️ ${text}`);
  }

  // ====================== Chat history ======================
  const HISTORY_KEY = 'playground_chat_history_v2';
  function loadHistory(){
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
  }
  function saveHistory(list){
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list)); } catch {}
  }
  let history = loadHistory();
  function renderHistory(){
    chatLog.innerHTML = '';
    history.forEach(m => addMessage(m.who, m.text));
  }
  if (history.length) renderHistory();
  clearChatBtn?.addEventListener('click', ()=>{
    history = [];
    saveHistory(history);
    chatLog.innerHTML = '';
    renderSuggestions(true);
    notify('🧹 Chat cleared.');
  });
  regenBtn?.addEventListener('click', ()=>{
    const lastUser = [...history].reverse().find(m => m.who === 'user');
    if (!lastUser) { notify('No message to regenerate.'); return; }
    chatInput.value = lastUser.text;
    onSend();
  });

  // ====================== Suggestions ======================
  const SUGGESTIONS = [
    'Mujhe ek resume summary likh do',
    'MERN stack job interview tips?',
    'Code ko optimize kaise karu?',
    'SQL vs NoSQL — kab kaun sa?',
    'AWS pe Node app deploy guide'
  ];
  function renderSuggestions(forceShow){
    if (!suggestionsEl) return;
    const shouldShow = forceShow || chatLog.children.length === 0;
    suggestionsEl.style.display = shouldShow ? 'flex' : 'none';
    if (!shouldShow) return;
    suggestionsEl.innerHTML = '';
    SUGGESTIONS.forEach(s=>{
      const b = document.createElement('button');
      b.className = 'chip';
      b.type = 'button';
      b.textContent = s;
      b.addEventListener('click', ()=>{
        if (chatInput) chatInput.value = s;
        onSend();
      });
      suggestionsEl.appendChild(b);
    });
  }

  function addMessage(who, text){
    const wrap = document.createElement('div');
    wrap.className = `msg ${who}`;
    if (who === 'bot') {
      const head = `<div class="who">ZOOP AI</div>`;
      const botAv = loadBotAvatar();
      const botAvatarEl = botAv ? `<img src="${botAv}" alt="bot" class="avatar avatar-img"/>` : `<div class="avatar">AI</div>`;
      wrap.innerHTML = head + `<div class="msg-row">${botAvatarEl}<div class="bubble">${renderBotMessage(text)}</div></div>`;
      // Speak bot messages if enabled
      speak(text);
    } else {
      const av = loadAvatar();
      const avatarEl = av ? `<img src="${av}" alt="me" class="avatar avatar-img user"/>` : `<div class="avatar user">U</div>`;
      // Place 'You' label above the avatar on the right
      const userSide = `<div class="user-side"><div class="who-user">You</div>${avatarEl}</div>`;
      wrap.innerHTML = `<div class="msg-row me"><div class="bubble">${escapeHtml(text).replace(/\n/g,'<br/>')}</div>${userSide}</div>`;
    }
    chatLog.appendChild(wrap);
    chatLog.scrollTop = chatLog.scrollHeight;
    // persist
    history.push({ who, text, ts: Date.now() });
    saveHistory(history);
    renderSuggestions(false);
  }

  function addTyping(){
    const wrap = document.createElement('div');
    wrap.className = 'msg bot';
    wrap.innerHTML = `<div class="who">ZOOP AI</div><div class="bubble"><span class="typing"><span class="dot"></span><span class="dot"></span><span class="dot"></span></span></div>`;
    chatLog.appendChild(wrap);
    chatLog.scrollTop = chatLog.scrollHeight;
    return wrap;
  }

  // Stream simple text (no code blocks), else fallback to full render
  async function addBotStreaming(text){
    if ((text||'').includes('```')) { addMessage('bot', text); return; }
    const wrap = document.createElement('div');
    wrap.className = 'msg bot';
    const head = `<div class="who">ZOOP AI</div>`;
    const botAv = loadBotAvatar();
    const botAvatarEl = botAv ? `<img src="${botAv}" alt="bot" class="avatar avatar-img"/>` : `<div class="avatar">AI</div>`;
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    const row = document.createElement('div');
    row.className = 'msg-row';
    row.innerHTML = botAvatarEl;
    row.appendChild(bubble);
    wrap.innerHTML = head;
    wrap.appendChild(row);
    chatLog.appendChild(wrap);
    chatLog.scrollTop = chatLog.scrollHeight;
    const chars = (text||'').split('');
    for (let i=0;i<chars.length;i++){
      bubble.textContent += chars[i];
      if (i % 3 === 0) await new Promise(r=>setTimeout(r, 10));
      chatLog.scrollTop = chatLog.scrollHeight;
    }
    // After streaming, render nicely with markdown
    bubble.innerHTML = markdownToHtml(text || '');
    // persist + speak
    history.push({ who:'bot', text, ts: Date.now() });
    saveHistory(history);
    speak(text);
  }

  function renderBotMessage(text){
    // Split into fenced code blocks and markdown text segments, render appropriately
    const segments = [];
    const re = /```(\w+)?\n([\s\S]*?)```/g;
    let last = 0, m;
    while ((m = re.exec(text))) {
      const before = text.slice(last, m.index);
      if (before) segments.push({ type: 'md', content: before });
      segments.push({ type: 'code', lang: (m[1] || 'text'), code: m[2] });
      last = re.lastIndex;
    }
    const tail = text.slice(last);
    if (tail) segments.push({ type: 'md', content: tail });

    return segments.map(s => {
      if (s.type === 'code') {
        return `<div class="code-block"><div class="code-head"><span class="code-lang">${escapeHtml(s.lang)}</span><button class="btn-copy" data-copy>Copy</button></div><pre><code>${escapeHtml(s.code)}</code></pre></div>`;
      }
      return markdownToHtml(s.content);
    }).join('');
  }

  function escapeHtml(s){
    return s.replace(/[&<>"']/g, (c)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;' }[c]));
  }

  // Minimal Markdown → HTML for chat bubbles (headings, lists, emphasis, links, inline code)
  function markdownToHtml(src){
    if (!src) return '';
    // Escape first
    let text = escapeHtml(src);
    // Inline code `code`
    text = text.replace(/`([^`]+?)`/g, '<code>$1</code>');
    // Bold-italic, bold, italic (order matters)
    text = text.replace(/\*\*\*([^\*]+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    text = text.replace(/\*\*([^\*]+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*([^\*]+?)\*/g, '<em>$1</em>');
    // Links [text](url)
    text = text.replace(/\[([^\]]+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // Normalize inline star bullets like " ... * item" into a new line bullet
    // This won't touch emphasis (**bold**/***bold-italic***) because those don't have spaces around the asterisks
    text = text
      .replace(/(^|\n)[^\S\r\n]*\*\s+(?=\S)/g, '$1- ')   // star at start of line
      .replace(/(?<!\*)\s\*\s+(?=\S)/g, '\n- ')          // star after a space inside a paragraph
      .replace(/(^|\n)[^\S\r\n]*•\s+(?=\S)/g, '$1- ')    // bullet dot at line start
      .replace(/(?<!•)\s•\s+(?=\S)/g, '\n- ');           // bullet dot inline -> new line

    // Block-level parsing
    const lines = text.split('\n');
    const out = [];
    let inUl = false, inOl = false, inBlockquote = false;
    function closeLists(){
      if (inUl) { out.push('</ul>'); inUl = false; }
      if (inOl) { out.push('</ol>'); inOl = false; }
    }
    function closeQuote(){
      if (inBlockquote) { out.push('</blockquote>'); inBlockquote = false; }
    }
    for (const raw of lines){
      const line = raw.trimEnd();
      const trimmed = line.trim();
      if (!trimmed){
        closeLists(); closeQuote();
        out.push('<p></p>');
        continue;
      }
      // Headings ###### to #
      const h = trimmed.match(/^(#{1,6})\s+(.*)$/);
      if (h){
        closeLists(); closeQuote();
        const level = h[1].length;
        out.push(`<h${level}>${h[2]}</h${level}>`);
        continue;
      }
      // Blockquote
      const bq = trimmed.match(/^>\s?(.*)$/);
      if (bq){
        closeLists();
        if (!inBlockquote) { out.push('<blockquote>'); inBlockquote = true; }
        out.push(bq[1]);
        continue;
      }
      // Ordered list 1. item
      if (/^\d+[.)]\s+/.test(trimmed)){
        closeQuote();
        if (inUl) { out.push('</ul>'); inUl = false; }
        if (!inOl) { out.push('<ol>'); inOl = true; }
        out.push('<li>' + trimmed.replace(/^\d+[.)]\s+/, '') + '</li>');
        continue;
      }
      // Unordered list - item or * item
      if (/^[-*]\s+/.test(trimmed)){
        closeQuote();
        if (inOl) { out.push('</ol>'); inOl = false; }
        if (!inUl) { out.push('<ul>'); inUl = true; }
        out.push('<li>' + trimmed.replace(/^[-*]\s+/, '') + '</li>');
        continue;
      }
      // Paragraph fallback
      closeLists(); closeQuote();
      out.push('<p>' + trimmed + '</p>');
    }
    closeLists(); closeQuote();
    // Merge empty <p></p> visually with line breaks
    return out.join('').replace(/<p><\/p>/g, '<br/>');
  }

  function loadAvatar(){ return localStorage.getItem('playground_user_avatar') || ''; }
  function saveAvatar(dataUrl){ localStorage.setItem('playground_user_avatar', dataUrl); }
  function loadBotAvatar(){ return localStorage.getItem('playground_bot_avatar') || '../assets/image/ai.gif'; }
  function loadName(){ return localStorage.getItem('playground_user_name') || ''; }
  function saveName(n){ localStorage.setItem('playground_user_name', n); }
  function loadGender(){ return localStorage.getItem('playground_user_gender') || ''; }
  function saveGender(g){ localStorage.setItem('playground_user_gender', g); }
  function toDataUrl(file){
    return new Promise((resolve)=>{
      const r = new FileReader();
      r.onload = ()=> resolve(r.result);
      r.onerror = ()=> resolve('');
      r.readAsDataURL(file);
    });
  }

  function clearGridSelection(){
    document.querySelectorAll('#presetGrid .avatar-item').forEach(el=>{
      el.classList.remove('selected');
      const tick = el.querySelector('.tick');
      if (tick) tick.style.display = 'none';
    });
  }
  function selectGridItem(item){
    clearGridSelection();
    item.classList.add('selected');
    const tick = item.querySelector('.tick');
    if (tick) tick.style.display = 'flex';
  }

  function renderProfile(){
    const av = loadAvatar();
    const n = loadName();
    const g = loadGender();
    if (profileAvatar) profileAvatar.src = av || '../assets/image/sky.jpg';
    if (profileName) profileName.textContent = n || 'Guest';
    if (profileGender) profileGender.textContent = g ? g.charAt(0).toUpperCase()+g.slice(1) : '—';
    // Update menu avatars and info if present
    try {
      const pmAvatar = document.getElementById('pmAvatar');
      const pmAvatarLg = document.getElementById('pmAvatarLg');
      const pmName = document.getElementById('pmName');
      const pmMeta = document.getElementById('pmMeta');
      if (pmAvatar) pmAvatar.src = av || '../assets/image/sky.jpg';
      if (pmAvatarLg) pmAvatarLg.src = av || '../assets/image/sky.jpg';
      if (pmName) pmName.textContent = n || 'Guest';
      if (pmMeta) pmMeta.textContent = n ? (g || 'Logged in') : 'Not logged in';
    } catch {}
  }

  renderProfile();
  // At load, check connectivity with quick overlay
  checkGeminiConnectivity();
  async function checkGeminiConnectivity(){
    if (!aiLoader) return;
    showLoader('Connecting to AI…');
    const key = loadKey();
    if (!key) {
      showLoader('No API key found. Using funny mode.');
      setTimeout(hideLoader, 1200);
      return false;
    }
    try {
      // very small ping
      const res = await askGemini(key, 'ping');
      if (res) {
        showLoader('AI connected!');
        setTimeout(hideLoader, 600);
        return true;
      }
      showLoader('AI response empty. Using funny mode.');
      setTimeout(hideLoader, 1200);
      return false;
    } catch (e) {
      showLoader('AI not reachable. Using funny mode.');
      setTimeout(hideLoader, 1400);
      return false;
    }
  }
  function showLoader(msg){
    try { if (aiLoaderMsg && msg) aiLoaderMsg.textContent = msg; } catch {}
    if (aiLoader) aiLoader.classList.remove('hidden');
  }
  function hideLoader(){
    if (aiLoader) aiLoader.classList.add('hidden');
  }

  // Logout: clear cached user data and reset UI
  logoutBtn?.addEventListener('click', ()=>{
    const KEYS = [
      'gemini_api_key',
      'playground_user_avatar',
      'playground_bot_avatar',
      'playground_user_name',
      'playground_user_gender'
    ];
    KEYS.forEach(k => localStorage.removeItem(k));
    renderProfile();
    addMessage('bot', '✅ Logout complete. Cache cleared! Profile and keys have been reset.');
  });

  async function onSend(){
    const q = (chatInput.value || '').trim();
    if (!q) return;
    chatInput.value = '';
    addMessage('user', q);
    const typingEl = addTyping();
    const key = loadKey();
    if (key) {
      try {
        const ans = await askGemini(key, q);
        typingEl.remove();
        if (ans) { await addBotStreaming(ans); } else { addMessage('bot', funny(q)); }
        return;
      } catch (e) {
        typingEl.remove();
        const msg = e?.message || '';
        if (/HTTP_401|HTTP_403/i.test(msg)) {
          addMessage('bot', '❌ API key invalid ya unauthorized hai. Key button se apni Gemini key set kijiye.');
        } else if (/HTTP_404|model/i.test(msg)) {
          addMessage('bot', '⚠️ Model unavailable. Thodi der baad try karein.');
        } else if (/HTTP_429|quota|rate/i.test(msg)) {
          addMessage('bot', '⏳ Quota/rate limit hit ho gaya. Kuch time baad retry kijiye.');
        } else if (/network|failed|fetch/i.test(msg.toLowerCase())) {
          addMessage('bot', '🌐 Network issue. Internet connection check karke fir try karein.');
        } else {
          addMessage('bot', '🤖 Gemini se connect nahi ho paya. Chaliye funny mode me try karte hain!');
        }
      }
    }
    typingEl.remove();
    await addBotStreaming(funny(q));
  }

  function funny(q){
    const name = loadName();
    const gender = loadGender();
    const nick = name ? name : 'dost';
    const honor = gender === 'male' ? 'bhai' : (gender === 'female' ? 'didi' : 'yaar');
    const lang = loadLang();
    // Language-specific presets
    const sets = {
      hinglish: {
        openers: ['Arey wah, sawaal to solid tha!','Mazaa aa gaya padhke yaar!','Kya baat hai, zabardast Q!','Chai garam, dimaag ready — chalo!'],
        punch: ['Short answer: haan, but details me thoda sabr chahiye.','Answer: 42… bas context missing hai 😄','Solution mil gaya, pehle thoda samjhte hain.','Sahi track pe ho!'],
        tips: ['Pro tip: ek baar retry karo.','Secret sauce: thoda sabr + thoda jugaad.','Bonus: agar na ho to blame Wi‑Fi.','Emoji add karo, UX better लगेगा.']
      },
      hindi: {
        openers: ['वाह! आपका सवाल कमाल का है।','बहुत बढ़िया प्रश्न!','शानदार—चलिये शुरू करते हैं।','अच्छा लगा आपका सवाल पढ़कर।'],
        punch: ['संक्षेप में: हाँ, लेकिन थोड़ी जानकारी और चाहिए।','उत्तर: 42… संदर्भ ज़रूरी है 😄','समाधान मिल गया, अब समझते हैं।','आप सही दिशा में हैं!'],
        tips: ['सलाह: एक बार पुनः प्रयास करें।','धैर्य + सही तरीका = सफलता।','नेटवर्क दिक्कत हो तो बाद में कोशिश करें।','बिंदुवार लिखें—स्पष्ट रहेगा।']
      },
      english: {
        openers: ['Great question!','Love that question.','Awesome — let’s dive in.','Nice, let’s break it down.'],
        punch: ['Short answer: yes, with a few nuances.','Answer: 42… context matters 😄','Got it; let’s reason it out.','You’re on the right track!'],
        tips: ['Pro tip: try once more.','Patience + structure = clarity.','Check the network and retry.','Use bullets for clarity.']
      },
      bhojpuri: {
        openers: ['अरे वाह! सवाल त गजब बा।','बहुत बढ़िया सवाल बा।','एकदम मजेदार — चलीं सुरु करीं।','सुन के अच्छा लागल।'],
        punch: ['छोट में: हँ, बाकि थोरा बिसतर चाहीं।','जवाब: 42… बाकि संदर्भ जरूरी बा 😄','हल मिल गइल, अब समझ लीं।','रास्ता सही बा!'],
        tips: ['सलाह: एक बेर फेर ट्राई करीं।','धीरज + तरीका = सफ़लता।','नेट बिगड़ल त बाद में ट्राई करीं।','बिंदु में लिखीं—साफ़ रही।']
      },
      punjabi: {
        openers: ['वाह! वधिया सवाल।','शानदार प्रश्न!','चंगा लगा — आओ शुरू करिए।','कमाल दा सवाल।'],
        punch: ['खुलासा: हां, पर थोडे नुक्ते ने।','Answer: 42… संदर्भ जरूरी 😄','हल मिल गया, हुण समझदे आं।','तुसी सही राह ते हो!'],
        tips: ['टिप: इक वार फेर कोशिश करो।','सब्र + सही तरीका = सफलता।','नेटवर्क मसला होवे त बाद च ट्राई करो।','बुलेट्स नाल लिखो—साफ़ रहेगा।']
      }
    };
    const pack = sets[lang] || sets['hinglish'];
    const openers = pack.openers, punch = pack.punch, tips = pack.tips;
    const emojis = ['😄','🧠','✨','⚙️','🫡','😎','🫠'];
    const rand = (arr)=>arr[Math.floor(Math.random()*arr.length)];
    const qShort = q.length > 140 ? q.slice(0,140)+'...' : q;
    return `${rand(openers)} ${emojis[Math.floor(Math.random()*emojis.length)]}\n\n@${nick} ${honor}, Q: ${qShort}\nA: ${rand(punch)}\n\n${rand(tips)}`;
  }

  async function askGemini(key, prompt){
    const primaryModel = 'gemini-2.5-flash';
    const fallbackModel = 'gemini-1.5-flash-latest';
    const lang = loadLang();
    const langGuide =
      lang === 'english' ? 'Reply strictly in natural English.'
      : lang === 'hindi' ? 'Reply strictly in natural Hindi (Devanagari script).'
      : lang === 'punjabi' ? 'Reply strictly in Punjabi (Gurmukhi script where possible).'
      : lang === 'bhojpuri' ? 'Reply strictly in Bhojpuri (use Devanagari or simple phonetic).'
      : 'Reply strictly in Hinglish (Hindi+English mix using Roman Hindi + English).';
    const persona = [
      'You are a friendly, empathetic assistant.',
      'Use short paragraphs and bullet points when helpful.',
      'Summarize context briefly, then answer; end with one helpful follow-up question.',
      'If sharing code, provide exactly one fenced code block (```lang) and 1-2 concise tips.',
      langGuide
    ].join(' ');
    const profile = `User: ${loadName()||'Guest'} (${loadGender()||'unknown'}). Personalize subtly.`;
    const fullPrompt = `${persona}\n${profile}\n${prompt}`;
    const body = { contents: [{ parts: [{ text: fullPrompt }]}] };

    async function callModel(model, apiVersion){
      const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent`;
      // Debug aid
      try { console.debug('Gemini request →', url); } catch {}
      // Try axios first, then fetch as a resilient fallback
      try {
        if (window.axios) {
          const resp = await axios.post(url, body, {
            headers: { 'Content-Type': 'application/json', 'X-goog-api-key': key },
            maxBodyLength: Infinity,
            transitional: { clarifyTimeoutError: true }
          });
          const data = resp?.data;
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (text) return text.trim();
        }
      } catch (err) {
        try { console.warn('Axios Gemini error:', err?.response?.status, err?.message); } catch {}
      }
      // Fetch fallback
      const res = await fetch(url + '?key=' + encodeURIComponent(key), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        mode: 'cors',
        credentials: 'omit'
      });
      if (!res.ok) {
        const status = res.status;
        const msg = `HTTP_${status}`;
        throw new Error(msg);
      }
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return text.trim();
    }
    // Prefer v1beta first (most consumer keys support v1beta). Then try v1.
    try { return await callModel(primaryModel, 'v1'); }
    catch {
      try { return await callModel(primaryModel, 'v1'); }
      catch {
        try { return await callModel(primaryModel, 'v1'); }
        catch { return await callModel(primaryModel, 'v1'); }
      }
    }
  }

  sendBtn?.addEventListener('click', onSend);
  chatInput?.addEventListener('keydown', (e)=>{ if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } });
  chatInput?.addEventListener('input', ()=>{
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(160, chatInput.scrollHeight) + 'px';
  });
  chatLog?.addEventListener('click', async (e)=>{
    const btn = e.target.closest('[data-copy]');
    if (!btn) return;
    const pre = btn.closest('.code-block')?.querySelector('pre');
    if (!pre) return;
    const text = pre.innerText;
    try { await navigator.clipboard.writeText(text); btn.textContent = 'Copied!'; setTimeout(()=>btn.textContent='Copy', 1200); } catch { btn.textContent='Failed'; setTimeout(()=>btn.textContent='Copy', 1200); }
  });

  // greet (time-based)
  (function greet(){
    const h = new Date().getHours();
    const hi = h < 12 ? 'Good Morning' : (h < 18 ? 'Good Afternoon' : 'Good Evening');
    addMessage('bot', `${hi}! Main ZOOP AI hoon — aap ke saath human jaise baat karunga. Niche suggestions se start kar sakte ho, ya apna sawaal type karo.`);
    renderSuggestions();
  })();
})();
