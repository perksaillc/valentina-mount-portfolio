/* Valentina Mount — runtime (markup.js + core.js) */
(function () {
/* Shared markup generators. Runs in Node (tools/build.mjs) and in the browser (js/core.js). */
const WIDTHS = [480, 960, 1600];

function esc(s = '') {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function picHTML(file, opts = {}) {
  const {
    sizes = '(min-width:900px) 40vw, 92vw',
    className = '',
    priority = false,
    maxWidth = 1600,
    base = 'assets/img/',
    ar = true,
  } = opts;
  const ws = WIDTHS.filter(w => w <= maxWidth && (w <= file.w || w === 480));
  const set = ext => ws.map(w => `${base}${file.id}-${w}.${ext} ${Math.min(w, file.w)}w`).join(', ');
  const fallback = `${base}${file.id}-${ws[ws.length - 1]}.webp`;
  const lqip = `${base}${file.id}-lqip.webp`;
  const style = `background-image:url('${lqip}');${ar ? `aspect-ratio:${file.w}/${file.h};` : ''}`;
  const loading = priority ? 'eager' : 'lazy';
  const fp = priority ? ' fetchpriority="high" data-eager=""' : '';
  return `<picture class="pic ${className}" data-lqip style="${style}">` +
    `<source type="image/avif" srcset="${set('avif')}" sizes="${sizes}">` +
    `<source type="image/webp" srcset="${set('webp')}" sizes="${sizes}">` +
    `<img src="${fallback}" width="${file.w}" height="${file.h}" alt="${esc(file.alt)}" loading="${loading}" decoding="async"${fp}>` +
    `</picture>`;
}

function videoHTML(file, opts = {}) {
  const { className = '', base = 'assets/video/' } = opts;
  const poster = `${base}${file.id}-poster.webp`;
  return `<figure class="vid ${className}" data-video="${file.id}" style="aspect-ratio:${file.w}/${file.h}">` +
    `<video muted playsinline loop preload="none" poster="${poster}" width="${file.w}" height="${file.h}" aria-label="${esc(file.alt)}" data-mp4="${base}${file.id}-720.mp4"></video>` +
    `<button class="vid-play" type="button" hidden data-cursor="play">play</button>` +
    `<button class="vid-sound" type="button" aria-pressed="false" data-cursor="play">sound off</button>` +
    `</figure>`;
}

/* Expand <!--pic:ID key="value" flag--> and <!--video:ID ...--> markers in HTML fragments. */
function expandMarkers(html, files) {
  const byId = Object.fromEntries(files.map(f => [f.id, f]));
  return html.replace(/<!--\s*(pic|video):([\w-]+)([^>]*?)-->/g, (m, kind, id, rest) => {
    const file = byId[id];
    if (!file) return `<!-- unknown file ${id} -->`;
    const opts = {};
    for (const [, k, v] of rest.matchAll(/(\w+)="([^"]*)"/g)) opts[k] = v;
    for (const [, k] of rest.matchAll(/(?:^|\s)(priority)(?=\s|$)/g)) opts[k] = true;
    if (opts.maxWidth) opts.maxWidth = +opts.maxWidth;
    if (opts.class) { opts.className = opts.class; delete opts.class; }
    return kind === 'pic' ? picHTML(file, opts) : videoHTML(file, opts);
  });
}

/* ==========================================================================
   Valentina Mount — core
   boot · manifest · helpers · scroll · carousel · theme · nav · menu · lightbox
   reveals · marquee · video
   Expects window.gsap + plugins and window.Lenis to be loaded first.
   ========================================================================== */

const html = document.documentElement;
if (!window.gsap || !window.ScrollTrigger) { console.error('gsap missing: static fallback'); html.classList.add('no-js'); throw new Error('gsap not loaded'); }
html.classList.remove('no-js');

const mq = q => window.matchMedia(q).matches;
const reduce = mq('(prefers-reduced-motion: reduce)');
const isDesktop = mq('(min-width: 900px) and (hover: hover) and (pointer: fine)');
const isTouch = mq('(pointer: coarse)');
const hasHover = mq('(hover: hover) and (pointer: fine)');
if (reduce) html.classList.add('reduce');
if (hasHover) html.classList.add('has-hover');

/* ---------- manifest ---------- */
const manifest = JSON.parse(document.getElementById('files-json')?.textContent || '{"files":[]}');
const files = manifest.files;
const byId = id => files.find(f => f.id === id);
const byCat = cat => files.filter(f => f.cat === cat);

/* ---------- gsap ---------- */
const { gsap } = window;
const { ScrollTrigger, Flip, SplitText, Draggable, InertiaPlugin, ScrambleTextPlugin, Observer } = window;
gsap.registerPlugin(...[ScrollTrigger, Flip, SplitText, Draggable, InertiaPlugin, ScrambleTextPlugin, Observer].filter(Boolean));
ScrollTrigger.config({ ignoreMobileResize: true, limitCallbacks: true });
gsap.defaults({ ease: 'power3.out', duration: .9 });
const mm = gsap.matchMedia();

/* ---------- lenis ---------- */
let lenis = null;
if (window.Lenis && !reduce) {
  lenis = new window.Lenis({ autoRaf: false, anchors: false, lerp: .09, wheelMultiplier: 1, syncTouch: false });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
function scrollTo(target, opts = {}) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (!el) return;
  if (lenis) { lenis.resize(); lenis.scrollTo(el, { duration: reduce ? 0 : 1.1, easing: t => 1 - Math.pow(1 - t, 4), force: true, ...opts }); }
  else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
}

/* ---------- section registry ---------- */
const registry = [];
window.VM = {
  section(name, fn) { registry.push({ name, fn }); },
  files, byId, byCat, pic: picHTML, video: videoHTML, scrollTo,
};

/* ---------- helpers ---------- */
function onVisible(el, cb, { threshold = 0, rootMargin = '0px', once = true } = {}) {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { cb(e); if (once) io.unobserve(e.target); } });
  }, { threshold, rootMargin });
  io.observe(el);
  return io;
}
/* seeded pseudo-random so tilts are stable across loads */
function seeded(i, salt = 1) { const x = Math.sin(i * 9301 + salt * 49297) * 233280; return x - Math.floor(x); }
function rand(i, min, max, salt) { return min + (max - min) * seeded(i, salt); }
const wait = ms => new Promise(r => setTimeout(r, ms));
const pad = n => String(n).padStart(2, '0');
const ARROW = dir => `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="${dir < 0 ? 'M20 12H5m6-7-7 7 7 7' : 'M4 12h15m-6-7 7 7-7 7'}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square"/></svg>`;

