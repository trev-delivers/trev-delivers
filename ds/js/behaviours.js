/**
 * Behaviours for the components that cannot be done in CSS alone.
 *
 * Dependency-free ES modules, no framework. Each one takes a DOM element and
 * returns either a teardown function or a small control object, which is
 * exactly the shape a React effect wants:
 *
 *   useEffect(() => mountBootRing(ref.current), []);
 *
 * Every function reads its timing from the component's own CSS custom
 * properties rather than hard-coding it, so retiming a component is still a
 * CSS change and the two can never disagree.
 */

/** Parses a CSS time value ("250ms", "0.4s") into milliseconds. */
export function cssMs(value, fallback) {
  const n = parseFloat(value);
  if (Number.isNaN(n)) return fallback;
  return /ms\s*$/.test(String(value).trim()) ? n : n * 1000;
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Builds a t-boot-ring's dots and starts the power-on sequence.
 *
 * Positions are computed here because there is no calc(sin()/cos()) to lean
 * on yet. Call it as soon as the element exists; pass { start: false } if the
 * ring is hidden and should not begin booting until you reveal it, then call
 * the returned start().
 */
export function mountBootRing(el, { start = true } = {}) {
  if (!el) return { start() {}, destroy() {} };
  const cs = getComputedStyle(el);
  const count = parseInt(cs.getPropertyValue("--boot-count"), 10) || 12;
  const radius = parseFloat(cs.getPropertyValue("--boot-radius")) || 22;
  const step = cssMs(cs.getPropertyValue("--boot-step"), 60);
  const lead = cssMs(cs.getPropertyValue("--boot-lead"), 500);

  el.replaceChildren();
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    const dot = document.createElement("i");
    dot.style.setProperty("--x", `${(Math.cos(angle) * radius).toFixed(2)}px`);
    dot.style.setProperty("--y", `${(Math.sin(angle) * radius).toFixed(2)}px`);
    dot.style.setProperty("--boot-delay", `${(lead + i * step).toFixed(0)}ms`);
    el.appendChild(dot);
  }

  const begin = () => el.classList.add("is-running");
  if (start) begin();
  return { start: begin, destroy: () => el.replaceChildren() };
}

/**
 * Drives a t-check-badge between its spinning and done states.
 *
 * done(hold) resolves to the check and, unless hold is 0, reverts to spinning
 * after that many ms. The re-entry dance in done() is deliberate: setting
 * data-state to done while it is already done would not restart the pop
 * animation, so it is knocked back to spinning and reflowed first.
 */
export function checkMorph(badge, blurWrap) {
  if (!badge) return { done() {}, spin() {}, destroy() {} };
  const mark = badge.querySelector(".t-check-mark");
  let blurTimer;
  let revertTimer;

  if (mark) badge.style.setProperty("--check-mark-len", String(Math.ceil(mark.getTotalLength())));

  function crossBlur() {
    if (!blurWrap) return;
    clearTimeout(blurTimer);
    blurWrap.classList.add("is-crossing");
    const fillDur = cssMs(getComputedStyle(badge).getPropertyValue("--check-fill-dur"), 350);
    blurTimer = setTimeout(() => blurWrap.classList.remove("is-crossing"), fillDur * 0.45);
  }

  function spin() {
    clearTimeout(revertTimer);
    crossBlur();
    badge.setAttribute("data-state", "spinning");
  }

  function done(hold = 2000) {
    clearTimeout(revertTimer);
    if (badge.getAttribute("data-state") === "done") {
      badge.setAttribute("data-state", "spinning");
      void badge.offsetWidth;
    }
    badge.setAttribute("data-state", "done");
    crossBlur();
    if (hold > 0) revertTimer = setTimeout(spin, hold);
  }

  return {
    done,
    spin,
    destroy() {
      clearTimeout(blurTimer);
      clearTimeout(revertTimer);
    },
  };
}

/**
 * Plays the error shake on a .t-input, and schedules the revert.
 *
 * The remove/reflow/add is what lets two wrong answers in a row each get their
 * own shake rather than the second being swallowed by the first.
 */
