import "@nomicfoundation/hardhat-toolbox";
import { HardhatUserConfig, vars } from "hardhat/config";

const SEPOLIA_RPC_URL = vars.has("SEPOLIA_RPC_URL") ? vars.get("SEPOLIA_RPC_URL") : "";
const SEPOLIA_PRIVATE_KEY = vars.has("SEPOLIA_PRIVATE_KEY") ? vars.get("SEPOLIA_PRIVATE_KEY") : "0x0000000000000000000000000000000000000000000000000000000000000000";

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    sepolia: {
      url: SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
      accounts: [SEPOLIA_PRIVATE_KEY],
    },
  },
};

export default config;
