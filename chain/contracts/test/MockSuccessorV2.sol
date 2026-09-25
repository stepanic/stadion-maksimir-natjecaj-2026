// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ISemaphore} from "@semaphore-protocol/contracts/interfaces/ISemaphore.sol";
import {MaksimirGlasanjeV1} from "../v1/MaksimirGlasanjeV1.sol";

/// Samo za testove: najmanja moguća „V2” koja seli (ili zaključava) nullifier iz V1 uz
/// glasačev dokaz. Prava V2 imala bi i vlastiti `cast`, koji prima SAMO nullifier
/// zaključan u V1 (`v1.ballotOf(n).migrated`).
contract MockSuccessorV2 {
    MaksimirGlasanjeV1 public immutable v1;
    ISemaphore public immutable semaphore;
    uint256 public immutable groupId;

    mapping(uint256 => uint32) public revisionOf;
    mapping(uint256 => bytes) public pointsOf;

    constructor(MaksimirGlasanjeV1 _v1) {
        v1 = _v1;
        semaphore = _v1.semaphore();
        groupId = _v1.groupId();
    }

    function migrate(ISemaphore.SemaphoreProof calldata proof) external {
        (uint32 revision, bytes memory points) = v1.migrate(proof);
        revisionOf[proof.nullifier] = revision;
        pointsOf[proof.nullifier] = points;
    }
}
