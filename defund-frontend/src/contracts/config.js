// Contract addresses
export const CONTRACT_V1_ADDRESS = "0x20A85b3e7d11E24e43AdEdCA212a001008d2A10B";
export const CONTRACT_V2_ADDRESS = "0xB1E5077ab6a8d2216d70774F2b02AADFBa162558";

// Default to V2
export const CONTRACT_ADDRESS = CONTRACT_V2_ADDRESS;

// Sepolia network configuration
export const SEPOLIA_CHAIN_ID = "0xaa36a7"; // 11155111 in hex
export const SEPOLIA_NETWORK = {
  chainId: SEPOLIA_CHAIN_ID,
  chainName: "Sepolia Test Network",
  nativeCurrency: {
    name: "SepoliaETH",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: ["https://sepolia.infura.io/v3/"],
  blockExplorerUrls: ["https://sepolia.etherscan.io/"],
};

// Contract versions
export const CONTRACT_VERSIONS = {
  v1: {
    address: CONTRACT_V1_ADDRESS,
    name: "V1 - Simple",
    features: ["Basic campaigns", "All-or-nothing funding"]
  },
  v2: {
    address: CONTRACT_V2_ADDRESS,
    name: "V2 - Milestones",
    features: ["Milestone-based funding", "Contributor voting", "Categories", "Images"]
  }
};
