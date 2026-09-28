#!/usr/bin/env python3
"""Gradi medijski arhiv natječaja: sve javne objave na jednom mjestu.

Ulaz:  sources/mediji.tsv                — dosadašnji arhiv (ako postoji)
       <mapa>/*.tsv (argumenti)          — nove iteracije istraživanja, isti stupci
Izlaz: sources/mediji.tsv                — spojeno, bez duplikata, po datumu
       research/11-medijski-arhiv.md     — generirani pregled (ne uređivati ručno)

Stupci: datum izvor naslov url tip stav sazetak provjereno
Duplikat = isti URL bez sheme, www., fragmenta, završne '/' i parametara za praćenje
(utm_*, fbclid, s, src …). Ostali parametri ostaju: youtube.com/watch?v=… su različiti videi.
Kod duplikata pobjeđuje redak s provjereno=da, pa onaj s više popunjenih polja.
"""
import csv, collections, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
TSV = ROOT / "sources/mediji.tsv"
MD = ROOT / "research/11-medijski-arhiv.md"
COLS = ["datum", "izvor", "naslov", "url", "tip", "stav", "sazetak", "provjereno"]
STAV = {"pro", "protiv", "neutralno", "mjesovito"}


TRACKING = re.compile(r"^(utm_.*|fbclid|gclid|igsh|igshid|si|s|src|ref|ref_src|t|feature|amp)$")


def norm(url: str) -> str:
    u = re.sub(r"^https?://(www\.|m\.|mobile\.)?", "", url.strip()).split("#")[0]
    base, _, q = u.partition("?")
    keep = sorted(kv for kv in q.split("&") if kv and not TRACKING.match(kv.split("=")[0]))
    return base.rstrip("/").lower() + ("?" + "&".join(keep) if keep else "")  # ID-jevi u upitu razlikuju velika slova


def read(path: pathlib.Path) -> list[dict]:
    with path.open(encoding="utf-8") as f:
        rows = list(csv.DictReader(f, delimiter="\t", quoting=csv.QUOTE_NONE))
    out = []
    for r in rows:
        r = {c: (r.get(c) or "").strip() for c in COLS}
        if not r["url"].startswith("http"):
            continue
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", r["datum"]):
            r["datum"] = ""
        r["stav"] = r["stav"].lower().replace("š", "s")
        if r["stav"] not in STAV:
            r["stav"] = ""
        r["provjereno"] = "da" if r["provjereno"].lower().startswith("da") else "snippet"
        out.append(r)
    return out


def score(r: dict) -> tuple:
    return (r["provjereno"] == "da", sum(bool(r[c]) for c in COLS))


def cell(s: str) -> str:
    return s.replace("|", "\\|")


def main():
    rows: dict[str, dict] = {}
    for p in ([TSV] if TSV.exists() else []) + [pathlib.Path(a) for a in sys.argv[1:]]:
        for r in read(p):
            k = norm(r["url"])
            if k not in rows or score(r) > score(rows[k]):
                rows[k] = r
    data = sorted(rows.values(), key=lambda r: (r["datum"] or "9999", r["izvor"], r["naslov"]))

    # Običan TSV bez navodnika i escapea: tabovi i novi redovi u poljima se pretvore u razmak,
    # pa se datoteka čita i piše bez gubitaka (csv s escapechar bi pri svakom pokretanju
    # dodavao još jednu '\\' ispred navodnika).
    lines = ["\t".join(COLS)]
    lines += ["\t".join(re.sub(r"[\t\r\n]+", " ", r[c]) for c in COLS) for r in data]
    TSV.write_text("\n".join(lines) + "\n", encoding="utf-8")

    by_src = collections.Counter(r["izvor"] for r in data)
    by_tip = collections.Counter(r["tip"] or "?" for r in data)
    by_stav = collections.Counter(r["stav"] or "?" for r in data)
    by_day = collections.Counter(r["datum"] for r in data if r["datum"] >= "2026-09-20")
    ver = sum(r["provjereno"] == "da" for r in data)

    L = [
        "# 11 — Medijski arhiv natječaja",
        "",
        "> **Generirano** iz `sources/mediji.tsv` skriptom `scripts/build_mediji.py`. Ne uređivati ručno:",
        "> nove objave dodati u TSV (ili kao novu iteraciju istraživanja) i ponovno pokrenuti skriptu.",
        "",
        f"- **{len(data)} objava** iz **{len(by_src)} izvora**. Za {ver} je stranica otvorena i datum i naslov",
        f"  potvrđeni (`da`), za ostale je podatak samo iz rezultata pretrage (`snippet`).",
        "- **Stav** se odnosi na izabrano rješenje (VG13): "
        + ", ".join(f"{k} {v}" for k, v in by_stav.most_common())
        + ". To je procjena iz naslova i sažetka, ne mjerenje.",
        "- **Vrste:** " + ", ".join(f"{k} {v}" for k, v in by_tip.most_common()) + ".",
        "- Ankete, peticije i slični projekti analizirani su u"
        " [`10-javnost-ankete-i-slicni-projekti.md`](10-javnost-ankete-i-slicni-projekti.md).",
        "",
        *(
            [
                "## Uklonjene objave",
                "",
                "Objave koje su postojale, a više nisu dostupne (izvor ih je uklonio):",
                "",
                *[f"- {r['datum']} · {r['izvor']} · [{cell(r['naslov'])}]({r['url']}) — {r['sazetak']}" for r in data if r["tip"] == "uklonjeno"],
                "",
            ]
            if any(r["tip"] == "uklonjeno" for r in data)
            else []
        ),
        "## Objave po danu (od 20. 9. 2026.)",
        "",
        "| Dan | Objava |",
        "|---|---|",
        *[f"| {d} | {n} |" for d, n in sorted(by_day.items())],
        "",
        "## Izvori",
        "",
        "| Izvor | Objava |",
        "|---|---|",
        *[f"| {cell(s)} | {n} |" for s, n in by_src.most_common()],
        "",
        "## Sve objave (najnovije prve)",
        "",
        "Na webu klik na zaglavlje „Datum” mijenja redoslijed (najnovije ↔ najstarije).",
        "",
        "| Datum | Izvor | Naslov | Vrsta | Stav | Sažetak |",
        "|---|---|---|---|---|---|",
    ]
    # Silazno po datumu (najnovije gore); objave bez datuma idu na kraj.
    newest = sorted(data, key=lambda r: (bool(r["datum"]), r["datum"]), reverse=True)
    for r in newest:
        title = cell(r["naslov"] or r["url"])
        mark = "" if r["provjereno"] == "da" else " ˢ"
        L.append(
            f"| {r['datum'].replace('-', '\u2011') or '—'} | {cell(r['izvor'])} | [{title}]({r['url']}){mark} "
            f"| {r['tip']} | {r['stav']} | {cell(r['sazetak'])} |"
        )
    L += ["", "ˢ = podatak iz rezultata pretrage, stranica nije otvorena.", ""]
    MD.write_text("\n".join(L), encoding="utf-8")
    print(f"{len(data)} objava, {len(by_src)} izvora → {TSV}, {MD}")


if __name__ == "__main__":
    main()
