import { web3, NodeProvider } from "@alephium/web3";
import { Powfi } from "@alephium/powfi-sdk";

const NODE_URL = "https://node.testnet.alephium.org";
const FACTORY = "29hdd9b9Gp7oXuamwHKfUqBaRXP487HoeTcutS3RhZJEj";

web3.setCurrentNodeProvider(new NodeProvider(NODE_URL));
const provider = web3.getCurrentNodeProvider();
const powfi = await Powfi.load({ networkId: "testnet" });

const page = await provider.events.getEventsContractContractaddress(
  FACTORY,
  { start: 0, limit: 100 }
);

const pairs = page.events.filter((event) => event.eventIndex === 0);

const ids = [...new Set(pairs.flatMap((event) => [event.fields[0].value, event.fields[1].value]))];
const tokens = new Map();
for (const id of ids) {
  const token = await powfi.token.getTokenById(id);
  tokens.set(id, token);
}

console.log("POWFI CPMM POOLS - TESTNET");
console.log();

for (const event of pairs) {
  const token0 = event.fields[0].value;
  const token1 = event.fields[1].value;
  const pair = event.fields[2].value;
  const number = event.fields[3].value;

  console.log(String(number).padStart(2), tokens.get(token0).symbol.padEnd(10), tokens.get(token1).symbol.padEnd(10), pair.slice(0, 12));
}

console.log();
console.log(pairs.length + " CPMM pools discovered");
console.log("READ ONLY - NO SIGNER - NO TRANSACTION");
