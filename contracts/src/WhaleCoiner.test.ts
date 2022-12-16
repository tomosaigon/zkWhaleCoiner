import { WhaleCoiner, MyMerkleWitness, whaleTree, str2int, int2str } from './WhaleCoiner';
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
  Scalar,
} from 'snarkyjs';

/*
 * This file specifies how to test the `Add` example smart contract. It is safe to delete this file and replace
 * with your own tests.
 *
 * See https://docs.minaprotocol.com/zkapps for more info.
 */

let proofsEnabled = true;

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
    return;
    await localDeploy();
    const num = zkApp.num.get();
    expect(num).toEqual(Field(1));
  });

  it('correctly updates the num state on the `WhaleCoiner` smart contract', async () => {
    //return;
    await localDeploy();

    // update transaction
    const txn = await Mina.transaction(deployerAccount, () => {
      zkApp.update(Field(3));
    });
    await txn.prove();
    await txn.send();

    const updatedNum = zkApp.num.get();
    expect(updatedNum).toEqual(Field(4));
  });

  it('root calculates', async () => {
    //return;
    await localDeploy();

    expect(zkApp.num.get()).toEqual(Field(1));
    let staticRoot = Field(BigInt('25321076411253627146932089654484565121081622867262989611537313761204357221798'));
    expect(zkApp.commitment.get()).toEqual(staticRoot);

    const [Tree, _root] = whaleTree();

    // gets a plain witness for leaf at index
    const wit = Tree.getWitness(0n); // XXX search for pubkey
    //let w = Tree.getWitness(index);
    let witness = new MyMerkleWitness(wit);

    const tomoPub58 = 'B62qiVkf7fKpYyo1UMrHyYVaitGyYHogTuarN3f6gZsqoCatm1DEqXn';
    let tomoPub = PublicKey.fromBase58(tomoPub58);
    const whalePub = tomoPub;

    // ['24477892193998808799000634066449762880814816646318045663180199870979367583489',  '1']
    console.log(tomoPub.toFields().map(f => f.toJSON()));
    // what would happen inside
    const commitment = zkApp.commitment.get();
    console.log('current commitment.toString: ', commitment.toString());
    console.log('current commitment.toJSON: ', commitment.toJSON());
    console.log('_root.toJSON: ', _root.toJSON());
    //console.log('Tree[0]: ', Tree.getNode(...))

    // either problem in p.hash or w.calc. test hash
    console.log('pub as fields, json: ', whalePub.toFields(), whalePub.toJSON());

    const leafHash = Poseidon.hash(whalePub.toFields());
    console.log('normal leafHash: ', leafHash.toJSON());
    console.log('manual leafHash: ', Poseidon.hash([
      Field(BigInt('24477892193998808799000634066449762880814816646318045663180199870979367583489')),
      Field(1)
    ]).toJSON());
    console.log(witness.calculateRoot(leafHash).toString()); //.assertEquals(commitment);
    expect(witness.calculateRoot(leafHash)).toEqual(commitment);
  });
  it('correctly proves witness', async () => {
    //return;
    await localDeploy();
    //let whaleCoinerZKApp = new WhaleCoiner(PrivateKey.random().toPublicKey());

    const [Tree, _root] = whaleTree();

    const msg = CircuitString.fromString('Satoshi is a WhaleCoiner').toFields();
    console.log('msg: ', msg.toString().split(',').map(c => parseInt(c)).filter(c => c).map(c => String.fromCharCode(c)).join(''));

    const tomoPub58 = 'B62qiVkf7fKpYyo1UMrHyYVaitGyYHogTuarN3f6gZsqoCatm1DEqXn';
    let tomoPub = PublicKey.fromBase58(tomoPub58);

    const fooSig1 = Signature.fromJSON({
      r: '24756403745565155334343141240729212829194956404851084071603591710242651547325',
      s: '25284399962144351938259578951164638075292706477803146509961794774712565708371'
    })
    //tomoPub = fooKey.toPublicKey();

    const fromFieldsSig = Signature.fromFields([
      Field(BigInt("24756403745565155334343141240729212829194956404851084071603591710242651547325")),
      Field(BigInt("25284399962144351938259578951164638075292706477803146509961794774712565708371"))
    ]);
    const constructSig2 = new Signature(
      Field(BigInt("24756403745565155334343141240729212829194956404851084071603591710242651547325")),
      Scalar.fromJSON("25284399962144351938259578951164638075292706477803146509961794774712565708371")
    );
    // console.log(fooSig1.toJSON());
    // console.log(constructSig2.toJSON()); // <- seems to work
    // console.log(fromFieldsSig.toJSON()); <- Error: assert_equal: 0 != 1

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
    try {
      const tomoChecked = tomoSig.verify(tomoPub, msg);
      console.log('verify sig: ', tomoChecked.toBoolean(), " - ", tomoChecked.toString());
      expect(tomoChecked.toBoolean()).toBeTruthy();
    } catch (e) {
      console.log("sig verify excepted: ", e);
    }

    // gets a plain witness for leaf at index
    const wit = Tree.getWitness(0n); // XXX search for pubkey
    //let w = Tree.getWitness(index);
    let witness = new MyMerkleWitness(wit);

    const whalePub = tomoPub;
    // what would happen inside
    const commitment = zkApp.commitment.get();
    console.log('current commitment: ', commitment.toString());
    console.log('_root: ', _root.toString());
    //console.log('Tree[0]: ', Tree.getNode(...))
    const leafHash = Poseidon.hash(whalePub.toFields());
    console.log(witness.calculateRoot(leafHash).toString()); //.assertEquals(commitment);

    // call contract
    const asWhale = true;
    const asUI = !true;
    let txn;
    if (asWhale) {
      txn = await Mina.transaction(deployerAccount, () => {
        zkApp.wallAsWhale(
          commitment,
          whalePub,
          witness,
          constructSig2, //fooSig1, //broken(fromFieldsSig,//constructSig),//tomoSig,
          Field(str2int('satoshi rulz')),
        );
      });
      await txn.prove();
      await txn.send();

      const updatedMsg = zkApp.msg.get();
      console.log(int2str(updatedMsg.toBigInt()));
      expect(updatedMsg).toEqual(Field(str2int('satoshi rulz')));
    }
    if (asUI) {
      txn = await Mina.transaction(deployerAccount, () => {
        zkApp.wallfromUI(
          Field(str2int('satoshi still rulz')),
        );
      });
      await txn.prove();
      await txn.send();

      const updatedMsg = zkApp.msg.get();
      console.log(int2str(updatedMsg.toBigInt()));
      expect(updatedMsg).toEqual(Field(str2int('satoshi still rulz')));
    }
  });
});