/* ---------- image load state (also catches pictures sections build later) ---------- */
document.addEventListener('load', e => { const t = e.target; if (t.tagName === 'IMG' && t.closest('.pic')) t.classList.add('is-loaded'); }, true);
function watchImages(root = document) {
  root.querySelectorAll('.pic img').forEach(img => {
    if (img.complete && img.naturalWidth) img.classList.add('is-loaded');
    else img.addEventListener('load', () => img.classList.add('is-loaded'), { once: true });
  });
}

/* ---------- reveals ---------- */
function reveal(targets, opts = {}) {
  const els = gsap.utils.toArray(targets);
  if (!els.length) return;
  if (reduce) { gsap.set(els, { opacity: 1, clearProps: 'transform' }); return; }
  els.forEach((el, i) => {
    gsap.fromTo(el, { opacity: 0, y: opts.y ?? (isDesktop ? 60 : 30) }, {
      opacity: 1, y: 0, duration: opts.duration ?? .9, ease: opts.ease ?? 'power3.out',
      delay: opts.stagger ? i * opts.stagger : 0,
      scrollTrigger: { trigger: opts.trigger || el, start: opts.start || 'top 88%', once: true },
      onComplete: () => el.classList.add('is-done'),
    });
  });
}
function splitReveal(el) {
  const type = el.dataset.split || 'lines';
  if (reduce || !SplitText) { el.style.opacity = 1; return; }
  const split = SplitText.create(el, { type: type === 'chars' ? 'chars,words' : 'lines', mask: type === 'chars' ? 'chars' : 'lines', autoSplit: true, linesClass: 'ln' });
  const targets = type === 'chars' ? split.chars : split.lines;
  gsap.set(el, { opacity: 1 });
  gsap.from(targets, {
    yPercent: 110, rotation: type === 'chars' ? 4 : 0, duration: 1, ease: 'expo.out',
    stagger: type === 'chars' ? { each: .025, from: 'random' } : .08,
    scrollTrigger: { trigger: el, start: 'top 88%', once: true },
  });
}

/* ---------- marquee ---------- */
function marquee(el, { speed = 70, reverse = false, velocity = true } = {}) {
  const track = el.querySelector('.marquee-track');
  if (!track) return;
  const items = [...track.children];
  const fill = () => {
    const w = track.scrollWidth;
    while (track.scrollWidth < el.clientWidth * 2 + w) items.forEach(n => track.appendChild(n.cloneNode(true)));
  };
  fill();
  if (reduce) return;
  const unit = items.reduce((a, n) => a + n.getBoundingClientRect().width, 0);
  const dur = unit / speed;
  gsap.set(track, { x: reverse ? -unit : 0 });
  const tween = gsap.to(track, { x: reverse ? 0 : -unit, duration: dur, ease: 'none', repeat: -1,
    modifiers: { x: gsap.utils.unitize(gsap.utils.wrap(-unit, 0)) } });
  if (velocity) {
    const proxy = { ts: 1 };
    ScrollTrigger.create({
      onUpdate(self) {
        const v = gsap.utils.clamp(-3000, 3000, self.getVelocity());
        gsap.to(proxy, { ts: 1 + Math.abs(v) / 900, duration: .3, overwrite: true, onUpdate: () => tween.timeScale(proxy.ts) });
        gsap.to(proxy, { ts: 1, duration: 1.2, delay: .3, overwrite: false, onUpdate: () => tween.timeScale(proxy.ts) });
      },
    });
  }
  return tween;
}

