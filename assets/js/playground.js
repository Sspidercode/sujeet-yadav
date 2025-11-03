(function(){
  const chatLog = document.getElementById('chatLog');
  const chatInput = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendBtn');
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

  function loadKey(){ return localStorage.getItem('gemini_api_key') || 'AIzaSyAugCGYlkFy-16ggbiT-Num7ddyCaqUbWg'; }
  function saveKey(k){ localStorage.setItem('gemini_api_key', k); }
  function clearKey(){ localStorage.removeItem('gemini_api_key'); }

  if (gemKeyInput) gemKeyInput.value = loadKey();

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

  function addMessage(who, text){
    const wrap = document.createElement('div');
    wrap.className = `msg ${who}`;
    if (who === 'bot') {
      const head = `<div class="who">ZOOP AI</div>`;
      const botAv = loadBotAvatar();
      const botAvatarEl = botAv ? `<img src="${botAv}" alt="bot" class="avatar avatar-img"/>` : `<div class="avatar">AI</div>`;
      wrap.innerHTML = head + `<div class="msg-row">${botAvatarEl}<div class="bubble">${renderBotMessage(text)}</div></div>`;
    } else {
      const av = loadAvatar();
      const avatarEl = av ? `<img src="${av}" alt="me" class="avatar avatar-img user"/>` : `<div class="avatar user">U</div>`;
      // Place 'You' label above the avatar on the right
      const userSide = `<div class="user-side"><div class="who-user">You</div>${avatarEl}</div>`;
      wrap.innerHTML = `<div class="msg-row me"><div class="bubble">${escapeHtml(text).replace(/\n/g,'<br/>')}</div>${userSide}</div>`;
    }
    chatLog.appendChild(wrap);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  function addTyping(){
    const wrap = document.createElement('div');
    wrap.className = 'msg bot';
    wrap.innerHTML = `<div class="who">ZOOP AI</div><div class="bubble"><span class="typing"><span class="dot"></span><span class="dot"></span><span class="dot"></span></span></div>`;
    chatLog.appendChild(wrap);
    chatLog.scrollTop = chatLog.scrollHeight;
    return wrap;
  }

  function renderBotMessage(text){
    const parts = [];
    const re = /```(\w+)?\n([\s\S]*?)```/g;
    let last = 0, m;
    while ((m = re.exec(text))){
      const before = text.slice(last, m.index);
      if (before) parts.push({ type:'text', content: before });
      parts.push({ type:'code', lang: (m[1]||'text'), code: m[2] });
      last = re.lastIndex;
    }
    const after = text.slice(last);
    if (after) parts.push({ type:'text', content: after });
    return parts.map(p => p.type === 'text'
      ? escapeHtml(p.content).replace(/\n/g,'<br/>')
      : `<div class="code-block"><div class=\"code-head\"><span class=\"code-lang\">${escapeHtml(p.lang)}</span><button class=\"btn-copy\" data-copy>Copy</button></div><pre><code>${escapeHtml(p.code)}</code></pre></div>`
    ).join('');
  }

  function escapeHtml(s){
    return s.replace(/[&<>"']/g, (c)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;' }[c]));
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
  }

  renderProfile();

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
        addMessage('bot', ans || funny(q));
        return;
      } catch (e) {
        typingEl.remove();
        addMessage('bot', '🤖 Gemini se connect nahi ho paya. Chaliye funny mode me try karte hain!');
      }
    }
    typingEl.remove();
    addMessage('bot', funny(q));
  }

  function funny(q){
    const name = loadName();
    const gender = loadGender();
    const nick = name ? name : 'dost';
    const honor = gender === 'male' ? 'bhai' : (gender === 'female' ? 'didi' : 'yaar');
    const openers = [
      'Arey wah, sawaal to solid tha!','Mazaa aa gaya padhke yaar!','Kya baat hai, legendary sawaal!','Chai garam, dimaag thanda… chalo shuru karte!']
    const punch = [
      'Short answer: haan, but details me thoda sabr chahiye.','Answer: 42… bas context missing hai 😄','Solution mil gaya, par pehle pani-puri break?','Aap genius ho ya main overthink kar raha hoon?']
    const tips = [
      'Pro tip: ek baar retry karo, kaam ho jayega.','Secret sauce: thoda sabr + thoda jugaad.','Bonus: agar na ho to blame Wi‑Fi.','Emoji daalo, UX 73% better lagta hai.']
    const emojis = ['😄','🧠','✨','⚙️','🫡','😎','🫠'];
    const rand = (arr)=>arr[Math.floor(Math.random()*arr.length)];
    const qShort = q.length > 140 ? q.slice(0,140)+'...' : q;
    return `${rand(openers)} ${emojis[Math.floor(Math.random()*emojis.length)]}\n\n@${nick} ${honor}, Q: ${qShort}\nA: ${rand(punch)}\n\n${rand(tips)}`;
  }

  async function askGemini(key, prompt){
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
    const style = 'Tum ek witty assistant ho. Hamesha Hinglish (Hindi+English mix) me funny tone me reply karo. Agar user code maange to ek single fenced code block (```lang) ke saath answer do, aur short Hinglish explanation bhi.';
    const profile = `User Profile -> Name: ${loadName()||'Guest'}, Gender: ${loadGender()||'unknown'}. In responses, subtly personalize using user name/gender.`;
    const body = { contents: [{ parts: [{ text: style }, { text: profile }, { text: prompt }]}] };
    // Prefer axios if available (header-based key), else fetch fallback
    if (window.axios) {
      const resp = await axios.post(url, body, {
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': key
        },
        maxBodyLength: Infinity
      });
      const data = resp?.data;
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return text.trim();
    } else {
      const res = await fetch(url + '?key=' + encodeURIComponent(key), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error('Bad response');
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return text.trim();
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

  // greet
  addMessage('bot', 'Namaste! Main ZOOP AI hoon — funny Hinglish mode me. Sawaal puchho, agar code chahiye to main code block + copy option ke saath dunga.');
})();
