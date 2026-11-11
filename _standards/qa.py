"""Production QA for a single-file client site.

Usage: python3 qa.py /path/to/index.html
Prints one line per check and exits 1 if anything fails.
External fonts/images may not load in a sandbox; those are reported as warnings, not failures.
"""
import json, re, sys
from playwright.sync_api import sync_playwright

path = sys.argv[1]
html = open(path, encoding="utf-8").read()
fails, warns = [], []

def check(ok, msg, warn=False):
    tag = "PASS" if ok else ("WARN" if warn else "FAIL")
    print(f"{tag}  {msg}")
    if not ok:
        (warns if warn else fails).append(msg)

# Static checks
check('name="viewport"' in html, "viewport tag present")
check(html.lstrip().lower().startswith("<!doctype html"), "page starts with <!doctype html>")
check(re.search(r"<title>[^<]{5,}</title>", html) is not None, "page title present")
check('name="description"' in html, "meta description present")
check('property="og:title"' in html, "Open Graph tags present")
# SEO: structured data (see seo-standards.md)
check('<html lang="' in html, "html lang attribute set")
check('property="og:image"' in html, "Open Graph image present")
blocks, types = re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.S), []
for blk in blocks:
    try:
        d = json.loads(blk)
        for item in (d if isinstance(d, list) else d.get("@graph", [d])):
            types.append(item.get("@type"))
    except Exception as e:
        check(False, f"JSON-LD does not parse: {e}")
BUSINESS = ("LocalBusiness","Restaurant","Store","ProfessionalService","HomeAndConstructionBusiness","HealthAndBeautyBusiness","BeautySalon","Dentist","MedicalBusiness","AutomotiveBusiness","FoodEstablishment","LodgingBusiness","SportsActivityLocation","LegalService","FinancialService","AnimalShelter","ChildCare","EntertainmentBusiness")
check(any(t in BUSINESS or (isinstance(t, str) and t.endswith("Business")) for t in types), f"business schema present {types or ''}")
check("aggregateRating" not in html, "no self-made rating schema")
faq_items = len(re.findall(r'<details', html))
if faq_items:
    faq_schema = next((json.loads(b) for b in blocks if '"FAQPage"' in b), None)
    n = len(faq_schema.get("mainEntity", [])) if faq_schema else 0
    check(n == faq_items, f"FAQPage schema covers every FAQ ({n} in schema, {faq_items} on page)")
ids = re.findall(r'\sid="([^"]+)"', html)
dupes = sorted({i for i in ids if ids.count(i) > 1})
check(not dupes, f"no duplicate IDs {dupes or ''}")
bad_urls = re.findall(r'(?:src|href)="(https?://[^"\s]*\s[^"]*)"', html)
check(not bad_urls, "no malformed URLs")

views = re.findall(r'id="v-([a-z-]+)"', html)