/* ---------- cursor ----------
   The pointer is the system cursor with a custom SVG design (see base.css, --cur-*).
   `cursor` stays in ctx so older section code calling cursor.set()/clear() keeps working. */
const cursor = { set() {}, clear() {} };

/* ---------- carousel ----------
   A native scroll-snap rail (works with touch, trackpad and wheel) plus:
   autoplay that advances every `interval` ms while the rail is on screen, prev/next buttons,
   a 01 / 05 counter, a progress line that fills until the next slide, arrow keys,
   and mouse drag-to-scroll. Autoplay pauses while hovered, focused or touched, and for
   8 s after any manual move; it never runs with reduced motion.
   Vertical gestures over the rail always scroll the page (data-lenis-prevent-horizontal). */
function carousel(rail, opts = {}) {
  const { slides: sel = ':scope > *', interval = 4800, controls, label = 'slides', onChange } = opts;
  const slides = [...rail.querySelectorAll(sel)];
  if (slides.length < 2) return null;
  rail.removeAttribute('data-lenis-prevent');
  rail.setAttribute('data-lenis-prevent-horizontal', '');
  rail.classList.add('car');
  if (!rail.hasAttribute('tabindex')) rail.tabIndex = 0;
  if (!rail.getAttribute('role')) rail.setAttribute('role', 'region');
  if (!rail.getAttribute('aria-label')) rail.setAttribute('aria-label', label);
  rail.setAttribute('aria-roledescription', 'carousel');

  let ctl = controls === false ? null : controls;
  if (controls !== false) {
    if (!ctl) { ctl = document.createElement('div'); rail.insertAdjacentElement('afterend', ctl); }
    ctl.classList.add('car-ctl');
    ctl.innerHTML = `<button type="button" class="car-btn car-prev" aria-label="previous">${ARROW(-1)}</button>` +
      `<span class="car-pos" aria-live="polite"><b>01</b><i>/</i>${pad(slides.length)}</span>` +
      `<span class="car-bar" aria-hidden="true"><i></i></span>` +
      `<button type="button" class="car-btn car-next" aria-label="next">${ARROW(1)}</button>`;
  }
  const posEl = ctl?.querySelector('.car-pos b');
  const barEl = ctl?.querySelector('.car-bar i');

  let index = -1, timer = 0, idle = 0, settle = 0, visible = false, hover = false, focus = false, held = false, programmatic = false, bar = null;
  const maxScroll = () => rail.scrollWidth - rail.clientWidth;
  const offset = s => s.offsetLeft - slides[0].offsetLeft;
  const nearest = () => {
    const x = rail.scrollLeft;
    if (x >= maxScroll() - 4) return slides.length - 1;
    let best = 0;
    slides.forEach((s, i) => { if (Math.abs(offset(s) - x) < Math.abs(offset(slides[best]) - x)) best = i; });
    return best;
  };
  const canPlay = () => !reduce && interval > 0 && visible && !hover && !focus && !held && !document.hidden;
  const schedule = () => {
    clearTimeout(timer); bar?.kill(); bar = null;
    if (barEl) gsap.set(barEl, { scaleX: 0 });
    if (!canPlay()) return;
    if (barEl) bar = gsap.fromTo(barEl, { scaleX: 0 }, { scaleX: 1, duration: interval / 1000, ease: 'none' });
    timer = setTimeout(() => go(index + 1), interval);
  };
  const setIndex = i => {
    if (i !== index) {
      index = i;
      if (posEl) posEl.textContent = pad(i + 1);
      slides.forEach((s, k) => s.classList.toggle('is-current', k === i));
      onChange?.(i, slides[i]);
      rail.dispatchEvent(new CustomEvent('car:change', { detail: { index: i, slide: slides[i] } }));
    }
    schedule();
  };
  function go(i, user = false) {
    i = (i + slides.length) % slides.length;
    programmatic = true;
    rail.scrollTo({ left: Math.min(offset(slides[i]), maxScroll()), behavior: reduce ? 'auto' : 'smooth' });
    setIndex(i);
    if (user) pause();
  }
  const pause = () => { held = true; schedule(); clearTimeout(idle); idle = setTimeout(() => { held = false; schedule(); }, 8000); };

  rail.addEventListener('scroll', () => {
    clearTimeout(settle);
    settle = setTimeout(() => { if (!programmatic) setIndex(nearest()); programmatic = false; }, 140);
  }, { passive: true });
  ['touchstart', 'wheel'].forEach(t => rail.addEventListener(t, e => { if (t === 'wheel' && Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return; programmatic = false; pause(); }, { passive: true }));
  rail.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { hover = true; schedule(); } });
  rail.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { hover = false; schedule(); } });
  rail.addEventListener('focusin', () => { focus = true; schedule(); });
  rail.addEventListener('focusout', () => { focus = false; schedule(); });
  rail.addEventListener('keydown', e => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault(); e.stopPropagation(); go(index + (e.key === 'ArrowRight' ? 1 : -1), true);
  });
  ctl?.querySelector('.car-prev')?.addEventListener('click', () => go(index - 1, true));
  ctl?.querySelector('.car-next')?.addEventListener('click', () => go(index + 1, true));

  /* mouse drag-to-scroll; a press that travels > 6px never opens the lightbox */
  let drag = null;
  rail.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    drag = { x: e.clientX, left: rail.scrollLeft, moved: false, id: e.pointerId };
  });
  rail.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > 6) { drag.moved = true; rail.classList.add('is-dragging'); rail.setPointerCapture?.(e.pointerId); pause(); }
    if (drag.moved) rail.scrollLeft = drag.left - dx;
  });
  const endDrag = () => {
    if (!drag) return;
    const moved = drag.moved; drag = null;
    if (!moved) return;
    rail.classList.remove('is-dragging');
    go(nearest(), true);
    suppress = true; setTimeout(() => { suppress = false; }, 0);
  };
  let suppress = false;
  rail.addEventListener('click', ev => { if (suppress) { ev.preventDefault(); ev.stopPropagation(); } }, true);
  rail.addEventListener('pointerup', endDrag);
  rail.addEventListener('pointercancel', endDrag);
  rail.addEventListener('dragstart', e => e.preventDefault());

  const io = new IntersectionObserver(es => es.forEach(e => { visible = e.isIntersecting && e.intersectionRatio >= .35; schedule(); }), { threshold: [0, .35, .7] });
  io.observe(rail);
  const onVis = () => schedule();
  document.addEventListener('visibilitychange', onVis);
  setIndex(0);

  return {
    slides, go: i => go(i, true), next: () => go(index + 1, true), prev: () => go(index - 1, true),
    get index() { return index; },
    destroy() { clearTimeout(timer); clearTimeout(idle); bar?.kill(); io.disconnect(); document.removeEventListener('visibilitychange', onVis); if (ctl && !controls) ctl.remove(); },
  };
}

