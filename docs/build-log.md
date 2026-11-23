# Build Log

## 2026-11-22 — P01 search, browse, escalation panel

**Done**
- Rewrote `js/app.js` around a single fetch of `data/procedures.json`, held in memory.
- Live search across title, symptom, category and keywords. Case-insensitive; every word typed must match (AND), so extra words narrow results.
- Category filter chips generated from the data (no hard-coded categories), combinable with search.
- Result count, "no results" message, and a standing "Can't find your issue? Escalate" note.
- Separate procedure view using URL hashes (`#rb-01`): Back button, refresh and direct links work with no server config. Search text and selected chip survive going back.
- "Escalate if…" sidebar with heavy border; collapses above the steps on narrow screens. Missing/"TBD" values render as a visible "Not defined yet" badge instead of being hidden or guessed.
- Keyboard: `/` focuses search, `Esc` clears it, focus moves to the heading on each view change, visible focus outlines.
- Loading and load-error states.
- Mobile pass: 44px chip touch targets, tighter header padding, long strings wrap, keyboard hint hidden on touch devices.

**What worked**
- Hash routing kept it to one HTML page with no build step and no nginx changes.
- Exporting the pure search helpers to Node let me test the real matching code against the real data without a browser.

**What didn't / notes**
- Test queries "flap", "dns", "certificate" and "vpn" return 0 results: the current 19 procedures don't cover those issues (the original Flapping Circuit and BGP Neighbor Down entries are only in `procedures.json.old`). This is a content gap, not a search bug.
- Escalation values were being filled in during the same session, so the "Not defined yet" state is currently not visible on any real entry.

**Next**
- Content review of procedures (wording, anonymization, history lines inside `resolution[]`).
- P02: move data to a database + API; keep field names stable so `app.js` only needs a new fetch URL.

## 2026-11-22 (later) — Docs, color scheme, deployment fixes

**Done**
- README now documents how the data is processed, the procedure format (field table, example entry), how to add a procedure, and a validation command.
- Applied a color scheme based on Blue Zodiac `#0C243C`, Tiara `#C9D1D5`, Fountain Blue `#55C2C3` and Regent Gray `#7E8C9C`. All colors are CSS variables at the top of `css/styles.css`.
- Deployment: the VM had been recreated, and its web root was a copied snapshot of the files rather than a git clone. Converted it in place into a git checkout of `main`, so deploying is now `git pull` on the server.
- Blocked nginx from serving the `.git` folder (returns 403).
- Plain-HTTP requests by IP were returning 404 for every page. Added a catch-all redirect so the IP now forwards to the HTTPS site, https://chgermai.duckdns.org.

**What worked**
- Checking color contrast before applying the palette. Fountain Blue (2.1:1) and Regent Gray (3.4:1) are too light for text on white, so they're used for fills, accents and borders; secondary text uses a darker Regent Gray (`#4A5868`, 7.3:1).
- Comparing the server's files to the repo history by git hash before overwriting showed the server held an exact copy of an earlier commit, so nothing was lost.
- Validating nginx config (`nginx -t`) and backing up the config before every reload.

**What didn't / notes**
- The IP 404s started when Certbot set up HTTPS. Its port-80 block loaded first, became the default for unmatched hosts, and returned 404. Lesson: after adding HTTPS, test every URL people might use, not just the new one.
- Recreating the VM changed its SSH host key, which triggers a "host identification changed" warning. Verify the new fingerprint from the cloud console before trusting it, rather than deleting the old key blindly.

**Next**
- Submit https://chgermai.duckdns.org as the P01 URL.
- Consider redeploying automatically on push (for example a GitHub Action that runs `git pull` over SSH) for P02.
