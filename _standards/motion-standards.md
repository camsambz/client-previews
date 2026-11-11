# Motion Standards: Animation Libraries for Client Sites

Use with design-standards.md, seo-standards.md and **interface-polish-standards.md** (how motion should feel: easing, duration, press feedback, what not to animate — read it before writing any animation). These libraries make sites feel premium. The rules below keep them from hurting speed, phones, accessibility or SEO, which matter more than any effect.

## The toolkit

Pinned copies live in the `camsambz/client-previews` repo under `lib/` and are served with the drafts. Never load an unpinned "latest" version.

| Library | Version | License | Load from a draft | What it's for |
|---|---|---|---|---|
| Lenis | 1.3.27 | MIT | `../lib/lenis-1.3.27/lenis.min.js` + `lenis.css` | Smooth scrolling |
| GSAP + plugins | 3.15.1 | GSAP standard "no charge" license (free, commercial OK) | `../lib/gsap-3.15.1/gsap.min.js`, then plugins: `ScrollTrigger`, `SplitText`, `ScrollToPlugin`, `Flip`, `CustomEase`, `DrawSVGPlugin`, `MorphSVGPlugin`, `TextPlugin`, `ScrambleTextPlugin`, `Observer`, `MotionPathPlugin` | Scroll reveals, text animation, transitions |
| Vanta | 0.5.24 | MIT | `../lib/three-0.134.0/three.min.js` then `../lib/vanta-0.5.24/vanta.<effect>.min.js` | Animated 3D hero or band backgrounds |
| Fun Mode | 1.0 (ours) | Original code by The Academy | `../lib/funmode-1.0/funmode.js` | Opt-in arcade mini game over the page |
| React Bits | reference only | MIT + Commons Clause | Not loaded. Effects are rebuilt in plain JS/CSS (usually with GSAP) inside the client's site | Effect ideas and recipes |

Source repos: github.com/darkroomengineering/lenis, github.com/greensock/GSAP, github.com/tengbao/vanta, github.com/DavidHDev/react-bits.

License notes:
- GSAP: allowed on any client website, including AI-written GSAP code. Not allowed inside a no-code visual animation builder that competes with Webflow. Never remove the license comment at the top of the files.
- React Bits: effects may be used inside a client website. The components themselves may not be copied into a shared library, sold, or redistributed, so they are never vendored into our repo. Port only the effect a site needs, inside that site, with a one-line credit comment (`/* Effect adapted from React Bits (reactbits.dev), MIT + Commons Clause */`).
- Live sites (go-live): copy the needed `lib/` files into the client's own site folder or GHL media, or use the same pinned version from cdn.jsdelivr.net. Keep the license comments.

## Non-negotiable rules

1. **Complete without animation.** Every word, photo, button and price is visible and usable if JavaScript is off, the libraries fail to load, or the visitor has reduced motion on. Never set content to `opacity: 0` in CSS. Hide elements only from JavaScript, right before animating them in, and only when motion is allowed.
2. **Respect reduced motion.** If `prefers-reduced-motion: reduce` matches: no Lenis, no Vanta, no scroll-triggered movement. Simple instant states only.
3. **Phones first.** Vanta and other WebGL effects run only on screens ≥ 900px wide with a mouse (`(min-width: 900px) and (hover: hover)`). Phones get a static fallback: the brand color, a CSS gradient, or the photo. Lenis keeps native touch scrolling (`syncTouch: false`).
4. **Speed budget.** Animation scripts are loaded with `defer` at the end of the page and never block the first paint. Three.js and Vanta (~650KB) load only when the screen qualifies, by injecting the script tags from JavaScript. A draft must still pass the QA script.
5. **SEO-safe text.** Text effects (split, scramble, typewriter, rotating words) animate text that is already in the HTML. Headings must contain the full real text at load; never build a heading's text from JavaScript only. SplitText adds `aria-label` with the full sentence; keep it. Gradient text (`background-clip: text`) breaks when split into words: give the split pieces the same background and clip (e.g. `.glow * { background: inherit; background-clip: text; color: transparent; }`), or the words turn invisible.
6. **One hero moment.** At most one headline animation and one background effect per page. Scroll reveals are subtle: fade plus 16–24px rise, 0.5–0.8s, small stagger. Nothing loops forever near text people need to read. Decorations attached to a split headline (underlines, highlights) stay hidden until the words land, then draw in.
7. **Contrast stays legal.** Text over a Vanta background sits on a solid or semi-solid panel, or the effect uses low-contrast brand tints, so text keeps 4.5:1 contrast at every frame.
8. **Clean up.** In single-file drafts with hash-routed views: call `lenis.scrollTo(0, { immediate: true })` on view change, `ScrollTrigger.refresh()` after a view becomes visible, and `vantaEffect.destroy()` when its view is hidden or the screen shrinks below 900px.
9. **No gimmicks that cost trust.** No custom cursors replacing the real one, no scroll-jacking that changes how far a scroll goes, no autoplay sound, no loaders or intro screens, no effects that hide the booking or contact button.