with sync_playwright() as p:
    b = p.chromium.launch()
    for label, vp, mobile in [("phone", (390, 844), True), ("small phone", (360, 740), True),
                              ("tablet", (768, 1024), True), ("desktop", (1280, 800), False)]:
        pg = b.new_page(viewport={"width": vp[0], "height": vp[1]}, is_mobile=mobile, has_touch=mobile)
        errors = []
        pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.on("console", lambda m: errors.append(m.text) if m.type == "error" and "net::" not in m.text and "Failed to load resource" not in m.text else None)
        pg.goto("file://" + path); pg.wait_for_timeout(300)
        overflow, small, h1s = [], [], []
        for v in views:
            pg.evaluate(f"location.hash='{v}'"); pg.wait_for_timeout(120)
            if pg.evaluate("document.documentElement.scrollWidth") > vp[0]: overflow.append(v)
            if mobile:
                s = pg.evaluate("[...document.querySelectorAll('a.btn,button,.chip span,.pick span,.days label span,.text-link,.foot-grid ul a,.brand')].filter(e=>{const r=e.getBoundingClientRect();return r.height>0&&r.height<44}).length")
                if s: small.append(f"{v}:{s}")
            n = pg.evaluate("[...document.querySelectorAll('h1')].filter(h=>h.offsetParent!==null).length")
            if n != 1: h1s.append(f"{v}:{n}")
        check(not overflow, f"{label}: no sideways scroll {overflow or ''}")
        if mobile: check(not small, f"{label}: tap targets >= 44px {small or ''}")
        check(not h1s, f"{label}: exactly one visible h1 per view {h1s or ''}")
        check(not errors, f"{label}: no console errors {errors[:3] or ''}")
        if label == "desktop":
            # SEO per view: unique title 30-60 chars, unique description 70-160 chars
            seen_t, seen_d, bad_t, bad_d = set(), set(), [], []
            for v in views:
                pg.evaluate(f"location.hash='{v}'"); pg.wait_for_timeout(100)
                t = pg.title(); d = pg.evaluate("(document.querySelector('meta[name=description]')||{}).content||''")
                if not (30 <= len(t) <= 60) or t in seen_t: bad_t.append(f"{v}({len(t)})")
                if not (70 <= len(d) <= 160) or d in seen_d: bad_d.append(f"{v}({len(d)})")
                seen_t.add(t); seen_d.add(d)
            check(not bad_t, f"unique 30-60 char title on every view {bad_t or ''}")
            check(not bad_d, f"unique 70-160 char description on every view {bad_d or ''}")
            skips = pg.evaluate("""(()=>{let bad=[];document.querySelectorAll('.view').forEach(v=>{let last=1;v.querySelectorAll('h1,h2,h3,h4').forEach(h=>{const n=+h.tagName[1];if(n>last+1)bad.push(v.id+':'+h.tagName+' '+h.textContent.trim().slice(0,25));last=n;});});return bad})()""")
            check(not skips, f"no skipped heading levels {skips[:4] or ''}")
        if label == "phone":
            fonts = pg.evaluate("[...document.querySelectorAll('input,select,textarea')].filter(e=>parseFloat(getComputedStyle(e).fontSize)<16).length")
            check(fonts == 0, "phone: inputs >= 16px (no iPhone zoom)")
            # internal links
            dead = pg.evaluate("""[...document.querySelectorAll('a[href^="#"]')].map(a=>a.getAttribute('href').slice(1)).filter(h=>h&&!document.getElementById('v-'+h)&&!document.getElementById(h))""")
            check(not dead, f"internal links all resolve {sorted(set(dead)) or ''}")
            # alt text
            noalt = pg.evaluate("[...document.querySelectorAll('img')].filter(i=>!i.getAttribute('alt')).length")
            check(noalt == 0, "every image has alt text")
            # images (sandbox may block network)
            pg.evaluate("location.hash='gallery'"); pg.wait_for_timeout(1500)
            broken = pg.evaluate("[...document.querySelectorAll('img')].filter(i=>i.complete&&i.naturalWidth===0).length")
            check(broken == 0, f"images load ({broken} failed; may be sandbox network)", warn=True)
            # booking flow end to end
            if "bookForm" in html:
                pg.evaluate("location.hash='book'"); pg.wait_for_timeout(150)
                pg.fill("#bkZip", "12345"); pg.click("[data-step='1'] [data-next='2']")
                check(pg.is_hidden("[data-step='2']"), "booking: out-of-area zip is stopped")
                pg.fill("#bkZip", "92024"); pg.click("[data-step='1'] [data-next='2']")
                check(pg.is_visible("[data-step='2']"), "booking: valid zip moves to step 2")
                pg.click("[data-step='2'] [data-next='3']")
                pg.click("#bookForm button[type=submit]")
                check(pg.is_hidden("#bkDone"), "booking: blank name/phone is stopped")
                pg.fill("#bkName", "Test"); pg.fill("#bkPhone", "7605550111")
                pg.click("#bookForm button[type=submit]")
                check(pg.is_visible("#bkDone"), "booking: valid request shows confirmation")
        pg.close()
    b.close()

# Motion safety (see motion-standards.md): content must never stay invisible
HIDDEN_JS = """(()=>{const v=document.querySelector('.view:not([hidden])')||document.body;return [...v.querySelectorAll('h1,h2,h3,p,li,a.btn,button,img,blockquote,td,summary,.ph')].filter(e=>{if(e.closest('[hidden],.sr-only,.toast,.skip'))return false;const r=e.getBoundingClientRect();if(!r.width||!r.height)return false;let n=e;while(n&&n!==document.body){const cs=getComputedStyle(n);if(cs.visibility==='hidden'||parseFloat(cs.opacity)<0.05)return true;n=n.parentElement;}return false;}).map(e=>e.tagName+':'+(e.textContent||e.alt||'').trim().slice(0,24))})()"""

# Same test, but only for content currently ON SCREEN. Scroll-away heroes legitimately fade out
# once they are far above the viewport; content that is invisible while in view is the real bug.
HIDDEN_IN_VIEW_JS = """(()=>{const v=document.querySelector('.view:not([hidden])')||document.body;return [...v.querySelectorAll('h1,h2,h3,p,li,a.btn,button,img,blockquote,td,summary,.ph')].filter(e=>{if(e.closest('[hidden],.sr-only,.toast,.skip'))return false;const r=e.getBoundingClientRect();if(!r.width||!r.height)return false;if(r.bottom<40||r.top>innerHeight-40)return false;let n=e;while(n&&n!==document.body){const cs=getComputedStyle(n);if(cs.visibility==='hidden'||parseFloat(cs.opacity)<0.05)return true;n=n.parentElement;}return false;}).map(e=>e.tagName+':'+(e.textContent||e.alt||'').trim().slice(0,24))})()"""

def scroll_through(pg, collect=None):
    """Scroll the page in steps. If collect is a list, record any content that is
    invisible while it sits in the viewport at each step."""
    h = pg.evaluate("document.documentElement.scrollHeight")
    y = 0
    while y < h:
        y += 400; pg.mouse.wheel(0, 400); pg.wait_for_timeout(60)
        if collect is not None:
            for item in pg.evaluate(HIDDEN_IN_VIEW_JS):
                if item not in collect: collect.append(item)
    pg.wait_for_timeout(1200)
    if collect is not None:
        for item in pg.evaluate(HIDDEN_IN_VIEW_JS):
            if item not in collect: collect.append(item)
