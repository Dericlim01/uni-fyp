import { ethers } from 'ethers';

export const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export const CONTRACT_ABI = [
  "function admin() view returns (address)",
  "function authorizeDevice(string _deviceId)",
  "function revokeDevice(string _deviceId)",
  "function getLatestHash(string _deviceId) view returns (string)",
  "function storeHash(string _deviceId, string _hash)",
  "function whitelistedDevices(string) view returns (bool)"
];

export const getContract = async () => {
  if (!window.ethereum) {
    throw new Error("No crypto wallet found. Please install MetaMask.");
  }
  await window.ethereum.request({ method: "eth_requestAccounts" });
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
};
