export type Env = {
  RELAY_KV: KVNamespace;
  /** EOA koji plaća gas. NEMA nikakvu ulogu u ugovoru. */
  SPONSOR_PRIVATE_KEY?: string;
  /** "100" (Gnosis, zadano) ili "10200" (Chiado). */
  CHAIN_ID?: string;
  GNOSIS_RPC_URL?: string;
  CONTRACT_ADDRESS?: string;
  ALLOWED_ORIGINS?: string;
  /** Gornja granica maxFeePerGas u gwei (zadano 5; tipično je Gnosis na ~0,00000001 gwei). */
  MAX_FEE_GWEI?: string;
  IP_DAILY_LIMIT?: string;
  GLOBAL_DAILY_LIMIT?: string;
};
