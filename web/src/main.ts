import "./style.css";
import "highlight.js/styles/github.css";

import { docs, docIndex, type DocEntry } from "./docs";
import { renderMarkdown, renderMermaidIn } from "./markdown";
import { landingHtml } from "./landing";

const navEl = document.getElementById("nav")!;
const contentEl = document.getElementById("content")!;
const crumbsEl = document.getElementById("crumbs")!;
const sidebarEl = document.getElementById("sidebar")!;
const menuToggle = document.getElementById("menu-toggle")!;

menuToggle.addEventListener("click", () => {
  sidebarEl.classList.toggle("open");
});

function buildNav() {
  const html: string[] = [];
  html.push(`<a class="nav-home" href="#/" data-slug="__home__">Naslovnica</a>`);
  for (const section of docs) {
    html.push(`<div class="nav-section">`);
    html.push(`<div class="nav-section-title">${section.title}</div>`);
    html.push(`<ul class="nav-list">`);
    for (const item of section.items) {
      html.push(
        `<li><a href="#/${item.slug}" data-slug="${item.slug}">` +
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
        <p><a href="#/">← Natrag na naslovnicu</a></p>
      </div>`;
    setCrumbs([{ label: "Naslovnica", href: "#/" }, { label: "404" }]);
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
    { label: "Naslovnica", href: "#/" },
    { label: sectionTitle(doc.section) },
    { label: doc.title },
  ]);
  setActiveNav(slug);
  await renderMermaidIn(contentEl);
  // Scroll to fragment if any, otherwise top.
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

function sectionTitle(id: string): string {
  return docs.find((s) => s.id === id)?.title ?? "";
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );
}

function parseRoute(): { slug: string; hash: string } {
  const raw = location.hash.replace(/^#\/?/, "");
  // raw is like "sot" or "sot#section-name" or ""
  const [slug, ...rest] = raw.split("#");
  return { slug, hash: rest.length ? "#" + rest.join("#") : "" };
}

async function route() {
  sidebarEl.classList.remove("open");
  const { slug, hash } = parseRoute();
  if (!slug) {
    renderHome();
    return;
  }
  await renderDoc(slug, hash);
}

window.addEventListener("hashchange", route);

buildNav();
route();
