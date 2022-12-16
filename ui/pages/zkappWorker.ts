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
    //const currentNum = await state.zkapp!.num.get();
    const currentNum = await state.zkapp!.commitment.get(); // XXX
    return JSON.stringify(currentNum.toJSON());
  },
  getMsg: async (args: {}) => {
    const currentMsg = await state.zkapp!.msg.get();
    return JSON.stringify(currentMsg.toJSON());
  },
  createUpdateTransaction: async (args: {}) => {
    const transaction = await Mina.transaction(() => {
      state.zkapp!.update(Field(100));
    }
    );
    state.transaction = transaction;
  },
  proveUpdateTransaction: async (args: {}) => {
    await state.transaction!.prove();
  },
  
  // wallAsWhale(leafIdx: UInt32, whalePub: PublicKey, path: MyMerkleWitness, sig: Signature,  num: UInt32, wallMsg: Field) 
  createWallTransaction: async (args: { root: Field, whalePubX: Field, whalePubIsOdd: Field, path: MyMerkleWitness, sig: Signature, wallMsg: Field }) => {
    const transaction = await Mina.transaction(() => {
      state.zkapp!.wallfromUI(args.wallMsg);
      // createWallTransaction(root: Field, whalePubX: Field, whalePubIsOdd: Field, path: MyMerkleWitness, sig: Signature, wallMsg: Field)
      // TypeError: path.calculateRoot is not a function
      // state.zkapp!.wallAsWhale(args.root, PublicKey.fromFields([args.whalePubX, args.whalePubIsOdd]), args.path, args.sig, args.wallMsg);
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
