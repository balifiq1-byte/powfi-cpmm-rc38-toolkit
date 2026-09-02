import { addressFromContractId, web3 } from "@alephium/web3";
import { sortTokens } from "@alephium/powfi-sdk";

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

export async function resolveToken(powfi, input) {
  const value = String(input).trim();
  const tokens = await powfi.token.getTokens();

  const byId = tokens.find((token) => token.id.toLowerCase() === value.toLowerCase());
  if (byId) return byId;

  const bySymbol = tokens.find((token) => token.symbol.toLowerCase() === value.toLowerCase());
  if (bySymbol) return bySymbol;

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
