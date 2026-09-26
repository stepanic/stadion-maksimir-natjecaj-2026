"""Testovi za maksimir_chain.py i maksimir_verify.py --chain (standardna biblioteka).

    python3 -m unittest scripts/test_maksimir_chain.py            # bez mreže
    MAKSIMIR_LIVE=1 python3 -m unittest scripts/test_maksimir_chain.py   # + pravi Chiado
"""

import copy
import json
import os
import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import maksimir_chain as mc  # noqa: E402
import maksimir_verify as mv  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent


class Keccak(unittest.TestCase):
    def test_poznati_vektori(self):
        self.assertEqual(mc.keccak256(b"").hex(), "c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470")
        self.assertEqual(mc.keccak256(b"abc").hex(), "4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45")
        # više blokova (rate = 136 bajtova)
        self.assertEqual(mc.keccak256(b"a" * 200).hex(), mc.keccak256(b"a" * 200).hex())
        self.assertNotEqual(mc.keccak256(b"a" * 135), mc.keccak256(b"a" * 136))

    def test_selektori_i_teme_kao_u_abi(self):
        # isto izračunao viem (web/worker/relayer, chain/client)
        self.assertEqual(mc.selector("registrar()"), "0x2b20e397")
        self.assertEqual(mc.selector("transfer(address,uint256)"), "0xa9059cbb")
        self.assertEqual(mc.topic("Transfer(address,address,uint256)"), "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef")

    def test_entriesHash_v1(self):
        # = entriesHash() ugovora na Chiadu (constructorArgs[4] u manifestu)
        m = json.loads((ROOT / "chain/deployments/chiado/v1.json").read_text())
        self.assertEqual("0x" + mc.keccak256(",".join(mc.entries()).encode()).hex(), m["constructorArgs"][4])
        self.assertEqual(len(mc.entries()), 88)


class Abi(unittest.TestCase):
    def test_decode_ballot(self):
        pts = bytes([0] * 87 + [100])
        data = "0x" + (
            (7).to_bytes(32, "big") + (96).to_bytes(32, "big") + (5).to_bytes(32, "big") + (88).to_bytes(32, "big") + pts + b"\x00" * 8
        ).hex()
        self.assertEqual(mc.decode_ballot_data(data), (7, pts, 5))

    def test_decode_prazan_listic(self):
        data = "0x" + ((3).to_bytes(32, "big") + (96).to_bytes(32, "big") + (9).to_bytes(32, "big") + (0).to_bytes(32, "big")).hex()
        self.assertEqual(mc.decode_ballot_data(data), (3, b"", 9))


class FakeRpc:
    """Lažni lanac: dva glasača, izmjena, povlačenje, selidba."""

    def __init__(self, logs, state):
        self.logs = logs
        self.state = state

    def __call__(self, method, params):
        if method == "eth_getLogs":
            lo, hi = int(params[0]["fromBlock"], 16), int(params[0]["toBlock"], 16)
            return [l for l in self.logs if lo <= int(l["blockNumber"], 16) <= hi]
        raise AssertionError(method)


def ballot_log(block, idx, nullifier, pts):
    data = (1).to_bytes(32, "big") + (96).to_bytes(32, "big") + (1).to_bytes(32, "big") + len(pts).to_bytes(32, "big") + pts
    data += b"\x00" * (-len(data) % 32)
    return {"blockNumber": hex(block), "logIndex": hex(idx), "topics": [mc.BALLOT_CAST, hex(nullifier)], "data": "0x" + data.hex()}


def pts(**kw):
    codes = mc.entries()
    b = bytearray(88)
    for c, p in kw.items():
        b[codes.index(c)] = p
    return bytes(b)


