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
} from 'snarkyjs';

await isReady; // before new Field

// we need the initiate tree root in order to tell the contract about our off-chain storage
let initialCommitment: Field = Field(0);


// const treeHeight = 8;
// creates the corresponding MerkleWitness class that is circuit-compatible
class MyMerkleWitness extends MerkleWitness(8) { }



const Tree = new MerkleTree(8);
// wholecoiner? whalecoiner
const whalecoiners = [
  { n: 'tomo1', a: 'B62qiVkf7fKpYyo1UMrHyYVaitGyYHogTuarN3f6gZsqoCatm1DEqXn' },
  { n: 'tomo2', a: 'B62qn4NJzttY3bCz7936z7YZYBAS68RXdRbLrkRFh2wNGyJ3PRVW8fx' },
  { n: 'CoinList', a: 'B62qmjZSQHakvWz7ZMkaaVW7ye1BpxdYABAMoiGk3u9bBaLmK5DJPkR' },
  { n: 'OKEX', a: 'B62qpWaQoQoPL5AGta7Hz2DgJ9CJonpunjzCGTdw8KiCCD1hX8fNHuR' },
  { n: 'Kraken', a: 'B62qkRodi7nj6W1geB12UuW2XAx2yidWZCcDthJvkf9G4A6G5GFasVQ' },
  { n: 'Binance', a: 'B62qrRvo5wngd5WA1dgXkQpCdQMRDndusmjfWXWT1LgsSFFdBS9RCsV' },
  { n: 'burn', a: 'B62qiburnzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzmp7r7UN6X' },
];
for (const [i, whale] of whalecoiners.entries()) {
  Tree.setLeaf(BigInt(i), Poseidon.hash(PublicKey.fromBase58(whale.a).toFields()));
}

// now that we got our accounts set up, we need the commitment to deploy our contract!
initialCommitment = Tree.getRoot();


/**
 * Basic Example
 * See https://docs.minaprotocol.com/zkapps for more info.
 *
 * The Add contract initializes the state variable 'num' to be a Field(1) value by default when deployed.
 * When the 'update' method is called, the Add contract adds Field(2) to its 'num' contract state.
 *
 * This file is safe to delete and replace with your own contract.
 */
export class Add extends SmartContract {
  @state(Field) num = State<Field>();
  // a commitment is a cryptographic primitive that allows us to commit to data, with the ability to "reveal" it later
  @state(Field) commitment = State<Field>();

  // SmartContract.init() is a new method on the base SmartContract that will be called only during the first deploy (not if you re-deploy later to upgrade the contract) 
  init() {
    super.init();
    this.num.set(Field(1));
  }

  // copied from LeaderBoard - remove args
  deploy(/*args: DeployArgs*/) {
    super.deploy(/*args*/);
    this.setPermissions({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
    });
    // unused: this.balance.addInPlace(UInt64.from(initialBalance));
    this.commitment.set(initialCommitment);
  }

  @method update() {
    const currentState = this.num.get();
    this.num.assertEquals(currentState); // precondition that links this.num.get() to the actual on-chain state
    const newState = currentState.add(2);
    this.num.set(newState);
  }


  beastNum() {
    return 666;
  }

  // spray message on wall if you're whalish
  @method wallAsWhale(leafIdx: UInt32, whalePub: PublicKey, path: MyMerkleWitness, msgNum: UInt32) {
    // we fetch the on-chain commitment
    let commitment = this.commitment.get();
    this.commitment.assertEquals(commitment);

    // we check that the account is within the committed Merkle Tree
    const leafHash = Poseidon.hash(whalePub.toFields());
    path.calculateRoot(leafHash).assertEquals(commitment);

    // gets the current root of the tree
    const root = Tree.getRoot();

    // gets a plain witness for leaf at index
    // TODO look up index by whalePub in Tree
    const wit = Tree.getWitness(leafIdx.toBigint());
    //let w = Tree.getWitness(index);
    let witness = new MyMerkleWitness(wit);

    // calculates the root of the witness
    const calculatedRoot = witness.calculateRoot(leafHash);

    calculatedRoot.assertEquals(root);

    // fake msg - updates 'wall msg' to the beast
    //this.num.set(Field(666));
    this.num.set(Field(msgNum.toBigint()));
  }

}

