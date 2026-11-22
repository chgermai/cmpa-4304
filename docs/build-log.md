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

**What worked**
- Hash routing kept it to one HTML page with no build step and no nginx changes.
- Exporting the pure search helpers to Node let me test the real matching code against the real data without a browser.

**What didn't / notes**
- Test queries "flap", "dns", "certificate" and "vpn" return 0 results: the current 19 procedures don't cover those issues (the original Flapping Circuit and BGP Neighbor Down entries are only in `procedures.json.old`). This is a content gap, not a search bug.
- Escalation values were being filled in during the same session, so the "Not defined yet" state is currently not visible on any real entry.

**Next**
- Content review of procedures (wording, anonymization, history lines inside `resolution[]`).
- P02: move data to a database + API; keep field names stable so `app.js` only needs a new fetch URL.