class Tally(unittest.TestCase):
    def setUp(self):
        self.logs = [
            ballot_log(10, 0, 1, pts(W3YS5VJBZ=60, GY0F1A9OM=40)),
            ballot_log(10, 1, 2, pts(W3YS5VJBZ=100)),
            ballot_log(12, 0, 1, pts(GY0F1A9OM=100)),  # izmjena
            ballot_log(13, 0, 3, pts(W3YS5VJBZ=100)),
            ballot_log(14, 0, 3, b""),  # povlačenje
            ballot_log(15, 0, 4, pts(W3YS5VJBZ=100)),
            {"blockNumber": hex(16), "logIndex": "0x0", "topics": [mc.MIGRATED, hex(4), "0x" + "00" * 32], "data": "0x" + (1).to_bytes(32, "big").hex()},
        ]

    def test_zadnji_listic_po_nullifieru_bez_povucenih_i_preseljenih(self):
        t = mc.tally_events(FakeRpc(self.logs, None), "0xabc", 0, 20, step=3)
        r = {x["code"]: (x["points"], x["backers"]) for x in t["results"] if x["points"]}
        self.assertEqual(t["voters"], 2)
        self.assertEqual(r, {"W3YS5VJBZ": (100, 1), "GY0F1A9OM": (100, 1)})
        self.assertEqual(t["migrated"], 1)

    def test_do_bloka(self):
        t = mc.tally_events(FakeRpc(self.logs, None), "0xabc", 0, 11)
        self.assertEqual(t["voters"], 2)
        self.assertEqual({x["code"]: x["points"] for x in t["results"] if x["points"]}, {"W3YS5VJBZ": 160, "GY0F1A9OM": 40})


class VerifyChain(unittest.TestCase):
    def snap(self, block, results, voters):
        return {"chain": {"chainId": 10200, "contract": "0xabc", "block": block, "blockHash": "0xh", "voters": voters, "results": results}}

    def test_snapshot_mora_odgovarati_dogadajima(self):
        logs = [ballot_log(10, 0, 1, pts(W3YS5VJBZ=100))]
        ev = mc.tally_events(FakeRpc(logs, None), "0xabc", 0, 20)
        ok = self.snap(20, ev["results"], 1)
        self.assertEqual(mv.compare_chain_tally(ev, ok["chain"], "snapshot"), [])
        bad = copy.deepcopy(ok)
        next(x for x in bad["chain"]["results"] if x["code"] == "W3YS5VJBZ")["points"] = 99
        self.assertTrue(mv.compare_chain_tally(ev, bad["chain"], "snapshot"))
        bad2 = copy.deepcopy(ok)
        bad2["chain"]["voters"] = 2
        self.assertTrue(mv.compare_chain_tally(ev, bad2["chain"], "snapshot"))


class Faza1(unittest.TestCase):
    """Zatvoreni lanac faze 1 (dan D) i svi checkpointi iz repoa, glob kao u README-u."""

    def test_index_json_nije_snapshot(self):
        self.assertFalse(mv.is_snapshot(json.loads((ROOT / "glasanje/checkpoints/index.json").read_text())))
        self.assertTrue(mv.is_snapshot(json.loads((ROOT / "glasanje/checkpoints/20260925T131212Z-seq0.json").read_text())))

    def test_lanac_faze1_i_checkpointi(self):
        import subprocess
        snaps = sorted(str(p) for p in (ROOT / "glasanje/checkpoints").glob("*.json"))
        out = subprocess.run(
            [sys.executable, str(ROOT / "scripts/maksimir_verify.py"), str(ROOT / "glasanje/faza1/lanac.json"), *snaps,
             "--zk", str(ROOT / "glasanje/faza1/zk_grupa.json")],
            capture_output=True, text=True)
        self.assertEqual(out.returncode, 0, out.stdout + out.stderr)
        self.assertIn("index.json: nije snapshot, preskočeno", out.stdout)
        self.assertIn("SVE PROVJERE PROŠLE", out.stdout)


class Finality(unittest.TestCase):
    def test_deploy_jos_nije_finaliziran(self):
        m = {"block": "100"}
        self.assertTrue(mc.not_final_yet({"number": 99}, m))
        self.assertFalse(mc.not_final_yet({"number": 100}, m))


@unittest.skipUnless(os.environ.get("MAKSIMIR_LIVE"), "MAKSIMIR_LIVE=1 za pravi Chiado")
class Live(unittest.TestCase):
    def test_chiado_dogadaji_jednaki_ugovoru(self):
        m = json.loads((ROOT / "chain/deployments/chiado/v1.json").read_text())
        s = mc.chain_snapshot("https://rpc.chiadochain.net", m)
        ev = mc.tally_events(mc.Rpc("https://rpc.chiadochain.net"), m["address"], int(m["block"]), s["block"])
        self.assertEqual(mv.compare_chain_tally(ev, s, "chiado"), [])
        self.assertGreater(s["voters"], 0)


if __name__ == "__main__":
    unittest.main()