/* ---------- theme + nav ---------- */
const sections = [...document.querySelectorAll('main > .sec[data-n]')];
const rail = document.querySelector('.rail ol');
const tabCur = document.querySelector('.tabbar .cur');
const themeMeta = document.querySelector('meta[name="theme-color"]');
let current = null;

sections.forEach(s => {
  if (!rail) return;
  const a = document.createElement('a');
  a.href = `#${s.id}`; a.dataset.for = s.id;
  a.innerHTML = `<span class="n">${s.dataset.n}</span><span class="lbl">${s.dataset.label || s.id}</span>`;
  a.addEventListener('click', e => { e.preventDefault(); scrollTo(s); });
  const li = document.createElement('li'); li.appendChild(a); rail.appendChild(li);
});

function setTheme(s) {
  if (s === current) return;
  current = s;
  gsap.to(html, { '--bg': s.dataset.bg, '--ink': s.dataset.ink, '--accent': s.dataset.accent, duration: reduce ? 0 : .8, ease: 'power2.inOut', overwrite: 'auto' });
  themeMeta?.setAttribute('content', s.dataset.bg);
  document.querySelectorAll('.rail a, #index .index-list a').forEach(a => {
    const on = a.dataset.for === s.id;
    a.classList.toggle('is-active', on);
    if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
  });
  if (tabCur) {
    tabCur.querySelector('.n').textContent = s.dataset.n;
    const lbl = tabCur.querySelector('.lbl');
    const text = s.dataset.label || s.id;
    if (ScrambleTextPlugin && !reduce) gsap.to(lbl, { duration: .5, scrambleText: { text, chars: 'X#/_-', speed: .6 } });
    else lbl.textContent = text;
  }
  const dark = luma(s.dataset.bg) < .5;
  html.classList.toggle('is-dark', dark); html.classList.toggle('is-light', !dark);
  document.dispatchEvent(new CustomEvent('vm:section', { detail: { id: s.id } }));
}
function luma(hex) { const n = parseInt(hex.slice(1), 16); const r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255; return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; }

