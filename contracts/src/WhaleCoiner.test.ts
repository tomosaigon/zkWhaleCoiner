import { WhaleCoiner, str2int, int2str } from './WhaleCoiner';
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
  Circuit,
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

/*
 * This file specifies how to test the `Add` example smart contract. It is safe to delete this file and replace
 * with your own tests.
 *
 * See https://docs.minaprotocol.com/zkapps for more info.
 */

let proofsEnabled = false;

describe('WhaleCoiner', () => {
  let deployerAccount: PrivateKey,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey,
    zkApp: WhaleCoiner;

  beforeAll(async () => {
    await isReady;
    if (proofsEnabled) WhaleCoiner.compile();
  });

  beforeEach(() => {
    const Local = Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(Local);
    deployerAccount = Local.testAccounts[0].privateKey;
    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkApp = new WhaleCoiner(zkAppAddress);
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
      zkApp.deploy({ zkappKey: zkAppPrivateKey });
    });
    await txn.prove();
    // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
    await txn.sign([zkAppPrivateKey]).send();
  }

  it('generates and deploys the `WhaleCoiner` smart contract', async () => {
    await localDeploy();
    const num = zkApp.num.get();
    expect(num).toEqual(Field(1));
  });

  it('correctly updates the num state on the `WhaleCoiner` smart contract', async () => {
    await localDeploy();

    // update transaction
    const txn = await Mina.transaction(deployerAccount, () => {
      zkApp.update(Field(3), /*UInt32.from(4),*/ zkAppAddress);
    });
    await txn.prove();
    await txn.send();

    const updatedNum = zkApp.num.get();
    expect(updatedNum).toEqual(Field(4));
  });

  it('correctly proves witness', async () => {
    await localDeploy();
    //let whaleCoinerZKApp = new WhaleCoiner(PrivateKey.random().toPublicKey());

    // Tree setup directly copied from contract
    // creates the corresponding MerkleWitness class that is circuit-compatible
    class MyMerkleWitness extends MerkleWitness(8) { }
    const Tree = new MerkleTree(8);

    for (const [i, whale] of whales.entries()) {
      if (whale.a.slice(0, 2) == 'B6') {
        Tree.setLeaf(BigInt(i), Poseidon.hash(PublicKey.fromBase58(whale.a).toFields()));
      }
    }

    // gets the current root of the tree
    const root = Tree.getRoot();

    // DOH fromString only looks at 1st char
    //const msg = [Character.fromString('Satoshi is a WhaleCoiner').toField()];
    const msg = CircuitString.fromString('Satoshi is a WhaleCoiner').toFields();
    console.log('msg: ',
      msg.toString().split(',').map(c => parseInt(c)).filter(c => c).map(c => String.fromCharCode(c)).join('')
    );


    let tomoPub = PublicKey.fromBase58('B62qiVkf7fKpYyo1UMrHyYVaitGyYHogTuarN3f6gZsqoCatm1DEqXn');

    const fooSig1 = Signature.fromJSON({
      r: '24756403745565155334343141240729212829194956404851084071603591710242651547325',
      s: '25284399962144351938259578951164638075292706477803146509961794774712565708371'
    })
    //tomoPub = fooKey.toPublicKey();


    const tomoSigAuro = Signature.fromJSON({
      r: "11149866380985503299463982621713898158386384905365504586658985081080436971813",
      s: "27805392407476107597780241785910086576642409128638979382253461373350709924352"
    });
    const tomoSigOwn = Signature.fromJSON({ // from own output - this works
      r: '19597419214007784520541222458812180796263440898540216855024484693705435829707',
      s: '7316405554577028087944612376616228839987633145296848809121625898802082544438'
    });
    const tomoNpmMinaSignerOut = {
      field: '8005018942614542706250585243584469278747533320709578447354802418704441457793',
      scalar: '9120404633846659608341680286080991228565833476950561366538862828260360631745'
    };
    //const tomoSig = Signature.fromJSON({ r: tomoNpmMinaSignerOut.field, s: tomoNpmMinaSignerOut.scalar });
    const tomoSig = fooSig1;


    const tomoChecked = tomoSig.verify(tomoPub, msg);
    console.log('verify sig: ', tomoChecked.toBoolean(), " - ", tomoChecked.toString());
    expect(tomoChecked.toBoolean()).toBeTruthy();

    // gets a plain witness for leaf at index
    const wit = Tree.getWitness(0n); // XXX search for pubkey
    //let w = Tree.getWitness(index);
    let witness = new MyMerkleWitness(wit);


    // call contract
    const txn = await Mina.transaction(deployerAccount, () => {
      //zkApp.update();
      // TODO add msg sig proving you're tomo0
      zkApp.wallAsWhale(
        //UInt32.from(0n),
        tomoPub,
        //witness,
        tomoSig,
        //UInt32.from(666),
        Field(str2int('satoshi rulz')),
      );

    });
    await txn.prove();
    await txn.send();

    // const updatedNum = zkApp.num.get();
    // const numOfBeast = 666;
    // expect(updatedNum).toEqual(Field(numOfBeast));

    const updatedMsg = zkApp.msg.get();
    expect(updatedMsg).toEqual(Field(str2int('satoshi rulz')));

    console.log(int2str(updatedMsg.toBigInt()));
  });



});
