/**
 * Test RAG Query với heritageId filter
 *
 * Chạy sau khi đã upload heritage: npm run upload-heritage-to-qdrant
 *
 * Usage: node test-rag-with-heritage-id.js
 */

import fetch from "node-fetch";

const API_URL = "http://localhost:8017/api/v1/rag/query";

// Lấy heritageId từ database (example IDs từ JSON file)
const HERITAGE_IDS = {
  "Ho Dynasty Citadel": "67f3edb13834bd66e6e1c678",
  "Central Thang Long Imperial Citadel": "67f3edb13834bd66e6e1c66d",
};

/**
 * Test query với heritageId (context-aware)
 */
async function testQueryWithHeritageId() {
  console.log("\n" + "=".repeat(70));
  console.log("TEST 1: Query VỚI heritageId (Context-aware)");
  console.log("=".repeat(70));

  const heritageId = HERITAGE_IDS["Ho Dynasty Citadel"];
  const question = "Kể về lịch sử xây dựng của di tích này";

  console.log(`\n📍 Heritage ID: ${heritageId}`);
  console.log(`❓ Question: "${question}"`);
  console.log("\n⏳ Querying...\n");

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        heritageId,
        topK: 3,
      }),
    });

    const data = await response.json();

    if (data.success) {
      console.log("✅ SUCCESS!\n");
      console.log("📝 Answer:");
      console.log("-".repeat(70));
      console.log(data.data.answer);
      console.log("-".repeat(70));

      console.log("\n📚 Sources:");
      data.data.sources.forEach((source, i) => {
        console.log(`\n[Source ${i + 1}]`);
        console.log(`  Heritage: ${source.metadata.name}`);
        console.log(`  Heritage ID: ${source.metadata.heritageId}`);
        console.log(`  Content Type: ${source.metadata.contentType}`);
        console.log(`  Relevance Score: ${(source.score * 100).toFixed(2)}%`);
        console.log(`  Preview: ${source.content.substring(0, 100)}...`);
      });
    } else {
      console.log("❌ FAILED:", data.message);
    }
  } catch (error) {
    console.error("❌ ERROR:", error.message);
  }
}

/**
 * Test query KHÔNG có heritageId (general search)
 */
async function testQueryWithoutHeritageId() {
  console.log("\n\n" + "=".repeat(70));
  console.log("TEST 2: Query KHÔNG CÓ heritageId (General search)");
  console.log("=".repeat(70));

  const question = "Những di tích nào được UNESCO công nhận?";

  console.log(`\n❓ Question: "${question}"`);
  console.log("\n⏳ Querying...\n");

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        topK: 5,
      }),
    });

    const data = await response.json();

    if (data.success) {
      console.log("✅ SUCCESS!\n");
      console.log("📝 Answer:");
      console.log("-".repeat(70));
      console.log(data.data.answer);
      console.log("-".repeat(70));

      console.log("\n📚 Sources (from multiple heritages):");
      data.data.sources.forEach((source, i) => {
        console.log(`\n[Source ${i + 1}]`);
        console.log(`  Heritage: ${source.metadata.name}`);
        console.log(`  Heritage ID: ${source.metadata.heritageId}`);
        console.log(`  Location: ${source.metadata.location}`);
        console.log(`  Relevance Score: ${(source.score * 100).toFixed(2)}%`);
      });
    } else {
      console.log("❌ FAILED:", data.message);
    }
  } catch (error) {
    console.error("❌ ERROR:", error.message);
  }
}

/**
 * So sánh 2 cách query
 */
async function compareAccuracy() {
  console.log("\n\n" + "=".repeat(70));
  console.log("TEST 3: So sánh độ chính xác");
  console.log("=".repeat(70));

  const heritageId = HERITAGE_IDS["Ho Dynasty Citadel"];
  const ambiguousQuestion = "Năm xây dựng là bao nhiêu?";

  console.log(`\n❓ Ambiguous Question: "${ambiguousQuestion}"`);
  console.log("   (Không rõ đang hỏi về di tích nào)\n");

  // Query WITH heritageId
  console.log("🔹 Query WITH heritageId (context-aware):");
  try {
    const response1 = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: ambiguousQuestion,
        heritageId,
        topK: 1,
      }),
    });
    const data1 = await response1.json();
    if (data1.success) {
      console.log(`   Answer: ${data1.data.answer.substring(0, 150)}...`);
      console.log(`   Source: ${data1.data.sources[0]?.metadata.name}`);
    }
  } catch (error) {
    console.error("   Error:", error.message);
  }

  // Query WITHOUT heritageId
  console.log("\n🔹 Query WITHOUT heritageId (ambiguous context):");
  try {
    const response2 = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: ambiguousQuestion,
        topK: 1,
      }),
    });
    const data2 = await response2.json();
    if (data2.success) {
      console.log(`   Answer: ${data2.data.answer.substring(0, 150)}...`);
      console.log(`   Source: ${data2.data.sources[0]?.metadata.name}`);
      console.log("   ⚠️  Có thể nhầm lẫn với di tích khác!");
    }
  } catch (error) {
    console.error("   Error:", error.message);
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log("\n🧪 TESTING RAG WITH HERITAGE ID FILTER");
  console.log("=".repeat(70));
  console.log("Make sure:");
  console.log("  1. MongoDB is running");
  console.log("  2. Qdrant is running");
  console.log(
    "  3. Heritage data is uploaded (npm run upload-heritage-to-qdrant)"
  );
  console.log("  4. API server is running (npm run dev)");

  await new Promise((resolve) => setTimeout(resolve, 2000));

  await testQueryWithHeritageId();
  await new Promise((resolve) => setTimeout(resolve, 2000));

  await testQueryWithoutHeritageId();
  await new Promise((resolve) => setTimeout(resolve, 2000));

  await compareAccuracy();

  console.log("\n\n" + "=".repeat(70));
  console.log("🎉 ALL TESTS COMPLETED!");
  console.log("=".repeat(70) + "\n");
}

// Run tests
runAllTests().catch(console.error);
