import React, {useState, useEffect} from 'react';
import * as fcl from '@onflow/fcl';
import * as FlowTypes from '@onflow/types';

fcl.config()
  .put("accessNode.api", 'https://access-testnet.onflow.org')
  .put("challenge.handshake", 'https://fcl-discovery.onflow.org/testnet/authn');

function App() {
  const [user, setUser] = useState({});

  const onSignIn = (event) => {
    event.preventDefault();
    fcl.authenticate();
  };
  const onSignOut = (event) => {
    event.preventDefault();
    fcl.unauthenticate();
  };

  useEffect(() => {
    fcl.currentUser().subscribe((user) => setUser({...user}));
  }, []);

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

  const onSend = async (event) => {
    event.preventDefault();

    try {
      const transactionId = await fcl.send([
        fcl.transaction`
          import FungibleToken from 0x9a0766d93b6608b7
          import FlowToken from 0x7e60df042a9c0868
  
          transaction() {
            prepare(account: AuthAccount) {
              let senderTokenVault = account
                .borrow<&FungibleToken.Vault>(from: /storage/flowTokenVault)!
  
              let receiver = getAccount(0x68da684995d89f0e)
              let receiverTokenVault = receiver
                .getCapability(/public/flowTokenReceiver)
                .borrow<&FlowToken.Vault{FungibleToken.Receiver}>()
                ?? panic("Couldn't borrow a reference to receiver vault.")
  
              receiverTokenVault.deposit(from: <- senderTokenVault.withdraw(amount: 10.0))
            }
            execute {
  
            }
          }
        `,
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

  return (
    <div className="App">
      <h1>Hello!</h1>
      <div>
        {!user.loggedIn &&
          <button onClick={onSignIn}>Sign In / Up</button>
        }
        {user.loggedIn &&
          <div>
            <div>
              <button onClick={onExecuteScript}>Execute Script</button>
            </div>
            <div>
              <button onClick={onSend}>Send FLOW</button>
            </div>
            <div>
              <button onClick={onSignOut}>Sign Out</button>
            </div>
          </div>
        }
      </div>
    </div>
  );
}

export default App;
