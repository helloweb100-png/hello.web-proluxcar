/* ==========================================================================
   PROLUXCAR · motor de la landing
   Dependencias (CDN, con degradación elegante si fallan): GSAP + ScrollTrigger + Lenis
   Todo lo funcional (pedido, catálogo, fichas, FAQ, formulario, pulido) funciona sin ellas.
   Índice: 0 Utilidades · 1 Datos y pedido · 2 Fichas y drawer · 3 Catálogo · 4 Selector
           5 FAQ y formulario · 6 Pulido · 7 WebGL del hero · 8 Loader · 9 Scroll/animación · 10 Arranque
   ========================================================================== */
(() => {
  'use strict';

  /* 0 · UTILIDADES ------------------------------------------------------- */
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const money = (n) => '$' + Math.round(n).toLocaleString('es-MX');
  const state = { lenis: null, ready: false };

  let DATA = { wa: '', prices: true, products: [] };
  try { DATA = JSON.parse($('#data').textContent); } catch (e) { /* sin datos: la web sigue siendo navegable */ }
  const PRODUCTS = DATA.products;
  const BY_ID = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));
  const waUrl = (msg) => `https://wa.me/${DATA.wa}?text=${encodeURIComponent(msg)}`;

  let lockCount = 0;
  const lockScroll = () => { if (++lockCount === 1) { state.lenis && state.lenis.stop(); root.style.overflow = 'hidden'; } };
  const unlockScroll = () => { if (--lockCount <= 0) { lockCount = 0; state.lenis && state.lenis.start(); root.style.overflow = ''; } };

  /* 1 · DATOS Y PEDIDO --------------------------------------------------- */
  const CART_KEY = 'proluxcar-pedido-v1';
  let cart = {};
  try { cart = JSON.parse(localStorage.getItem(CART_KEY) || '{}') || {}; } catch (e) { cart = {}; }
  Object.keys(cart).forEach((id) => { if (!BY_ID[id] || !(cart[id] > 0)) delete cart[id]; });
  const saveCart = () => { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) { /* modo privado */ } };

  const unitPrice = (p, q) => (p.base && q < (p.minQty || 0) ? p.base : p.price);
  const cartCount = () => Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotal = () => Object.entries(cart).reduce((a, [id, q]) => a + unitPrice(BY_ID[id], q) * q, 0);

  function cartMessage() {
    const lines = Object.entries(cart).map(([id, q]) => {
      const p = BY_ID[id];
      const price = DATA.prices ? ` — ${money(unitPrice(p, q))} c/u` : '';
      return `• ${q} × ${p.name} (${p.pres})${price}`;
    });
    let msg = 'Hola Proluxcar, quiero cotizar este pedido de mayoreo:\n\n' + lines.join('\n');
    if (DATA.prices) msg += `\n\nSubtotal referencial: ${money(cartTotal())}`;
    return msg + '\n\n¿Me confirman disponibilidad y precio final? Gracias.';
  }

  function toast(text, action, fn) {
    const t = $('#toast');
    t.innerHTML = '';
    const s = document.createElement('span'); s.textContent = text; t.appendChild(s);
    if (action) { const b = document.createElement('button'); b.type = 'button'; b.textContent = action; b.addEventListener('click', () => { fn(); t.classList.remove('is-on'); }); t.appendChild(b); }
    t.classList.add('is-on');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => t.classList.remove('is-on'), 3800);
  }

  function renderCart() {
    const list = $('#cartList');
    const count = cartCount();
    $$('[data-cart-count]').forEach((el) => { el.textContent = count; });
    const pill = $('.cartpill');
    if (pill) pill.hidden = count === 0;
    const order = $('[data-form-order]');
    if (order) { order.hidden = count === 0; order.textContent = count ? `Incluiremos tu pedido (${count} ${count === 1 ? 'pieza' : 'piezas'}) en el mensaje.` : ''; }

    if (!count) {
      list.innerHTML = '<div class="cempty"><p>Aún no agregas productos. Explora el catálogo y toca “Pedido” en lo que necesites.</p><a class="btn btn--ghost" href="#catalogo" data-close-cart><span class="btn__bg"></span><span class="btn__txt">Ver el catálogo</span></a></div>';
      $('#cartTotal').textContent = money(0);
      const send = $('#cartSend'); send.setAttribute('aria-disabled', 'true'); send.href = waUrl('Hola Proluxcar, quiero recibir el catálogo con precios de mayoreo.');
      return;
    }
    list.innerHTML = Object.entries(cart).map(([id, q]) => {
      const p = BY_ID[id];
      const warn = p.minQty && q < p.minQty ? `<span class="citem__warn js-price">${p.base ? 'Precio de mayoreo desde ' + p.minQty + ' piezas (hoy ' + money(p.base) + ' c/u)' : 'Precio de mayoreo desde ' + p.minQty + ' piezas; se confirma por WhatsApp'}</span>` : '';
      return `<article class="citem" data-id="${id}"><img src="${p.img}" alt="" width="80" height="80" loading="lazy"><div><h3>${p.brand}</h3><p>${p.pres} · ${p.ph}</p>
        <div class="citem__row"><div class="qty" role="group" aria-label="Cantidad de ${p.brand}"><button type="button" data-q="-1" aria-label="Quitar una pieza">−</button><output>${q}</output><button type="button" data-q="1" aria-label="Agregar una pieza">+</button></div>
        <span class="citem__sum js-price">${money(unitPrice(p, q) * q)}</span></div>${warn}<button class="citem__rm" type="button" data-rm>Quitar</button></div></article>`;
    }).join('');
    $('#cartTotal').textContent = money(cartTotal());
    const send = $('#cartSend'); send.removeAttribute('aria-disabled'); send.href = waUrl(cartMessage());
  }

  function setQty(id, q) {
    if (q <= 0) delete cart[id]; else cart[id] = Math.min(q, 999);
    saveCart(); renderCart();
    $$('.cartbtn__count, .cartpill b').forEach((el) => { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); });
  }
  function addToCart(id, n = 1, silent = false) {
    setQty(id, (cart[id] || 0) + n);
    if (!silent) toast(`${BY_ID[id].brand} agregado a tu pedido`, 'Ver pedido', () => openDialog($('#cart')));
  }

  /* 2 · FICHAS Y DRAWER (dialog nativo) ---------------------------------- */
  function openDialog(dlg) {
    if (dlg.open) return;
    dlg.classList.remove('is-closing');
    dlg.showModal();
    lockScroll();
  }
  function closeDialog(dlg) {
    if (!dlg.open || dlg.classList.contains('is-closing')) return;
    dlg.classList.add('is-closing');
    setTimeout(() => { dlg.close(); dlg.classList.remove('is-closing'); unlockScroll(); }, reduce ? 0 : 380);
  }
  $$('dialog').forEach((dlg) => {
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); closeDialog(dlg); });
    dlg.addEventListener('click', (e) => { if (e.target === dlg || e.target.closest('[data-close]') || e.target.closest('[data-close-cart]')) closeDialog(dlg); });
  });

  let modalId = null, modalQty = 1;
  function openProduct(id) {
    const p = BY_ID[id]; if (!p) return;
    modalId = id; modalQty = p.minQty || 1;
    const shell = $('.modal__shell'); shell.style.setProperty('--tint', p.tint);
    const mm = $('.modal__media'); if (p.fit) { mm.setAttribute('data-fit', ''); mm.style.setProperty('--mbg', p.fit); } else { mm.removeAttribute('data-fit'); }
    const img = $('#pm-img'); img.src = p.img; img.alt = `${p.name} de Proluxcar, ${p.pres}`;
    const price = DATA.prices ? `<div class="pm__price"><b>${money(p.price)}</b><span>mayoreo${p.minQty ? ' desde ' + p.minQty + ' piezas' : ''} · ${p.pres}${p.base ? ' · unidad ' + money(p.base) : ''}</span></div>` : '';
    $('#pm-body').innerHTML = `<p class="pm__cat mono">${p.catLabel}</p><h2 class="pm__title" id="pm-title">${p.brand}</h2><p class="pm__type mono">${p.type}</p>
      <p class="pm__desc">${p.desc}</p>
      <dl class="pm__specs">${p.specs.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>${price}
      <div class="pm__buy"><div class="qty" role="group" aria-label="Cantidad"><button type="button" data-mq="-1" aria-label="Menos">−</button><output id="pmq">${modalQty}</output><button type="button" data-mq="1" aria-label="Más">+</button></div>
      <button class="btn btn--primary" type="button" id="pmAdd"><span class="btn__bg"></span><span class="btn__txt">Agregar a mi pedido</span></button></div>
      <a class="pm__ask" href="${waUrl('Hola Proluxcar, quiero cotizar en mayoreo: ' + p.name + '.')}" target="_blank" rel="noopener">Prefiero preguntar por WhatsApp</a>`;
    openDialog($('#pmodal'));
  }
  $('#pm-body').addEventListener('click', (e) => {
    const mq = e.target.closest('[data-mq]');
    if (mq) { modalQty = clamp(modalQty + Number(mq.dataset.mq), 1, 999); $('#pmq').textContent = modalQty; }
    if (e.target.closest('#pmAdd')) { addToCart(modalId, modalQty, true); closeDialog($('#pmodal')); setTimeout(() => toast(`${BY_ID[modalId].brand} agregado a tu pedido`, 'Ver pedido', () => openDialog($('#cart'))), 420); }
  });
  $('#cartList').addEventListener('click', (e) => {
    const row = e.target.closest('.citem'); if (!row) return;
    const id = row.dataset.id; const q = e.target.closest('[data-q]');
    if (q) setQty(id, (cart[id] || 0) + Number(q.dataset.q));
    if (e.target.closest('[data-rm]')) setQty(id, 0);
  });
  $('#cartClear').addEventListener('click', () => { cart = {}; saveCart(); renderCart(); });
  $('#cartSend').addEventListener('click', (e) => { if (!cartCount()) e.preventDefault(); });

  document.addEventListener('click', (e) => {
    const open = e.target.closest('[data-open]'); if (open) { e.preventDefault(); openProduct(open.dataset.open); return; }
    const add = e.target.closest('[data-add]');
    if (add) {
      addToCart(add.dataset.add);
      add.classList.add('is-added'); const s = $('span', add); const old = s.textContent; s.textContent = 'Agregado';
      setTimeout(() => { add.classList.remove('is-added'); s.textContent = old; }, 1400); return;
    }
    if (e.target.closest('[data-cart-open]')) { e.preventDefault(); openDialog($('#cart')); return; }
    const ac = e.target.closest('[data-add-cta]'); if (ac) { e.preventDefault(); addToCart(ac.dataset.addCta, 1, true); openDialog($('#cart')); }
  });

  /* 3 · CATÁLOGO: filtros + búsqueda + tilt ------------------------------- */
  function initCatalog() {
    const cards = $$('.pcard'); const chips = $$('.fchip'); const q = $('#q'); const count = $('#count'); const empty = $('#empty');
    cards.forEach((c) => { c.dataset.name = norm(c.dataset.name); });
    const f = { cat: 'all', q: '' };
    let rt;
    function apply() {
      let n = 0; const shown = [];
      cards.forEach((c) => {
        const ok = (f.cat === 'all' || c.dataset.cat === f.cat) && (!f.q || c.dataset.name.includes(f.q));
        c.classList.toggle('is-hidden', !ok);
        if (ok) { n++; shown.push(c); if (!c.classList.contains('is-in')) { c.style.opacity = 1; c.style.transform = 'none'; c.classList.add('is-in'); } }
      });
      count.textContent = n; empty.hidden = n > 0;
      if (!reduce) shown.forEach((c, i) => c.animate([{ opacity: 0, transform: 'translateY(28px) scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 700, delay: Math.min(i, 12) * 35, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' }));
      clearTimeout(rt); rt = setTimeout(() => hasGsap && ScrollTrigger.refresh(), 400);
    }
    chips.forEach((b) => b.addEventListener('click', () => {
      chips.forEach((x) => { x.classList.toggle('is-on', x === b); x.setAttribute('aria-pressed', x === b); });
      f.cat = b.dataset.filter; apply();
    }));
    q.addEventListener('input', () => { f.q = norm(q.value.trim()); apply(); });
    if (fine && !reduce) cards.forEach((c) => {
      const open = $('.pcard__open', c), media = $('.pcard__media', c);
      open.addEventListener('pointermove', (e) => {
        const r = open.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        c.style.setProperty('--gx', x * 100 + '%'); c.style.setProperty('--gy', y * 100 + '%');
        media.style.transform = `perspective(900px) rotateX(${(.5 - y) * 6}deg) rotateY(${(x - .5) * 8}deg) scale(1.02)`;
      });
      open.addEventListener('pointerleave', () => { media.style.transform = ''; });
    });
  }

  /* 4 · SELECTOR POR SUPERFICIE ------------------------------------------ */
  const SURFACES = {
    pintura: { t: 'Pintura', tint: '255,79,163', lead: 'Del prelavado al acabado espejo: lava sin rayar, corrige y protege.', tips: ['Prelavado con espumador: dilución 1:4 en Storm Pink o Bubble Blue.', 'Lavado de contacto con guante de microfibra, en cubeta a 50 ml.', 'Ceramix Polish quita rayones superficiales y deja terminado espejo.', 'Cierra con Nova Wax: protege de rayos UV y suciedad. Siempre en sombra.'], ids: ['bubble-blue', 'storm-pink', 'storm-red', 'canon-espuma', 'ceramix-polish', 'nova-wax'] },
    rines: { t: 'Rines y chasis', tint: '163,91,255', lead: 'Óxido, polvo de balatas y grasa incrustada, sin tallar.', tips: ['Aluclean disuelve óxido y polvo de balatas: en sombra y máximo 5 minutos.', 'Nunca apliques Aluclean sobre plásticos o superficies electrónicas.', 'Destroyer se activa con agua a presión, sin tallar.', 'Las brochas de pelo de jabalí llegan a los rincones.'], ids: ['aluclean', 'destroyer', 'all-cleaner', 'brochas'] },
    llantas: { t: 'Llantas', tint: '255,210,31', lead: 'Descontamina primero y termina con efecto mojado.', tips: ['Descontamina y limpia antes de aplicar Tireshine.', 'Deja reposar el gel 15 minutos antes de mover el auto.', 'Es hidrofóbico y a base de agua: repele agua y polvo.'], ids: ['tireshine', 'aluclean', 'destroyer'] },
    motor: { t: 'Motor', tint: '255,75,58', lead: 'Desengrasa partes externas y devuelve el color a los plásticos.', tips: ['Destroyer limpia motor, guardapolvos y chasis sin tallar.', 'Actívalo con agua a presión y trabaja siempre en sombra.', 'Black Mamba gel devuelve el color original a los plásticos del motor.'], ids: ['destroyer', 'black-mamba-gel', 'all-cleaner'] },
    exteriores: { t: 'Plásticos exteriores', tint: '225,29,46', lead: 'Fascias y molduras como nuevas, sin el desgaste del sol.', tips: ['Black Mamba gel (base solvente) devuelve el color a fascias y molduras.', 'Efecto natural, ideal para plásticos deteriorados por el sol.', 'La versión en crema deja un acabado brillante.'], ids: ['black-mamba-gel', 'black-mamba-crema', 'all-cleaner'] },
    interiores: { t: 'Interiores', tint: '52,224,192', lead: 'Limpia plásticos, piel y telas, y deja protección con aroma.', tips: ['APC Cleaner limpia plásticos, piel, telas y toldo, con aroma a cítricos.', 'Int Shine protege plásticos internos con silicones y poca cantidad.', 'Las brochas de jabalí son suaves para rincones y tableros.'], ids: ['apc-cleaner', 'all-cleaner', 'int-shine', 'black-mamba-crema', 'brochas', 'microfibras'] },
    cristales: { t: 'Cristales y pantallas', tint: '79,216,255', lead: 'Sin rayones, sin grasa y sin residuos de lluvia ácida.', tips: ['Glass Cleaner limpia pantallas, tableros y cristales sin rayones.', 'Hydroshield quita residuos y lluvia ácida de parabrisas y espejos.', 'Usa microfibra de calidad para secar sin dejar pelusa.'], ids: ['glass-cleaner', 'hydroshield', 'microfibras'] },
  };
  function initFinder() {
    const out = $('#finderOut'); const chips = $$('.schip');
    function render(key, animate) {
      const s = SURFACES[key]; out.style.setProperty('--tint', s.tint);
      out.innerHTML = `<div class="fres"><div class="fres__intro"><p class="mono">Superficie</p><h3>${s.t}</h3><p>${s.lead}</p><ul class="fres__tips">${s.tips.map((t) => `<li>${t}</li>`).join('')}</ul></div>
        <div class="fres__prods">${s.ids.map((id) => { const p = BY_ID[id]; return `<div class="fprod" style="--tint:${p.tint}"><button class="fprod__img" type="button" data-open="${id}" aria-label="Ver ficha: ${p.name}"><img src="${p.img}" alt="${p.name}" width="160" height="160" loading="lazy"></button><div class="fprod__txt"><p class="mono">${p.type}</p><h4>${p.brand}</h4><p>${p.pres} · ${p.ph}${DATA.prices ? ' · <b>' + money(p.price) + '</b> mayoreo' : ''}</p></div><button class="fprod__add" type="button" data-add="${id}" aria-label="Agregar ${p.name} a mi pedido"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span>Pedido</span></button></div>`; }).join('')}</div></div>`;
      if (animate && !reduce) {
        $('.fres', out).animate([{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'none' }], { duration: 700, easing: 'cubic-bezier(.16,1,.3,1)' });
        $$('.fprod', out).forEach((el, i) => el.animate([{ opacity: 0, transform: 'translateX(30px)' }, { opacity: 1, transform: 'none' }], { duration: 700, delay: 120 + i * 70, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' }));
      }
    }
    chips.forEach((b) => b.addEventListener('click', () => {
      chips.forEach((x) => { x.classList.toggle('is-on', x === b); x.setAttribute('aria-pressed', x === b); });
      render(b.dataset.surface, true);
    }));
    render('pintura', false);
  }

  /* 5 · FAQ + FORMULARIO -------------------------------------------------- */
  function initFaq() {
    $$('.faq__item').forEach((item) => {
      const q = $('.faq__q', item);
      q.addEventListener('click', () => {
        const open = !item.classList.contains('is-open');
        $$('.faq__item.is-open').forEach((o) => { if (o !== item) { o.classList.remove('is-open'); $('.faq__q', o).setAttribute('aria-expanded', 'false'); } });
        item.classList.toggle('is-open', open); q.setAttribute('aria-expanded', open);
        setTimeout(() => hasGsap && ScrollTrigger.refresh(), 700);
      });
    });
  }
  function initForm() {
    const form = $('#waForm'); if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = form.elements.name.value.trim();
      const field = form.elements.name.closest('.field'); const err = $('.field__err', field);
      if (name.length < 2) { field.classList.add('has-err'); err.textContent = 'Cuéntanos tu nombre para saludarte.'; form.elements.name.focus(); return; }
      field.classList.remove('has-err'); err.textContent = '';
      const who = form.elements.who.value; const want = $$('input[name="want"]:checked', form).map((i) => i.value);
      let msg = `Hola Proluxcar, soy ${name} (${who}).`;
      if (want.length) msg += ` Me interesa: ${want.join(', ')}.`;
      const extra = form.elements.msg.value.trim(); if (extra) msg += `\n\n${extra}`;
      if (cartCount()) msg += '\n\nMi pedido:\n' + Object.entries(cart).map(([id, q]) => `• ${q} × ${BY_ID[id].name} (${BY_ID[id].pres})`).join('\n');
      msg += '\n\n¿Me ayudan con una cotización de mayoreo? Gracias.';
      const a = document.createElement('a'); a.href = waUrl(msg); a.target = '_blank'; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove();
      toast('Abriendo WhatsApp con tu mensaje listo…');
    });
    form.elements.name.addEventListener('input', () => { const f = form.elements.name.closest('.field'); f.classList.remove('has-err'); $('.field__err', f).textContent = ''; });
  }

  /* 6 · PULE LA PINTURA --------------------------------------------------- */
  function initPolish() {
    const panel = $('#polishPanel'); if (!panel) return;
    const gloss = $('#pGloss'), dull = $('#pDull'), pad = $('#pad');
    const gx = gloss.getContext('2d'), dx = dull.getContext('2d');
    const probe = document.createElement('canvas'); probe.width = 48; probe.height = 40; const px = probe.getContext('2d', { willReadFrequently: true });
    let W = 0, H = 0, dpr = 1, done = false, last = null, touched = false, pct = 0, shownPct = 0, probeT = 0;

    const mulberry = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

    function base(ctx) {
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, '#34060c'); g.addColorStop(.42, '#8c0f1e'); g.addColorStop(.72, '#430811'); g.addColorStop(1, '#15040a');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const rnd = mulberry(7);
      for (let i = 0; i < 1400; i++) { // escamas metálicas
        ctx.fillStyle = `rgba(255,${120 + (rnd() * 90) | 0},${120 + (rnd() * 90) | 0},${(rnd() * .16).toFixed(3)})`;
        ctx.fillRect(rnd() * W, rnd() * H, 1.1 * dpr, 1.1 * dpr);
      }
    }
    function paintGloss() {
      base(gx);
      gx.save();
      // horizonte de estudio: cielo claro / piso oscuro con borde nítido
      const hz = H * .56;
      const sky = gx.createLinearGradient(0, 0, 0, hz); sky.addColorStop(0, 'rgba(255,255,255,.34)'); sky.addColorStop(1, 'rgba(255,255,255,.06)');
      gx.fillStyle = sky; gx.fillRect(0, 0, W, hz);
      gx.fillStyle = 'rgba(0,0,0,.34)'; gx.fillRect(0, hz, W, H - hz);
      gx.fillStyle = 'rgba(255,255,255,.55)'; gx.fillRect(0, hz - 1.5 * dpr, W, 3 * dpr);
      // tubos de luz
      gx.shadowColor = 'rgba(255,255,255,.9)'; gx.shadowBlur = 24 * dpr;
      [[.2, .5], [.34, .4], [.66, .55], [.82, .35]].forEach(([x, a]) => { gx.fillStyle = `rgba(255,255,255,${a})`; gx.fillRect(W * x, -10, 5 * dpr, hz + 10); });
      gx.shadowBlur = 0;
      // banda diagonal brillante
      const band = gx.createLinearGradient(0, H, W, 0); band.addColorStop(.34, 'rgba(255,255,255,0)'); band.addColorStop(.5, 'rgba(255,255,255,.5)'); band.addColorStop(.66, 'rgba(255,255,255,0)');
      gx.fillStyle = band; gx.fillRect(0, 0, W, H);
      const sp = gx.createRadialGradient(W * .74, H * .3, 0, W * .74, H * .3, W * .32); sp.addColorStop(0, 'rgba(255,255,255,.6)'); sp.addColorStop(1, 'rgba(255,255,255,0)');
      gx.fillStyle = sp; gx.fillRect(0, 0, W, H);
      gx.restore();
    }
    function paintDull() {
      dx.globalCompositeOperation = 'source-over'; dx.clearRect(0, 0, W, H);
      base(dx);
      dx.fillStyle = 'rgba(150,138,142,.62)'; dx.fillRect(0, 0, W, H); // veladura
      const rnd = mulberry(21);
      dx.lineCap = 'round';
      for (let i = 0; i < 520; i++) { // rayones circulares (remolinos de lavado)
        const cx = rnd() * W * 1.2 - W * .1, cy = rnd() * H * 1.2 - H * .1, r = (30 + rnd() * 260) * dpr, a0 = rnd() * 6.28, a1 = a0 + .35 + rnd() * 1.4;
        dx.strokeStyle = `rgba(255,255,255,${(.05 + rnd() * .3).toFixed(3)})`; dx.lineWidth = (.5 + rnd() * 1.4) * dpr;
        dx.beginPath(); dx.arc(cx, cy, r, a0, a1); dx.stroke();
      }
      for (let i = 0; i < 70; i++) { // rayones largos
        dx.strokeStyle = `rgba(255,255,255,${(.12 + rnd() * .3).toFixed(3)})`; dx.lineWidth = (.6 + rnd() * 1.2) * dpr;
        const x = rnd() * W, y = rnd() * H, l = (60 + rnd() * 220) * dpr, a = rnd() * 3.14;
        dx.beginPath(); dx.moveTo(x, y); dx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); dx.stroke();
      }
    }
    function reset() {
      done = false; pct = 0; shownPct = 0; last = null;
      panel.classList.remove('is-done'); paintDull(); setUi(0, 'Superficie con rayones');
    }
    function size() {
      const r = panel.getBoundingClientRect(); if (!r.width) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
      if (w === W && h === H) return;
      W = gloss.width = dull.width = w; H = gloss.height = dull.height = h;
      paintGloss(); reset();
    }
    function setUi(p, text) {
      $('#meterVal').textContent = Math.round(p); $('#meterBar').style.transform = `scaleX(${clamp(p / 100, 0, 1)})`;
      if (text) $('#polishState').textContent = text;
    }
    function stamp(x, y) {
      const r = Math.max(34 * dpr, W * .075);
      const g = dx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(.55, 'rgba(0,0,0,.92)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      dx.globalCompositeOperation = 'destination-out'; dx.fillStyle = g; dx.beginPath(); dx.arc(x, y, r, 0, 6.2832); dx.fill();
    }
    function stroke(x, y) {
      if (done) return;
      if (last) {
        const dxx = x - last.x, dyy = y - last.y, d = Math.hypot(dxx, dyy), step = Math.max(10 * dpr, W * .02);
        for (let s = step; s < d; s += step) stamp(last.x + dxx * (s / d), last.y + dyy * (s / d));
      }
      stamp(x, y); last = { x, y };
      const now = performance.now();
      if (now - probeT > 140) { probeT = now; measure(); }
    }
    function measure() {
      px.clearRect(0, 0, 48, 40); px.drawImage(dull, 0, 0, 48, 40);
      const d = px.getImageData(0, 0, 48, 40).data; let a = 0;
      for (let i = 3; i < d.length; i += 4) a += d[i];
      const cleared = 1 - a / (d.length / 4 * 255);
      pct = clamp(cleared / .86 * 100, 0, 100);
      setUi(pct, pct > 55 ? 'Casi espejo…' : 'Puliendo…');
      if (pct >= 99.5 || (cleared > .86)) finish();
    }
    function finish() {
      if (done) return; done = true; setUi(100, 'Acabado espejo ✓'); panel.classList.add('is-done'); pad.classList.remove('is-on');
    }
    const local = (e) => { const r = panel.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H, cx: e.clientX - r.left, cy: e.clientY - r.top }; };
    panel.addEventListener('pointerdown', (e) => { touched = true; last = null; const p = local(e); stroke(p.x, p.y); pad.classList.add('is-on'); });
    panel.addEventListener('pointermove', (e) => {
      const p = local(e); pad.style.transform = `translate(${p.cx}px,${p.cy}px)`;
      if (!done) pad.classList.add('is-on');
      if (e.pointerType === 'mouse' || e.buttons > 0) { touched = true; stroke(p.x, p.y); }
    });
    panel.addEventListener('pointerleave', () => { pad.classList.remove('is-on'); last = null; });
    panel.addEventListener('pointerup', () => { last = null; if (e => e) pad.classList.remove('is-on'); });
    $('#pReset').addEventListener('click', () => { reset(); });

    // demostración automática la primera vez que se ve el panel
    let demoed = false;
    function demo() {
      if (demoed || touched || reduce) return; demoed = true;
      const t0 = performance.now(), dur = 2300;
      const path = (u) => ({ x: W * (.12 + .76 * u), y: H * (.28 + .3 * Math.sin(u * 6.3) * .6 + .24 * u) });
      (function tick(now) {
        if (touched || done) { last = null; return; }
        const u = clamp((now - t0) / dur, 0, 1); const p = path(u); stroke(p.x, p.y);
        pad.style.transform = `translate(${p.x / W * panel.clientWidth}px,${p.y / H * panel.clientHeight}px)`; pad.classList.add('is-on');
        if (u < 1) requestAnimationFrame(tick); else { last = null; pad.classList.remove('is-on'); }
      })(t0);
    }
    new IntersectionObserver((en, ob) => { if (en[0].isIntersecting) { setTimeout(demo, 600); ob.disconnect(); } }, { threshold: .55 }).observe(panel);
    new ResizeObserver(size).observe(panel);
    size();
  }

  /* 7 · HERO WEBGL: cromo líquido ----------------------------------------- */
  function initGL() {
    const c = $('#gl'); if (!c || reduce) return null;
    const gl = c.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' });
    if (!gl) { $('.hero').classList.add('no-gl'); return null; }
    const vs = '#version 300 es\nvoid main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(p*2.-1.,0.,1.);}';
    const fs = `#version 300 es
precision highp float;
out vec4 o;
uniform vec2 uRes; uniform float uTime; uniform vec2 uMouse; uniform float uIn; uniform float uScroll;
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<4;i++){v+=a*noise(p);p=m*p;a*=.5;}return v;}
float field(vec2 p,float t){
  vec2 q=vec2(fbm(p+vec2(0.,t)),fbm(p+vec2(5.2,1.3)-t));
  return fbm(p+2.3*q+vec2(1.7,9.2)+.4*t);
}
vec3 env(vec3 r){
  float a=r.y*.5+.5;
  vec3 c=mix(vec3(.004,.004,.006),vec3(.16,.17,.2),pow(a,2.2));
  c+=vec3(1.)*pow(max(r.x*.55+r.y*.85,0.),7.)*1.5;               // softbox superior
  c+=vec3(1.,.07,.12)*pow(max(-r.x*.8+r.y*.35,0.),4.)*1.6;        // luz roja izquierda
  c+=vec3(.9,.95,1.)*pow(max(r.x*.9-r.y*.2,0.),9.)*.9;            // relleno frío derecha
  c+=vec3(1.)*(smoothstep(.47,.5,a)-smoothstep(.5,.53,a))*.55;    // línea de horizonte
  return c;
}
void main(){
  vec2 R=uRes; float s=min(R.x,R.y);
  vec2 p=(gl_FragCoord.xy-.5*R)/s;
  vec2 m=(uMouse-.5*R)/s;
  float t=uTime*.085;
  vec2 q=p*1.35+vec2(.28,-.05+uScroll*.35);
  float d=length(p-m);
  q+=(p-m)*exp(-d*d*6.)*.2;
  float e=.012;
  float f0=field(q,t), fx=field(q+vec2(e,0.),t), fy=field(q+vec2(0.,e),t);
  vec3 n=normalize(vec3(-(fx-f0)/e*.55,-(fy-f0)/e*.55,1.));
  vec3 r=reflect(vec3(0.,0.,-1.),n);
  vec3 col=env(r);
  float fres=pow(1.-n.z,2.);
  col+=vec3(.5,.04,.07)*fres*1.2;
  col=col/(1.+col*.4);
  col=pow(col,vec3(.92));
  vec2 uv=gl_FragCoord.xy/R;
  col*=1.-.7*dot(uv-.5,uv-.5)*1.9;
  col*=uIn;
  o=vec4(col,1.);
}`;
    const mk = (type, src) => { const sh = gl.createShader(type); gl.shaderSource(sh, src); gl.compileShader(sh); return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : (console.warn(gl.getShaderInfoLog(sh)), null); };
    const v = mk(gl.VERTEX_SHADER, vs), f = mk(gl.FRAGMENT_SHADER, fs); if (!v || !f) { $('.hero').classList.add('no-gl'); return null; }
    const prog = gl.createProgram(); gl.attachShader(prog, v); gl.attachShader(prog, f); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { $('.hero').classList.add('no-gl'); return null; }
    gl.useProgram(prog);
    const U = Object.fromEntries(['uRes', 'uTime', 'uMouse', 'uIn', 'uScroll'].map((k) => [k, gl.getUniformLocation(prog, k)]));
    const small = innerWidth < 760;
    let quality = small ? .5 : .72, running = true, tIn = 0, scroll = 0;
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    function resize() {
      const r = c.getBoundingClientRect(); const k = Math.min(devicePixelRatio || 1, 1.5) * quality;
      c.width = Math.max(2, Math.round(r.width * k)); c.height = Math.max(2, Math.round(r.height * k)); gl.viewport(0, 0, c.width, c.height);
      mouse.x = mouse.tx = c.width * .7; mouse.y = mouse.ty = c.height * .5;
    }
    resize(); addEventListener('resize', resize);
    $('.hero').addEventListener('pointermove', (e) => { const r = c.getBoundingClientRect(); mouse.tx = (e.clientX - r.left) / r.width * c.width; mouse.ty = (1 - (e.clientY - r.top) / r.height) * c.height; });
    new IntersectionObserver((en) => { running = en[0].isIntersecting && !document.hidden; }, { threshold: 0 }).observe(c);
    document.addEventListener('visibilitychange', () => { running = !document.hidden; });
    let t0 = performance.now(), slow = 0, frames = 0, prev = t0;
    function frame(now) {
      requestAnimationFrame(frame);
      if (!running) { prev = now; return; }
      const dt = now - prev; prev = now;
      if (dt > 34) slow++; if (++frames % 90 === 0) { if (slow > 40 && quality > .36) { quality *= .8; resize(); } slow = 0; }
      mouse.x = lerp(mouse.x, mouse.tx, .05); mouse.y = lerp(mouse.y, mouse.ty, .05);
      gl.uniform2f(U.uRes, c.width, c.height); gl.uniform1f(U.uTime, (now - t0) / 1000); gl.uniform2f(U.uMouse, mouse.x, mouse.y);
      gl.uniform1f(U.uIn, tIn); gl.uniform1f(U.uScroll, scroll);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    requestAnimationFrame(frame);
    return { setIn: (v2) => { tIn = v2; }, setScroll: (v2) => { scroll = v2; } };
  }

  /* 8 · LOADER ------------------------------------------------------------ */
  function runLoader() {
    return new Promise((resolve) => {
      const loader = $('#loader');
      if (reduce || !hasGsap) { loader.remove(); root.classList.remove('is-loading'); return resolve(); }
      const num = $('#loaderNum'), bar = $('.loader__bar'), logo = $('.loader__logo');
      const imgs = ['img/logo.png', 'img/storm-pink.jpg', 'img/bubble-blue.jpg', 'img/nova-wax.jpg'];
      let loaded = 0; const total = imgs.length + 1;
      imgs.forEach((src) => { const i = new Image(); i.onload = i.onerror = () => { loaded++; }; i.src = src; });
      const fontsP = (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => { loaded++; });
      const guard = setTimeout(() => { loaded = total; }, 6000);
      gsap.to(logo, { opacity: 1, scale: 1, rotate: 0, duration: 1.3, ease: 'expo.out', delay: .1 });
      const t0 = performance.now(), MIN = 2000; let v = 0, finished = false;
      (function tick(now) {
        const tp = 1 - Math.pow(1 - clamp((now - t0) / MIN, 0, 1), 3); const lp = loaded / total;
        const target = Math.min(tp, lp) * 100; v = lerp(v, target, .2);
        const shown = (loaded >= total && now - t0 >= MIN) ? 100 : Math.min(99, Math.round(v));
        num.textContent = String(shown).padStart(3, '0'); bar.style.strokeDashoffset = 100 - shown;
        if (shown >= 100 && !finished) { finished = true; clearTimeout(guard); exit(); return; }
        requestAnimationFrame(tick);
      })(t0);
      function exit() {
        const tl = gsap.timeline({ onComplete: () => { loader.remove(); root.classList.remove('is-loading'); } });
        tl.to(['.loader__count', '.loader__tag'], { opacity: 0, y: 20, duration: .5, ease: 'power3.in' })
          .to('.loader__core', { scale: 1.7, opacity: 0, duration: .9, ease: 'expo.in' }, '<.1')
          .to('.loader__panel--t', { yPercent: -101, duration: 1.15, ease: 'expo.inOut' }, '-=.35')
          .to('.loader__panel--b', { yPercent: 101, duration: 1.15, ease: 'expo.inOut' }, '<')
          .add(() => resolve(), '-=.75');
      }
    });
  }

  /* 9 · SCROLL + ANIMACIÓN ------------------------------------------------ */
  function split(el, mode) {
    const words = []; const frag = document.createDocumentFragment();
    (function walk(node, em) {
      node.childNodes.forEach((n) => {
        if (n.nodeType === 3) {
          n.textContent.split(/(\s+)/).forEach((tok) => {
            if (!tok) return;
            if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(' ')); return; }
            const i = document.createElement('span');
            if (mode === 'mask') { const w = document.createElement('span'); w.className = 'w'; i.className = 'wi' + (em ? ' is-em' : ''); i.textContent = tok; w.appendChild(i); frag.appendChild(w); }
            else { i.className = 'mw' + (em ? ' is-b' : ''); i.textContent = tok; frag.appendChild(i); }
            words.push(i);
          });
        } else if (n.nodeType === 1) walk(n, em || n.tagName === 'EM' || n.tagName === 'B');
      });
    })(el, false);
    el.textContent = ''; el.appendChild(frag); el.classList.add('is-split');
    return words;
  }

  function initScroll() {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });

    // Lenis (scroll suave, lento y con inercia) sincronizado con ScrollTrigger
    if (window.Lenis && !reduce) {
      const lenis = new Lenis({ lerp: .085, wheelMultiplier: .92, smoothWheel: true });
      state.lenis = lenis;
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0);
    }
    const scrollTo = (target, opts = {}) => {
      if (state.lenis) state.lenis.scrollTo(target, { duration: 1.7, easing: (t) => 1 - Math.pow(1 - t, 4), ...opts });
      else (typeof target === 'number' ? window.scrollTo({ top: target, behavior: 'smooth' }) : target.scrollIntoView({ behavior: 'smooth' }));
    };
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]'); if (!a) return;
      const id = a.getAttribute('href'); if (id.length < 2) return;
      const el = $(id); if (!el) return; e.preventDefault();
      closeMenu(); scrollTo(el, { offset: id === '#sistema' ? 0 : 0 });
    });

    // Header: se oculta al bajar, vuelve al subir; barra de progreso
    const hdr = $('#hdr'), prog = $('.hdr__progress i'); let lastY = 0;
    ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (s) => { prog.style.transform = `scaleX(${s.progress})`; } });
    const onScroll = () => {
      const y = window.scrollY; hdr.classList.toggle('is-solid', y > 40);
      if (!$('.menu').classList.contains('is-open')) hdr.classList.toggle('is-hidden', y > lastY && y > 240); lastY = y;
    };
    addEventListener('scroll', onScroll, { passive: true });

    // Texto: titulares con máscara por palabra
    $$('[data-split]').forEach((el) => {
      const words = split(el, 'mask'); gsap.set(words, { yPercent: 115 });
      ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: () => gsap.to(words, { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: .045 }) });
    });
    // Manifiesto: las palabras se encienden con el scroll
    const man = $('[data-words]');
    if (man) {
      const words = split(man, 'plain');
      gsap.fromTo(words, { opacity: .14 }, { opacity: 1, ease: 'none', stagger: .6, scrollTrigger: { trigger: man, start: 'top 82%', end: 'bottom 55%', scrub: .5 } });
    }
    // Reveals genéricos
    ScrollTrigger.batch('[data-reveal]', { start: 'top 90%', once: true, onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 1.15, ease: 'expo.out', stagger: .09, onComplete: () => els.forEach((e) => { e.classList.add('is-in'); e.style.transform = ''; }) }) });
    // Contadores
    $$('[data-count]').forEach((el) => {
      const end = Number(el.dataset.count); const o = { v: 0 };
      ScrollTrigger.create({ trigger: el, start: 'top 92%', once: true, onEnter: () => gsap.to(o, { v: end, duration: 2.2, ease: 'expo.out', onUpdate: () => { el.textContent = Math.round(o.v); } }) });
    });

    // Ticker: velocidad base + empuje por velocidad de scroll
    const rows = $$('.ticker__row').map((row) => {
      const track = $('.ticker__track', row); const dir = Number(row.dataset.ticker) || -1;
      return { row, track, dir, w: 0, x: 0, tracks: [track] };
    });
    const measure = () => rows.forEach((r) => {
      r.w = r.track.getBoundingClientRect().width;
      const need = Math.ceil(innerWidth / r.w) + 1;
      while (r.tracks.length < need + 1) { const c = r.track.cloneNode(true); c.setAttribute('aria-hidden', 'true'); r.row.appendChild(c); r.tracks.push(c); }
    });
    measure(); addEventListener('resize', measure);
    let vel = 0;
    ScrollTrigger.create({ onUpdate: (s) => { vel = lerp(vel, s.getVelocity() / 380, .25); } });
    gsap.ticker.add((t, dt) => {
      vel *= .92;
      rows.forEach((r) => {
        r.x += r.dir * (.05 + Math.abs(vel) * .35) * dt * (vel * r.dir < 0 && Math.abs(vel) > 1 ? -1 : 1) * .09 * 14;
        const x = ((r.x % r.w) + r.w) % r.w - r.w;
        r.tracks.forEach((tr) => { tr.style.transform = `translate3d(${x}px,0,0)`; });
      });
    });

    // Hero: parallax con scroll
    gsap.to('.hero__inner', { yPercent: -9, opacity: .25, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero__gl', { scale: 1.12, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    if (fine) {
      const vis = $('.hero__visual'); const items = $$('[data-depth]', vis);
      const setters = items.map((el) => ({ x: gsap.quickTo(el, 'x', { duration: 1.1, ease: 'power3' }), y: gsap.quickTo(el, 'y', { duration: 1.1, ease: 'power3' }), d: Number(el.dataset.depth) }));
      $('.hero').addEventListener('pointermove', (e) => { const nx = e.clientX / innerWidth - .5, ny = e.clientY / innerHeight - .5; setters.forEach((s) => { s.x(nx * s.d * -1); s.y(ny * s.d * -1); }); });
    }

    // Proceso: la línea se llena con el scroll
    const pl = $('.proc__list');
    if (pl) ScrollTrigger.create({ trigger: pl, start: 'top 75%', end: 'bottom 55%', scrub: true, onUpdate: (s) => pl.style.setProperty('--p', s.progress) });

    // Cierre y pie
    gsap.to('.finale__bg', { rotate: 40, ease: 'none', scrollTrigger: { trigger: '.finale', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.fromTo('.finale__title', { scale: .86 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.finale', start: 'top 80%', end: 'center center', scrub: true } });
    gsap.to('.foot__word span', { y: 0, yPercent: 0, opacity: 1, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: '.foot__word', start: 'top 95%', once: true } });

    // HUD de sección + barra del catálogo debajo del header
    const hudN = $('#hudName'); const secs = $$('[data-section]');
    secs.forEach((s, i) => ScrollTrigger.create({ trigger: s, start: 'top 55%', end: 'bottom 55%', onToggle: (st) => { if (st.isActive) { hudN.textContent = s.dataset.section; } } }));
    const catBar = $('.cat__bar');
    hdr.addEventListener('transitionend', () => {});
    new MutationObserver(() => { catBar.style.top = hdr.classList.contains('is-hidden') ? '.75rem' : 'calc(var(--hdr) + .5rem)'; }).observe(hdr, { attributes: true, attributeFilter: ['class'] });
    catBar.style.top = 'calc(var(--hdr) + .5rem)';

    initSystem(scrollTo);
    addEventListener('load', () => ScrollTrigger.refresh());
  }

  /* Escena anclada del sistema ------------------------------------------- */
  function initSystem(scrollTo) {
    const sys = $('.sys'); if (!sys) return;
    const stages = $$('.stage', sys), N = stages.length, num = $('#sysNum'), railEl = $('.sys__rail'), rail = $$('.sys__rail button');
    const mm = gsap.matchMedia();
    let current = -1;
    const setStage = (i) => {
      if (i === current) return; current = i;
      sys.style.setProperty('--tint', stages[i].dataset.tint);
      if (num) { num.textContent = String(i + 1).padStart(2, '0'); gsap.fromTo(num, { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .7, ease: 'expo.out', overwrite: true }); }
      rail.forEach((b, k) => b.classList.toggle('is-on', k <= i));
    };

    mm.add('(min-width: 960px) and (prefers-reduced-motion: no-preference)', () => {
      root.classList.add('has-pin');
      const kids = (s) => [...$$('.stage__body > *', s)];
      gsap.set(stages, { autoAlpha: 0 }); gsap.set(stages[0], { autoAlpha: 1 });
      stages.forEach((s, i) => { if (i) { gsap.set(kids(s), { y: 70, autoAlpha: 0 }); gsap.set($('.stage__media', s), { clipPath: 'inset(0% 0% 100% 0%)' }); gsap.set($('.stage__media img', s), { scale: 1.4 }); } });
      const tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: '.sys__pin', start: 'top top', end: () => '+=' + Math.round(innerHeight * (N - 1) * .9 + innerHeight * .2), pin: true, scrub: .7, anticipatePin: 1, invalidateOnRefresh: true,
        onUpdate: (self) => { const t = tl.time(); setStage(clamp(Math.floor(t + .25), 0, N - 1)); railEl.style.setProperty('--p', clamp(t / (N - 1), 0, 1)); } } });
      for (let i = 0; i < N - 1; i++) {
        const a = stages[i], b = stages[i + 1], t = i + .55; // ventana de transición [i+.55, i+1]
        tl.to(kids(a), { y: -60, autoAlpha: 0, duration: .22, stagger: .02, ease: 'power2.in' }, t);
        tl.to($('.stage__media', a), { clipPath: 'inset(100% 0% 0% 0%)', duration: .4, ease: 'power3.inOut' }, t);
        tl.set(a, { autoAlpha: 0 }, t + .42);
        tl.set(b, { autoAlpha: 1 }, t + .1);
        tl.to($('.stage__media', b), { clipPath: 'inset(0% 0% 0% 0%)', duration: .42, ease: 'power3.inOut' }, t + .1);
        tl.to($('.stage__media img', b), { scale: 1, duration: .55, ease: 'power2.out' }, t + .1);
        tl.to(kids(b), { y: 0, autoAlpha: 1, duration: .3, stagger: .05, ease: 'power3.out' }, t + .2);
      }
      tl.to({}, { duration: .35 }, N - 1 + .01);
      setStage(0);
      const goTo = (e) => { const i = Number(e.currentTarget.dataset.go); const st = tl.scrollTrigger; const target = st.start + (i / (N - 1)) * (st.end - st.start) * ((N - 1) / (N - 1 + .35)) + (i ? 4 : 0); scrollTo(target, { duration: 1.6 }); };
      rail.forEach((b) => b.addEventListener('click', goTo));
      return () => { root.classList.remove('has-pin'); rail.forEach((b) => b.removeEventListener('click', goTo)); current = -1; gsap.set([...stages, ...$$('.stage__body > *', sys), ...$$('.stage__media', sys), ...$$('.stage__media img', sys)], { clearProps: 'all' }); };
    });

    mm.add('(max-width: 959px), (prefers-reduced-motion: reduce)', () => {
      stages.forEach((s, i) => {
        ScrollTrigger.create({ trigger: s, start: 'top 55%', end: 'bottom 45%', onToggle: (st) => { if (st.isActive) { current = -1; setStage(i); } } });
        if (!reduce) {
          gsap.from($('.stage__body', s), { y: 50, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: s, start: 'top 82%', once: true } });
          gsap.fromTo($('.stage__media', s), { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'power3.inOut', scrollTrigger: { trigger: s, start: 'top 80%', once: true }, clearProps: 'clipPath' });
          gsap.fromTo($('.stage__media img', s), { scale: 1.35 }, { scale: 1, duration: 1.6, ease: 'power2.out', scrollTrigger: { trigger: s, start: 'top 80%', once: true } });
        }
      });
    });
  }

  /* Intro del hero ------------------------------------------------------- */
  function heroIntro(gl) {
    if (!hasGsap || reduce) { gl && gl.setIn(1); return; }
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    const ginq = { v: 0 };
    tl.to(ginq, { v: 1, duration: 2.4, ease: 'power2.out', onUpdate: () => gl && gl.setIn(ginq.v) }, 0);
    gsap.set('.hl__in', { yPercent: 108 });
    tl.to('[data-hero="kicker"]', { opacity: 1, y: 0, duration: 1 }, .1)
      .to('.hl__in', { yPercent: 0, duration: 1.5, stagger: .13 }, .15)
      .to('[data-hero="sub"]', { opacity: 1, y: 0, duration: 1.2 }, .75)
      .to('[data-hero="cta"]', { opacity: 1, y: 0, duration: 1.2 }, .9)
      .fromTo('.hero__visual', { opacity: 0, scale: .82, rotate: -8 }, { opacity: 1, scale: 1, rotate: 0, duration: 1.8 }, .3)
      .fromTo('.hcard, .htag', { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 1.3, stagger: .09 }, .9)
      .to('.hero__foot', { opacity: 1, duration: 1.2 }, 1.3)
      .to('.hdr', { opacity: 1, duration: .8 }, .4);
  }

  /* UI global: menú, cursor, magnético, WhatsApp ------------------------- */
  let closeMenu = () => {};
  function initUI() {
    const menu = $('#menu'), burger = $('.burger');
    menu.inert = true; $$('.menu li', menu).forEach((li, i) => li.style.setProperty('--i', i));
    closeMenu = () => { if (!menu.classList.contains('is-open')) return; menu.classList.remove('is-open'); menu.inert = true; burger.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-hidden', 'true'); unlockScroll(); };
    burger.addEventListener('click', () => {
      const open = !menu.classList.contains('is-open');
      if (!open) return closeMenu();
      menu.classList.add('is-open'); menu.inert = false; burger.setAttribute('aria-expanded', 'true'); menu.setAttribute('aria-hidden', 'false'); lockScroll(); $('#hdr').classList.remove('is-hidden');
    });
    addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
    addEventListener('resize', () => { if (innerWidth >= 1200) closeMenu(); });

    if (fine) {
      const cur = $('.cursor'), ring = $('.cursor__ring', cur), lab = $('.cursor__ring span', cur);
      let cx = innerWidth / 2, cy = innerHeight / 2, tx = cx, ty = cy;
      addEventListener('pointermove', (e) => { tx = e.clientX; ty = e.clientY; cur.classList.remove('is-hide'); const t = e.target.closest ? e.target : null; if (!t) return;
        const view = t.closest('.pcard__open, .fprod__img'); const link = t.closest('a, button, label, input, textarea, .schip');
        cur.classList.toggle('is-view', !!view); cur.classList.toggle('is-link', !!link && !view); if (view) lab.textContent = 'Ver'; });
      document.addEventListener('pointerleave', () => cur.classList.add('is-hide'));
      (function loop() { cx = lerp(cx, tx, .2); cy = lerp(cy, ty, .2); cur.style.transform = `translate3d(${cx}px,${cy}px,0)`; requestAnimationFrame(loop); })();
      if (hasGsap) $$('[data-magnet]').forEach((el) => {
        const xTo = gsap.quickTo(el, 'x', { duration: .6, ease: 'power3' }), yTo = gsap.quickTo(el, 'y', { duration: .6, ease: 'power3' });
        el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); xTo((e.clientX - r.left - r.width / 2) * .28); yTo((e.clientY - r.top - r.height / 2) * .4); });
        el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
      });
    }
    // burbuja del botón de WhatsApp: aparece sola una vez
    setTimeout(() => { const w = $('.wa-float'); w.classList.add('is-tip'); setTimeout(() => w.classList.remove('is-tip'), 4200); }, 9000);
  }

  /* 10 · ARRANQUE ---------------------------------------------------------- */
  function boot() {
    renderCart(); initCatalog(); initFinder(); initFaq(); initForm(); initPolish(); initUI();
    if (!hasGsap) { root.classList.add('no-anim'); root.classList.remove('is-loading'); $('#loader') && $('#loader').remove(); return; }
    if (reduce) root.classList.add('no-anim');
    if (!reduce) gsap.set('.hdr', { opacity: 0 });
    const gl = initGL();
    initScroll();
    runLoader().then(() => { heroIntro(gl); state.ready = true; ScrollTrigger.refresh(); if (state.lenis) state.lenis.start(); });
    if (!reduce && state.lenis) state.lenis.stop();
    // el hero WebGL reacciona al scroll
    if (gl) ScrollTrigger.create({ trigger: '.hero', start: 'top top', end: 'bottom top', onUpdate: (s) => gl.setScroll(s.progress) });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
