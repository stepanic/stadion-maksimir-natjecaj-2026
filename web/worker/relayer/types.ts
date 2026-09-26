/** Najmanji dio Workers KV-a koji relayer treba (dnevne kvote). */
export type KV = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
};

/** Konfiguracija jednog relayera (jedna mreža, jedan ugovor). Gradi je route.ts iz env Workera. */
export type Env = {
  RELAY_KV: KV;
  /** EOA koji plaća gas. NEMA nikakvu ulogu u ugovoru. */
  SPONSOR_PRIVATE_KEY?: string;
  /** "100" (Gnosis, zadano), "10200" (Chiado) ili "31337" (lokalni Hardhat). */
  CHAIN_ID?: string;
  GNOSIS_RPC_URL?: string;
  CONTRACT_ADDRESS?: string;
  /** Gornja granica maxFeePerGas u gwei (zadano 5; tipično je Gnosis na ~0,00000001 gwei). */
  MAX_FEE_GWEI?: string;
  /** Najmanja napojnica validatoru u wei (zadano 0,01 gwei; v. relay.ts withTip). */
  PRIORITY_FEE_WEI?: string;
  IP_DAILY_LIMIT?: string;
  GLOBAL_DAILY_LIMIT?: string;
};
