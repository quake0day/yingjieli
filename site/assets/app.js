/* ==========================================================================
   Yingjie Li — Online Gallery
   Dynamic data from /api/data with static fallback baked into the file.
   ========================================================================== */

(() => {
  'use strict';

  // ============================================================
  // 0. Theme toggle (light / dark) with persistence
  // ============================================================
  const THEME_KEY = 'yl-theme';
  const root = document.documentElement;
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'dark' || stored === 'light') root.dataset.theme = stored;
  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const next = (root.dataset.theme === 'dark') ? 'light' : 'dark';
      root.dataset.theme = next;
      localStorage.setItem(THEME_KEY, next);
    });
  }

  // ============================================================
  // 1. Static fallback data (used while /api/data loads)
  // ============================================================
  const FALLBACK = {
    hero: { image: 'rowing_tea_party.jpg', title: 'Rowing Tea Party', year: 2023, num: '020' },
    bio: {
      quote: 'Painting is the way I keep <em>the small things</em> from disappearing.',
      paragraphs: [] // bio body stays static in HTML for SEO
    },
    exhibitions: [],
    contact: {
      email: 'yingjie.ly@gmail.com',
      etsy: 'https://www.etsy.com/shop/CuriousJCArt',
      gallery: 'https://www.visualexpansiongallery.com/yingjie-li'
    },
    works: [
      { num:'001', file:'Art1_2013.jpg',           title:'Moon Dancer',              year:2013, w:1763, h:2267 },
      { num:'002', file:'Art2_2014.jpg',           title:'Clock',                    year:2014, w:1275, h:1568 },
      { num:'003', file:'Art3_2014.jpg',           title:'Pig in the Forest',        year:2014, w:2465, h:1622 },
      { num:'004', file:'Art4_2015.jpg',           title:'Once Upon a Time',         year:2015, w:2183, h:1832 },
      { num:'005', file:'Art5_2016.jpg',           title:'Girl on Pig',              year:2016, w:1773, h:2255 },
      { num:'006', file:'Art6_2016.jpg',           title:'Relief',                   year:2016, w:1773, h:2255 },
      { num:'007', file:'Art7_2016.jpg',           title:'Siren',                    year:2016, w:1773, h:2255 },
      { num:'008', file:'Art8_2016.jpg',           title:'Train Is Coming to Town',  year:2016, w:2235, h:1789 },
      { num:'009', file:'Art9_2017.jpg',           title:'Magic Forest',             year:2017, w:1826, h:2190 },
      { num:'010', file:'Art10_2018.jpg',          title:'Hide and Seek',            year:2018, w:2705, h:3305 },
      { num:'011', file:'Art11_2018.jpg',          title:'Tea Party',                year:2018, w:1985, h:1655 },
      { num:'012', file:'Art12_2018.jpg',          title:'T Is for Terrific Things', year:2018, w:1939, h:2061 },
      { num:'013', file:'a_friendly_recital.jpg',  title:'A Friendly Recital',       year:2023, w:1500, h:1500, gallery:true },
      { num:'014', file:'bubble_buddies.jpg',      title:'Bubble Buddies',           year:2023, w:1500, h:1500, gallery:true },
      { num:'015', file:'bunny_in_red.jpg',        title:'Bunny in Red',             year:2023, w:1500, h:2091, gallery:true },
      { num:'016', file:'candy_wagon.jpg',         title:'Candy Wagon',              year:2023, w:1500, h:1218, gallery:true },
      { num:'017', file:'forest_magic.jpg',        title:'Forest Magic',             year:2023, w:1500, h:1192, gallery:true },
      { num:'018', file:'music_in_the_forest.jpg', title:'Music in the Forest',      year:2023, w:1500, h:1889, gallery:true },
      { num:'019', file:'pig_ride.jpg',            title:'Pig Ride',                 year:2023, w:1493, h:2031, gallery:true },
      { num:'020', file:'rowing_tea_party.jpg',    title:'Rowing Tea Party',         year:2023, w:1438, h:1841, gallery:true },
      { num:'021', file:'rowing_with_a_friend.jpg',title:'Rowing With a Friend',     year:2023, w:1500, h:1920, gallery:true },
      { num:'022', file:'sweet_dreams.jpg',        title:'Sweet Dreams',             year:2023, w:1500, h:2093, gallery:true },
      { num:'023', file:'here_have_a_sip.jpg',     title:'Here, Have a Sip',         year:2024, w:1968, h:1545, gallery:true }
    ]
  };

  let data = FALLBACK;
  let works = data.works;

  // ============================================================
  // 2. Helpers
  // ============================================================
  function imgUrl(file) {
    if (!file) return '';
    if (file.startsWith('http') || file.startsWith('/')) return file;
    return '/images/' + file;  // bare name = built-in artwork
  }
  function romanize(num) {
    const map = [['M',1000],['CM',900],['D',500],['CD',400],['C',100],['XC',90],['L',50],['XL',40],['X',10],['IX',9],['V',5],['IV',4],['I',1]];
    let r = '';
    for (const [l, v] of map) while (num >= v) { r += l; num -= v; }
    return r;
  }
  function escapeHtml(s) { return String(s ?? '').replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'})[c]); }
  function escapeAttr(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]); }

  // ============================================================
  // 3. IntersectionObserver for reveals
  // ============================================================
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  // ============================================================
  // 4. Lightbox
  // ============================================================
  const lb       = document.getElementById('lightbox');
  const lbImg    = lb.querySelector('.lb-image');
  const lbNum    = lb.querySelector('.lb-num');
  const lbTitle  = lb.querySelector('.lb-title');
  const lbYear   = lb.querySelector('.lb-year');
  const lbClose  = lb.querySelector('.lb-close');
  const lbPrev   = lb.querySelector('.lb-prev');
  const lbNext   = lb.querySelector('.lb-next');

  let workEls = [];
  let currentIndex = 0;
  let visibleWorks = [];

  function getVisible() {
    return workEls
      .map((el, i) => ({ el, i }))
      .filter(({ el }) => !el.classList.contains('is-hidden'))
      .map(({ i }) => i);
  }
  function openLightbox(idx) {
    visibleWorks = getVisible();
    if (visibleWorks.length === 0) return;
    if (!visibleWorks.includes(idx)) idx = visibleWorks[0];
    currentIndex = idx;
    updateLightbox();
    lb.classList.add('is-open');
    lb.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function closeLightbox() {
    lb.classList.remove('is-open');
    lb.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  function updateLightbox() {
    const w = works[currentIndex];
    if (!w) return;
    lbImg.src = imgUrl(w.file);
    lbImg.alt = `${w.title}, ${w.year}, by Yingjie Li`;
    lbNum.textContent = `N° ${w.num}`;
    lbTitle.innerHTML = `<em>${escapeHtml(w.title)}</em>`;
    lbYear.textContent = `${romanize(w.year)} · ${w.year}`;
    const vi = visibleWorks.indexOf(currentIndex);
    [-1, 1].forEach(d => {
      const next = visibleWorks[(vi + d + visibleWorks.length) % visibleWorks.length];
      if (next !== undefined && works[next]) {
        const img = new Image();
        img.src = imgUrl(works[next].file);
      }
    });
  }
  function navigate(dir) {
    const vi = visibleWorks.indexOf(currentIndex);
    const ni = (vi + dir + visibleWorks.length) % visibleWorks.length;
    currentIndex = visibleWorks[ni];
    updateLightbox();
  }
  lbClose.addEventListener('click', closeLightbox);
  lbPrev.addEventListener('click', () => navigate(-1));
  lbNext.addEventListener('click', () => navigate(1));
  lb.addEventListener('click', (e) => { if (e.target === lb) closeLightbox(); });
  document.addEventListener('keydown', (e) => {
    if (!lb.classList.contains('is-open')) return;
    if (e.key === 'Escape')     closeLightbox();
    if (e.key === 'ArrowLeft')  navigate(-1);
    if (e.key === 'ArrowRight') navigate(1);
  });
  let touchStartX = null;
  lb.addEventListener('touchstart', (e) => { touchStartX = e.changedTouches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend',   (e) => {
    if (touchStartX === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) navigate(dx < 0 ? 1 : -1);
    touchStartX = null;
  }, { passive: true });

  // ============================================================
  // 5. Render gallery
  // ============================================================
  const galleryEl = document.getElementById('gallery');
  function renderGallery() {
    galleryEl.innerHTML = '';
    works.forEach((w, i) => {
      const fig = document.createElement('figure');
      fig.className = 'work';
      fig.dataset.year = w.year;
      fig.dataset.index = i;
      fig.style.transitionDelay = `${(i % 3) * 80}ms`;
      const badge = w.gallery
        ? `<span class="wm-gallery" title="Currently on view at Visual Expansion Gallery">On view</span>`
        : '';
      fig.innerHTML = `
        <div class="work-frame">
          <img src="${imgUrl(w.file)}"
               alt="${escapeAttr(w.title)}, ${w.year}, by Yingjie Li"
               loading="lazy" decoding="async"${w.w && w.h ? ` width="${w.w}" height="${w.h}"` : ''} />
        </div>
        <figcaption class="work-meta">
          <span class="wm-num">N° ${escapeHtml(w.num)}${badge}</span>
          <span class="wm-title"><em>${escapeHtml(w.title)}</em></span>
          <span class="wm-year">${romanize(w.year)}</span>
        </figcaption>`;
      galleryEl.appendChild(fig);
    });
    workEls = Array.from(galleryEl.querySelectorAll('.work'));
    workEls.forEach((el, i) => el.addEventListener('click', () => openLightbox(i)));
    workEls.forEach(el => io.observe(el));
    applyActiveFilter();
  }
  renderGallery();

  // ============================================================
  // 6. Year filter
  // ============================================================
  let activeYear = 'all';
  function applyActiveFilter() {
    workEls.forEach(el => {
      const y = activeYear;
      let m;
      if (y === 'all')         m = true;
      else if (y === 'recent') m = parseInt(el.dataset.year, 10) >= 2023;
      else                     m = el.dataset.year === y;
      el.classList.toggle('is-hidden', !m);
    });
  }
  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip').forEach(c => {
        c.classList.toggle('is-active', c === chip);
        c.setAttribute('aria-selected', c === chip ? 'true' : 'false');
      });
      activeYear = chip.dataset.year;
      applyActiveFilter();
    });
  });

  // ============================================================
  // 7. Sticky header treatment
  // ============================================================
  const header = document.querySelector('.site-header');
  function onScroll() { header.classList.toggle('is-scrolled', window.scrollY > 24); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ============================================================
  // 8. Render hero (pulled from data.hero)
  // ============================================================
  const heroBgImg     = document.querySelector('.hero-bg img');
  const heroPreloadEl = document.querySelector('link[rel="preload"][as="image"]');
  const heroNumEl     = document.querySelector('.ha-num');
  const heroTitleEl   = document.querySelector('.ha-title');
  function renderHero() {
    const h = data.hero;
    if (!h) return;
    const url = imgUrl(h.file || h.image);
    if (heroBgImg && heroBgImg.getAttribute('src') !== url) heroBgImg.src = url;
    if (heroPreloadEl) heroPreloadEl.href = url;
    if (heroNumEl)   heroNumEl.textContent = 'N° ' + (h.num || '—');
    if (heroTitleEl) heroTitleEl.innerHTML = `<em>${escapeHtml(h.title || '')}</em>${h.year ? ', ' + h.year : ''}`;
  }
  renderHero();

  // ============================================================
  // 9. Render bio (paragraphs + quote)
  // ============================================================
  function renderBio() {
    const bio = data.bio || {};
    const quoteEl = document.querySelector('.aside-quote');
    if (quoteEl && bio.quote) {
      quoteEl.innerHTML = `<span class="quote-mark" aria-hidden="true">“</span>${bio.quote}`;
    }
    const bodyEl = document.querySelector('.bio-body');
    if (bodyEl && Array.isArray(bio.paragraphs) && bio.paragraphs.length) {
      const cta = bodyEl.querySelector('.bio-aside-cta');
      // Replace paragraphs but keep the trailing CTA paragraph
      [...bodyEl.querySelectorAll('p:not(.bio-aside-cta)')].forEach(p => p.remove());
      bio.paragraphs.forEach((html, idx) => {
        const p = document.createElement('p');
        if (idx === 0) p.classList.add('lead');
        p.innerHTML = (idx === 0 ? `<span class="dropcap">${(html.replace(/<[^>]+>/g,'').trim()[0] || '')}</span>` + stripFirstChar(html) : html);
        bodyEl.insertBefore(p, cta || null);
      });
    }
  }
  function stripFirstChar(html) {
    // Remove the first visible character (we put it in dropcap)
    let i = 0;
    while (i < html.length) {
      if (html[i] === '<') {
        const close = html.indexOf('>', i);
        if (close === -1) break;
        i = close + 1;
      } else if (/\s/.test(html[i])) {
        i++;
      } else {
        return html.slice(0, i) + html.slice(i + 1);
      }
    }
    return html;
  }
  renderBio();

  // ============================================================
  // 10. Render exhibitions
  // ============================================================
  function renderExhibitions() {
    const list = document.querySelector('.exhib-list');
    if (!list || !Array.isArray(data.exhibitions) || data.exhibitions.length === 0) return;
    list.innerHTML = '';
    data.exhibitions.forEach((ex, i) => {
      const li = document.createElement('li');
      li.className = 'exhib-item';
      const num = String(i + 1).padStart(2, '0');
      const nameHtml = ex.url
        ? `<a href="${escapeAttr(ex.url)}" target="_blank" rel="noopener">${escapeHtml(ex.name)} <span class="link-arrow">↗</span></a>`
        : escapeHtml(ex.name);
      li.innerHTML = `
        <span class="ex-marker">${num}</span>
        <div class="ex-content">
          <h3 class="ex-name">${nameHtml}</h3>
          <p class="ex-meta">${escapeHtml(ex.location || '')}</p>
        </div>
        <span class="ex-rule" aria-hidden="true"></span>`;
      list.appendChild(li);
    });
  }
  renderExhibitions();

  // ============================================================
  // 11. Render contact links
  // ============================================================
  function renderContact() {
    const c = data.contact || {};
    const sel = (s) => document.querySelectorAll(s);
    if (c.email) {
      sel('a[href^="mailto:"]').forEach(a => {
        a.href = 'mailto:' + c.email;
        const v = a.querySelector('.cc-value');
        if (v) v.textContent = c.email;
      });
    }
    if (c.etsy) {
      sel('a[href*="etsy.com"]').forEach(a => a.href = c.etsy);
    }
    if (c.gallery) {
      sel('a[href*="visualexpansiongallery"]').forEach(a => a.href = c.gallery);
    }
  }
  renderContact();

  // ============================================================
  // 12. Fetch live data and re-render if it differs
  // ============================================================
  fetch('/api/data', { credentials: 'same-origin' })
    .then(r => r.ok ? r.json() : null)
    .then(remote => {
      if (!remote || typeof remote !== 'object') return;
      data = remote;
      works = remote.works || works;
      // Re-render everything
      renderHero();
      renderBio();
      renderExhibitions();
      renderContact();
      renderGallery();
    })
    .catch(() => { /* fallback already rendered */ });

})();