## Picking effects by style words (from the brief's Look & feel)

| Style words | Smooth scroll | Headline | Scroll reveals | Background (desktop only) | React Bits ideas to port |
|---|---|---|---|---|---|
| Modern, Bold, Techy | Yes | SplitText words or chars rising | Yes | Vanta NET, DOTS, GLOBE or HALO in brand colors | DecryptedText, ShinyText, SpotlightCard, Magnet button, CountUp |
| Luxury, Minimal, Classic | Yes, slower (`lerp: 0.08`) | Line-by-line mask reveal | Yes, slow and sparse | Usually none; Vanta FOG at very low intensity at most | BlurText, GradualBlur, FadeContent |
| Friendly, Warm, Playful, Family-owned | Yes | Words pop up with a gentle bounce | Yes | Vanta WAVES or CLOUDS in soft brand tints, or none | RotatingText, CountUp, BounceCards, ClickSpark (subtle) |
| Rustic, Traditional | Optional | Simple fade | Light | None | FadeContent, CountUp for real numbers only |
| Medical, Legal, Financial | Yes | Simple fade | Light | None or Vanta FOG very subtle | CountUp for real numbers only, SpotlightCard |

CountUp-style number animations only ever count up to numbers the client gave.

## Standard setup (copy into the site's script, after the content)

```html
<link rel="stylesheet" href="../lib/lenis-1.3.27/lenis.css">
<script defer src="../lib/lenis-1.3.27/lenis.min.js"></script>
<script defer src="../lib/gsap-3.15.1/gsap.min.js"></script>
<script defer src="../lib/gsap-3.15.1/ScrollTrigger.min.js"></script>
<script defer src="../lib/gsap-3.15.1/SplitText.min.js"></script>
<script>/* motion layer below, inline at the end of <body> */</script>
```

```js
// motion: progressive enhancement only
window.addEventListener("load", function () {
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !window.gsap) return;               // site already works without this
  gsap.registerPlugin(ScrollTrigger, SplitText);

  // 1. Smooth scroll, driven by GSAP's ticker so ScrollTrigger stays in sync
  var lenis = window.Lenis ? new Lenis({ syncTouch: false }) : null;
  if (lenis) {
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  // 2. Scroll reveals: only in the visible view, only for elements below the fold
  //    (hidden views would otherwise leave content stuck invisible)
  var done = new WeakSet();
  function setupReveals() {
    gsap.utils.toArray(".view:not([hidden]) [data-reveal]").forEach(function (el) {
      if (done.has(el)) return; done.add(el);
      if (el.getBoundingClientRect().top < innerHeight * 0.9) return;
      gsap.from(el, { autoAlpha: 0, y: 20, duration: 0.7, ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 90%", once: true } });
    });
    ScrollTrigger.refresh();
  }
  setupReveals();

  // 3. One headline moment
  var h = document.querySelector("[data-split]");
  if (h && window.SplitText) {
    var split = SplitText.create(h, { type: "words", mask: "words", aria: "auto" });
    gsap.from(split.words, { yPercent: 110, duration: 0.8, stagger: 0.06, ease: "power3.out" });
  }

  // 4. Desktop-only Vanta background on an element marked data-vanta="waves"
  var bg = document.querySelector("[data-vanta]");
  var big = matchMedia("(min-width: 900px) and (hover: hover)");
  var fx = null;
  function loadScript(src) { return new Promise(function (ok, no) { var s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); }); }
  function startVanta() {
    if (!bg || fx || !big.matches) return;
    var kind = bg.getAttribute("data-vanta");
    loadScript("../lib/three-0.134.0/three.min.js")
      .then(function () { return loadScript("../lib/vanta-0.5.24/vanta." + kind + ".min.js"); })
      .then(function () { fx = VANTA[kind.toUpperCase()]({ el: bg, THREE: window.THREE, mouseControls: true, touchControls: false, gyroControls: false /* brand colors here */ }); })
      .catch(function () {});                         // static fallback stays
  }
  function stopVanta() { if (fx) { fx.destroy(); fx = null; } }
  startVanta();
  big.addEventListener("change", function () { big.matches ? startVanta() : stopVanta(); });

  // 5. Hash-routed views: reset and re-measure after each view change
  window.addEventListener("hashchange", function () {
    if (lenis) lenis.scrollTo(0, { immediate: true });
    requestAnimationFrame(setupReveals);
  });
});
```

