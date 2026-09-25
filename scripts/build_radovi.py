#!/usr/bin/env python3
"""Gradi popis svih 88 natječajnih radova iz službenih EOJN dokumenata.

Ulaz:  <backfill>/official.json  — parsirani "Zapisnik o pregledu i ocjeni" +
       "Zapisnik o rangiranju" + Prilog III (EOJN 76778, objava 25.9.2026.)
       <backfill>/official/images/<n>_<code>_1.jpg — slike iz Priloga III
       <backfill>/{media-hr,intl,social}.json — (opcionalno) objave autora
Izlaz: sources/radovi.json            — javni podaci (bez OIB-a i adresa)
       web/public/radovi/<code>.jpg    — slika 1600 px
       web/public/radovi/<code>-t.jpg  — sličica 560 px
"""
import json, re, subprocess, sys, pathlib, unicodedata

ROOT = pathlib.Path(__file__).resolve().parent.parent
B = pathlib.Path(sys.argv[1])
OUT_IMG = ROOT / "web/public/radovi"
OUT_IMG.mkdir(parents=True, exist_ok=True)

# Imena pod kojima se timovi sami predstavljaju, a ne poklapaju se sa zapisnikom.
ALIASES = {
    "FQORKZEN0": ["Zaha Hadid Architects", "ZHA"],
    "AXAHFUYJP": ["Otto Barić", "Otto Baric"],
    "WWUUTZSNC": ["Proarh", "Davor Mateković"],
    "9B9EEI64G": ["3LHD"],
    "G8UJEOMVM": ["GEplus arhitekti", "GEplus"],
    "72ECW1UD7": ["Urbane ideje", "Kengo Kuma & Associates"],
    "UO5YMEAMR": ["Jeff Alan Gard Architect", "JAG Architecture"],
    "LPMLOBLZN": ["ATMOSFERA", "ATMOSFERA™"],
    "X8G5VVECK": ["Nordic Office of Architecture", "PULS*AR Arhitektura", "PULSAR Arhitektura"],
    "OUEE4GMGC": ["ppp architekten + generalplaner", "Nils Dethlefs"],
    "BPKNHCZ5Y": ["tkdp", "tkdp – Tariq Khayyat Design Partners", "Tariq Khayyat Design Partners"],
    "UXADSRW1U": ["Atelier Kovačić Miketek", "Katarina Kovačić"],
}

AWARD_RANK = {"6TVJ3MUHR": 1, "GY0F1A9OM": 2, "W3YS5VJBZ": 3, "6PPWVBBBZ": 4, "CYFXC7LIM": 5}


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def clean_text(s: str | None) -> str | None:
    if not s:
        return s
    return re.sub(r"[ \t]+", " ", s).strip()


GENERIC = {"engineering", "architecture", "consulting", "design", "planning"}


def fix_roles(roles: list[dict]) -> list[dict]:
    """Zapisnik razdvaja imena na zarezima: 'IDOM Consulting, Engineering, Architecture'
    postane tri uloge. Generičke riječi vraćamo u prethodno ime."""
    out: list[dict] = []
    for x in roles:
        name = (x.get("name") or "").replace("\\", "").strip()
        if not name:
            continue
        if out and name.lower() in GENERIC:
            out[-1]["name"] += f", {name}"
            out[-1]["role"] = out[-1]["role"] or (x.get("role") or "")
            continue
        out.append({"name": re.sub(r"\s+", " ", name), "role": x.get("role") or ""})
    return out


official = json.loads((B / "official.json").read_text())["entries"]

# Objave autora iz ostalih agenata (samo linkovi, bez slika).
extra = []
for name in ("media-hr", "intl", "social"):
    f = B / f"{name}.json"
    if f.exists():
        extra += json.loads(f.read_text()).get("entries", [])

# Krug ocjenjivanja u kojem je rad ispao (Zapisnik o rangiranju, xlsx).
rk_file = B / "media-hr/eojn/ranking.json"
ROUNDS = json.loads(rk_file.read_text()) if rk_file.exists() else {}

ROUND_NO = {"prvom": 1, "drugom": 2, "trećem": 3, "četvrtom": 4, "petom": 5}

