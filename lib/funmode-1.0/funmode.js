/*!
 * Fun Mode 1.0 — an opt-in arcade shooter layered over a live website.
 * Original code by The Academy for client sites. No dependencies.
 *
 * Usage:
 *   <button id="funToggle"></button>   // any empty button; Fun Mode turns it into a labelled switch
 *   <script src="../lib/funmode-1.0/funmode.js" defer></script>
 *   <script>window.addEventListener("load", function () { FunMode.init({ toggle: "#funToggle", theme: {...} }); });</script>
 *
 * Theme options (all optional):
 *   accent, accent2, ink, panel          colors (CSS strings)
 *   font                                 HUD font stack
 *   title                                short line shown on the HUD, e.g. "Clear the orbit"
 *   enemies: [{ label, points, hp, sprite, scale }]   small enemies (sprite = array of strings, "#" = pixel)
 *   boss:     { label, points, hp, sprite, scale }    big enemy, appears every few seconds
 *   unlocks:  [{ at, key, name }]  keys: "missiles" | "gunner" | "blast" | "power"
 *   storageKey                           where the hi-score is kept (per site)
 *
 * Rules it follows (see motion-standards.md): off by default, never starts by itself,
 * only offered on screens with a mouse, ESC or the switch always exits, page stays usable.
 */
