import hre from "hardhat";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // replace the contract address
  const deviceId = process.env.DEVICE_ID || "ESP32_01";

  // Check if ethers is actually loaded
  if (!hre.ethers) {
    throw new Error("Hardhat Ethers plugin not found. Ensure @nomicfoundation/hardhat-toolbox is imported in hardhat.config.ts");
  }

  const [admin] = await hre.ethers.getSigners();
  const contract = await hre.ethers.getContractAt("HybridSecurity", contractAddress);

  console.log(`\n🔐 Admin: ${admin.address}`);
  console.log(`📡 Authorizing: ${deviceId}...`);

  const tx = await contract.authorizeDevice(deviceId);
  await tx.wait();

  console.log(`✅ Success! ${deviceId} is now whitelisted.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
