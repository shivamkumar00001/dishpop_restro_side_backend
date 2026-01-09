const Tag = require("../models/Tag");
const path = require("path");

require("dotenv").config({
  path: path.resolve(__dirname, "../../.env"),
});


/* ===============================
   PREDEFINED TAGS DATA

================================ */

const PREDEFINED_TAGS = [
  {
    key: "chef-special",
    name: "Chef's Special",
    icon: "👨‍🍳",
    color: "violet",
    description: "Handpicked by our chef",
    order: 1,
  },
  {
    key: "most-loved",
    name: "Most Loved",
    icon: "❤️",
    color: "rose",
    description: "Customer favorite",
    order: 2,
  },
  {
    key: "trending",
    name: "Trending",
    icon: "🔥",
    color: "orange",
    description: "Hot right now",
    order: 3,
  },
  {
    key: "dish-of-the-day",
    name: "Dish of the Day",
    icon: "⭐",
    color: "amber",
    description: "Today's special recommendation",
    order: 4,
  },
  {
    key: "romantic-dining",
    name: "Romantic Dining",
    icon: "💕",
    color: "pink",
    description: "Perfect for couples",
    order: 5,
  },
  {
    key: "spicy",
    name: "Spicy",
    icon: "🌶️",
    color: "red",
    description: "Extra hot and spicy",
    order: 6,
  },
  {
    key: "best-seller",
    name: "Best Seller",
    icon: "🏆",
    color: "yellow",
    description: "Our top-selling dish",
    order: 7,
  },
  {
    key: "new-arrival",
    name: "New Arrival",
    icon: "✨",
    color: "cyan",
    description: "Recently added to menu",
    order: 8,
  },
  {
    key: "seasonal",
    name: "Seasonal",
    icon: "🍂",
    color: "emerald",
    description: "Available for limited time",
    order: 9,
  },
  {
    key: "signature",
    name: "Signature Dish",
    icon: "💎",
    color: "indigo",
    description: "Our restaurant's signature",
    order: 10,
  },
];

/* ===============================
   SEED FUNCTION
================================ */

async function seedTags() {
  try {
    console.log("🌱 Seeding predefined tags...");

    


    // Insert predefined tags (update if exists)
    for (const tag of PREDEFINED_TAGS) {
      await Tag.findOneAndUpdate(
        { key: tag.key },
        tag,
        { upsert: true, new: true }
      );
    }

    console.log(`✅ Successfully seeded ${PREDEFINED_TAGS.length} tags`);
  } catch (error) {
    console.error("❌ Error seeding tags:", error);
    throw error;
  }
}

/* ===============================
   EXPORT
================================ */

module.exports = seedTags;

// Run directly if needed
if (require.main === module) {
  const mongoose = require("mongoose");
  require("dotenv").config();

  mongoose
    .connect(process.env.MONGO_URL)
    .then(() => seedTags())
    .then(() => {
      console.log("✅ Database seeding completed");
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ Seeding failed:", err);
      process.exit(1);
    });
}