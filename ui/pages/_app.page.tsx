import Head from 'next/head';
import Image from 'next/image';
import styles from '../styles/Home.module.css';
import '../styles/globals.css'
import type { AppProps } from 'next/app'

import './reactCOIServiceWorker';
import whales from '../../contracts/whales.json';

// copied from example
import { useEffect, useState } from "react";
// need to copy
import ZkappWorkerClient from './zkappWorkerClient';

import {
  PublicKey,
  PrivateKey,
  Field,
  UInt32,
  Signature,
  MerkleTree,
  MerkleWitness,
  Poseidon,
} from 'snarkyjs'
import { sign } from 'crypto';
import { WhaleCoiner } from '../../contracts/build/src';

// XXX copy code here for now
//import { MyMerkleWitness, str2int, int2str } from '../../contracts/src/WhaleCoiner';
// You may need an appropriate loader to handle this file type, currently no loaders are configured to process this file. See https://webpack.js.org/concepts#loaders
class MyMerkleWitness extends MerkleWitness(8) { }
function str2int(str: string) {
  return BigInt('0x' + str.split('').map(char => char.charCodeAt(0).toString(16)).join(''));
}
function int2str(n: bigint) {
  const hex = n.toString(16);
  let s = '';
  for (let idx = 0; idx < hex.length; idx += 2) {
    s += String.fromCharCode(parseInt(hex.slice(idx, idx + 2), 16));
  }
  return s;
}



let transactionFee = 0.1;
// end copy


