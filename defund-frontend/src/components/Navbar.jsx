import { useState, useEffect } from "react";
import { connectWallet, formatAddress } from "../utils/ethereum";

function Navbar() {
  const [account, setAccount] = useState(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    checkConnection();

    // Get MetaMask provider specifically
    const getMetaMaskProvider = () => {
      if (window.ethereum?.providers) {
        return window.ethereum.providers.find((provider) => provider.isMetaMask);
      }
      if (window.ethereum?.isMetaMask) {
        return window.ethereum;
      }
      return null;
    };

    const provider = getMetaMaskProvider();

    if (provider) {
      provider.on("accountsChanged", handleAccountsChanged);
      provider.on("chainChanged", () => window.location.reload());
    }

    return () => {
      if (provider) {
        provider.removeListener("accountsChanged", handleAccountsChanged);
      }
    };
  }, []);

  const checkConnection = async () => {
    const getMetaMaskProvider = () => {
      if (window.ethereum?.providers) {
        return window.ethereum.providers.find((provider) => provider.isMetaMask);
      }
      if (window.ethereum?.isMetaMask) {
        return window.ethereum;
      }
      return null;
    };

    const provider = getMetaMaskProvider();
    
    if (provider) {
      const accounts = await provider.request({ method: "eth_accounts" });
      if (accounts.length > 0) {
        setAccount(accounts[0]);
      }
    }
  };

  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      setAccount(null);
    } else {
      setAccount(accounts[0]);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const address = await connectWallet();
      setAccount(address);
    } catch (error) {
      console.error("Connection error:", error);
      alert(error.message);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <nav className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold">🚀 DeFund</h1>
            <p className="ml-4 text-sm opacity-90">Decentralized Crowdfunding</p>
          </div>

          <div>
            {account ? (
              <div className="flex items-center gap-3">
                <div className="bg-white/20 px-4 py-2 rounded-lg">
                  <span className="text-sm">
                    {formatAddress(account)}
                  </span>
                </div>
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              </div>
            ) : (
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="bg-white text-blue-600 px-6 py-2 rounded-lg font-semibold hover:bg-gray-100 transition disabled:opacity-50"
              >
                {connecting ? "Connecting..." : "Connect Wallet"}
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
