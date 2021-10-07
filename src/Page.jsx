import React, {useState, useEffect, useCallback} from 'react';
import * as fcl from '@onflow/fcl';
import * as FlowTypes from '@onflow/types';

import Account from './Account.jsx';

const accounts = [
  '0xccea6c9965b5831a',
  '0xd9c6c734c01fe2e1',
  '0x68da684995d89f0e',
  '0xe37a242dfff69bbc',
  '0xa3ed3e0598a583bd'
];

function Page(props) {
  const {user} = props;
  const [amount, setAmount] = useState(0);
  const [receiverAddress, setReceiverAddress] = useState(accounts[0]);
  const [hasCollection, setHasCollection] = useState(null);
  const [niftyName, setNiftyName] = useState('');

  const onSignOut = (event) => {
    event.preventDefault();
    fcl.unauthenticate();
  };
  const onExecuteScript = async (event) => {
    event.preventDefault();

    const balance = await fcl.send([
      fcl.script`
        import FungibleToken from 0x9a0766d93b6608b7
        import FlowToken from 0x7e60df042a9c0868

        pub fun main(address: Address): UFix64 {
          let vaultRef = getAccount(address)
            .getCapability(/public/flowTokenBalance)
            .borrow<&FlowToken.Vault{FungibleToken.Balance}>()
            ?? panic("Could not borrow Balance reference to the Vault");

          return vaultRef.balance;
        }
      `,
      fcl.args([
        fcl.arg(user.addr, FlowTypes.Address)
      ])
    ]).then(fcl.decode);

    console.log(user.addr);
    console.log(balance);
  };
  const onCreateCollection = async (event) => {
    event.preventDefault();

    try {
      const transactionId = await fcl.send([
        fcl.transaction`
          import AwesomeNifty from 0xccea6c9965b5831a
  
          transaction() {
            prepare(account: AuthAccount) {
              let collection <- AwesomeNifty.createCollection()
              
              account.save(
                <- collection,
                to: /storage/awesomeNiftyCollection
              )
          
              account.link<&{AwesomeNifty.Receiver}>(
                /public/awesomeNiftyCollection,
                target: /storage/awesomeNiftyCollection
              )
            }
            execute {}
          }
        `,
        fcl.args([]),
        fcl.payer(fcl.authz),
        fcl.proposer(fcl.authz),
        fcl.authorizations([fcl.authz]),
        fcl.limit(9999)
      ]).then(fcl.decode);
      console.log(transactionId);
  
      const result = await fcl.tx(transactionId).onceSealed();
      console.log(result);
    } catch (error) {
      console.error(error);
    }
  };
  const checkCollection = useCallback(
    async (address) => {
      const hasCollection = await fcl.send([
        fcl.script`
          import AwesomeNifty from 0xccea6c9965b5831a
  
          pub fun main(address: Address): Bool {
            let collectionRef = getAccount(address)
              .getCapability(/public/awesomeNiftyCollection)
              .borrow<&{AwesomeNifty.Receiver}>()
  
            return collectionRef == nil ? false : true
          }
        `,
        fcl.args([
          fcl.arg(user.addr, FlowTypes.Address)
        ])
      ]).then(fcl.decode);
  
      setHasCollection(hasCollection);
    },
    [user.addr]
  );

  const onSend = async (event) => {
    event.preventDefault();

    try {
      const transactionId = await fcl.send([
        fcl.transaction`
          import FungibleToken from 0x9a0766d93b6608b7
          import FlowToken from 0x7e60df042a9c0868
  
          transaction(amount: UFix64, address: Address) {
            prepare(account: AuthAccount) {
              let senderTokenVault = account
                .borrow<&FungibleToken.Vault>(from: /storage/flowTokenVault)!
  
              let receiver = getAccount(address)
              let receiverTokenVault = receiver
                .getCapability(/public/flowTokenReceiver)
                .borrow<&FlowToken.Vault{FungibleToken.Receiver}>()
                ?? panic("Couldn't borrow a reference to receiver vault.")
  
              receiverTokenVault.deposit(from: <- senderTokenVault.withdraw(amount: amount))
            }
            execute {
  
            }
          }
        `,
        fcl.args([
          fcl.arg(`${amount}.0`, FlowTypes.UFix64),
          fcl.arg(receiverAddress, FlowTypes.Address),
        ]),
        fcl.payer(fcl.authz),
        fcl.proposer(fcl.authz),
        fcl.authorizations([fcl.authz]),
        fcl.limit(9999)
      ]).then(fcl.decode);
      console.log(transactionId);
  
      const result = await fcl.tx(transactionId).onceSealed();
      console.log(result);
    } catch (error) {
      console.error(error);
    }
  };

  const onMint = async (event) => {
    event.preventDefault();
    
    try {
      const transactionId = await fcl.send([
        fcl.transaction`
          import AwesomeNifty from 0xccea6c9965b5831a

          transaction(name: String, receiverAddress: Address) {
            prepare(account: AuthAccount) {
              // Authorized
              // let collection <- account.load<@AwesomeNifty.Collection>(from: /storage/awesomeNiftyCollection)!
              // account.save(<- collection, to: /storage/awesomeNiftyCollection)
              // destroy collection
              
              let minter <- account.load<@AwesomeNifty.Minter>(from: /storage/awesomeNiftyMinter)!
              let nifty <- minter.mint(name: name)
              account.save(
                <- minter,
                to: /storage/awesomeNiftyMinter
              )

              let receiver = getAccount(receiverAddress)
                .getCapability(/public/awesomeNiftyCollection)
                .borrow<&{AwesomeNifty.Receiver}>()
                ?? panic("Couldn't borrow the receiver's collection.")

              receiver.deposit(nifty: <- nifty)
            }
          }
        `,
        fcl.args([
          fcl.arg(niftyName, FlowTypes.String),
          fcl.arg(receiverAddress, FlowTypes.Address)
        ]),
        fcl.payer(fcl.authz),
        fcl.proposer(fcl.authz),
        fcl.authorizations([fcl.authz]),
        fcl.limit(9999)
      ]).then(fcl.decode);

      const result = await fcl.tx(transactionId).onceSealed();
      console.log(result);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    checkCollection();
  }, [checkCollection]);

  return (
    <div style={{padding: '16px'}}>
      <div>
        <h1>Accounts</h1>
        {accounts.map((account, index) => {
          return (
            <Account key={index} address={account} />
          );
        })}
        <h1>Commands</h1>
        <p>
          <button onClick={onExecuteScript}>Execute Script</button>
        </p>
        <p>
          <input type="text" value={amount} onChange={(event) => setAmount(event.target.value)} />
          <input type="text" value={receiverAddress} onChange={(event) => setReceiverAddress(event.target.value)} />
          <button onClick={onSend}>Send FLOW</button>
        </p>
        <p>
          {hasCollection === false &&
            <button onClick={onCreateCollection}>create collection</button>
          }
        </p>
        <p>
          <input type="text" value={niftyName} onChange={(event) => setNiftyName(event.target.value)} />
          <input type="text" value={receiverAddress} onChange={(event) => setReceiverAddress(event.target.value)} />
          <button onClick={onMint}>Mint Nifty</button>
        </p>
        <div>
          <button onClick={onSignOut}>Sign Out</button>
        </div>
      </div>
    </div>
  );
}

export default Page;