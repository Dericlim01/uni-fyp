# 🖥️ IoT Security Dashboard

A high-performance, real-time monitoring interface for the "Root of Trust" (RoT) IoT security ecosystem. This dashboard provides a central view for device verification, on-chain integrity checks, and administrative control.

---

## 🛠 Features

- **Live Security Feed**: Real-time display of incoming sensor data (Temperature, Device ID, Hash) via **Socket.io**.
- **On-Chain Integrity Check**: Manual "Verify" button to compare local database hashes against the immutable records stored on the Ethereum blockchain.
- **Admin Control Panel**: Interface for authorizing new IoT devices (`deviceId`) directly onto the blockchain whitelist.
- **Real-Time Analytics**: Visual tracking of system health (Total Logs, Verified Transactions, and Blocked Unauthorized Attempts).
- **Modern UI/UX**: Built with **React 19**, **Vite**, and **Tailwind CSS** for a premium, dark-mode experience.

---

## 🏗 System Integration

The dashboard communicates with two primary services:
1.  **IoT Gateway (Socket.io)**: Receives live sensor events and historical archives.
2.  **Hardhat Blockchain (Ethers.js)**: Performs direct smart contract interactions for authorization and data validation.

---

## 📋 Prerequisites

### Software
- **Node.js**: v18.x or higher
- **Modern Browser**: Chrome, Edge, or Firefox (MetaMask or a Web3 provider is not strictly required if using a local Hardhat node).

---

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/Dericlim01/uni-fyp.git
cd uni-fyp/iot-security-dashboard
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configuration
The dashboard requires connection details for both the Gateway and the Smart Contract. 
- Open `src/contractConfig.js` (or `.env` if implemented) and ensure the `CONTRACT_ADDRESS` matches your deployed contract.
- Ensure the socket connection in `App.jsx` points to your Raspberry Pi's IP:
  ```javascript
  const socket = io('http://192.168.x.xxx:3001'); // Replace with Pi IP
  ```

---

## ⚙️ Running the Dashboard

### Development Mode
Runs the app with hot-reloading for development.
```bash
npm run dev
```

### Build for Production
Compiles the application into a highly optimized bundle.
```bash
npm run build
```

---

## 🔒 Security Operations Guide

### How to Authorize a Device
1.  Enter the `Device ID` (e.g., `ESP32_01`) in the **Admin Control** panel.
2.  Click **Authorize Device**.
3.  The request is sent directly to the blockchain via the Admin private key.
4.  Once confirmed, the gateway will accept data from this device.

### How to Detect Tampering
1.  Locate a log entry in the **Live Security Feed**.
2.  Hover over the entry and click the **Verify** button.
3.  The dashboard will fetch the original hash from the blockchain.
4.  If the hashes match, a ✅ **Match** badge appears.
5.  If they differ, a ⚠️ **TAMPER ALERT** is triggered.

---

## 📂 Project Structure

```text
iot-security-dashboard/
├── src/
│   ├── App.jsx           # Main UI logic and state
│   ├── contractConfig.js # Blockchain connection settings
│   └── index.css         # Tailwind & custom styles
├── public/               # Static assets
├── package.json          # Dependencies & Scripts
├── vite.config.js        # Vite configuration
└── README.md             # This file
```

---

## 🤝 Support
Part of the Final Year Project on Hybrid IoT Security. 

---

## 📄 License
[ISC](https://choosealicense.com/licenses/isc/)
