/* ===== 01-hero.js ===== */
VM.section('hero', ({ gsap, mm, reduce, hasHover, el, marquee, scrollTo }) => {
  const print = el.querySelector('.hero-print');
  const copy = el.querySelector('.hero-copy');
  const name = el.querySelector('.hero-name');
  const words = name.querySelectorAll('.w');
  const sub = el.querySelector('.hero-sub');
  const items = sub.querySelectorAll('li');
  const cap = el.querySelector('.hero-cap');
  const rot = parseFloat(getComputedStyle(print).getPropertyValue('--rot')) || 0;

  marquee(el.querySelector('.hero-marquee'), { speed: 90 });

  /* every link in the column (the eight sections and the label's 04) glides there instead of the browser's hard hash jump */
  copy.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    const t = a && document.querySelector(a.getAttribute('href'));
    if (t) { e.preventDefault(); scrollTo(t); }
  });

  /* desktop: the column is a fixed box and the name shrinks to what the sections and the label leave free.
     Their heights only depend on the width (and the label on the box height), never on the name, so this can't loop. */
  const fit = () => {
    const g = parseFloat(getComputedStyle(copy).rowGap) || 0;
    copy.style.setProperty('--rest', `${Math.ceil(sub.offsetHeight + cap.offsetHeight + 2 * g)}px`);
  };
  fit();
  if (window.ResizeObserver) { const ro = new ResizeObserver(fit); [copy, sub, cap].forEach(n => ro.observe(n)); }
  document.fonts?.ready.then(fit);

  /* the name, the sections and the label start hidden in CSS with a late CSS fallback reveal (scripts that never run).
     Take over from it, unless a very slow load already let it start. Reduced motion: CSS shows them at once. */
  const hidden = [...words, ...items, cap];
  const late = hidden.some(n => n.getAnimations?.().some(a => (a.currentTime || 0) > 2800));
  let played = reduce || late;
  if (!played) hidden.forEach(n => { n.style.animation = 'none'; });

  /* the artwork is never hidden: the print only sways on its tape and settles back to its own tilt */
  const intro = () => {
    if (played) return;
    played = true;
    gsap.timeline({ defaults: { ease: 'expo.out' } })
      .to(words, { y: 0, duration: 1.1, stagger: .12 }, 0)
      .fromTo(items, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .8, stagger: .06 }, .35)
      .to(cap, { opacity: 1, duration: .8 }, .75)
      .to(print, { keyframes: { rotation: [rot, rot + 2.2, rot - 1.1, rot + .45, rot], easeEach: 'sine.inOut' }, duration: 2.4, ease: 'none' }, 0);
  };
  /* play as soon as the fonts are in; core's vm:ready also waits for the hero image, so it is only a backstop */
  document.fonts?.ready.then(intro, intro);
  document.addEventListener('vm:ready', intro, { once: true });
  setTimeout(intro, 1500);

  if (reduce) return;
  /* side-by-side layout only (the CSS stacks below 900px and at 4:5 or taller): while the hero scrolls away the
     column and the print rise a little faster than the page, the print most. Nothing ever moves down, so the
     print can't reach the band; the column rises as one block, so its gaps never change. */
  mm.add('(min-width: 900px) and (min-aspect-ratio: 801/1000)', () => {
    const st = { trigger: el, start: 'top top', end: 'bottom top', scrub: .6 };
    gsap.to(print, { y: -60, ease: 'none', scrollTrigger: { ...st } });
    gsap.to(copy, { y: -30, ease: 'none', scrollTrigger: { ...st } });
    if (!hasHover) return;
    const px = gsap.quickTo(print, 'x', { duration: 1.2, ease: 'power3.out' });
    const nx = gsap.quickTo(name, 'x', { duration: 1.5, ease: 'power3.out' });
    const move = e => { const k = e.clientX / window.innerWidth - .5; px(k * 18); nx(k * 8); };
    el.addEventListener('pointermove', move);
    return () => el.removeEventListener('pointermove', move);
  });
});

/* ===== 02-about.js ===== */
VM.section('about', ({ gsap, reduce, byId, rand, scrollTo, onVisible, el }) => {
  const go = scrollTo || window.VM.scrollTo;
  const sec = id => document.getElementById(id);

  /* video phrases only when the video section exists */
  if (!sec('video')) el.querySelectorAll('.ab-vid').forEach(n => n.remove());

  /* ---------- the stack ---------- */
  const stack = el.querySelector('.ab-stack');
  const prints = [...el.querySelectorAll('.ab-print')].filter(p => sec(p.dataset.sec));
  el.querySelectorAll('.ab-print').forEach(p => { if (!prints.includes(p)) p.remove(); });
  const cap = el.querySelector('.ab-cap');
  const capSec = cap.querySelector('.ab-cap-sec');
  const capT = cap.querySelector('.ab-cap-t');
  const words = [...el.querySelectorAll('.ab-w')].filter(w => sec(w.dataset.key));
  el.querySelectorAll('.ab-w').forEach(w => { if (!words.includes(w)) w.replaceWith(...w.childNodes); });

  const rot = prints.map((p, i) => {
    const f = byId(p.dataset.lb);
    if (f && f.w > f.h) p.classList.add('is-land');
    const s = sec(p.dataset.sec);
    p.dataset.label = `${s.dataset.n} / ${s.dataset.label}`;
    p.setAttribute('aria-label', `open: ${f?.title || ''}`);
    const r = rand(i + 3, -7, 7, 21);
    p.style.setProperty('--r', `${r.toFixed(2)}deg`);
    p.style.zIndex = String(prints.length - i);
    return r;
  });
  gsap.set(prints, { x: 0, y: 0, xPercent: -50, yPercent: -50, rotation: i => rot[i] });

  let z = prints.length, top = 0, busy = false;
  const setCaption = i => {
    const p = prints[i]; const s = sec(p.dataset.sec); const f = byId(p.dataset.lb);
    capSec.href = `#${s.id}`;
    capSec.querySelector('.n').textContent = s.dataset.n;
    capSec.querySelector('.l').textContent = s.dataset.label;
    capT.textContent = f?.title || '';
    prints.forEach((q, k) => q.classList.toggle('is-top', k === i));
    words.forEach(w => w.classList.toggle('is-on', w.dataset.key === p.dataset.key));
    rows().forEach(a => a.classList.toggle('is-on', a.dataset.key === p.dataset.key));
  };
  /* pull the chosen print out to the side and lay it back down on top of the pile */
  function bring(i) {
    if (i < 0 || i === top || busy) return;
    top = i; z += 1;
    const p = prints[i];
    setCaption(i);
    if (reduce) { p.style.zIndex = String(z); return; }
    busy = true;
    gsap.timeline({ onComplete: () => { busy = false; } })
      .to(p, { xPercent: 12, yPercent: -54, rotation: rot[i] + 10, duration: .3, ease: 'power2.in' })
      .add(() => { p.style.zIndex = String(z); })
      .to(p, { xPercent: -50, yPercent: -50, rotation: rot[i], duration: .55, ease: 'power3.out' });
  }
  const indexOfKey = key => prints.findIndex(p => p.dataset.key === key);
  setCaption(top);

  /* it shuffles by itself while on screen, and holds still while you are pointing at the words, the pile or the sheet */
  let visible = false, hold = false, timer = 0;
  const loop = () => {
    clearTimeout(timer);
    if (reduce || !visible || hold || document.hidden) return;
    timer = setTimeout(() => { bring((top + 1) % prints.length); loop(); }, 3400);
  };
  new IntersectionObserver(es => es.forEach(e => { visible = e.isIntersecting; loop(); }), { threshold: .3 }).observe(stack);
  document.addEventListener('visibilitychange', loop);
  const holdOn = () => { hold = true; loop(); };
  const holdOff = () => { hold = false; loop(); };
  [stack, el.querySelector('.ab-statement'), el.querySelector('.ab-sheet')].forEach(n => {
    n?.addEventListener('pointerenter', holdOn); n?.addEventListener('pointerleave', holdOff);
    n?.addEventListener('focusin', holdOn); n?.addEventListener('focusout', holdOff);
  });

  const jump = (e, id) => { const t = sec(id); if (!t) return; e.preventDefault(); go(t); };
  words.forEach(w => {
    const pick = () => bring(indexOfKey(w.dataset.key));
    w.addEventListener('pointerenter', pick);
    w.addEventListener('focus', pick);
    w.addEventListener('click', e => jump(e, w.dataset.key));
  });
  capSec.addEventListener('click', e => jump(e, capSec.getAttribute('href').slice(1)));

  /* ---------- contents sheet: every section on the page, counted from the page ---------- */
  const WHAT = {
    collage: 'halftone, duotone, grain. cut apart and pasted back.',
    sculpture: 'a burgundy acrylic heart: silver webs, three spiders. plus a film of details.',
    paper: 'family chain, mixed media. a lighter, drawn by hand.',
    carmeet: 'a red 911 with the spoiler up, an orange mclaren with its doors up.',
    graduation: 'cap and tassel, a lawn, the library stacks, yellow tulips.',
    modeling: 'a studio portfolio shot, then four looks for zumiez.',
    signs: "sign shop llc: jameson's getaway, cowgirl kettle corn & lemonade.",
    video: 'siesta g. a 39-second reel from a market day.',
    details: 'close-ups: threads, charms, rhinestones, dots.',
    archive: 'every piece on one wall.',
    contact: 'instagram, site map, credits.',
  };
  const toc = el.querySelector('.ab-toc');
  const all = new Set();
  [...document.querySelectorAll('main > .sec[data-n]')].filter(s => s.id !== 'hero' && s.id !== 'about').forEach(s => {
    const ids = new Set([...s.querySelectorAll('.lb[data-lb]:not([data-lb-alias]), .vid[data-video]')].map(n => n.dataset.lb || n.dataset.video));
    if (!['archive', 'details'].includes(s.id)) ids.forEach(id => all.add(id));
    const li = document.createElement('li');
    li.innerHTML = `<a class="ab-row" href="#${s.id}" data-key="${s.id}"><span class="n">${s.dataset.n}</span><span class="l">${s.dataset.label}</span><span class="w">${WHAT[s.id] || ''}</span><span class="c">${ids.size && !['archive'].includes(s.id) ? ids.size : ''}</span></a>`;
    toc.appendChild(li);
  });
  const total = el.querySelector('.ab-total');
  if (total) total.textContent = `${all.size} pieces`;
  function rows() { return [...el.querySelectorAll('.ab-row')]; }
  rows().forEach(a => {
    a.addEventListener('click', e => jump(e, a.dataset.key));
    const pick = () => { const i = indexOfKey(a.dataset.key); if (i >= 0) bring(i); };
    a.addEventListener('pointerenter', pick);
    a.addEventListener('focus', pick);
  });
  document.addEventListener('vm:section', e => rows().forEach(a => { if (a.dataset.key === e.detail.id) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); }));

  /* ---------- entrances: start when seen (also after a jump), always end visible ---------- */
  const wrap = el.querySelector('.ab-sheet-wrap');
  wrap.style.setProperty('--rot', `${rand(2, -1.4, .6, 3).toFixed(2)}deg`);
  if (reduce) return;
  const inView = n => { const r = n.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; };
  if (!inView(stack)) {
    gsap.set(prints, { opacity: 0, y: 70 });
    onVisible(stack, () => gsap.to(prints, { opacity: 1, y: 0, duration: .9, ease: 'expo.out', stagger: .07 }), { threshold: .15 });
  }
  const sheet = el.querySelector('.ab-sheet');
  if (!inView(sheet)) {
    gsap.set(rows(), { opacity: 0, x: -14 });
    onVisible(sheet, () => gsap.to(rows(), { opacity: 1, x: 0, duration: .6, ease: 'power3.out', stagger: .05, clearProps: 'opacity,transform' }), { threshold: .1 });
  }
});

/* ===== 03-collage.js ===== */
/* 03 · collage
   desktop (fine pointer, 900px+): a pinboard. Prints tumble in once, drift with scroll and can be
   dragged with inertia. A dragged print leans into its horizontal speed and springs back to its own tilt
   (velocity lean after OSUblake's "physics while dragging" demo on the GSAP forums).
   everywhere else: the same prints in a ctx.carousel() snap rail.
   the technique key outlines the prints that use each move, and on the rail it jumps to the first one. */
