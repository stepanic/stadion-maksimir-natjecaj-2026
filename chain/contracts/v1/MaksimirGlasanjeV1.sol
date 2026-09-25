// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Ownable, Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {ISemaphore} from "@semaphore-protocol/contracts/interfaces/ISemaphore.sol";

/// @title  MaksimirGlasanjeV1 — glasanje javnosti o natječaju za stadion Maksimir
/// @notice Glasač ima potpunu kontrolu nad svojim listićem:
///
///         - Listić vrijedi samo uz **Semaphore ZK dokaz** koji izrađuje glasačev preglednik
///           tajnim ključem koji nikad ne napušta taj preglednik. Poruka dokaza je hash cijelog
///           listića i broja revizije, pa nitko (ni relayer ni operater) ne može promijeniti
///           bodove, poslati stari listić umjesto novog ni glasati umjesto glasača.
///         - Listić je vezan uz **nullifier**, a ne uz osobu ili adresu. Nullifier je isti za
///           isti ključ (pa se listić može mijenjati), ali iz njega se ne vidi čiji je, pa ni
///           operater koji je potvrdio pravo glasa ne zna kako je tko glasao.
///         - Transakciju smije poslati **bilo tko**: naš relayer (plaća gas), drugi relayer ili
///           glasač sam iz svog novčanika. Relayer može samo odbiti poslati; tada se isti dokaz
///           šalje drugim putem.
///         - Zbroj se računa **na lancu**, uživo, iz samih listića.
///
///         Jedino mjesto povjerenja je **pravo glasa**: `registrar` (domovina.ai, nakon prijave
///         eOsobnom) potpisuje da commitment pripada potvrđenoj osobi. Registrar ne može
///         glasati umjesto nikoga, ne vidi listiće i ne može ih mijenjati.
///
/// @dev    Ugovor se NE nadograđuje (nema proxyja ni pauze). Nova verzija je novi ugovor
///         (V2, V3 …); glasač svoj listić u nju seli sam, ZK dokazom (`migrate`). Izvor ove
///         verzije je zamrznut: chain/contracts/v1/ + chain/deployments/<mreža>/v1.json.
contract MaksimirGlasanjeV1 is Ownable2Step, EIP712 {
    // ── konstante ──────────────────────────────────────────────────────────────────────

    string public constant VERSION = "1";
    uint256 public constant ENTRY_COUNT = 88;
    uint256 public constant POINTS_PER_BALLOT = 100;

    /// Scope listića: jedan nullifier po glasaču za sve verzije ugovora.
    uint256 public constant BALLOT_SCOPE = uint256(bytes32("maksimir-2026-listic"));
    /// Anonimna objava „glasao sam” — iste vrijednosti kao u fazi 1 (web/src/zk.ts).
    uint256 public constant SHARE_MESSAGE = uint256(bytes32("glasao-sam"));
    uint256 public constant SHARE_SCOPE = uint256(bytes32("maksimir-2026"));

    bytes32 public constant REGISTER_TYPEHASH = keccak256("Register(uint256 commitment,uint256 deadline)");
    bytes32 private constant BALLOT_TAG = keccak256("maksimir-listic");
    bytes32 private constant MIGRATE_TAG = keccak256("maksimir-migrate");

    // ── nepromjenjivo ──────────────────────────────────────────────────────────────────

    ISemaphore public immutable semaphore;
    uint256 public immutable groupId;
    /// Nakon ovog trenutka (unix s) nema novih listića ni registracija.
    uint256 public immutable closesAt;
    /// keccak256(utf8("ŠIFRA1,ŠIFRA2,…")) — 88 šifri sortiranih bytewise; indeks bajta
    /// u listiću = indeks šifre u tom popisu (chain/client/entries.json).
    bytes32 public immutable entriesHash;

    // ── stanje ─────────────────────────────────────────────────────────────────────────

    address public registrar;
    /// Sljedeća verzija; postavlja se jednom. Samo ona smije zvati `migrate`.
    address public successor;

    struct Ballot {
        uint32 revision; // 0 = nikad predan
        bool migrated; // preseljen u `successor`, ovdje više ne vrijedi
        bytes points; // 88 bajtova (bodovi po radu) ili prazno = povučen
    }

    struct Tally {
        uint128 points;
        uint128 backers;
    }

    mapping(uint256 nullifier => Ballot) private _ballots;
    Tally[88] private _tally;
    /// Broj nullifiera s nepraznim listićem.
    uint256 public voters;
    uint256 public registered;

    // ── događaji ───────────────────────────────────────────────────────────────────────

    event RegistrarChanged(address indexed previous, address indexed current);
    event Registered(uint256 indexed commitment);
    event BallotCast(uint256 indexed nullifier, uint32 revision, bytes points, uint256 merkleTreeRoot);
    event AnonymousShare(uint256 indexed nullifier, uint256 indexed merkleTreeRoot, address submitter);
    event SuccessorSet(address indexed successor);
    event Migrated(uint256 indexed nullifier, address indexed successor, uint32 revision);

    // ── greške ─────────────────────────────────────────────────────────────────────────

    error ZeroAddress();
    error VotingClosed();
    error SignatureExpired();
    error NotRegistrar(address signer);
    error WrongScope();
    error WrongMessage();
    error InvalidProof();
    error BadRevision(uint32 expected, uint32 got);
    error BadBallotLength(uint256 length);
    error BadPointsSum(uint256 sum);
    error AlreadyMigrated();
    error SuccessorAlreadySet();
    error NotSuccessor();
    error UseSuccessor(address successor);

    constructor(
        ISemaphore _semaphore,
        address _owner,
        address _registrar,
        uint256 _closesAt,
        bytes32 _entriesHash,
        uint256 merkleTreeDuration
    ) Ownable(_owner) EIP712("MaksimirGlasanje", VERSION) {
        if (address(_semaphore) == address(0) || _registrar == address(0)) revert ZeroAddress();
        semaphore = _semaphore;
        closesAt = _closesAt;
        entriesHash = _entriesHash;
        registrar = _registrar;
        groupId = _semaphore.createGroup(address(this), merkleTreeDuration);
        emit RegistrarChanged(address(0), _registrar);
    }

    modifier open() {
        if (block.timestamp > closesAt) revert VotingClosed();
        _;
    }

    // ── 1. pravo glasa ─────────────────────────────────────────────────────────────────

    /// Upis commitmenta u grupu glasača. `signature` je registrarov EIP-712 potpis
    /// `Register(commitment, deadline)`, izdan nakon prijave eOsobnom. Poziva bilo tko.
    /// Isti commitment drugi put odbija Semaphore (`LeafAlreadyExists`).
    function register(uint256 commitment, uint256 deadline, bytes calldata signature) external open {
        if (block.timestamp > deadline) revert SignatureExpired();
        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(REGISTER_TYPEHASH, commitment, deadline)));
        address signer = ECDSA.recover(digest, signature);
        if (signer != registrar) revert NotRegistrar(signer);
        registered += 1;
        emit Registered(commitment);
        // Semaphore (immutable, kanonski) odbija već upisan commitment; tada se sve poništava.
        semaphore.addMember(groupId, commitment);
    }

    // ── 2. listić ──────────────────────────────────────────────────────────────────────

    /// Poruka koju glasačev dokaz mora potpisati za ovaj listić. Veže i lanac i adresu ovog
    /// ugovora, pa se dokaz ne može ponoviti na drugoj mreži ni u drugoj verziji.
    function ballotMessage(uint32 revision, bytes calldata points) public view returns (uint256) {
        return uint256(keccak256(abi.encode(BALLOT_TAG, block.chainid, address(this), revision, keccak256(points))));
    }

    /// Predaj, izmijeni ili povuci (prazan `points`) listić. `revision` mora biti za jedan
    /// veći od zadnjeg predanog za isti nullifier, pa se stari listić ne može podmetnuti.
    function cast(uint32 revision, bytes calldata points, ISemaphore.SemaphoreProof calldata proof) external open {
        if (proof.scope != BALLOT_SCOPE) revert WrongScope();
        if (proof.message != ballotMessage(revision, points)) revert WrongMessage();
        if (!semaphore.verifyProof(groupId, proof)) revert InvalidProof();

        Ballot storage b = _ballots[proof.nullifier];
        if (b.migrated) revert AlreadyMigrated();
        // Nakon najave V2 ovdje se samo mijenjaju postojeći listići; prvi listić ide u V2.
        // Tako svaki nullifier živi u točno jednoj verziji (V2 odbija nullifier koji ovdje
        // ima listić, a nije preseljen).
        if (b.revision == 0 && successor != address(0)) revert UseSuccessor(successor);
        if (revision != b.revision + 1) revert BadRevision(b.revision + 1, revision);
        _validate(points);

        _apply(b.points, false);
        _apply(points, true);
        if (b.points.length == 0 && points.length != 0) voters += 1;
        if (b.points.length != 0 && points.length == 0) voters -= 1;

        b.revision = revision;
        b.points = points;
        emit BallotCast(proof.nullifier, revision, points, proof.merkleTreeRoot);
    }

    function _validate(bytes calldata points) private pure {
        if (points.length == 0) return;
        if (points.length != ENTRY_COUNT) revert BadBallotLength(points.length);
        uint256 sum = 0;
        for (uint256 i = 0; i < ENTRY_COUNT; i++) sum += uint8(points[i]);
        if (sum != POINTS_PER_BALLOT) revert BadPointsSum(sum);
    }

    function _apply(bytes memory points, bool add) private {
        for (uint256 i = 0; i < points.length; i++) {
            uint8 p = uint8(points[i]);
            if (p == 0) continue;
            Tally storage t = _tally[i];
            if (add) {
                t.points += p;
                t.backers += 1;
            } else {
                t.points -= p;
                t.backers -= 1;
            }
        }
    }

    // ── 3. anonimna objava „glasao sam” ────────────────────────────────────────────────

    /// Dokaz članstva s porukom "glasao-sam". Semaphore trajno bilježi nullifier (drugi
    /// scope nego listić, pa se objava ne može povezati s listićem).
    function share(ISemaphore.SemaphoreProof calldata proof) external {
        if (proof.scope != SHARE_SCOPE) revert WrongScope();
        if (proof.message != SHARE_MESSAGE) revert WrongMessage();
        semaphore.validateProof(groupId, proof);
        emit AnonymousShare(proof.nullifier, proof.merkleTreeRoot, msg.sender);
    }

    // ── 4. prijelaz na sljedeću verziju (samo uz glasačev dokaz) ───────────────────────

    /// Vlasnik jednom najavi sljedeću verziju i preda joj admina grupe (nove registracije
    /// idu tamo). Ovo NE seli ničiji listić: to radi svaki glasač sam, preko `migrate`.
    function setSuccessor(address next) external onlyOwner {
        if (next == address(0)) revert ZeroAddress();
        if (successor != address(0)) revert SuccessorAlreadySet();
        successor = next;
        semaphore.updateGroupAdmin(groupId, next);
        emit SuccessorSet(next);
    }

    function migrateMessage() public view returns (uint256) {
        return uint256(keccak256(abi.encode(MIGRATE_TAG, block.chainid, address(this), successor)));
    }

    /// Zove je samo `successor`, s glasačevim dokazom (poruka = `migrateMessage()`).
    /// Listić se ovdje poništava i vraća sljedećoj verziji, koja ga upisuje pod istim
    /// nullifierom. Nakon toga glasač ovdje više ne može glasati.
    function migrate(ISemaphore.SemaphoreProof calldata proof) external returns (uint32 revision, bytes memory points) {
        // successor = 0 dok V2 nije najavljen, a msg.sender nikad nije 0, pa je to pokriveno.
        if (msg.sender != successor) revert NotSuccessor();
        if (proof.scope != BALLOT_SCOPE) revert WrongScope();
        if (proof.message != migrateMessage()) revert WrongMessage();
        if (!semaphore.verifyProof(groupId, proof)) revert InvalidProof();

        Ballot storage b = _ballots[proof.nullifier];
        if (b.migrated) revert AlreadyMigrated();
        revision = b.revision;
        points = b.points;
        _apply(points, false);
        if (points.length != 0) voters -= 1;
        b.migrated = true;
        delete b.points;
        emit Migrated(proof.nullifier, successor, revision);
    }

    // ── uprava ─────────────────────────────────────────────────────────────────────────

    /// Novi registrar (npr. ukraden ključ). Ne dira nijedan listić ni upisanog člana.
    function setRegistrar(address next) external onlyOwner {
        if (next == address(0)) revert ZeroAddress();
        emit RegistrarChanged(registrar, next);
        registrar = next;
    }

    function setMerkleTreeDuration(uint256 duration) external onlyOwner {
        semaphore.updateGroupMerkleTreeDuration(groupId, duration);
    }

    // ── čitanje ────────────────────────────────────────────────────────────────────────

    function ballotOf(uint256 nullifier) external view returns (uint32 revision, bool migrated, bytes memory points) {
        Ballot storage b = _ballots[nullifier];
        return (b.revision, b.migrated, b.points);
    }

    /// Bodovi i broj podupiratelja po radu, istim redom kao `entries.json`.
    function results() external view returns (uint256[88] memory points, uint256[88] memory backers) {
        for (uint256 i = 0; i < ENTRY_COUNT; i++) {
            points[i] = _tally[i].points;
            backers[i] = _tally[i].backers;
        }
    }

    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
}
