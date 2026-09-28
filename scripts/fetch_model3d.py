#!/usr/bin/env python3
"""Preuzima 3D model natječajnog rada sa zagreb.lol i sprema ga kao statičnu datoteku weba.

Autor modela je Strahimir Stribor (https://zagreb.lol). Prikaz na našem webu je vlastiti
three.js renderer (web/src/model3dViewer.ts); od zagreb.lol preuzimamo samo podatke modela.

    python3 scripts/fetch_model3d.py 6TVJ3MUHR stadion-maksimir-novi

Izlaz: web/public/modeli3d/<šifra>/manifest.json  — materijali, raspon skupina, podrijetlo
       web/public/modeli3d/<šifra>/mesh.f32.gz    — trokuti (x,y,z Float32 LE), gzip
Koordinate su lokalne, u metrima, y prema gore (kao u izvoru).
"""
import array, datetime, gzip, json, pathlib, sys, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
API = "https://zagreb.lol/prijevoz/api/buildings/towers"


def get(url: str):
    req = urllib.request.Request(url, headers={"User-Agent": "maksimir.domovina.ai model fetch"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.load(r)


def main(code: str, tower_id: str):
    rec = get(API)["towers"][tower_id]
    positions = get(f"{API}/{tower_id}/positions")["positions"]

    buckets, flat = [], array.array("f")
    for name, values in positions.items():
        if not values or len(values) % 9:
            continue
        buckets.append({"name": name, "offset": len(flat), "count": len(values),
                        "material": rec.get("mesh_materials", {}).get(name, {})})
        flat.extend(values)
    if sys.byteorder != "little":
        flat.byteswap()

    out = ROOT / "web/public/modeli3d" / code
    out.mkdir(parents=True, exist_ok=True)
    (out / "mesh.f32.gz").write_bytes(gzip.compress(flat.tobytes(), 9, mtime=0))
    meta = rec.get("_meta", {})
    manifest = {
        "code": code,
        "name": rec.get("name"),
        "author": "Strahimir Stribor",
        "site": "zagreb.lol",
        "viewer_url": f"https://zagreb.lol/zgrade/modeli/?id={tower_id}",
        "source_api": f"{API}/{tower_id}/positions",
        "source_updated_at": rec.get("updated_at"),
        "fetched_at": datetime.date.today().isoformat(),
        "revision": meta.get("revision"),
        "geometry_basis": meta.get("geometry_basis"),
        "pitch_m": meta.get("pitch_m"),
        "anchor": rec.get("anchor"),
        "height_m": rec.get("height_m"),
        "triangles": len(flat) // 9,
        "buckets": buckets,
    }
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1) + "\n")
    print(f"{code}: {len(flat) // 9} trokuta, {len(buckets)} skupina, "
          f"{(out / 'mesh.f32.gz').stat().st_size // 1024} KB → {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main(*sys.argv[1:3])
