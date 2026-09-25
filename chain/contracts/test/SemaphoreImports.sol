// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

// Samo za lokalne testove: kanonski Semaphore v4 (isti izvor kao ugovor na Gnosisu
// 0x8A1fd199516489B0Fb7153EB5f075cDAC83c693D) + verifier + PoseidonT3.
import {Semaphore} from "@semaphore-protocol/contracts/Semaphore.sol";
import {SemaphoreVerifier} from "@semaphore-protocol/contracts/base/SemaphoreVerifier.sol";
import {PoseidonT3} from "poseidon-solidity/PoseidonT3.sol";