VM.section('collage', ({ gsap, ScrollTrigger, Draggable, mm, carousel, onVisible, scrollTo, reduce, rand, el }) => {
  const DESK = '(min-width: 900px) and (hover: hover) and (pointer: fine)';
  const board = el.querySelector('.col-board');
  const slots = [...board.querySelectorAll('.col-slot')];
  const pins = slots.map(s => s.querySelector('.col-pin'));
  const reset = el.querySelector('.col-reset');
  const ctl = el.querySelector('.col-ctl');
  const chips = [...el.querySelectorAll('.col-chip')];
  const boardMode = () => window.matchMedia(DESK).matches;
  const RAIL_LABEL = 'five collage edits';
  const BOARD_LABEL = 'five collage edits. focus a print, the arrow keys move it, enter opens it.';
  let top = 10, ds = [], car = null, played = false;
  let done = !!reduce, dragLater = null; /* done: the entrance has settled; dragLater: Draggables waiting for it */

  /* seeded tilt + base z-order, stable across loads; flatter on the rail so corners stay on screen */
  const rots = pins.map((pin, i) => {
    slots[i].style.zIndex = String(2 + Math.round(rand(i + 1, 0, 4, 7)));
    return rand(i + 1, -2.8, 2.8, 3);
  });
  const tilt = i => rots[i] * (boardMode() ? 1 : .6);
  const raise = pin => { pin.parentElement.style.zIndex = String(++top); };

  /* entrance: tumble in once, from a random order. An IntersectionObserver starts it (not a
     ScrollTrigger onEnter, which limitCallbacks skips after a jump), so a hash load, a menu jump
     or a fling past the board can never leave the prints hidden. A jump can also stop with the board's top
     in the last strip of a short screen, under the observer's line: then the end of scrolling starts it
     (well before core's 1.6 s failsafe, which would show the prints at their tumble start pose). */
  const late = () => { if (board.getBoundingClientRect().top < innerHeight) play(); };
  const play = () => {
    if (played) return;
    played = true;
    ScrollTrigger.removeEventListener('scrollEnd', late);
    board.classList.add('is-in');
    gsap.to(pins, {
      opacity: 1, y: 0, rotation: tilt, duration: 1.1, ease: 'expo.out',
      stagger: { each: .09, from: 'random' },
      onComplete: () => { gsap.set(pins, { clearProps: 'opacity' }); done = true; dragLater?.(); dragLater = null; },
    });
  };
  if (reduce) {
    played = true;
    gsap.set(pins, { rotation: tilt });
    board.classList.add('is-in');
  } else {
    gsap.set(pins, { opacity: 0, y: boardMode() ? 80 : 40, rotation: i => tilt(i) + rand(i + 1, -8, 8, 11) });
    onVisible(board, play, { rootMargin: '0px 0px -8% 0px' });
    ScrollTrigger.addEventListener('scrollEnd', late);
  }

  /* board only: a press that travelled > 6px is a drag and never opens the lightbox */
  let px = 0, py = 0, moved = false;
  /* the rail's carousel lives for the whole page (core's destroy() leaves its listeners attached), so on the
     board it is kept quiet: a press in a gap never reaches its drag-to-scroll, and its hover pause stays latched */
  board.addEventListener('pointerdown', e => {
    px = e.clientX; py = e.clientY; moved = false;
    if (car && boardMode() && !e.target.closest('.col-pin')) e.stopImmediatePropagation();
  }, true);
  board.addEventListener('pointerleave', e => { if (car && boardMode() && e.target === board) e.stopImmediatePropagation(); }, true);
  const hover = type => board.dispatchEvent(new PointerEvent(type, { pointerType: 'mouse' }));
  board.addEventListener('pointermove', e => { if (e.buttons && Math.hypot(e.clientX - px, e.clientY - py) > 6) moved = true; }, true);
  el.addEventListener('click', e => {
    if (boardMode() && moved && e.target.closest('.lb')) { e.preventDefault(); e.stopPropagation(); }
    moved = false;
  }, true);
  /* on the board a press belongs to Draggable, not to the rail's mouse drag-to-scroll */
  pins.forEach(p => p.addEventListener('pointerdown', e => { if (boardMode()) e.stopPropagation(); }));

  /* board only: arrow keys nudge the focused print (shift = bigger steps) */
  const KEYS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  const aim = new WeakMap(); /* where a nudge is heading, so fast repeats add up exactly */
  board.addEventListener('keydown', e => {
    const step = KEYS[e.key];
    const lb = e.target.closest?.('.lb');
    if (!step || !lb || !boardMode() || e.metaKey || e.ctrlKey || e.altKey) return;
    e.preventDefault(); e.stopPropagation();
    const pin = lb.closest('.col-pin');
    const d = e.shiftKey ? 96 : 24;
    const from = aim.get(pin) || { x: gsap.getProperty(pin, 'x'), y: gsap.getProperty(pin, 'y') };
    const to = { x: from.x + step[0] * d, y: from.y + step[1] * d };
    aim.set(pin, to);
    raise(pin);
    reset.hidden = false;
    gsap.to(pin, { ...to, duration: reduce ? 0 : .35, ease: 'power3.out', overwrite: 'auto',
      onComplete: () => { aim.delete(pin); ds.find(x => x.target === pin)?.update(true); } });
  }, true);

  /* technique key: outline the prints that use a move; on the rail, also bring the first one in */
  const hits = b => b.dataset.hit.split(' ').map(Number);
  const mark = b => pins.forEach((p, i) => p.classList.toggle('is-hit', !!b && hits(b).includes(i)));
  chips.forEach(b => {
    b.addEventListener('pointerenter', () => mark(b));
    b.addEventListener('pointerleave', () => { if (document.activeElement !== b) mark(null); });
    b.addEventListener('focus', () => mark(b));
    b.addEventListener('blur', () => mark(null));
    b.addEventListener('click', () => {
      const i = hits(b)[0];
      mark(b);
      if (!boardMode()) { car?.go(i); return; }
      const r = pins[i].getBoundingClientRect();
      if (r.top < 72 || r.bottom > innerHeight) scrollTo(board, { offset: -72 });
    });
  });

  /* rail mode: one carousel for the life of the page (core's carousel has no full teardown) */
  const railMode = () => {
    if (!car) car = carousel(board, { slides: '.col-slot', controls: ctl, label: RAIL_LABEL });
    else if (!board.matches(':hover')) hover('pointerleave'); /* back from the board: autoplay resumes */
    board.classList.add('car');
    board.tabIndex = 0;
    board.setAttribute('aria-roledescription', 'carousel');
    board.setAttribute('aria-label', RAIL_LABEL);
  };

  /* board mode: parallax per print + Draggable with inertia. Torn down when the query stops matching. */
  const deskMode = () => {
    if (car) hover('pointerenter'); /* the carousel thinks it is hovered, so it never autoplays on the board */
    board.classList.remove('car');
    board.removeAttribute('tabindex');
    board.removeAttribute('aria-roledescription');
    board.setAttribute('aria-label', BOARD_LABEL);

    const para = reduce ? [] : slots.map((slot, i) => {
      const amt = rand(i + 1, 20, 48, 5) * (i % 2 ? -1 : 1);
      return gsap.fromTo(slot, { y: amt }, { y: -amt, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: .8 } });
    });

    const settle = (t, i) => gsap.to(t, { rotation: tilt(i), duration: reduce ? 0 : 1, ease: 'elastic.out(1, .45)', overwrite: 'auto' });
    /* Draggable applies bounds: board the moment it is created and pushes a tilted print sideways.
       So it is created only once the tumble has settled, and whatever that nudge did is undone:
       a print only moves when someone moves it. */
    const makeDrag = () => {
      if (ds.length || !boardMode()) return;
      const keep = pins.map(p => ({ x: gsap.getProperty(p, 'x'), y: gsap.getProperty(p, 'y') }));
      ds = Draggable.create(pins, {
        type: 'x,y', bounds: board, edgeResistance: .65, inertia: !reduce, minimumMovement: 3,
        zIndexBoost: false, cursor: 'grab', activeCursor: 'grabbing',
        onPress() {
          gsap.killTweensOf(this.target, 'opacity,y,rotation');
          gsap.set(this.target, { opacity: 1 });
          raise(this.target);
          this.target.classList.add('is-drag');
        },
        onDragStart() { reset.hidden = false; },
        onDrag() {
          if (reduce) return;
          const i = pins.indexOf(this.target);
          gsap.to(this.target, { rotation: tilt(i) + gsap.utils.clamp(-9, 9, this.deltaX * .8), duration: .3, overwrite: 'auto' });
        },
        onRelease() {
          const t = this.target;
          settle(t, pins.indexOf(t));
          gsap.delayedCall(1.4, () => t.classList.remove('is-drag'));
        },
      });
      pins.forEach((p, k) => gsap.set(p, keep[k]));
      ds.forEach(d => d.update());
    };
    if (done) makeDrag(); else dragLater = makeDrag;

    const putBack = () => {
      ds.forEach(d => d.tween?.kill());
      gsap.to(pins, { x: 0, y: 0, rotation: tilt, duration: reduce ? 0 : .9, ease: 'expo.out', stagger: reduce ? 0 : .05,
        onComplete: () => ds.forEach(d => d.update()) });
      reset.hidden = true;
    };
    reset.addEventListener('click', putBack);

    /* a narrower window must not strand a dragged print outside the board */
    let fitT = 0;
    const fit = () => { clearTimeout(fitT); fitT = setTimeout(() => ds.forEach(d => {
      if (gsap.getProperty(d.target, 'x') || gsap.getProperty(d.target, 'y')) d.applyBounds(board); /* moved prints only */
    }), 160); };
    window.addEventListener('resize', fit);

    return () => {
      clearTimeout(fitT); dragLater = null;
      window.removeEventListener('resize', fit);
      reset.removeEventListener('click', putBack);
      ds.forEach(d => d.kill()); ds = [];
      para.forEach(t => { t.scrollTrigger?.kill(); t.kill(); });
      gsap.set(pins, { x: 0, y: 0 });
      gsap.set(slots, { clearProps: 'transform' });
      reset.hidden = true;
      pins.forEach(p => { p.style.cursor = ''; p.classList.remove('is-drag'); });
    };
  };

  mm.add({ desk: DESK, rail: `not all and ${DESK}` }, ({ conditions }) => {
    if (played) gsap.set(pins, { rotation: tilt });
    return conditions.desk ? deskMode() : railMode();
  });
});

