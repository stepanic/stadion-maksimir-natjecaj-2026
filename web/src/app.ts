// Iscrtavanje stranice za put u location.pathname. Isti kod koristi preglednik
// (main.ts) i prerender u buildu (prerender.ts), pa je HTML stranica isti.

import { docs, docIndex, type DocEntry } from "./docs";
import { renderMarkdown, renderMermaidIn } from "./markdown";
import { landingHtml } from "./landing";
import { renderResultsIndex, renderAward } from "./rezultatiView";
import { renderRadoviIndex, renderRad } from "./radoviView";
import { renderGlasanje } from "./glasanjeView";
import { renderShare } from "./shareView";
import { link } from "./routes";
import { applyMeta } from "./meta";

const navEl = document.getElementById("nav")!;
const contentEl = document.getElementById("content")!;
const crumbsEl = document.getElementById("crumbs")!;
const sidebarEl = document.getElementById("sidebar")!;

export function buildNav() {
  const html: string[] = [];
  html.push(`<a class="nav-home" href="${link("")}" data-slug="__home__">Naslovnica</a>`);
  html.push(`<a class="nav-home nav-results" href="${link("rezultati")}" data-slug="rezultati">Rezultati natječaja · 5 nagrađenih radova</a>`);
  html.push(`<a class="nav-home nav-results" href="${link("radovi")}" data-slug="radovi">Svih 88 natječajnih radova</a>`);
  html.push(`<a class="nav-home nav-results" href="${link("glasanje")}" data-slug="glasanje">Glasanje javnosti · tvojih 100 bodova</a>`);
  for (const section of docs) {
    html.push(`<div class="nav-section">`);
    html.push(`<div class="nav-section-title">${section.title}</div>`);
    html.push(`<ul class="nav-list">`);
    for (const item of section.items) {
      html.push(
        `<li><a href="${link(item.slug)}" data-slug="${item.slug}">` +
          `<span class="nav-title">${item.title}</span>` +
          (item.subtitle ? `<span class="nav-sub">${item.subtitle}</span>` : "") +
          `</a></li>`
      );
    }
    html.push(`</ul></div>`);
  }
  navEl.innerHTML = html.join("");
}

function setActiveNav(slug: string) {
  navEl.querySelectorAll<HTMLAnchorElement>("a[data-slug]").forEach((a) => {
    a.classList.toggle("active", a.dataset.slug === slug);
  });
}

function setCrumbs(parts: { label: string; href?: string }[]) {
  crumbsEl.innerHTML = parts
    .map((p, i) => {
      const seg = p.href ? `<a href="${p.href}">${p.label}</a>` : `<span>${p.label}</span>`;
      return seg + (i < parts.length - 1 ? `<span class="sep">/</span>` : "");
    })
    .join("");
}

async function renderDoc(slug: string, hash: string) {
  const doc: DocEntry | undefined = docIndex[slug];
  if (!doc) {
    contentEl.innerHTML = `
      <div class="notfound">
        <h1>Dokument nije pronađen</h1>
        <p>Nepoznat slug: <code>${escapeHtml(slug)}</code></p>
        <p><a href="${link("")}">← Natrag na naslovnicu</a></p>
      </div>`;
    setCrumbs([{ label: "Naslovnica", href: link("") }, { label: "404" }]);
    setActiveNav("");
    return;
  }
  const html = renderMarkdown(doc.raw, doc.repoPath);
  contentEl.innerHTML = `
    <div class="doc-header">
      <div class="doc-eyebrow">${escapeHtml(sectionTitle(doc.section))}</div>
      <h1 class="doc-title">${escapeHtml(doc.title)}</h1>
      ${doc.subtitle ? `<p class="doc-subtitle">${escapeHtml(doc.subtitle)}</p>` : ""}
      <p class="doc-meta">
        <code>${escapeHtml(doc.repoPath)}</code>
      </p>
    </div>
    <div class="doc-body markdown-body">${html}</div>
  `;
  setCrumbs([
    { label: "Naslovnica", href: link("") },
    { label: sectionTitle(doc.section) },
    { label: doc.title },
  ]);
  setActiveNav(slug);
  await renderMermaidIn(contentEl);
  scrollToHash(hash);
}

