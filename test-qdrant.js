import { QdrantClient } from "@qdrant/js-client-rest";
import "dotenv/config";

const client = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

async function testConnection() {
  try {
    console.log("🔗 Testing Qdrant connection...");
    console.log("URL:", process.env.QDRANT_URL);
    console.log(
      "API Key:",
      process.env.QDRANT_API_KEY ? "✅ Set" : "❌ Not set"
    );
    console.log("");

    // Test connection by listing collections
    const collections = await client.getCollections();
    console.log("✅ Connected successfully!");
    console.log("📁 Total collections:", collections.collections.length);
    console.log("");

    // Get info for each collection
    if (collections.collections.length > 0) {
      console.log("Collection details:");
      for (const col of collections.collections) {
        try {
          const info = await client.getCollection(col.name);
          console.log(`\n📊 ${col.name}`);
          console.log(`   • Points: ${info.points_count || 0}`);
          console.log(`   • Vectors: ${info.vectors_count || 0}`);
          console.log(`   • Status: ${info.status}`);
          console.log(
            `   • Vector size: ${info.config?.params?.vectors?.size || "N/A"}`
          );
          console.log(
            `   • Distance: ${info.config?.params?.vectors?.distance || "N/A"}`
          );
        } catch (error) {
          console.log(`   ⚠️  Error getting info: ${error.message}`);
        }
      }
    } else {
      console.log(
        "ℹ️  No collections found. You can create one by uploading documents."
      );
    }

    console.log("\n✅ Test completed successfully!");
  } catch (error) {
    console.error("\n❌ Connection failed!");
    console.error("Error:", error.message);
    console.error("\nTroubleshooting:");
    console.error("1. Check QDRANT_URL in .env file");
    console.error("2. Check QDRANT_API_KEY in .env file");
    console.error("3. Make sure Qdrant server is running");
    console.error("4. Check network/firewall settings");
    process.exit(1);
  }
}

testConnection();
