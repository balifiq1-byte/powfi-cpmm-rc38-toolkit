import { web3, NodeProvider } from "@alephium/web3";
import { Powfi } from "@alephium/powfi-sdk";
import {
  discoverCpmmPairs,
  discoverCpmmTokens
} from "./lib/powfi-readonly.mjs";

const NODE_URL = "https://node.testnet.alephium.org";

web3.setCurrentNodeProvider(new NodeProvider(NODE_URL));
const powfi = await Powfi.load({ networkId: "testnet" });

const pairs = await discoverCpmmPairs();
const discoveredTokens = await discoverCpmmTokens(powfi, pairs);
const tokens = new Map(discoveredTokens.map((token) => [token.id, token]));

console.log("POWFI CPMM POOLS - TESTNET");
console.log();

for (const pair of pairs) {
  console.log(
    String(pair.number).padStart(2),
    tokens.get(pair.token0Id).symbol.padEnd(10),
    tokens.get(pair.token1Id).symbol.padEnd(10),
    pair.pairId.slice(0, 12)
  );
}

console.log();
console.log(pairs.length + " CPMM pools discovered");
console.log("READ ONLY - NO SIGNER - NO TRANSACTION");
