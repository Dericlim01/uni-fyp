import hre from "hardhat";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const contractAddress = ""; // replace the contract address
  const deviceId = process.env.DEVICE_ID || ""; // replace the device id

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
