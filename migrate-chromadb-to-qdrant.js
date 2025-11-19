/**
 * Migration Script: ChromaDB → Qdrant
 *
 * Script này giúp migrate dữ liệu từ ChromaDB sang Qdrant
 *
 * Yêu cầu:
 * - ChromaDB server đang chạy (nếu có data cũ)
 * - Qdrant server đang chạy
 * - QDRANT_URL và QDRANT_API_KEY đã được config trong .env
 *
 * Usage:
 *   node migrate-chromadb-to-qdrant.js [collection_name]
 *
 * Example:
 *   node migrate-chromadb-to-qdrant.js heritage_documents
 */

import { ChromaClient } from "chromadb";
import { QdrantClient } from "@qdrant/js-client-rest";
import "dotenv/config";

// Configuration
const CHROMA_URL = process.env.CHROMA_URL || "http://localhost:8000";
const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;

// Khởi tạo clients
const chromaClient = new ChromaClient({ path: CHROMA_URL });
const qdrantClient = new QdrantClient({
  url: QDRANT_URL,
  apiKey: QDRANT_API_KEY,
});

/**
 * Migrate một collection từ ChromaDB sang Qdrant
 */
async function migrateCollection(collectionName) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`🔄 Migrating collection: ${collectionName}`);
  console.log(`${"=".repeat(60)}\n`);

  try {
    // Step 1: Lấy collection từ ChromaDB
    console.log("📦 Step 1: Fetching data from ChromaDB...");
    const chromaCollection = await chromaClient.getCollection({
      name: collectionName,
    });

    const count = await chromaCollection.count();
    console.log(`   ✓ Found ${count} documents`);

    if (count === 0) {
      console.log("   ⚠️  Collection is empty, nothing to migrate");
      return;
    }

    // Get all data
    console.log("   → Downloading all vectors...");
    const results = await chromaCollection.get({
      limit: count,
      include: ["embeddings", "documents", "metadatas"],
    });

    console.log(`   ✓ Downloaded ${results.ids.length} vectors`);

    // Step 2: Tạo collection trong Qdrant
    console.log("\n📦 Step 2: Creating collection in Qdrant...");

    const vectorSize = results.embeddings[0].length;
    console.log(`   → Vector size: ${vectorSize}`);

    try {
      await qdrantClient.createCollection(collectionName, {
        vectors: {
          size: vectorSize,
          distance: "Cosine",
        },
        optimizers_config: {
          default_segment_number: 2,
        },
        replication_factor: 2,
      });
      console.log(`   ✓ Collection "${collectionName}" created`);
    } catch (error) {
      if (error.message.includes("already exists")) {
        console.log(`   ⚠️  Collection already exists, will append data`);
      } else {
        throw error;
      }
    }

    // Step 3: Prepare points for Qdrant
    console.log("\n📦 Step 3: Preparing data for Qdrant...");
    const points = results.ids.map((id, index) => ({
      id: id,
      vector: results.embeddings[index],
      payload: {
        content: results.documents[index],
        ...(results.metadatas[index] || {}),
      },
    }));
    console.log(`   ✓ Prepared ${points.length} points`);

    // Step 4: Upload to Qdrant in batches
    console.log("\n📦 Step 4: Uploading to Qdrant...");
    const batchSize = 100;
    const totalBatches = Math.ceil(points.length / batchSize);

    for (let i = 0; i < points.length; i += batchSize) {
      const batch = points.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;

      process.stdout.write(
        `   → Batch ${batchNum}/${totalBatches} (${batch.length} points)...`
      );

      await qdrantClient.upsert(collectionName, {
        wait: true,
        points: batch,
      });

      console.log(" ✓");
    }

    // Step 5: Verify migration
    console.log("\n📦 Step 5: Verifying migration...");
    const qdrantInfo = await qdrantClient.getCollection(collectionName);
    const qdrantCount = qdrantInfo.points_count || qdrantInfo.vectors_count;

    console.log(`   → ChromaDB: ${count} documents`);
    console.log(`   → Qdrant: ${qdrantCount} points`);

    if (qdrantCount >= count) {
      console.log("   ✓ Migration verified successfully!");
    } else {
      console.log("   ⚠️  Warning: Point counts do not match");
    }

    // Success summary
    console.log(`\n${"=".repeat(60)}`);
    console.log("✅ Migration completed successfully!");
    console.log(`${"=".repeat(60)}`);
    console.log(`Collection: ${collectionName}`);
    console.log(`Documents migrated: ${count}`);
    console.log(`Vector dimensions: ${vectorSize}`);
    console.log(`Status: ✅ Ready to use`);
    console.log(`${"=".repeat(60)}\n`);
  } catch (error) {
    console.error("\n❌ Migration failed!");
    console.error("Error:", error.message);
    console.error("\nTroubleshooting:");
    console.error("1. Make sure ChromaDB is running at:", CHROMA_URL);
    console.error("2. Make sure Qdrant is running at:", QDRANT_URL);
    console.error("3. Check QDRANT_API_KEY in .env file");
    console.error("4. Verify collection name is correct");
    throw error;
  }
}

/**
 * List all collections in ChromaDB
 */
async function listChromaCollections() {
  try {
    console.log("📁 Available collections in ChromaDB:\n");
    const collections = await chromaClient.listCollections();

    if (collections.length === 0) {
      console.log("   No collections found");
      return [];
    }

    for (let i = 0; i < collections.length; i++) {
      const col = collections[i];
      try {
        const chromaCol = await chromaClient.getCollection({ name: col.name });
        const count = await chromaCol.count();
        console.log(`   ${i + 1}. ${col.name} (${count} documents)`);
      } catch (error) {
        console.log(`   ${i + 1}. ${col.name} (error getting count)`);
      }
    }

    return collections.map((c) => c.name);
  } catch (error) {
    console.error("Error listing collections:", error.message);
    return [];
  }
}

/**
 * Main function
 */
async function main() {
  console.log("\n🔄 ChromaDB → Qdrant Migration Tool\n");

  // Validate configuration
  if (!QDRANT_URL) {
    console.error("❌ Error: QDRANT_URL not set in .env file");
    process.exit(1);
  }

  console.log("Configuration:");
  console.log("  ChromaDB URL:", CHROMA_URL);
  console.log("  Qdrant URL:", QDRANT_URL);
  console.log("  Qdrant API Key:", QDRANT_API_KEY ? "✓ Set" : "✗ Not set");
  console.log("");

  // Get collection name from command line args
  const collectionName = process.argv[2];

  if (!collectionName) {
    console.log(
      "Usage: node migrate-chromadb-to-qdrant.js [collection_name]\n"
    );

    // List available collections
    const collections = await listChromaCollections();

    if (collections.length > 0) {
      console.log("\nTo migrate a collection, run:");
      console.log("  node migrate-chromadb-to-qdrant.js <collection_name>");
      console.log("\nExample:");
      console.log(`  node migrate-chromadb-to-qdrant.js ${collections[0]}`);
    }

    process.exit(0);
  }

  // Run migration
  try {
    await migrateCollection(collectionName);
    console.log("🎉 All done! You can now use Qdrant for your RAG system.");
    console.log("   Run: npm run test-qdrant");
  } catch (error) {
    process.exit(1);
  }
}

// Run
main();
