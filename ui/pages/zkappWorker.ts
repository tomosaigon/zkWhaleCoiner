import {
  Mina,
  isReady,
  PublicKey,
  PrivateKey,
  Field,
  UInt32,
  Signature,
  fetchAccount,
} from 'snarkyjs'
import { LedgerHash } from 'snarkyjs/dist/node/lib/encoding';

type Transaction = Awaited<ReturnType<typeof Mina.transaction>>;

// ---------------------------------------------------------------------------------------

import type { WhaleCoiner, MyMerkleWitness } from '../../contracts/src/WhaleCoiner';

const state = {
  WhaleCoiner: null as null | typeof WhaleCoiner,
  zkapp: null as null | WhaleCoiner,
  transaction: null as null | Transaction,
}

// ---------------------------------------------------------------------------------------

const functions = {
  loadSnarkyJS: async (args: {}) => {
    await isReady;
  },
  setActiveInstanceToBerkeley: async (args: {}) => {
    const Berkeley = Mina.BerkeleyQANet(
      "https://proxy.berkeley.minaexplorer.com/graphql"
    );
    Mina.setActiveInstance(Berkeley);
  },
  loadContract: async (args: {}) => {
    const { WhaleCoiner } = await import('../../contracts/build/src/WhaleCoiner.js');
    state.WhaleCoiner = WhaleCoiner;
  },
  compileContract: async (args: {}) => {
    await state.WhaleCoiner!.compile();
  },
  fetchAccount: async (args: { publicKey58: string }) => {
    const publicKey = PublicKey.fromBase58(args.publicKey58);
    return await fetchAccount({ publicKey });
  },
  initZkappInstance: async (args: { publicKey58: string }) => {
    const publicKey = PublicKey.fromBase58(args.publicKey58);
    state.zkapp = new state.WhaleCoiner!(publicKey);
  },
  getNum: async (args: {}) => {
    const currentNum = await state.zkapp!.num.get();
    return JSON.stringify(currentNum.toJSON());
  },
  getMsg: async (args: {}) => {
    const currentMsg = await state.zkapp!.msg.get();
    return JSON.stringify(currentMsg.toJSON());
  },
  createUpdateTransaction: async (args: {}) => {
    const transaction = await Mina.transaction(() => {
      state.zkapp!.update(Field(100), PublicKey.fromBase58('B62qiVkf7fKpYyo1UMrHyYVaitGyYHogTuarN3f6gZsqoCatm1DEqXn'));
    }
    );
    state.transaction = transaction;
  },
  proveUpdateTransaction: async (args: {}) => {
    await state.transaction!.prove();
  },
  
  // wallAsWhale(leafIdx: UInt32, whalePub: PublicKey, path: MyMerkleWitness, sig: Signature,  num: UInt32, wallMsg: Field) 
  createWallTransaction: async (args: { /*leafIdx: UInt32,*/ whalePubX: Field, whalePubIsOdd: Field, /*path: MyMerkleWitness,*/ sig: Signature, /*num: UInt32,*/ wallMsg: Field }) => {
    const transaction = await Mina.transaction(() => {
      console.log(args);
      console.log('maybe sig object not having verify');
      console.log(args.sig.verify);
      //console.log(args.whalePub.toJSON()); <- not a function
      //console.log(args.whalePub.toFields()); <<- not a function either
      // .toJSON  not a function?? console.log('scalar   s:', args.sig.s.toJSON());
      //state.zkapp!.wallAsWhale(/*args.leafIdx,*/ args.whalePub, /*args.path,*/ args.sig, /*args.num,*/ args.wallMsg);
      state.zkapp!.wallfromUI(args.whalePubIsOdd, args.whalePubX, args.sig.r, args.sig.s, args.wallMsg);
    }
    );
    state.transaction = transaction;
  },
  proveWallTransaction: async (args: {}) => {
    await state.transaction!.prove();
  },
  getTransactionJSON: async (args: {}) => {
    return state.transaction!.toJSON();
  },
};

// ---------------------------------------------------------------------------------------

export type WorkerFunctions = keyof typeof functions;

export type ZkappWorkerRequest = {
  id: number,
  fn: WorkerFunctions,
  args: any
}

export type ZkappWorkerReponse = {
  id: number,
  data: any
}
if (process.browser) {
  addEventListener('message', async (event: MessageEvent<ZkappWorkerRequest>) => {
    const returnData = await functions[event.data.fn](event.data.args);

    const message: ZkappWorkerReponse = {
      id: event.data.id,
      data: returnData,
    }
    postMessage(message)
  });
}
