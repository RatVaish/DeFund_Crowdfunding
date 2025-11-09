import { useState, useEffect } from "react";
import {
  formatEther,
  formatAddress,
  getDaysRemaining,
  getProgressPercentage,
  getContract,
  getSigner,
  parseEther,
} from "../utils/ethereum";
import { parseCampaignData, getCategoryEmoji } from "../utils/campaignParser";

function CampaignCard({ campaign, campaignId, onContribute, currentAccount }) {
  const [contributing, setContributing] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const [amount, setAmount] = useState("");
  const [showContribute, setShowContribute] = useState(false);
  const [userContribution, setUserContribution] = useState(0);

  const amountRaised = campaign.amountRaised || campaign[5] || 0;
  const goalAmount = campaign.goalAmount || campaign[3] || 0;
  const deadline = campaign.deadline || campaign[4] || 0;
  const title = campaign.title || campaign[1] || "Untitled Campaign";
  const rawDescription = campaign.description || campaign[2] || "No description";
  const creator = campaign.creator || campaign[0] || "";
  const withdrawn = campaign.withdrawn || campaign[6] || false;

  const { category, imageUrl, description } = parseCampaignData(rawDescription);
  const categoryEmoji = getCategoryEmoji(category);

  const progress = getProgressPercentage(amountRaised, goalAmount);
  const daysLeft = getDaysRemaining(deadline);
  const isActive = daysLeft > 0;
  const goalReached = Number(amountRaised) >= Number(goalAmount);
  const isCreator = currentAccount && creator.toLowerCase() === currentAccount.toLowerCase();

  useEffect(() => {
    loadUserContribution();
  }, [campaignId, currentAccount]);

  const loadUserContribution = async () => {
    if (!currentAccount) return;
    try {
      const contract = getContract();
      const contribution = await contract.getContribution(campaignId, currentAccount);
      setUserContribution(Number(contribution));
    } catch (error) {
      console.error("Error loading contribution:", error);
    }
  };

  const handleContribute = async (e) => {
    e.preventDefault();
    setContributing(true);

    try {
      const signer = await getSigner();
      const contract = getContract(signer);

      const tx = await contract.contribute(campaignId, {
        value: parseEther(amount),
      });

      console.log("Contribution sent:", tx.hash);
      await tx.wait();

      alert(`Successfully contributed ${amount} ETH! 🎉`);
      setAmount("");
      setShowContribute(false);

      if (onContribute) {
        setTimeout(() => {
          onContribute();
          loadUserContribution();
        }, 2000);
      }
    } catch (error) {
      console.error("Error contributing:", error);
      if (error.code === 4001 || error.code === "ACTION_REJECTED") {
        alert("Transaction rejected");
      } else {
        alert("Error: " + error.message);
      }
    } finally {
      setContributing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!window.confirm("Withdraw all funds to your wallet?")) return;

    setWithdrawing(true);
    try {
      const signer = await getSigner();
      const contract = getContract(signer);

      const tx = await contract.withdrawFunds(campaignId);
      console.log("Withdrawal sent:", tx.hash);
      await tx.wait();

      alert("Funds withdrawn successfully! 🎉");

      if (onContribute) {
        setTimeout(() => onContribute(), 2000);
      }
    } catch (error) {
      console.error("Error withdrawing:", error);
      if (error.code === 4001 || error.code === "ACTION_REJECTED") {
        alert("Transaction rejected");
      } else {
        alert("Error: " + error.message);
      }
    } finally {
      setWithdrawing(false);
    }
  };

  const handleRefund = async () => {
    if (!window.confirm(`Refund your ${formatEther(userContribution)} ETH contribution?`)) return;

    setRefunding(true);
    try {
      const signer = await getSigner();
      const contract = getContract(signer);

      const tx = await contract.refund(campaignId);
      console.log("Refund sent:", tx.hash);
      await tx.wait();

      alert("Refund received successfully! 💰");

      if (onContribute) {
        setTimeout(() => {
          onContribute();
          loadUserContribution();
        }, 2000);
      }
    } catch (error) {
      console.error("Error refunding:", error);
      if (error.code === 4001 || error.code === "ACTION_REJECTED") {
        alert("Transaction rejected");
      } else {
        alert("Error: " + error.message);
      }
    } finally {
      setRefunding(false);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: `Support: ${title}`,
      text: `Check out this campaign on DeFund: ${title}`,
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(window.location.href);
        alert("Link copied to clipboard!");
      }
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition">
      {/* Image */}
      {imageUrl && (
        <div className="w-full h-48 bg-gray-200">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover"
            onError={(e) => e.target.style.display = 'none'}
          />
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{categoryEmoji}</span>
              <span className="text-xs bg-white/20 text-white px-2 py-1 rounded-full">
                {category}
              </span>
            </div>
            <h3 className="text-xl font-bold text-white mb-1">
              {title}
            </h3>
            <p className="text-blue-100 text-sm">
              by {formatAddress(creator)}
            </p>
          </div>
          <div className="ml-2">
            {goalReached ? (
              <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                ✓ Funded
              </span>
            ) : isActive ? (
              <span className="bg-yellow-400 text-gray-800 px-3 py-1 rounded-full text-xs font-semibold">
                Active
              </span>
            ) : (
              <span className="bg-gray-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                Ended
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-6">
        <p className="text-gray-600 mb-4 line-clamp-2">{description}</p>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all"
              style={{ width: `${Math.min(100, progress)}%` }}
            ></div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-500">Raised</p>
            <p className="font-bold text-gray-800">
              {parseFloat(formatEther(amountRaised)).toFixed(4)} ETH
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Goal</p>
            <p className="font-bold text-gray-800">
              {parseFloat(formatEther(goalAmount)).toFixed(2)} ETH
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Ends</p>
            <p className="font-bold text-gray-800">
              {daysLeft > 0 ? `${daysLeft}d` : "Ended"}
            </p>
          </div>
        </div>

        {/* User's Contribution */}
        {userContribution > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-700">
              Your contribution: <strong>{formatEther(userContribution)} ETH</strong>
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          {/* Contribute Button */}
          {isActive && !goalReached && !isCreator && (
            <>
              {!showContribute ? (
                <button
                  onClick={() => setShowContribute(true)}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-2 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-600 transition"
                >
                  💰 Contribute
                </button>
              ) : (
                <form onSubmit={handleContribute} className="space-y-2">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="Amount in ETH"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={contributing}
                      className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white py-2 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-600 transition disabled:opacity-50"
                    >
                      {contributing ? "Sending..." : "Send"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowContribute(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

          {/* Withdraw Button (Creator Only) */}
          {isCreator && !isActive && goalReached && !withdrawn && (
            <button
              onClick={handleWithdraw}
              disabled={withdrawing}
              className="w-full bg-green-500 text-white py-2 rounded-lg font-semibold hover:bg-green-600 transition disabled:opacity-50"
            >
              {withdrawing ? "Withdrawing..." : "💸 Withdraw Funds"}
            </button>
          )}

          {/* Refund Button (Contributors Only) */}
          {!isCreator && !isActive && !goalReached && userContribution > 0 && (
            <button
              onClick={handleRefund}
              disabled={refunding}
              className="w-full bg-orange-500 text-white py-2 rounded-lg font-semibold hover:bg-orange-600 transition disabled:opacity-50"
            >
              {refunding ? "Processing..." : "💰 Claim Refund"}
            </button>
          )}

          {/* Share Button */}
          <button
            onClick={handleShare}
            className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-200 transition"
          >
            🔗 Share Campaign
          </button>
        </div>

        {/* Status Messages */}
        {withdrawn && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center mt-4">
            <p className="text-green-700 text-sm font-semibold">
              ✓ Funds withdrawn by creator
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default CampaignCard;
