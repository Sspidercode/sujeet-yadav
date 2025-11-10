// Theme toggle and small UX behaviors
(function () {
  async function triggerDownload(url){
    try {
      const abs = new URL(url, location.href).href;
      // Try fetching and downloading via blob (more reliable on mobile)
      try {
        const res = await fetch(abs, { credentials: 'same-origin' });
        if (res.ok) {
          const ab = await res.arrayBuffer();
          // Force generic binary type to avoid inline PDF viewers
          const blob = new Blob([ab], { type: 'application/octet-stream' });
          const objectUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = objectUrl;
          const name = abs.split('/').pop() || 'download';
          a.setAttribute('download', name);
          a.style.display = 'none';
          a.target = '_self';
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(()=>URL.revokeObjectURL(objectUrl), 1500);
          return;
        }
      } catch (_) {
        // fall through to direct anchor download
      }
      const a = document.createElement('a');
      a.href = abs;
      const name = abs.split('/').pop() || 'download';
      a.setAttribute('download', name);
      a.style.display = 'none';
      a.target = '_self';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (_) {
      // Final fallback
      window.location.href = url;
    }
  }

  const themeToggleButton = document.getElementById('themeToggle');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const saved = localStorage.getItem('pref-theme');

  function applyTheme(theme) {
    document.body.classList.toggle('theme-dark', theme === 'dark');
    const icon = themeToggleButton?.querySelector('i');
    if (icon) {
      icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    }
  }

  const initial = saved || (prefersDark ? 'dark' : 'dark');
  applyTheme(initial);

  themeToggleButton?.addEventListener('click', () => {
    const next = document.body.classList.contains('theme-dark') ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('pref-theme', next);
  });

  // Active nav link on scroll
  const sections = Array.from(document.querySelectorAll('section, header.section-hero'));
  const navLinks = Array.from(document.querySelectorAll('.navbar .nav-link'));

  function setActiveLink() {
    const y = window.scrollY + 120;
    let id = 'home';
    for (const sec of sections) {
      const top = sec.offsetTop;
      if (y >= top) id = sec.id || 'home';
    }
    navLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === `#${id}`));
  }
  window.addEventListener('scroll', setActiveLink);
  setActiveLink();

  // Smooth scroll for nav links (Bootstrap doesn't include by default)
  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href');
      if (targetId?.startsWith('#')) {
        e.preventDefault();
        document.querySelector(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.replaceState(null, '', targetId);
      }
    });
  });

  // Footer year
  const yearLabel = document.getElementById('year');
  if (yearLabel) yearLabel.textContent = new Date().getFullYear().toString();

  // Download CV confirmation (SweetAlert2 fallback to confirm)
  const cvBtn = document.getElementById('downloadCvBtn');
  if (cvBtn) {
    cvBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const url = cvBtn.getAttribute('data-file') || cvBtn.getAttribute('href') || './assets/image/Sujeetyadav.pdf';
      if (!url) return;

      if (window.Swal) {
        Swal.fire({
          title: 'Download CV?',
          html: '<p style="margin:4px 0 0;color:#8ea0c6">Thanks for your interest!<br/>Shukriya dekhne ke liye. Resume download karein?</p>',
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Download',
          cancelButtonText: 'Cancel',
          confirmButtonColor: '#ff1e56',
          background: '#0f1118',
          color: '#e6ecff'
        }).then((res) => {
          if (res.isConfirmed) {
            triggerDownload(url);
          }
        });
      } else {
        if (confirm('Download CV?')) {
          triggerDownload(url);
        }
      }
    });
  }

  // 70% scroll modal trigger
  const scrollModalEl = document.getElementById('funnyScrollModal');
  function getScrollPercent() {
    const doc = document.documentElement;
    const scrollTop = doc.scrollTop || document.body.scrollTop || 0;
    const scrollHeight = (doc.scrollHeight - doc.clientHeight) || 1;
    return (scrollTop / scrollHeight) * 100;
  }

  function maybeOpenScrollModal() {
    if (!scrollModalEl) return;
    if (sessionStorage.getItem('scrollModalShown') === '1') {
      window.removeEventListener('scroll', maybeOpenScrollModal);
      return;
    }
    const pct = getScrollPercent();
    if (pct >= 70) {
      try {
        const modal = new bootstrap.Modal(scrollModalEl);
        modal.show();
      } catch (e) {
        // no-op if bootstrap missing
      }
      sessionStorage.setItem('scrollModalShown', '1');
      window.removeEventListener('scroll', maybeOpenScrollModal);
    }
  }
  window.addEventListener('scroll', maybeOpenScrollModal);
  // Check immediately in case the page is loaded part-way down
  maybeOpenScrollModal();

  // Modal form submit handling
  const contactModalForm = document.getElementById('contactModalForm');
  if (contactModalForm) {
    contactModalForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const closeModal = () => {
        try {
          const inst = bootstrap.Modal.getInstance(scrollModalEl) || new bootstrap.Modal(scrollModalEl);
          inst.hide();
        } catch (_) {}
      };
      if (window.Swal) {
        Swal.fire({
          title: 'Message Sent! ✅',
          html: '<p style="margin:4px 0 0;color:#8ea0c6">Thanks for reaching out. I\'ll get back to you shortly!</p>',
          icon: 'success',
          confirmButtonColor: '#ff1e56',
          background: '#0f1118',
          color: '#e6ecff'
        });
      } else {
        alert('Thanks! I\'ll get back to you shortly.');
      }
      contactModalForm.reset();
      closeModal();
    });
  }

  // Bind Download CV inside modal with confirmation UX
  const cvBtnModal = document.getElementById('downloadCvBtnModal');
  if (cvBtnModal) {
    cvBtnModal.addEventListener('click', (e) => {
      e.preventDefault();
      const url = cvBtnModal.getAttribute('data-file') || cvBtnModal.getAttribute('href') || './assets/image/Sujeetyadav.pdf';
      if (!url) return;
      if (window.Swal) {
        Swal.fire({
          title: 'Download CV?',
          html: '<p style="margin:4px 0 0;color:#8ea0c6">Great choice! Ready to download my CV?</p>',
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Download',
          cancelButtonText: 'Cancel',
          confirmButtonColor: '#ff1e56',
          background: '#0f1118',
          color: '#e6ecff'
        }).then((res) => {
          if (res.isConfirmed) {
            triggerDownload(url);
          }
        });
      } else {
        if (confirm('Download CV?')) { triggerDownload(url); }
      }
    });
  }

  // Global ZOOP AI floating button (hide on playground route)
  (function mountZoopFab(){
    const isPlayground = /\/playground\/?/.test(location.pathname);
    if (isPlayground) return;
    // Resolve icon path relative to current page depth
    const path = location.pathname || '/';
    const segs = path.split('/').filter(Boolean);
    const endsWithFile = segs.length && /\.[a-zA-Z0-9]+$/.test(segs[segs.length - 1]);
    const dirDepth = Math.max(0, segs.length - (endsWithFile ? 1 : 0));
    const prefix = dirDepth === 0 ? '' : '../'.repeat(dirDepth);
    const iconSrc = '/home/clavis/Documents/SspiderCode/sky_cv/assets/image/ai.gif';
    const fab = document.createElement('button');
    fab.type = 'button';
    fab.className = 'zoop-fab';
    fab.title = 'Chat with ZOOP AI';
    fab.innerHTML = '<span class="zf-ring"></span><img alt="ZOOP AI" class="zoop-fab-img" />';
    try { fab.querySelector('.zoop-fab-img').src = iconSrc; } catch {}
    fab.addEventListener('click', ()=>{
      // Redirect to hosted Playground (GitHub Pages)
      window.location.href = 'https://sspidercode.github.io/sujeet-yadav/playground';
    });
    document.body.appendChild(fab);
  })();

  // Fog effect: follow cursor across the page
  (function setupFogEffect() {
    const bodyEl = document.body;
    let fadeTimeout;
    function setFog(x, y, opacity) {
      bodyEl.style.setProperty('--mx', x + 'px');
      bodyEl.style.setProperty('--my', y + 'px');
      if (typeof opacity === 'number') bodyEl.style.setProperty('--fog-opacity', String(opacity));
    }
    window.addEventListener('mousemove', (e) => {
      setFog(e.clientX, e.clientY, 1);
      clearTimeout(fadeTimeout);
      fadeTimeout = setTimeout(() => {
        bodyEl.style.setProperty('--fog-opacity', '0.75');
      }, 100);
    }, { passive: true });
    window.addEventListener('mouseleave', () => {
      bodyEl.style.setProperty('--fog-opacity', '0');
    });
  })();

  // Footer contacts inside footer disabled per request (use left fixed buttons instead)

  // Left fixed Call + WhatsApp buttons (like chatbot fab, but on left)
  (function mountLeftFabs(){
    if (document.getElementById('leftFabs')) return;
    const container = document.createElement('div');
    container.id = 'leftFabs';
    container.className = 'left-fabs';
    const phoneBtn = document.createElement('a');
    phoneBtn.className = 'left-fab fab-phone';
    phoneBtn.href = 'tel:+917275537561';
    phoneBtn.title = 'Call +91 7275537561';
    phoneBtn.innerHTML = '<span class="zf-ring"></span><i class="fa-solid fa-phone"></i>';
    const waMsg = encodeURIComponent('Namaste Sujeet! Mujhe aapse baat karni hai 😊');
    const waBtn = document.createElement('a');
    waBtn.className = 'left-fab fab-wa';
    waBtn.href = `https://wa.me/917275537561?text=${waMsg}`;
    waBtn.target = '_blank';
    waBtn.rel = 'noopener';
    waBtn.title = 'WhatsApp';
    waBtn.innerHTML = '<span class="zf-ring"></span><i class="fa-brands fa-whatsapp"></i>';
    container.appendChild(phoneBtn);
    container.appendChild(waBtn);
    document.body.appendChild(container);
  })();
})();


