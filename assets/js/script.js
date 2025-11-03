// Theme toggle and small UX behaviors
(function () {
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
      const url = cvBtn.getAttribute('href');
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
            window.open(url, '_blank');
          }
        });
      } else {
        if (confirm('Download CV?')) {
          window.open(url, '_blank');
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
      const url = cvBtnModal.getAttribute('href');
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
            window.open(url, '_blank');
          }
        });
      } else {
        if (confirm('Download CV?')) window.open(url, '_blank');
      }
    });
  }

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
})();