sections.forEach(s => ScrollTrigger.create({ trigger: s, start: 'top 50%', end: 'bottom 50%', onEnter: () => setTheme(s), onEnterBack: () => setTheme(s) }));
if (sections[0]) setTheme(sections[0]);

/* progress lines */
const railBar = document.querySelector('.rail-progress > i');
const tabBar = document.querySelector('.tabbar-progress');
ScrollTrigger.create({ trigger: document.body, start: 0, end: 'max', onUpdate(self) { if (railBar) railBar.style.transform = `scaleY(${self.progress})`; if (tabBar) tabBar.style.transform = `scaleX(${self.progress})`; } });

/* tab bar arrows + wordmark */
document.querySelectorAll('.tabbar .arrows button').forEach(b => b.addEventListener('click', () => step(b.dataset.dir === 'next' ? 1 : -1)));
document.querySelector('.wordmark')?.addEventListener('click', e => { e.preventDefault(); scrollTo(sections[0]); });
function step(dir) {
  const i = sections.indexOf(current);
  const next = sections[Math.min(sections.length - 1, Math.max(0, i + dir))];
  if (next) scrollTo(next);
}

/* ---------- menu (burger → full-screen list) ---------- rows + a moving strip of every piece */
const index = document.getElementById('index');
const burger = document.querySelector('.menu-btn');
const indexList = index?.querySelector('.index-list');
let indexOpen = false, lastFocus = null;

if (index && indexList) {
  sections.forEach((s, i) => {
    const ids = new Set([...s.querySelectorAll('.lb[data-lb]:not([data-lb-alias]), .vid[data-video]')].map(n => n.dataset.lb || n.dataset.video));
    const count = ids.size;
    const cover = s.dataset.cover && count ? byId(s.dataset.cover) : null;
    const a = document.createElement('a');
    a.href = `#${s.id}`; a.dataset.for = s.id;
    a.innerHTML = `<span class="n">${s.dataset.n}</span><span class="w"><span>${s.dataset.label || s.id}</span></span>` +
      `<span class="meta">${count ? count + (count === 1 ? ' piece' : ' pieces') : ''}</span>` +
      (cover ? `<span class="thumb" aria-hidden="true">${picHTML(cover, { sizes: '64px', maxWidth: 480, ar: false })}</span>` : '');
    a.addEventListener('click', e => { e.preventDefault(); closeIndex(() => scrollTo(s)); });
    indexList.appendChild(a);
  });
  indexList.style.setProperty('--rows', Math.ceil(sections.length / 2));
  /* a moving strip of every piece along the bottom of the menu; a click closes the menu and opens that piece */
  const strip = document.createElement('div');
  strip.className = 'index-strip marquee';
  strip.setAttribute('aria-label', 'all pieces');
  const stripFiles = files.filter(f => (f.type || '').toLowerCase() !== 'mov' && document.querySelector(`main .lb[data-lb="${f.id}"]`));
  strip.innerHTML = `<div class="marquee-track">${stripFiles.map(f => `<button type="button" class="index-piece" data-piece="${f.id}" style="aspect-ratio:${f.w}/${f.h}" aria-label="open ${f.title.replace(/"/g, '&quot;')}">${picHTML(f, { sizes: '160px', maxWidth: 480, ar: false })}</button>`).join('')}</div>`;
  index.querySelector('.index-inner')?.appendChild(strip);
  strip.addEventListener('click', e => { const b = e.target.closest('.index-piece'); if (b) closeIndex(() => openLightbox(b.dataset.piece, document.querySelector(`main .lb[data-lb="${b.dataset.piece}"]`))); });
  let stripOn = false;
  index.addEventListener('vm:menu-open', () => { if (stripOn) return; stripOn = true; requestAnimationFrame(() => marquee(strip, { speed: 40, velocity: false })); });
  if (current) indexList.querySelectorAll('a').forEach(a => { if (a.dataset.for === current.id) a.setAttribute('aria-current', 'true'); });

}
function openIndex() {
  if (!index || indexOpen) return;
  indexOpen = true; lastFocus = document.activeElement;
  index.showModal(); lenis?.stop(); document.body.style.overflow = 'hidden';
  burger?.setAttribute('aria-expanded', 'true'); burger?.classList.add('is-open');
  const items = index.querySelectorAll('.index-list .w > span, .index-list .n, .index-list .meta');
  gsap.set(index, { clipPath: 'inset(0 0 100% 0)' });
  gsap.to(index, { clipPath: 'inset(0 0 0% 0)', duration: reduce ? 0 : .6, ease: 'expo.out' });
  gsap.fromTo(items, { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: reduce ? 0 : .7, ease: 'expo.out', stagger: reduce ? 0 : .025, delay: reduce ? 0 : .12 });
  index.querySelector('.index-close')?.focus();
  index.dispatchEvent(new CustomEvent('vm:menu-open'));
}
function closeIndex(after) {
  if (!index || !indexOpen) return;
  indexOpen = false;
  burger?.setAttribute('aria-expanded', 'false'); burger?.classList.remove('is-open');
  gsap.to(index, { clipPath: 'inset(0 0 100% 0)', duration: reduce ? 0 : .45, ease: 'expo.inOut',
    onComplete() {
      index.close(); lenis?.start(); document.body.style.overflow = '';
      if (typeof after === 'function') after(); else lastFocus?.focus?.({ preventScroll: true });
    } });
}
burger?.addEventListener('click', () => indexOpen ? closeIndex() : openIndex());
index?.querySelector('.index-close')?.addEventListener('click', () => closeIndex());
index?.addEventListener('cancel', e => { e.preventDefault(); closeIndex(); });

