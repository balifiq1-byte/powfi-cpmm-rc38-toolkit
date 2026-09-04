console.log(`POWFI CPMM RC38 TOOLKIT

Usage:
  npm run <COMMAND> [OPTIONS]

Commands:
  start       Read the live ALPH / BAAL pool
  simulate    Simulate a single swap
  quotes      Explore quotes for multiple swap sizes
  impact      Analyze price-impact thresholds
  pools       Discover CPMM pools
  validate    Validate discovered RC38 CPMM pools
  clmm-pools  Inspect RC38 CLMM pools (experimental)
  clmm-quote  Quote an RC38 CLMM swap (experimental)
  help        Show this menu

Command help:
  npm start -- --help
  npm run simulate -- --help
  npm run quotes -- --help
  npm run impact -- --help
  npm run pools
  npm run validate
  npm run clmm-pools
  npm run clmm-quote -- <tokenInId> <tokenOutId> <amount>

Quick examples:
  npm start
  npm run simulate -- 1 ALPH
  npm run simulate -- 100 BAAL
  npm run simulate -- 0.001 WETH WBTC
  npm run quotes -- ALPH 0.1 0.5 1 2 5
  npm run quotes -- WETH WBTC 0.001 0.005 0.01
  npm run impact -- ALPH
  npm run impact -- WETH WBTC
  npm run pools
  npm run validate
  npm run clmm-pools
  npm run clmm-quote -- <tokenInId> <tokenOutId> 0.1

Environment:
  Network: Alephium Testnet
  PowFi SDK: 0.0.1-rc.38
  Mode: READ ONLY

Safety:
  No wallet
  No signer
  No transaction

BAAL • ALEPHIUM UNDERGROUND ⛓️`)
