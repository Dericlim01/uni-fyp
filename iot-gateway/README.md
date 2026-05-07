# 🚀 IoT Security Gateway

A robust, blockchain-integrated IoT gateway designed for deployment on a **Raspberry Pi**. This gateway acts as the bridge between edge devices (like ESP32) and a decentralized ledger, ensuring data integrity and hardware-level authentication using a "Root of Trust" (RoT) approach.

---

## 🛠 Features

- **MQTT Broker Integration**: Seamlessly communicates with IoT devices via the Mosquitto MQTT protocol.
- **Off-Chain Archiving**: Stores real-time sensor data in a local **MongoDB** instance for high-speed access and historical logging.
- **Blockchain Verification**: Integrates with **Ethereum/Hardhat** via `ethers.js` to store data hashes on-chain, providing immutable verification of sensor events.
- **Real-Time Dashboard Support**: Uses **Socket.io** to push live verification statuses (Verified, Rejected, Pending) to a frontend dashboard.
- **Duplicate Detection**: Built-in logic to prevent replay attacks or redundant data entry using cryptographic hash uniqueness.

---

## 🏗 System Architecture

1.  **Device Layer (ESP32)**: Collects sensor data, generates a cryptographic hash, and publishes it via MQTT.
2.  **Gateway Layer (Raspberry Pi)**:
    - Listens for MQTT messages.
    - Persists data locally in MongoDB.
    - Sends the hash to the Smart Contract for validation.
3.  **Security Layer (Blockchain)**: Validates if the `deviceId` is authorized and stores the transaction hash.
4.  **UI Layer (React)**: Receives real-time updates via Socket.io from the gateway.

---

## 📋 Prerequisites

### Hardware
- Raspberry Pi (3B+, 4, or 5)
- microSD Card (16GB+ recommended)
- Internet connection

### Software (on Raspberry Pi)
- **Node.js**: v18.x or higher
- **MongoDB**: Community Edition
- **Mosquitto MQTT**: Broker and client tools
- **PM2**: (Optional) For process management

---

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/Dericlim01/uni-fyp.git
cd uni-fyp/iot-gateway
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the `iot-gateway` directory and configure the following:

```env
mongodb_url="mongodb://localhost:27017/iot_security"
PC_IP="192.168.x.xxx"        # IP address of the machine running the Hardhat node
PRIVATE_KEY="0x..."          # Account private key for blockchain transactions
CONTRACT_ADDRESS="0x..."     # Deployed HybridSecurity contract address
```

### 4. Deploy Smart Contract ABI
Ensure the `HybridSecurity.json` (ABI) from your Hardhat deployment is present in the root of the `iot-gateway` folder.

### 5. Cryptographic Setup (Optional)
If you intend to verify device signatures on the Gateway, you will need the **Public Key** corresponding to the ESP32's private key.

**Generate ECC Key pair:**
```bash
# 1. Generate Private Key (on the machine where you provision the ESP32)
openssl ecparam -name prime256v1 -genkey -noout -out private.pem

# 2. Extract Public Key (to be stored on the Raspberry Pi Gateway)
openssl ec -in private.pem -pubout -out public.pem
```

---

## ⚙️ Running the Gateway

### Development Mode (with Nodemon)
```bash
npm start
```

### Production Mode (with PM2)
To ensure the gateway runs continuously and restarts on failure or reboot:

```bash
# Start the gateway
pm2 start gateway.js --name "iot-gateway"

# Save the process list
pm2 save

# Setup startup script
pm2 startup
```

---

## 🔒 Security Workflow

| Step | Action | Status |
| :--- | :--- | :--- |
| **1** | Receive MQTT Message | `Pending` |
| **2** | Save to MongoDB | `Archived` |
| **3** | Transaction to Blockchain | `Verifying` |
| **4** | Blockchain Confirmation | `Verified` ✅ |
| **5** | Authorization Failed | `Rejected` ❌ |

---

## 📂 Project Structure

```text
iot-gateway/
├── gateway.js            # Main application logic
├── HybridSecurity.json   # Smart Contract ABI
├── package.json          # Node dependencies and scripts
├── .env                  # Configuration (Sensitive)
└── README.md             # This file
```

---

## 🤝 Contributing
This project is part of a Final Year Project (FYP) focused on IoT Security. For major changes, please open an issue first to discuss what you would like to change.

---

## 📄 License
[ISC](https://choosealicense.com/licenses/isc/)
