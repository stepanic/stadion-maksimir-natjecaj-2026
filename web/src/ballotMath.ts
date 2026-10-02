// Računanje listića za sučelja koja bodove predlažu (/glasaj): od redoslijeda favorita do
// cijelih bodova sa zbrojem 100. Bez DOM-a i mreže, pa se testira u Nodeu (test/ballotMath.test.ts).
//
// Formule su javne i iste kao u prototipima (prototipi/glasanje-ux/core.js): Borda nad
// favoritima, raspodjela najvećim ostatkom. Prijedlog je samo nacrt: glasač ga uvijek vidi i mijenja.

export type Items = Record<string, number>;
export const TOTAL = 100;

/** Težine → cijeli bodovi sa zbrojem `total` (metoda najvećeg ostatka; izjednačenja po redoslijedu ulaza). */
export function allocate(weights: Items, total = TOTAL): Items {
  const e = Object.entries(weights).filter(([, w]) => w > 0);
  const W = e.reduce((s, [, w]) => s + w, 0);
  if (!W) return {};
  const raw = e.map(([c, w], i) => ({ c, x: (w / W) * total, i }));
  const out: Items = Object.fromEntries(raw.map(({ c, x }) => [c, Math.floor(x)]));
  let left = total - Object.values(out).reduce((s, x) => s + x, 0);
  const byRest = [...raw].sort((a, b) => b.x - Math.floor(b.x) - (a.x - Math.floor(a.x)) || a.i - b.i);
  for (let k = 0; left > 0; k = (k + 1) % byRest.length, left--) out[byRest[k].c]++;
  for (const c of Object.keys(out)) if (!out[c]) delete out[c];
  return out;
}

export type Preset = "rank" | "equal" | "first";

export const PRESETS: Record<Preset, string> = {
  rank: "Po redoslijedu",
  equal: "Svima jednako",
  first: "Sve prvom",
};

/** Borda: prvi od n favorita ima težinu n, zadnji 1. */
export function bordaWeights(ordered: string[]): Items {
  return Object.fromEntries(ordered.map((c, i) => [c, ordered.length - i]));
}

/** Prijedlog bodova za poredane favorite. */
export function propose(ordered: string[], preset: Preset = "rank"): Items {
  if (!ordered.length) return {};
  if (preset === "first") return { [ordered[0]]: TOTAL };
  if (preset === "equal") return allocate(Object.fromEntries(ordered.map((c) => [c, 1])));
  return allocate(bordaWeights(ordered));
}

/** Razmjerno svedi na 100 (npr. nakon ručnih izmjena). Prazan ili nul listić ostaje prazan. */
export const fitTo100 = (items: Items): Items => allocate(items);

export const sum = (items: Items) => Object.values(items).reduce((a, b) => a + (b || 0), 0);

/** Promjena bodova jednog rada za `delta`, unutar 0…100. Rad s 0 bodova ostaje na listiću. */
export function nudge(items: Items, code: string, delta: number): Items {
  return { ...items, [code]: Math.max(0, Math.min(TOTAL, (items[code] ?? 0) + delta)) };
}

/** Ručni unos: cijeli broj 0…100, sve ostalo se zaokruži ili odreže. */
export const clampPoints = (v: unknown) => Math.max(0, Math.min(TOTAL, Math.round(Number(v)) || 0));

/** Samo radovi s bodovima: to je ono što ide na lanac. */
export const clean = (items: Items): Items => Object.fromEntries(Object.entries(items).filter(([, v]) => v > 0));

export type Check = { ok: true } | { ok: false; reason: string };

/** Ista pravila kao encodePoints u chain/client/ballot.ts i maksimir_cast_ballot u bazi. */
export function validate(items: Items, known: Set<string>): Check {
  const it = clean(items);
  const codes = Object.keys(it);
  if (!codes.length) return { ok: false, reason: "Listić je prazan." };
  const bad = codes.find((c) => !known.has(c));
  if (bad) return { ok: false, reason: `Nepoznata šifra rada: ${bad}.` };
  if (codes.some((c) => !Number.isInteger(it[c]) || it[c] < 1 || it[c] > TOTAL)) return { ok: false, reason: "Bodovi moraju biti cijeli brojevi od 1 do 100." };
  const s = sum(it);
  if (s !== TOTAL) return { ok: false, reason: `Zbroj mora biti točno 100 (sad ${s}).` };
  return { ok: true };
}

/** Kanonski oblik „ŠIFRA:bodovi,…”, sortiran po šifri, bez nula (kao items_canon u fazi 1). */
export const canon = (items: Items) =>
  Object.keys(items)
    .filter((c) => items[c] > 0)
    .sort()
    .map((c) => `${c}:${items[c]}`)
    .join(",");

/** Radovi po bodovima (više prvo), pa po šifri: redoslijed za pregled listića. */
export const byPoints = (items: Items) => Object.entries(clean(items)).sort(([a, x], [b, y]) => y - x || a.localeCompare(b));

// ── nasumičan redoslijed (O-5: isti redoslijed za sve daje prednost prvima) ──

export function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(arr: readonly T[], rnd: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Pomak elementa u popisu (strelice ↑↓ kod favorita). Izvan granica: bez promjene. */
export function move<T>(arr: readonly T[], i: number, d: number): T[] {
  const j = i + d;
  if (i < 0 || i >= arr.length || j < 0 || j >= arr.length) return arr.slice();
  const a = arr.slice();
  [a[i], a[j]] = [a[j], a[i]];
  return a;
}
