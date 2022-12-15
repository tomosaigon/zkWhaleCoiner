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
} from 'snarkyjs';
import whales from '../whales.json';

await isReady; // before new Field

// we need the initiate tree root in order to tell the contract about our off-chain storage
let initialCommitment: Field = Field(0);


// const treeHeight = 8;
// creates the corresponding MerkleWitness class that is circuit-compatible
class MyMerkleWitness extends MerkleWitness(8) { }



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
    this.num.set(Field(1));
    this.msg.set(Field(str2int('init')));
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
  }

  @method update() {
    const curNum = this.num.get();
    this.num.assertEquals(curNum); // precondition that links this.num.get() to the actual on-chain state
    const newState = curNum.add(2);
    this.num.set(newState);
  }

  // spray message on wall if you're whalish
  @method wallAsWhale(leafIdx: UInt32, whalePub: PublicKey, path: MyMerkleWitness, sig: Signature,  num: UInt32, wallMsg: Field) {
    // we fetch the on-chain commitment (root)
    let commitment = this.commitment.get();
    this.commitment.assertEquals(commitment);

    // we check that the account is within the committed Merkle Tree
    const leafHash = Poseidon.hash(whalePub.toFields());
    path.calculateRoot(leafHash).assertEquals(commitment);

    const msg = CircuitString.fromString('Satoshi is a WhaleCoiner').toFields();
    sig.verify(whalePub, msg).assertTrue();

    this.num.set(Field(num.toFields()[0]));
    this.msg.set(wallMsg); // str2int
  }

}