/* ===== 04-sculpture.js ===== */
VM.section('sculpture', ({ gsap, ScrollTrigger, lenis, mm, isDesktop, isTouch, reduce, rand, scrollTo, el }) => {
  const hangs = [...el.querySelectorAll('.sc-hang')];

  /* film chapters: each row plays the film from that piece; the row under the playhead is marked and its rule fills */
  const fig = el.querySelector('.sc-phone .vid');
  const v = fig?.querySelector('video');
  const rows = [...el.querySelectorAll('.sc-chapters button')];
  if (v && rows.length) {
    const ts = rows.map(b => +b.dataset.t);
    const playBtn = fig.querySelector('.vid-play');
    const mark = () => {
      const t = v.currentTime, end = v.duration || 14;
      let i = 0;
      while (i < ts.length - 1 && t >= ts[i + 1]) i++;
      const on = !v.paused || t > .05;
      rows.forEach((b, j) => {
        const hit = on && j === i;
        if (hit) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
        const span = (ts[j + 1] ?? end) - ts[j];
        b.parentElement.style.setProperty('--p', hit ? Math.min(1, Math.max(0, (t - ts[j]) / span)).toFixed(3) : '0');
      });
      if (!v.paused && playBtn && !playBtn.hidden) playBtn.hidden = true;
    };
    ['timeupdate', 'seeked', 'pause'].forEach(e => v.addEventListener(e, mark));
    /* a server without byte ranges (a plain local preview) leaves the film unseekable and Chrome snaps back to 0:00.
       then fetch the file once and play it from a blob URL, which always seeks; the latest tap wins while it loads */
    let blob = null, want = 0;
    const seek = t => {
      const r = v.seekable, ok = r.length && r.end(r.length - 1) >= t - .05;
      if (ok || t < .05 || v.src.startsWith('blob:')) { v.currentTime = t; v.play().catch(() => {}); mark(); return; }
      want = t;
      if (blob) return;
      blob = fetch(v.currentSrc || v.dataset.mp4).then(res => res.blob()).then(b => {
        v.addEventListener('loadedmetadata', () => { v.currentTime = want; v.play().catch(() => {}); mark(); }, { once: true });
        v.src = URL.createObjectURL(b);
      }).catch(() => { blob = null; v.currentTime = want; v.play().catch(() => {}); });
    };
    rows.forEach(b => b.addEventListener('click', () => {
      const go = () => seek(+b.dataset.t);
      if (v.readyState >= 1) go();
      else { v.addEventListener('loadedmetadata', go, { once: true }); playBtn?.click(); } /* core's button loads the source */
      const r = fig.getBoundingClientRect();
      const seen = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0);
      if (seen < r.height * .6) { /* bring the film into view, clear of the top bar */
        const off = Math.max(80, (innerHeight - r.height) / 2);
        if (lenis) scrollTo(fig, { offset: -off }); else window.scrollTo({ top: scrollY + r.top - off, behavior: reduce ? 'auto' : 'smooth' });
      }
    }));
  }

  if (!hangs.length) return;

  /* seeded tilt per print (stable between loads) */
  hangs.forEach((h, i) => {
    const print = h.querySelector('.sc-print');
    if (print) print.style.setProperty('--rot', `${rand(i + 40, -3.2, 3.2).toFixed(2)}deg`);
  });

  /* pause the CSS pendulum when the wall is off-screen */
  const wall = el.querySelector('.sc-wall');
  new IntersectionObserver(es => es.forEach(e => hangs.forEach(h => h.classList.toggle('is-off', !e.isIntersecting))), { threshold: 0, rootMargin: '80px' }).observe(wall);

  /* entrance: the prints get hung, one after another, from the chain */
  if (reduce) {
    gsap.set(hangs, { opacity: 1 });
  } else {
    gsap.set(hangs, { opacity: 0, y: -28, rotation: i => rand(i + 27, -2, 2) });
    /* opacity fades once on a plain ease (an elastic opacity would flicker); only the drop and tilt settle elastically */
    hangs.forEach((h, i) => {
      const scrollTrigger = { trigger: wall, start: 'top 95%', once: true };
      gsap.to(h, { opacity: 1, duration: .5, ease: 'power2.out', delay: i * .12, scrollTrigger });
      gsap.to(h, {
        y: 0, rotation: 0, duration: 1.4, ease: 'elastic.out(1, .7)', delay: i * .12, scrollTrigger: { ...scrollTrigger },
        onComplete: () => h.classList.add('is-done'),
      });
    });
  }

  /* desktop, fine pointer, motion allowed: scroll velocity kicks the pendulums.
     each hang is a damped pendulum (angle, angular velocity); a scroll impulse adds to its velocity.
     all three share one spring and damping, so a kick sways the wall together (neighbours keep their gap);
     only the strength differs per print: gain, speed cap and angle limit all scale with it, so the heavy middle print
     swings least and the right one a little less than the left, even under a hard flick (limits 3, 2.25, 2.7deg).
     the CSS idle swing keeps them out of phase. transform-only, the ticker stops when nothing is moving. */
  if (reduce || isTouch || !isDesktop) return;
  mm.add('(min-width: 900px) and (hover: hover)', () => {
    const k = .0054, damp = .968;      /* ~1.4s period, settles in ~1.5s */
    const pend = hangs.map((h, i) => { const s = [1, .75, .9][i] ?? 1; return { h, ang: 0, vel: 0, gain: .0003 * s, cap: .21 * s, lim: 3 * s }; });
    let active = false, ticking = false, lastKick = 0;

    const tick = () => {
      let moving = false;
      pend.forEach(p => {
        p.vel = (p.vel - p.ang * k) * damp;
        p.ang = gsap.utils.clamp(-p.lim, p.lim, p.ang + p.vel);
        if (Math.abs(p.ang) > .02 || Math.abs(p.vel) > .02) moving = true;
        else { p.ang = 0; p.vel = 0; }
        gsap.set(p.h, { rotation: p.ang });
      });
      if (!moving) stop();
    };
    const start = () => { if (ticking) return; ticking = true; gsap.ticker.add(tick); hangs.forEach(h => h.style.willChange = 'transform'); };
    const stop = () => { if (!ticking) return; ticking = false; gsap.ticker.remove(tick); hangs.forEach(h => { h.style.willChange = ''; }); };

    const st = ScrollTrigger.create({
      trigger: el, start: 'top bottom', end: 'bottom top',
      onToggle: self => {
        active = self.isActive;
        if (active) return;
        stop(); pend.forEach(p => { p.ang = 0; p.vel = 0; });
        gsap.to(hangs, { rotation: 0, duration: .5, overwrite: 'auto' });
      },
      onUpdate(self) {
        if (!active || !hangs[0].classList.contains('is-done')) return;
        const now = performance.now();
        if (now - lastKick < 40) return;
        lastKick = now;
        const v = gsap.utils.clamp(-4000, 4000, self.getVelocity());
        if (Math.abs(v) < 120) return;
        pend.forEach(p => { p.vel = gsap.utils.clamp(-p.cap, p.cap, p.vel - v * p.gain * .5); });
        start();
      },
    });

    return () => { st.kill(); stop(); gsap.set(hangs, { rotation: 0 }); };
  });
});

/* ===== 05-paper.js ===== */
VM.section('paper', ({ gsap, ScrollTrigger, mm, reduce, el, rand }) => {
  const items = [...el.querySelectorAll('.paper-item')];            /* painting, drawing */
  const pieces = items.map(fig => fig.querySelector('.paper-piece')); /* tape + print / dots + sticker: fades, drifts */
  const arts = items.map(fig => fig.querySelector('.paper-art'));    /* the tilted sheet inside each: slides, tilts, lifts */
  const caps = items.map(fig => fig.querySelector('.paper-cap'));
  const dots = el.querySelector('.paper-dots');
  const circ = el.querySelector('.paper-circ');
  const circPath = el.querySelector('.paper-circ-path');

  /* seeded tilts, kept small because the pieces are large: the painting leans left, the drawing right */
  const tilt = [rand(11, -1.4, -0.6, 5), rand(13, 0.6, 1.5, 5)];
  arts.forEach((a, i) => a && gsap.set(a, { rotation: tilt[i] }));
  if (dots) gsap.set(dots, { rotation: rand(3, 0.4, 1.3, 5) });

  /* one-shot entrance tied to an animation (not a callback), so a deep link, a menu jump or a reload
     below the section renders it finished instead of leaving it hidden */
  const enter = (trigger, anim, start) => ScrollTrigger.create({
    trigger, start, once: true, animation: anim,
    onRefresh: self => { if (self.progress > 0 && !anim.isActive() && anim.progress() < 1) anim.progress(1); },
  });

  /* ---------- entrance: each sheet slides up and settles its tilt; the drawing's halftone offset slides out
     from under it like a second print pass. from 1200px the figures are display: contents (their caption sits in
     the text column), so the piece and the caption are animated and watched, never the figure ---------- */
  if (!reduce) {
    items.forEach((fig, i) => {
      const art = arts[i], piece = pieces[i];
      if (!art || !piece) return;
      const dir = i === 0 ? -1 : 1;
      /* smaller swing for tall sheets and narrow screens, so no corner pokes past the edge or under the rail */
      const amp = gsap.utils.clamp(.3, 1, Math.min(innerWidth / 1200, 520 / Math.max(art.offsetHeight, 1)));
      const tl = gsap.timeline({ paused: true, onComplete: () => fig.classList.add('is-done') });
      tl.fromTo([piece, caps[i]].filter(Boolean), { opacity: 0 }, { opacity: 1, duration: .6, ease: 'power1.out' }, 0)
        .fromTo(art, { y: 80 }, { y: 0, duration: 1.15, ease: 'power3.out' }, 0)
        .fromTo(art, { rotation: tilt[i] + dir * amp * rand(i + 21, 2.5, 4.5, 5) }, { rotation: tilt[i], duration: 1.7, ease: 'elastic.out(1, .55)' }, .05);
      if (piece.contains(dots)) tl.from(dots, { x: 22, y: -22, opacity: 0, duration: .9, ease: 'power2.out' }, .45);
      /* the piece is never moved by the entrance (only the sheet inside it), so its trigger position is real */
      enter(piece, tl, 'top 92%');
    });
  }

  /* ---------- the red circle: drawn once, by hand, when its word is on screen ---------- */
  if (circ && circPath) {
    if (reduce) gsap.set(circPath, { strokeDashoffset: 0 });
    else enter(circ, gsap.to(circPath, { strokeDashoffset: 0, duration: 1, delay: .35, ease: 'power2.inOut', paused: true }), 'top 90%');
  }

  /* ---------- desktop only: the two pieces drift up at different rates (the captions stay put, so they stay level),
     and a piece lifts a little under the pointer, or when the pointer is on its caption ---------- */
  if (!reduce) {
    mm.add('(min-width: 900px) and (hover: hover)', () => {
      const drift = [-18, -42];
      const tws = pieces.filter(Boolean).map((p, i) => gsap.fromTo(p, { y: 0 }, {
        y: drift[i] ?? 0, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: .8 },
      }));
      const offs = arts.map((a, i) => {
        const hot = [a?.querySelector('.lb'), caps[i]].filter(Boolean);
        if (!a || !hot.length) return null;
        const on = () => gsap.to(a, { yPercent: -600 / Math.max(a.offsetHeight, 1), duration: .45, ease: 'power3.out' });
        const off = () => gsap.to(a, { yPercent: 0, duration: .6, ease: 'power3.out' });
        hot.forEach(h => { h.addEventListener('pointerenter', on); h.addEventListener('pointerleave', off); });
        return () => hot.forEach(h => { h.removeEventListener('pointerenter', on); h.removeEventListener('pointerleave', off); });
      });
      return () => {
        tws.forEach(t => t.kill());
        offs.forEach(f => f?.());
        gsap.set(pieces.filter(Boolean), { y: 0 });
        gsap.set(arts.filter(Boolean), { yPercent: 0 });
      };
    });
  }
});

