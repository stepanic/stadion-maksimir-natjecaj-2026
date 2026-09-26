#!/usr/bin/env python3
"""Svakosatni checkpoint glasanja javnosti: snapshot → OpenTimestamps → Bitcoin.

1. Pročita javni RPC domovina_ai.maksimir_snapshot() (vrh lanca hasheva +
   trenutni rezultati, iz istog snapshota baze).
2. Ako se vrh lanca listića ili vrh zapisnika ZK grupe (snapshot v2) promijenio
   od zadnjeg checkpointa (ili je zadnji stariji
   od 24 h — dnevni „otkucaj”), zapiše glasanje/checkpoints/<UTC>-seq<N>.json
   i žigoše ga (`ots stamp`). Otkucaj dokazuje da se stanje nije mijenjalo i
   drži repo aktivnim (GitHub gasi cron u javnom repou nakon 60 dana mirovanja).
3. Svim ranijim .ots datotekama koje još čekaju Bitcoin blok pokuša
   `ots upgrade` (nakon par sati dobiju trajnu Bitcoin atestaciju).
4. Osvježi glasanje/checkpoints/index.json koji čita web.

Snapshot v3 (glasanje na lancu, docs/blockchain/08-integracija-s-fazom-1.md): ako postoji
manifest ugovora koji se broji (zadano chain/deployments/gnosis/v1.json; MAKSIMIR_CHAIN_MANIFEST
ga mijenja), u snapshot se dodaje `chain`: blok (finalized), njegov hash, voters, registered i
results() ugovora iz tog bloka. Novi checkpoint nastaje i kad se promijeni zbroj na lancu.

Ne treba nikakva tajna: URL i anon ključ su javni (web/.env).
Pokreće ga .github/workflows/maksimir-checkpoint.yml svaki sat; lokalno:

    pip install opentimestamps-client
    python3 scripts/maksimir_checkpoint.py [--force]
"""

import argparse
import datetime as dt
import hashlib
import json
import os
import pathlib
import subprocess
import sys
import urllib.request

import maksimir_chain as mc

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path(os.environ.get("MAKSIMIR_CHECKPOINT_DIR") or ROOT / "glasanje" / "checkpoints")


def env() -> dict[str, str]:
    vals = {}
    for line in (ROOT / "web" / ".env").read_text().splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            k, v = line.split("=", 1)
            vals[k.strip()] = v.strip()
    # lokalni test: MAKSIMIR_SUPABASE_URL / MAKSIMIR_SUPABASE_ANON_KEY
    vals["VITE_SUPABASE_URL"] = os.environ.get("MAKSIMIR_SUPABASE_URL") or vals["VITE_SUPABASE_URL"]
    vals["VITE_SUPABASE_ANON_KEY"] = os.environ.get("MAKSIMIR_SUPABASE_ANON_KEY") or vals["VITE_SUPABASE_ANON_KEY"]
    return vals


def fetch_snapshot() -> dict:
    e = env()
    req = urllib.request.Request(
        f"{e['VITE_SUPABASE_URL']}/rest/v1/rpc/maksimir_snapshot",
        data=b"{}",
        headers={
            "apikey": e["VITE_SUPABASE_ANON_KEY"],
            "Authorization": f"Bearer {e['VITE_SUPABASE_ANON_KEY']}",
            "Content-Type": "application/json",
            "Content-Profile": "domovina_ai",
            # Cloudflare ispred api.domovina.ai odbija zadani "Python-urllib/x" (greška 1010).
            "User-Agent": "maksimir-checkpoint/1 (+https://github.com/stepanic/stadion-maksimir-natjecaj-2026)",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def chain_part() -> dict | None:
    path = os.environ.get("MAKSIMIR_CHAIN_MANIFEST") or str(ROOT / "chain" / "deployments" / "gnosis" / "v1.json")
    if not pathlib.Path(path).exists():
        return None
    m = mc.load_manifest(path)
    rpc = os.environ.get("MAKSIMIR_CHAIN_RPC") or {100: "https://rpc.gnosischain.com", 10200: "https://rpc.chiadochain.net"}[m["chainId"]]
    return mc.chain_snapshot(rpc, m)


def chain_digest(ch: dict | None) -> str | None:
    """Otisak zbroja na lancu (bez bloka): novi checkpoint samo kad se glasovi promijene."""
    if not ch:
        return None
    body = json.dumps({"voters": ch["voters"], "registered": ch["registered"], "results": ch["results"]}, sort_keys=True)
    return hashlib.sha256(body.encode()).hexdigest()


def pending(ots: pathlib.Path) -> bool:
    info = subprocess.run(["ots", "info", str(ots)], capture_output=True, text=True).stdout
    return "BitcoinBlockHeaderAttestation" not in info


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true", help="zapiši checkpoint i kad se vrh lanca nije promijenio")
    a = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)

    # 1–2. novi checkpoint
    snap = fetch_snapshot()
    # RPC lanca ne smije srušiti checkpoint faze 1 (nalaz F-21, docs/review/2026-09-26-neovisni-review-wiring.md)
    try:
        chain = chain_part()
    except Exception as e:  # noqa: BLE001
        print(f"UPOZORENJE: stanje lanca nije pročitano ({e}); snapshot bez `chain`", file=sys.stderr)
        chain = None
    if chain:
        snap["chain"] = chain
    index_path = OUT / "index.json"
    index = json.loads(index_path.read_text()) if index_path.exists() else []
    last_hash = index[-1]["hash"] if index else None
    last_zk = index[-1].get("zk_hash") if index else None
    last_chain = index[-1].get("chain_digest") if index else None
    zk = snap.get("zk") or {}
    stale = not index or dt.datetime.now(dt.timezone.utc) - dt.datetime.fromisoformat(index[-1]["at"]) > dt.timedelta(hours=24)
    changed_chain = chain is not None and chain_digest(chain) != last_chain
    if snap["head"]["hash"] != last_hash or zk.get("hash") != last_zk or changed_chain or stale or a.force:
        stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        name = f"{stamp}-seq{snap['head']['seq']}.json"
        path = OUT / name
        # Kanonski bajtovi: sortirani ključevi, UTF-8, \n na kraju — ots žigoše sha256 datoteke.
        path.write_text(json.dumps(snap, sort_keys=True, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        subprocess.run(["ots", "stamp", str(path)], check=True)
        index.append(
            {
                "file": name,
                "at": snap["at"],
                "seq": snap["head"]["seq"],
                "hash": snap["head"]["hash"],
                "voters": snap["voters"],
                "bitcoin": False,
                **({"zk_seq": zk["seq"], "zk_hash": zk["hash"], "zk_members": zk["members"]} if zk else {}),
                **(
                    {"chain_block": chain["block"], "chain_voters": chain["voters"], "chain_digest": chain_digest(chain)}
                    if chain
                    else {}
                ),
            }
        )
        print(f"novi checkpoint {name}: seq {snap['head']['seq']}, {snap['voters']} glasača")
    else:
        print(f"vrh lanca nepromijenjen (seq {snap['head']['seq']}, zk {zk.get('seq')}) — nema novog checkpointa")

    # 3. nadogradnja na Bitcoin atestaciju
    for item in index:
        if item["bitcoin"]:
            continue
        ots = OUT / (item["file"] + ".ots")
        subprocess.run(["ots", "upgrade", str(ots)], capture_output=True)
        if not pending(ots):
            item["bitcoin"] = True
            print(f"u Bitcoinu: {item['file']}")
        (OUT / (item["file"] + ".ots.bak")).unlink(missing_ok=True)

    # 4. indeks za web
    index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
