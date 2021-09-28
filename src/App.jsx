import React, {useState, useEffect} from 'react';
import * as fcl from '@onflow/fcl';
import * as FlowTypes from '@onflow/types';

fcl.config()
  .put("accessNode.api", 'https://access-testnet.onflow.org')
  .put("challenge.handshake", 'https://fcl-discovery.onflow.org/testnet/authn');

function App() {
  const [user, setUser] = useState({});
  console.log(user);

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
              <button onClick={onSignOut}>Sign Out</button>
            </div>
          </div>
        }
      </div>
    </div>
  );
}

export default App;
