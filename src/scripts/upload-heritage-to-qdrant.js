/**
 * Upload Heritage từ MongoDB lên Qdrant
 * Mỗi di tích được chia thành nhiều chunks với metadata đầy đủ
 *
 * Usage: npm run upload-heritage-to-qdrant
 */

import "dotenv/config";
import { GET_DB, CONNECT_DB } from "~/config/mongodb";
import { processDocument } from "~/services/ragService";

/**
 * Chia heritage thành nhiều chunks theo loại nội dung
 */
const createHeritageChunks = (heritage) => {
  const chunks = [];

  // Chunk 1: Overview information
  const overviewParts = [
    `Heritage Name: ${heritage.name}`,
    heritage.description ? `Description:\n${heritage.description}` : "",
    heritage.location ? `Location: ${heritage.location}` : "",
    heritage.coordinates
      ? `Coordinates: ${heritage.coordinates.latitude}, ${heritage.coordinates.longitude}`
      : "",
  ];

  chunks.push({
    content: overviewParts.filter((p) => p).join("\n"),
    contentType: "overview",
  });

  // Chunk 2: Architecture (if available)
  if (heritage.additionalInfo?.architectural) {
    chunks.push({
      content: `Architecture of ${heritage.name}:\n\n${heritage.additionalInfo.architectural}`,
      contentType: "architecture",
    });
  }

  // Chunk 3: Cultural Festival (if available)
  if (heritage.additionalInfo?.culturalFestival) {
    chunks.push({
      content: `Cultural Festival at ${heritage.name}:\n\n${heritage.additionalInfo.culturalFestival}`,
      contentType: "festival",
    });
  }

  // Chunk 4-N: Historical events (one chunk per event)
  if (
    heritage.additionalInfo?.historicalEvents &&
    heritage.additionalInfo.historicalEvents.length > 0
  ) {
    heritage.additionalInfo.historicalEvents.forEach((event, index) => {
      chunks.push({
        content: `Historical Event: ${event.title}\n\n${event.description}`,
        contentType: "history",
      });
    });
  }

  return chunks;
};

/**
 * Tạo metadata chung cho tất cả chunks của 1 di tích
 */
const createBaseMetadata = (heritage) => {
  return {
    // ID và tên
    heritageId: heritage._id.toString(),
    name: heritage.name,
    nameSlug: heritage.nameSlug || "",

    // Vị trí
    location: heritage.location || "",
    locationSlug: heritage.locationSlug || "",
    latitude: heritage.coordinates?.latitude || "",
    longitude: heritage.coordinates?.longitude || "",

    // Tags
    tags: Array.isArray(heritage.popularTags) ? heritage.popularTags : [],
    tagsSlug: Array.isArray(heritage.tagsSlug) ? heritage.tagsSlug : [],

    // Stats
    averageRating: String(heritage.stats?.averageRating || 0),
    totalReviews: String(heritage.stats?.totalReviews || 0),
    totalVisits: String(heritage.stats?.totalVisits || 0),
    totalFavorites: String(heritage.stats?.totalFavorites || 0),

    // Type
    documentType: "heritage",

    // Upload info
    uploadedAt: new Date().toISOString(),
  };
};

/**
 * Upload một heritage với tất cả chunks của nó
 */
