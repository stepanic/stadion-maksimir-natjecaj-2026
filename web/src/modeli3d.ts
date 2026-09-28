// 3D modeli natječajnih radova koje su izradili drugi autori. Podaci modela su preuzeti
// k nama (web/public/modeli3d/<šifra>/, scripts/fetch_model3d.py), a crta ih vlastiti
// three.js prikaz (model3dViewer.ts), koji se učitava tek na klik.

type Model3d = {
  author: string;
  site: string;
  siteUrl: string;
  viewer: string; // izvorni preglednik autora
  city?: string; // isti model u kontekstu grada
};

const MODELI: Record<string, Model3d> = {
  // Pobjednički rad (VG13). Model izrađen iz službenih panela, rujan 2026.
  "6TVJ3MUHR": {
    author: "Strahimir Stribor",
    site: "zagreb.lol",
    siteUrl: "https://zagreb.lol/",
    viewer: "https://zagreb.lol/zgrade/modeli/?id=stadion-maksimir-novi",
    city: "https://zagreb.lol/sloboda/@45.818441,16.017643/?lang=hr&heading=13.3&pitch=-0.0",
  },
};

export function renderModel3d(code: string): string {
  const m = MODELI[code];
  if (!m) return "";
  return `
    <section class="panel model3d" data-code="${code}">
      <h2>3D model</h2>
      <div class="model3d-stage">
        <button class="btn btn-primary model3d-load" type="button">Učitaj interaktivni 3D model</button>
      </div>
      <div class="model3d-bar">
        <span class="muted small">Povuci za okretanje, kotačić ili dva prsta za zum, desni klik za pomak.</span>
        <button class="btn model3d-full" type="button" hidden>Preko cijelog zaslona</button>
      </div>
      <p class="muted small">
        3D model: <strong>${m.author}</strong>, <a href="${m.siteUrl}" target="_blank" rel="noopener">${m.site}</a>.
        Neslužbena rekonstrukcija iz natječajnih panela, nije dio natječajne dokumentacije.
        Prikaz je naš (three.js), a podaci modela su preuzeti s autorove stranice.
        <a href="${m.viewer}" target="_blank" rel="noopener">Autorov preglednik ↗</a>
        ${m.city ? ` · <a href="${m.city}" target="_blank" rel="noopener">Model u kontekstu grada ↗</a> (učitava se oko minutu)` : ""}
      </p>
    </section>`;
}

export function wireModel3d(root: HTMLElement) {
  const sec = root.querySelector<HTMLElement>(".model3d");
  const btn = sec?.querySelector<HTMLButtonElement>(".model3d-load");
  if (!sec || !btn) return;
  const stage = sec.querySelector<HTMLElement>(".model3d-stage")!;
  const full = sec.querySelector<HTMLButtonElement>(".model3d-full")!;
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    btn.textContent = "Učitavam model…";
    try {
      const { mountModel3d } = await import("./model3dViewer");
      await mountModel3d(stage, `/modeli3d/${sec.dataset.code}`);
      full.hidden = !stage.requestFullscreen;
    } catch (e) {
      btn.disabled = false;
      btn.textContent = "Učitavanje nije uspjelo, pokušaj ponovno";
      console.error(e);
    }
  });
  full.addEventListener("click", () => void stage.requestFullscreen?.());
}
