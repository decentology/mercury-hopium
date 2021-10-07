pub contract AwesomeNifty {

  pub resource NFT {
    pub let id: UInt64
    pub let name: String

    init(id: UInt64, name: String) {
      self.id = id
      self.name = name
    }
  }

  pub resource interface Receiver {
    pub fun deposit(nifty: @NFT)
    pub fun getIDs(): [UInt64]
    pub fun getName(ID: UInt64): String?
  }

  pub resource Collection: Receiver {
    pub let nifties: @{UInt64: NFT}

    init() {
      self.nifties <- {}
    }
    destroy() {
      destroy self.nifties
    }

    pub fun withdraw(niftyID: UInt64): @NFT {
      let nifty <- self.nifties.remove(key: niftyID)!

      return <- nifty
    }
    pub fun deposit(nifty: @NFT) {
      self.nifties[nifty.id] <-! nifty
    }
    pub fun getIDs(): [UInt64] {
      return self.nifties.keys
    }
    pub fun getName(ID: UInt64): String? {
      return self.nifties[ID]?.name
    }
  }

  pub resource Minter {
    pub var totalSupply: UInt64

    init() {
      self.totalSupply = 0
    }

    pub fun mint(name: String): @NFT {
      let nft <- create NFT(id: self.totalSupply, name: name)
      self.totalSupply = self.totalSupply + 1
      return <- nft
    }
  }

  pub fun createCollection(): @Collection {
    return <- create Collection()
  }

  init() {
    self.account.save(
      <- self.createCollection(),
      to: /storage/awesomeNiftyCollection
    )

    self.account.link<&{Receiver}>(
      /public/awesomeNiftyCollection,
      target: /storage/awesomeNiftyCollection
    )

    self.account.save(
      <- create Minter(),
      to: /storage/awesomeNiftyMinter
    )
  }
}