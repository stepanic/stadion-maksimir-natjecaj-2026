// Objava glasa: #/glasanje/g/<id> (javno: /g/<id>, s OG karticom iz Pages Functiona).
//   - javna objava: ime iz eOsobne (u obliku koji je glasač izabrao) + bodovi + zapis u lancu
//   - ZK objava: anonimni Semaphore dokaz, koji svaki posjetitelj provjerava u svom pregledniku

import { byCode, esc, tidy } from "./radoviView";
import { fetchShare, shareUrl, VERIFY_SCRIPT, type PublicCard, type Share, type ZkProof } from "./glasanje";

export const DOC_SLUG = "glasanje-kako-radi";
export const DOC_GITHUB =
  "https://github.com/stepanic/stadion-maksimir-natjecaj-2026/blob/main/docs/glasanje-kako-radi.md";

const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("hr-HR", { timeZone: "Europe/Zagreb", dateStyle: "long", timeStyle: "short" }) : "—";
const short = (h: string, n = 10) => (h.length > 2 * n ? `${h.slice(0, n)}…${h.slice(-n)}` : h);

/** Hrvatska množina uz broj: 1 član, 3 člana, 5 članova (21 član, 12 članova). */
export function plural(n: number, one: string, few: string, many: string): string {
  const d = n % 10;
  const h = n % 100;
  return d === 1 && h !== 11 ? one : d >= 2 && d <= 4 && (h < 12 || h > 14) ? few : many;
}

export const displayName = (c: Pick<PublicCard, "name">) => c.name ?? "Potvrđeni glasač";

const entryLabel = (code: string, lead?: string) => {
  const r = byCode[code];
  return r ? tidy(r.lead) : lead ?? code;
};

// ── tekst i gumbi za dijeljenje ─────────────────────────────────────────────

export function publicShareText(c: PublicCard): string {
  const top = c.items
    .slice(0, 3)
    .map((i) => `${i.points} za ${entryLabel(i.code, i.lead)}`)
    .join(", ");
  return `Moj glas za novi Maksimir: ${top}${c.items.length > 3 ? " …" : ""}. Potvrđeno eOsobnom, provjerljivo u lancu hasheva. Raspodijeli i ti svojih 100 bodova:`;
}

export const ZK_SHARE_TEXT =
  "Moj glas za novi Maksimir je anoniman: nitko ne zna tko sam ni za koga je glas. Ovaj ZK dokaz potvrđuje samo da ga je predala stvarna osoba provjerena eOsobnom. Provjeri dokaz i glasaj i ti:";

export function shareButtonsHtml(url: string, text: string): string {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(text);
  const tu = encodeURIComponent(`${text} ${url}`);
  const links: [string, string][] = [
    ["WhatsApp", `https://wa.me/?text=${tu}`],
    ["Facebook", `https://www.facebook.com/sharer/sharer.php?u=${u}`],
    ["X", `https://x.com/intent/post?text=${t}&url=${u}`],
    ["LinkedIn", `https://www.linkedin.com/sharing/share-offsite/?url=${u}`],
    ["Telegram", `https://t.me/share/url?url=${u}&text=${t}`],
    ["Bluesky", `https://bsky.app/intent/compose?text=${tu}`],
  ];
  return `<div class="sh-buttons" data-url="${esc(url)}" data-text="${esc(text)}">
    <input class="sh-url" readonly value="${esc(url)}" aria-label="Poveznica za dijeljenje" />
    <button class="btn btn-sm btn-primary" data-share="copy">Kopiraj poveznicu</button>
    <button class="btn btn-sm" data-share="native" hidden>Podijeli…</button>
    ${links.map(([n, h]) => `<a class="btn btn-sm" href="${h}" target="_blank" rel="noopener">${n}</a>`).join("")}
  </div>`;
}

export function bindShareButtons(el: HTMLElement) {
  el.querySelectorAll<HTMLElement>(".sh-buttons").forEach((box) => {
    const url = box.dataset.url!;
    const text = box.dataset.text!;
    const copy = box.querySelector<HTMLButtonElement>('[data-share="copy"]')!;
    copy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        box.querySelector<HTMLInputElement>(".sh-url")!.select();
        document.execCommand("copy");
      }
      copy.textContent = "✓ Kopirano";
      setTimeout(() => (copy.textContent = "Kopiraj poveznicu"), 2000);
    });
    const native = box.querySelector<HTMLButtonElement>('[data-share="native"]')!;
    if (typeof navigator.share === "function") {
      native.hidden = false;
      native.addEventListener("click", () => void navigator.share({ title: "Glasanje za novi Maksimir", text, url }).catch(() => {}));
    }
    box.querySelector<HTMLInputElement>(".sh-url")!.addEventListener("focus", (e) => (e.target as HTMLInputElement).select());
  });
}

// ── kartice ──────────────────────────────────────────────────────────────────

