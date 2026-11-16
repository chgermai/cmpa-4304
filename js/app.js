// Loads data/procedures.json and lists each procedure as a card.
// Must be served over HTTP (not opened as a file) so fetch() works.

function listItems(items) {
  const ul = document.createElement("ul");
  items.forEach((text) => {
    const li = document.createElement("li");
    li.textContent = text;
    ul.appendChild(li);
  });
  return ul;
}

function section(title, content) {
  const wrap = document.createElement("div");
  const h = document.createElement("h4");
  h.textContent = title;
  wrap.append(h, content);
  return wrap;
}

function renderCard(p) {
  const card = document.createElement("article");
  card.className = "card";

  const h3 = document.createElement("h3");
  h3.textContent = p.title;

  const tag = document.createElement("span");
  tag.className = "tag";
  tag.textContent = p.category;

  const symptom = document.createElement("p");
  symptom.textContent = p.symptom;

  const details = document.createElement("details");
  const summary = document.createElement("summary");
  summary.textContent = "View procedure";
  details.appendChild(summary);
  details.appendChild(section("Checks", listItems(p.checks)));
  details.appendChild(section("Resolution", listItems(p.resolution)));

  const esc = section("Escalate if", listItems(p.escalate_if));
  esc.className = "escalate";
  const to = document.createElement("p");
  to.textContent = "Escalate to: " + p.escalate_to;
  esc.appendChild(to);
  details.appendChild(esc);

  card.append(h3, tag, symptom, details);
  return card;
}

fetch("data/procedures.json")
  .then((res) => res.json())
  .then((procedures) => {
    const list = document.getElementById("procedure-list");
    procedures.forEach((p) => list.appendChild(renderCard(p)));
  })
  .catch((err) => {
    document.getElementById("procedure-list").textContent =
      "Could not load procedures: " + err.message;
  });
