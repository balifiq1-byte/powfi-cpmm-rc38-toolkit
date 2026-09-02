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
  console.log(`😈 BAAL / POWFI QUOTE EXPLORER

Usage:
  npm run quotes
  npm run quotes -- <TOKEN>
  npm run quotes -- <TOKEN> [AMOUNTS...]
  npm run quotes -- --help

Arguments:
  TOKEN      ALPH or BAAL
             Default: ALPH

  AMOUNTS    Optional positive input amounts
             Up to 18 decimals each

Direction:
  ALPH       ALPH → BAAL
  BAAL       BAAL → ALPH

Default sizes:
  ALPH       0.1  1  5  10
  BAAL       10  100  500  1000

Examples:
  npm run quotes
  npm run quotes -- ALPH
  npm run quotes -- BAAL
  npm run quotes -- ALPH 0.1 0.5 1 2 5
  npm run quotes -- BAAL 10 50 100 250 500

Output:
  • Input amount
  • Expected output
  • Price impact

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

function parseAmount(value) {
  if (!/^(?:\d+)(?:\.\d{1,18})?$/.test(value)) {
    throw new Error(`Invalid amount: ${value}`)
  }

  const [whole, fraction = ""] = value.split(".")

  return (
    BigInt(whole) * ONE +
    BigInt(fraction.padEnd(18, "0") || "0")
  )
}

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

const inputSymbol = (process.argv[2] ?? "ALPH").toUpperCase()

if (inputSymbol !== "ALPH" && inputSymbol !== "BAAL") {
  throw new Error("Token must be ALPH or BAAL.")
}

const outputSymbol =
  inputSymbol === "ALPH" ? "BAAL" : "ALPH"

const tokenInId =
  inputSymbol === "ALPH" ? ALPH : BAAL

const tokenOutId =
  inputSymbol === "ALPH" ? BAAL : ALPH

const requestedSizes = process.argv.slice(3)

const sizes =
  requestedSizes.length > 0
    ? requestedSizes
    : inputSymbol === "ALPH"
      ? ["0.1", "1", "5", "10"]
      : ["10", "100", "500", "1000"]

console.log("😈 BAAL / POWFI QUOTE EXPLORER")
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
  const amountIn = parseAmount(size)

  const quote = await powfi.cpmm.simSwap({
    tokenInId,
    tokenOutId,
    amountIn,
    slippageBps: 100n
  })

  const input =
    `${human(amountIn, 18)} ${inputSymbol}`

  const output =
    `${human(quote.tokenOutAmount, 9)} ${outputSymbol}`

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
