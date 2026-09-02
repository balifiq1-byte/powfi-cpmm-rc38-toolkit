# 😈 BAAL Testnet Starter

A minimal read-only example for exploring the live **ALPH / BAAL** pool on **PowFi / Alephium Testnet**.

## Environment

- PowFi SDK: `0.0.1-rc.38`
- Alephium web3: `3.0.3`
- Network: Alephium Testnet
- Mode: READ ONLY

## Install

    npm install

## Run

    npm start

The starter reads the live ALPH / BAAL pool and displays:

- ALPH reserve
- BAAL reserve
- BAAL/ALPH spot ratio
- ALPH/BAAL spot ratio

No wallet connection, signer, or transaction is required.

## Simulate a swap

Run a read-only PowFi CPMM quote:

    npm run simulate

By default, the example simulates:

    1 ALPH → BAAL

You can also choose the ALPH input amount:

    npm run simulate -- 0.1
    npm run simulate -- 5

Amounts support up to 18 decimal places.

It displays:

- expected BAAL output
- minimum output with 1% slippage
- price impact

The quote uses the live pool state through `powfi.cpmm.simSwap()`.

No wallet connection, signer, or transaction is required.

## BAAL Testnet

BAAL Token ID:

    72ff515813051a7d9dde6c63efb8ad4bc623a3577c5ecd6fc4e61ba24e87de00

ALPH / BAAL Pool ID:

    cde61aa8652e515ecbac0dfbf787bdb4d425462eb698f61bdda846939cbb0300

Pool address:

    28YhCKbTHgtAayhbse8pttPuPsrXxDmyNtw4pDYpbWnuV

## Builders

Install the exact SDK version used by the BAAL Testnet experiment:

    npm install --save-exact @alephium/powfi-sdk@0.0.1-rc.38

RC38 exposes PowFi tooling for CPMM, CLMM, staking and tokens.

This starter intentionally demonstrates only read-only pool interaction and swap simulation.

## Disclaimer

**TESTNET ONLY • EXPERIMENTAL • NO REAL VALUE**

Pool spot ratios are not valuations, price guarantees, or indications of realizable liquidity.

---

**BAAL•ALEPHIUM UNDERGROUND** 😈⛓️
