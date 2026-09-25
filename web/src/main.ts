import "./style.css";
import "highlight.js/styles/github.css";

import { buildNav, route } from "./app";
import { link, setRouteHandler } from "./routes";

// Stare hash poveznice (/#/radovi/X, /#/sot#sidro) i dalje kruže, a poslužitelj
// hash ne vidi, pa ih ovdje prevodimo u pravi put bez novog unosa u povijesti.
function upgradeLegacyHash(): boolean {
  if (!location.hash.startsWith("#/")) return false;
  history.replaceState(null, "", "/" + location.hash.slice(2));
  return true;
}
upgradeLegacyHash();
// /g/<id> je poveznica za dijeljenje (Pages Function daje OG karticu i preusmjerava).
// Ako stigne do SPA-a (lokalni razvoj ili bez Functiona), prebaci na rutu objave.
{
  const m = location.pathname.match(/^\/g\/([a-z0-9]{12})\/?$/);
  if (m) history.replaceState(null, "", link(`glasanje/g/${m[1]}`));
}

const sidebarEl = document.getElementById("sidebar")!;
document.getElementById("menu-toggle")!.addEventListener("click", () => {
  sidebarEl.classList.toggle("open");
});

// Interni linkovi mijenjaju rutu bez ponovnog učitavanja stranice. Datoteke
// (slike, PDF-ovi), novi prozori i klikovi s modifikatorom idu pregledniku.
document.addEventListener("click", (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = (e.target as Element).closest?.("a[href]") as HTMLAnchorElement | null;
  if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
  const url = new URL(a.href);
  if (url.origin !== location.origin || /\.[a-z0-9]+$/i.test(url.pathname)) return;
  // Isti URL: kao i s hash ruterom, ništa (bez ponovnog učitavanja i novog unosa u povijesti).
  if (url.href === location.href) {
    e.preventDefault();
    return;
  }
  // Samo sidro na istoj stranici: preglednik skrola sam.
  if (url.pathname === location.pathname && url.search === location.search && url.hash) return;
  e.preventDefault();
  history.pushState(null, "", url.pathname + url.search + url.hash);
  route();
});

window.addEventListener("popstate", route);
// Stari link zalijepljen u adresnu traku otvorene stranice ne učitava je ponovno.
window.addEventListener("hashchange", () => {
  if (upgradeLegacyHash()) route();
});
setRouteHandler(route);

buildNav();
route();
