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
