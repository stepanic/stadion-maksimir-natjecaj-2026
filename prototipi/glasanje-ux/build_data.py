#!/usr/bin/env python3
"""Generira radovi-data.js za offline prototipe: 88 radova + smanjene službene slike (base64).

Izvori: sources/radovi.json i web/public/radovi/<ŠIFRA>-t.jpg. Slike smanjuje `sips` (macOS),
najveća stranica 360 px, JPEG kvaliteta 62; rezultat je ~3,4 MB.

    python3 prototipi/glasanje-ux/build_data.py
"""
import base64, json, pathlib, subprocess, tempfile

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = pathlib.Path(__file__).with_name("radovi-data.js")

radovi = json.loads((ROOT / "sources/radovi.json").read_text())
out = []
with tempfile.TemporaryDirectory() as tmp:
    for r in radovi:
        src = ROOT / f"web/public/radovi/{r['code']}-t.jpg"
        dst = pathlib.Path(tmp) / f"{r['code']}.jpg"
        subprocess.run(["sips", "-Z", "360", "-s", "format", "jpeg", "-s", "formatOptions", "62", str(src), "--out", str(dst)],
                       check=True, capture_output=True)
        out.append({"code": r["code"], "team": r["lead"], "countries": r["countries"], "award": r.get("award"),
                    "rank": r.get("rank"), "status": r.get("status"),
                    "img": "data:image/jpeg;base64," + base64.b64encode(dst.read_bytes()).decode()})

OUT.write_text("// 88 natječajnih radova (sources/radovi.json + web/public/radovi/*-t.jpg, smanjeno). "
               "Generirano za offline prototipe: prototipi/glasanje-ux/build_data.py\n"
               "window.RADOVI = " + json.dumps(out, ensure_ascii=False) + ";\n")
print(f"{len(out)} radova, {OUT.stat().st_size // 1024} KB → {OUT}")
