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
  console.log(`😈 BAAL / POWFI TESTNET

Usage:
  npm start
  npm start -- --help

Description:
  Read the live ALPH / BAAL CPMM pool on Alephium Testnet.

Output:
  • ALPH reserve
  • BAAL reserve
  • BAAL / ALPH spot ratios

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

console.log("😈 BAAL / POWFI TESTNET")
console.log("-----------------------")
console.log("Mode: READ ONLY")
console.log("Network: Alephium Testnet")
console.log("PowFi SDK: 0.0.1-rc.38")
console.log()

const pool = await powfi.cpmm.getPoolState(ALPH, BAAL)

const reserveAlph = BigInt(pool.reserve0)
const reserveBaal = BigInt(pool.reserve1)

const spotScaled =
  reserveAlph * ONE / reserveBaal

console.log("ALPH reserve:", human(reserveAlph, 9))
console.log("BAAL reserve:", human(reserveBaal, 9))
console.log()
console.log(
  "1 BAAL =",
  human(spotScaled, 9),
  "ALPH"
)
console.log(
  "1 ALPH =",
  human(reserveBaal * ONE / reserveAlph, 3),
  "BAAL"
)

console.log()
console.log("✓ Pool read successfully")
console.log("✓ No signer")
console.log("✓ No transaction")
