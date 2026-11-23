# Network Operations Runbook

CMPA-4304 capstone project. A searchable web based runbook that guides network operations staff in mitigating common network issues, or escalating them correctly.

Plain HTML, CSS and JavaScript. No framework, no build step, no dependencies.

## Project structure

```
index.html            Page shell: header, Browse view, empty Procedure view
css/styles.css        All styles (color variables at the top, responsive below 760px)
js/app.js             Loads the data, search, filters, procedure view
data/procedures.json  The procedures (the only file you edit to add content)
docs/build-log.md     Session notes
```

## Running locally

The page loads its data with `fetch()`, which browsers block for files opened directly from disk. Serve the folder over HTTP instead:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## How the data is processed

All of this happens in `js/app.js`, in the browser:

1. **Loaded once.** On page load the app fetches `data/procedures.json` a single time and keeps the array in memory. Searching and filtering never re-fetch.
2. **Search text built up front.** For each procedure, `buildSearchText()` joins `title`, `symptom`, `category` and every `keywords` entry into one lowercase string. This happens once at load, not on every keypress.
3. **Search.** As you type, the query is split on spaces and a procedure matches only if **every** word appears somewhere in its search text (case-insensitive). Adding words narrows the results: `bgp firmware` is stricter than `bgp`. `checks`, `resolution` and `escalate_if` are **not** searched, so put the words people will search for in `keywords`.
4. **Category chips.** The filter chips are built from the distinct `category` values in the file, sorted alphabetically, with "All" first. A new category appears as a chip automatically. Chip and search filters combine.
5. **Procedure view.** Each card links to `#<id>` (for example `#rb-03`). The app reads the URL hash and shows that procedure, so links can be bookmarked and shared. An `id` that doesn't exist shows "Procedure not found".
6. **Missing values.** `severity`, `escalate_if` and `escalate_to` that are blank, empty, or `"TBD"` show a visible "Not defined yet" badge (or "Severity: not set") instead of being hidden.
7. **Display only.** All text is inserted as plain text, never as HTML, so tags typed into the JSON appear literally rather than being rendered.

## Data format

`data/procedures.json` is a JSON **array** of procedure objects. Every object has the same 10 fields:

| Field | Type | Shown as | Notes |
|---|---|---|---|
| `id` | string | URL (`#rb-03`) | Unique. Format `rb-NN`. Never reuse or change an existing id; links depend on it. |
| `title` | string | Card and page heading | Short, describes the symptom. Searched. |
| `category` | string | Tag and filter chip | Reuse an existing category exactly (spelling and `&` matter) unless you mean to add a new chip. Searched. |
| `severity` | string | Tag | Currently `Critical`, `High` or `Medium`. |
| `symptom` | string | Card summary and "Symptom" section | What the operator sees. Searched. |
| `keywords` | string[] | Not shown | Search terms people will type (`"bgp"`, `"dropped packets"`). Lowercase. Searched. |
| `checks` | string[] | Numbered "Checks" list | Things to confirm before acting, in order. |
| `resolution` | string[] | Numbered "Resolution" list | Steps in order. End with one or more `Follow-up:` steps. |
| `escalate_if` | string[] | "Escalate if…" sidebar | Conditions that mean stop and escalate. Last item starts with `Include:` and lists what to hand over. |
| `escalate_to` | string | "Escalate to:" in the sidebar | Who to contact, e.g. `On-call network engineer`. |

Field names and types must stay exactly as above. Project 02 moves this data into a database, and the import relies on these names.

Current categories: `Addressing & Switching`, `BGP & Routing`, `Change & Config Management`, `Multicast, Timing & Hardware`, `Platform Services`, `Redundancy & Maintenance`.

### Example entry

```json
{
  "id": "rb-03",
  "title": "Multicast Packets Dropping on One Port",
  "category": "Multicast, Timing & Hardware",
  "severity": "Medium",
  "symptom": "Multicast traffic through one switch port is dropped. A downstream system or monitor goes blind and the port's discard counter climbs steadily.",
  "keywords": ["multicast", "port", "discards", "buffer", "dropped packets", "monitoring gap"],
  "checks": [
    "Check input discards and errors on the port. Note whether they are increasing.",
    "Check whether only multicast through that port is affected and other traffic is fine.",
    "Compare the hardware model and software version with the vendor's known-issue list for stuck buffers or input drops.",
    "Check whether the same traffic arrives cleanly through another path."
  ],
  "resolution": [
    "If the port carries only this traffic and a redundant path exists, the on-call engineer may shut the interface so traffic uses the other path.",
    "Confirm the downstream system or monitor recovers.",
    "Open a vendor case citing the known issue.",
    "Follow-up: schedule the software upgrade the vendor names as the fix."
  ],
  "escalate_if": [
    "There is no redundant path for the traffic.",
    "Discards continue after the port is shut or on other ports.",
    "Include: switch, port, counter values over time, hardware model and software version."
  ],
  "escalate_to": "On-call network engineer"
}
```

## Adding a procedure

1. **Pick an id.** Use the next unused `rb-NN` number. Gaps in the sequence are fine; duplicates are not.
2. **Copy the template** below into `data/procedures.json`. Add it inside the outer `[ ]`, separated from the previous entry by a comma. JSON does not allow a comma after the last entry.
3. **Fill in every field.** If you don't know the escalation details yet, use `"TBD"` (or `["TBD"]` for `escalate_if`). The page will flag it as "Not defined yet" rather than guessing.
4. **Keep content generic.** Content must be fictional or based on public information. Don't include employer names, site names, internal tool names, IP addresses or credentials.
5. **Validate the file** (see below), then check it in the browser: search for one of your keywords, open the procedure, and confirm the "Escalate if" sidebar looks right.
6. **Commit and push.** The live site updates after the server pulls the latest commit.

### Template

```json
{
  "id": "rb-NN",
  "title": "",
  "category": "",
  "severity": "TBD",
  "symptom": "",
  "keywords": [],
  "checks": [],
  "resolution": [
    "Follow-up: "
  ],
  "escalate_if": [
    "Include: "
  ],
  "escalate_to": "TBD"
}
```

### Validating the file

A single syntax error (a missing comma or quote) stops the whole page from loading, so check before committing. From the repo root:

```bash
python3 -c "
import json, collections
d = json.load(open('data/procedures.json'))
fields = {'id','title','category','severity','symptom','keywords','checks','resolution','escalate_if','escalate_to'}
lists = {'keywords','checks','resolution','escalate_if'}
for p in d:
    assert set(p) == fields, (p.get('id'), set(p) ^ fields)
    for f in fields:
        assert isinstance(p[f], list if f in lists else str), (p['id'], f)
dupes = [i for i, n in collections.Counter(p['id'] for p in d).items() if n > 1]
assert not dupes, ('duplicate ids', dupes)
print('OK:', len(d), 'procedures')
"
```

It prints `OK: <count> procedures`, or stops with the id and field that's wrong.