/* ---------- keyboard ---------- */
document.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  if (e.key === 'Escape') { if (lightboxOpen) closeLightbox(); else if (indexOpen) closeIndex(); return; }
  if (lightboxOpen) { if (e.key === 'ArrowRight') { e.preventDefault(); lbStep(1); } if (e.key === 'ArrowLeft') { e.preventDefault(); lbStep(-1); } return; }
  if (e.key === 'm' || e.key === 'M') { indexOpen ? closeIndex() : openIndex(); return; }
  if (indexOpen) return;
  if (/^[0-9]$/.test(e.key)) { const n = e.key === '0' ? 10 : +e.key; const s = sections[n - 1]; if (s) scrollTo(s); }
  if (e.key === '-') scrollTo(sections[sections.length - 1]);
  if (e.key === 'j') step(1);
  if (e.key === 'k') step(-1);
});

/* ---------- lightbox ----------
   One sequence for the whole site, in page order: the arrows (and swipe, and ← →)
   walk from the last collage straight into sculpture and so on. */
const lb = document.getElementById('lightbox');
let lightboxOpen = false, lbGroup = [], lbIndex = 0, lbFrom = null, lbScroll = 0;
const lbStage = lb?.querySelector('.lightbox-stage');
const lbInert = on => document.querySelectorAll('body > .skip, body > header, body > nav, body > main').forEach(n => { n.inert = on; });
function lbList() {
  const seen = new Set(), out = [];
  /* aliases (a piece repeated as a preview elsewhere, e.g. the about stack) don't decide the order */
  document.querySelectorAll('main .lb[data-lb]:not([data-lb-alias])').forEach(b => { const id = b.dataset.lb; if (!seen.has(id) && byId(id)) { seen.add(id); out.push(id); } });
  return out;
}
function sectionOf(id) { const b = document.querySelector(`main .lb[data-lb="${id}"]:not([data-lb-alias])`) || document.querySelector(`main .lb[data-lb="${id}"]`); return b?.closest('.sec'); }
function flipFrom(from, to) {
  const s = Math.max(from.width / to.width, from.height / to.height);
  const ix = Math.max(0, (to.width * s - from.width) / 2 / s), iy = Math.max(0, (to.height * s - from.height) / 2 / s);
  return { x: from.left + from.width / 2 - (to.left + to.width / 2), y: from.top + from.height / 2 - (to.top + to.height / 2), scale: s, clipPath: `inset(${iy}px ${ix}px)`, transformOrigin: '50% 50%' };
}
const onScreen = r => r.width > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
function lbMarkup(f) {
  return picHTML(f, { sizes: '92vw', maxWidth: 1600, className: 'lb-pic', ar: false }).replace('loading="lazy"', 'loading="eager" data-eager=""');
}
function openLightbox(id, fromEl) {
  const f = byId(id); if (!lb || !f) return;
  lbGroup = lbList();
  lbIndex = Math.max(0, lbGroup.indexOf(id));
  lbFrom = fromEl; lbScroll = window.scrollY;
  lightboxOpen = true; lb.hidden = false; lbInert(true); lenis?.stop(); document.body.style.overflow = 'hidden';
  renderLb(f);
  const pic = lbStage.querySelector('.pic');
  if (fromEl && !reduce) {
    gsap.fromTo(pic, flipFrom(fromEl.getBoundingClientRect(), pic.getBoundingClientRect()), { x: 0, y: 0, scale: 1, clipPath: 'inset(0px 0px)', duration: .6, ease: 'expo.out', clearProps: 'transform,clipPath' });
    gsap.fromTo(lb, { backgroundColor: 'rgba(13,2,8,0)' }, { backgroundColor: 'rgba(13,2,8,1)', duration: .5 });
    gsap.fromTo(lb.querySelectorAll('.lightbox-bar, .lightbox-cap, .lightbox-nav'), { opacity: 0 }, { opacity: 1, duration: .4, delay: .2 });
  }
  lb.querySelector('.lightbox-close')?.focus();
}
function renderLb(f) {
  lbStage.querySelector('.pic')?.remove();
  lbStage.insertAdjacentHTML('afterbegin', lbMarkup(f));
  const pic = lbStage.querySelector('.pic');
  pic.style.setProperty('--ar', `${f.w}/${f.h}`);
  pic.style.setProperty('--arn', (f.w / f.h).toFixed(4));
  const sec = sectionOf(f.id);
  lb.querySelector('.lightbox-cap .t').textContent = f.caption || f.title;
  lb.querySelector('.lightbox-cap .m').textContent = f.title;
  lb.querySelector('.lightbox-bar .where').textContent = sec ? `${sec.dataset.n} / ${sec.dataset.label}` : '';
  lb.querySelector('.lightbox-bar .pos').textContent = `${pad(lbIndex + 1)} / ${pad(lbGroup.length)}`;
  lb.querySelectorAll('.lightbox-nav').forEach(b => { b.hidden = lbGroup.length < 2; });
  /* warm the neighbours so the arrows feel instant */
  [1, -1].forEach(d => { const n = byId(lbGroup[(lbIndex + d + lbGroup.length) % lbGroup.length]); if (n) { const im = new Image(); im.src = `assets/img/${n.id}-${n.w >= 960 ? 960 : 480}.webp`; } });
}
function lbStep(dir) {
  if (lbGroup.length < 2) return;
  lbIndex = (lbIndex + dir + lbGroup.length) % lbGroup.length;
  const f = byId(lbGroup[lbIndex]);
  const old = lbStage.querySelector('.pic');
  if (reduce || !old) { renderLb(f); return; }
  gsap.to(old, { xPercent: dir * -6, opacity: 0, duration: .22, ease: 'power2.in', onComplete() {
    renderLb(f);
    gsap.fromTo(lbStage.querySelector('.pic'), { xPercent: dir * 6, opacity: 0 }, { xPercent: 0, opacity: 1, duration: .4, ease: 'power3.out' });
  } });
}
function closeLightbox() {
  if (!lightboxOpen) return;
  const pic = lbStage.querySelector('.pic');
  const id = lbGroup[lbIndex];
  const target = (lbFrom?.closest('.sec')?.querySelector(`.lb[data-lb="${id}"]`)) || document.querySelector(`main .lb[data-lb="${id}"]`) || lbFrom;
  const done = () => {
    lb.hidden = true; lightboxOpen = false; lbInert(false); lenis?.start(); document.body.style.overflow = '';
    gsap.set(lb.querySelectorAll('.lightbox-bar, .lightbox-cap, .lightbox-nav'), { clearProps: 'opacity' });
    target?.focus?.({ preventScroll: true });
  };
  const r = target?.getBoundingClientRect();
  if (target && r && onScreen(r) && !reduce && pic) {
    gsap.to(pic, { ...flipFrom(r, pic.getBoundingClientRect()), duration: .45, ease: 'expo.inOut' });
    gsap.to(lb, { backgroundColor: 'rgba(13,2,8,0)', duration: .45, onComplete: done });
    gsap.to(lb.querySelectorAll('.lightbox-bar, .lightbox-cap, .lightbox-nav'), { opacity: 0, duration: .2 });
  } else if (!reduce && pic) {
    gsap.to(lb, { opacity: 0, duration: .3, onComplete() { gsap.set(lb, { clearProps: 'opacity' }); done(); } });
  } else done();
}
window.VM.lightbox = { open: openLightbox, close: closeLightbox };
document.addEventListener('click', e => {
  const b = e.target.closest('.lb[data-lb]');
  if (b && !b.closest('#lightbox')) { e.preventDefault(); openLightbox(b.dataset.lb, b); }
});
lb?.querySelector('.lightbox-close')?.addEventListener('click', closeLightbox);
lb?.querySelector('.lightbox-nav.prev')?.addEventListener('click', () => lbStep(-1));
lb?.querySelector('.lightbox-nav.next')?.addEventListener('click', () => lbStep(1));
lb?.addEventListener('click', e => { if (e.target === lb || e.target === lbStage) closeLightbox(); });
if (lb) {
  let sx = 0, sy = 0;
  lb.addEventListener('pointerdown', e => { sx = e.clientX; sy = e.clientY; });
  lb.addEventListener('pointerup', e => { const dx = e.clientX - sx, dy = e.clientY - sy; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) lbStep(dx < 0 ? 1 : -1); });
}

