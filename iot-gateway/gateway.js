import mqtt from 'mqtt';
import { ethers } from 'ethers';
import mongoose from 'mongoose';
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
mongoose.connect(process.env.mongodb_url);
const LogSchema = new mongoose.Schema({
  deviceId: String,
  temperature: Number,
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
const PC_IP = "127.0.0.1";
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

  try {
    // Try to archive in MongoDB first
    const newLog = new DataLog(data);
    await newLog.save();
    console.log("✅ Archived in MongoDB (Off-Chain)");

    // ONLY if MongoDB succeeds (means it's not a duplicate), send to Blockchain
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
