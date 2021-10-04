import React, {useEffect, useState} from 'react';
import * as fcl from '@onflow/fcl';
import * as FlowTypes from '@onflow/types';

function Account(props) {
  const [balance, setBalance] = useState(null);
  const [hasCollection, setHasCollection] = useState(null);

  const fetchBalance = async (address) => {
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
        fcl.arg(address, FlowTypes.Address)
      ])
    ]).then(fcl.decode);

    setBalance(balance);
  };

  const checkCollection = async (address) => {
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
        fcl.arg(address, FlowTypes.Address)
      ])
    ]).then(fcl.decode);

    setHasCollection(hasCollection);
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

  useEffect(() => {
    fetchBalance(props.address);
    checkCollection(props.address);
  }, [props.address]);

  return (
    <div>
      <span style={{marginRight: '8px'}}>{props.address}</span>
      <span>balance: {balance === null ? 'loading...' : balance}</span>
      <span>has collection: {hasCollection === true ? 'yes' : 'no'}</span>
      {hasCollection === false &&
        <button onClick={onCreateCollection}>create collection</button>
      }
    </div>
  );
}

export default Account;