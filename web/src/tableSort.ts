// Tablice u dokumentima čiji je prvi stupac „Datum” dobivaju prekidač redoslijeda:
// klik na zaglavlje mijenja najnovije ↔ najstarije. Redci bez datuma ostaju na kraju.
// Početni redoslijed je onaj iz markdowna (medijski arhiv je silazno, najnovije gore).

const dateOf = (tr: HTMLTableRowElement) =>
  (tr.cells[0]?.textContent ?? "").trim().replace(/‑/g, "-");

function isDesc(rows: HTMLTableRowElement[]): boolean {
  const dated = rows.map(dateOf).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
  return dated.length < 2 || dated[0] >= dated[dated.length - 1];
}

export function enhanceDateTables(root: HTMLElement) {
  for (const table of root.querySelectorAll<HTMLTableElement>(".markdown-body table")) {
    const th = table.tHead?.rows[0]?.cells[0];
    const body = table.tBodies[0];
    if (!th || !body || th.textContent?.trim() !== "Datum" || body.rows.length < 2) continue;

    let desc = isDesc([...body.rows]);
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
      const rows = [...body.rows];
      const dated = rows.filter((r) => /^\d{4}/.test(dateOf(r)));
      const undated = rows.filter((r) => !/^\d{4}/.test(dateOf(r)));
      // Stabilno: unutar istog dana redoslijed ostaje isti kao u izvoru.
      dated.sort((a, b) => (desc ? dateOf(b).localeCompare(dateOf(a)) : dateOf(a).localeCompare(dateOf(b))));
      body.append(...dated, ...undated);
      label();
    });
  }
}
