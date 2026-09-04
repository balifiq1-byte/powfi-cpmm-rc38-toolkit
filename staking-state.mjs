import { Powfi } from '@alephium/powfi-sdk'
import { web3, MINIMAL_CONTRACT_DEPOSIT } from '@alephium/web3'

const NETWORK = 'testnet'
const NODE_URL = 'https://node.testnet.alephium.org'
const ONE = 10n ** 18n

function format18(value, precision = 18) {
  const negative = value < 0n
  const n = negative ? -value : value
  const whole = n / ONE
  const fraction = (n % ONE)
    .toString()
    .padStart(18, '0')
    .slice(0, precision)
    .replace(/0+$/, '')

  return `${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`
}

function formatDuration(ms) {
  const day = 24n * 60n * 60n * 1000n
  return `${ms / day} days`
}

web3.setCurrentNodeProvider(NODE_URL)

const powfi = Powfi.load({ networkId: NETWORK })
const xalph = powfi.staking.xAlphTokenContract

const state = await xalph.fetchState()
const f = state.fields

const deposited = f.totalDepositedAlph
const supply = f.totalXAlphSupply
const physicalAlph = state.asset.alphAmount
const physicalDelta = physicalAlph - deposited

const backing =
  supply === 0n
    ? undefined
    : (deposited * ONE) / supply

console.log()
console.log('POWFI STAKING RC38 STATE')
console.log('------------------------')
console.log(`Network: ${NETWORK}`)
console.log(`Mode: READ ONLY`)
console.log()
console.log(`xALPH contract: ${xalph.address}`)
console.log(`Total deposited ALPH: ${format18(deposited)}`)
console.log(`Total xALPH supply: ${format18(supply)}`)
console.log(`Physical ALPH balance: ${format18(physicalAlph)}`)
console.log(`Physical - deposited: ${format18(physicalDelta)} ALPH`)
console.log(`Minimal contract deposit: ${format18(MINIMAL_CONTRACT_DEPOSIT)} ALPH`)
console.log(`Physical delta matches minimum: ${physicalDelta === MINIMAL_CONTRACT_DEPOSIT ? 'YES' : 'NO'}`)
console.log(
  `Backing per xALPH: ${
    backing === undefined ? 'N/A' : `${format18(backing)} ALPH`
  }`
)
console.log(`Unstake duration: ${formatDuration(f.unstakeDuration)}`)
console.log(
  `Max active unstake requests/user: ${f.maxActiveUnstakeRequestsPerUser}`
)
console.log(`Last unstake vault index: ${f.lastUnstakeVaultIndex}`)
console.log()
console.log('✓ Staking state read successfully')
console.log('✓ No signer')
console.log('✓ No transaction')
