import Head from 'next/head';
import Image from 'next/image';
import styles from '../styles/Home.module.css';
import '../styles/globals.css'
import type { AppProps } from 'next/app'

import './reactCOIServiceWorker';
import whales from '../../whales.json';

// copied from example
import { useEffect, useState } from "react";
// need to copy
import ZkappWorkerClient from './zkappWorkerClient';

import {
  PublicKey,
  PrivateKey,
  Field,
} from 'snarkyjs'

let transactionFee = 0.1;
// end copy

// TODO fetch and pass in committed merkle root
function SignedMessage(props: any) {
  let [sig, setSig] = useState({ r: '', s: '' });
  const whaleMsg = 'Satoshi is a WhaleCoiner';
  let [query, setQuery] = useState('');
  let [searchResults, setSearchResults] = useState(['']);
  const whaleSearch = () => setSearchResults(whales.filter(w => w.a.search(query) != -1).map(w => w.a));
  let [newWallMsg, setNewWallMsg] = useState('');


  return <div className={styles.container}>

    <div className={styles.container} style={{ backgroundColor: 'yellow' }}>
      <h2>This message currently appears on the sacred WhaleCoiners Wall:</h2>
      <div className={styles.card}>
        <code>{props.wallMsg?.toString()}</code>
        <h1>satoshi rulz</h1>
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
      <div className={styles.card}>
        <input onChange={(e) => setQuery(e.target.value)} value={query} />
        <button onClick={whaleSearch}>Search</button>
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
          field (r):
          <input name="field" value={sig.r} style={{ width: '100%' }} onChange={(e) => setSig({ r: e.target.value, s: sig.s })} />
        </label>
      </div>
      <div>
        <label>
          scalar (s):
          <input name="scalar" value={sig.s} style={{ width: '100%' }} onChange={(e) => setSig({ r: sig.r, s: e.target.value })} />
        </label>
      </div>
      <div className={styles.card}>
        <button onClick={async () => {
          const mina = (window as any).mina;
          let res = await mina.signMessage({ message: whaleMsg, });
          console.log(res);
          setSig({ r: res.signature.field, s: res.signature.scalar });
        }}>Sign message via connected Auro</button>
      </div>
    </div>

    <div className={styles.container} style={{ backgroundColor: 'gold' }}>
      <h2>Write your message on the wall</h2>
      <div>
        <label>
          Your new message:
          <input name="field" value={sig.r} style={{ width: '100%' }} onChange={(e) => setSig({ r: e.target.value, s: sig.s })} />
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
        }}>Write on wall</button>
        <button onClick={() => props.onSendTransaction()} >click me</button>
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

        // https://berkeley.minaexplorer.com/wallet/B62qph2VodgSo5NKn9gZta5BHNxppgZMDUihf1g7mXreL4uPJFXDGDA/zkapp-transactions
        // const zkappPublicKey = PublicKey.fromBase58('B62qph2VodgSo5NKn9gZta5BHNxppgZMDUihf1g7mXreL4uPJFXDGDA');
        // Berkeley Testnet B62qisn669bZqsh8yMWkNyCA7RvjrL6gfdr3TQxymDHNhTc97xE5kNV
        const tomoAddFork = 'B62qmv5LdsuGNjbccmJPRVt4EV15KDUri6gMbGiWa5XRNthcpdzwHtF';
        //const tomoAddFinal = 'B62qmv5LdsuGNjbccmJPRVt4EV15KDUri6gMbGiWa5XRNthcpdzwHtF'
        //const zkAppAddress_orig = 'B62qisn669bZqsh8yMWkNyCA7RvjrL6gfdr3TQxymDHNhTc97xE5kNV';
        const zkAppAddress = tomoAddFork;
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
        onSendTransaction={(x: void) => console.log('sig ', x)}
      />
    </main>
  </div >


}
