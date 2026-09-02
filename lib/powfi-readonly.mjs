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
