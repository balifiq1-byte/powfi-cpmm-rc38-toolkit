import { Powfi } from "@alephium/powfi-sdk"
import { web3, NodeProvider } from "@alephium/web3"

const NODE_URL = "https://node.testnet.alephium.org"

const ALPH =
  "0000000000000000000000000000000000000000000000000000000000000000"

const BAAL =
  "72ff515813051a7d9dde6c63efb8ad4bc623a3577c5ecd6fc4e61ba24e87de00"

const ONE = 10n ** 18n

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

function parseAlph(value) {
  if (!/^(?:\d+)(?:\.\d{1,18})?$/.test(value)) {
    throw new Error(
      "Invalid ALPH amount. Use a positive number with up to 18 decimals."
    )
  }

  const [whole, fraction = ""] = value.split(".")
  const amount =
    BigInt(whole) * ONE +
    BigInt(fraction.padEnd(18, "0") || "0")

  if (amount <= 0n) {
    throw new Error("ALPH amount must be greater than zero.")
  }

  return amount
}

const input = process.argv[2] ?? "1"
const amountIn = parseAlph(input)

console.log(
  `Simulating: ${human(amountIn, 18)} ALPH → BAAL`
)
console.log()

const quote = await powfi.cpmm.simSwap({
  tokenInId: ALPH,
  tokenOutId: BAAL,
  amountIn,
  slippageBps: 100n
})

console.log(
  "Expected output:",
  human(quote.tokenOutAmount, 9),
  "BAAL"
)

console.log(
  "Minimum output:",
  human(quote.minimalTokenOutAmount, 9),
  "BAAL"
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