/* ===== 06-carmeet.js ===== */
VM.section('carmeet', ({ gsap, carousel, onVisible, mm, reduce, el, rand }) => {
  const wrap = el.querySelector('.cm-wrap');
  const rail = el.querySelector('.cm-rail');
  const frames = [...el.querySelectorAll('.cm-frame')];
  const lbs = frames.map(f => f.querySelector('.lb'));
  const jumps = [...el.querySelectorAll('.cm-index button')];
  const card = el.querySelector('.cm-index');
  const n = frames.length;
  if (!rail || !n) return;

  /* the taped index card gets its own small, stable lean */
  card?.style.setProperty('--rot', `${rand(11, -1.6, 1.6, 6).toFixed(2)}deg`);

  /* ---------- rail: core carousel (native snap + swipe, mouse drag, autoplay, prev/next, counter, progress) ---------- */
  /* roving tabindex: only the frame on screen is a tab stop, so focus never lands on a photo that is off to the side */
  const sync = i => {
    jumps.forEach((b, k) => b.setAttribute('aria-current', k === i ? 'true' : 'false'));
    const hadFocus = lbs.includes(document.activeElement);
    lbs.forEach((b, k) => { if (b) b.tabIndex = k === i ? 0 : -1; });
    if (hadFocus) lbs[i]?.focus({ preventScroll: true });
  };
  const car = carousel(rail, {
    slides: '.cm-frame', controls: el.querySelector('.cm-ctl'), interval: 5600, onChange: sync,
    label: 'car meet photos. left and right arrow keys move between frames, home and end jump to the first and last',
  });
  const go = i => {
    i = gsap.utils.clamp(0, n - 1, i);
    if (car) car.go(i);
    else rail.scrollTo({ left: frames[i].offsetLeft - frames[0].offsetLeft, behavior: reduce ? 'auto' : 'smooth' });
  };

  jumps.forEach((b, i) => b.addEventListener('click', () => go(i)));
  rail.addEventListener('keydown', e => {
    if (e.altKey || e.metaKey || e.ctrlKey || (e.key !== 'Home' && e.key !== 'End')) return;
    e.preventDefault(); go(e.key === 'Home' ? 0 : n - 1);
  });
  /* focus arriving on a frame by other means (lightbox close, screen reader) brings that frame into place */
  rail.addEventListener('focusin', e => {
    const i = lbs.indexOf(e.target);
    if (i > -1 && car && i !== car.index) go(i);
  });

  /* ---------- desktop: the rail eases in from the right as the section arrives, and rests on the gutter ---------- */
  if (!reduce && wrap) {
    mm.add('(min-width: 900px) and (hover: hover) and (pointer: fine)', () => {
      gsap.fromTo(wrap, { x: () => window.innerWidth * .06 }, {
        x: 0, ease: 'none', immediateRender: true,
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'top 15%', scrub: .8, invalidateOnRefresh: true },
      });
    });
  }

  /* the photos stay lazy until the rail is near, then all three load, so frame 3 is never black when autoplay or a jump reaches it */
  onVisible(rail, () => rail.querySelectorAll('img').forEach(i => { i.loading = 'eager'; }), { rootMargin: '0px 0px 50% 0px' });

  /* ---------- entrance: letterbox shutters open, one frame after the other ----------
     opened by an IntersectionObserver, so it fires however the rail comes into view (jump, fast scroll, reload) */
  const bars = el.querySelectorAll('.cm-bar');
  if (!reduce && bars.length) {
    gsap.set(bars, { scaleY: 1 });
    let opened = false;
    onVisible(rail, () => {
      if (opened) return;
      opened = true;
      frames.forEach((f, i) => {
        const fb = f.querySelectorAll('.cm-bar');
        gsap.to(fb, { scaleY: 0, duration: 1.15, ease: 'expo.inOut', delay: .1 + i * .14,
          onStart() { fb.forEach(b => { b.style.willChange = 'transform'; }); },
          onComplete() { fb.forEach(b => { b.style.willChange = ''; b.style.display = 'none'; }); } });
      });
    }, { threshold: .15 });
  }

  /* ---------- copy: the lede and the index card rise in once they are on screen (IO, so a jump never skips it) ---------- */
  if (!reduce) {
    [el.querySelector('.cm-lede'), card].filter(Boolean).forEach((node, i) => {
      gsap.set(node, { opacity: 0, y: 28 });
      onVisible(node, () => gsap.to(node, { opacity: 1, y: 0, duration: .9, delay: i ? .15 : .05, ease: 'power3.out', clearProps: 'opacity,y' }), { threshold: .1 });
    });
  }
});

