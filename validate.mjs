import { web3, NodeProvider } from "@alephium/web3";
import { Powfi } from "@alephium/powfi-sdk";
import {
  discoverCpmmPairs,
  discoverCpmmTokens,
  validateCpmmPairs,
  fetchRawCpmmPoolState
} from "./lib/powfi-readonly.mjs";

const NODE_URL = "https://node.testnet.alephium.org";

web3.setCurrentNodeProvider(new NodeProvider(NODE_URL));
const powfi = await Powfi.load({ networkId: "testnet" });

const listedTokens = await powfi.token.getTokens();

const pairs = validateCpmmPairs(
  powfi,
  await discoverCpmmPairs()
);

const discoveredTokens = await discoverCpmmTokens(
  powfi,
  pairs,
  listedTokens
);

const tokens = new Map(
  discoveredTokens.map((token) => [
    token.id.toLowerCase(),
    token
  ])
);

console.log("POWFI CPMM VALIDATOR - TESTNET");
console.log();

let valid = 0;

for (const pair of pairs) {
  const token0 = tokens.get(pair.token0Id.toLowerCase());
  const token1 = tokens.get(pair.token1Id.toLowerCase());

  try {
    const state = await fetchRawCpmmPoolState(
      powfi,
      token0,
      token1,
      listedTokens
    );

    console.log(
      String(pair.number).padStart(2),
      token0.symbol.padEnd(10),
      token1.symbol.padEnd(10),
      state.poolId.slice(0, 12),
      "VALID"
    );

    valid++;
  } catch (error) {
    console.log(
      String(pair.number).padStart(2),
      token0?.symbol ?? "?",
      token1?.symbol ?? "?",
      "INVALID",
      error.message
    );
  }
}

console.log();
console.log(
  valid + "/" + pairs.length +
  " RC38 CPMM pools fully validated"
);
console.log("READ ONLY - NO SIGNER - NO TRANSACTION");

if (valid !== pairs.length) {
  process.exitCode = 1;
}
