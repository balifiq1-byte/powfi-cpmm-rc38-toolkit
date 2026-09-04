import { Powfi } from '@alephium/powfi-sdk'
import fs from 'node:fs'
import { Contract, ContractInstance, Struct, NodeProvider, randomTxId } from '@alephium/web3'
import { resolveTokenById } from './lib/powfi-readonly.mjs'
import {
  CLMM_NETWORK,
  discoverClmmPools,
  fetchRawClmmPoolState
} from './lib/powfi-clmm-readonly.mjs'


function parseUnits(value, decimals) {
  if (!/^\d+(?:\.\d+)?$/.test(value)) {
    throw new Error(`Invalid amount: ${value}`)
  }

  const [whole, fraction = ''] = value.split('.')

  if (fraction.length > decimals) {
    throw new Error(
      `Too many decimal places: ${fraction.length}, token supports ${decimals}`
    )
  }

  return BigInt(whole + fraction.padEnd(decimals, '0'))
}

function formatUnits(value, decimals) {
  const negative = value < 0n
  const raw = negative ? -value : value
  const digits = raw.toString().padStart(decimals + 1, '0')
  const whole = decimals === 0 ? digits : digits.slice(0, -decimals) || '0'
  const fraction = decimals === 0 ? '' : digits.slice(-decimals)
  const trimmed = fraction.replace(/0+$/, '')

  return `${negative ? '-' : ''}${whole}${trimmed ? '.' + trimmed : ''}`
}

const CLMM_NODE_URL = 'https://node.testnet.alephium.org'
const CLMM_POOL_CODE_HASH =
  '1642bd2f249a1a189e4448ecaa4e048a85e9fbf9f7dbf4fe176dbc56c93e8d7c'

const poolArtifact = JSON.parse(
  fs.readFileSync(
    'node_modules/@alephium/powfi-sdk/clmm/artifacts/Pool.ral.json',
    'utf8'
  )
)

const structsJson = JSON.parse(
  fs.readFileSync(
    'node_modules/@alephium/powfi-sdk/clmm/artifacts/structs.ral.json',
    'utf8'
  )
)

const allStructs = structsJson.map((json) => Struct.fromJson(json))
const poolContract = Contract.fromJson(
  poolArtifact,
  '',
  CLMM_POOL_CODE_HASH,
  allStructs
)
const quoteProvider = new NodeProvider(CLMM_NODE_URL)

async function simulateSwapRaw(poolAddress, zeroForOne, amountSpecified) {
  const instance = new ContractInstance(poolAddress)
  const methodIndex = poolContract.getMethodIndex('simulateSwap')
  const txId = randomTxId()

  const callParams = poolContract.toApiCallContract(
    {
      txId,
      args: {
        zeroForOne,
        amountSpecified,
        data: '',
        maxSteps: 500n
      }
    },
    instance.groupIndex,
    instance.address,
    methodIndex
  )

  return quoteProvider.contracts.postContractsCallContract(callParams)
}

const powfi = Powfi.load({ networkId: CLMM_NETWORK })
powfi.setCurrentProviders()

console.log('PowFi RC38 CLMM Quote — READ ONLY')
console.log('No signer — No transaction')

const [, , tokenInArg, tokenOutArg, amountArg] = process.argv

if (!tokenInArg || !tokenOutArg || !amountArg) {
  console.error('Usage: node clmm-quote.mjs <tokenInId> <tokenOutId> <amount>')
  process.exit(1)
}

const tokenIn = tokenInArg.toLowerCase()
const tokenOut = tokenOutArg.toLowerCase()

const listedTokens = await powfi.token.getTokens()
const inputMeta = await resolveTokenById(powfi, tokenIn, listedTokens)
const outputMeta = await resolveTokenById(powfi, tokenOut, listedTokens)
if (inputMeta.decimals === undefined || outputMeta.decimals === undefined) throw new Error('Cannot resolve token decimals')
const amountIn = parseUnits(amountArg, inputMeta.decimals)
if (amountIn <= 0n) throw new Error('Amount must be greater than zero')
const pools = await discoverClmmPools()

const candidates = pools.filter((pool) => {
  const token0 = pool.token0Id.toLowerCase()
  const token1 = pool.token1Id.toLowerCase()

  return (
    (token0 === tokenIn && token1 === tokenOut) ||
    (token0 === tokenOut && token1 === tokenIn)
  )
})

if (candidates.length === 0) {
  throw new Error(`No CLMM pool found for ${tokenIn}/${tokenOut}`)
}

console.log(`Matching pools: ${candidates.length}`)

for (const pool of candidates) {
  const state = await fetchRawClmmPoolState(pool)
  const zeroForOne = state.token0Id.toLowerCase() === tokenIn

  console.log('')
  console.log('Pool:', pool.address)
  console.log('Config index:', state.configIndex.toString())
  console.log('Token0:', state.token0Id)
  console.log('Token1:', state.token1Id)
  console.log('Direction:', zeroForOne ? 'token0 -> token1' : 'token1 -> token0')
  console.log('zeroForOne:', zeroForOne)

  const simulation = await powfi.clmm.simulateSwap({
    configIndex: state.configIndex,
    token0: state.token0Id,
    token1: state.token1Id,
    zeroForOne,
    amount: amountIn
  })

  const rawSimulation = await simulateSwapRaw(
    pool.address,
    zeroForOne,
    amountIn
  )

  if (
    !Array.isArray(rawSimulation.returns) ||
    rawSimulation.returns.length !== 2 ||
    rawSimulation.returns[0]?.type !== 'I256' ||
    rawSimulation.returns[1]?.type !== 'I256'
  ) {
    throw new Error('Unexpected simulateSwap return values')
  }

  const amount0 = BigInt(rawSimulation.returns[0].value)
  const amount1 = BigInt(rawSimulation.returns[1].value)
  const inputDelta = zeroForOne ? amount0 : amount1
  const outputDelta = zeroForOne ? amount1 : amount0

  if (inputDelta !== amountIn) {
    throw new Error('Unexpected input delta')
  }

  if (outputDelta >= 0n) {
    throw new Error('Unexpected output delta sign')
  }

  const amountOut = -outputDelta

  console.log('Input:', formatUnits(amountIn, inputMeta.decimals), inputMeta.symbol)
  console.log('Output:', formatUnits(amountOut, outputMeta.decimals), outputMeta.symbol)
  console.log('Fee pips:', simulation.fee.toString())
  console.log('Simulation rows:', simulation.rows.length)
  console.log('Base sqrtPriceX96:', simulation.baseSqrtPriceX96.toString())
  console.log('Final sqrtPriceX96:', simulation.sqrtPriceX96.toString())
  console.log('Amount in raw:', amountIn.toString())
  console.log('Amount out raw:', amountOut.toString())
}

