#!/usr/bin/env python3
"""Skida slike s objava autora (Instagram, LinkedIn, mediji) — samo lokalno.

Javni popis svih radova gradi scripts/build_radovi.py; ovo je pomoćni alat za
privatnu arhivu, jer autorska prava na te slike imaju autori.

Ulaz:  <backfill_dir>/*.json  (format: {"agent", "searched", "entries": [...]})
Izlaz: sources/prijave-slike/prijave.json — spojeni popis objava autora
       sources/prijave-slike/<slug>/  — skinute slike (lokalno, gitignored)
       sources/prijave-slike/manifest.json — slug -> [(url, file)]
"""
import json, re, sys, unicodedata, pathlib, hashlib, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
bdir = pathlib.Path(sys.argv[1])
download = "--no-download" not in sys.argv


def slug(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    s = re.sub(r"\b(architects?|arhitekti|architecture|studio|associates|d\.?o\.?o\.?|ltd|gmbh|s\.?a\.?r\.?l\.?|&|and|\+)\b", " ", s)
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


merged: dict[str, dict] = {}
for f in sorted(bdir.glob("*.json")):
    data = json.loads(f.read_text())
    for e in data.get("entries", []):
        k = slug(e.get("lead_office") or "")
        if not k:
            continue
        m = merged.setdefault(k, {"slug": k, "lead_office": e["lead_office"], "partners": [], "people": [],
                                  "city_country": None, "code": None, "awarded": False, "concept": "",
                                  "sources": [], "image_urls": [], "confidence": "uncertain", "notes": [],
                                  "found_by": []})
        for fld in ("partners", "people", "image_urls"):
            for v in e.get(fld) or []:
                if v and v not in m[fld]:
                    m[fld].append(v)
        for src in e.get("sources") or []:
            if src.get("url") and src["url"] not in [s["url"] for s in m["sources"]]:
                m["sources"].append(src)
        for fld in ("city_country", "code"):
            m[fld] = m[fld] or e.get(fld)
        m["awarded"] = m["awarded"] or bool(e.get("awarded"))
        if len(e.get("concept") or "") > len(m["concept"]):
            m["concept"] = e["concept"]
        rank = {"confirmed": 2, "likely": 1, "uncertain": 0}
        if rank.get(e.get("confidence"), 0) > rank[m["confidence"]]:
            m["confidence"] = e["confidence"]
        if e.get("notes"):
            m["notes"].append(f"[{data.get('agent', f.stem)}] {e['notes']}")
        m["found_by"].append(data.get("agent", f.stem))

entries = sorted(merged.values(), key=lambda m: (not m["awarded"], m["lead_office"].lower()))

img_root = ROOT / "sources/prijave-slike"
manifest = {}
if download:
    for m in entries:
        if m["awarded"]:
            continue
        out = img_root / m["slug"]
        for url in m["image_urls"]:
            ext = re.search(r"\.(jpe?g|png|webp)", url.split("?")[0], re.I)
            name = hashlib.sha1(url.encode()).hexdigest()[:12] + "." + (ext.group(1).lower() if ext else "jpg")
            target = out / name
            try:
                if not target.exists():
                    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0", "Referer": "https://www.instagram.com/"})
                    body = urllib.request.urlopen(req, timeout=40).read()
                    if len(body) < 5000:
                        raise ValueError(f"premalo ({len(body)} B)")
                    out.mkdir(parents=True, exist_ok=True)
                    target.write_bytes(body)
                manifest.setdefault(m["slug"], []).append({"url": url, "file": str(target.relative_to(ROOT)), "ok": True})
            except Exception as ex:  # CDN linkovi istječu, neki traže prijavu
                manifest.setdefault(m["slug"], []).append({"url": url, "ok": False, "error": str(ex)[:120]})
    img_root.mkdir(parents=True, exist_ok=True)
    (img_root / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2))

for m in entries:
    ok = [x for x in manifest.get(m["slug"], []) if x.get("ok")]
    m["local_images"] = len(ok)
    m["image_count_found"] = len(m.pop("image_urls"))

(img_root / "prijave.json").write_text(json.dumps(entries, ensure_ascii=False, indent=2))
na = [m for m in entries if not m["awarded"]]
print(f"ukupno {len(entries)} (nenagrađenih {len(na)}), slike skinute za {sum(1 for m in na if m['local_images'])} radova, "
      f"{sum(m['local_images'] for m in na)} datoteka")
