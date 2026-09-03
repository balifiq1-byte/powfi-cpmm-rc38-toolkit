import { web3, NodeProvider } from "@alephium/web3";
import { Powfi } from "@alephium/powfi-sdk";
import {
  discoverClmmPools,
  fetchRawClmmPoolState,
  clmmPriceFromSqrtPriceX96
} from "./lib/powfi-clmm-readonly.mjs";
import { resolveTokenById } from "./lib/powfi-readonly.mjs";

const NODE_URL = "https://node.testnet.alephium.org";
const ALPH_ID = "0".repeat(64);

web3.setCurrentNodeProvider(new NodeProvider(NODE_URL));
const powfi = await Powfi.load({ networkId: "testnet" });

const pools = await discoverClmmPools();
const listedTokens = await powfi.token.getTokens();
const tokenIds = new Set();

for (const pool of pools) {
  tokenIds.add(pool.token0Id);
  tokenIds.add(pool.token1Id);
}

const tokens = new Map();

for (const id of tokenIds) {
  if (id === ALPH_ID) {
    tokens.set(id, {
      id,
      symbol: "ALPH",
      name: "Alephium",
      decimals: 18
    });
    continue;
  }

  tokens.set(id, await resolveTokenById(powfi, id, listedTokens));
}

console.log("");
console.log("😈 POWFI CLMM RC38 / TESTNET");
console.log("--------------------------");
console.log("Mode: READ ONLY");
console.log("Network: Alephium Testnet");
console.log("");
console.log(`CLMM pools discovered: ${pools.length}`);
console.log("");

for (let i = 0; i < pools.length; i++) {
  const pool = pools[i];
  const state = await fetchRawClmmPoolState(pool);
  const token0 = tokens.get(state.token0Id);
  const token1 = tokens.get(state.token1Id);

  if (token0?.decimals === undefined || token1?.decimals === undefined) {
    throw new Error(`Missing token decimals for CLMM pool ${pool.address}`);
  }

  const price = clmmPriceFromSqrtPriceX96(
    state.sqrtPriceX96,
    token0.decimals,
    token1.decimals,
    18
  );

  console.log(`[${i + 1}] ${token0.symbol}/${token1.symbol}`);
  console.log(`    Address:      ${pool.address}`);
  console.log(`    Pool ID:      ${pool.id}`);
  console.log(`    Token0:       ${state.token0Id}`);
  console.log(`    Token1:       ${state.token1Id}`);
  console.log(`    Config:       ${state.configIndex}`);
  console.log(`    Fee:          ${state.fee}`);
  console.log(`    Tick spacing: ${state.tickSpacing}`);
  console.log(`    Tick:         ${state.tick}`);
  console.log(`    Liquidity:    ${state.liquidity}`);
  console.log(`    NFT index:    ${state.nextNftIndex}`);
  console.log(`    Interface:    ${state.interfaceId}`);
  console.log(`    Price:        1 ${token0.symbol} = ${price} ${token1.symbol}`);
  console.log("");
}

console.log("✓ CLMM pools read successfully");
console.log("✓ Token metadata resolved");
console.log("✓ Decimal-aware prices");
console.log("✓ No signer");
console.log("✓ No transaction");
