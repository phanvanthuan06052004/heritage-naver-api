/**
 * Tạo payload index cho collection Qdrant đã tồn tại
 * Không cần upload lại data
 * 
 * Usage: npm run create-qdrant-index
 */

import "dotenv/config";
import { QdrantClient } from "@qdrant/js-client-rest";
import { env } from "~/config/environment";

const qdrantClient = new QdrantClient({
  url: env.QDRANT_URL,
  apiKey: env.QDRANT_API_KEY,
});

const createIndexes = async () => {
  console.log("\n" + "=".repeat(70));
  console.log("🔧 CREATE QDRANT PAYLOAD INDEXES");
  console.log("=".repeat(70) + "\n");

  try {
    const collectionName = "heritage_documents";

    // Kiểm tra collection có tồn tại không
    console.log(`📡 Checking collection "${collectionName}"...`);
    const collections = await qdrantClient.getCollections();
    const exists = collections.collections.some(
      (col) => col.name === collectionName
    );

    if (!exists) {
      console.error(`❌ Collection "${collectionName}" does not exist!`);
      console.log("\n💡 Run this first: npm run upload-heritage-to-qdrant\n");
      process.exit(1);
    }

    console.log(`✅ Collection found\n`);

    // Lấy thông tin collection
    const collectionInfo = await qdrantClient.getCollection(collectionName);
    console.log(`📊 Collection info:`);
    console.log(`   - Vectors: ${collectionInfo.points_count || collectionInfo.vectors_count}`);
    console.log(`   - Status: ${collectionInfo.status}\n`);

    // Danh sách các field cần index
    const indexFields = [
      { name: "heritageId", schema: "keyword" },
      { name: "contentType", schema: "keyword" },
      { name: "location", schema: "keyword" },
      { name: "tags", schema: "keyword" },
    ];

    console.log("🔨 Creating indexes...\n");

    for (const field of indexFields) {
      try {
        console.log(`   Creating index for "${field.name}" (${field.schema})...`);
        
        await qdrantClient.createPayloadIndex(collectionName, {
          field_name: field.name,
          field_schema: field.schema,
        });

        console.log(`   ✅ Index "${field.name}" created successfully`);
      } catch (error) {
        if (error.message?.includes("already exists") || error.message?.includes("exists")) {
          console.log(`   ⚠️  Index "${field.name}" already exists`);
        } else {
          console.error(`   ❌ Failed to create index "${field.name}":`, error.message);
        }
      }
    }

    console.log("\n" + "=".repeat(70));
    console.log("✅ INDEXES CREATED SUCCESSFULLY");
    console.log("=".repeat(70) + "\n");

    console.log("📋 Now you can query with filters:");
    console.log(`   - Filter by heritageId: { must: [{ key: "heritageId", match: { value: "..." } }] }`);
    console.log(`   - Filter by contentType: { must: [{ key: "contentType", match: { value: "overview" } }] }`);
    console.log(`   - Filter by location: { must: [{ key: "location", match: { value: "Hanoi" } }] }`);
    console.log(`   - Filter by tags: { must: [{ key: "tags", match: { any: ["temple", "pagoda"] } }] }\n`);

    process.exit(0);
  } catch (error) {
    console.error("\n❌ ERROR:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

createIndexes();
