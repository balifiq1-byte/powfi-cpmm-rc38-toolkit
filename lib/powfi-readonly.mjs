import { addressFromContractId, web3 } from "@alephium/web3";
import { sortTokens } from "@alephium/powfi-sdk";

export const RC38_TESTNET_FACTORY =
  "29hdd9b9Gp7oXuamwHKfUqBaRXP487HoeTcutS3RhZJEj";

export async function resolveTokenById(
  powfi,
  id,
  listedTokens = undefined
) {
  const value = String(id).trim();
  const tokens =
    listedTokens ?? await powfi.token.getTokens();

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

export async function discoverCpmmPairs() {
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

  return events
    .filter((event) => {
      if (event.eventIndex !== 0 || event.fields?.length !== 4) {
        return false;
      }

      const [token0, token1, pair, currentPairSize] = event.fields;

      return (
        token0.type === "ByteVec" &&
        token1.type === "ByteVec" &&
        pair.type === "ByteVec" &&
        currentPairSize.type === "U256"
      );
    })
    .map((event) => ({
      token0Id: event.fields[0].value,
      token1Id: event.fields[1].value,
      pairId: event.fields[2].value,
      number: BigInt(event.fields[3].value)
    }));
}

export function validateCpmmPairs(powfi, pairs) {
  for (const pair of pairs) {
    const expectedPairId = powfi.cpmm.getPoolId(
      pair.token0Id,
      pair.token1Id
    );

    if (
      expectedPairId.toLowerCase() !==
      pair.pairId.toLowerCase()
    ) {
      throw new Error(
        "CPMM Factory pair ID mismatch for pair #" +
        pair.number
      );
    }
  }

  return pairs;
}

export async function discoverCpmmTokens(
  powfi,
  pairs = undefined,
  listedTokens = undefined
) {
  const discoveredPairs = pairs ?? await discoverCpmmPairs();
  const tokenIds = new Set();

  for (const pair of discoveredPairs) {
    tokenIds.add(pair.token0Id);
    tokenIds.add(pair.token1Id);
  }

  const tokenList =
    listedTokens ?? await powfi.token.getTokens();
  const tokens = [];

  for (const id of tokenIds) {
    tokens.push(
      await resolveTokenById(powfi, id, tokenList)
    );
  }

  return tokens;
}

export async function resolveToken(
  powfi,
  input,
  discoveredTokens = undefined,
  listedTokens = undefined
) {
  const value = String(input).trim();
  const normalized = value.toLowerCase();

  const tokenList =
    listedTokens ?? await powfi.token.getTokens();

  const listedById = tokenList.find(
    (token) => token.id.toLowerCase() === normalized
  );

  if (listedById) return listedById;

  const cpmmTokens =
    discoveredTokens ?? await discoverCpmmTokens(powfi);

  const allTokens = new Map();

  for (const token of [...tokenList, ...cpmmTokens]) {
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

const RC38_TOKEN_PAIR_CODE_HASH =
  "2524bfcfd8152ddceb6e7837b93637c422bc5d1987489117cfd7dc06c292df82";

export async function fetchRawCpmmPoolState(powfi, tokenA, tokenB) {
  const [token0Id, token1Id] = sortTokens(tokenA.id, tokenB.id);

  const poolId = powfi.cpmm.getPoolId(token0Id, token1Id);
  const address = addressFromContractId(poolId);
  const provider = web3.getCurrentNodeProvider();

  const raw = await provider.contracts.getContractsAddressState(address);

  if (raw.codeHash !== RC38_TOKEN_PAIR_CODE_HASH) {
    throw new Error(
      "Unexpected TokenPair code hash for pool " +
      poolId +
      ": " +
      raw.codeHash
    );
  }

  if (raw.immFields?.length !== 6 || raw.mutFields?.length !== 8) {
    throw new Error("Unexpected RC38 TokenPair state layout: " + poolId);
  }

  const rawToken0Id = raw.immFields[1].value;
  const rawToken1Id = raw.immFields[2].value;

  if (rawToken0Id !== token0Id || rawToken1Id !== token1Id) {
    throw new Error("TokenPair token IDs do not match requested pair: " + poolId);
  }

  const token0Info = await resolveTokenById(powfi, rawToken0Id);
  const token1Info = await resolveTokenById(powfi, rawToken1Id);

  if (
    token0Info.decimals === undefined ||
    token1Info.decimals === undefined
  ) {
    throw new Error(
      "Unable to resolve token decimals for pool " + poolId
    );
  }

  return {
    poolId,
    reserve0: BigInt(raw.mutFields[1].value),
    reserve1: BigInt(raw.mutFields[2].value),
    token0Info,
    token1Info,
    totalSupply: BigInt(raw.mutFields[6].value),
    dexRoot: raw.immFields[3].value
  };
}

export async function resolvePool(powfi, tokenAInput, tokenBInput) {
  const listedTokens = await powfi.token.getTokens();

  const inputsAreListedIds = [tokenAInput, tokenBInput].every((input) => {
    const normalized = String(input).trim().toLowerCase();

    return listedTokens.some(
      (token) => token.id.toLowerCase() === normalized
    );
  });

  const discoveredTokens = inputsAreListedIds
    ? []
    : await discoverCpmmTokens(
        powfi,
        undefined,
        listedTokens
      );

  const tokenA = await resolveToken(
    powfi,
    tokenAInput,
    discoveredTokens,
    listedTokens
  );

  const tokenB = await resolveToken(
    powfi,
    tokenBInput,
    discoveredTokens,
    listedTokens
  );

  if (tokenA.id === tokenB.id) {
    throw new Error("A pool requires two different tokens");
  }

  const state = await fetchRawCpmmPoolState(powfi, tokenA, tokenB);

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
