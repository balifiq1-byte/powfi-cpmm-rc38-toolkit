import { Powfi, CpmmModule } from "@alephium/powfi-sdk"
import { web3, NodeProvider } from "@alephium/web3"

const NODE_URL = "https://node.testnet.alephium.org"

const ALPH =
  "0000000000000000000000000000000000000000000000000000000000000000"

const BAAL =
  "72ff515813051a7d9dde6c63efb8ad4bc623a3577c5ecd6fc4e61ba24e87de00"

const ONE = 10n ** 18n
const THRESHOLDS = [0.5, 1, 2, 5]

web3.setCurrentNodeProvider(
  new NodeProvider(NODE_URL)
)

const powfi = Powfi.load({
  networkId: "testnet"
})

function human(value, decimals = 6) {
  value = BigInt(value)

  const whole = value / ONE
  const fraction = (value % ONE)
    .toString()
    .padStart(18, "0")
    .slice(0, decimals)
    .replace(/0+$/, "")

  return fraction
    ? `${whole}.${fraction}`
    : `${whole}`
}

const inputSymbol =
  (process.argv[2] ?? "ALPH").toUpperCase()

if (inputSymbol !== "ALPH" && inputSymbol !== "BAAL") {
  throw new Error("Token must be ALPH or BAAL.")
}

const outputSymbol =
  inputSymbol === "ALPH" ? "BAAL" : "ALPH"

const tokenInId =
  inputSymbol === "ALPH" ? ALPH : BAAL

const tokenOutId =
  inputSymbol === "ALPH" ? BAAL : ALPH

const poolState =
  await powfi.cpmm.getPoolState(ALPH, BAAL)

function getQuote(amountIn) {
  return CpmmModule.computeSwapAmount({
    state: poolState,
    tokenInId,
    tokenOutId,
    amountIn,
    slippageBps: 100n
  })
}

async function findThreshold(targetImpact) {
  let low = 0n
  let high = ONE

  if (inputSymbol === "BAAL") {
    high = 100n * ONE
  }

  let quoteHigh = getQuote(high)

  while (quoteHigh.priceImpact < targetImpact) {
    low = high
    high *= 2n

    quoteHigh = getQuote(high)

    if (high > 1_000_000_000n * ONE) {
      throw new Error(
        `Unable to bracket ${targetImpact}% impact`
      )
    }
  }

  for (let i = 0; i < 24; i++) {
    const mid = (low + high) / 2n

    if (mid === low || mid === high) {
      break
    }

    const quote = getQuote(mid)

    if (quote.priceImpact < targetImpact) {
      low = mid
    } else {
      high = mid
    }
  }

  const quote = getQuote(low)

  return {
    amountIn: low,
    quote
  }
}

console.log("😈 BAAL / POWFI IMPACT ANALYZER")
console.log("-----------------------------")
console.log("Mode: READ ONLY")
console.log("Network: Alephium Testnet")
console.log("PowFi SDK: 0.0.1-rc.38")
console.log()
console.log(`${inputSymbol} → ${outputSymbol}`)
console.log()
console.log(
  "Impact limit".padEnd(16),
  "Max input".padEnd(22),
  "Expected output"
)
console.log("-".repeat(62))

for (const threshold of THRESHOLDS) {
  const result = await findThreshold(threshold)

  console.log(
    `${threshold.toFixed(1)} %`.padEnd(16),
    `${human(result.amountIn, 9)} ${inputSymbol}`.padEnd(22),
    `${human(result.quote.tokenOutAmount, 9)} ${outputSymbol}`
  )
}

console.log()
console.log("✓ Impact thresholds calculated")
console.log("✓ No signer")
console.log("✓ No transaction")