export function publicCardHtml(c: PublicCard, opts: { compact?: boolean; href?: string } = {}): string {
  const items = c.items
    .map((i) => {
      const r = byCode[i.code];
      return `<li>
        ${r?.image ? `<img src="/radovi/${i.code}-t.jpg" alt="" loading="lazy" />` : `<span class="gl-noimg"></span>`}
        <a class="gl-name" href="#/radovi/${i.code}">${esc(entryLabel(i.code, i.lead))}</a>
        <strong class="sh-pts">${i.points}</strong>
        <div class="gl-bar"><span style="width:${Math.min(100, i.points)}%"></span></div>
      </li>`;
    })
    .join("");
  const name = esc(displayName(c));
  return `<article class="sh-card${opts.compact ? " sh-card--compact" : ""}">
    <header>
      <div class="sh-who">${opts.href ? `<a href="${opts.href}">${name}</a>` : name}</div>
      <div class="sh-badge">✓ identitet potvrđen eOsobnom</div>
    </header>
    <ol class="sh-items">${items}</ol>
    ${
      opts.compact
        ? ""
        : `<footer class="muted small">
            Predano ${esc(fmtDate(c.updated_at))}${c.revisions > 1 ? ` · mijenjano ${c.revisions - 1}×` : ""}
            ${c.receipt ? ` · zapis <strong>#${c.receipt.seq}</strong> u lancu · <span class="mono">${short(c.receipt.hash)}</span>` : ""}
          </footer>`
    }
  </article>`;
}

// ── stranica objave ─────────────────────────────────────────────────────────

let current = "";

export async function renderShare(el: HTMLElement, id: string) {
  current = id;
  el.innerHTML = `<p class="muted">Učitavam objavu…</p>`;
  let share: Share | null = null;
  try {
    share = await fetchShare(id);
  } catch (e) {
    el.innerHTML = `<div class="gl-msg gl-msg--err">${esc((e as Error).message)}</div>`;
    return;
  }
  if (current !== id) return;
  if (!share) {
    el.innerHTML = `<div class="notfound"><h1>Objava ne postoji</h1><p><a href="#/glasanje">← Na glasanje</a></p></div>`;
    return;
  }
  if (share.kind === "public") renderPublic(el, share);
  else await renderZk(el, share);
}

const cta = `<section class="sh-cta">
  <h2>Imaš eOsobnu? Raspodijeli i ti svojih 100 bodova.</h2>
  <p>88 natječajnih radova za novi Stadion Maksimir. Jedna osoba, jedan glas, provjerljivo do Bitcoina.</p>
  <a class="btn btn-primary" href="#/glasanje">Glasaj →</a>
  <a class="btn" href="#/${DOC_SLUG}">Kako tehnički radi</a>
</section>`;

function renderPublic(el: HTMLElement, s: Extract<Share, { kind: "public" }>) {
  const c = s.card;
  if (!c) {
    el.innerHTML = `<section class="hero results-hero"><div class="hero-eyebrow">Javni glas · Stadion Maksimir</div>
      <h1>Ovaj glas više nije javan</h1>
      <p class="hero-lede">Javni prikaz je isključen ili je glas povučen.</p></section>${cta}`;
    return;
  }
  el.innerHTML = `
    <section class="hero results-hero">
      <div class="hero-eyebrow">Javni glas · neslužbeno glasanje javnosti · Stadion Maksimir</div>
      <h1>${esc(displayName(c))}: moj glas za novi Maksimir</h1>
      <p class="hero-lede">Ova osoba je potvrdila identitet eOsobnom i sama odlučila da joj glas bude javan.
        Glas se broji jednako kao svaki drugi: 100 bodova po osobi.</p>
    </section>
    ${publicCardHtml(c)}
    <section class="panel sh-verify">
      <h2>Kako se ovo provjerava</h2>
      <ul>
        <li>Glas je zapis <strong>#${c.receipt?.seq ?? "—"}</strong> u lancu hasheva, pod pseudonimom <span class="mono">${short(c.pseudonym)}</span>.</li>
        <li>Zapis ulazi u satni snapshot koji se žigoše u Bitcoin (OpenTimestamps). Nakon toga nitko ga ne može tiho promijeniti.</li>
        <li>Po zatvaranju glasanja objavljuje se cijeli lanac, a <a href="${VERIFY_SCRIPT}" target="_blank" rel="noopener">maksimir_verify.py ↗</a> provjerava da je ovaj zapis u njemu.</li>
      </ul>
      ${c.receipt ? `<details><summary>Zapis iz lanca (JSON)</summary><pre class="mono small">${esc(JSON.stringify(c.receipt, null, 2))}</pre></details>` : ""}
    </section>
    <section class="panel"><h2>Podijeli</h2>${shareButtonsHtml(shareUrl(s.id), publicShareText(c))}</section>
    ${cta}`;
  bindShareButtons(el);
}

