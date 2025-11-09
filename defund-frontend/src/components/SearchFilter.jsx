import { useState } from "react";

const CATEGORIES = [
  "All",
  "Technology",
  "Art & Design",
  "Education",
  "Healthcare",
  "Environment",
  "Community",
  "Gaming",
  "Other"
];

const STATUS_FILTERS = [
  { value: "all", label: "All Campaigns" },
  { value: "active", label: "Active" },
  { value: "funded", label: "Funded" },
  { value: "ended", label: "Ended" }
];

function SearchFilter({ onFilterChange }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    applyFilters(value, selectedCategory, selectedStatus);
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    applyFilters(searchTerm, category, selectedStatus);
  };

  const handleStatusChange = (status) => {
    setSelectedStatus(status);
    applyFilters(searchTerm, selectedCategory, status);
  };

  const applyFilters = (search, category, status) => {
    onFilterChange({
      searchTerm: search,
      category: category,
      status: status
    });
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("All");
    setSelectedStatus("all");
    onFilterChange({
      searchTerm: "",
      category: "All",
      status: "all"
    });
  };

  const hasActiveFilters = searchTerm || selectedCategory !== "All" || selectedStatus !== "all";

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Search campaigns by title or description..."
            className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <span className="absolute left-4 top-3.5 text-gray-400 text-xl">
            🔍
          </span>
        </div>
      </div>

      {/* Category Filter */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Category
        </label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => handleCategoryChange(category)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                selectedCategory === category
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Status Filter */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Status
        </label>
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => handleStatusChange(filter.value)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                selectedStatus === filter.value
                  ? "bg-purple-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <div className="pt-4 border-t border-gray-200">
          <button
            onClick={clearFilters}
            className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-200 transition"
          >
            ✕ Clear All Filters
          </button>
        </div>
      )}
    </div>
  );
}

export default SearchFilter;
