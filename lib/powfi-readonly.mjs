export async function resolveToken(powfi, input) {
  const value = String(input).trim();
  const tokens = await powfi.token.getTokens();

  const byId = tokens.find((token) => token.id.toLowerCase() === value.toLowerCase());
  if (byId) return byId;

  const bySymbol = tokens.find((token) => token.symbol.toLowerCase() === value.toLowerCase());
  if (bySymbol) return bySymbol;

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
