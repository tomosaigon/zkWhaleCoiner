import { Add } from './Add';
import {
  isReady,
  shutdown,
  Field,
  Mina,
  PrivateKey,
  PublicKey,
  AccountUpdate,
  MerkleTree,
  MerkleWitness,
  Poseidon,
  UInt32,
  Signature,
  CircuitString,
  Character,
} from 'snarkyjs';

/*
 * This file specifies how to test the `Add` example smart contract. It is safe to delete this file and replace
 * with your own tests.
 *
 * See https://docs.minaprotocol.com/zkapps for more info.
 */

let proofsEnabled = false;

describe('Add', () => {
  let deployerAccount: PrivateKey,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey,
    zkApp: Add;

  beforeAll(async () => {
    await isReady;
    if (proofsEnabled) Add.compile();
  });

  beforeEach(() => {
    const Local = Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(Local);
    deployerAccount = Local.testAccounts[0].privateKey;
    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkApp = new Add(zkAppAddress);
  });

  afterAll(() => {
    // `shutdown()` internally calls `process.exit()` which will exit the running Jest process early.
    // Specifying a timeout of 0 is a workaround to defer `shutdown()` until Jest is done running all tests.
    // This should be fixed with https://github.com/MinaProtocol/mina/issues/10943
    setTimeout(shutdown, 0);
  });

  async function localDeploy() {
    const txn = await Mina.transaction(deployerAccount, () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      zkApp.deploy();
    });
    await txn.prove();
    // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
    await txn.sign([zkAppPrivateKey]).send();
  }

  it('generates and deploys the `Add` smart contract', async () => {
    await localDeploy();
    const num = zkApp.num.get();
    expect(num).toEqual(Field(1));
  });

  it('correctly updates the num state on the `Add` smart contract', async () => {
    await localDeploy();

    // update transaction
    const txn = await Mina.transaction(deployerAccount, () => {
      zkApp.update();
    });
    await txn.prove();
    await txn.send();

    const updatedNum = zkApp.num.get();
    expect(updatedNum).toEqual(Field(3));
  });

  it('correctly proves witness', async () => {
    await localDeploy();
    //let addZKApp = new Add(PrivateKey.random().toPublicKey());

    // Tree setup directly copied from contract
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

    // gets the current root of the tree
    const root = Tree.getRoot();

    // r = field, s = scalar
    //   const sig = Signature.fromJSON(`{
    //     "r": "11149866380985503299463982621713898158386384905365504586658985081080436971813",
    //     "s": "27805392407476107597780241785910086576642409128638979382253461373350709924352"
    // }`);
    const sig = new Signature(
      Field("11149866380985503299463982621713898158386384905365504586658985081080436971813"),
      Field("27805392407476107597780241785910086576642409128638979382253461373350709924352"));
    const msg = Character.fromString('Satoshi is a WhaleCoiner').toField();
    const point = PublicKey.fromBase58(whalecoiners[0].a).toGroup();
    const foo = Poseidon.hash([Field(1234)]);
    Poseidon.hash([Field(1234)]); //.concat([point.x, point.y, sig.r]));
    //Poseidon.hash(msg.concat([point.x, point.y, this.r])).toBits()
    Poseidon.hash([Field(1234)].concat([point.x, point.y]));
    console.log("check if sig.r isConstant: ", sig.r.isConstant());
    Poseidon.hash([Field(1234)].concat([point.x, point.y, sig.r])).toBits();
    try {


      const checked = sig.verify(PublicKey.fromBase58(whalecoiners[0].a), [msg]);
      expect(checked).toBeTruthy();
    } catch (e) {
      console.log("sig failed, ", e);
    }


    //const x = Field(2);
    //const c = Character.fromString('a');

    // gets a plain witness for leaf at index
    const wit = Tree.getWitness(0n);
    //let w = Tree.getWitness(index);
    let witness = new MyMerkleWitness(wit);


    // call contract
    const txn = await Mina.transaction(deployerAccount, () => {
      //zkApp.update();
      // TODO add msg sig proving you're tomo0
      zkApp.wallAsWhale(
        UInt32.from(0n),
        PublicKey.fromBase58('B62qiVkf7fKpYyo1UMrHyYVaitGyYHogTuarN3f6gZsqoCatm1DEqXn'),
        witness
      );

    });
    await txn.prove();
    await txn.send();

    const updatedNum = zkApp.num.get();
    const numOfBeast = zkApp.beastNum();
    expect(updatedNum).toEqual(Field(numOfBeast));
  });



});
