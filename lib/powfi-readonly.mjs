import { addressFromContractId, web3 } from "@alephium/web3";
import { sortTokens } from "@alephium/powfi-sdk";

export const RC38_TESTNET_FACTORY =
  "29hdd9b9Gp7oXuamwHKfUqBaRXP487HoeTcutS3RhZJEj";

export async function resolveTokenById(powfi, id) {
  const value = String(id).trim();
  const tokens = await powfi.token.getTokens();

  const listed = tokens.find(
    (token) => token.id.toLowerCase() === value.toLowerCase()
  );

  if (listed) return listed;

  try {
    const provider = web3.getCurrentNodeProvider();
    const metadata = await provider.fetchFungibleTokenMetaData(value);

    return {
      id: value,
      symbol: metadata.symbol,
      name: metadata.name,
      decimals: metadata.decimals
    };
  } catch {
    return {
      id: value,
      symbol: value.slice(0, 12),
      name: "Unknown token",
      decimals: undefined
    };
  }
}

export async function discoverCpmmTokens(powfi) {
  const provider = web3.getCurrentNodeProvider();
  const events = [];
  let start = 0;

  while (true) {
    const page = await provider.events.getEventsContractContractaddress(
      RC38_TESTNET_FACTORY,
      { start, limit: 100 }
    );

    events.push(...page.events);

    if (page.nextStart <= start || page.events.length === 0) {
      break;
    }

    start = page.nextStart;
  }

  const tokenIds = new Set();

  for (const event of events) {
    if (event.eventIndex !== 0 || event.fields?.length !== 4) {
      continue;
    }

    const [token0, token1, pair, currentPairSize] = event.fields;

    if (
      token0.type !== "ByteVec" ||
      token1.type !== "ByteVec" ||
      pair.type !== "ByteVec" ||
      currentPairSize.type !== "U256"
    ) {
      continue;
    }

    tokenIds.add(token0.value);
    tokenIds.add(token1.value);
  }

  const tokens = [];

  for (const id of tokenIds) {
    tokens.push(await resolveTokenById(powfi, id));
  }

  return tokens;
}

export async function resolveToken(powfi, input) {
  const value = String(input).trim();
  const normalized = value.toLowerCase();

  const listedTokens = await powfi.token.getTokens();

  const listedById = listedTokens.find(
    (token) => token.id.toLowerCase() === normalized
  );

  if (listedById) return listedById;

  const discoveredTokens = await discoverCpmmTokens(powfi);

  const allTokens = new Map();

  for (const token of [...listedTokens, ...discoveredTokens]) {
    allTokens.set(token.id.toLowerCase(), token);
  }

  const tokens = [...allTokens.values()];

  const byId = tokens.find(
    (token) => token.id.toLowerCase() === normalized
  );

  if (byId) return byId;

  const symbolMatches = tokens.filter(
    (token) => token.symbol?.toLowerCase() === normalized
  );

  if (symbolMatches.length === 1) {
    return symbolMatches[0];
  }

  if (symbolMatches.length > 1) {
    throw new Error(
      "Ambiguous token symbol " +
      value +
      ". Use the full token ID instead."
    );
  }

  throw new Error("Unknown token: " + value);
}

export async function resolvePool(powfi, tokenAInput, tokenBInput) {
  const tokenA = await resolveToken(powfi, tokenAInput);
  const tokenB = await resolveToken(powfi, tokenBInput);

  if (tokenA.id === tokenB.id) {
    throw new Error("A pool requires two different tokens");
  }

  const state = await powfi.cpmm.getPoolState(tokenA.id, tokenB.id);

  return {
    tokenA,
    tokenB,
    poolId: state.poolId,
    state
  };
}

export function parseUnits(value, decimals) {
  const text = String(value).trim();
  const pattern = new RegExp("^(?:\\d+)(?:\\.\\d{1," + decimals + "})?$");

  if (!pattern.test(text)) {
    throw new Error(
      "Invalid amount. Use a positive number with up to " +
      decimals +
      " decimals."
    );
  }

  const [whole, fraction = ""] = text.split(".");
  const unit = 10n ** BigInt(decimals);

  const amount =
    BigInt(whole) * unit +
    BigInt(fraction.padEnd(decimals, "0") || "0");

  if (amount <= 0n) {
    throw new Error("Amount must be greater than zero.");
  }

  return amount;
}

export function formatUnits(value, decimals, displayDecimals = decimals) {
  value = BigInt(value);

  const unit = 10n ** BigInt(decimals);
  const whole = value / unit;
  const fraction = (value % unit)
    .toString()
    .padStart(decimals, "0")
    .slice(0, Math.min(decimals, displayDecimals))
    .replace(/0+$/, "");

  return fraction ? `${whole}.${fraction}` : `${whole}`;
}
