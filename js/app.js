// Network Operations Runbook
// Loads data/procedures.json once, then handles search, category filters and
// a separate procedure view entirely in the browser.
// Must be served over HTTP (not opened as a file) so fetch() works.

/* ---------- Pure helpers (no DOM; also used by the Node check script) ---------- */

// A field counts as "not defined yet" if it is missing, blank, "TBD",
// or a list whose entries are all blank/"TBD".
function isTBD(value) {
  if (Array.isArray(value)) return value.length === 0 || value.every(isTBD);
  if (value === undefined || value === null) return true;
  const text = String(value).trim();
  return text === "" || text.toUpperCase() === "TBD";
}

// Lowercased text that search runs against. Built once per procedure at load
// time so typing doesn't re-join strings on every keypress.
function buildSearchText(p) {
  return [p.title, p.symptom, p.category, ...(p.keywords || [])]
    .join(" ")
    .toLowerCase();
}

// Every whitespace-separated term must appear somewhere (AND), so adding a
// word narrows results. An empty query matches everything.
function matches(searchText, query) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  return terms.every((term) => searchText.includes(term));
}

/* ---------- DOM helpers ---------- */

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  // textContent (never innerHTML) so data can't inject markup.
  if (text !== undefined) node.textContent = text;
  return node;
}

function listItems(items, ordered) {
  const list = el(ordered ? "ol" : "ul");
  items.forEach((text) => list.appendChild(el("li", null, text)));
  return list;
}

function section(title, content) {
  const wrap = el("section", "proc-section");
  wrap.append(el("h2", null, title), content);
  return wrap;
}

function notDefined() {
  return el("span", "not-defined", "Not defined yet");
}

function severityTag(p) {
  return isTBD(p.severity)
    ? el("span", "tag tag-unset", "Severity: not set")
    : el("span", "tag", "Severity: " + p.severity);
}

/* ---------- App (browser only) ---------- */

