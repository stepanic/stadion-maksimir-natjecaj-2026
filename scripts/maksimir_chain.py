"""Čitanje MaksimirGlasanjeV1 s lanca — samo standardna biblioteka Pythona.

Koriste ga scripts/maksimir_checkpoint.py (stanje lanca u satnom snapshotu) i
scripts/maksimir_verify.py --chain (neovisno ponovno zbrajanje iz događaja).

Standardna biblioteka nema keccak256 (hashlib.sha3_256 je drugačiji padding), pa je
ovdje mala implementacija Keccak-f[1600]; testovi: scripts/test_maksimir_chain.py.
"""

from __future__ import annotations

import json
import pathlib
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
UA = "maksimir-verify/1 (+https://github.com/stepanic/stadion-maksimir-natjecaj-2026)"

# ── keccak256 ─────────────────────────────────────────────────────────────────

_RC = [
    0x0000000000000001, 0x0000000000008082, 0x800000000000808A, 0x8000000080008000,
    0x000000000000808B, 0x0000000080000001, 0x8000000080008081, 0x8000000000008009,
    0x000000000000008A, 0x0000000000000088, 0x0000000080008009, 0x000000008000000A,
    0x000000008000808B, 0x800000000000008B, 0x8000000000008089, 0x8000000000008003,
    0x8000000000008002, 0x8000000000000080, 0x000000000000800A, 0x800000008000000A,
    0x8000000080008081, 0x8000000000008080, 0x0000000080000001, 0x8000000080008008,
]
_ROT = [[0, 36, 3, 41, 18], [1, 44, 10, 45, 2], [62, 6, 43, 15, 61], [28, 55, 25, 21, 56], [27, 20, 39, 8, 14]]
_M = (1 << 64) - 1


def _rol(v: int, n: int) -> int:
    return ((v << n) | (v >> (64 - n))) & _M if n else v


def _f(a: list[list[int]]) -> None:
    for rc in _RC:
        c = [a[x][0] ^ a[x][1] ^ a[x][2] ^ a[x][3] ^ a[x][4] for x in range(5)]
        d = [c[(x - 1) % 5] ^ _rol(c[(x + 1) % 5], 1) for x in range(5)]
        for x in range(5):
            for y in range(5):
                a[x][y] ^= d[x]
        b = [[0] * 5 for _ in range(5)]
        for x in range(5):
            for y in range(5):
                b[y][(2 * x + 3 * y) % 5] = _rol(a[x][y], _ROT[x][y])
        for x in range(5):
            for y in range(5):
                a[x][y] = b[x][y] ^ ((~b[(x + 1) % 5][y]) & b[(x + 2) % 5][y])
        a[0][0] ^= rc