/* ---------- lazy video ---------- */
let unmuted = null;
function initVideo(fig) {
  const v = fig.querySelector('video'); if (!v || fig.dataset.ready) return;
  fig.dataset.ready = '1';
  const playBtn = fig.querySelector('.vid-play');
  const soundBtn = fig.querySelector('.vid-sound');
  let loaded = false;
  const load = () => { if (loaded) return; loaded = true; const s = document.createElement('source'); s.src = v.dataset.mp4; s.type = 'video/mp4'; v.appendChild(s); v.load(); };
  const tryPlay = () => { if (reduce) { if (playBtn) playBtn.hidden = false; return; } v.play().then(() => { if (playBtn) playBtn.hidden = true; }).catch(() => { if (playBtn) playBtn.hidden = false; }); };
  onVisible(fig, load, { rootMargin: '300px', once: true });
  new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && e.intersectionRatio >= .5) { load(); tryPlay(); } else { v.pause(); } }), { threshold: [0, .5] }).observe(fig);
  playBtn?.addEventListener('click', () => { load(); v.play().then(() => playBtn.hidden = true).catch(() => {}); });
  soundBtn?.addEventListener('click', () => {
    const on = v.muted;
    if (on && unmuted && unmuted !== v) {
      unmuted.muted = true;
      const ob = unmuted.closest('.vid')?.querySelector('.vid-sound');
      if (ob) { ob.setAttribute('aria-pressed', 'false'); ob.textContent = 'sound off'; }
    }
    v.muted = !on; unmuted = on ? v : null;
    soundBtn.setAttribute('aria-pressed', String(on)); soundBtn.textContent = on ? 'sound on' : 'sound off';
    if (on && v.paused) v.play().catch(() => {});
  });
}

