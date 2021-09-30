import React, {useEffect, useState} from 'react';
import * as fcl from '@onflow/fcl';
import * as FlowTypes from '@onflow/types';

function Account(props) {
  const [balance, setBalance] = useState(null);

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

  useEffect(() => {
    fetchBalance(props.address);
  }, [props.address]);

  return (
    <div>
      <span style={{marginRight: '8px'}}>{props.address}</span>
      <span>balance: {balance === null ? 'loading...' : balance}</span>
    </div>
  );
}

export default Account;