Working reference: `salty-paws/index.html` in the repo (smooth scroll, reveals, word-pop headline, desktop-only Vanta WAVES on the closing band).

## Fun Mode (optional add-on)

An opt-in mini game: a "Fun mode" switch in the header turns the page into a shooter. Themed enemies drift over the site, the visitor clicks or holds Space to fire, and the HUD shows score, combo (up to ×8), hi-score and unlocks (Missiles 1,000 · Auto gunner 2,500 · Blast ×2 5,000 · Power ×2 8,000). Esc or the switch exits. Working reference: `halo-orbital/index.html`.

When to use it: only when the brief's style words include Playful, Techy, Bold or Fun, or the client asks for it. Never on Medical, Legal, Financial, Luxury or Classic sites unless the client asks. It is a talking point, not a feature, so mention it in the review email as optional.

Rules:
- Off by default and never starts on its own. The switch only appears on screens with a mouse (`(hover: hover) and (pointer: fine)`); phones and tablets never see it.
- Header and HUD stay clickable while it runs; scrolling still works; Esc always exits; the tab pauses it when hidden.
- The theme comes from the brand: accent colors, font, and enemy names that fit the business in a light, friendly way (a groomer's "TANGLES" and "MUD", a roofer's "LEAKS"). Never name competitors, customers or anything negative about real people.
- Hi-score is kept only in the visitor's browser.

Setup: put an empty `<button id="funToggle" type="button" hidden>Fun mode</button>` in the header, then at the end of `<body>`:

```html
<script defer src="../lib/funmode-1.0/funmode.js"></script>
<script>
window.addEventListener("load", function () {
  if (!window.FunMode) return;
  FunMode.init({ toggle: "#funToggle", theme: {
    accent: "#brand", accent2: "#second", font: "'Brand Mono', monospace",
    title: "Clear the orbit", storageKey: "<slug>-funmode-hi",
    enemies: [{ label: "SPACE JUNK", points: 10, hp: 1, scale: 4, sprite: ["..##..", "######", ".#..#."] }],
    boss: { label: "SOLAR FLARE", points: 80, hp: 6, scale: 6 }
  }});
});
</script>
```

Sprites are rows of text where `#` is a pixel; leave `sprite` out to use the built-in shapes. At go-live, copy `funmode.js` into the client's site with the other libraries.

## Easing and duration

Follow interface-polish-standards.md: ease-out for enter and exit (never ease-in on UI), custom
cubic-beziers rather than the weak built-ins, UI under 300ms, `:active` press feedback on every
pressable element, transform and opacity only, hover motion gated to real pointers.

## Checks (audits and QA)

- Both audits judge motion against this file: content visible with motion off, reduced motion respected, no WebGL on phones, contrast over animated backgrounds, headings complete in the HTML, no gimmicks.
- The QA script runs the site with reduced motion on and with scripts blocked, and fails if any view has invisible text (opacity 0 or visibility hidden on content) or the page widens on a phone.
