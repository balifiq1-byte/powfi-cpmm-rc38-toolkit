import { Powfi, CpmmModule } from "@alephium/powfi-sdk"
import { web3, NodeProvider } from "@alephium/web3"
import { resolvePool, parseUnits, formatUnits } from "./lib/powfi-readonly.mjs"

const NODE_URL = "https://node.testnet.alephium.org"

const args = process.argv.slice(2)

if (args.includes("--help") || args.includes("-h")) {
  console.log(`POWFI CPMM RC38 QUOTE EXPLORER

Usage:
  npm run quotes
  npm run quotes -- <TOKEN_IN>
  npm run quotes -- <TOKEN_IN> [AMOUNTS...]
  npm run quotes -- <TOKEN_IN> <TOKEN_OUT> [AMOUNTS...]
  npm run quotes -- --help

Arguments:
  TOKEN_IN    Input token symbol from the PowFi token list
              Default: ALPH

  TOKEN_OUT   Output token symbol
              Required for generic pairs

  AMOUNTS     Optional positive input amounts
              Decimal precision follows TOKEN_IN

BAAL shorthand:
  ALPH        ALPH → BAAL
  BAAL        BAAL → ALPH

Default BAAL sizes:
  ALPH        0.1  1  5  10
  BAAL        10  100  500  1000

Generic default sizes:
  0.1  1  5  10

Examples:
  npm run quotes
  npm run quotes -- ALPH
  npm run quotes -- BAAL 10 50 100 250 500
  npm run quotes -- WETH WBTC 0.01 0.1 1
  npm run quotes -- USDTeth USDCeth 1 10 100

Output:
  Input amount
  Expected output
  Price impact

Slippage:
  1% (100 bps)

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
const remainingArgs = process.argv.slice(3)

const looksLikeAmount = (value) =>
  /^(?:\d+)(?:\.\d+)?$/.test(value)

let outputToken
let requestedSizes

if (remainingArgs.length > 0 && !looksLikeAmount(remainingArgs[0])) {
  outputToken = remainingArgs[0]
  requestedSizes = remainingArgs.slice(1)
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

  requestedSizes = remainingArgs
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

const sizes =
  requestedSizes.length > 0
    ? requestedSizes
    : inputSymbol === "ALPH" && outputSymbol === "BAAL"
      ? ["0.1", "1", "5", "10"]
      : inputSymbol === "BAAL" && outputSymbol === "ALPH"
        ? ["10", "100", "500", "1000"]
        : ["0.1", "1", "5", "10"]

console.log("POWFI CPMM RC38 QUOTE EXPLORER")
console.log("-----------------------------")
console.log("Mode: READ ONLY")
console.log("Network: Alephium Testnet")
console.log("PowFi SDK: 0.0.1-rc.38")
console.log()
console.log(`${inputSymbol} → ${outputSymbol}`)
console.log()

console.log(
  "Input".padEnd(16),
  "Expected output".padEnd(24),
  "Price impact"
)

console.log("-".repeat(56))

for (const size of sizes) {
  const amountIn = parseUnits(size, tokenIn.decimals)

  const quote = CpmmModule.computeSwapAmount({
    state: pool.state,
    tokenInId,
    tokenOutId,
    amountIn,
    slippageBps: 100n
  })

  const input =
    `${formatUnits(amountIn, tokenIn.decimals)} ${inputSymbol}`

  const output =
    `${formatUnits(quote.tokenOutAmount, tokenOut.decimals, 9)} ${outputSymbol}`

  const impact =
    `${quote.priceImpact.toFixed(6)} %`

  console.log(
    input.padEnd(16),
    output.padEnd(24),
    impact
  )
}

console.log()
console.log("✓ Quotes generated successfully")
console.log("✓ No signer")
console.log("✓ No transaction")
