import mqtt from 'mqtt';
import { ethers } from 'ethers';
import mongoose from 'mongoose';
import crypto from 'crypto';
import fs from 'fs';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';

dotenv.config();

// Socket.io Initialization
const server = http.createServer();
const io = new Server(server, {
  cors: { origin: "*" }
});

// MongoDB Setup (Off-Chain Storage on the Pi)
mongoose.connect(process.env.mongodb_url).catch(err => {
  console.error("❌ MongoDB connection error:", err.message);
  console.error("💡 Tip: Make sure your MongoDB service is running locally on port 27017.");
});

const LogSchema = new mongoose.Schema({
  deviceId: String,
  temperature: Number,
  deviceTimestamp: Number,
  hash: { type: String, unique: true },
  status: { type: String, default: 'Pending' },
  timestamp: { type: Date, default: Date.now }
});
const DataLog = mongoose.model('DataLog', LogSchema);

// Handle new frontend connections and send historical data
io.on('connection', async (socket) => {
  console.log("🟢 Frontend connected to Socket.io");
  try {
    const logs = await DataLog.find().sort({ timestamp: -1 }).limit(50);
    // Map them to include their saved status
    const formattedLogs = logs.map(log => {
      return {
        ...log.toObject(),
        status: log.status, // Rely completely on actual DB status
        temp: log.temperature
      };
    });
    socket.emit('initialLogs', formattedLogs);
  } catch (err) {
    console.error("❌ Error fetching initial logs:", err);
  }
});

server.listen(3001, () => {
  console.log("🔌 Socket.io server running on port 3001");
});

// Blockchain Setup (Connecting to your PC)
const PC_IP = process.env.PC_IP || "127.0.0.1";
const provider = new ethers.JsonRpcProvider(`http://${PC_IP}:8545`);

// Use the Private Key from Account #0 in your Hardhat terminal
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Load the ABI file you copied from the PC
const contractJson = JSON.parse(fs.readFileSync('./HybridSecurity.json', 'utf8'));
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, contractJson.abi, wallet);

// MQTT Listener (Connecting to Mosquitto on the Pi)
const client = mqtt.connect('mqtt://localhost');

client.on('connect', () => {
  console.log("🚀 Gateway connected to MQTT Broker");
  client.subscribe('sensor/data');
});

client.on('message', async (topic, message) => {
  const data = JSON.parse(message.toString());
  console.log(`📩 Received message on ${topic}: ${message}`);

  try {
    // Check if device is whitelisted on the smart contract BEFORE saving
    const isWhitelisted = await contract.whitelistedDevices(data.deviceId);
    console.log(`🔍 Whitelist check for ${data.deviceId}: ${isWhitelisted}`);

    if (!isWhitelisted) {
      console.warn(`🚫 Device ${data.deviceId} is NOT whitelisted. Rejecting data.`);

      // Save to MongoDB as rejected for audit trail
      const rejectedLog = new DataLog(data);
      rejectedLog.status = 'Rejected/Unauthorized';
      await rejectedLog.save();

      io.emit('newLog', {
        ...data,
        temp: data.temperature,
        timestamp: rejectedLog.timestamp,
        status: 'Rejected/Unauthorized'
      });
      return; // Stop here — do NOT send to blockchain
    }

    // Verify hash integrity (detect data tampering)
    // ESP32 computes: SHA256(deviceId + temperature + deviceTimestamp)
    const rawData = String(data.deviceId) + data.temperature.toFixed(2) + String(data.deviceTimestamp);
    const expectedHash = crypto.createHash('sha256').update(rawData).digest('hex');
    console.log(`🔐 Hash check — Expected: ${expectedHash} | Received: ${data.hash}`);

    if (expectedHash !== data.hash) {
      console.warn(`🚨 Data tampering detected for ${data.deviceId}! Hash mismatch.`);

      const tamperedLog = new DataLog(data);
      tamperedLog.status = 'Rejected/Tampered';
      await tamperedLog.save();

      io.emit('newLog', {
        ...data,
        temp: data.temperature,
        timestamp: tamperedLog.timestamp,
        status: 'Rejected/Tampered'
      });
      return; // Stop here — tampered data
    }

    console.log(`✅ Hash integrity verified for ${data.deviceId}`);

    // Device is whitelisted & hash verified — archive in MongoDB
    const newLog = new DataLog(data);
    await newLog.save();
    console.log("✅ Archived in MongoDB (Off-Chain)");

    // Store hash on blockchain (device whitelisted & data integrity confirmed)
    try {
      const tx = await contract.storeHash(data.deviceId, data.hash);
      await tx.wait();
      console.log(`✔️ Verified on Blockchain. Tx: ${tx.hash}`);
      newLog.status = 'Verified';
      await newLog.save();
      io.emit('newLog', {
        ...data,
        temp: data.temperature,
        timestamp: newLog.timestamp,
        status: 'Verified'
      });
    } catch (blockError) {
      console.error("❌ Blockchain Error:", blockError.reason || blockError.message);
      newLog.status = 'Rejected/Unauthorized';
      await newLog.save();
      io.emit('newLog', {
        ...data,
        temp: data.temperature,
        timestamp: newLog.timestamp,
        status: 'Rejected/Unauthorized'
      });
    }

  } catch (mongoError) {
    if (mongoError.code === 11000) {
      console.warn("⚠️ Duplicate detected! Skipping database and blockchain storage.");
    } else {
      console.error("❌ Database Error:", mongoError.message);
    }
  }
});
