import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox-viem";
import { existsSync, readFileSync } from "node:fs";

const GNOSIS_RPC_URL = process.env.GNOSIS_RPC_URL ?? "https://rpc.gnosischain.com";
const CHIADO_RPC_URL = process.env.CHIADO_RPC_URL ?? "https://rpc.chiadochain.net";
// chain/.env.chiado (gitignorirano) drži testni ključ za Chiado; mainnet ključ samo iz okoline.
const chiadoEnv = existsSync(".env.chiado") ? readFileSync(".env.chiado", "utf8") : "";
const CHIADO_KEY = chiadoEnv.match(/^CHIADO_DEPLOYER_PRIVATE_KEY=(0x[0-9a-fA-F]{64})$/m)?.[1];
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const accounts = DEPLOYER_KEY ? [DEPLOYER_KEY] : [];

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: "cancun" },
  },
  networks: {
    // LOCAL_CHAIN_ID=100 → lokalni čvor se predstavlja kao Gnosis (za E2E relayera s viem/chains gnosis)
    hardhat: { chainId: Number(process.env.LOCAL_CHAIN_ID ?? 31337) },
    localhost: { url: process.env.LOCAL_RPC_URL ?? "http://127.0.0.1:8545" },
    gnosis: { url: GNOSIS_RPC_URL, chainId: 100, accounts },
    chiado: { url: CHIADO_RPC_URL, chainId: 10200, accounts: DEPLOYER_KEY ? accounts : CHIADO_KEY ? [CHIADO_KEY] : [] },
  },
  // Verifikacija izvora: Blockscout (bez ključa) za obje mreže; Gnosisscan uz ETHERSCAN_API_KEY.
  etherscan: {
    apiKey: { gnosis: process.env.ETHERSCAN_API_KEY ?? "blockscout", chiado: "blockscout" },
    customChains: [
      {
        network: "gnosis",
        chainId: 100,
        urls: process.env.ETHERSCAN_API_KEY
          ? { apiURL: "https://api.etherscan.io/v2/api?chainid=100", browserURL: "https://gnosisscan.io" }
          : { apiURL: "https://gnosis.blockscout.com/api", browserURL: "https://gnosis.blockscout.com" },
      },
      {
        network: "chiado",
        chainId: 10200,
        urls: { apiURL: "https://gnosis-chiado.blockscout.com/api", browserURL: "https://gnosis-chiado.blockscout.com" },
      },
    ],
  },
  sourcify: { enabled: true },
  mocha: { timeout: 120_000 },
};

export default config;
