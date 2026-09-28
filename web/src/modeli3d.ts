// 3D modeli natječajnih radova koje su izradili drugi autori (vanjski embed s atribucijom).
// Model se učitava tek na klik: vanjska stranica je teška i ne treba je dohvaćati
// svakom posjetitelju stranice rada.

type Model3d = {
  embed: string; // URL koji ide u iframe
  city?: string; // isti model u kontekstu grada
  author: string;
  site: string;
  siteUrl: string;
};

const MODELI: Record<string, Model3d> = {
  // Pobjednički rad (VG13). Model izrađen iz službenih panela, rujan 2026.
  "6TVJ3MUHR": {
    embed: "https://zagreb.lol/zgrade/modeli/?id=stadion-maksimir-novi",
    city: "https://zagreb.lol/sloboda/@45.818441,16.017643/?lang=hr&heading=13.3&pitch=-0.0",
    author: "Strahimir Stribor",
    site: "zagreb.lol",
    siteUrl: "https://zagreb.lol/",
  },
};

export function renderModel3d(code: string): string {
  const m = MODELI[code];
  if (!m) return "";
  return `
    <section class="panel model3d" data-embed="${m.embed}">
      <h2>3D model</h2>
      <div class="model3d-stage">
        <button class="btn btn-primary model3d-load" type="button">Učitaj interaktivni 3D model</button>
      </div>
      <p class="muted small">
        3D model: <strong>${m.author}</strong>, <a href="${m.siteUrl}" target="_blank" rel="noopener">${m.site}</a>.
        Neslužbena rekonstrukcija iz natječajnih panela, nije dio natječajne dokumentacije.
        <a href="${m.embed}" target="_blank" rel="noopener">Otvori preko cijelog zaslona ↗</a>
        ${m.city ? ` · <a href="${m.city}" target="_blank" rel="noopener">Model u kontekstu grada ↗</a> (učitava se oko minutu)` : ""}
      </p>
    </section>`;
}

export function wireModel3d(root: HTMLElement) {
  const sec = root.querySelector<HTMLElement>(".model3d");
  const btn = sec?.querySelector<HTMLButtonElement>(".model3d-load");
  if (!sec || !btn) return;
  btn.addEventListener("click", () => {
    const f = document.createElement("iframe");
    f.src = sec.dataset.embed!;
    f.title = "Interaktivni 3D model rada";
    f.loading = "lazy";
    f.allow = "fullscreen";
    f.referrerPolicy = "strict-origin-when-cross-origin";
    btn.replaceWith(f);
  });
}
