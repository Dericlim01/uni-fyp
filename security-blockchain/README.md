# 🛡️ IoT Security Blockchain (Hardhat)

This project contains the **Smart Contracts** and **Deployment Scripts** for the "Root of Trust" (RoT) security layer. It uses the Ethereum-compatible Hardhat environment to manage device authorization and sensor data integrity.

---

## 💎 Smart Contract: `HybridSecurity`

The core logic is implemented in Solidity and provides two primary security functions:
1.  **Device Whitelisting**: Only devices authorized by the Admin (the contract deployer) can interact with the blockchain.
2.  **Immutable Hash Storage**: Stores cryptographic hashes of sensor data, providing a permanent, tamper-proof record for verification.

---

## 🛠 Features

- **Access Control**: Role-based access where only the `admin` can authorize new `deviceIds`.
- **Data Integrity**: Ensures that only data from whitelisted hardware is accepted and archived.
- **Verification API**: Public view functions to retrieve the latest hash for any authorized device.
- **Gas Optimized**: Minimal state storage to keep transaction costs low.

---

## 📋 Prerequisites

### Software
- **Node.js**: v18.x or higher
- **Hardhat**: Development environment for Ethereum software
- **TypeScript**: Used for robust scripting and deployment

---

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/Dericlim01/uni-fyp.git
cd uni-fyp/security-blockchain
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory:
```env
# Network Configuration
PRIVATE_KEY="0x..."          # Account used for deployment/admin tasks
DEVICE_ID="ESP32_01"         # Default device ID for authorization scripts
```

---

## ⚙️ Development Workflow

### Compile Contracts
```bash
npx hardhat compile
```

### Run Local Blockchain Node
If you are running the node on your Raspberry Pi:
```bash
npx hardhat node --hostname 0.0.0.0
```
> [!TIP]
> Using `--hostname 0.0.0.0` allows the IoT Gateway to connect to this node from across the network.

### Deploy Contract
```bash
npx hardhat ignition deploy ./ignition/modules/Lock.ts --network localhost
```
*(Note: Ensure you update the module path if your deployment script is named differently)*

---

## 🔐 Authorization Script

To whitelist a new IoT device (e.g., your ESP32), use the provided utility script:

```bash
npx hardhat run scripts/authorize.ts --network localhost
```

**What this does:**
1.  Connects to the running Hardhat node.
2.  Uses the Admin account to call `authorizeDevice(deviceId)`.
3.  Grants the device permission to submit sensor hashes to the gateway.

---

## 📂 Project Structure

```text
security-blockchain/
├── contracts/            # Solidity smart contracts (HybridSecurity.sol)
├── scripts/              # Utility scripts (authorize.ts)
├── ignition/             # Deployment modules
├── test/                 # Automated smart contract tests
├── hardhat.config.ts     # Hardhat configuration
└── README.md             # This file
```

---

## ⚠️ Raspberry Pi Deployment Notes
Running a full Hardhat node on a Pi can be resource-intensive. 
- **Ram Usage**: Ensure you have at least 1GB of free RAM.
- **Persistence**: Use `pm2` if you want the Hardhat node to stay alive in the background.
  ```bash
  pm2 start "npx hardhat node" --name "blockchain-node"
  ```

---

## 📄 License
[ISC](https://choosealicense.com/licenses/isc/)
