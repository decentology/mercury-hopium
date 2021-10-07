import React, {useEffect, useState} from 'react';
import * as fcl from '@onflow/fcl';
import * as FlowTypes from '@onflow/types';

function Account(props) {
  const [balance, setBalance] = useState(null);
  const [hasCollection, setHasCollection] = useState(null);
  const [nifties, setNifties] = useState(null);

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

  const fetchCollection = async (address) => {
    const nifties = await fcl.send([
      fcl.script`
        import AwesomeNifty from 0xccea6c9965b5831a

        pub fun main(address: Address): [{String: String}]? {
          let collectionRef = getAccount(address)
            .getCapability(/public/awesomeNiftyCollection)
            .borrow<&{AwesomeNifty.Receiver}>()

          if collectionRef != nil {
            let result: [{String: String}] = []
            for ID in collectionRef!.getIDs() {
              result.append({
                "ID": ID.toString(),
                "name": collectionRef!.getName(ID: ID)!
              })
            }

            return result
          }

          return nil
        }
      `,
      fcl.args([
        fcl.arg(address, FlowTypes.Address)
      ])
    ]).then(fcl.decode);

    setNifties(nifties);
  };

  useEffect(() => {
    fetchBalance(props.address);
    checkCollection(props.address);
    fetchCollection(props.address);
  }, [props.address]);

  return (
    <div>
      <ul>
        <li>
          <strong>{props.address}</strong>
        </li>
        <li>
          Balance: {balance === null ? 'loading...' : `${balance} FLOW`}
        </li>
        <li>
          Has collection: {hasCollection === true ? 'yes' : 'no'}
        </li>
        {nifties &&
          <ul>
            {nifties.map((nifty) => {
              return (
                <li key={nifty.ID}>{nifty.name}</li>
              );
            })}
          </ul>
        }
      </ul>
    </div>
  );
}

export default Account;