import { Powfi } from '@alephium/powfi-sdk'
import { web3 } from '@alephium/web3'

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

const user = process.argv[2]

if (!user) {
  console.error('Usage: npm run staking-user <address>')
  process.exit(1)
}

web3.setCurrentNodeProvider(NODE_URL)

const powfi = Powfi.load({ networkId: NETWORK })
const indexes = await powfi.staking.getActiveUnstakeVaultIndexes(user)

console.log()
console.log('POWFI STAKING RC38 USER')
console.log('-----------------------')
console.log(`Network: ${NETWORK}`)
console.log('Mode: READ ONLY')
console.log(`User: ${user}`)
console.log(`Active unstake vaults: ${indexes.length}`)
console.log()

for (const index of indexes) {
  const state = await powfi.staking.getAlphUnstakeVaultState(user, index)
  const claimable = await powfi.staking.getClaimableAmount(user, index)
  const f = state.fields

  console.log(`Vault index: ${index}`)
  console.log(`Address: ${state.address}`)
  console.log(`Total unstake: ${format18(f.totalUnstakeAmount)} ALPH`)
  console.log(`Withdrawn: ${format18(f.withdrawnAmount)} ALPH`)
  console.log(`Claimable: ${format18(claimable)} ALPH`)
  console.log(`Start time: ${f.unstakeStartTime}`)
  console.log(`Duration ms: ${f.unstakeDuration}`)
  console.log()
}

console.log('✓ User staking state read successfully')
console.log('✓ No signer')
console.log('✓ No transaction')
