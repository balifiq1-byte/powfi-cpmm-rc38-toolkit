import { loadClmmDeployments } from '@alephium/powfi-sdk'
import { addressFromContractId, web3 } from '@alephium/web3'

export const CLMM_NETWORK = 'testnet'
export const CLMM_NODE_URL = 'https://node.testnet.alephium.org'

web3.setCurrentNodeProvider(CLMM_NODE_URL)

export function getClmmDeployment() {
  return loadClmmDeployments(CLMM_NETWORK)
}

export function getClmmFactoryAddress() {
  return getClmmDeployment().contracts.PoolFactory.contractInstance.address
}

export async function discoverClmmPools() {
  const provider = web3.getCurrentNodeProvider()
  const factoryAddress = getClmmFactoryAddress()

  const pools = []
  let start = 0

  while (true) {
    const result = await provider.events.getEventsContractContractaddress(
      factoryAddress,
      { start, limit: 100 }
    )

    for (const event of result.events) {
      if (event.eventIndex !== 1) continue

      const [id, token0, token1, configIndex] = event.fields

      if (
        id?.type !== 'ByteVec' ||
        token0?.type !== 'ByteVec' ||
        token1?.type !== 'ByteVec' ||
        configIndex?.type !== 'U256'
      ) {
        throw new Error(`Unexpected CLMM PoolCreated event shape at tx ${event.txId}`)
      }

      pools.push({
        id: id.value,
        address: addressFromContractId(id.value),
        token0Id: token0.value,
        token1Id: token1.value,
        configIndex: BigInt(configIndex.value),
        txId: event.txId,
        blockHash: event.blockHash,
        timestamp: event.timestamp
      })
    }

    const nextStart = Number(result.nextStart)

    if (result.events.length === 0 || nextStart <= start) break
    start = nextStart
  }

  return pools
}

function expectField(field, type, name) {
  if (!field || field.type !== type) {
    throw new Error(`Unexpected CLMM field ${name}: expected ${type}`)
  }
  return field.value
}

export async function fetchRawClmmPoolState(pool) {
  const provider = web3.getCurrentNodeProvider()
  const state = await provider.contracts.getContractsAddressState(pool.address)

  if (state.immFields.length < 13 || state.mutFields.length < 5) {
    throw new Error(`Unexpected CLMM Pool state layout at ${pool.address}`)
  }

  const raw = {
    id: pool.id,
    address: state.address,
    codeHash: state.codeHash,
    initialStateHash: state.initialStateHash,

    parentId: expectField(state.immFields[0], 'ByteVec', 'parent'),
    positionTemplateId: expectField(state.immFields[1], 'ByteVec', 'positionTemplate'),
    dexAccountRootId: expectField(state.immFields[2], 'ByteVec', 'dexAccountRoot'),
    tickTemplateId: expectField(state.immFields[3], 'ByteVec', 'tickTemplate'),
    wordTemplateId: expectField(state.immFields[4], 'ByteVec', 'wordTemplate'),

    configIndex: BigInt(expectField(state.immFields[5], 'U256', 'configIndex')),
    token0Id: expectField(state.immFields[6], 'ByteVec', 'token0'),
    token1Id: expectField(state.immFields[7], 'ByteVec', 'token1'),
    token2Id: expectField(state.immFields[8], 'ByteVec', 'token2'),
    fee: BigInt(expectField(state.immFields[9], 'U256', 'fee')),
    tickSpacing: BigInt(expectField(state.immFields[10], 'I256', 'tickSpacing')),
    maxLiquidityPerTick: BigInt(
      expectField(state.immFields[11], 'U256', 'maxLiquidityPerTick')
    ),
    interfaceId: expectField(state.immFields[12], 'ByteVec', '__stdInterfaceId'),

    nextNftIndex: BigInt(expectField(state.mutFields[0], 'U256', 'nextNftIndex')),
    sqrtPriceX96: BigInt(expectField(state.mutFields[1], 'U256', 'slot0.sqrtPriceX96')),
    tick: BigInt(expectField(state.mutFields[2], 'I256', 'slot0.tick')),
    feeProtocol: BigInt(expectField(state.mutFields[3], 'U256', 'slot0.feeProtocol')),
    liquidity: BigInt(expectField(state.mutFields[4], 'U256', 'liquidity')),

    asset: state.asset
  }

  if (
    raw.token0Id !== pool.token0Id ||
    raw.token1Id !== pool.token1Id ||
    raw.configIndex !== pool.configIndex
  ) {
    throw new Error(`CLMM PoolCreated/state mismatch at ${pool.address}`)
  }

  return raw
}

export function clmmPriceFromSqrtPriceX96(
  sqrtPriceX96,
  token0Decimals,
  token1Decimals,
  precision = 18
) {
  const sqrt = BigInt(sqrtPriceX96)
  const q192 = 1n << 192n
  const scale = 10n ** BigInt(precision)
  const token0Scale = 10n ** BigInt(token0Decimals)
  const token1Scale = 10n ** BigInt(token1Decimals)

  const scaled =
    (sqrt * sqrt * token0Scale * scale) /
    (q192 * token1Scale)

  const whole = scaled / scale
  const fraction = (scaled % scale)
    .toString()
    .padStart(precision, '0')
    .replace(/0+$/, '')

  return fraction ? `${whole}.${fraction}` : `${whole}`
}
