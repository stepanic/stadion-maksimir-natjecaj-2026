// /g/<id> — poveznica za dijeljenje glasa (Cloudflare Pages Function).
//
// Hash rute (#/glasanje/g/<id>) crawleri društvenih mreža ne vide, pa ovdje
// poslužujemo mali HTML s OG/Twitter karticom (naslov i opis iz objave), a
// preglednik JavaScriptom preusmjerava na SPA. Crawleri JS ne izvode, pa ostaju
// na kartici. URL i anon ključ su javni (isti su u web/.env).

const API = "https://api.domovina.ai";
const ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3OTExMTcxMywiZXhwIjo0OTMyNzExNzEzLCJyb2xlIjoiYW5vbiJ9.Q4Ef7xMc2dmjMyfJebPDyqNirnARZzMxTWe7i0dASPI";

type Card = { name: string | null; items: { code: string; points: number; lead: string }[] } | null;
type Share = { kind: "public"; card: Card } | { kind: "zk"; zk_seq: number } | null;

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

async function fetchShare(id: string): Promise<Share> {
  const res = await fetch(`${API}/rest/v1/rpc/maksimir_share`, {
    method: "POST",
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
      "Content-Type": "application/json",
      "Content-Profile": "domovina_ai",
      "User-Agent": "maksimir-og/1 (+https://maksimir.domovina.ai)",
    },
    body: JSON.stringify({ p_id: id }),
  });
  return res.ok ? ((await res.json()) as Share) : null;
}

export const onRequestGet = async ({ params, request }: { params: Record<string, string>; request: Request }) => {
  const id = String(params.id ?? "");
  const origin = new URL(request.url).origin;
  if (!/^[a-z0-9]{12}$/.test(id)) return Response.redirect(`${origin}/#/glasanje`, 302);

  let title = "Glasanje javnosti za novi Stadion Maksimir";
  let desc = "Svaki građanin s eOsobnom ima 100 bodova za 88 natječajnih radova. Provjerljivo do Bitcoina.";
  try {
    const s = await fetchShare(id);
    if (s?.kind === "public" && s.card) {
      title = `${s.card.name ?? "Potvrđeni glasač"}: moj glas za novi Maksimir`;
      desc =
        s.card.items
          .slice(0, 3)
          .map((i) => `${i.points} bodova: ${i.lead}`)
          .join(" · ") + ". Identitet potvrđen eOsobnom. Raspodijeli i ti svojih 100 bodova.";
    } else if (s?.kind === "zk") {
      title = "Anonimni glas za novi Maksimir, sa ZK dokazom";
      desc =
        "Glas je predala stvarna osoba potvrđena eOsobnom, a nitko ne zna tko je ni kako je glasala. Provjeri ZK dokaz u svom pregledniku i glasaj i ti.";
    }
  } catch {
    /* ostaje opća kartica */
  }

  const url = `${origin}/g/${id}`;
  const target = `/#/glasanje/g/${id}`;
  const img = `${origin}/og-glasanje.png`;
  const html = `<!doctype html>
<html lang="hr"><head><meta charset="utf-8" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}" />
<link rel="canonical" href="${url}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="maksimir.DOMOVINA.ai" />
<meta property="og:locale" content="hr_HR" />
<meta property="og:url" content="${url}" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(desc)}" />
<meta property="og:image" content="${img}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(desc)}" />
<meta name="twitter:image" content="${img}" />
<script>location.replace(${JSON.stringify(target)});</script>
</head><body style="font:16px system-ui;padding:2rem">
<p><a href="${target}">${esc(title)} →</a></p>
</body></html>`;
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=60" },
  });
};
