// Ulaz SSR builda za prerender (scripts/prerender.mjs). app.ts se učitava tek
// nakon što skripta postavi globalni DOM, jer pri učitavanju čita elemente stranice.

export async function load() {
  const [app, meta, routes] = await Promise.all([import("./app"), import("./meta"), import("./routes")]);
  return { buildNav: app.buildNav, route: app.route, allRoutes: meta.allRoutes, pageMeta: meta.pageMeta, SITE: meta.SITE, link: routes.link };
}
