import React, {useState, useEffect} from 'react';
import * as fcl from '@onflow/fcl';

import Page from './Page.jsx';

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

  useEffect(() => {
    fcl.currentUser().subscribe((user) => setUser({...user}));
  }, []);

  return (
    <div className="App">
      <div>
        {!user.loggedIn &&
          <button onClick={onSignIn}>Sign In / Up</button>
        }
        {user.loggedIn &&
          <Page user={user} />
        }
      </div>
    </div>
  );
}

export default App;
