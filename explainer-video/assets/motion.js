// Shared animation helpers used by every scene in compositions/.
// Each scene builds its own GSAP timeline and calls these with it.
window.HF = (() => {
  const BEAT = 0.5; // 120 BPM: keep in sync with BPM in music/compose.mjs

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  // Seeded random: renders must be identical every time
  const rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

  // The scene's length as set on its slot in index.html (so trimming a scene
  // in Studio moves its exit transition too). Falls back to the scene's own value.
  function sceneDuration(id, fallback) {
    const host = document.querySelector(`[data-composition-src][data-composition-id="${id}"]`);
    const d = host && parseFloat(host.dataset.duration);
    return d > 0 ? d : fallback;
  }

  // Split every ".split" element in a scene into words so each word can pop in.
  // (The scenes now have their words written out in the HTML, so Studio can edit
  // each word; this is only for text you mark with class="split" yourself.)
  function splitWords(scope) {
    scope.querySelectorAll(".split").forEach((el) => {
      const nodes = Array.from(el.childNodes);
      el.innerHTML = "";
      nodes.forEach((n) => {
        const m = document.createElement("span");
        m.className = "wm";
        if (n.nodeType === 3) {
          n.textContent
            .split(/\s+/)
            .filter(Boolean)
            .forEach((word) => {
              const mm = m.cloneNode();
              const w = document.createElement("span");
              w.className = "w";
              w.textContent = word;
              mm.appendChild(w);
              el.appendChild(mm);
            });
        } else {
          n.classList.add("w");
          m.appendChild(n);
          el.appendChild(m);
        }
      });
    });
  }

  // Replace a headline's words (used by the headline / call-to-action variables).
  // Leaves the line alone when the text is unchanged, so colors you gave single
  // words in Studio are kept.
  function setWords(el, text) {
    if (!el || !text) return;
    const current = Array.from(el.querySelectorAll(".w")).map((w) => w.textContent).join(" ");
    if (current === text.trim().replace(/\s+/g, " ")) return;
    el.innerHTML = "";
    text.split(/\s+/).filter(Boolean).forEach((word, i) => {
      const m = document.createElement("span");
      m.className = "wm";
      const w = document.createElement("span");
      w.className = "w";
      w.id = `${el.id}-w${i + 1}`;
      w.textContent = word;
      m.appendChild(w);
      el.appendChild(m);
    });
  }

  // Pop shapes in, make them float on the beat, spin slowly
  function animateShapes(tl, list, start, dur) {
    list.forEach((s, k) => {
      const inner = s.firstChild;
      const rot = parseFloat(s.dataset.rot);
      tl.fromTo(s, { scale: 0, rotation: rot - 90 }, { scale: 1, rotation: rot, duration: 0.6, ease: "back.out(2.5)" }, start + 0.05 * k);
      tl.fromTo(
        s,
        { y: 0 },
        { y: -26 - 10 * (k % 3), duration: BEAT, ease: "sine.inOut", yoyo: true, repeat: Math.max(0, Math.floor((dur - 0.6) / BEAT) - 1) },
        start + 0.6,
      );
      if (!s.classList.contains("s-dots"))
        tl.fromTo(inner, { rotation: 0 }, { rotation: (k % 2 ? 1 : -1) * (40 + 15 * (k % 4)), duration: dur, ease: "none" }, start);
    });
  }

  const popWords = (tl, sel, t, opts = {}) =>
    tl.fromTo(
      `${sel} .w`,
      { yPercent: 110, rotation: 8 },
      { yPercent: 0, rotation: 0, duration: opts.d || 0.55, ease: "back.out(1.8)", stagger: opts.stagger || 0.08 },
      t,
    );

  const pop = (tl, sel, t, extra = {}) =>
    tl.fromTo(sel, { scale: 0.4, opacity: 0, y: 40 }, { scale: 1, opacity: 1, y: 0, duration: 0.55, ease: "back.out(2)", ...extra }, t);

  // Colored diagonal wipes at the start (reveal) and end (cover) of a scene.
  // The wipe panels are written in each scene's HTML (#<scene>-wipe-in / -out),
  // so their colors can be changed in Studio. The cover at the end of one scene
  // and the reveal at the start of the next use the same colors, hiding the cut.
  function wipes(tl, dur, wipeIn, wipeOut) {
    [wipeIn, wipeOut].forEach((w) => w && tl.set(w.querySelectorAll(".p"), { skewX: -12 }, 0));
    if (wipeIn) {
      const [a, b] = wipeIn.querySelectorAll(".p");
      tl.fromTo(a, { xPercent: 0 }, { xPercent: 130, duration: 0.35, ease: "power3.out" }, 0);
      tl.fromTo(b, { xPercent: 0 }, { xPercent: 130, duration: 0.3, ease: "power3.out" }, 0.03);
    }
    if (wipeOut) {
      const [a, b] = wipeOut.querySelectorAll(".p");
      tl.fromTo(a, { xPercent: -130 }, { xPercent: 0, duration: 0.3, ease: "power3.in" }, dur - 0.35);
      tl.fromTo(b, { xPercent: -130 }, { xPercent: 0, duration: 0.3, ease: "power3.in" }, dur - 0.3);
    }
  }

  return { BEAT, $, $$, rng, sceneDuration, splitWords, setWords, animateShapes, popWords, pop, wipes };
})();
