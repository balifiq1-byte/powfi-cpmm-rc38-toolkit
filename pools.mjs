import { web3, NodeProvider } from "@alephium/web3";
import { Powfi } from "@alephium/powfi-sdk";

const NODE_URL = "https://node.testnet.alephium.org";
const FACTORY = "29hdd9b9Gp7oXuamwHKfUqBaRXP487HoeTcutS3RhZJEj";

web3.setCurrentNodeProvider(new NodeProvider(NODE_URL));
const provider = web3.getCurrentNodeProvider();
const powfi = await Powfi.load({ networkId: "testnet" });

const events = [];
let start = 0;

while (true) {
  const page = await provider.events.getEventsContractContractaddress(
    FACTORY,
    { start, limit: 100 }
  );

  events.push(...page.events);

  if (page.nextStart <= start || page.events.length === 0) {
    break;
  }

  start = page.nextStart;
}

const pairs = events.filter((event) => {
  if (event.eventIndex !== 0 || event.fields?.length !== 4) {
    return false;
  }

  const [token0, token1, pair, currentPairSize] = event.fields;

  return (
    token0.type === "ByteVec" &&
    token1.type === "ByteVec" &&
    pair.type === "ByteVec" &&
    currentPairSize.type === "U256"
  );
});

const ids = [...new Set(pairs.flatMap((event) => [event.fields[0].value, event.fields[1].value]))];
const tokens = new Map();

for (const id of ids) {
  try {
    const token = await powfi.token.getTokenById(id);
    tokens.set(id, token);
  } catch {
    try {
      const metadata = await provider.fetchFungibleTokenMetaData(id);

      tokens.set(id, {
        id,
        symbol: metadata.symbol,
        name: metadata.name,
        decimals: metadata.decimals
      });
    } catch {
      tokens.set(id, {
        id,
        symbol: id.slice(0, 12),
        name: "Unknown token",
        decimals: undefined
      });
    }
  }
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