export function shake(field, wrap) {
  if (!field) return;
  const target = wrap ?? field.closest(".t-input-wrap") ?? field.parentElement;

  target?.classList.add("is-error");
  field.classList.add("is-error");

  if (!prefersReducedMotion()) {
    field.classList.remove("is-shaking");
    void field.offsetWidth;
    field.classList.add("is-shaking");
  }

  const hold = cssMs(getComputedStyle(target ?? field).getPropertyValue("--revert-hold"), 3000);
  clearTimeout(field._revertTimer);
  field._revertTimer = setTimeout(() => {
    target?.classList.remove("is-error");
    field.classList.remove("is-error");
  }, hold);
}

/**
 * Cycles a t-think through a list of phrases and returns a stop function.
 *
 * Sizes the hidden sizer to the widest phrase in the pool rather than the
 * widest of the ones being shown, so a later shuffle can never clip.
 */
export function cycleThink(container, phrases, { pool = phrases } = {}) {
  const textEl = container?.querySelector(".t-think-text");
  const sizerEl = container?.querySelector(".t-think-sizer");
  if (sizerEl && pool?.length) {
    sizerEl.textContent = pool.reduce((a, b) => (b.length > a.length ? b : a));
  }
  if (!textEl || !phrases || phrases.length < 1) return () => {};

  const setText = (s) => {
    textEl.textContent = s;
    textEl.setAttribute("data-text", s);
  };
  setText(phrases[0]);
  if (phrases.length < 2) return () => {};

  const cs = getComputedStyle(container);
  const hold = cssMs(cs.getPropertyValue("--think-hold"), 750);
  const swap = cssMs(cs.getPropertyValue("--think-swap"), 150);
  const gap = cssMs(cs.getPropertyValue("--think-gap"), 50);

  let i = 0;
  let timer;
  function advance() {
    i = (i + 1) % phrases.length;
    const next = phrases[i];
    textEl.classList.add("is-exit");
    timer = setTimeout(() => {
      setText(next);
      textEl.classList.remove("is-exit");
      textEl.classList.add("is-enter-start");
      void textEl.offsetWidth;
      textEl.classList.remove("is-enter-start");
      timer = setTimeout(advance, hold);
    }, swap + gap);
  }
  timer = setTimeout(advance, hold);
  return () => clearTimeout(timer);
}

/** Fisher-Yates, for phrase pools that should not repeat their order. */
export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Releases .t-reveal elements as they scroll into view.
 *
 * Fails open: with no IntersectionObserver, everything is revealed at once
 * rather than left invisible, because the CSS starts these hidden.
 */
export function revealOnScroll(root = document, { selector = ".t-reveal, .t-reveal--seq", threshold = 0.2, step = 90 } = {}) {
  const els = [...root.querySelectorAll(selector)];
  if (!els.length) return () => {};

  if (typeof IntersectionObserver === "undefined" || prefersReducedMotion()) {
    els.forEach((el) => el.classList.add("in"));
    return () => {};
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const siblings = [...(entry.target.parentElement?.children ?? [])].filter((n) => els.includes(n));
        const index = Math.max(0, siblings.indexOf(entry.target));
        setTimeout(() => entry.target.classList.add("in"), index * step);
        io.unobserve(entry.target);
      });
    },
    { threshold },
  );
  els.forEach((el) => io.observe(el));
  return () => io.disconnect();
}

/**
 * Wraps a heading's words in .t-word spans so they can arrive one at a time.
 *
 * Punctuation that followed a word with no space is marked --tail and stays
 * inline, so the browser's line-breaking rules keep it attached rather than
 * stranding it at the start of the next line.
 */
