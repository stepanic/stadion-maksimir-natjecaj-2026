// Dio ABI-ja MaksimirGlasanjeV1 koji relayer koristi.
// Izvor istine: chain/contracts/v1/MaksimirGlasanjeV1.sol.
import { parseAbi } from "viem";

export const V1_ABI = parseAbi([
  "struct SemaphoreProof { uint256 merkleTreeDepth; uint256 merkleTreeRoot; uint256 nullifier; uint256 message; uint256 scope; uint256[8] points; }",
  "function VERSION() view returns (string)",
  "function voters() view returns (uint256)",
  "function registered() view returns (uint256)",
  "function closesAt() view returns (uint256)",
  "function register(uint256 commitment, uint256 deadline, bytes signature)",
  "function cast(uint32 revision, bytes points, SemaphoreProof proof)",
  "function share(SemaphoreProof proof)",
  "error VotingClosed()",
  "error SignatureExpired()",
  "error NotRegistrar(address signer)",
  "error WrongScope()",
  "error WrongMessage()",
  "error InvalidProof()",
  "error BadRevision(uint32 expected, uint32 got)",
  "error BadBallotLength(uint256 length)",
  "error BadPointsSum(uint256 sum)",
  "error AlreadyMigrated()",
  "error Semaphore__GroupHasNoMembers()",
  "error Semaphore__MerkleTreeDepthIsNotSupported()",
  "error Semaphore__MerkleTreeRootIsExpired()",
  "error Semaphore__MerkleTreeRootIsNotPartOfTheGroup()",
  "error Semaphore__YouAreUsingTheSameNullifierTwice()",
  "error Semaphore__InvalidProof()",
  "error LeafAlreadyExists()",
]);