radovi = []
for e in official:
    o = e["official"]
    code = e["code"]
    imgs = o.get("local_images") or []
    has_img = False
    if imgs and pathlib.Path(imgs[0]).exists():
        subprocess.run(["magick", imgs[0], "-resize", "1600x>", "-quality", "82", str(OUT_IMG / f"{code}.jpg")], check=True)
        subprocess.run(["magick", imgs[0], "-resize", "560x", "-quality", "76", str(OUT_IMG / f"{code}-t.jpg")], check=True)
        has_img = True

    names = [r["name"] for r in fix_roles(o.get("roles") or [])] + ALIASES.get(code, [])
    keys = {norm(e["lead_office"])} | {norm(n) for n in names}
    keys.discard("")
    links = []
    for x in extra:
        if x.get("awarded"):
            continue
        # Samo glavni ured i osobe, ne partneri: inženjeri (npr. Arup) rade s više timova.
        xk = {norm(x.get("lead_office", ""))} | {norm(p) for p in x.get("people") or []}
        xk.discard("")

        def same(a: str, b: str) -> bool:
            if a == b:
                return True
            short, long_ = sorted((a, b), key=len)
            return len(short) >= 8 and " " in short and f" {short} " in f" {long_} "

        hit = (x.get("code") and x["code"] == code) or any(same(a, b) for a in keys for b in xk)
        if hit:
            for s in x.get("sources") or []:
                u = s.get("url", "")
                if u and "eojn.hr" not in u and u not in [l["url"] for l in links]:
                    links.append({"url": u, "type": s.get("type") or "other"})

    radovi.append({
        "n": o.get("eojn_rbr"),
        "code": code,
        "rank": o.get("rank"),
        "round_out": ROUND_NO.get((ROUNDS.get(e["code"]) or {}).get("round_eliminated")),
        "award": AWARD_RANK.get(code),
        "status": o["status"],
        "lead": e["lead_office"],
        "roles": fix_roles(o.get("roles") or []),
        "submitter": clean_text(o.get("submitter_full")),
        "countries": o.get("countries") or [],
        "city_country": e.get("city_country"),
        "received": o.get("received"),
        "prize_eur_gross": o.get("prize_eur_gross"),
        "jury_hr": clean_text(o.get("jury_assessment_hr")),
        "jury_en": clean_text(o.get("jury_assessment_en")),
        "rejection": clean_text(o.get("rejection_reason")),
        "prilog3_pages": o.get("prilog_III_pages"),
        "image": has_img,
        "links": links,
    })

radovi.sort(key=lambda r: (r["rank"] is None, r["rank"] or 0, r["n"] or 0))
(ROOT / "sources/radovi.json").write_text(json.dumps(radovi, ensure_ascii=False, indent=1))
print(f"{len(radovi)} radova · slika: {sum(r['image'] for r in radovi)} · s linkovima autora: {sum(1 for r in radovi if r['links'])}")

# research/09 — tablica svih radova (generirano, ne uređivati ručno)
def md(s):
    return (s or "").replace("|", "\\|")

rows = []
for r in radovi:
    rank = "odbijen" if r["status"] == "rejected" else (f"**{r['award']}. nagrada**" if r["award"] else str(r["rank"]))
    authors = ", ".join(x["name"] for x in r["roles"] if "autor" in x["role"].lower())
    if r.get("round_out"):
        rank += f" · {r['round_out']}. krug"
    rows.append(f"| {rank} | [`{r['code']}`](#/radovi/{r['code']}) | {md(r['lead'])} | {md(authors)} | {md(', '.join(r['countries']))} |")

from collections import Counter
cc = Counter(c for r in radovi for c in set(r["countries"]))
doc = f"""# 09 — Svih 88 natječajnih radova

> **Generirano** iz `sources/radovi.json` skriptom `scripts/build_radovi.py`. Ne uređivati ručno.
> Izvor: EOJN RH, tender 76778, dokumenti odluke o rezultatima objavljeni **25.9.2026.**:
> „Zapisnik o pregledu i ocjeni”, „Zapisnik o rangiranju” i „Prilog III. Opisne ocjene i grafički prilozi natječajnih rješenja”.
> Galerija sa slikama i ocjenama žirija je na stranici **[Svih 88 radova](#/radovi)**.

- **88 radova:** 85 rangiranih, 3 odbijena (dvije makete nisu stigle u roku, jedan rad nije imao sve priloge).
- Obavijest o rezultatima navodi **27 radova iz Hrvatske, 41 iz drugih zemalja EU i 20 izvan EU**. Nagrade ukupno iznose 728.000,52 € bez PDV-a.
- Zemlje u timovima (uključujući partnere): {", ".join(f"{k} {v}" for k, v in cc.most_common())}.
- Rang 6–85 je redoslijed ocjenjivačkog suda, a ne nagrada. Ocjenjivanje je išlo u 5 krugova: u 1. je ispalo 11 radova, u 2. 18, u 3. 20, u 4. 11, a u 5. 8. Rangovi 6–17 došli su do završnog kruga.

## Kako do izvornih dokumenata

Stranica `https://eojn.hr/tender-eo/76778` svakom posjetitelju dodijeli privremeni gostujući token. Link koji tablica prikazuje vodi na prijavu, ali kraći oblik `https://eojn.hr/GetDocument.ashx?id=<DmsId>&userToken=<token>` vraća datoteku bez prijave. DmsId-ove daje javni API `GET /api/searchgrid/VAwardDecisions/get?filter=["TenderId","=",76778]` (token ide u zaglavlje `UserToken`). Zapisnik sadrži i OIB-e i adrese fizičkih osoba, pa se u repo **ne commita**. Ovdje su samo imena, uloge, zemlje i ocjene.

## Popis (po rangu)

| Rang | Šifra | Nositelj / podnositelj | Autori | Zemlje |
|---|---|---|---|---|
""" + "\n".join(rows) + "\n"
(ROOT / "research/09-svi-radovi.md").write_text(doc)
print("research/09 zapisan")