export function splitWords(el, { tail = /^[.,;:!?'’”)\]]+$/ } = {}) {
  if (!el) return [];
  const words = el.textContent.split(/(\s+)/);
  el.replaceChildren();
  const spans = [];
  for (const part of words) {
    if (/^\s+$/.test(part)) {
      el.appendChild(document.createTextNode(part));
      continue;
    }
    const span = document.createElement("span");
    span.className = tail.test(part) ? "t-word t-word--tail" : "t-word";
    span.textContent = part;
    el.appendChild(span);
    spans.push(span);
  }
  return spans;
}

/** Reveals split words in sequence. Returns a cancel function. */
export function revealWords(spans, { step = 55, delay = 0 } = {}) {
  if (prefersReducedMotion()) {
    spans.forEach((s) => s.classList.add("in"));
    return () => {};
  }
  const timers = spans.map((span, i) => setTimeout(() => span.classList.add("in"), delay + i * step));
  return () => timers.forEach(clearTimeout);
}

/**
 * Confetti burst.
 *
 * Paper flakes with real physics that collide with the trigger, modelled as
 * a pill with flat top and circular end caps, then settle and pile on it.
 *
 * Every number comes from the CSS custom properties on :root — count,
 * gravity, size, sway, bounce, how long it holds and how long it fades — so
 * tuning it stays a CSS job. See components/confetti.css.
 *
 *   const stop = mountConfetti({ stage, canvas, trigger });
 *
 * Does nothing under reduced motion, and returns a teardown either way.
 */
export function mountConfetti({ stage, canvas, trigger }) {
  if (!stage || !canvas || !trigger) return () => {};
  if (prefersReducedMotion()) return () => {};
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};


  function readNum(name, fallback){
    var raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    if(!raw) return fallback;
    if(raw.endsWith('ms')) return parseFloat(raw);
    if(raw.endsWith('s') && !raw.endsWith('ms')) return parseFloat(raw) * 1000;
    var n = parseFloat(raw);
    return isNaN(n) ? fallback : n;
  }

  var COLORS = ['#ff4d67', '#ffb020', '#3b82f6', '#22c55e', '#a855f7', '#f97316', '#06b6d4', '#f43f5e'];

  var particles = [];
  var running = false;
  var lastT = 0;
  var burstEnd = 0;
  var fadeStart = null;
  var stageW = 0;
  var stageH = 0;

  // The stage's own box stays exactly the button's size (so it never
  // affects the row's layout), so the fall room lives entirely on the
  // canvas: it bleeds HEADROOM px above the stage via absolute
  // positioning, which doesn't add to anyone's layout size. Kept to
  // the existing gap above the button (the paragraph's own margin) so
  // it doesn't bleed into that text instead.
  var HEADROOM = 24;

  function sizeCanvas(){
    var r = stage.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    stageW = r.width;
    stageH = r.height + HEADROOM;
    canvas.style.top = (-HEADROOM) + 'px';
    canvas.style.height = stageH + 'px';
    canvas.width = Math.round(stageW * dpr);
    canvas.height = Math.round(stageH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function buttonRect(){
    var s = stage.getBoundingClientRect();
    var b = btn.getBoundingClientRect();
    return {
      left: b.left - s.left, right: b.right - s.left,
      top: (b.top - s.top) + HEADROOM, bottom: (b.bottom - s.top) + HEADROOM
    };
  }

  function buttonSurface(x, b){
    if(x < b.left || x > b.right) return null;
    var r = (b.bottom - b.top) / 2;
    var lc = b.left + r;
    var rc = b.right - r;
    if(x >= lc && x <= rc) return { y: b.top, slope: 0 };
    var cx = x < lc ? lc : rc;
    var dx = x - cx;
    var root = Math.sqrt(Math.max(r * r - dx * dx, 0));
    return { y: b.top + (r - root), slope: dx / Math.max(root, 0.001) };
  }

  function burst(){
    sizeCanvas();
    var now = performance.now();
    var count = Math.round(readNum('--confetti-count', 120));
    var size = readNum('--confetti-size', 8);
    var spawnWindow = 500;

    particles = [];
    fadeStart = null;
    for(var i=0; i<count; i++){
      particles.push({
        start: now + Math.random() * spawnWindow,
        x: Math.random() * stageW,
        y: -12 - Math.random() * 30,
        py: -12,
        vx: (Math.random() - 0.5) * 60,
        vy: 40 + Math.random() * 120,
        w: size * (0.7 + Math.random() * 0.6),
        h: size * (0.5 + Math.random() * 0.5),
        maxFall: 420 + Math.random() * 280,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 7,
        tumble: Math.random() * Math.PI * 2,
        tumbleSpeed: 4 + Math.random() * 8,
        squish: 1,
        phase: Math.random() * Math.PI * 2,
        swayFreq: 2 + Math.random() * 3,
        swayScale: 0.5 + Math.random(),
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        bounces: 0,
        resting: false,
        dead: false
      });
    }
    burstEnd = now + spawnWindow + 100;
    if(!running){
      running = true;
      lastT = now;
      requestAnimationFrame(frame);
    }
  }

  function step(dt, now){
    var g = readNum('--confetti-gravity', 1300);
    var sway = readNum('--confetti-sway', 16);
    var restitution = readNum('--confetti-bounce', 0.3);
    var b = buttonRect();

    particles.forEach(function(p){
      if(p.resting || p.dead || now < p.start) return;

      p.py = p.y;
      p.vy += g * dt;
      if(p.vy > p.maxFall) p.vy = p.maxFall;
      p.phase += p.swayFreq * dt;
      p.x += (p.vx + Math.cos(p.phase) * sway * p.swayScale) * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.tumble += p.tumbleSpeed * dt;
      p.squish = 0.25 + 0.75 * Math.abs(Math.cos(p.tumble));

      var half = p.h / 2;

      if(p.vy > 0){
        var s = buttonSurface(p.x, b);
        if(s && p.y + half >= s.y && p.py + half <= s.y + 2){
          if(Math.abs(s.slope) > 0.85){
            var dir = p.x < (b.left + b.right) / 2 ? -1 : 1;
            p.vx = dir * Math.max(Math.abs(p.vx), 50 + Math.random() * 50);
            p.vy *= 0.35;
            p.y = s.y - half;
          } else if(p.vy > 150 && p.bounces < 2){
            p.bounces++;
            p.vy = -p.vy * restitution * (0.6 + Math.random() * 0.5);
            p.vx = p.vx * 0.7 + s.slope * 40 + (Math.random() - 0.5) * 40;
            p.y = s.y - half;
          } else {
            p.resting = true;
            p.y = s.y - half - 0.5;
            p.vx = 0;
            p.vy = 0;
          }
        }
      }

      if(!p.resting && p.y + half >= stageH - 1){
        if(p.vy > 170 && p.bounces < 2){
          p.bounces++;
          p.vy = -p.vy * restitution * (0.5 + Math.random() * 0.4);
          p.vx *= 0.7;
          p.y = stageH - 1 - half;
        } else {
          p.resting = true;
          p.y = stageH - 1 - half;
          p.vx = 0;
          p.vy = 0;
        }
      }

      if(p.x < -30 || p.x > stageW + 30 || p.y > stageH + 30) p.dead = true;
    });
  }

  function draw(alpha){
    ctx.clearRect(0, 0, stageW, stageH);
    ctx.globalAlpha = alpha;
    var now = performance.now();
    particles.forEach(function(p){
      if(p.dead || now < p.start) return;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(1, p.squish);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
    ctx.globalAlpha = 1;
  }

  function frame(now){
    if(!running) return;
    var remaining = Math.min((now - lastT) / 1000, 0.25);
    lastT = now;
    while(remaining > 0){
      var dt = Math.min(remaining, 1 / 60);
      step(dt, now);
      remaining -= dt;
    }

    var settled = now > burstEnd && particles.every(function(p){ return p.resting || p.dead; });
    if(settled && fadeStart === null) fadeStart = now + readNum('--confetti-hold', 1600);

    var alpha = 1;
    if(fadeStart !== null && now >= fadeStart){
      var fade = Math.max(readNum('--confetti-fade', 600), 1);
      alpha = 1 - (now - fadeStart) / fade;
      if(alpha <= 0){
        running = false;
        particles = [];
        ctx.clearRect(0, 0, stageW, stageH);
        return;
      }
    }

    draw(alpha);
    requestAnimationFrame(frame);
  }

  btn.addEventListener('click', burst);
  window.addEventListener('resize', function(){ if(running) sizeCanvas(); });

  return () => {
    trigger.removeEventListener("click", burst);
  };
}
