import Web3 from 'web3';

// Use the RPC Server URL from your Ganache (usually http://127.0.0.1:7545)
const GANACHE_URL = "http://127.0.0.1:7545";

export const getWeb3 = () => new Web3(new Web3.providers.HttpProvider(GANACHE_URL));

// Paste your contract's ABI here after compiling in Remix or Truffle
export const CONTRACT_ABI = [ /* Your Smart Contract ABI Array */];
export const CONTRACT_ADDRESS = "0xYourContractAddressHere";
