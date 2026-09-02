import { Powfi } from "@alephium/powfi-sdk"
import { web3, NodeProvider } from "@alephium/web3"

const NODE_URL = "https://node.testnet.alephium.org"

const ALPH =
  "0000000000000000000000000000000000000000000000000000000000000000"

const BAAL =
  "72ff515813051a7d9dde6c63efb8ad4bc623a3577c5ecd6fc4e61ba24e87de00"

const ONE = 10n ** 18n

const args = process.argv.slice(2)

if (args.includes("--help") || args.includes("-h")) {
  console.log(`😈 BAAL / POWFI SWAP SIMULATOR

Usage:
  npm run simulate
  npm run simulate -- <AMOUNT>
  npm run simulate -- <AMOUNT> <TOKEN>
  npm run simulate -- --help

Arguments:
  AMOUNT    Positive amount with up to 18 decimals
            Default: 1

  TOKEN     ALPH or BAAL
            Default: ALPH

Direction:
  ALPH      ALPH → BAAL
  BAAL      BAAL → ALPH

Examples:
  npm run simulate
  npm run simulate -- 0.1
  npm run simulate -- 5 ALPH
  npm run simulate -- 100 BAAL

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

console.log("😈 BAAL / POWFI SWAP SIMULATOR")
console.log("------------------------------")
console.log("Mode: READ ONLY")
console.log("Network: Alephium Testnet")
console.log("PowFi SDK: 0.0.1-rc.38")
console.log()

function parseAmount(value) {
  if (!/^(?:\d+)(?:\.\d{1,18})?$/.test(value)) {
    throw new Error(
      "Invalid amount. Use a positive number with up to 18 decimals."
    )
  }

  const [whole, fraction = ""] = value.split(".")
  const amount =
    BigInt(whole) * ONE +
    BigInt(fraction.padEnd(18, "0") || "0")

  if (amount <= 0n) {
    throw new Error("Amount must be greater than zero.")
  }

  return amount
}

const input = process.argv[2] ?? "1"
const inputSymbol = (process.argv[3] ?? "ALPH").toUpperCase()

if (inputSymbol !== "ALPH" && inputSymbol !== "BAAL") {
  throw new Error("Token must be ALPH or BAAL.")
}

const amountIn = parseAmount(input)

const tokenInId = inputSymbol === "ALPH" ? ALPH : BAAL
const tokenOutId = inputSymbol === "ALPH" ? BAAL : ALPH

const outputSymbol = inputSymbol === "ALPH" ? "BAAL" : "ALPH"

console.log(
  `Simulating: ${human(amountIn, 18)} ${inputSymbol} → ${outputSymbol}`
)
console.log()

const quote = await powfi.cpmm.simSwap({
  tokenInId,
  tokenOutId,
  amountIn,
  slippageBps: 100n
})

console.log(
  "Expected output:",
  human(quote.tokenOutAmount, 9),
  outputSymbol
)

console.log(
  "Minimum output:",
  human(quote.minimalTokenOutAmount, 9),
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