// Scroll to fragment if any, otherwise top.
export function scrollToHash(hash: string) {
  if (hash) {
    const id = decodeURIComponent(hash.replace(/^#/, ""));
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: "instant", block: "start" });
      return;
    }
  }
  window.scrollTo({ top: 0 });
}

function renderHome() {
  contentEl.innerHTML = landingHtml;
  setCrumbs([{ label: "Naslovnica" }]);
  setActiveNav("__home__");
  window.scrollTo({ top: 0 });
}

function renderResults(slug: string) {
  const rank = Number(slug.split("/")[1]);
  const base = [{ label: "Naslovnica", href: link("") }];
  if (rank) {
    const ok = renderAward(contentEl, rank);
    setCrumbs(
      ok
        ? [...base, { label: "Rezultati", href: link("rezultati") }, { label: `${rank}. nagrada` }]
        : [...base, { label: "Rezultati", href: link("rezultati") }, { label: "404" }]
    );
  } else {
    renderResultsIndex(contentEl);
    setCrumbs([...base, { label: "Rezultati natječaja" }]);
  }
  setActiveNav("rezultati");
  window.scrollTo({ top: 0 });
}

function renderRadovi(slug: string) {
  const code = slug.split("/")[1];
  const base = [{ label: "Naslovnica", href: link("") }];
  if (code) {
    const r = renderRad(contentEl, code);
    setCrumbs([...base, { label: "Svi radovi", href: link("radovi") }, { label: r ? r.code : "404" }]);
  } else {
    renderRadoviIndex(contentEl);
    setCrumbs([...base, { label: "Svih 88 radova" }]);
  }
  setActiveNav("radovi");
  window.scrollTo({ top: 0 });
}

function sectionTitle(id: string): string {
  return docs.find((s) => s.id === id)?.title ?? "";
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );
}

function parseRoute(): { slug: string; hash: string } {
  const slug = decodeURIComponent(location.pathname).replace(/^\/+|\/+$/g, "");
  return { slug, hash: location.hash };
}

// Put koji je zadnji iscrtan: promjena samo sidra ne crta stranicu ponovno.
let renderedPath: string | null = null;

export async function route() {
  sidebarEl.classList.remove("open");
  const { slug, hash } = parseRoute();
  if (renderedPath === location.pathname) {
    scrollToHash(hash);
    return;
  }
  renderedPath = location.pathname;
  applyMeta(slug);
  // Mreža svih radova koristi punu širinu ekrana; ostale stranice ostaju u stupcu za čitanje.
  contentEl.classList.toggle("content--wide", slug === "radovi" || slug === "glasanje");
  if (!slug) {
    renderHome();
    return;
  }
  if (slug === "radovi" || slug.startsWith("radovi/")) {
    renderRadovi(slug);
    return;
  }
  if (slug.startsWith("glasanje/g/")) {
    setCrumbs([{ label: "Naslovnica", href: link("") }, { label: "Glasanje javnosti", href: link("glasanje") }, { label: "Objava glasa" }]);
    setActiveNav("glasanje");
    window.scrollTo({ top: 0 });
    await renderShare(contentEl, slug.slice("glasanje/g/".length));
    return;
  }
  if (slug === "glasanje") {
    setCrumbs([{ label: "Naslovnica", href: link("") }, { label: "Glasanje javnosti" }]);
    setActiveNav("glasanje");
    window.scrollTo({ top: 0 });
    await renderGlasanje(contentEl);
    return;
  }
  if (slug === "rezultati" || slug.startsWith("rezultati/")) {
    renderResults(slug);
    return;
  }
  await renderDoc(slug, hash);
}
