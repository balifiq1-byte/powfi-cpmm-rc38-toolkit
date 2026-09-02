import { Powfi, CpmmModule } from "@alephium/powfi-sdk"
import { web3, NodeProvider } from "@alephium/web3"
import { resolvePool, formatUnits } from "./lib/powfi-readonly.mjs"

const NODE_URL = "https://node.testnet.alephium.org"

const THRESHOLDS = [0.5, 1, 2, 5]

const args = process.argv.slice(2)

if (args.includes("--help") || args.includes("-h")) {
  console.log(`POWFI CPMM RC38 IMPACT ANALYZER

Usage:
  npm run impact
  npm run impact -- <TOKEN_IN>
  npm run impact -- <TOKEN_IN> <TOKEN_OUT>
  npm run impact -- --help

Arguments:
  TOKEN_IN    Input token symbol
  TOKEN_OUT   Output token symbol

BAAL shorthand:
  ALPH        ALPH → BAAL
  BAAL        BAAL → ALPH

For other PowFi CPMM pairs, TOKEN_OUT is required.

Impact thresholds:
  0.5%
  1.0%
  2.0%
  5.0%

Output:
  • Price-impact limit
  • Maximum input below the limit
  • Expected output

Method:
  The selected live CPMM pool state is fetched once.
  Threshold calculations are then performed locally against
  that same snapshot with CpmmModule.computeSwapAmount().

  Token decimals are resolved dynamically.

Slippage:
  1% (100 bps)

Examples:
  npm run impact
  npm run impact -- ALPH
  npm run impact -- BAAL
  npm run impact -- USDTeth USDCeth
  npm run impact -- WETH WBTC

Environment:
  Network: Alephium Testnet
  PowFi SDK: 0.0.1-rc.38
  Mode: READ ONLY

Safety:
  No wallet
  No signer
  No transaction`)
  process.exit(0)
}

web3.setCurrentNodeProvider(
  new NodeProvider(NODE_URL)
)

const powfi = Powfi.load({
  networkId: "testnet"
})

const inputToken = process.argv[2] ?? "ALPH"
const requestedOutputToken = process.argv[3]

let outputToken

if (requestedOutputToken) {
  outputToken = requestedOutputToken
} else {
  const normalized = inputToken.toUpperCase()

  if (normalized === "ALPH") {
    outputToken = "BAAL"
  } else if (normalized === "BAAL") {
    outputToken = "ALPH"
  } else {
    throw new Error(
      "Output token is required when using a pair other than ALPH / BAAL."
    )
  }
}

const pool = await resolvePool(
  await powfi,
  inputToken,
  outputToken
)

const tokenIn = pool.tokenA
const tokenOut = pool.tokenB

const inputSymbol = tokenIn.symbol
const outputSymbol = tokenOut.symbol

const tokenInId = tokenIn.id
const tokenOutId = tokenOut.id

const poolState = pool.state
const TOKEN_UNIT = 10n ** BigInt(tokenIn.decimals)

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
  let high = TOKEN_UNIT

  if (inputSymbol === "BAAL" && outputSymbol === "ALPH") {
    high = 100n * TOKEN_UNIT
  }

  let quoteHigh = getQuote(high)

  while (quoteHigh.priceImpact < targetImpact) {
    low = high
    high *= 2n

    quoteHigh = getQuote(high)

    if (high > 1_000_000_000n * TOKEN_UNIT) {
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

console.log("POWFI CPMM RC38 IMPACT ANALYZER")
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
    `${formatUnits(result.amountIn, tokenIn.decimals, 9)} ${inputSymbol}`.padEnd(22),
    `${formatUnits(result.quote.tokenOutAmount, tokenOut.decimals, 9)} ${outputSymbol}`
  )
}

console.log()
console.log("✓ Impact thresholds calculated")
console.log("✓ No signer")
console.log("✓ No transaction")