const uploadSingleHeritage = async (heritage, index, total) => {
  try {
    console.log(`\n[${index}/${total}] Processing: ${heritage.name}`);

    // Tạo metadata chung
    const baseMetadata = createBaseMetadata(heritage);

    // Tạo các chunks
    const chunks = createHeritageChunks(heritage);
    console.log(`   📦 Created ${chunks.length} chunks`);

    // Upload từng chunk
    let totalChunksUploaded = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      // Merge metadata: base + chunk-specific
      const metadata = {
        ...baseMetadata,
        contentType: chunk.contentType,
      };

      console.log(
        `   ↳ Chunk ${i + 1}/${chunks.length} (${
          chunk.contentType
        }): ${chunk.content.substring(0, 50)}...`
      );

      // Upload chunk
      const result = await processDocument(
        chunk.content,
        metadata,
        "heritage_documents"
      );
      totalChunksUploaded += result.chunksCount || 1;

      // Delay nhỏ để tránh rate limit
      if (i < chunks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log(`   ✅ Uploaded ${totalChunksUploaded} vectors total`);

    return {
      success: true,
      heritageId: heritage._id.toString(),
      name: heritage.name,
      chunksCount: chunks.length,
      vectorsCount: totalChunksUploaded,
    };
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return {
      success: false,
      heritageId: heritage._id.toString(),
      name: heritage.name,
      error: error.message,
    };
  }
};

/**
 * Main function
 */
const main = async () => {
  console.log("\n" + "=".repeat(70));
  console.log("🏛️  UPLOAD HERITAGE TO QDRANT WITH METADATA");
  console.log("=".repeat(70) + "\n");

  try {
    // Kết nối MongoDB
    console.log("📡 Connecting to MongoDB...");
    await CONNECT_DB();
    const db = await GET_DB();
    const heritageCollection = db.collection("HistoryHeritageEn");

    // Đếm tổng số di tích
    const totalCount = await heritageCollection.countDocuments();
    console.log(`📊 Total heritages in database: ${totalCount}`);

    // Lấy các di tích có đầy đủ thông tin
    const heritages = await heritageCollection
      .find({
        name: { $exists: true, $ne: "" },
        description: { $exists: true, $ne: "" },
      })
      .toArray();

    console.log(`✅ Found ${heritages.length} heritages with complete data\n`);

    if (heritages.length === 0) {
      console.log("⚠️  No heritages to upload!");
      process.exit(0);
    }

    // Confirm trước khi upload
    console.log("📋 Upload strategy:");
    console.log(
      "   • Each heritage → Multiple chunks (overview, architecture, history, etc.)"
    );
    console.log("   • Each chunk has full metadata including heritageId");
    console.log(
      "   • Total estimated vectors: ~" + heritages.length * 5 + "\n"
    );

    console.log("⏳ Starting upload...\n");

    // Upload từng di tích
    const results = [];
    let successCount = 0;
    let failCount = 0;
    let totalVectors = 0;

    for (let i = 0; i < heritages.length; i++) {
      const heritage = heritages[i];
      const result = await uploadSingleHeritage(
        heritage,
        i + 1,
        heritages.length
      );

      results.push(result);

      if (result.success) {
        successCount++;
        totalVectors += result.vectorsCount || 0;
      } else {
        failCount++;
      }

      // Delay giữa các heritages để tránh overload
      if (i < heritages.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    // Tổng kết
    console.log("\n" + "=".repeat(70));
    console.log("📊 UPLOAD SUMMARY");
    console.log("=".repeat(70));
    console.log(`✅ Successful: ${successCount}/${heritages.length} heritages`);
    console.log(`❌ Failed: ${failCount}/${heritages.length} heritages`);
    console.log(`📦 Total vectors uploaded: ${totalVectors}`);

    if (failCount > 0) {
      console.log("\n❌ Failed heritages:");
      results
        .filter((r) => !r.success)
        .forEach((r) => {
          console.log(`   • ${r.name}: ${r.error}`);
        });
    }

    console.log("\n" + "=".repeat(70));
    console.log("🎉 UPLOAD COMPLETE!");
    console.log("=".repeat(70) + "\n");

    console.log("📋 Next steps:");
    console.log("1. Test RAG query with heritageId filter:");
    console.log("   POST http://localhost:8017/api/v1/rag/query");
    console.log("   Body: {");
    console.log('     "question": "Kể về lịch sử",');
    console.log(`     "heritageId": "${results[0]?.heritageId}"`);
    console.log("   }\n");
    console.log("2. Test RAG query without filter (search all):");
    console.log("   POST http://localhost:8017/api/v1/rag/query");
    console.log('   Body: { "question": "Các di tích ở Hà Nội" }\n');
    console.log("3. Check Qdrant dashboard:");
    console.log("   Local: http://localhost:6333/dashboard");
    console.log("   Cloud: https://cloud.qdrant.io\n");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ FATAL ERROR:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

// Run
main();
