import { Powfi, CpmmModule } from "@alephium/powfi-sdk"
import { web3, NodeProvider } from "@alephium/web3"
import { resolvePool, parseUnits, formatUnits } from "./lib/powfi-readonly.mjs"

const NODE_URL = "https://node.testnet.alephium.org"

const args = process.argv.slice(2)

if (args.includes("--help") || args.includes("-h")) {
  console.log(`😈 BAAL / POWFI SWAP SIMULATOR

Usage:
  npm run simulate
  npm run simulate -- <AMOUNT>
  npm run simulate -- <AMOUNT> <TOKEN_IN>
  npm run simulate -- <AMOUNT> <TOKEN_IN> <TOKEN_OUT>
  npm run simulate -- --help

Arguments:
  AMOUNT      Positive token amount
              Decimal precision follows TOKEN_IN
              Default: 1

  TOKEN_IN    Token symbol from the PowFi token list
              Default: ALPH

  TOKEN_OUT   Output token symbol
              Required for generic pairs

BAAL shorthand:
  ALPH        ALPH → BAAL
  BAAL        BAAL → ALPH

Examples:
  npm run simulate
  npm run simulate -- 0.1
  npm run simulate -- 5 ALPH
  npm run simulate -- 100 BAAL
  npm run simulate -- 1 WETH WBTC
  npm run simulate -- 1 USDTeth USDCeth

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

console.log("😈 BAAL / POWFI SWAP SIMULATOR")
console.log("------------------------------")
console.log("Mode: READ ONLY")
console.log("Network: Alephium Testnet")
console.log("PowFi SDK: 0.0.1-rc.38")
console.log()

const input = process.argv[2] ?? "1"
const inputToken = process.argv[3] ?? "ALPH"
const requestedOutputToken = process.argv[4]

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

const amountIn = parseUnits(input, tokenIn.decimals)

const tokenInId = tokenIn.id
const tokenOutId = tokenOut.id

const inputSymbol = tokenIn.symbol
const outputSymbol = tokenOut.symbol

console.log(
  `Simulating: ${formatUnits(amountIn, tokenIn.decimals)} ${inputSymbol} → ${outputSymbol}`
)
console.log()

const quote = CpmmModule.computeSwapAmount({
  state: pool.state,
  tokenInId,
  tokenOutId,
  amountIn,
  slippageBps: 100n
})

console.log(
  "Expected output:",
  formatUnits(quote.tokenOutAmount, tokenOut.decimals, 9),
  outputSymbol
)

console.log(
  "Minimum output:",
  formatUnits(quote.minimalTokenOutAmount, tokenOut.decimals, 9),
  outputSymbol
)

console.log(
  "Price impact:",
  quote.priceImpact.toFixed(6),
  "%"
)

console.log()
console.log("✓ Simulation successful")
console.log("✓ No signer")
console.log("✓ No transaction")
