import { useState } from "react";
import { getContract, getSigner, parseEther } from "../utils/ethereum";

const CATEGORIES = [
  "Technology",
  "Art & Design",
  "Education",
  "Healthcare",
  "Environment",
  "Community",
  "Gaming",
  "Other"
];

function CreateCampaign({ onCampaignCreated }) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "Technology",
    imageUrl: "",
    goal: "",
    duration: "",
  });
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);

    try {
      const signer = await getSigner();
      const contract = getContract(signer);

      // Encode category and image in description for V1 contract
      const enhancedDescription = `[CATEGORY:${formData.category}][IMAGE:${formData.imageUrl}]${formData.description}`;

      const tx = await contract.createCampaign(
        formData.title,
        enhancedDescription,
        parseEther(formData.goal),
        parseInt(formData.duration)
      );

      console.log("Transaction sent:", tx.hash);
      await tx.wait();
      console.log("Campaign created!");

      alert("Campaign created successfully! 🎉");
      setFormData({
        title: "",
        description: "",
        category: "Technology",
        imageUrl: "",
        goal: "",
        duration: ""
      });
      setShowForm(false);

      if (onCampaignCreated) {
        setTimeout(() => {
          onCampaignCreated();
        }, 2000);
      }
    } catch (error) {
      console.error("Error creating campaign:", error);

      if (error.code === 4001 || error.code === "ACTION_REJECTED") {
        alert("Transaction rejected by user");
      } else {
        alert("Error creating campaign: " + error.message);
      }
    } finally {
      setCreating(false);
    }
  };

  if (!showForm) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <button
          onClick={() => setShowForm(true)}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-600 transition"
        >
          + Create New Campaign
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Create Campaign</h2>
        <button
          onClick={() => setShowForm(false)}
          className="text-gray-500 hover:text-gray-700 text-2xl"
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Campaign Title *
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Build a School in Kenya"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category *
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Image URL (optional)
            </label>
            <input
              type="url"
              name="imageUrl"
              value={formData.imageUrl}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://..."
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description *
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            rows="4"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Describe your campaign and what you'll do with the funds..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Goal (ETH) *
            </label>
            <input
              type="number"
              name="goal"
              value={formData.goal}
              onChange={handleChange}
              required
              step="0.01"
              min="0.01"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., 10"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration (Days) *
            </label>
            <input
              type="number"
              name="duration"
              value={formData.duration}
              onChange={handleChange}
              required
              min="1"
              max="365"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., 30"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={creating}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-600 transition disabled:opacity-50"
        >
          {creating ? "Creating Campaign..." : "Create Campaign"}
        </button>
      </form>
    </div>
  );
}

export default CreateCampaign;