async function renderZk(el: HTMLElement, s: Extract<Share, { kind: "zk" }>) {
  const p: ZkProof = s.proof;
  const row = (id: string, text: string) => `<li data-check="${id}"><span class="sh-st">…</span> ${text}</li>`;
  el.innerHTML = `
    <section class="hero results-hero">
      <div class="hero-eyebrow">Anonimni glas · ZK dokaz · Stadion Maksimir</div>
      <h1>Anonimni glas za novi Maksimir</h1>
      <p class="hero-lede">Ova stranica ne zna čiji je ovo glas ni kako glasi. Ali tvoj preglednik upravo matematički provjerava
        da je glas predala stvarna osoba potvrđena eOsobnom, a ne bot ni izmišljeni račun.</p>
    </section>
    <section class="panel sh-verify">
      <h2>Provjera u tvom pregledniku</h2>
      <ol class="sh-checks">
        ${row("snark", "Dokaz je kriptografski valjan (Semaphore v4, Groth16 nad BN254).")}
        ${row("message", "Dokaz je izrađen baš za ovo glasanje (poruka „glasao-sam”, scope „maksimir-2026”).")}
        ${row("log", "Javni zapisnik ZK grupe je neprekinut lanac hasheva.")}
        ${row("root", "Korijen Merkleova stabla u dokazu odgovara grupi potvrđenih glasača iz javnog zapisnika.")}
      </ol>
      <p class="sh-verdict muted">Provjeravam…</p>
      <h3>Što ovaj dokaz govori, a što ne</h3>
      <ul>
        <li><strong>Govori:</strong> vlasnik dokaza zna tajni ključ <span data-members>jednog od članova grupe</span>. Član grupe može postati samo osoba
          potvrđena eOsobnom koja je predala listić.</li>
        <li><strong>Ne govori:</strong> tko je ta osoba ni kako je glasala. Nullifier <span class="mono">${short(p.nullifier)}</span>
          je isti za svaki dokaz iste osobe, pa se jedna osoba ne može predstaviti kao više njih.</li>
        <li><strong>Granica faze 1:</strong> operater baze zna koji je glasač upisao koji ključ u grupu. Javnost to ne zna.
          Plan da se i to ukloni opisan je u <a href="#/${DOC_SLUG}">tehničkom opisu</a>.</li>
      </ul>
      <details><summary>Dokaz (JSON)</summary><pre class="mono small">${esc(JSON.stringify({ zk_seq: s.zk_seq, ...p }, null, 2))}</pre></details>
      <p class="muted small">Izrađen ${esc(fmtDate(s.created_at))}, nad stanjem grupe nakon zapisa #${s.zk_seq}.</p>
    </section>
    <section class="panel"><h2>Podijeli</h2>${shareButtonsHtml(shareUrl(s.id), ZK_SHARE_TEXT)}</section>
    ${cta}`;
  bindShareButtons(el);

  const set = (id: string, ok: boolean, extra = "") => {
    const li = el.querySelector<HTMLElement>(`[data-check="${id}"]`);
    if (!li) return;
    li.classList.add(ok ? "ok" : "bad");
    li.querySelector(".sh-st")!.textContent = ok ? "✓" : "✗";
    if (extra) li.insertAdjacentHTML("beforeend", ` <span class="muted small">${esc(extra)}</span>`);
  };
  const verdict = el.querySelector<HTMLElement>(".sh-verdict")!;
  try {
    const { checkZkShare } = await import("./zk");
    const r = await checkZkShare(p, s.zk_seq);
    set("snark", r.snark);
    set("message", r.message);
    set("log", r.log === null, r.log ?? "");
    set("root", r.root, `${r.members} ${plural(r.members, "član", "člana", "članova")} u trenutku izrade`);
    el.querySelectorAll("[data-members]").forEach(
      (x) =>
        (x.textContent =
          r.members === 1 ? "jedinog člana grupe" : `jednog od ${r.members} ${plural(r.members, "člana", "člana", "članova")} grupe`)
    );
    const all = r.snark && r.message && r.root && r.log === null;
    verdict.className = `sh-verdict gl-msg gl-msg--${all ? "ok" : "err"}`;
    verdict.textContent = all
      ? r.members === 1
        ? "Dokaz je valjan: glas je predala jedina potvrđena osoba u grupi. Dok grupa ne naraste, dokaz ne skriva ništa."
        : `Dokaz je valjan: glas je predala jedna od ${r.members} ${plural(r.members, "potvrđene osobe", "potvrđene osobe", "potvrđenih osoba")} u grupi.`
      : "Dokaz NIJE prošao provjeru.";
  } catch (e) {
    verdict.className = "sh-verdict gl-msg gl-msg--err";
    verdict.textContent = `Provjera nije uspjela: ${(e as Error).message}`;
  }
}