with sync_playwright() as p:
    b = p.chromium.launch()
    for mode in ("normal", "reduced motion"):
        ctx = b.new_context(viewport={"width": 1280, "height": 800}, reduced_motion="reduce" if mode != "normal" else "no-preference")
        pg = ctx.new_page(); pg.goto("file://" + path); pg.wait_for_timeout(1500); bad = []
        for v in views:
            pg.evaluate(f"location.hash='{v}'"); pg.wait_for_timeout(300)
            hid = []
            scroll_through(pg, hid)
            if hid: bad.append(f"{v}:{hid[:2]}")
        check(not bad, f"motion ({mode}): no content left invisible {bad[:3] or ''}")
        ctx.close()
    # ---- Interface polish (rules adapted from emilkowalski/skills, MIT) ----
    src = open(path).read()
    import re as _re
    # 1. no unbounded property animation
    bad_all = _re.findall(r"transition:\s*all\b", src)
    check(not bad_all, f"polish: no `transition: all` ({len(bad_all)} found)")
    # 2. ease-in is never used for UI (it delays the moment the user is watching)
    bad_easein = [m for m in _re.findall(r"transition:[^;}\n]*", src) if _re.search(r"ease-in(?![-\w])", m)]
    check(not bad_easein, f"polish: no ease-in on UI transitions {bad_easein[:2]}")
    # 3. UI transitions stay under 300ms
    slow = []
    for line in src.split("\n"):
        if "slow-ok:" in line: continue          # an exception that states its reason in the code
        for t in _re.findall(r"transition:[^;}\n]*", line):
            for d in _re.findall(r"(\d*\.?\d+)(ms|s)\b", t):
                ms = float(d[0]) * (1000 if d[1] == "s" else 1)
                if ms > 300: slow.append(t.strip()[:48])
    check(not slow, f"polish: UI transitions under 300ms, or a stated /* slow-ok: */ reason {slow[:2]}")
    # 4. nothing appears from nothing
    check(not _re.search(r"scale\(0(\.0+)?\)", src), "polish: no entrance from scale(0)")
    # 5. pressable elements give press feedback
    check(":active" in src, "polish: pressable elements have an :active state")
    # 6. hover motion is gated behind a real pointer
    check("hover:hover" in src, "polish: hover motion gated to (hover:hover) and (pointer:fine)")
    # 7. layout properties are not animated
    lay = _re.findall(r"transition:\s*(?:[^;}\n]*\b)?(width|height|top|left|margin|padding)\b[^;}\n]*", src)
    check(not lay, f"polish: animates transform/opacity, not layout properties {lay[:2]}")
    # 8. taps feel native on phones
    check("tap-highlight-color" in src, "polish: tap highlight suppressed on pressables")

    # See-through text: transparent text color only allowed where the element itself clips a background to the text
    SEE_THROUGH = r"""(()=>{const out=[];const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let t;while((t=w.nextNode())){if(!t.textContent.trim())continue;const e=t.parentElement;if(!e||e.closest('[hidden],.sr-only,.skip'))continue;const r=e.getBoundingClientRect();if(!r.width)continue;const cs=getComputedStyle(e);const fill=cs.webkitTextFillColor||cs.color;const a=(fill.match(/rgba?\(([^)]+)\)/)||[,'0,0,0,1'])[1].split(',');const alpha=a.length>3?parseFloat(a[3]):1;const stroke=parseFloat(cs.webkitTextStrokeWidth||0);if(alpha<0.05&&!/text/.test(cs.backgroundClip+cs.webkitBackgroundClip)&&!stroke)out.push(t.textContent.trim().slice(0,30));}return out})()"""
    for mode in ("normal", "reduced motion"):
        ctx = b.new_context(viewport={"width": 1280, "height": 800}, reduced_motion="reduce" if mode != "normal" else "no-preference")
        pg = ctx.new_page(); pg.goto("file://" + path); pg.wait_for_timeout(2500)
        bad = pg.evaluate(SEE_THROUGH)
        check(not bad, f"no see-through text ({mode}) {bad[:3] or ''}")
        ctx.close()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, java_script_enabled=False, is_mobile=True)
    pg = ctx.new_page(); pg.goto("file://" + path); pg.wait_for_timeout(500)
    check(not pg.evaluate(HIDDEN_JS), "scripts off: first view fully visible")
    check(pg.evaluate("document.documentElement.scrollWidth") <= 390, "scripts off: no sideways scroll")
    ctx.close()
    # WebGL must not start on phones
    ctx = b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
    pg = ctx.new_page(); pg.goto("file://" + path); pg.wait_for_timeout(1500); scroll_through(pg)
    check(pg.evaluate("document.querySelectorAll('canvas.vanta-canvas').length") == 0 and not pg.evaluate("!!window.THREE"), "phone: no WebGL background loaded")
    ctx.close()
    b.close()

print(f"\n{len(fails)} failed, {len(warns)} warnings")
sys.exit(1 if fails else 0)
