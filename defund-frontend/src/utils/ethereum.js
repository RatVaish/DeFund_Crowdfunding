import { ethers } from "ethers";
import CrowdfundingABI from "../contracts/Crowdfunding.json";
import { CONTRACT_ADDRESS, SEPOLIA_CHAIN_ID, SEPOLIA_NETWORK } from "../contracts/config";

// Check if MetaMask is installed
export const isMetaMaskInstalled = () => {
  return typeof window.ethereum !== "undefined" && window.ethereum.isMetaMask;
};

// Get MetaMask provider specifically
const getMetaMaskProvider = () => {
  if (window.ethereum?.providers) {
    // Multiple wallets installed - find MetaMask
    return window.ethereum.providers.find((provider) => provider.isMetaMask);
  }
  // Single wallet or MetaMask is default
  if (window.ethereum?.isMetaMask) {
    return window.ethereum;
  }
  return null;
};

// Connect to MetaMask
export const connectWallet = async () => {
  const provider = getMetaMaskProvider();

  if (!provider) {
    throw new Error("Please install MetaMask!");
  }

  try {
    // Request account access
    const accounts = await provider.request({
      method: "eth_requestAccounts",
    });

    // Check if on Sepolia network
    const chainId = await provider.request({ method: "eth_chainId" });

    if (chainId !== SEPOLIA_CHAIN_ID) {
      // Try to switch to Sepolia
      try {
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: SEPOLIA_CHAIN_ID }],
        });
      } catch (switchError) {
        // Network doesn't exist, add it
        if (switchError.code === 4902) {
          await provider.request({
            method: "wallet_addEthereumChain",
            params: [SEPOLIA_NETWORK],
          });
        } else {
          throw switchError;
        }
      }
    }

    return accounts[0];
  } catch (error) {
    console.error("Error connecting wallet:", error);
    throw error;
  }
};

// Get contract instance (now supports both V1 and V2)
export const getContract = (signer = null, version = "v2") => {
  const metamaskProvider = getMetaMaskProvider();

  if (!metamaskProvider) {
    throw new Error("MetaMask not found");
  }

  const provider = new ethers.BrowserProvider(metamaskProvider);

  // Import the correct ABI based on version
  let contractABI, contractAddress;

  if (version === "v2") {
    const CrowdfundingV2ABI = require("../contracts/CrowdfundingV2.json");
    contractABI = CrowdfundingV2ABI.abi;
    contractAddress = "0xB1E5077ab6a8d2216d70774F2b02AADFBa162558";
  } else {
    const CrowdfundingABI = require("../contracts/Crowdfunding.json");
    contractABI = CrowdfundingABI.abi;
    contractAddress = "0x20A85b3e7d11E24e43AdEdCA212a001008d2A10B";
  }

  if (signer) {
    return new ethers.Contract(contractAddress, contractABI, signer);
  } else {
    return new ethers.Contract(contractAddress, contractABI, provider);
  }
};

// Get signer
export const getSigner = async () => {
  const metamaskProvider = getMetaMaskProvider();

  if (!metamaskProvider) {
    throw new Error("MetaMask not found");
  }

  const provider = new ethers.BrowserProvider(metamaskProvider);
  return provider.getSigner();
};

// Format address for display
export const formatAddress = (address) => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Format ETH amount
export const formatEther = (wei) => {
  return ethers.formatEther(wei);
};

// Parse ETH to Wei
export const parseEther = (eth) => {
  return ethers.parseEther(eth.toString());
};

// Format date
export const formatDate = (timestamp) => {
  return new Date(Number(timestamp) * 1000).toLocaleDateString();
};

// Calculate days remaining
export const getDaysRemaining = (deadline) => {
  const now = Math.floor(Date.now() / 1000);
  const remaining = Number(deadline) - now;
  return Math.max(0, Math.floor(remaining / (24 * 60 * 60)));
};

// Calculate progress percentage
export const getProgressPercentage = (raised, goal) => {
  const percentage = (Number(raised) / Number(goal)) * 100;
  return Math.min(100, percentage).toFixed(2);
};
