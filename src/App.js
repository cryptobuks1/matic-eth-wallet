import React from 'react'
import BigNumber from 'bignumber.js'

import { toChecksumAddress } from 'web3-utils'

import Header from './components/header'

import maticObj from './MaticObj'
import { MATIC_NETWORK } from './config'

import Web3 from 'web3'

let storage = null
if (typeof window.localStorage !== 'undefined') {
  storage = window.localStorage
}

const TEN = new BigNumber('10')
const decimals = 18

class App extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      address: null,
      web3: null,
      toAddress: '',
      toAmount: 0.0001,
      network: '',
      transferTx: null,
    }
    this.checkAuth()
  }

  checkAuth = async () => {
    if (storage && storage.getItem('loggedIn')) {
      await this.connectToWallet()
    }
  }

  onConnect = () => {
    if (storage) {
      storage.setItem('loggedIn', true)
    }
  }

  onDisconnect = () => {
    this.setState({
      address: null,
    })

    if (storage) {
      storage.removeItem('loggedIn')
    }
  }

  connectToWallet = async () => {
    if (window.ethereum) {
      const web3 = new Web3(window.ethereum)

      // fetch accounts
      window.ethereum.enable().then((accounts) => {
        web3.eth.net.getId().then((id) => {
          console.log('id:', id)
          this.setState({
            network:
              id === MATIC_NETWORK.id || id === MATIC_NETWORK.idMainnet
                ? 'MATIC'
                : 'ETH',
          })
        })

        const address = accounts[0]

        window.ethereum.on('accountsChanged', (e) => {
          console.log(
            'accountsChanged - toChecksumAddress(e[0]):',
            toChecksumAddress(e[0]),
          )
          if (address) {
            const accountChanged = !(
              toChecksumAddress(e[0]) === toChecksumAddress(address)
            )
            if (accountChanged) {
              window.location.reload()
            }
          }
        })

        window.ethereum.on('networkChanged', () => {
          console.log('networkChanged')
          window.location.reload()
        })

        // set address
        this.setState(
          {
            maticObj,
            address,
            web3,
          },
          () => {
            this.loadMaticBalance()
          },
        )
      })
    }
  }

  disconnect = () => {
    const { maticProvider, goerliProvider } = this.state
    if (maticProvider) {
      maticProvider.disconnect()
    }

    if (goerliProvider) {
      goerliProvider.disconnect()
    }

    this.onDisconnect()
  }

  connectScreen() {
    return (
      <div className="screen-middle-container d-flex justify-content-center">
        <div className="align-self-center">
          <button
            className="btn btn-primary btn-lg"
            onClick={this.connectToWallet}
          >
            Connect to Metamask Wallet
          </button>
        </div>
      </div>
    )
  }

  async loadMaticBalance() {
    const { address, web3 } = this.state
    return new Promise((resolve) => {
      web3.eth
        .getBalance(address)
        .then((balance) => {
          this.setState({
            tokenBalance: new BigNumber(balance.toString())
              .div(TEN.pow(new BigNumber(decimals)))
              .toString(),
            tokenDecimals: decimals,
          })
        })
        .catch(() => resolve(null))
    })
  }

  handleInputChange = (event) => {
    const target = event.target
    const value = target.type === 'checkbox' ? target.checked : target.value
    const name = target.name

    this.setState({
      [name]: value,
    })
  }

  transferTokens = (event) => {
    event.preventDefault()
    const { address, tokenDecimals, toAddress, toAmount, web3 } = this.state
    const amount = new BigNumber(new BigNumber(toAmount)).times(
      TEN.pow(new BigNumber(tokenDecimals)),
    )

    this.setState({ transferTx: null })

    // transfer tokens
    web3.eth
      .sendTransaction({
        from: address,
        to: toAddress,
        value: amount.toString(),
      })
      .then((transferTx) => {
        console.log('transferTokens - transferTx:', transferTx.transactionHash)
        this.setState({ transferTx: transferTx.transactionHash })
      })
      .catch((error) => console.error('transferTokens - Error:', error))
  }

  homeScreen() {
    const { transferTx, tokenBalance, network } = this.state
    return (
      <div className="container my-5">
        <div className="my-5 box">
          <div className="row d-flex justify-content-between p-3 m-0">
            <div className="align-self-center">
              <h5>
                {network} balance: {tokenBalance}
              </h5>
            </div>
            {network === 'MATIC' && (
              <div className="align-self-center">
                <a
                  className="btn btn-warning mx-2"
                  href="https://faucet.matic.network"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Get test tokens from faucet
                </a>
              </div>
            )}
          </div>
        </div>
        <div className="my-5 box">
          <h5 className="px-3 pt-3">Transfer {network}</h5>
          <div className="row d-flex justify-content-between p-3 m-0">
            <div className="align-self-center col p-0 pr-2">
              <input
                type="text"
                className="form-control"
                placeholder="Address"
                name="toAddress"
                value={this.state.toAddress}
                onChange={this.handleInputChange}
              />
            </div>
            <div className="align-self-center col p-0 pr-2">
              <input
                type="number"
                className="form-control"
                placeholder="Amount"
                name="toAmount"
                value={this.state.toAmount}
                onChange={this.handleInputChange}
              />
            </div>
            <div className="align-self-center">
              <button
                disabled={!this.state.toAddress || !this.state.toAmount}
                type="submit"
                className="btn btn-primary"
                onClick={this.transferTokens}
              >
                Transfer
              </button>
            </div>
          </div>
          {transferTx && (
            <h5 className="px-3 pt-3" style={{ fontSize: '0.8rem' }}>
              Transfer Transaction: {transferTx}
            </h5>
          )}
        </div>
      </div>
    )
  }

  render() {
    const { address, network } = this.state
    console.log('network:', network)
    return (
      <div>
        <Header
          address={address}
          network={network}
          disconnect={this.disconnect}
        />
        {!address ? this.connectScreen() : this.homeScreen()}
      </div>
    )
  }
}

export default App