/* ===== 07-graduation.js ===== */
VM.section('graduation', ({ gsap, mm, reduce, rand, onVisible, el }) => {
  const cells = [...el.querySelectorAll('.g-cell')];
  const prints = [...el.querySelectorAll('.g-print')];
  const note = el.querySelector('.g-note');
  const intro = el.querySelector('.g-intro');
  const under = el.querySelector('.g-under path');
  const SALT = 7;
  /* every entrance is started by an IntersectionObserver, not a ScrollTrigger callback, so it plays
     however you arrive: scrolling down or up, menu, hash link, number keys, reload part-way down */
  const IN = { rootMargin: '0px 0px -2% 0px' };

  /* seeded tilts: stable between loads, never two the same */
  prints.forEach((p, i) => p.style.setProperty('--rot', `${rand(i, -3.4, 3.4, SALT).toFixed(2)}deg`));
  note?.style.setProperty('--rot', `${rand(9, -1.4, 1.4, SALT).toFixed(2)}deg`);   /* a tall card: a smaller tilt */

  /* gold underline, drawn once when the title comes in (pathLength="1" so offset is 1 → 0) */
  if (under) {
    if (reduce) gsap.set(under, { strokeDashoffset: 0 });
    else onVisible(el.querySelector('.g-title'), () => gsap.to(under, { strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut', delay: .35 }), IN);
  }

  /* intro paragraph + key card: a short rise (a plain fade under reduced motion) */
  [intro, note].forEach((n, k) => {
    if (!n) return;
    gsap.set(n, { opacity: 0, y: reduce ? 0 : 24 });
    onVisible(n, () => gsap.to(n, {
      opacity: 1, y: 0, duration: reduce ? .3 : .9, delay: reduce ? 0 : .15 + k * .1, ease: 'power3.out',
      onComplete: () => gsap.set(n, { clearProps: 'transform' }),
    }), IN);
  });

  /* blinds reveal: five paper slats over each photo close with a stagger, the print settles down and straightens */
  prints.forEach((print, i) => {
    const frame = print.querySelector('.g-frame');
    const cap = print.querySelector('.g-cap');
    if (!frame) return;

    if (reduce) {
      gsap.set(print, { opacity: 0 });
      onVisible(print.closest('.g-cell') || print, () => gsap.to(print, { opacity: 1, duration: .3, onComplete: () => print.classList.add('is-done') }), IN);
      return;
    }

    const slats = document.createElement('span');
    slats.className = 'g-slats'; slats.setAttribute('aria-hidden', 'true');
    for (let k = 0; k < 5; k++) slats.appendChild(document.createElement('i'));
    frame.appendChild(slats);

    const rot = parseFloat(print.style.getPropertyValue('--rot')) || 0;
    const fromTop = i % 2 === 0;
    gsap.set(print, { y: 44, rotation: rot + 1.5 });   /* same swing for all: neighbours never tilt into each other on the way in */
    gsap.set(cap, { opacity: 0 });

    /* watch the cell, not the print: the print starts 44px low and must not hold its own trigger back */
    onVisible(print.closest('.g-cell') || print, () => {
      const tl = gsap.timeline({
        delay: (i % 3) * .06,
        onStart() { gsap.set([print, ...slats.children], { willChange: 'transform' }); },
        onComplete() { gsap.set(print, { clearProps: 'transform,willChange' }); print.classList.add('is-done'); slats.remove(); },
      });
      tl.to(print, { y: 0, rotation: rot, duration: 1.1, ease: 'expo.out' }, 0)
        .to(slats.children, { scaleY: 0, transformOrigin: fromTop ? '50% 0%' : '50% 100%', duration: .7, ease: 'expo.inOut', stagger: .06 }, .05)
        /* expo's long tail would leave each slat as a 1-3px line across the photo: fade it while it is still a few px tall */
        .to(slats.children, { opacity: 0, duration: .26, ease: 'none', stagger: .06 }, .4)
        .to(cap, { opacity: 1, duration: .5, ease: 'power2.out' }, .55);
    }, IN);
  });

  /* the key card and the prints point at each other: hover a line and its print straightens, hover a print and its line darkens */
  const keyOf = new Map([...el.querySelectorAll('.g-key li[data-for]')].map(li => [li.dataset.for, li]));
  prints.forEach(print => {
    const li = keyOf.get(print.querySelector('.lb')?.dataset.lb);
    if (!li) return;
    const on = v => () => { print.classList.toggle('is-hint', v); li.classList.toggle('is-hint', v); };
    [li, print].forEach(n => { n.addEventListener('pointerenter', on(true)); n.addEventListener('pointerleave', on(false)); });
  });

  /* desktop only: each print drifts at its own speed while the wall scrolls past (torn down on resize) */
  mm.add('(min-width: 1100px) and (hover: hover)', () => {
    if (reduce) return;
    const wall = el.querySelector('.g-wall');
    cells.forEach((cell, i) => {
      const amp = rand(i, 14, 44, SALT + 1) * (i % 2 ? -1 : 1);
      gsap.fromTo(cell, { y: amp }, { y: -amp, ease: 'none',
        scrollTrigger: { trigger: wall, start: 'top bottom', end: 'bottom top', scrub: .8 } });
    });
  });
});

/* ===== 08-modeling.js ===== */
VM.section('modeling', ({ gsap, ScrollTrigger, mm, reduce, el, rand, scrollTo }) => {
  const open = el.querySelector('.mod-open');
  const fig = el.querySelector('.mod-open-fig');
  const dots = el.querySelector('.mod-dots');
  const wideWrap = el.querySelector('.mod-wide');
  const widePic = el.querySelector('.mod-wide-pic');
  const duo = el.querySelector('.mod-duo');
  const stage = el.querySelector('.mod-stage');
  const looks = [...el.querySelectorAll('.mod-look')];
  const pics = looks.map(b => b.querySelector('.pic')).filter(Boolean);
  const steps = [...el.querySelectorAll('.mod-step')];

  /* each print gets its own tiny tilt, stable across loads */
  looks.forEach((b, i) => b.style.setProperty('--rot', `${rand(i, -1.6, 1.6, 8).toFixed(2)}deg`));

  /* 1 · opener: the studio shot settles in (nothing moves under reduce) */
  if (fig && !reduce) {
    gsap.fromTo(fig, { opacity: 0, scale: 1.04, y: 24, transformOrigin: '50% 100%' },
      { opacity: 1, scale: 1, y: 0, duration: 1.3, ease: 'expo.out',
        scrollTrigger: { trigger: fig, start: 'top 80%', once: true }, onComplete: () => gsap.set(fig, { clearProps: 'transform' }) });
  }

  /* 2 · wide frame: slow scrub parallax inside the 2% overscan (yPercent ±1.8 of a 104% box). none under reduce. */
  if (widePic && wideWrap && !reduce) {
    gsap.fromTo(widePic, { yPercent: -1.8 }, {
      yPercent: 1.8, ease: 'none',
      scrollTrigger: {
        trigger: wideWrap, start: 'top bottom', end: 'bottom top', scrub: .6,
        onToggle: self => { widePic.style.willChange = self.isActive ? 'transform' : 'auto'; },
      },
    });
  }

  if (!duo || !stage || looks.length < 2 || reduce) return;
  mm.add({ duo: '(min-width: 900px) and (hover: hover) and (pointer: fine)' }, ({ conditions }) => {
    /* touch / narrow: the grid stays; prints rise in as they reach the screen (batched, so a row staggers) */
    if (!conditions.duo) {
      gsap.set(looks, { opacity: 0, y: 36 });
      const batch = ScrollTrigger.batch(looks, {
        start: 'top 90%', once: true,
        onEnter: els => gsap.to(els, { opacity: 1, y: 0, duration: .9, ease: 'power3.out', stagger: .12, overwrite: true,
          onComplete: () => gsap.set(els, { clearProps: 'opacity,transform' }) }),
      });
      return () => { batch.forEach(t => t.kill()); gsap.killTweensOf(looks); gsap.set(looks, { clearProps: 'opacity,transform' }); };
    }

    /* desktop: the halftone print-shadow drifts a little behind the studio shot */
    const drift = dots && open ? gsap.fromTo(dots, { y: 0 }, { y: -16, ease: 'none',
      scrollTrigger: { trigger: open, start: 'top top', end: 'bottom top', scrub: .6 } }) : null;

    /* zumiez two-up: pin the stage, let the numbers scroll past, crossfade the print to match */
    el.classList.add('is-duo');
    stage.dataset.stack = ''; /* the core un-hide failsafe leaves this crossfade stack alone */
    let active = 0;
    gsap.set(looks, { opacity: 0 });
    gsap.set(looks[0], { opacity: 1 });
    looks.forEach((b, i) => b.classList.toggle('is-off', i !== 0));
    gsap.set(steps, { opacity: .4 });
    gsap.set(steps[0], { opacity: 1 });

    const pin = ScrollTrigger.create({ trigger: duo, start: 'top top', end: 'bottom bottom', pin: stage, pinSpacing: false, anticipatePin: 1 });

    const show = i => {
      if (i === active || !looks[i]) return;
      gsap.to(looks[active], { opacity: 0, duration: .45, ease: 'power2.out', overwrite: 'auto' });
      gsap.to(looks[i], { opacity: 1, duration: .6, ease: 'power2.out', overwrite: 'auto' });
      if (pics[i]) gsap.fromTo(pics[i], { scale: 1.035 }, { scale: 1, duration: 1.1, ease: 'expo.out', overwrite: 'auto', clearProps: 'transform' });
      gsap.to(steps[active], { opacity: .4, duration: .4, overwrite: 'auto' });
      gsap.to(steps[i], { opacity: 1, duration: .4, overwrite: 'auto' });
      looks[active].classList.add('is-off');
      looks[i].classList.remove('is-off');
      active = i;
    };
    const trigs = steps.map((s, i) => ScrollTrigger.create({
      trigger: s, start: 'top 50%', end: 'bottom 50%',
      onEnter: () => show(i), onEnterBack: () => show(i),
    }));

    /* keyboard (or the viewer closing on a look that is not showing): bring that look and its step into view */
    const onFocus = e => {
      const i = looks.indexOf(e.currentTarget);
      if (i < 0 || i === active) return;
      show(i);
      scrollTo(steps[i]);
    };
    looks.forEach(b => b.addEventListener('focus', onFocus));

    return () => {
      pin.kill(); trigs.forEach(t => t.kill()); drift?.scrollTrigger?.kill(); drift?.kill();
      looks.forEach(b => { b.removeEventListener('focus', onFocus); b.classList.remove('is-off'); });
      gsap.killTweensOf([...looks, ...steps, ...pics]);
      gsap.set(looks, { clearProps: 'opacity' });
      gsap.set(steps, { clearProps: 'opacity' });
      gsap.set([...pics, dots].filter(Boolean), { clearProps: 'transform' });
      el.classList.remove('is-duo');
      delete stage.dataset.stack;
    };
  });
});

/* ===== 09-signs.js ===== */
VM.section('signs', ({ gsap, ScrollTrigger, mm, reduce, el, marquee, carousel, rand }) => {
  const SALT = 9;
  const board = el.querySelector('.signs-board');
  const rail = el.querySelector('.signs-rail');
  const ctl = el.querySelector('.signs-ctl');
  const lead = el.querySelector('.signs-lead');
  const slots = [...el.querySelectorAll('.signs-slot')];
  const cards = slots.map(s => s.querySelector('.signs-card'));
  const dots = el.querySelector('.signs-dots');
  const title = el.querySelector('.sec-title');

  /* seeded tilts: stable between loads, never identical (one leans left, one right) */
  const tilt = cards.map((c, i) => +((i ? 1 : -1) * rand(i + 1, .8, 1.8, SALT)).toFixed(2));
  cards.forEach((c, i) => c.style.setProperty('--rot', `${tilt[i]}deg`));

  /* the two vinyl strips run in opposite directions (static under reduced motion: marquee() only fills them) */
  const [strip1, strip2] = el.querySelectorAll('.signs-strip');
  if (strip1) marquee(strip1, { speed: 70, reverse: true });
  if (strip2) marquee(strip2, { speed: 55 });

  /* phone + tablet: both jobs in one core carousel (autoplay, swipe, drag, arrows, 01 / 02, progress line).
     core's carousel has no full teardown, so it is made once and only switched off while the desktop grid shows. */
  const LABEL = 'sign shop llc jobs';
  let car = null;
  /* core's drag + arrow-key listeners stay on the rail after a resize to desktop (where the rail is display: contents).
     while the carousel is off they must not see a mouse press (a small drag would eat the lightbox click) or ← →.
     only those are stopped, so j/k/1–9/m/esc still reach core's keyboard handler. */
  if (rail) {
    const off = () => !rail.classList.contains('car');
    rail.addEventListener('pointerdown', e => { if (off()) e.stopImmediatePropagation(); }, true);
    rail.addEventListener('keydown', e => { if (off() && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) e.stopImmediatePropagation(); }, true);
  }
  if (rail) mm.add('(max-width: 899px)', () => {
    if (!car) car = carousel(rail, { slides: '.signs-slot', controls: ctl, label: LABEL, interval: 5200 });
    else {
      rail.classList.add('car'); rail.tabIndex = 0; ctl.hidden = false;
      rail.setAttribute('role', 'region'); rail.setAttribute('aria-roledescription', 'carousel'); rail.setAttribute('aria-label', LABEL);
    }
    return () => {
      rail.classList.remove('car'); rail.removeAttribute('tabindex'); rail.removeAttribute('role');
      rail.removeAttribute('aria-roledescription'); rail.removeAttribute('aria-label'); rail.scrollLeft = 0;
      if (ctl) ctl.hidden = true;
    };
  });
  if (reduce || !board) return; /* reduced motion: everything is simply there, nothing drifts */

  /* entrances, played once by ScrollTrigger and finished by settle() below whatever way the section is reached */
  let ins = [];
  const enter = (n, tw, lag = 0) => {
    ScrollTrigger.create({ trigger: n, start: 'top 90%', once: true, onEnter: () => gsap.delayedCall(lag, () => tw.play()) });
    ins.push({ n, tw });
  };
  const rise = (n, y) => gsap.timeline({ paused: true })
    .from(n, { opacity: 0, y, duration: .9, ease: 'power3.out', clearProps: 'opacity,transform' });

  /* desktop: the paragraph and the two prints rise in; each print lands with a small swing (2deg) from its taped top
     edge, like a board being set down. both swing the same way, so their bottom corners never close in on each
     other across the column gap. the menu boards follow a beat after the sign. */
  mm.add('(min-width: 900px)', () => {
    if (lead) enter(lead, rise(lead, 48));
    slots.forEach((s, i) => {
      const tw = rise(s, 48);
      if (cards[i]) tw.fromTo(cards[i], { rotation: tilt[i] - 2 }, { rotation: tilt[i], duration: 1.3, ease: 'back.out(2.2)' }, 0);
      enter(s, tw, i ? .14 : 0);
    });
    return () => { ins = []; };
  });

  /* phone + tablet: the paragraph rises, then both prints slide in from the right one after the other, which also
     says the row moves sideways. the cards move, not the slots: moving a snap target makes the rail re-snap. */
  if (rail) mm.add('(max-width: 899px)', () => {
    if (lead) enter(lead, rise(lead, 24));
    enter(rail, gsap.timeline({ paused: true })
      .from(cards, { opacity: 0, x: 64, duration: 1, ease: 'power3.out', stagger: .12, clearProps: 'opacity,transform' }));
    return () => { ins = []; };
  });

  /* safety net: after a jump, a reload mid-page or a fast fling, nothing in this section stays hidden.
     anything already scrolled past is finished at once; anything on screen plays in. */
  const settle = () => {
    const vh = window.innerHeight;
    ins.forEach(({ n, tw }) => {
      if (tw.progress() === 1 || tw.isActive()) return;
      const r = n.getBoundingClientRect();
      if (r.bottom < 0) tw.progress(1);
      else if (r.top < vh * .9) tw.play();
    });
    if (title && title.getBoundingClientRect().top < vh * .9) {
      gsap.getTweensOf(title.querySelectorAll('.ln')).forEach(t => { if (!t.isActive() && t.progress() < 1) t.progress(1); });
    }
  };
  ScrollTrigger.addEventListener('refresh', settle);
  ScrollTrigger.addEventListener('scrollEnd', settle);

  /* the halftone behind the menu boards drifts the other way to the print (14px each way, transform only). it stops
     44px above the print's bottom edge, more than the drift and the hover lift together, so it never shows below it. */
  const st = () => ({ trigger: board, start: 'top bottom', end: 'bottom top', scrub: .6 });
  if (dots) gsap.fromTo(dots, { y: 14, x: -4 }, { y: -14, x: 4, ease: 'none', scrollTrigger: st() });

  /* desktop: the two prints drift at different rates (the sign a little faster than the page, the menu boards
     a little slower). the gaps around them are wider than the drift, so nothing ever touches. */
  mm.add('(min-width: 900px)', () => {
    if (cards[0]) gsap.fromTo(cards[0], { y: 20 }, { y: -20, ease: 'none', scrollTrigger: st() });
    if (cards[1]) gsap.fromTo(cards[1], { y: -12 }, { y: 28, ease: 'none', scrollTrigger: st() });
  });

  /* desktop hover / keyboard focus: the print lifts a little and straightens (transform only) */
  mm.add('(min-width: 900px) and (hover: hover) and (pointer: fine)', () => {
    const ac = new AbortController();
    const on = { signal: ac.signal };
    slots.forEach((slot, i) => {
      const card = cards[i];
      if (!card) return;
      const lift = up => gsap.to(card, {
        yPercent: up ? -1 : 0, rotation: up ? tilt[i] * .3 : tilt[i],
        duration: up ? .5 : .7, ease: 'power3.out', overwrite: 'auto',
      });
      slot.addEventListener('pointerenter', () => lift(true), on);
      slot.addEventListener('pointerleave', () => lift(false), on);
      slot.addEventListener('focusin', e => { if (e.target.matches(':focus-visible')) lift(true); }, on);
      slot.addEventListener('focusout', () => lift(false), on);
    });
    return () => {
      ac.abort();
      gsap.killTweensOf(cards, 'yPercent,rotation');
      gsap.set(cards, { yPercent: 0, rotation: i => tilt[i] });
    };
  });
});

/* ===== 10-video.js ===== */
/* 10 video — two siesta g reels. core owns loading, autoplay at ≥50% visible, pausing off-screen and the sound toggle;
   this file adds the offset, the timecode + scrub line under each reel, the pause buttons, the phone rail, the entrance and a small drift. */
VM.section('video', ({ gsap, ScrollTrigger, mm, reduce, isDesktop, carousel, marquee, onVisible, el }) => {
  const rail = el.querySelector('.vd-rail');
  const reels = [...el.querySelectorAll('.vd-reel')];
  if (!rail || !reels.length) return;
  const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  /* ---------- per reel: live timecode, acid line + diamond playhead (one --p drives both), scrub, play/pause button ---------- */
  const playing = new Set();
  const tick = () => playing.forEach(it => it.paint());
  const track = (it, on) => {
    if (on === playing.has(it)) return;
    if (on) { playing.add(it); if (playing.size === 1 && !reduce) gsap.ticker.add(tick); }
    else { playing.delete(it); if (!playing.size) gsap.ticker.remove(tick); }
  };

  reels.forEach(reel => {
    const fig = reel.querySelector('.vid');
    const v = fig?.querySelector('video');
    const line = reel.querySelector('.vd-track');
    const seek = reel.querySelector('.vd-seek');
    const now = reel.querySelector('.vd-time b');
    const btn = reel.querySelector('.vd-label');
    if (!v || !line || !seek) return;
    const playBtn = fig.querySelector('.vid-play');
    const name = btn?.textContent.trim() || 'reel';
    const start = parseFloat(reel.dataset.start) || 0;
    const dur = () => (isFinite(v.duration) && v.duration) || +seek.max || 39;
    /* want: a position still to reach (the offset, or a scrub). resume: play once it is reached. */
    /* held: the visitor paused this reel, so core's autoplay (at 50% visible) must not start it again */
    let dragging = false, shown = -1, want = start || null, resume = false, swapping = false, held = false;

    /* core's sound chip moves out of the picture into the label row, after the timecode: the tab order then follows the eye
       (name, sound, line). core's listener stays on the element; core resets another reel's chip through .vid, which no longer
       holds it, so the chip follows its own video's muted state */
    const snd = fig.querySelector('.vid-sound');
    const row = reel.querySelector('.vd-row');
    if (snd && row) {
      row.append(snd);
      v.addEventListener('volumechange', () => { snd.setAttribute('aria-pressed', String(!v.muted)); snd.textContent = v.muted ? 'sound off' : 'sound on'; });
      snd.addEventListener('click', () => { if (!v.muted) held = false; });   /* sound on means: play it */
    }

    const it = {
      paint(t = want ?? v.currentTime) {
        const d = dur();
        line.style.setProperty('--p', Math.min(1, Math.max(0, t / d)).toFixed(4));
        const s = Math.floor(t);
        if (s === shown) return;
        shown = s;
        if (now) now.textContent = fmt(t);
        if (!dragging) seek.value = String(Math.round(t * 2) / 2);
        seek.setAttribute('aria-valuetext', `${fmt(t)} of ${fmt(d)}`);
      },
    };
    const sync = () => {   /* a reel waiting to reach its position counts as playing */
      const on = !v.paused || resume;
      reel.classList.toggle('is-playing', on); track(it, on);
      btn?.setAttribute('aria-label', `${on ? 'pause' : 'play'} ${name}`);
    };

    /* seeking needs a server that answers byte ranges. where it doesn't (seekable stays [0, 0] and every seek lands on 0),
       the file is fetched once as a blob, which is always seekable, and the position is reached from there */
    const canSeek = t => v.seekable.length > 0 && v.seekable.end(v.seekable.length - 1) >= t;
    const half = () => { const r = fig.getBoundingClientRect(); return Math.min(r.bottom, innerHeight) - Math.max(r.top, 0) >= r.height / 2 && Math.min(r.right, innerWidth) - Math.max(r.left, 0) >= r.width / 2; };
    const viaBlob = () => {
      if (swapping) return;
      swapping = true;
      fetch(v.currentSrc || v.dataset.mp4).then(r => (r.ok ? r.blob() : Promise.reject(r.status))).then(b => {
        resume = resume || !v.paused;
        v.src = URL.createObjectURL(b);   /* the src attribute wins over core's <source> */
      }).catch(() => {                    /* no way to seek here: keep the line from throwing the reel back to 0 */
        want = null; seek.disabled = true; line.classList.add('no-scrub');
        if (resume) { resume = false; v.play().catch(sync); }
      });
    };
    const land = () => {
      if (want == null || v.readyState < 1) return;
      const t = Math.min(want, dur() - .1);
      if (!canSeek(t)) return viaBlob();
      want = null; v.currentTime = t;
      if (resume) { resume = false; if (half()) v.play().catch(sync); else sync(); }
    };
    v.addEventListener('loadedmetadata', land);
    /* the two files are the same 39 seconds, so the second reel starts further in: side by side they never show the same shot.
       its poster (the first frame of both files) goes once the reel really stands there */
    if (start) {
      v.preload = 'metadata';
      const off = () => { if (Math.abs(v.currentTime - start) < .5) { v.removeAttribute('poster'); v.removeEventListener('seeked', off); } };
      v.addEventListener('seeked', off);
    } else if (reduce) v.preload = 'metadata';
    it.paint(start);

    /* a play before the position is reached waits for it (so the offset reel never starts on the client's frames) */
    v.addEventListener('play', () => {
      if (want != null) { resume = true; v.pause(); }
      else if (held) { v.pause(); return; }
      sync();
    });
    v.addEventListener('pause', () => { sync(); it.paint(); });
    v.addEventListener('emptied', sync);
    ['timeupdate', 'seeked', 'loadedmetadata'].forEach(e => v.addEventListener(e, () => it.paint()));

    seek.addEventListener('input', () => {
      dragging = true;
      want = +seek.value;
      shown = -1; it.paint();
      if (v.readyState >= 1) land(); else playBtn?.click();   /* core loads the source through its play button */
    });
    seek.addEventListener('change', () => { dragging = false; });
    seek.addEventListener('blur', () => { dragging = false; });
    /* the scrub line belongs to the reel, not to the rail: no rail drag, no slide change on its arrow keys */
    seek.addEventListener('pointerdown', e => e.stopPropagation());
    seek.addEventListener('keydown', e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') e.stopPropagation(); });

    /* pause / play: the cut's name is the button (keyboard), the picture is a shortcut for the mouse */
    const toggle = () => {
      if (!v.paused || resume) { held = true; resume = false; v.pause(); sync(); return; }
      held = false;
      if (v.readyState >= 1) v.play().catch(() => {}); else playBtn?.click();
    };
    btn?.addEventListener('click', toggle);
    v.addEventListener('click', toggle);
  });

  /* ---------- phones: one reel at ~74vw, the next peeking, through core's carousel (no autoplay: the reels play themselves) ---------- */
  let car = null;
  const LABEL = 'siesta g reel';
  mm.add('(max-width: 599px)', () => {
    if (!car) car = carousel(rail, { slides: '.vd-slide', interval: 0, label: LABEL });
    else {
      rail.classList.add('car'); rail.tabIndex = 0;
      rail.setAttribute('role', 'region'); rail.setAttribute('aria-roledescription', 'carousel'); rail.setAttribute('aria-label', LABEL);
    }
    return () => {
      rail.classList.remove('car'); rail.removeAttribute('tabindex'); rail.removeAttribute('role'); rail.removeAttribute('aria-roledescription');
      rail.setAttribute('aria-label', 'siesta g reel'); rail.scrollLeft = 0;
    };
  });

  /* ---------- client-name ticker ---------- */
  marquee(el.querySelector('.vd-ticker'), { speed: 46 });

  const words = [...el.querySelectorAll('.vd-lead, .vd-specs')];
  if (reduce) { gsap.set([...reels, ...words], { opacity: 1, clearProps: 'transform' }); return; }

  /* ---------- entrance: the two frames are set down one after the other, a little tilted, then straighten;
     the paragraph and the facts rise in. each part has its own IntersectionObserver, so it runs however the section is
     reached (scroll, menu, keys, hash) and never waits on a ScrollTrigger start a jump can land short of ---------- */
  const tilt = [-2.4, 2];
  gsap.set(reels, { opacity: 0, y: isDesktop ? 80 : 44, rotation: i => tilt[i] || 0 });
  gsap.set(words, { opacity: 0, y: isDesktop ? 40 : 24 });
  const enter = gsap.timeline({ paused: true, onComplete: () => reels.forEach(r => r.classList.add('is-done')) })
    .to(reels, { opacity: 1, duration: .6, ease: 'power1.out', stagger: .14 }, 0)
    .to(reels, { y: 0, rotation: 0, duration: 1.15, ease: 'expo.out', stagger: .14 }, 0);
  const parts = [[rail, enter, .12], ...words.map((w, i) => [w, gsap.timeline({ paused: true })
    .to(w, { opacity: 1, y: 0, duration: .8, ease: 'power3.out', clearProps: 'transform' }, i * .1), 0])];
  parts.forEach(([n, tl, threshold]) => onVisible(n, () => tl.play(), { threshold }));
  /* safety net: anything already scrolled past is finished at once, anything on screen plays in */
  const settle = () => parts.forEach(([n, tl]) => {
    if (tl.progress() === 1 || tl.isActive()) return;
    const r = n.getBoundingClientRect();
    if (r.bottom < 0) tl.progress(1);
    else if (r.top < innerHeight * .92) tl.play();
  });
  ScrollTrigger.addEventListener('scrollEnd', settle);
  ScrollTrigger.addEventListener('refresh', settle);

  /* ---------- desktop: the two reels drift a little against each other while the section passes (transform only) ---------- */
  mm.add('(min-width: 900px)', () => {
    el.querySelectorAll('.vd-slide').forEach((s, i) => {
      gsap.fromTo(s, { y: i ? -16 : 24 }, {
        y: i ? 28 : -20, ease: 'none',
        scrollTrigger: { trigger: rail, start: 'top bottom', end: 'bottom top', scrub: .6 },
      });
    });
  });
});

/* ===== 11-details.js ===== */
/* 11 — details. the big print always shows the whole piece; nothing scales it. the smaller close-up print
   beside it is already zoomed in on the focal point from data-fx / data-fy / data-zoom (so it never repeats
   the print next to it), holds for a beat once fully on screen, then pushes in to the full zoom (scrubbed,
   transform only, no pins) and is done before it reaches the upper third. reduced motion: the close-up is
   simply shown at full zoom. */
VM.section('details', ({ gsap, ScrollTrigger, reduce, el, scrollTo, rand }) => {
  const SALT = 11;
  const items = [...el.querySelectorAll('.dt-item')];
  const clamp01 = v => Math.min(1, Math.max(0, v));
  const split = () => window.matchMedia('(min-width: 700px)').matches;
  /* keep clear of the fixed mobile tab bar (56px + safe area) while the close-up is whole */
  const below = () => (window.innerWidth < 900 ? 72 : 12);

  /* "more in …" links: smooth scroll to the section the piece lives in */
  el.querySelectorAll('.dt-from').forEach(a => a.addEventListener('click', e => {
    const t = document.getElementById(a.getAttribute('href').slice(1));
    if (!t) return;
    e.preventDefault();
    scrollTo(t);
  }));

  const ins = [];
  items.forEach((item, i) => {
    const print = item.querySelector('.dt-print');
    const det = item.querySelector('.dt-det');
    const zoom = item.querySelector('.dt-zoom');
    const text = item.querySelector('.dt-text');
    if (!print || !det || !zoom) return;

    /* seeded tilt + tape placement: stable between loads, never the same twice.
       the close-up leans the other way from its print. */
    const rot = rand(i + 1, -1.1, 1.1, SALT);
    print.style.setProperty('--rot', `${rot.toFixed(2)}deg`);
    print.style.setProperty('--tx', `${rand(i + 1, 12, 64, SALT + 1).toFixed(0)}%`);
    print.style.setProperty('--tr', `${rand(i + 1, -7, 7, SALT + 2).toFixed(1)}deg`);
    det.style.setProperty('--rot', `${(-Math.sign(rot || 1) * rand(i + 1, .6, 1.6, SALT + 3)).toFixed(2)}deg`);

    /* the origin that lands the focal point in the middle of the window at full zoom, clamped to the
       edges so the window never runs off the photo */
    const z = Math.min(3, Math.max(1.2, +item.dataset.zoom || 2));
    const fx = (+item.dataset.fx || 50) / 100, fy = (+item.dataset.fy || 50) / 100;
    const ox = clamp01((fx - .5 / z) / (1 - 1 / z)), oy = clamp01((fy - .5 / z) / (1 - 1 / z));
    gsap.set(zoom, { transformOrigin: `${(ox * 100).toFixed(2)}% ${(oy * 100).toFixed(2)}%`, scale: reduce ? z : Math.min(1.5, z), force3D: false });
    if (reduce) return;

    gsap.timeline({
      scrollTrigger: {
        trigger: det, scrub: .5, invalidateOnRefresh: true,
        start: () => `bottom bottom-=${below()}`,
        /* done by the upper third; on very short screens keep at least 120px of scroll for the move */
        end: () => `top ${Math.round(Math.min(innerHeight * .3, innerHeight - below() - det.offsetHeight - 120))}px`,
      },
    })
      .to({}, { duration: .3 })
      .to(zoom, { scale: z, duration: 1, ease: 'power1.inOut', force3D: false })
      .to({}, { duration: .1 });

    /* text slides in from the right (two columns, so nothing ever passes under the left rail), or rises (stacked) */
    if (!text) return;
    const side = split() ? 1 : 0;
    const tw = gsap.from(text.children, {
      opacity: 0, x: side * 28, y: side ? 0 : 18, duration: .8, stagger: .07, ease: 'power3.out',
      paused: true, clearProps: 'opacity,transform',
    });
    ScrollTrigger.create({ trigger: text, start: 'top 88%', once: true, onEnter: () => tw.play() });
    ins.push({ n: text, tw });
  });
  if (reduce) return;

  /* safety net: after a jump (menu, keys, hash) or a fast fling nothing stays hidden.
     text already scrolled past finishes at once; text on screen plays in. */
  const title = el.querySelector('.sec-title');
  const settle = () => {
    const vh = window.innerHeight;
    ins.forEach(({ n, tw }) => {
      if (tw.progress() === 1 || tw.isActive()) return;
      const r = n.getBoundingClientRect();
      if (r.bottom < 0) tw.progress(1);
      else if (r.top < vh * .92) tw.play();
    });
    if (title && title.getBoundingClientRect().top < vh * .9) {
      gsap.getTweensOf(title.querySelectorAll('.ln')).forEach(t => { if (!t.isActive() && t.progress() < 1) t.progress(1); });
    }
  };
  ScrollTrigger.addEventListener('refresh', settle);
  ScrollTrigger.addEventListener('scrollEnd', settle);
});

/* ===== 12-archive.js ===== */
/* 12 · all work: every piece in the manifest on one wall, each at its true shape with a line on what is in it.
   masonry: the tiles stay in manifest order in the DOM (so tab and reading order run across the rows), each is placed
   absolutely in the shortest of n computed columns. elastic lag (after codrops/ElasticGridScroll): one ScrollTrigger scrub
   per column moves that column's inner wrappers (y +lag → −lag, transform only), the centre column least.
   filter chips re-lay the wall: a piece on screen before and after flies there with Flip, everything else fades in where it lands. */
VM.section('archive', ({ gsap, ScrollTrigger, Flip, mm, reduce, files, lenis, scrollTo, onVisible, el }) => {
  const CATS = [['all', 'all'], ['collage', 'collage'], ['sculpture', 'sculpture'], ['paper', 'on paper'], ['carmeet', 'car meet'],
    ['graduation', 'graduation'], ['modeling', 'modeling'], ['signs', 'signs'], ['video', 'video']];
  const NAME = Object.fromEntries(CATS);
  const wall = el.querySelector('[data-ar-wall]');
  const chipBox = el.querySelector('[data-ar-chips]');
  const status = el.querySelector('[data-ar-status]');
  if (!wall || !chipBox) return;
  /* the 26 tiles are static markup in the section's HTML (manifest order, a line on what is in each picture), so the menu
     counts them and the wall reads without JS. this script places them, filters them and wires the film tiles */
  const tiles = [...wall.querySelectorAll('.ar-tile')];
  const inner = t => t.firstElementChild;
  const count = c => (c === 'all' ? tiles : tiles.filter(t => t.dataset.cat === c)).length;

  /* ---- where each film plays: its player elsewhere on the page, else the video section ---- */
  const filmTarget = id => [...document.querySelectorAll(`main .vid[data-video="${id}"]`)].find(n => !el.contains(n)) || document.getElementById('video');
  wall.querySelectorAll('[data-film]').forEach(b => {
    const f = files.find(x => x.id === b.dataset.film), dest = filmTarget(f?.id)?.closest('.sec')?.dataset.label;
    if (f && dest) b.setAttribute('aria-label', `${f.title}, ${f.duration}-second film. go to the ${dest} section to watch it`);
  });
  /* the content cut opens on the same flyer as the client cut, so its tile shows a frame from 22 s in: a muted copy seeks
     there (a byte-range read, never the whole file) and paints that frame into the tile's own <img>. a server or browser
     that can't seek keeps the poster and its caption, which say the same thing truthfully */
  wall.querySelectorAll('img[data-at]').forEach(img => onVisible(img, () => {
    const t = +img.dataset.at, v = document.createElement('video');
    const end = () => { v.removeAttribute('src'); v.load(); };
    v.addEventListener('loadedmetadata', () => { if (v.seekable.length && v.seekable.end(v.seekable.length - 1) >= t) v.currentTime = t; else end(); });
    v.addEventListener('seeked', () => {
      try {
        if (Math.abs(v.currentTime - t) > .5) throw 0;
        const c = Object.assign(document.createElement('canvas'), { width: v.videoWidth, height: v.videoHeight });
        c.getContext('2d').drawImage(v, 0, 0);
        const g = Object.assign(document.createElement('canvas'), { width: 8, height: 8 }).getContext('2d');
        g.drawImage(c, 0, 0, 8, 8);
        if (g.getImageData(0, 0, 8, 8).data.reduce((a, x, k) => a + (k % 4 < 3 ? x : 0), 0) / 192 < 14) throw 0; /* a black, undecoded frame */
        c.toBlob(b => {
          if (!b) return;
          const tile = img.closest('.ar-tile'), h = tile.offsetHeight, u = URL.createObjectURL(b);
          ['load', 'error'].forEach(ev => img.addEventListener(ev, () => URL.revokeObjectURL(u), { once: true }));
          img.src = u; img.alt = img.dataset.atAlt;
          tile.querySelector('.ar-d').textContent = img.dataset.atSays;
          if (tile.offsetHeight !== h) relayout(); /* re-balance only if the new line changed the tile's height */
        }, 'image/webp', .86);
      } catch (e) { /* keep the poster */ }
      end();
    }, { once: true });
    Object.assign(v, { muted: true, playsInline: true, preload: 'metadata', src: img.src.replace(/-poster\.webp$/, '-720.mp4') });
  }, { rootMargin: '400px' }));

  /* ---- chips ---- */
  chipBox.innerHTML = CATS.filter(([k]) => count(k)).map(([k, label]) =>
    `<button type="button" class="ar-chip mono" data-cat="${k}" aria-pressed="${k === 'all'}">${label}<b>${count(k)}</b></button>`).join('');
  const chips = [...chipBox.querySelectorAll('.ar-chip')];

  /* ---- masonry ---- */
  let cols = 2, active = 'all', colOf = new Map(), lagTweens = [], sizesPx = 0;
  const shown = t => active === 'all' || t.dataset.cat === active;
  const wide = t => { const i = t.querySelector('img'); return +i.getAttribute('width') > +i.getAttribute('height'); };
  function layout() {
    const vis = tiles.filter(shown);
    /* a short filter on a big screen keeps the 3-up column width, centred; on a tablet a pair takes half the width each;
       on a phone a set of landscape frames (car meet) stacks full width instead of two thumbnails and a hole */
    let n = Math.min(cols, Math.max(2, vis.length)), div = Math.max(n, cols > 3 ? 3 : 2);
    if (cols === 2 && vis.every(wide)) n = div = 1;
    wall.style.setProperty('--div', div);
    tiles.forEach(t => { t.style.display = shown(t) ? '' : 'none'; });
    /* the browser picks each file for the column width it really gets (a short filter's wide columns get a bigger file) */
    const cw = vis[0]?.offsetWidth || 0;
    if (cw && cw !== sizesPx) { sizesPx = cw; wall.querySelectorAll('.ar-pic source').forEach(s => { s.sizes = `${cw}px`; }); }
    /* measure each tile at the column width, fill the shortest column first, then move or swap tiles between the
       tallest and shortest column until the bottoms line up; inside a column the pieces keep manifest order */
    const gap = parseFloat(getComputedStyle(wall).rowGap) || 0;
    const hs = vis.map(t => t.offsetHeight + gap);
    const asg = [], S = new Array(n).fill(0);
    hs.forEach((h, i) => { let k = 0; for (let j = 1; j < n; j++) if (S[j] < S[k] - 1) k = j; asg[i] = k; S[k] += h; });
    const spread = () => Math.max(...S) - Math.min(...S);
    for (let it = 0; it < 60; it++) {
      const A = S.indexOf(Math.max(...S)), B = S.indexOf(Math.min(...S)), now = spread();
      let best = null, bestV = now - 2;
      hs.forEach((hi, i) => {
        if (asg[i] !== A || i < n) return; /* the first n pieces stay as the top row, in order */
        S[A] -= hi; S[B] += hi; let v = spread(); S[A] += hi; S[B] -= hi;
        if (v < bestV) { bestV = v; best = [i, -1]; }
        hs.forEach((hj, j) => {
          if (asg[j] !== B || j < n) return;
          const dl = hi - hj; S[A] -= dl; S[B] += dl; v = spread(); S[A] += dl; S[B] -= dl;
          if (v < bestV) { bestV = v; best = [i, j]; }
        });
      });
      if (!best) break;
      const [i, j] = best;
      S[A] -= hs[i]; S[B] += hs[i]; asg[i] = B;
      if (j >= 0) { S[B] -= hs[j]; S[A] += hs[j]; asg[j] = A; }
    }
    const top = new Array(n).fill(0);
    colOf = new Map();
    vis.forEach((t, i) => { const k = asg[i]; colOf.set(t, k); t.style.setProperty('--x', (div - n) / 2 + k); t.style.top = `${top[k]}px`; top[k] += hs[i]; });
    wall.style.height = `${Math.max(0, Math.max(...top) - gap)}px`;
    return n;
  }

  /* ---- elastic lag: one scrub per column, centre column least ---- */
  function killLag() { lagTweens.forEach(t => { t.scrollTrigger?.kill(); t.kill(); }); lagTweens = []; gsap.set(tiles.map(inner), { clearProps: 'transform' }); }
  const syncLag = () => lagTweens.forEach(t => { if (t.scrollTrigger) t.progress(t.scrollTrigger.progress); });
  function buildLag(n) {
    killLag();
    /* only a wall taller than the screen lags: then y stays >= 0 while its top is on screen and <= 0 while
       its bottom is, so a column never rides into the chips above or the section below (a short filter sits still) */
    if (reduce || wall.offsetHeight < innerHeight * 1.1) return;
    const big = cols > 2;
    const base = big ? 16 : 18, spread = big ? 64 : 30;
    const mid = (n - 1) / 2;
    for (let i = 0; i < n; i++) {
      const col = tiles.filter(t => shown(t) && colOf.get(t) === i).map(inner);
      if (!col.length) continue;
      const d = n === 2 ? i : Math.abs(i - mid) / (mid || 1);
      const lag = Math.round(base + spread * d);
      lagTweens.push(gsap.fromTo(col, { y: lag }, {
        y: -lag, ease: 'none',
        scrollTrigger: { trigger: wall, start: 'top bottom', end: 'bottom top', scrub: +(0.3 + d * 1).toFixed(2), invalidateOnRefresh: true },
      }));
    }
    syncLag(); /* a rebuilt column starts where the scroll says, not at +lag */
  }
  ScrollTrigger.addEventListener('refresh', syncLag);
  /* re-measure every trigger on the page a frame later, once the wall's new height is in the layout */
  const relayout = () => { buildLag(layout()); requestAnimationFrame(() => { ScrollTrigger.refresh(); lenis?.resize(); }); };

  mm.add({ c4: '(min-width: 1200px)', c3: '(min-width: 600px) and (max-width: 1199.98px)', c2: '(max-width: 599.98px)' }, ({ conditions: c }) => {
    cols = c.c4 ? 4 : c.c3 ? 3 : 2;
    buildLag(layout());
    return killLag;
  });
  /* caption heights change once the fonts arrive and when the width changes: re-balance and re-measure every trigger */
  document.fonts?.ready.then(relayout);
  let lastW = innerWidth, rT = 0, rF = 0;
  window.addEventListener('resize', () => {
    if (innerWidth === lastW) return;
    lastW = innerWidth;
    cancelAnimationFrame(rF); rF = requestAnimationFrame(() => layout()); /* re-place at once: tiles never overlap mid-resize */
    clearTimeout(rT); rT = setTimeout(relayout, 220);
  });

  /* ---- entrances: tiles rise in as they reach the screen, a few at a time ---- */
  let io = null, onEnd = null;
  const byPos = (a, b) => a.offsetTop - b.offsetTop || a.offsetLeft - b.offsetLeft;
  if (!reduce) {
    gsap.set(tiles, { opacity: 0, y: 36 });
    let queue = [];
    const flush = () => {
      const q = queue.sort(byPos);
      queue = [];
      gsap.to(q, { opacity: 1, y: 0, duration: .8, ease: 'power3.out', stagger: .07, overwrite: 'auto', onComplete() { gsap.set(q, { clearProps: 'transform' }); } });
    };
    const take = t => { io?.unobserve(t); t.dataset.in = '1'; queue.push(t); };
    io = new IntersectionObserver(es => {
      es.forEach(e => { if (e.isIntersecting && !e.target.dataset.in) take(e.target); });
      if (queue.length) flush();
    }, { rootMargin: '0px 0px -6% 0px' });
    tiles.forEach(t => io.observe(t));
    /* safety net after a jump or a fling: anything on screen that is still hidden comes in */
    onEnd = () => {
      if (!io) return;
      tiles.forEach(t => {
        if (t.dataset.in || t.style.display === 'none') return;
        const r = t.getBoundingClientRect();
        if (r.bottom > 0 && r.top < innerHeight) take(t);
      });
      if (queue.length) flush();
    };
    ScrollTrigger.addEventListener('scrollEnd', onEnd);
  }
  const finishEntrances = () => {
    if (!io) return;
    io.disconnect(); io = null;
    ScrollTrigger.removeEventListener('scrollEnd', onEnd);
  };

  /* ---- filter ---- */
  let flipTl = null;
  const onScreen = t => { if (t.style.display === 'none') return false; const r = t.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; };
  const ratio = t => { const r = t.getBoundingClientRect(); return r.width / (r.height || 1); };
  function filter(cat) {
    if (cat === active) return;
    finishEntrances();
    flipTl?.progress(1); flipTl = null;           /* a click mid-flight lands the last one first */
    gsap.killTweensOf(tiles);
    gsap.set(tiles, { opacity: 1, clearProps: 'transform' });
    const before = tiles.filter(onScreen);
    const r0 = new Map(before.map(t => [t, ratio(t)]));
    const state = reduce || !Flip ? null : Flip.getState(before);
    const h0 = wall.offsetHeight;
    active = cat;
    chips.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cat === cat)));
    relayout();
    const k = tiles.filter(shown).length;
    status.textContent = cat === 'all' ? `showing all ${k} pieces` : `showing ${k} of ${files.length}: ${NAME[cat]}`;
    if (!state) return;
    /* only a piece on screen before and after, at the same shape, flies (a short hop, never across the page);
       every other piece fades in where it lands */
    const fly = before.filter(t => shown(t) && onScreen(t) && Math.abs(ratio(t) / r0.get(t) - 1) < .02);
    const leaving = before.filter(t => !shown(t));
    const appear = tiles.filter(t => shown(t) && !fly.includes(t));
    const seen = appear.filter(onScreen).sort(byPos);
    gsap.fromTo(seen, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: .6, delay: .12, stagger: .05, ease: 'power3.out', clearProps: 'transform' });
    if (!fly.length && !leaving.length) return;
    /* the leaving pieces fade fast, under the arriving ones, inside a wall held at its old height so they never spill
       into the next section; the wall lets go (and every trigger is re-measured) when the flight lands */
    if (h0 > wall.offsetHeight) wall.style.minHeight = `${h0}px`;
    gsap.set(tiles, { zIndex: (i, t) => (leaving.includes(t) ? 0 : 1) });
    flipTl = Flip.from(state, {
      targets: fly.concat(leaving), duration: .7, ease: 'power3.inOut', scale: true, absoluteOnLeave: true, stagger: .012, prune: true,
      onLeave: els => gsap.to(els, { opacity: 0, duration: .16, ease: 'power1.out' }),
      onComplete() {
        gsap.set(leaving, { opacity: 1 }); gsap.set(tiles, { clearProps: 'zIndex' }); flipTl = null;
        if (wall.style.minHeight) { wall.style.minHeight = ''; ScrollTrigger.refresh(); lenis?.resize(); }
      },
    });
  }
  chipBox.addEventListener('click', e => { const b = e.target.closest('.ar-chip'); if (b) filter(b.dataset.cat); });
  chipBox.addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = chips.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    chips[(i + (e.key === 'ArrowRight' ? 1 : -1) + chips.length) % chips.length].focus();
  });

  /* ---- films: go to where the film plays (centred under the top bar) ---- */
  wall.addEventListener('click', e => {
    const b = e.target.closest('[data-film]');
    const t = b && filmTarget(b.dataset.film);
    if (!t) return;
    /* a player that sits in a sideways rail (the video section's carousel on phones): bring its slide into view too */
    const rail = t.closest('.car');
    const slide = rail && [...rail.children].find(s => s.contains(t));
    if (slide && rail.scrollWidth > rail.clientWidth + 2) {
      rail.scrollTo({ left: Math.min(slide.offsetLeft - rail.firstElementChild.offsetLeft, rail.scrollWidth - rail.clientWidth), behavior: reduce ? 'auto' : 'smooth' });
    }
    const r = t.getBoundingClientRect();
    const off = t.matches('.sec') ? 0 : -Math.max(88, (innerHeight - r.height) / 2);
    if (lenis) scrollTo(t, { offset: off });
    else window.scrollTo({ top: r.top + scrollY + off, behavior: reduce ? 'auto' : 'smooth' });
  });
});