function startApp() {
  const state = { procedures: [], query: "", category: "All" };

  const browseView = document.getElementById("browse-view");
  const procView = document.getElementById("procedure-view");
  const searchInput = document.getElementById("search");
  const chipsBox = document.getElementById("category-chips");
  const list = document.getElementById("procedure-list");
  const count = document.getElementById("result-count");
  const noResults = document.getElementById("no-results");
  const noResultsQuery = document.getElementById("no-results-query");

  /* Browse */

  function renderCard(p) {
    const card = el("article", "card");
    const h = el("h2", "card-title");
    const link = el("a", null, p.title);
    link.href = "#" + encodeURIComponent(p.id);
    h.appendChild(link);

    const meta = el("div", "meta");
    meta.append(el("span", "tag", p.category), severityTag(p));

    card.append(h, meta, el("p", "symptom", p.symptom));
    return card;
  }

  function renderChips() {
    const categories = [...new Set(state.procedures.map((p) => p.category))].sort();
    chipsBox.replaceChildren();
    ["All", ...categories].forEach((cat) => {
      const chip = el("button", "chip", cat);
      chip.type = "button";
      chip.dataset.category = cat;
      chip.setAttribute("aria-pressed", String(cat === state.category));
      chip.addEventListener("click", () => {
        state.category = cat;
        chipsBox.querySelectorAll(".chip").forEach((c) =>
          c.setAttribute("aria-pressed", String(c.dataset.category === cat))
        );
        renderList();
      });
      chipsBox.appendChild(chip);
    });
  }

  function renderList() {
    const results = state.procedures.filter(
      (p) =>
        (state.category === "All" || p.category === state.category) &&
        matches(p.searchText, state.query)
    );

    list.replaceChildren(...results.map(renderCard));

    const total = state.procedures.length;
    count.textContent =
      results.length === total
        ? `Showing all ${total} procedures`
        : `Showing ${results.length} of ${total} procedures`;

    noResults.hidden = results.length > 0;
    if (results.length === 0) {
      const parts = [];
      if (state.query.trim()) parts.push(`"${state.query.trim()}"`);
      if (state.category !== "All") parts.push(`in ${state.category}`);
      noResultsQuery.textContent = parts.join(" ") || "these filters";
    }
  }

  /* Procedure view */

  function renderProcedure(p) {
    procView.replaceChildren();

    const back = el("a", "back-link", "← Back to all procedures");
    back.href = "#";

    const title = el("h1", null, p.title);
    title.tabIndex = -1;

    const meta = el("div", "meta");
    meta.append(el("span", "tag", p.category), severityTag(p));

    const main = el("div", "proc-main");
    main.append(
      section("Symptom", el("p", null, p.symptom)),
      section("Checks", listItems(p.checks || [], true)),
      section("Resolution", listItems(p.resolution || [], true))
    );

    const panel = el("aside", "escalate-panel");
    panel.setAttribute("aria-labelledby", "escalate-heading");
    const ph = el("h2", null, "Escalate if…");
    ph.id = "escalate-heading";
    panel.appendChild(ph);
    panel.appendChild(isTBD(p.escalate_if) ? notDefined() : listItems(p.escalate_if));
    const to = el("p", "escalate-to");
    to.append(el("strong", null, "Escalate to: "));
    to.append(isTBD(p.escalate_to) ? notDefined() : document.createTextNode(p.escalate_to));
    panel.appendChild(to);

    const layout = el("div", "proc-layout");
    layout.append(main, panel);

    procView.append(back, title, meta, layout);
    return title;
  }

  function renderNotFound(id) {
    procView.replaceChildren();
    const back = el("a", "back-link", "← Back to all procedures");
    back.href = "#";
    const title = el("h1", null, "Procedure not found");
    title.tabIndex = -1;
    procView.append(back, title, el("p", null, `No procedure has the id "${id}".`));
    return title;
  }

  /* Routing: "#rb-01" shows that procedure, an empty hash shows Browse.
     Browse is hidden, not destroyed, so search text and the chosen chip
     survive a round trip through a procedure. */

  function route() {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!id) {
      const wasOnProcedure = !procView.hidden;
      procView.hidden = true;
      browseView.hidden = false;
      document.title = "Network Operations Runbook";
      if (wasOnProcedure) document.getElementById("browse-heading").focus();
      return;
    }
    const p = state.procedures.find((x) => x.id === id);
    const heading = p ? renderProcedure(p) : renderNotFound(id);
    browseView.hidden = true;
    procView.hidden = false;
    document.title = (p ? p.title : "Not found") + " · Network Operations Runbook";
    window.scrollTo(0, 0);
    heading.focus(); // keyboard / screen-reader users land on the new view
  }

  /* Events */

  searchInput.addEventListener("input", () => {
    state.query = searchInput.value;
    renderList();
  });

  document.addEventListener("keydown", (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
    if (e.key === "/" && !typing) {
      e.preventDefault();
      if (location.hash) {
        location.hash = "";
        route(); // show Browse now; hashchange fires later and is harmless
      }
      searchInput.focus();
    } else if (e.key === "Escape" && e.target === searchInput) {
      searchInput.value = "";
      state.query = "";
      renderList();
    }
  });

  window.addEventListener("hashchange", route);

  /* Load once */

  fetch("data/procedures.json")
    .then((res) => {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then((procedures) => {
      state.procedures = procedures.map((p) => ({ ...p, searchText: buildSearchText(p) }));
      renderChips();
      renderList();
      route();
    })
    .catch((err) => {
      list.replaceChildren(
        el(
          "p",
          "status error",
          "Could not load procedures (" + err.message + "). " +
            "If you opened this file directly, serve it over HTTP instead."
        )
      );
    });
}

if (typeof document !== "undefined") startApp();

// Lets a Node script test the real search logic; ignored in the browser.
if (typeof module !== "undefined") module.exports = { isTBD, buildSearchText, matches };
