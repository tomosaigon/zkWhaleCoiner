import {
  Field, SmartContract, state, State, method,
  Permissions,
  DeployArgs,
  UInt32,
  UInt64,
  PublicKey,
  MerkleTree,
  MerkleWitness,
  Poseidon,
  isReady,
  PrivateKey,
  CircuitString,
  Signature,
  Bool,
  Scalar,
} from 'snarkyjs';
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

await isReady; // before new Field

// we need the initiate tree root in order to tell the contract about our off-chain storage
let initialCommitment: Field = Field(0);


// const treeHeight = 8;
// creates the corresponding MerkleWitness class that is circuit-compatible
export class MyMerkleWitness extends MerkleWitness(8) { }



const Tree = new MerkleTree(8);

for (const [i, whale] of whales.entries()) {
  if (whale.a.slice(0, 2) == 'B6') {
    Tree.setLeaf(BigInt(i), Poseidon.hash(PublicKey.fromBase58(whale.a).toFields()));
  }
}

// now that we got our accounts set up, we need the commitment to deploy our contract!
initialCommitment = Tree.getRoot();

export function str2int(str: string) {
  return BigInt('0x' + str.split('').map(char => char.charCodeAt(0).toString(16)).join(''));
}
export function int2str(n: bigint) {
  const hex = n.toString(16);
  let s = '';
  for (let idx = 0; idx < hex.length; idx += 2) {
    s += String.fromCharCode(parseInt(hex.slice(idx, idx + 2), 16));
  }
  return s;
}
/**
 * Basic Example
 * See https://docs.minaprotocol.com/zkapps for more info.
 *
 * The Add contract initializes the state variable 'num' to be a Field(1) value by default when deployed.
 * When the 'update' method is called, the Add contract adds Field(2) to its 'num' contract state.
 *
 * This file is safe to delete and replace with your own contract.
 */
export class WhaleCoiner extends SmartContract {
  @state(Field) num = State<Field>();
  @state(Field) msg = State<Field>(); // BigInt of ASCII to hex
  // a commitment is a cryptographic primitive that allows us to commit to data, with the ability to "reveal" it later
  @state(Field) commitment = State<Field>();

  // SmartContract.init() is a new method on the base SmartContract that will be called only during the first deploy (not if you re-deploy later to upgrade the contract) 
  init() {
    super.init();
  }

  // copied from LeaderBoard - remove args
  deploy(args: DeployArgs) {
    super.deploy(args);
    this.setPermissions({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
    });
    // unused: this.balance.addInPlace(UInt64.from(initialBalance));
    this.commitment.set(initialCommitment);

    // moved from init
    this.num.set(Field(1));
    this.msg.set(Field(str2int('init')));
  }

  @method update(newNum: Field) {
    const curNum = this.num.get();
    this.num.assertEquals(curNum); // precondition that links this.num.get() to the actual on-chain state
    const newState = newNum.add(1);
    this.num.set(newState);
  }

  // Keep in mind that all functions used inside your smart contract must operate on SnarkyJS compatible data types (e.g. Fields and other types built on top of Fields).

  // spray message on wall if you're whalish
  @method wallAsWhale(whalePub: PublicKey, path: MyMerkleWitness, sig: Signature, wallMsg: Field) {
    // we fetch the on-chain commitment (root)
    let commitment = this.commitment.get();
    this.commitment.assertEquals(commitment);

    // // we check that the account is within the committed Merkle Tree
    const leafHash = Poseidon.hash(whalePub.toFields());
    path.calculateRoot(leafHash).assertEquals(commitment);

    const msg = CircuitString.fromString('Satoshi is a WhaleCoiner').toFields();

    sig.verify(whalePub, msg).assertTrue();

    //this.num.set(Field(num.toFields()[0]));
    this.msg.set(wallMsg); // str2int
  }

  @method wallfromUI(wallMsg: Field) {
    // we fetch the on-chain commitment (root)
    let commitment = this.commitment.get();
    this.commitment.assertEquals(commitment);

    // // we check that the account is within the committed Merkle Tree
    // const leafHash = Poseidon.hash(whalePub.toFields());
    // path.calculateRoot(leafHash).assertEquals(commitment);

    /* maybe  try
    // check the initial state matches what we expect
    const rootBefore = leafWitness.calculateRoot(numberBefore);
    rootBefore.assertEquals(initialRoot);
    */
   
    // const msg = CircuitString.fromString('Satoshi is a WhaleCoiner').toFields();

    // const sig = new Signature(r, s);
    // this fails on assertTrue: const sig = Signature.fromFields([r, s]);
      // also fails on assert: const sig = Signature.fromFields([s, r]);
    // //    Field(BigInt("11149866380985503299463982621713898158386384905365504586658985081080436971813")),
    // //    Field(BigInt("27805392407476107597780241785910086576642409128638979382253461373350709924352"))
    // // );

    // this works
    // const sig = Signature.fromJSON({
    //   r: '24756403745565155334343141240729212829194956404851084071603591710242651547325',
    //   s: '25284399962144351938259578951164638075292706477803146509961794774712565708371'
    // })

    // Signature constructor called with 1 arguments, but expected 2: const sig = new Signature([r, s]);
    // this works.. but may cause: Error: Can't evaluate prover code outside an as_prover block
    //const sig = Signature.fromJSON({r: r.toString(), s: s.toString()});

    // try interact even though assert fails - at least this deploys
    // const sig = Signature.fromFields([
    //    Field(BigInt("11149866380985503299463982621713898158386384905365504586658985081080436971813")),
    //    Field(BigInt("27805392407476107597780241785910086576642409128638979382253461373350709924352"))
    // ]);

    // passed in PublicKey object from UI missing .toGroup.
    // base58 string not provable. try field[]. array not provable either.
    // const whalePub = PublicKey.fromFields([whalePubIsOdd, whalePubX]); // reversed
    

    // const sig = new Signature(
    //   r,//Field(BigInt("24756403745565155334343141240729212829194956404851084071603591710242651547325")),
    //   s,//Scalar.fromJSON("25284399962144351938259578951164638075292706477803146509961794774712565708371")
    // );
    // sig.verify(whalePub, msg).assertTrue();

    //this.num.set(Field(num.toFields()[0]));
    this.msg.set(wallMsg); // str2int
  }

}