/* ===== 13-contact.js ===== */
VM.section('contact', ({ gsap, ScrollTrigger, mm, reduce, lenis, el, scrollTo }) => {
  const fitBox = el.querySelector('.ct-fit');
  const name = el.querySelector('.ct-name');
  const lines = [...el.querySelectorAll('.ct-ln')];
  const words = lines.map(l => l.querySelector('.ct-w'));
  const say = el.querySelector('.ct-say');
  const mail = el.querySelector('.ct-mail');
  const mailT = el.querySelector('.ct-mail-t');
  const list = el.querySelector('.ct-map-list');
  const narrow = window.matchMedia('(max-width: 599px)');

  /* ---------- fit to width (fitty-style): measure the text, scale its font-size until it spans the box ----------
     starts from a fixed 100px each time (never trusts a computed size mid-change), two refining passes for
     hinting drift, then a guard that steps down until it is never wider than the box. */
  const fitOne = (sizeEl, measureEl, avail, max = Infinity) => {
    if (!avail) return;
    let fs = 100;
    const set = v => { fs = v; sizeEl.style.fontSize = `${v.toFixed(2)}px`; };
    set(fs);
    for (let i = 0; i < 3; i++) {
      const w = measureEl.getBoundingClientRect().width;
      if (!w) return;
      const next = Math.min(max, fs * avail / w * 0.997);
      if (Math.abs(next - fs) < 0.05) break;
      set(next);
    }
    for (let g = 0; g < 40 && measureEl.getBoundingClientRect().width > avail; g++) set(fs - 0.5);
  };
  let lastW = -1, lastMode = null;
  const fit = (force = false) => {
    const avail = fitBox.clientWidth;
    const mode = narrow.matches ? 'two' : 'one';
    if (!force && avail === lastW && mode === lastMode) return;
    lastW = avail; lastMode = mode;
    if (mode === 'two') {           /* phone: two lines, each fitted on its own */
      name.style.fontSize = '';
      lines.forEach((ln, i) => fitOne(ln, words[i], avail));
    } else {                        /* one line */
      lines.forEach(ln => { ln.style.fontSize = ''; });
      fitOne(name, name, avail);
    }
    if (mailT && say) fitOne(mailT, mailT, say.clientWidth, parseFloat(getComputedStyle(mailT).getPropertyValue('--ct-mail-max')) || 96);
  };
  let raf = 0;
  const refit = (force = false) => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => fit(force)); };
  fit(true);
  document.fonts?.ready.then(() => refit(true));
  document.fonts?.addEventListener?.('loadingdone', () => refit(true));
  new ResizeObserver(() => refit()).observe(fitBox);
  narrow.addEventListener('change', () => refit(true));

  /* ---------- torn edge: hide it once the ground's top is up under the top bar ----------
     a scroll trigger re-checks on every scroll and refresh, so instant jumps (keys, hash, reduced motion) are caught too */
  const flush = s => el.classList.toggle('is-flush', s.progress > 0);
  ScrollTrigger.create({ trigger: el, start: 'top 92px', end: 'max', onUpdate: flush, onToggle: flush, onRefresh: flush });

  /* ---------- site map: every section in main, read at runtime (number + label; no counts, about has those) ---------- */
  const secs = [...document.querySelectorAll('main > .sec[data-n]')];
  const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  if (list) list.innerHTML = secs.map(s => {
    const here = s === el;
    return `<li><a href="#${s.id}" data-for="${s.id}"${here ? ' aria-current="location"' : ''}><span class="n mono">${esc(s.dataset.n)}</span>` +
      `<span class="l">${esc(s.dataset.label || s.id)}</span><span class="u${here ? ' mono' : ''}" aria-hidden="true">${here ? 'here' : '↑'}</span></a></li>`;
  }).join('');

  /* jump links (site map + back to top). keyboard (click with detail 0), reduced motion and no-lenis keep the browser's own
     fragment navigation: it moves the focus starting point to the target, and core's hashchange does the scroll.
     a mouse click gets the smooth scroll, then hands the same fragment over once it lands, so the next Tab
     starts inside the target instead of back down here */
  const land = id => { if (location.hash === `#${id}`) location.replace(`#${id}`); else location.hash = id; };
  const jump = (e, id) => {
    const t = document.getElementById(id);
    if (!t || e.detail === 0 || reduce || !lenis || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    scrollTo(t, { onComplete: () => land(id) });
  };
  list?.addEventListener('click', e => { const a = e.target.closest('a[data-for]'); if (a) jump(e, a.dataset.for); });

  /* ---------- credit straight from the manifest ---------- */
  try {
    const credit = JSON.parse(document.getElementById('files-json')?.textContent || '{}').artist?.fullCredit;
    const slot = el.querySelector('[data-credit]');
    if (credit && slot) slot.textContent = credit.toLowerCase();
  } catch (_) { /* keep the static credit */ }

  /* ---------- back to top ---------- */
  el.querySelector('.ct-top')?.addEventListener('click', e => jump(e, 'hero'));

  if (reduce) return; /* reduced motion: final state, no curtain (css), no rise, no magnet */

  /* ---------- closing reveal: the name rises line by line, the rest lifts in as the ground uncovers it ----------
     IntersectionObserver respects the section's overflow clip, so "visible" means uncovered by the curtain.
     it also reports on load, so a jump straight here (menu, keys, hash) plays everything in, and anything
     that went past above the screen in one go (a fast fling, a jump to the very end) is simply shown. */
  const pending = new Map();
  const enter = (n, play, show, threshold) => {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting && e.intersectionRatio >= threshold - 0.001) { io.disconnect(); pending.delete(n); play(); }
    }), { threshold: [0, threshold] });
    io.observe(n);
    pending.set(n, () => { io.disconnect(); show(); });
  };
  /* keyboard focus arriving while the curtain still covers the section (tab out of the archive): the focused link
     already sits inside the viewport, so the browser would not scroll. drop the curtain and show everything instead */
  el.addEventListener('focusin', e => {
    if (el.getBoundingClientRect().top <= 1 || !e.target.matches?.(':focus-visible')) return;
    pending.forEach(show => show()); pending.clear();
    scrollTo(el, { immediate: true });
  });
  /* IO stays silent when an element jumps from below the screen to above it, so check after each scroll */
  ScrollTrigger.addEventListener('scrollEnd', () => pending.forEach((show, n) => {
    if (n.getBoundingClientRect().bottom <= 0) { pending.delete(n); show(); }
  }));
  gsap.set(words, { yPercent: 112 });
  enter(name,
    () => gsap.to(words, { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: .14, onComplete: () => gsap.set(words, { clearProps: 'transform' }) }),
    () => gsap.set(words, { clearProps: 'transform' }), .25);
  el.querySelectorAll('[data-ct-in]').forEach(n => {
    const rows = n.matches('.ct-map') ? [...n.querySelectorAll('li')] : [];
    const show = () => gsap.set([n, ...rows], { clearProps: 'opacity,transform' });
    gsap.set(n, { opacity: 0, y: 22 });
    if (rows.length) gsap.set(rows, { opacity: 0, y: 16 });
    enter(n, () => {
      gsap.to(n, { opacity: 1, y: 0, duration: .8, ease: 'power3.out', onComplete: rows.length ? undefined : show });
      /* the map's rows print in one after another, down each column */
      if (rows.length) gsap.to(rows, { opacity: 1, y: 0, duration: .6, ease: 'power3.out', stagger: .045, delay: .1, onComplete: show });
    }, show, .3);
  });

  /* ---------- magnetic instagram link (desktop pointer only, transform only) ---------- */
  mm.add('(min-width: 900px) and (hover: hover) and (pointer: fine)', () => {
    const wrap = mail?.parentElement;
    if (!wrap) return;
    const xTo = gsap.quickTo(mail, 'x', { duration: .8, ease: 'elastic.out(1, .4)' });
    const yTo = gsap.quickTo(mail, 'y', { duration: .8, ease: 'elastic.out(1, .4)' });
    const clamp = gsap.utils.clamp;
    const move = e => {
      const r = wrap.getBoundingClientRect(); /* the wrapper never moves, so there is no feedback loop */
      xTo(clamp(-16, 16, (e.clientX - (r.left + r.width / 2)) * .06));
      yTo(clamp(-9, 9, (e.clientY - (r.top + r.height / 2)) * .3));
    };
    const leave = () => { xTo(0); yTo(0); };
    mail.addEventListener('pointermove', move);
    mail.addEventListener('pointerleave', leave);
    return () => { mail.removeEventListener('pointermove', move); mail.removeEventListener('pointerleave', leave); gsap.set(mail, { clearProps: 'transform' }); };
  });
});
