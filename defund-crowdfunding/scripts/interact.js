const hre = require("hardhat");

async function main() {
  const CONTRACT_ADDRESS = "0x20A85b3e7d11E24e43AdEdCA212a001008d2A10B";

  console.log("🔗 Connecting to contract at:", CONTRACT_ADDRESS);

  const Crowdfunding = await hre.ethers.getContractFactory("Crowdfunding");
  const crowdfunding = Crowdfunding.attach(CONTRACT_ADDRESS);

  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Using account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Balance:", hre.ethers.formatEther(balance), "ETH\n");

  console.log("🚀 Creating campaign...");
  const tx = await crowdfunding.createCampaign(
    "DeFund Platform Launch",
    "Building the future of decentralized crowdfunding! This is our first live campaign on Sepolia testnet.",
    hre.ethers.parseEther("2"),
    30
  );

  console.log("⏳ Waiting for confirmation...");
  const receipt = await tx.wait();
  console.log("✅ Campaign created!");
  console.log("📋 Transaction hash:", receipt.hash);

  const campaign = await crowdfunding.getCampaign(1);
  console.log("\n📊 Campaign Details:");
  console.log("- Title:", campaign.title);
  console.log("- Goal:", hre.ethers.formatEther(campaign.goalAmount), "ETH");
  console.log("- Creator:", campaign.creator);
  console.log("- Deadline:", new Date(Number(campaign.deadline) * 1000).toLocaleString());

  console.log("\n🔍 View on Etherscan:");
  console.log(`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`);
  console.log(`https://sepolia.etherscan.io/tx/${receipt.hash}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
