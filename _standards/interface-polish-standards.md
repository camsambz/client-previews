# Interface Polish Standards

Rules for how things move, press and respond. Use with design-standards.md, motion-standards.md
and seo-standards.md. motion-standards.md covers which libraries to load and how to keep a page
fast and accessible. This file covers whether a thing should move at all, and how it should feel.

Adapted for our vanilla single-file builds from **Emil Kowalski's skills for designers and
engineers** (github.com/emilkowalski/skills, MIT licensed, © 2026 Emil Kowalski). Emil wrote
Sonner and Vaul and worked at Vercel and Linear. Credit him when sharing this.

---

## 1. Should it animate at all?

How often will the visitor see it?

| How often | What to do |
|---|---|
| 100+ times a day (keyboard shortcuts, a menu toggle) | No animation. Ever. |
| Tens of times a day (hovers, list navigation) | Remove it, or make it tiny |
| Occasional (modals, drawers, toasts, a booking panel) | Normal animation |
| Rare or first-time (hero, onboarding, a thank-you state) | Room for delight |

Every animation must answer "why does this move?" — spatial consistency, state change, feedback,
explanation, or stopping a jarring jump. "It looks cool" on something seen often is a no.
When in doubt, delete it. On client sites the hero is the one place delight is always earned.

## 2. Easing

- Entering or exiting → **ease-out**. **Never `ease-in` on UI**: it delays the first moment,
  which is exactly when the visitor is looking.
- Moving or morphing on screen → ease-in-out.
- Hover and colour changes → ease.
- Constant motion (marquee, progress bar) → linear.

Built-in CSS easings are too weak. Put these on `:root` and use them:

```css
--ease-out: cubic-bezier(.23,1,.32,1);
--ease-in-out: cubic-bezier(.77,0,.175,1);
--ease-drawer: cubic-bezier(.32,.72,0,1);   /* iOS-like sheets */
```

GSAP equivalents: `power3.out` for enter/exit, `power2.inOut` for movement, `none` for constant.

## 3. Duration

| Thing | Duration |
|---|---|
| Button press feedback | 100–160ms |
| Tooltips, small popovers | 125–200ms |
| Dropdowns, selects, menus | 150–250ms |
| Modals, drawers, booking panels | 200–300ms |
| Hero and explanatory motion | Longer is fine |

**UI stays under 300ms.** Anything slower needs a stated reason. In our builds, write the reason
in the code as `/* slow-ok: ... */` on that line; the QA script accepts the exception only then.

## 4. Physical correctness

- **Never animate from `scale(0)`.** Nothing in the real world appears from nothing. Start at
  `scale(.95)` with `opacity: 0`.
- **Popovers, dropdowns and tooltips scale from their trigger**, not from the middle
  (`transform-origin`). Modals are the exception: they stay centred.
- `translateY(100%)` moves an element by its own height — prefer percentages to pixel guesses.
- `scale()` scales children too, which is what you want on a pressed button.

## 5. Press feedback

Every pressable element answers the press:

```css
.btn { transition: transform .16s var(--ease-out); }
.btn:active { transform: scale(.97); }           /* .95–.98, never lower */
.btn { -webkit-tap-highlight-color: transparent; touch-action: manipulation; user-select: none; }
```

## 6. Performance

- Animate **`transform` and `opacity` only**. Animating `width`, `height`, `top`, `left`,
  `margin` or `padding` runs off the GPU and drops frames. A bar that fills is `scaleX`, not
  `width`.
- Never `transition: all` — name the properties.
- Use CSS **transitions, not keyframes**, for anything that can be re-triggered quickly:
  transitions retarget from where they are, keyframes restart from zero.
- Keep `filter: blur()` under 20px; it is expensive, especially in Safari.

## 7. Accessibility and phones

- `prefers-reduced-motion` drops **movement**, but keeps opacity and colour so the interface
  still responds. Do not blanket-kill every transition.
- Gate hover motion behind `@media (hover:hover) and (pointer:fine)` or it sticks after a tap.
- Use `dvh`, not `vh`, for full-height areas, or the layout jumps as mobile browser chrome moves.
- Inputs at 16px or larger, or iOS zooms on focus.

## 8. Asymmetry and choreography

- Deliberate actions (a press, a confirm) can animate slower; system responses snap.
- Several items entering together get a **30–80ms stagger**, not all at once.
- Motion should match the brand: a groomer can bounce a little, a biotech stays crisp.

## 9. Blur bridges a rough crossfade

When two states swap and it looks like two objects overlapping, add `filter: blur(2px)` during
the transition. It blends them into one movement.

---

## How this is enforced

- **Build:** follow this file alongside motion-standards.md.
- **Audits:** both the standard and hostile audits check every animation against sections 1–8,
  and report findings as a `| Before | After | Why |` table.
- **QA (`qa.py`):** fails the build on `transition: all`, `ease-in` on UI, any transition over
  300ms without a stated `/* slow-ok: */` reason, `scale(0)` entrances, missing `:active` press
  feedback, ungated hover motion, animated layout properties, and missing tap-highlight handling.