def keccak256(data: bytes) -> bytes:
    rate = 136
    msg = bytearray(data) + b"\x01"
    msg += b"\x00" * (-len(msg) % rate)
    msg[-1] |= 0x80
    a = [[0] * 5 for _ in range(5)]
    for off in range(0, len(msg), rate):
        block = msg[off : off + rate]
        for i in range(rate // 8):
            a[i % 5][i // 5] ^= int.from_bytes(block[8 * i : 8 * i + 8], "little")
        _f(a)
    out = b"".join(a[i % 5][i // 5].to_bytes(8, "little") for i in range(4))
    return out


def selector(sig: str) -> str:
    return "0x" + keccak256(sig.encode()).hex()[:8]


def topic(sig: str) -> str:
    return "0x" + keccak256(sig.encode()).hex()


BALLOT_CAST = topic("BallotCast(uint256,uint32,bytes,uint256)")
MIGRATED = topic("Migrated(uint256,address,uint32)")

# ── JSON-RPC ──────────────────────────────────────────────────────────────────


class Rpc:
    def __init__(self, url: str):
        self.url = url
        self.n = 0

    def __call__(self, method: str, params: list):
        self.n += 1
        req = urllib.request.Request(
            self.url,
            data=json.dumps({"jsonrpc": "2.0", "id": self.n, "method": method, "params": params}).encode(),
            headers={"Content-Type": "application/json", "User-Agent": UA},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=60) as r:
            body = json.load(r)
        if "error" in body:
            raise RuntimeError(f"{method}: {body['error'].get('message')}")
        return body["result"]


def words(hexdata: str) -> list[int]:
    h = hexdata[2:] if hexdata.startswith("0x") else hexdata
    return [int(h[i : i + 64], 16) for i in range(0, len(h), 64)]


def decode_ballot_data(hexdata: str) -> tuple[int, bytes, int]:
    """BallotCast data = abi.encode(uint32 revision, bytes points, uint256 merkleTreeRoot)."""
    h = hexdata[2:]
    w = words(hexdata)
    revision, off, root = w[0], w[1], w[2]
    ln = int(h[off * 2 : off * 2 + 64], 16)
    start = off * 2 + 64
    return revision, bytes.fromhex(h[start : start + ln * 2]), root


def entries() -> list[str]:
    """88 šifri, redoslijed = indeks bajta u listiću (chain/client/entries.ts)."""
    src = (ROOT / "chain" / "client" / "entries.ts").read_text()
    codes = [c.strip().strip('"') for c in src[src.index("[") + 1 : src.index("]")].split(",") if c.strip()]
    return codes


def load_manifest(path: str) -> dict:
    return json.loads(pathlib.Path(path).read_text())


# ── stanje s lanca ─────────────────────────────────────────────────────────────


def block(rpc: Rpc, tag: str | int = "finalized") -> dict:
    b = rpc("eth_getBlockByNumber", [hex(tag) if isinstance(tag, int) else tag, False])
    return {"number": int(b["number"], 16), "hash": b["hash"]}


def read_state(rpc: Rpc, contract: str, at: int) -> dict:
    """voters, registered i results() na bloku `at` (sve iz istog bloka)."""
    tag = hex(at)
    call = lambda sig: rpc("eth_call", [{"to": contract, "data": selector(sig)}, tag])  # noqa: E731
    w = words(call("results()"))
    codes = entries()
    points, backers = w[:88], w[88:176]
    return {
        "voters": words(call("voters()"))[0],
        "registered": words(call("registered()"))[0],
        "results": [{"code": c, "points": points[i], "backers": backers[i]} for i, c in enumerate(codes)],
    }


def tally_events(rpc: Rpc, contract: str, from_block: int, to_block: int, step: int = 50_000) -> dict:
    """Ponovno zbrajanje iz događaja: zadnji listić po nullifieru, bez preseljenih (Migrated)."""
    latest: dict[int, bytes] = {}
    migrated: set[int] = set()
    events = 0
    for lo in range(from_block, to_block + 1, step):
        hi = min(lo + step - 1, to_block)
        logs = rpc("eth_getLogs", [{"address": contract, "fromBlock": hex(lo), "toBlock": hex(hi), "topics": [[BALLOT_CAST, MIGRATED]]}])
        logs.sort(key=lambda l: (int(l["blockNumber"], 16), int(l["logIndex"], 16)))
        for l in logs:
            n = int(l["topics"][1], 16)
            events += 1
            if l["topics"][0] == BALLOT_CAST:
                _, pts, _ = decode_ballot_data(l["data"])
                latest[n] = pts
            else:
                migrated.add(n)
                latest.pop(n, None)
    codes = entries()
    points = [0] * 88
    backers = [0] * 88
    voters = 0
    for pts in latest.values():
        if not pts:
            continue
        voters += 1
        for i, p in enumerate(pts):
            if p:
                points[i] += p
                backers[i] += 1
    return {
        "voters": voters,
        "events": events,
        "migrated": len(migrated),
        "results": [{"code": c, "points": points[i], "backers": backers[i]} for i, c in enumerate(codes)],
    }


def not_final_yet(b: dict, manifest: dict) -> bool:
    """Finalized blok kasni nekoliko minuta; odmah nakon deploya ugovor na njemu još ne postoji."""
    return b["number"] < int(manifest["block"])


def chain_snapshot(rpc_url: str, manifest: dict, tag: str | int = "finalized") -> dict | None:
    """Stanje ugovora na finalized bloku, ili None dok deploy još nije finaliziran."""
    rpc = Rpc(rpc_url)
    chain_id = int(rpc("eth_chainId", []), 16)
    if chain_id != manifest["chainId"]:
        raise RuntimeError(f"RPC je na lancu {chain_id}, manifest traži {manifest['chainId']}")
    b = block(rpc, tag)
    if not_final_yet(b, manifest):
        return None
    return {
        "chainId": chain_id,
        "contract": manifest["address"],
        "block": b["number"],
        "blockHash": b["hash"],
        **read_state(rpc, manifest["address"], b["number"]),
    }
