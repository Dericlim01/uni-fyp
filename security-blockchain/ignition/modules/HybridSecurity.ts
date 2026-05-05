import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const HybridSecurityModule = buildModule("HybridSecurityModule", (m) => {
  // This looks for a contract named "HybridSecurity" in your contracts folder
  const security = m.contract("HybridSecurity");

  return { security };
});

export default HybridSecurityModule;