// TODO fetch and pass in committed merkle root
function SignedMessage(props: any) {
  let [newSig, setSig] = useState({ r: '', s: '' });
  let [newAddr, setAddr] = useState('');
  const whaleMsg = 'Satoshi is a WhaleCoiner';
  let [query, setQuery] = useState('');
  let [searchResults, setSearchResults] = useState(['']);
  const whaleSearch = () => setSearchResults(whales.filter(w => w.a.search(query) != -1).map(w => w.a));
  let [newWallMsg, setWallMsg] = useState('');


  return <div className={styles.container}>

    <div className={styles.container} style={{ backgroundColor: 'yellow' }}>
      <h2>This message currently appears on the sacred WhaleCoiners Wall:</h2>
      <div className={styles.card}>
        <h1><code>{props.wallMsg ? int2str(props.wallMsg.toBigInt()) : 'loading wall msg...'}</code></h1>
        <span>your msg: {newWallMsg}</span>
      </div>
      <p>Only WhaleCoiners can write to this wall. We don't know who wrote on the wall,
        only that they proved they were a WhaleCoiner. By the magic of zero knowledge proofs.</p>
    </div>

    <div className={styles.container} style={{ backgroundColor: 'violet' }}>
      <h3>Check if an address is in the computed WhaleCoiners list which hashes to this Merkle tree root:</h3>
      <div className={styles.code}>
        11498032990274737164207907745577872827449729229431235048917552227435182651432
      </div>
      <p>List has been pre-computed and can be
        verified here: <a href="https://nftstorage.link/ipfs/bafkreig6xuovd5lqxaalr4bx6bj6oeuufy77nngq2gq5ciciisp7ttmbay">ipfs://bafkreig6xuovd5lqxaalr4bx6bj6oeuufy77nngq2gq5ciciisp7ttmbay</a></p>
      <div className={styles.card} style={{maxWidth:'100%'}}>
        <input onChange={(e) => setQuery(e.target.value)} value={query} />
        <button onClick={whaleSearch}>Search substring</button>
      
        <h3>Search results</h3>
        <div className={styles.code}>
          <code>
            {searchResults.join('\n')}
          </code>
        </div>
      </div>
    </div>

    <div className={styles.container} style={{ backgroundColor: 'cyan' }}>
      <h2>Prove you're a Whale by signing the following message</h2>
      <span>```</span>
      <div className={styles.code}>Satoshi is a WhaleCoiner</div>
      <span>```</span>
      <p>Copy the message text above and sign it with your Bitcoin, Ethereum,
        or Mina (depending on compatibility) wallet using an address/public key
        listed in the WhaleCoiner database.
      </p>
    </div>

    <div className={styles.container} style={{ backgroundColor: 'beige' }}>
      <h2>Your Signature</h2>
      <div>
        <label>
          Public Key (address):
          <input name="field" value={newAddr} style={{ width: '100%' }} onChange={(e) => setAddr(e.target.value)} />
        </label>
      </div>      <div>
        <label>
          field (r):
          <input name="field" value={newSig.r} style={{ width: '100%' }} onChange={(e) => setSig({ r: e.target.value, s: newSig.s })} />
        </label>
      </div>
      <div>
        <label>
          scalar (s):
          <input name="scalar" value={newSig.s} style={{ width: '100%' }} onChange={(e) => setSig({ r: newSig.r, s: e.target.value })} />
        </label>
      </div>
      <div className={styles.card}>
        <button onClick={async () => {
          const mina = (window as any).mina;
          setAddr((await mina.requestAccounts())[0]);
          let res = await mina.signMessage({ message: whaleMsg, });
          console.log(res);
          setSig({ r: res.signature.field, s: res.signature.scalar });
        }}>Sign message via connected Auro</button>
        <button onClick={() => {
          setAddr('B62qiVkf7fKpYyo1UMrHyYVaitGyYHogTuarN3f6gZsqoCatm1DEqXn');
          setSig({ r: '24756403745565155334343141240729212829194956404851084071603591710242651547325', s: '25284399962144351938259578951164638075292706477803146509961794774712565708371' });
        }}>Test sign</button>
      </div>
    </div>

    <div className={styles.container} style={{ backgroundColor: 'gold' }}>
      <h2>Write your message on the wall</h2>
      <div>
        <label>
          Your new message:
          <input name="field" value={newWallMsg} style={{ width: '100%' }} onChange={(e) => setWallMsg(e.target.value)} />
        </label>
      </div>

      <div className={styles.card}>
        <button onClick={async () => {
          /*
          const mina = (window as any).mina;
          let res = await mina.signMessage({ message: whaleMsg, });
          console.log(res);
          setSig({ r: res.signature.field, s: res.signature.scalar });
          */
          // createWallTransaction(leafIdx: UInt32, whalePub: PublicKey, path: MyMerkleWitness, sig: Signature, num: UInt32, wallMsg: Field) 

          const leafIdx = new UInt32(0);
          const whalePub = PublicKey.fromBase58(newAddr);
          console.log(whalePub);
          const [whalePubX, whalePubIsOdd] = whalePub.toFields(); 
          const Tree = new MerkleTree(8);
          let nextIdx = 0;
          for (const [i, whale] of whales.entries()) {
            if (whale.a.slice(0, 2) == 'B6') {
              Tree.setLeaf(BigInt(nextIdx), Poseidon.hash(PublicKey.fromBase58(whale.a).toFields()));
              nextIdx++;
            }
          }
          // gets a plain witness for leaf at index
          // TypeError: this.value.toBigInt is not a function
          // const wit = Tree.getWitness(leafIdx.toBigint()); // XXX search for pubkey for leafIdx
          const wit = Tree.getWitness(BigInt(0n));
          const path = new MyMerkleWitness(wit);
          const sig = Signature.fromJSON({ r: newSig.r, s: newSig.s });
          const num = new UInt32(123);
          const wallMsg = Field(str2int(newWallMsg));

          // const onSendWallTransaction = async (leafIdx: UInt32, whalePub: PublicKey, path: MyMerkleWitness, sig: Signature, num: UInt32, wallMsg: Field) 
          props.onSendWallTransaction(leafIdx, whalePubX, whalePubIsOdd, path, sig, num, wallMsg);
        }}>Write on wall</button>
        <button onClick={() => props.onSendWallTransaction()} >click me</button>
      </div>

    </div>

  </div>

}
export default function App({ Component, pageProps }: AppProps) {
  // original not from example
  // return <Component {...pageProps} />



  let [state, setState] = useState({
    zkappWorkerClient: null as null | ZkappWorkerClient,
    hasWallet: null as null | boolean,
    hasBeenSetup: false,
    accountExists: false,
    currentNum: null as null | Field,
    currentMsg: null as null | Field,
    publicKey: null as null | PublicKey,
    zkappPublicKey: null as null | PublicKey,
    creatingTransaction: false,
  });
  let [sig, setSig] = useState({ r: 'field number', s: 'scalar' });

  // -------------------------------------------------------
  // Do Setup

  useEffect(() => {
    (async () => {
      if (!state.hasBeenSetup) {
        const zkappWorkerClient = new ZkappWorkerClient();

        console.log('Loading SnarkyJS...');
        await zkappWorkerClient.loadSnarkyJS();
        console.log('done');

        await zkappWorkerClient.setActiveInstanceToBerkeley();

        const mina = (window as any).mina;

        if (mina == null) {
          setState({ ...state, hasWallet: false });
          return;
        }

        const publicKeyBase58: string = (await mina.requestAccounts())[0];
        const publicKey = PublicKey.fromBase58(publicKeyBase58);

        console.log('using key', publicKey.toBase58());

        console.log('checking if account exists...');
        const res = await zkappWorkerClient.fetchAccount({ publicKey: publicKey! });
        const accountExists = res.error == null;

        await zkappWorkerClient.loadContract();

        console.log('compiling zkApp');
        await zkappWorkerClient.compileContract();
        console.log('zkApp compiled');

        // Berkeley Testnet B62qisn669bZqsh8yMWkNyCA7RvjrL6gfdr3TQxymDHNhTc97xE5kNV
        const zkAppAddress = 'B62qpJ4WFdXbah1TMnctXq2Hmsv4mEgr16BZgTCkNLY6uLw4VcsjDPY';
        const zkappPublicKey = PublicKey.fromBase58(zkAppAddress);

        await zkappWorkerClient.initZkappInstance(zkappPublicKey);

        console.log('getting zkApp state...');
        await zkappWorkerClient.fetchAccount({ publicKey: zkappPublicKey })
        const currentNum = await zkappWorkerClient.getNum();
        console.log('current state:', currentNum.toString());
        const currentMsg = await zkappWorkerClient.getMsg();
        console.log('current state:', currentNum.toString());

        setState({
          ...state,
          zkappWorkerClient,
          hasWallet: true,
          hasBeenSetup: true,
          publicKey,
          zkappPublicKey,
          accountExists,
          currentNum,
          currentMsg,
        });
      }
    })();
  }, []);

  // -------------------------------------------------------
  // Wait for account to exist, if it didn't

  useEffect(() => {
    (async () => {
      if (state.hasBeenSetup && !state.accountExists) {
        for (; ;) {
          console.log('checking if account exists...');
          const res = await state.zkappWorkerClient!.fetchAccount({ publicKey: state.publicKey! })
          const accountExists = res.error == null;
          if (accountExists) {
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
        setState({ ...state, accountExists: true });
      }
    })();
  }, [state.hasBeenSetup]);

  // -------------------------------------------------------
  // Send a transaction

  const onSendTransaction = async () => {
    setState({ ...state, creatingTransaction: true });
    console.log('sending a transaction...');

    await state.zkappWorkerClient!.fetchAccount({ publicKey: state.publicKey! });

    await state.zkappWorkerClient!.createUpdateTransaction();

    console.log('creating proof...');
    await state.zkappWorkerClient!.proveUpdateTransaction();

    console.log('getting Transaction JSON...');
    const transactionJSON = await state.zkappWorkerClient!.getTransactionJSON()

    console.log('requesting send transaction...');
    const { hash } = await (window as any).mina.sendTransaction({
      transaction: transactionJSON,
      feePayer: {
        fee: transactionFee,
        memo: '',
      },
    });
    console.log(
      'See transaction at https://berkeley.minaexplorer.com/transaction/' + hash
    );

    setState({ ...state, creatingTransaction: false });
  }

  
  const onSendWallTransaction = async (leafIdx: UInt32, whalePubX: Field, whalePubIsOdd: Field, path: MyMerkleWitness, sig: Signature, num: UInt32, wallMsg: Field) => {
    setState({ ...state, creatingTransaction: true });
    console.log(leafIdx, whalePubX, whalePubIsOdd, path, sig, num, wallMsg);


    const zkAppAddress = 'B62qpJ4WFdXbah1TMnctXq2Hmsv4mEgr16BZgTCkNLY6uLw4VcsjDPY';
    // const tx = await (window as any).mina.transaction(() => {
    //   // error - unhandledRejection: ReferenceError: Blob is not defined
    //   //const ContractInstance = new WhaleCoiner(PublicKey.fromBase58(zkAppAddress));
    //   //ContractInstance.wallAsWhale(whalePub, sig, wallMsg);
    // });

    //return;
    console.log('sending a wall transaction...');

    await state.zkappWorkerClient!.fetchAccount({ publicKey: state.publicKey! });

    // createWallTransaction(leafIdx: UInt32, whalePub: PublicKey, path: MyMerkleWitness, sig: Signature, num: UInt32, wallMsg: Field) 
    // args: { leafIdx: UInt32, whalePub: PublicKey, path: MyMerkleWitness, sig: Signature, num: UInt32, wallMsg: Field }
    await state.zkappWorkerClient!.createWallTransaction(wallMsg);

    console.log('creating proof...');
    await state.zkappWorkerClient!.proveWallTransaction();

    console.log('getting Transaction JSON...');
    const transactionJSON = await state.zkappWorkerClient!.getTransactionJSON()

    console.log('requesting send transaction...');
    const { hash } = await (window as any).mina.sendTransaction({
      transaction: transactionJSON,
      feePayer: {
        fee: transactionFee,
        memo: '',
      },
    });

    console.log(
      'See transaction at https://berkeley.minaexplorer.com/transaction/' + hash
    );

    setState({ ...state, creatingTransaction: false });
  }

  // -------------------------------------------------------
  // Refresh the current state

  const onRefreshCurrentNum = async () => {
    console.log('getting zkApp state...');
    await state.zkappWorkerClient!.fetchAccount({ publicKey: state.zkappPublicKey! })
    const currentNum = await state.zkappWorkerClient!.getNum();
    console.log('current state:', currentNum.toString());

    setState({ ...state, currentNum });
  }

  const onRefreshCurrentMsg = async () => {
    console.log('getting zkApp state...');
    await state.zkappWorkerClient!.fetchAccount({ publicKey: state.zkappPublicKey! })
    const currentMsg = await state.zkappWorkerClient!.getMsg();
    console.log('current msg state:', currentMsg/*.toString()*/);

    setState({ ...state, currentMsg });
  }

  // -------------------------------------------------------
  // Create UI elements

  let hasWallet;
  if (state.hasWallet != null && !state.hasWallet) {
    const auroLink = 'https://www.aurowallet.com/';
    const auroLinkElem = <a href={auroLink} target="_blank" rel="noreferrer"> [Link] </a>
    hasWallet = <div> Could not find a wallet. Install Auro wallet here: {auroLinkElem}</div>
  }

  let setupText = state.hasBeenSetup ? 'SnarkyJS Ready' : 'Setting up SnarkyJS...';
  let setup = <div> {setupText} {hasWallet}</div>

  let accountDoesNotExist;
  if (state.hasBeenSetup && !state.accountExists) {
    const faucetLink = "https://faucet.minaprotocol.com/?address=" + state.publicKey!.toBase58();
    accountDoesNotExist = <div>
      Account does not exist. Please visit the faucet to fund this account
      <a href={faucetLink} target="_blank" rel="noreferrer"> [Link] </a>
    </div>
  }

  let mainContent;
  const whaleMsg = 'Satoshi is a WhaleCoiner';
  if (state.hasBeenSetup && state.accountExists) {
    mainContent = <div>
      <button onClick={onSendTransaction} disabled={state.creatingTransaction}> Send Transaction </button>
      <div> Current Number in zkApp: {state.currentNum!.toString()} </div>
      <button onClick={onRefreshCurrentNum}> Get Latest State </button>
      <div> Current msg in zkApp: {state.currentMsg!.toString()} </div>
      <button onClick={onRefreshCurrentMsg}> Get Latest State </button>
      <div>


      </div>
    </div>
  }

  return <div className={styles.container}>
    <Head>
      <title>WhaleCoiner</title>
      <meta name="description" content="Zero knowledge proof that you are a WhaleCoiner" />
      <link rel="icon" href="/favicon.ico" />
    </Head>

    <main className={styles.main}>
      <h1 className={styles.title}>
        Welcome to <a href="#">WhaleCoiner!</a>
      </h1>
      {setup}
      {accountDoesNotExist}
      {mainContent}
      <SignedMessage
        wallMsg={state.currentMsg}
        onRefreshCurrentMsg={onRefreshCurrentMsg}
        onSendWallTransaction={onSendWallTransaction}
      />
    </main>
  </div >


}