(function () {
  "use strict";
  if (window.FunMode) return;

  var DEFAULT_SMALL = [
    "...#####...",
    ".#########.",
    "##.##.##.##",
    "###########",
    "..##...##..",
    ".#.......#."
  ];
  var DEFAULT_BOSS = [
    "....#######....",
    "..###########..",
    ".#############.",
    "###..##.##..###",
    "###############",
    "..###.....###..",
    ".##..#####..##.",
    "##...........##"
  ];

  var S = null; // state while running

  function css(el, o) { for (var k in o) el.style[k] = o[k]; return el; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function store(key, val) { try { if (val === undefined) return +localStorage.getItem(key) || 0; localStorage.setItem(key, String(val)); } catch (e) { return 0; } }

  function spriteCanvas(rows, color, px) {
    var w = rows[0].length, h = rows.length, c = document.createElement("canvas");
    c.width = w * px; c.height = h * px;
    var g = c.getContext("2d"); g.fillStyle = color;
    rows.forEach(function (r, y) { for (var x = 0; x < w; x++) if (r[x] === "#") g.fillRect(x * px, y * px, px, px); });
    return c;
  }

  function init(opts) {
    opts = opts || {};
    var fine = matchMedia("(hover: hover) and (pointer: fine)");
    var toggle = typeof opts.toggle === "string" ? document.querySelector(opts.toggle) : opts.toggle;
    if (!toggle) return;
    var t = opts.theme || {};
    var theme = {
      accent: t.accent || "#ff5a2e", accent2: t.accent2 || "#ffd166", ink: t.ink || "#f5f5f5",
      panel: t.panel || "rgba(10,10,14,.92)", font: t.font || "ui-monospace, SFMono-Regular, Menlo, monospace",
      title: t.title || "Fun mode",
      enemies: t.enemies || [{ label: "BUG", points: 10, hp: 1 }],
      boss: t.boss || { label: "BIG BUG", points: 60, hp: 4 },
      unlocks: t.unlocks || [
        { at: 1000, key: "missiles", name: "Missiles" },
        { at: 2500, key: "gunner", name: "Auto gunner" },
        { at: 5000, key: "blast", name: "Blast ×2" },
        { at: 8000, key: "power", name: "Power ×2" }
      ],
      storageKey: t.storageKey || ("funmode-hi:" + location.pathname)
    };

    // The switch
    toggle.type = "button";
    toggle.setAttribute("role", "switch");
    toggle.setAttribute("aria-checked", "false");
    toggle.classList.add("fm-switch");
    toggle.innerHTML = '<span class="fm-switch-label">Fun mode</span><span class="fm-track" aria-hidden="true"><span class="fm-knob"></span></span>';
    injectStyles(theme);
    function syncAvail() { toggle.hidden = !fine.matches; if (!fine.matches && S) stop(); }
    syncAvail();
    fine.addEventListener("change", syncAvail);
    toggle.addEventListener("click", function () { S ? stop() : start(theme, toggle); });
  }

  function injectStyles(th) {
    if (document.getElementById("fm-styles")) return;
    var s = document.createElement("style"); s.id = "fm-styles";
    s.textContent =
      ".fm-switch{display:inline-flex;align-items:center;gap:10px;min-height:44px;padding:6px 12px;border-radius:999px;border:1px solid rgba(255,255,255,.18);background:transparent;color:inherit;font:600 .74rem " + th.font + ";letter-spacing:.14em;text-transform:uppercase;cursor:pointer}" +
      ".fm-switch[hidden]{display:none!important}" +
      ".fm-switch:hover{border-color:" + th.accent + "}" +
      ".fm-track{width:30px;height:16px;border-radius:999px;background:rgba(255,255,255,.18);position:relative;transition:background .2s}" +
      ".fm-knob{position:absolute;left:2px;top:2px;width:12px;height:12px;border-radius:50%;background:#fff;transition:transform .2s}" +
      ".fm-switch[aria-checked=true] .fm-track{background:" + th.accent + "}" +
      ".fm-switch[aria-checked=true] .fm-knob{transform:translateX(14px)}" +
      ".fm-canvas{position:fixed;inset:0;z-index:45;cursor:crosshair;touch-action:none}" +
      ".fm-hud{position:fixed;left:50%;bottom:calc(16px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:70;display:flex;align-items:stretch;border:2px solid " + th.accent + ";background:" + th.panel + ";color:" + th.ink + ";font:600 11px " + th.font + ";letter-spacing:.08em;text-transform:uppercase;box-shadow:0 0 30px -6px " + th.accent + ";max-width:calc(100vw - 24px)}" +
      ".fm-hud>div{padding:10px 14px;border-left:1px solid rgba(255,255,255,.14);display:grid;gap:6px;align-content:center}" +
      ".fm-hud>div:first-child{border-left:0}" +
      ".fm-hud small{opacity:.6;font-size:10px}" +
      ".fm-hud b{font-size:20px;letter-spacing:.06em;font-variant-numeric:tabular-nums}" +
      ".fm-hud .fm-hi b{color:" + th.accent + "}" +
      ".fm-chips{display:flex;gap:6px;flex-wrap:wrap}" +
      ".fm-chips span{border:1px solid rgba(255,255,255,.22);padding:4px 7px;opacity:.45}" +
      ".fm-chips span.on{opacity:1;border-color:" + th.accent2 + ";color:" + th.accent2 + ";box-shadow:0 0 12px -4px " + th.accent2 + "}" +
      ".fm-chips span.next{opacity:.9;border-style:dashed;border-color:" + th.accent + "}" +
      ".fm-exit{background:none;border:0;color:inherit;font:inherit;cursor:pointer;display:grid;gap:4px;justify-items:center;padding:0}" +
      ".fm-exit kbd{border:1px solid rgba(255,255,255,.5);padding:3px 6px;font:inherit}" +
      ".fm-hint{position:fixed;left:50%;bottom:calc(92px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:70;color:" + th.ink + ";font:600 11px " + th.font + ";letter-spacing:.14em;text-transform:uppercase;text-shadow:0 1px 8px #000;pointer-events:none;transition:opacity .6s}" +
      "@media (max-width:760px){.fm-hud .fm-unlocks{display:none}}";
    document.head.appendChild(s);
  }

  function start(th, toggle) {
    var cv = document.createElement("canvas"); cv.className = "fm-canvas"; cv.setAttribute("aria-hidden", "true");
    var hud = document.createElement("div"); hud.className = "fm-hud"; hud.setAttribute("role", "region"); hud.setAttribute("aria-label", "Fun mode score");
    var hi = store(th.storageKey);
    hud.innerHTML =
      '<div><small>Score</small><b class="fm-score">000000</b></div>' +
      '<div><small>Combo</small><b class="fm-combo">×1</b></div>' +
      '<div class="fm-hi"><small>Hi-score</small><b class="fm-hiv">' + pad(hi) + "</b></div>" +
      '<div class="fm-unlocks"><small class="fm-next"></small><span class="fm-chips">' +
      th.unlocks.map(function (u) { return '<span data-k="' + u.key + '">' + u.name + "</span>"; }).join("") + "</span></div>" +
      '<div><button class="fm-exit" type="button"><kbd>Esc</kbd>Exit</button></div>';
    var hint = document.createElement("div"); hint.className = "fm-hint"; hint.textContent = th.title + " · click or hold space to fire";
    var live = document.createElement("div"); live.className = "fm-live"; live.setAttribute("aria-live", "polite");
    css(live, { position: "absolute", width: "1px", height: "1px", overflow: "hidden", clip: "rect(0 0 0 0)" });
    document.body.append(cv, hud, hint, live);
    toggle.setAttribute("aria-checked", "true");

    var dpr = Math.min(window.devicePixelRatio || 1, 2), g = cv.getContext("2d");
    function size() { cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; cv.style.width = innerWidth + "px"; cv.style.height = innerHeight + "px"; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.imageSmoothingEnabled = false; }
    size();

    var sprites = th.enemies.map(function (e) { return spriteCanvas(e.sprite || DEFAULT_SMALL, th.accent, e.scale || 3); });
    var bossSprite = spriteCanvas(th.boss.sprite || DEFAULT_BOSS, th.accent, th.boss.scale || 4);
    var bossHit = spriteCanvas(th.boss.sprite || DEFAULT_BOSS, "#ffffff", th.boss.scale || 4);

    S = {
      th: th, toggle: toggle, cv: cv, g: g, hud: hud, hint: hint, live: live,
      enemies: [], shots: [], missiles: [], parts: [], beams: [], texts: [],
      score: 0, hi: hi, combo: 1, comboT: 0, mouse: { x: innerWidth / 2, y: innerHeight / 3 },
      firing: false, fireCd: 0, missileCd: 0, gunCd: 0, spawnCd: 0.3, bossCd: 9,
      unlocked: {}, last: performance.now(), raf: 0, running: true,
      sprites: sprites, bossSprite: bossSprite, bossHit: bossHit
    };

    S.onMove = function (e) { S.mouse.x = e.clientX; S.mouse.y = e.clientY; };
    S.onDown = function (e) { if (e.button !== 0) return; S.mouse.x = e.clientX; S.mouse.y = e.clientY; S.firing = true; fire(); };
    S.onUp = function () { S.firing = false; };
    S.onKey = function (e) {
      var typing = /INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || "");
      if (e.key === "Escape") { stop(); toggle.focus(); return; }
      if (e.code === "Space" && !typing) { e.preventDefault(); if (e.type === "keydown") { if (!S.firing) fire(); S.firing = true; } else S.firing = false; }
    };
    S.onVis = function () { S.running = !document.hidden; S.last = performance.now(); };
    cv.addEventListener("pointermove", S.onMove);
    cv.addEventListener("pointerdown", S.onDown);
    addEventListener("pointerup", S.onUp);
    addEventListener("keydown", S.onKey);
    addEventListener("keyup", S.onKey);
    addEventListener("resize", size);
    document.addEventListener("visibilitychange", S.onVis);
    S.size = size;
    hud.querySelector(".fm-exit").addEventListener("click", function () { stop(); toggle.focus(); });
    setTimeout(function () { if (S) hint.style.opacity = "0"; }, 4500);
    updateHud();
    live.textContent = "Fun mode on. Click or hold space to fire. Press Escape to exit.";
    S.raf = requestAnimationFrame(loop);
  }

  function stop() {
    if (!S) return;
    cancelAnimationFrame(S.raf);
    S.cv.removeEventListener("pointermove", S.onMove);
    S.cv.removeEventListener("pointerdown", S.onDown);
    removeEventListener("pointerup", S.onUp);
    removeEventListener("keydown", S.onKey);
    removeEventListener("keyup", S.onKey);
    removeEventListener("resize", S.size);
    document.removeEventListener("visibilitychange", S.onVis);
    S.cv.remove(); S.hud.remove(); S.hint.remove(); S.live.remove();
    S.toggle.setAttribute("aria-checked", "false");
    S = null;
  }

  function pad(n) { return String(Math.min(999999, Math.floor(n))).padStart(6, "0"); }

  function topEdge() { var h = document.querySelector("header"); return h ? Math.max(0, h.getBoundingClientRect().bottom) : 0; }

  function origin() { return { x: innerWidth / 2, y: innerHeight - 124 }; }

  function fire() {
    if (!S || S.fireCd > 0) return;
    S.fireCd = 0.16;
    var o = origin(), dx = S.mouse.x - o.x, dy = S.mouse.y - o.y, d = Math.hypot(dx, dy) || 1;
    var spread = S.unlocked.power ? [-0.06, 0.06] : [0];
    spread.forEach(function (a) {
      var c = Math.cos(a), s = Math.sin(a), vx = (dx * c - dy * s) / d, vy = (dx * s + dy * c) / d;
      S.shots.push({ x: o.x, y: o.y, vx: vx * 1500, vy: vy * 1500, life: 1.2 });
    });
  }

  function spawn(boss) {
    var th = S.th, i = Math.floor(Math.random() * th.enemies.length), def = boss ? th.boss : th.enemies[i];
    var sp = boss ? S.bossSprite : S.sprites[i];
    var top = topEdge(), y = rnd(top + 40, Math.max(top + 60, innerHeight * (boss ? 0.5 : 0.66))), dir = Math.random() < 0.5 ? 1 : -1;
    S.enemies.push({
      boss: !!boss, def: def, sp: sp, w: sp.width, h: sp.height,
      x: dir > 0 ? -sp.width : innerWidth + sp.width, y: y, baseY: y,
      vx: dir * rnd(boss ? 60 : 80, boss ? 90 : 170), amp: rnd(10, boss ? 30 : 46), ph: rnd(0, 6.28), freq: rnd(1, 2.2),
      hp: def.hp || 1, flash: 0
    });
  }

  function hitEnemy(e, dmg) {
    e.hp -= dmg; e.flash = 0.08;
    if (e.hp > 0) { burst(e.x, e.y, 6, 120); return; }
    S.enemies.splice(S.enemies.indexOf(e), 1);
    S.combo = S.comboT > 0 ? Math.min(8, S.combo + 1) : 1; S.comboT = 1.6;
    var pts = (e.def.points || 10) * S.combo * 10;
    S.score += pts;
    S.texts.push({ x: e.x, y: e.y - e.h / 2 - 8, t: "+" + pts, life: 0.9 });
    burst(e.x, e.y, e.boss ? 60 : 26, e.boss ? 380 : 260);
    if (S.unlocked.blast) {
      var r = e.boss ? 180 : 110;
      S.enemies.slice().forEach(function (o) { if (Math.hypot(o.x - e.x, o.y - e.y) < r) hitEnemy(o, 1); });
    }
    if (S.score > S.hi) { S.hi = S.score; store(S.th.storageKey, S.hi); }
    checkUnlocks(); updateHud();
  }

  function burst(x, y, n, sp) {
    for (var i = 0; i < n; i++) {
      var a = rnd(0, 6.28), v = rnd(sp * 0.3, sp);
      S.parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rnd(0.35, 0.8), c: Math.random() < 0.3 ? S.th.accent2 : S.th.accent, s: rnd(2, 4) });
    }
  }

  function checkUnlocks() {
    S.th.unlocks.forEach(function (u) {
      if (!S.unlocked[u.key] && S.score >= u.at) {
        S.unlocked[u.key] = true;
        S.texts.push({ x: innerWidth / 2, y: innerHeight * 0.4, t: u.name.toUpperCase() + " UNLOCKED", life: 1.8, big: true });
        S.live.textContent = u.name + " unlocked.";
      }
    });
  }

  function updateHud() {
    var h = S.hud;
    h.querySelector(".fm-score").textContent = pad(S.score);
    h.querySelector(".fm-combo").textContent = "×" + S.combo;
    h.querySelector(".fm-hiv").textContent = pad(S.hi);
    var next = S.th.unlocks.find(function (u) { return !S.unlocked[u.key]; });
    h.querySelector(".fm-next").textContent = next ? "Next unlock at " + next.at.toLocaleString() : "All unlocked";
    h.querySelectorAll(".fm-chips span").forEach(function (c) {
      var k = c.getAttribute("data-k");
      c.classList.toggle("on", !!S.unlocked[k]);
      c.classList.toggle("next", !!next && next.key === k);
    });
  }

  function nearest(x, y) {
    var best = null, bd = 1e9;
    S.enemies.forEach(function (e) { var d = Math.hypot(e.x - x, e.y - y); if (d < bd) { bd = d; best = e; } });
    return best;
  }

  function loop(now) {
    if (!S) return;
    S.raf = requestAnimationFrame(loop);
    var dt = Math.min(0.033, (now - S.last) / 1000); S.last = now;
    if (!S.running) return;
    var g = S.g, W = innerWidth, H = innerHeight, th = S.th;

    // timers
    S.fireCd -= dt; if (S.firing) fire();
    S.comboT -= dt; if (S.comboT <= 0 && S.combo !== 1) { S.combo = 1; updateHud(); }
    S.spawnCd -= dt;
    if (S.spawnCd <= 0 && S.enemies.length < 9) { spawn(false); S.spawnCd = rnd(0.5, 1.2); }
    S.bossCd -= dt;
    if (S.bossCd <= 0) { spawn(true); S.bossCd = rnd(12, 18); }

    var o = origin();
    if (S.unlocked.missiles) {
      S.missileCd -= dt;
      if (S.missileCd <= 0 && S.enemies.length) { S.missileCd = 1.4; [-1, 1].forEach(function (s) { S.missiles.push({ x: o.x + s * 30, y: o.y, vx: s * 160, vy: -260, life: 3 }); }); }
    }
    if (S.unlocked.gunner) {
      S.gunCd -= dt;
      var tgt = nearest(o.x, o.y);
      if (S.gunCd <= 0 && tgt) { S.gunCd = 0.55; S.beams.push({ x1: o.x, y1: o.y, x2: tgt.x, y2: tgt.y, life: 0.12 }); hitEnemy(tgt, 1); }
    }

    g.clearRect(0, 0, W, H);

    // enemies
    S.enemies.slice().forEach(function (e) {
      e.x += e.vx * dt; e.ph += dt * e.freq; e.y = e.baseY + Math.sin(e.ph) * e.amp; e.flash -= dt;
      if ((e.vx > 0 && e.x > W + e.w) || (e.vx < 0 && e.x < -e.w)) { S.enemies.splice(S.enemies.indexOf(e), 1); return; }
      var img = e.boss && e.flash > 0 ? S.bossHit : e.sp;
      g.globalAlpha = e.flash > 0 && !e.boss ? 0.5 : 1;
      g.drawImage(img, Math.round(e.x - e.w / 2), Math.round(e.y - e.h / 2));
      g.globalAlpha = 1;
      g.font = "600 " + (e.boss ? 11 : 9) + "px " + th.font; g.textAlign = "center"; g.fillStyle = th.ink;
      g.fillText(e.def.label, e.x, e.y + e.h / 2 + 13);
      if (e.boss) { var bw = e.w; g.fillStyle = "rgba(255,255,255,.2)"; g.fillRect(e.x - bw / 2, e.y - e.h / 2 - 10, bw, 3); g.fillStyle = th.accent2; g.fillRect(e.x - bw / 2, e.y - e.h / 2 - 10, bw * Math.max(0, e.hp) / (e.def.hp || 1), 3); }
    });

    // shots
    g.lineCap = "round";
    S.shots.slice().forEach(function (s) {
      var px = s.x, py = s.y;
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      var hit = null;
      for (var i = 0; i < S.enemies.length && !hit; i++) { var e = S.enemies[i]; if (Math.abs(s.x - e.x) < e.w / 2 + 4 && Math.abs(s.y - e.y) < e.h / 2 + 4) hit = e; }
      g.strokeStyle = th.accent; g.lineWidth = 3; g.shadowColor = th.accent; g.shadowBlur = 12;
      g.beginPath(); g.moveTo(px - s.vx * 0.03, py - s.vy * 0.03); g.lineTo(s.x, s.y); g.stroke(); g.shadowBlur = 0;
      if (hit) { S.shots.splice(S.shots.indexOf(s), 1); hitEnemy(hit, 1); }
      else if (s.life <= 0 || s.x < -20 || s.x > W + 20 || s.y < -20 || s.y > H + 20) S.shots.splice(S.shots.indexOf(s), 1);
    });

    // missiles (home on nearest)
    S.missiles.slice().forEach(function (m) {
      var tg = nearest(m.x, m.y);
      if (tg) { var dx = tg.x - m.x, dy = tg.y - m.y, d = Math.hypot(dx, dy) || 1; m.vx += dx / d * 900 * dt; m.vy += dy / d * 900 * dt; var sp = Math.hypot(m.vx, m.vy); if (sp > 520) { m.vx *= 520 / sp; m.vy *= 520 / sp; } }
      m.x += m.vx * dt; m.y += m.vy * dt; m.life -= dt;
      S.parts.push({ x: m.x, y: m.y, vx: 0, vy: 0, life: 0.25, c: th.accent2, s: 2 });
      g.fillStyle = th.accent2; g.fillRect(m.x - 3, m.y - 3, 6, 6);
      var hit = tg && Math.abs(m.x - tg.x) < tg.w / 2 && Math.abs(m.y - tg.y) < tg.h / 2 ? tg : null;
      if (hit) { S.missiles.splice(S.missiles.indexOf(m), 1); hitEnemy(hit, 2); }
      else if (m.life <= 0) S.missiles.splice(S.missiles.indexOf(m), 1);
    });

    // gunner beams
    S.beams.slice().forEach(function (b) {
      b.life -= dt;
      g.strokeStyle = th.accent2; g.globalAlpha = Math.max(0, b.life / 0.12); g.lineWidth = 2;
      g.beginPath(); g.moveTo(b.x1, b.y1); g.lineTo(b.x2, b.y2); g.stroke(); g.globalAlpha = 1;
      if (b.life <= 0) S.beams.splice(S.beams.indexOf(b), 1);
    });

    // particles
    S.parts.slice().forEach(function (p) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.94; p.vy *= 0.94; p.life -= dt;
      if (p.life <= 0) { S.parts.splice(S.parts.indexOf(p), 1); return; }
      g.globalAlpha = Math.min(1, p.life * 2); g.fillStyle = p.c; g.fillRect(p.x, p.y, p.s, p.s);
    });
    g.globalAlpha = 1;
    if (S.parts.length > 900) S.parts.splice(0, S.parts.length - 900);

    // floating score text
    S.texts.slice().forEach(function (tx) {
      tx.life -= dt; tx.y -= (tx.big ? 10 : 40) * dt;
      if (tx.life <= 0) { S.texts.splice(S.texts.indexOf(tx), 1); return; }
      g.globalAlpha = Math.min(1, tx.life * 2); g.fillStyle = tx.big ? th.accent2 : th.ink;
      g.font = "700 " + (tx.big ? 22 : 12) + "px " + th.font; g.textAlign = "center"; g.fillText(tx.t, tx.x, tx.y);
    });
    g.globalAlpha = 1;

    // turret and aim line
    var ang = Math.atan2(S.mouse.y - o.y, S.mouse.x - o.x);
    g.save(); g.translate(o.x, o.y); g.rotate(ang + Math.PI / 2);
    g.fillStyle = th.accent; g.shadowColor = th.accent; g.shadowBlur = 16;
    g.beginPath(); g.moveTo(0, -18); g.lineTo(12, 12); g.lineTo(0, 6); g.lineTo(-12, 12); g.closePath(); g.fill();
    g.restore(); g.shadowBlur = 0;
    g.strokeStyle = "rgba(255,255,255,.12)"; g.setLineDash([4, 8]); g.lineWidth = 1;
    g.beginPath(); g.moveTo(o.x, o.y); g.lineTo(S.mouse.x, S.mouse.y); g.stroke(); g.setLineDash([]);
    // reticle
    g.strokeStyle = th.accent; g.lineWidth = 2; var m = S.mouse, r = 10;
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) { g.beginPath(); g.moveTo(m.x + q[0] * r, m.y + q[1] * (r - 5)); g.lineTo(m.x + q[0] * r, m.y + q[1] * r); g.lineTo(m.x + q[0] * (r - 5), m.y + q[1] * r); g.stroke(); });
  }

  window.FunMode = { init: init, stop: stop, isOn: function () { return !!S; },
    _dbg: function () { var e = S && S.enemies.filter(function (e) { return e.x > 20 && e.x < innerWidth - 20; })[0]; return e ? [e.x + e.vx * 0.05, e.y] : null; } };
})();
