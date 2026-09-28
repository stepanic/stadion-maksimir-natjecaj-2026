// Tablice u dokumentima čiji je prvi stupac „Datum” s datumima u obliku GGGG-MM-DD dobivaju
// prekidač redoslijeda: klik na zaglavlje mijenja najnovije ↔ najstarije. Redci bez datuma
// ostaju na kraju. Početni redoslijed je onaj iz markdowna (medijski arhiv je silazno).
// Samo querySelector, bez table.tHead/tBodies/cells: isti kod gradi i prerender (happy-dom),
// a regresijska provjera traži da prerender i preglednik daju isti HTML.

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const dateOf = (tr: Element) => (tr.querySelector("td")?.textContent ?? "").trim().replace(/‑/g, "-");

export function enhanceDateTables(root: HTMLElement) {
  for (const table of root.querySelectorAll<HTMLTableElement>(".markdown-body table")) {
    const th = table.querySelector("thead th");
    const body = table.querySelector("tbody");
    if (!th || !body || th.textContent?.trim() !== "Datum") continue;
    const dates = [...body.querySelectorAll(":scope > tr")].map(dateOf).filter((d) => d && d !== "—");
    if (dates.length < 2 || !dates.every((d) => ISO.test(d))) continue;

    let desc = dates[0] >= dates[dates.length - 1];
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "th-sort";
    const label = () => {
      btn.textContent = desc ? "Datum ↓" : "Datum ↑";
      btn.title = desc ? "Najnovije prve — klik za najstarije prve" : "Najstarije prve — klik za najnovije prve";
      th.setAttribute("aria-sort", desc ? "descending" : "ascending");
    };
    label();
    th.replaceChildren(btn);

    btn.addEventListener("click", () => {
      desc = !desc;
      const rows = [...body.querySelectorAll(":scope > tr")];
      const dated = rows.filter((r) => ISO.test(dateOf(r)));
      const undated = rows.filter((r) => !ISO.test(dateOf(r)));
      // Stabilno: unutar istog dana redoslijed ostaje isti kao u izvoru.
      dated.sort((a, b) => (desc ? dateOf(b).localeCompare(dateOf(a)) : dateOf(a).localeCompare(dateOf(b))));
      body.append(...dated, ...undated);
      label();
    });
  }
}