/* ---------- ready gate (fonts + hero image, never longer than 1.2 s) ---------- */
async function readyGate() {
  const heroImg = document.querySelector('#hero img');
  await Promise.race([Promise.all([document.fonts?.ready, heroImg?.decode?.().catch(() => {})]), wait(1200)]);
}
function jumpToHash() {
  if (!location.hash || location.hash.length < 2) return;
  const t = document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (!t) return;
  if (lenis) { lenis.resize(); lenis.scrollTo(t, { immediate: true, force: true }); } else t.scrollIntoView({ behavior: 'auto', block: 'start' });
  ScrollTrigger.update();
}

/* failsafe: artwork must never stay invisible (e.g. an entrance tween skipped by a jump) */
function unhideStuck() {
  document.querySelectorAll('main .lb, main .vid, main .print, main [data-reveal]').forEach(n => {
    const r = n.getBoundingClientRect();
    if (!onScreen(r)) return;
    if (parseFloat(getComputedStyle(n).opacity) < .05 && !gsap.isTweening(n) && !n.closest('[data-stack]')) gsap.to(n, { opacity: 1, duration: .4 });
  });
}

/* ---------- boot ---------- */
const ctxBase = { gsap, ScrollTrigger, Flip, SplitText, Draggable, InertiaPlugin, Observer, lenis, mm, isDesktop, isTouch, hasHover, reduce, files, byId, byCat, pic: picHTML, video: videoHTML, cursor, carousel, marquee, reveal, onVisible, scrollTo, rand, watchImages };
window.VM.ctx = ctxBase;

async function boot() {
  lenis?.stop();
  watchImages();
  document.querySelectorAll('.vid[data-video]').forEach(initVideo);
  registry.forEach(({ name, fn }) => {
    const el = document.getElementById(name);
    if (!el) return;
    try { fn({ ...ctxBase, el }); } catch (err) { console.error(`[section ${name}]`, err); }
  });
  document.querySelectorAll('.vid[data-video]').forEach(initVideo); /* videos a section injected */
  watchImages();
  await Promise.race([document.fonts?.ready || Promise.resolve(), wait(1200)]);
  document.querySelectorAll('[data-split]').forEach(splitReveal);
  reveal('[data-reveal]');
  ScrollTrigger.refresh();
  await readyGate();
  lenis?.start();
  const settle = () => { ScrollTrigger.refresh(); lenis?.resize(); jumpToHash(); };
  settle();
  document.dispatchEvent(new CustomEvent('vm:ready'));
  if (document.readyState === 'complete') requestAnimationFrame(settle); else window.addEventListener('load', settle, { once: true });
  window.addEventListener('hashchange', jumpToHash);
  let stuckT = 0;
  ScrollTrigger.addEventListener('scrollEnd', () => { clearTimeout(stuckT); stuckT = setTimeout(unhideStuck, 1600); });
}
if (document.readyState === 'complete') boot(); else document.addEventListener('DOMContentLoaded', boot);
document.addEventListener('visibilitychange', () => { if (document.hidden) gsap.ticker.sleep?.(); else gsap.ticker.wake?.(); });

})();
