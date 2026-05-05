import mqtt from 'mqtt';
import { ethers } from 'ethers';
import mongoose from 'mongoose';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

// MongoDB Setup (Off-Chain Storage on the Pi)
mongoose.connect(process.env.mongodb_url);
const LogSchema = new mongoose.Schema({
  deviceId: String,
  temperature: Number,
  hash: { type: String, unique: true },
  timestamp: { type: Date, default: Date.now }
});
const DataLog = mongoose.model('DataLog', LogSchema);

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
    } catch (blockError) {
      console.error("❌ Blockchain Error:", blockError.reason || blockError.message);
    }

  } catch (mongoError) {
    if (mongoError.code === 11000) {
      console.warn("⚠️ Duplicate detected! Skipping database and blockchain storage.");
    } else {
      console.error("❌ Database Error:", mongoError.message);
    }
  }
});
