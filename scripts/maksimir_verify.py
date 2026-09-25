#!/usr/bin/env python3
"""Neovisna provjera glasanja javnosti (lanac hasheva + snapshotovi).

Ne vjeruje ni bazi ni ovoj stranici: iz objavljenog lanca ponovno izračuna
svaki hash, ponovno izbroji glasove i usporedi ih sa snapshotovima koji su
žigosani u Bitcoinu (glasanje/checkpoints/*.json + .ots).

    python3 scripts/maksimir_verify.py LANAC.json [SNAPSHOT.json ...]
    python3 scripts/maksimir_verify.py LANAC.json --receipt POTVRDA.json

LANAC.json   — izlaz RPC-a maksimir_log (lista redova), objavljen po zatvaranju
SNAPSHOT     — checkpoint datoteke; svaka mora odgovarati prefiksu lanca do head.seq
POTVRDA.json — potvrda koju je glasač preuzeo nakon predaje listića

Formula (ista kao u migraciji domovina-api 20260925120000_maksimir_voting.sql):
  hash = sha256(prev_hash|seq|pseudonym|revision|ts_ms|items_canon), hex, UTF-8
  genesis prev_hash = '0' * 64
Samo standardna biblioteka.
"""

import argparse
import hashlib
import json
import sys
from collections import defaultdict

GENESIS = "0" * 64


def row_hash(r: dict) -> str:
    msg = f"{r['prev_hash']}|{r['seq']}|{r['pseudonym']}|{r['revision']}|{r['ts_ms']}|{r['items_canon']}"
    return hashlib.sha256(msg.encode("utf-8")).hexdigest()


def parse_items(canon: str) -> dict[str, int]:
    if not canon:
        return {}
    return {code: int(pts) for code, pts in (p.split(":") for p in canon.split(","))}


def verify_chain(log: list[dict]) -> list[str]:
    errors = []
    prev = GENESIS
    for i, r in enumerate(log, start=1):
        if r["seq"] != i:
            errors.append(f"seq {r['seq']}: očekivan {i} (rupa ili preslagivanje)")
        if r["prev_hash"] != prev:
            errors.append(f"seq {r['seq']}: prev_hash ne odgovara hashu prethodnog reda")
        if row_hash(r) != r["hash"]:
            errors.append(f"seq {r['seq']}: hash ne odgovara sadržaju reda")
        items = parse_items(r["items_canon"])
        if r["revision"] == 0 and items:
            errors.append(f"seq {r['seq']}: povlačenje (revision 0) s bodovima")
        if r["revision"] > 0 and sum(items.values()) != 100:
            errors.append(f"seq {r['seq']}: zbroj bodova {sum(items.values())} ≠ 100")
        if list(items) != sorted(items):
            errors.append(f"seq {r['seq']}: items_canon nije sortiran")
        prev = r["hash"]
    return errors


def tally(log: list[dict], upto_seq: int) -> tuple[int, dict[str, int], dict[str, int]]:
    """Zadnja revizija po pseudonimu → (broj glasača, bodovi po radu, podupiratelji po radu)."""
    latest: dict[str, dict[str, int]] = {}
    for r in log:
        if r["seq"] > upto_seq:
            break
        items = parse_items(r["items_canon"])
        if items:
            latest[r["pseudonym"]] = items
        else:
            latest.pop(r["pseudonym"], None)
    points: dict[str, int] = defaultdict(int)
    backers: dict[str, int] = defaultdict(int)
    for items in latest.values():
        for code, pts in items.items():
            points[code] += pts
            backers[code] += 1
    return len(latest), points, backers


def verify_snapshot(log: list[dict], snap: dict) -> list[str]:
    errors = []
    head = snap["head"]
    seq = head["seq"]
    if seq > len(log):
        return [f"snapshot seq {seq} je iza kraja lanca ({len(log)})"]
    expected_hash = log[seq - 1]["hash"] if seq else GENESIS
    if head["hash"] != expected_hash:
        errors.append(f"snapshot seq {seq}: hash vrha ne odgovara lancu — povijest je prepisana")
    voters, points, backers = tally(log, seq)
    if snap["voters"] != voters:
        errors.append(f"snapshot seq {seq}: glasača {snap['voters']}, lanac daje {voters}")
    for row in snap["results"]:
        c = row["code"]
        if row["points"] != points.get(c, 0) or row["backers"] != backers.get(c, 0):
            errors.append(
                f"snapshot seq {seq}: {c} ima {row['points']} bodova/{row['backers']} podupiratelja, "
                f"lanac daje {points.get(c, 0)}/{backers.get(c, 0)}"
            )
    return errors


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("log")
    ap.add_argument("snapshots", nargs="*")
    ap.add_argument("--receipt", action="append", default=[])
    a = ap.parse_args()

    log = json.load(open(a.log, encoding="utf-8"))
    errors = verify_chain(log)
    print(f"lanac: {len(log)} redova, vrh {log[-1]['hash'] if log else GENESIS}")

    for path in a.snapshots:
        snap = json.load(open(path, encoding="utf-8"))
        e = verify_snapshot(log, snap)
        print(f"snapshot {path}: seq {snap['head']['seq']}, {snap['voters']} glasača — {'OK' if not e else 'PAD'}")
        errors += e

    by_hash = {r["hash"]: r for r in log}
    for path in a.receipt:
        rc = json.load(open(path, encoding="utf-8"))
        rc = rc.get("receipt", rc)
        r = by_hash.get(rc["hash"])
        ok = r is not None and all(r[k] == rc[k] for k in ("seq", "pseudonym", "revision", "items_canon"))
        print(f"potvrda {path}: seq {rc['seq']} — {'u lancu' if ok else 'NIJE u lancu'}")
        if not ok:
            errors.append(f"potvrda {path} nije u lancu")
        elif row_hash(rc) != rc["hash"]:
            errors.append(f"potvrda {path}: hash ne odgovara sadržaju potvrde")

    voters, points, _ = tally(log, len(log))
    top = sorted(points.items(), key=lambda kv: -kv[1])[:5]
    print(f"konačno: {voters} glasača; vodeći: " + ", ".join(f"{c} {p / voters:.2f} %" for c, p in top) if voters else "konačno: 0 glasača")

    for e in errors:
        print("PAD —", e, file=sys.stderr)
    print("SVE PROVJERE PROŠLE" if not errors else f"{len(errors)} GREŠAKA")
    return 0 if not errors else 1


if __name__ == "__main__":
    sys.exit(main())
