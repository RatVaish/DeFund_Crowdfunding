// Parse category and image from description
export const parseCampaignData = (description) => {
  const categoryMatch = description.match(/\[CATEGORY:(.*?)\]/);
  const imageMatch = description.match(/\[IMAGE:(.*?)\]/);

  const category = categoryMatch ? categoryMatch[1] : "Other";
  const imageUrl = imageMatch ? imageMatch[1] : "";
  const cleanDescription = description
    .replace(/\[CATEGORY:.*?\]/, "")
    .replace(/\[IMAGE:.*?\]/, "")
    .trim();

  return {
    category,
    imageUrl,
    description: cleanDescription
  };
};

// Get category emoji
export const getCategoryEmoji = (category) => {
  const emojis = {
    "Technology": "💻",
    "Art & Design": "🎨",
    "Education": "📚",
    "Healthcare": "🏥",
    "Environment": "🌱",
    "Community": "🤝",
    "Gaming": "🎮",
    "Other": "📦"
  };
  return emojis[category] || "📦";
};
