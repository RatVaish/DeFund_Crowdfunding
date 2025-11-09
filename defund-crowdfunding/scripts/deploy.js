const hre = require("hardhat");

async function main() {
  console.log("🚀 Starting Crowdfunding contract deployment...\n");
  
  const Crowdfunding = await hre.ethers.getContractFactory("Crowdfunding");
  
  console.log("📝 Deploying contract...");
  const crowdfunding = await Crowdfunding.deploy();
  
  await crowdfunding.waitForDeployment();
  
  const address = await crowdfunding.getAddress();
  
  console.log("✅ Crowdfunding contract deployed successfully!");
  console.log(`📍 Contract address: ${address}\n`);
  
  return address;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
