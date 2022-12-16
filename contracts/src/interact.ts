/**
 * This script can be used to interact with the Add contract, after deploying it.
 *
 * We call the update() method on the contract, create a proof and send it to the chain.
 * The endpoint that we interact with is read from your config.json.
 *
 * This simulates a user interacting with the zkApp from a browser, except that here, sending the transaction happens
 * from the script and we're using your pre-funded zkApp account to pay the transaction fee. In a real web app, the user's wallet
 * would send the transaction and pay the fee.
 *
 * To run locally:
 * Build the project: `$ npm run build`
 * Run with node:     `$ node build/src/interact.js <network>`.
 */
import {
  Mina, PrivateKey, shutdown, Field,
  UInt32,
  MerkleTree,
  MerkleWitness,
  Poseidon,
  Signature,
  PublicKey,
  Scalar,
} from 'snarkyjs';
import fs from 'fs/promises';
import { WhaleCoiner } from './WhaleCoiner.js';
const whales = [
  { "n": "tomo1", "a": "B62qiVkf7fKpYyo1UMrHyYVaitGyYHogTuarN3f6gZsqoCatm1DEqXn" },
  { "n": "tomo2", "a": "B62qn4NJzttY3bCz7936z7YZYBAS68RXdRbLrkRFh2wNGyJ3PRVW8fx" },
  { "n": "berkeley-unknown", "a": "B62qmQsEHcsPUs5xdtHKjEmWqqhUPRSF2GNmdguqnNvpEZpKftPC69e" },
  { "n": "mina-1", "a": "B62qptmpH9PVe76ZEfS1NWVV27XjZJEJyr8mWZFjfohxppmS11DfKFG" },
  { "n": "CoinList", "a": "B62qmjZSQHakvWz7ZMkaaVW7ye1BpxdYABAMoiGk3u9bBaLmK5DJPkR" },
  { "n": "mina-3", "a": "B62qkNc4ZXoPyK8PkYt3rN6PuLVvCnojmkP2j5Vh3CqHUSJ8s5BbxAM" },
  { "n": "OKEX", "a": "B62qpWaQoQoPL5AGta7Hz2DgJ9CJonpunjzCGTdw8KiCCD1hX8fNHuR" },
  { "n": "mina-5", "a": "B62qq8sm8HemutQiT6VuDKNWKLAi1Tvz1jrnttVajpL8zdaXMq6M9gu" },
  { "n": "Kraken", "a": "B62qkRodi7nj6W1geB12UuW2XAx2yidWZCcDthJvkf9G4A6G5GFasVQ" },
  { "n": "Binance", "a": "B62qrRvo5wngd5WA1dgXkQpCdQMRDndusmjfWXWT1LgsSFFdBS9RCsV" },
  { "n": "burn", "a": "B62qiburnzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzmp7r7UN6X" },
  { "n": "btc-Binance-cold", "a": "34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo" },
  { "n": "btc-Bitfinex-cold", "a": "bc1qgdjqv0av3q56jvd82tkdjpy7gdp9ut8tlqmgrpmv24sq90ecnvqqjwvw97" },
  { "n": "btc-unknown", "a": "1LQoWist8KkaUXSPKZHNvEyfrEkPHzSsCd" }
];

// check command line arg
let network = process.argv[2];
if (!network)
  throw Error(`Missing <network> argument.

Usage:
node build/src/interact.js <network>

Example:
node build/src/interact.js berkeley
`);
Error.stackTraceLimit = 1000;

// parse config and private key from file
type Config = { networks: Record<string, { url: string; keyPath: string }> };
let configJson: Config = JSON.parse(await fs.readFile('config.json', 'utf8'));
let config = configJson.networks[network];
let key: { privateKey: string } = JSON.parse(
  await fs.readFile(config.keyPath, 'utf8')
);
let zkAppKey = PrivateKey.fromBase58(key.privateKey);

// set up Mina instance and contract we interact with
const Network = Mina.Network(config.url);
Mina.setActiveInstance(Network);
let zkAppAddress = zkAppKey.toPublicKey();
let zkApp = new WhaleCoiner(zkAppAddress);

// compile the contract to create prover keys
console.log('compile the contract...');
await WhaleCoiner.compile();

// call update() and send transaction
console.log('build transaction and create proof...');
let tx = await Mina.transaction({ feePayerKey: zkAppKey, fee: 0.1e9 }, () => {

  class MyMerkleWitness extends MerkleWitness(8) { }
  const Tree = new MerkleTree(8);

  for (const [i, whale] of whales.entries()) {
    if (whale.a.slice(0, 2) == 'B6') {
      Tree.setLeaf(BigInt(i), Poseidon.hash(PublicKey.fromBase58(whale.a).toFields()));
    }
  }
  const wit = Tree.getWitness(0n); // XXX search for pubkey
  //let w = Tree.getWitness(index);
  let witness = new MyMerkleWitness(wit);
  const sig = Signature.fromJSON({
    r: '24756403745565155334343141240729212829194956404851084071603591710242651547325',
    s: '25284399962144351938259578951164638075292706477803146509961794774712565708371',
  })
  const wallMsg = Field(0x696e6e6974); // 'innit'
                        //696e6e6974

  // this works
  // zkApp.update(Field(69), /*UInt32.from(1),*/ zkAppAddress);

  // Error: ("Error: assert_equal: 25321076411253627146932089654484565121081622867262989611537313761204357221798 != 0")
  //zkApp.wallAsWhale(PublicKey.fromBase58('B62qiVkf7fKpYyo1UMrHyYVaitGyYHogTuarN3f6gZsqoCatm1DEqXn'), witness, sig, wallMsg);

  // "message": "Couldn't send zkApp command: (Verification_failed Invalid_proof)",
  //zkApp.wallAsWhale(PublicKey.fromBase58('B62qiVkf7fKpYyo1UMrHyYVaitGyYHogTuarN3f6gZsqoCatm1DEqXn'), /*witness,*/ sig, wallMsg);

  const tomoPub58 = 'B62qiVkf7fKpYyo1UMrHyYVaitGyYHogTuarN3f6gZsqoCatm1DEqXn';
  const whalePub = PublicKey.fromBase58(tomoPub58);
  // zkApp.wallAsWhale(whalePub, witness, sig, wallMsg);
  zkApp.wallfromUI(wallMsg);
  // zkApp.wallfromUI(whalePub.toFields()[0], whalePub.toFields()[1], 
  //   Field(BigInt("24756403745565155334343141240729212829194956404851084071603591710242651547325")),
  //   Scalar.fromJSON("25284399962144351938259578951164638075292706477803146509961794774712565708371"),
  //   wallMsg);
  // Account_app_state_0_precondition_unsatisfied - with zk app addy https://berkeley.minaexplorer.com/transaction/CkpZwLGpLnajgfnaMT7PJeyWcqqggMnMmoYArbiaqr5miEXK1aomx
  //zkApp.wallAsWhale(PublicKey.fromBase58('B62qiVkf7fKpYyo1UMrHyYVaitGyYHogTuarN3f6gZsqoCatm1DEqXn'), witness, sig, wallMsg);
});
await tx.prove();
console.log('send transaction...');
let sentTx = await tx.send();

if (sentTx.hash() !== undefined) {
  console.log(`
Success! Update transaction sent.

Your smart contract state will be updated
as soon as the transaction is included in a block:
https://berkeley.minaexplorer.com/transaction/${sentTx.hash()}
`);
}
shutdown();
