import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import CreateCampaign from "./components/CreateCampaign";
import CampaignCard from "./components/CampaignCard";
import SearchFilter from "./components/SearchFilter";
import { getContract } from "./utils/ethereum";
import { parseCampaignData } from "./utils/campaignParser";
import { getDaysRemaining } from "./utils/ethereum";

function App() {
  const [campaigns, setCampaigns] = useState([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentAccount, setCurrentAccount] = useState(null);
  const [filters, setFilters] = useState({
    searchTerm: "",
    category: "All",
    status: "all"
  });

  useEffect(() => {
    loadCampaigns();
    checkAccount();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [campaigns, filters]);

  const checkAccount = async () => {
    if (window.ethereum) {
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      if (accounts.length > 0) {
        setCurrentAccount(accounts[0]);
      }

      window.ethereum.on("accountsChanged", (accounts) => {
        setCurrentAccount(accounts[0] || null);
      });
    }
  };

  const loadCampaigns = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!window.ethereum) {
        setError("Please install MetaMask to use this app!");
        setLoading(false);
        return;
      }

      const contract = getContract();
      const totalCampaigns = await contract.getTotalCampaigns();
      const total = Number(totalCampaigns);

      console.log("Total campaigns:", total);

      if (total === 0) {
        setCampaigns([]);
        setLoading(false);
        return;
      }

      const campaignData = [];

      for (let i = 1; i <= total; i++) {
        const campaign = await contract.getCampaign(i);
        campaignData.push({
          id: i,
          ...campaign,
        });
      }

      console.log("Loaded campaigns:", campaignData);
      setCampaigns(campaignData);
    } catch (err) {
      console.error("Error loading campaigns:", err);
      setError("Failed to load campaigns. Please make sure you're on Sepolia network.");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...campaigns];

    // Search filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(campaign => {
        const title = (campaign.title || campaign[1] || "").toLowerCase();
        const description = (campaign.description || campaign[2] || "").toLowerCase();
        return title.includes(searchLower) || description.includes(searchLower);
      });
    }

    // Category filter
    if (filters.category !== "All") {
      filtered = filtered.filter(campaign => {
        const rawDescription = campaign.description || campaign[2] || "";
        const { category } = parseCampaignData(rawDescription);
        return category === filters.category;
      });
    }

    // Status filter
    if (filters.status !== "all") {
      filtered = filtered.filter(campaign => {
        const amountRaised = campaign.amountRaised || campaign[5] || 0;
        const goalAmount = campaign.goalAmount || campaign[3] || 0;
        const deadline = campaign.deadline || campaign[4] || 0;

        const daysLeft = getDaysRemaining(deadline);
        const isActive = daysLeft > 0;
        const goalReached = Number(amountRaised) >= Number(goalAmount);

        switch(filters.status) {
          case "active":
            return isActive && !goalReached;
          case "funded":
            return goalReached;
          case "ended":
            return !isActive && !goalReached;
          default:
            return true;
        }
      });
    }

    setFilteredCampaigns(filtered);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Fund the Future with Blockchain
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Create campaigns, contribute to projects, and build the future together.
            Powered by Ethereum smart contracts.
          </p>
        </div>

        {/* Create Campaign Section */}
        <CreateCampaign onCampaignCreated={loadCampaigns} />

        {/* Search & Filter Section */}
        {!loading && !error && campaigns.length > 0 && (
          <SearchFilter onFilterChange={handleFilterChange} />
        )}

        {/* Campaigns Section */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              {filters.searchTerm || filters.category !== "All" || filters.status !== "all"
                ? `Filtered Campaigns (${filteredCampaigns.length})`
                : `All Campaigns (${campaigns.length})`}
            </h2>
            <button
              onClick={loadCampaigns}
              className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-2"
            >
              <span>🔄</span>
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading campaigns...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-700 font-semibold">{error}</p>
            {!window.ethereum && (
              <a
                href="https://metamask.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block bg-orange-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-orange-600 transition"
              >
                Install MetaMask
              </a>
            )}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && campaigns.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <div className="text-6xl mb-4">🚀</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              No campaigns yet
            </h3>
            <p className="text-gray-600">
              Be the first to create a campaign and start raising funds!
            </p>
          </div>
        )}

        {/* No Results State */}
        {!loading && !error && campaigns.length > 0 && filteredCampaigns.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              No campaigns match your filters
            </h3>
            <p className="text-gray-600">
              Try adjusting your search or filters
            </p>
          </div>
        )}

        {/* Campaigns Grid */}
        {!loading && !error && filteredCampaigns.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCampaigns.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                campaignId={campaign.id}
                currentAccount={currentAccount}
                onContribute={loadCampaigns}
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <p className="text-gray-600">
              Built with ❤️ on Ethereum Sepolia Testnet
            </p>
            <a
              href="https://sepolia.etherscan.io/address/0x20A85b3e7d11E24e43AdEdCA212a001008d2A10B"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              View Contract on Etherscan
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
