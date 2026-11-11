# Build standards

The single source of truth for how client sites are built, audited and QA'd.
The hourly pipeline task clones this repo and reads these files, so editing them here
changes every future build. Keep them in sync with the project docs in WEBSITE AUTOMATION.

- `seo-standards.md` — SEO, AEO and GEO rules, plus the go-live checklist
- `motion-standards.md` — animation libraries, performance and accessibility rules
- `interface-polish-standards.md` — how motion should feel (adapted from emilkowalski/skills, MIT)
- `qa.py` — the production QA script. `python3 qa.py <slug>/index.html`, must report 0 failed

Nothing client-private belongs here: this repo is public. Briefs and client details stay in
the working directory only.
