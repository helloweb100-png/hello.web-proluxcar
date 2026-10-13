/* Generado por landing-bigtech-premium · configuración del sitio */
const SITE = {
  "loader": {
    "duration": 2300
  },
  "smooth": true,
  "wa": {
    "number": "529541833072",
    "greeting": "Hola Proluxcar, quiero recibir el catálogo con precios de mayoreo."
  },
  "labels": {
    "opening": "Abriendo WhatsApp…"
  }
};

/* ==========================================================================
   LANDING PREMIUM · motor de animación (vanilla JS, sin dependencias)
   Lee la constante global SITE (la inyecta build.py arriba de este archivo).
   Módulos: loader · header · smooth scroll · split-text · reveal · parallax
            spotlight/tilt · magnético · contadores · proceso · hero fx
            cursor · progreso · formulario → WhatsApp · botón flotante
   Todo respeta prefers-reduced-motion y pausa lo que no se ve (rendimiento).
   ========================================================================== */
(() => {
  'use strict';

  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const cfg = (typeof SITE !== 'undefined' && SITE) || {};

  /* ---------- 1 · Loader ------------------------------------------------- */
  function runLoader() {
    const el = $('#loader');
    return new Promise((resolve) => {
      if (!el || reduce) { el && el.remove(); root.classList.remove('is-loading'); return resolve(); }
      const dur = (cfg.loader && cfg.loader.duration) || 1900;
      const pct = $('#loaderPct');
      const t0 = performance.now();
      let ready = document.readyState === 'complete';
      if (!ready) addEventListener('load', () => (ready = true), { once: true });
      setTimeout(() => (ready = true), 4500);          // nunca esperes más de 4.5 s por imágenes lentas
      let p = 0;
      const tick = (now) => {
        const t = clamp((now - t0) / dur, 0, 1);
        let v = 1 - Math.pow(1 - t, 3);                  // easeOutCubic
        if (!ready) v = Math.min(v, 0.94);               // espera la carga real antes de llegar a 100
        p = Math.max(p, v);
        el.style.setProperty('--p', p.toFixed(3));
        if (pct) pct.textContent = Math.round(p * 100);
        if (p >= 1) return finish();
        requestAnimationFrame(tick);
      };
      const finish = () => {
        el.classList.add('is-done');
        root.classList.remove('is-loading');
        setTimeout(resolve, 520);                        // el hero entra mientras se abren las cortinas
        setTimeout(() => el.remove(), 1700);
      };
      requestAnimationFrame(tick);
    });
  }

  /* ---------- 2 · Header y menú móvil ------------------------------------ */
  function header() {
    const h = $('.site-header');
    const burger = $('.burger');
    const nav = $('#menu');
    const onScroll = () => h && h.classList.toggle('is-scrolled', scrollY > 24);
    addEventListener('scroll', onScroll, { passive: true }); onScroll();
    if (!burger || !nav) return;
    const set = (open) => {
      burger.setAttribute('aria-expanded', open);
      burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      nav.classList.toggle('is-open', open);
      root.classList.toggle('menu-open', open);
    };
    burger.addEventListener('click', () => set(burger.getAttribute('aria-expanded') !== 'true'));
    nav.addEventListener('click', (e) => e.target.closest('a') && set(false));
    addEventListener('keydown', (e) => { if (e.key === 'Escape') { set(false); burger.focus(); } });
    matchMedia('(min-width: 960px)').addEventListener('change', (e) => e.matches && set(false));
    // enlace activo según la sección visible
    const links = $$('a[href^="#"]', nav).filter((a) => a.getAttribute('href').length > 1);
    const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    const io = new IntersectionObserver((es) => es.forEach((en) => {
      if (!en.isIntersecting) return;
      links.forEach((a) => a.removeAttribute('aria-current'));
      const a = map.get(en.target.id); a && a.setAttribute('aria-current', 'true');
    }), { rootMargin: '-45% 0px -50% 0px' });
    map.forEach((_, id) => { const s = document.getElementById(id); s && io.observe(s); });
  }

  /* ---------- 3 · Scroll suave "slow motion" + anclas -------------------- */
  let scrollToY = (y) => scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
  function smoothScroll() {
    if (reduce || !fine || cfg.smooth === false) return;
    root.style.scrollBehavior = 'auto';
    let target = scrollY, current = scrollY, running = false;
    const max = () => document.documentElement.scrollHeight - innerHeight;
    const loop = () => {
      current = lerp(current, target, 0.075);            // 0.075 = inercia suave y lenta
      if (Math.abs(target - current) < 0.4) { current = target; running = false; }
      scrollTo({ top: current, behavior: 'instant' });
      if (running) requestAnimationFrame(loop);
    };
    const kick = () => { if (!running) { running = true; requestAnimationFrame(loop); } };
    const insideScrollable = (el) => {
      for (; el && el !== document.body; el = el.parentElement) {
        const o = getComputedStyle(el).overflowY;
        if ((o === 'auto' || o === 'scroll') && el.scrollHeight > el.clientHeight) return true;
      }
      return false;
    };
    addEventListener('wheel', (e) => {
      if (e.ctrlKey || e.defaultPrevented || insideScrollable(e.target)) return;
      e.preventDefault();
      if (!running) target = current = scrollY;
      target = clamp(target + e.deltaY * (e.deltaMode === 1 ? 34 : 1) * 0.9, 0, max());
      kick();
    }, { passive: false });
    // teclado, barra de scroll o gestos: soltamos el control y re-sincronizamos
    const release = () => { running = false; target = current = scrollY; };
    ['keydown', 'mousedown', 'touchstart'].forEach((ev) => addEventListener(ev, release, { passive: true }));
    addEventListener('scroll', () => { if (!running) target = current = scrollY; }, { passive: true });
    scrollToY = (y) => { target = clamp(y, 0, max()); current = scrollY; kick(); };
  }
  function anchors() {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a || a.getAttribute('href').length < 2) return;
      const dest = document.getElementById(a.getAttribute('href').slice(1));
      if (!dest) return;
      e.preventDefault();
      const hh = parseFloat(getComputedStyle(root).getPropertyValue('--header-h')) * 16 || 72;
      scrollToY(dest.getBoundingClientRect().top + scrollY - hh + 1);
      history.replaceState(null, '', a.getAttribute('href'));
    });
  }

  /* ---------- 4 · Titular partido por palabras --------------------------- */
  function splitHero() {
    const h = $('[data-split]');
    if (!h) return;
    let i = 0;
    const walk = (node, grad) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((tok) => {
            if (!tok) return;
            if (/^\s+$/.test(tok)) return frag.appendChild(document.createTextNode(' '));
            const w = document.createElement('span'); w.className = 'w';
            const s = document.createElement('span'); s.className = 'wi' + (grad ? ' grad-w' : '');
            s.style.setProperty('--i', i++); s.textContent = tok;
            w.appendChild(s); frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) {
          const isGrad = n.classList.contains('grad');
          if (isGrad) n.classList.remove('grad');         // el degradado pasa a cada palabra
          walk(n, grad || isGrad);
        }
      });
    };
    walk(h, false);
  }

  /* ---------- 5 · Reveal al hacer scroll ---------------------------------- */
  function reveal() {
    $$('[data-stagger]').forEach((p) =>
      $$(':scope > [data-reveal]', p).forEach((c, i) => c.style.setProperty('--d', (i * 0.09).toFixed(2) + 's')));
    const items = $$('[data-reveal]');
    if (reduce || !('IntersectionObserver' in window)) return items.forEach((n) => n.classList.add('is-in'));
    const io = new IntersectionObserver((es) => es.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
    }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    items.forEach((n) => io.observe(n));
  }

  /* ---------- 6 · Efectos ligados al scroll (parallax, proceso, progreso) -- */
  function scrollFx() {
    const par = $$('[data-parallax]');
    const steps = $$('.steps');
    const bar = $('.progress');
    let ticking = false;
    const update = () => {
      ticking = false;
      const vh = innerHeight;
      if (bar) bar.style.setProperty('--sp', (scrollY / Math.max(1, document.documentElement.scrollHeight - vh)).toFixed(4));
      par.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) return;
        const d = (r.top + r.height / 2 - vh / 2) * parseFloat(el.dataset.parallax || 0.1);
        el.style.transform = `translate3d(0,${(-d).toFixed(1)}px,0)`;
      });
      steps.forEach((s) => {
        const r = s.getBoundingClientRect();
        s.style.setProperty('--p', clamp((vh * 0.62 - r.top) / Math.max(1, r.height), 0, 1).toFixed(3));
      });
    };
    const req = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    addEventListener('scroll', req, { passive: true });
    addEventListener('resize', req);
    update();
  }

  /* ---------- 7 · Spotlight + tilt 3D + botones magnéticos ---------------- */
  function pointerFx() {
    if (!fine || reduce) return;
    $$('.card, .info-list li, .quote').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', e.clientX - r.left + 'px');
        el.style.setProperty('--my', e.clientY - r.top + 'px');
        if (el.hasAttribute('data-tilt') && el.classList.contains('is-in')) {
          const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
          el.style.transform = `perspective(900px) rotateX(${(-y * 7).toFixed(2)}deg) rotateY(${(x * 7).toFixed(2)}deg) translateY(-4px)`;
        }
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
    $$('[data-magnetic]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${((e.clientX - r.left - r.width / 2) * 0.22).toFixed(1)}px,${((e.clientY - r.top - r.height / 2) * 0.32).toFixed(1)}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------- 8 · Contadores animados ------------------------------------- */
  function counters() {
    const els = $$('[data-count]');
    if (!els.length || reduce) return;
    const loc = document.documentElement.lang || 'es-MX';
    const fmt = (el, v) => {
      const dec = parseInt(el.dataset.decimals || 0, 10);
      el.textContent = (el.dataset.prefix || '') + v.toLocaleString(loc, { minimumFractionDigits: dec, maximumFractionDigits: dec }) + (el.dataset.suffix || '');
    };
    els.forEach((el) => fmt(el, 0));
    const io = new IntersectionObserver((es) => es.forEach((en) => {
      if (!en.isIntersecting) return;
      io.unobserve(en.target);
      const el = en.target, end = parseFloat(el.dataset.count), t0 = performance.now(), D = 2200;
      const step = (now) => {
        const t = clamp((now - t0) / D, 0, 1);
        fmt(el, end * (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)));   // easeOutExpo
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }), { threshold: 0.6 });
    els.forEach((el) => io.observe(el));
  }

  /* ---------- 9 · Hero: partículas en red + parallax con el mouse --------- */
  function heroFx() {
    const hero = $('.hero');
    if (!hero) return;
    const bg = $('.hero__bg', hero);
    if (fine && !reduce && bg) {                          // profundidad suave con el puntero
      let tx = 0, ty = 0, cx = 0, cy = 0;
      hero.addEventListener('pointermove', (e) => {
        const r = hero.getBoundingClientRect();
        tx = ((e.clientX - r.left) / r.width - 0.5) * 2; ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
      });
      const loop = () => {
        cx = lerp(cx, tx, 0.06); cy = lerp(cy, ty, 0.06);
        hero.style.setProperty('--px', cx.toFixed(3)); hero.style.setProperty('--py', cy.toFixed(3));
        requestAnimationFrame(loop);
      };
      loop();
    }
    const canvas = $('.hero__canvas', hero);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, pts = [], raf = 0, visible = true, col = '120 160 255';
    const mouse = { x: -9999, y: -9999 };
    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2), r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(clamp((w * h) / (reduce ? 70000 : 14500), 26, 120));
      pts = Array.from({ length: n }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.38, vy: (Math.random() - 0.5) * 0.38, r: Math.random() * 1.7 + 0.6,
      }));
      col = getComputedStyle(canvas).getPropertyValue('--glow-rgb').trim() || col;
    };
    const frame = () => {
      ctx.clearRect(0, 0, w, h);
      const LINK = Math.min(150, w / 5), L2 = LINK * LINK;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < -20) p.x = w + 20; else if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20; else if (p.y > h + 20) p.y = -20;
        const mx = mouse.x - p.x, my = mouse.y - p.y, md = mx * mx + my * my;
        if (md < 28000) { p.x -= mx * 0.0016; p.y -= my * 0.0016; }   // el puntero "empuja" suavemente
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832);
        ctx.fillStyle = `rgb(${col} / .85)`; ctx.fill();
        for (let j = i + 1; j < pts.length; j++) {
          const q = pts[j], dx = p.x - q.x, dy = p.y - q.y, d = dx * dx + dy * dy;
          if (d < L2) {
            ctx.strokeStyle = `rgb(${col} / ${((1 - d / L2) * 0.34).toFixed(3)})`;
            ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          }
        }
        if (md < 32000) {
          ctx.strokeStyle = `rgb(${col} / ${((1 - md / 32000) * 0.7).toFixed(3)})`;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
        }
      }
      raf = visible && !document.hidden ? requestAnimationFrame(frame) : 0;
    };
    const play = () => { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame); };
    resize(); play();
    let t; addEventListener('resize', () => { clearTimeout(t); t = setTimeout(resize, 180); });
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; play(); }).observe(hero);
    document.addEventListener('visibilitychange', play);
    hero.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    });
    hero.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });
  }

  /* ---------- 10 · Luz que sigue al cursor (solo escritorio) -------------- */
  function cursorGlow() {
    const g = $('.cursor-glow');
    if (!g || !fine || reduce) return;
    let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y, on = false;
    addEventListener('pointermove', (e) => { x = e.clientX; y = e.clientY; if (!on) { on = true; root.classList.add('has-pointer'); } }, { passive: true });
    const loop = () => { cx = lerp(cx, x, 0.12); cy = lerp(cy, y, 0.12); g.style.transform = `translate3d(${cx.toFixed(1)}px,${cy.toFixed(1)}px,0)`; requestAnimationFrame(loop); };
    loop();
  }

  /* ---------- 11 · Formulario → WhatsApp + botón flotante ----------------- */
  function whatsapp() {
    const wa = cfg.wa || {};
    const form = $('#contactForm');
    // los enlaces "Quiero esta solución" preseleccionan el servicio en el formulario
    document.addEventListener('click', (e) => {
      const a = e.target.closest('[data-service]');
      if (a && form && form.service) form.service.value = a.dataset.service;
    });
    if (form) {
      const status = $('.form__status', form);
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (form.website && form.website.value) return;              // honeypot anti-spam
        if (!form.checkValidity()) { form.reportValidity(); return; }
        const v = (n) => (form[n] && form[n].value || '').trim();
        const lines = [wa.greeting || 'Hola, los vi en su página web.'];
        lines.push('', '*Nombre:* ' + v('nombre'));
        if (v('telefono')) lines.push('*Teléfono:* ' + v('telefono'));
        if (v('service')) lines.push('*Me interesa:* ' + v('service'));
        if (v('mensaje')) lines.push('*Mensaje:* ' + v('mensaje'));
        const url = `https://wa.me/${wa.number}?text=${encodeURIComponent(lines.join('\n'))}`;
        if (status) status.textContent = (cfg.labels && cfg.labels.opening) || 'Abriendo WhatsApp…';
        const win = window.open(url, '_blank', 'noopener');
        if (!win) location.href = url;                               // popup bloqueado → misma pestaña
      });
    }
    const fl = $('.wa-float');
    if (fl) {                                                        // burbuja de invitación, una sola vez
      setTimeout(() => fl.classList.add('show-label'), 6500);
      setTimeout(() => fl.classList.remove('show-label'), 12500);
    }
  }

  /* ---------- Arranque ----------------------------------------------------- */
  function boot() {
    header(); anchors(); smoothScroll(); splitHero(); pointerFx(); heroFx(); cursorGlow(); whatsapp();
    reveal(); counters(); scrollFx();
    runLoader().then(() => root.classList.add('is-ready'));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  setTimeout(() => root.classList.remove('is-loading'), 9000);       // red de seguridad
})();
