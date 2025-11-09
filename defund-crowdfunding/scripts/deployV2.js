const hre = require("hardhat");

async function main() {
  console.log("🚀 Starting CrowdfundingV2 contract deployment...\n");

  const CrowdfundingV2 = await hre.ethers.getContractFactory("CrowdfundingV2");

  console.log("📝 Deploying contract...");
  const crowdfundingV2 = await CrowdfundingV2.deploy();

  await crowdfundingV2.waitForDeployment();

  const address = await crowdfundingV2.getAddress();

  console.log("✅ CrowdfundingV2 deployed successfully!");
  console.log(`📍 Contract address: ${address}\n`);

  console.log("💡 This is V2 with milestone support!");
  console.log(`🔍 View on Etherscan:`);
  console.log(`https://sepolia.etherscan.io/address/${address}\n`);

  return address;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
