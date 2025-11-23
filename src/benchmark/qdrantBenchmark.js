/**
 * RAG Benchmark Service for Qdrant
 * Sử dụng RAG API endpoint để benchmark
 */

import { evaluateAnswer } from "./metrics.js";
import { QdrantClient } from "@qdrant/js-client-rest";
import { env } from "../config/environment.js";

// Khởi tạo Qdrant client
const qdrantClient = new QdrantClient({
  url: env.QDRANT_URL,
  apiKey: env.QDRANT_API_KEY,
});

/**
 * Calculate retrieval metrics (precision, recall)
 */
const calculateRetrievalMetrics = (retrievedSources, relevantDocIds) => {
  if (!relevantDocIds || relevantDocIds.length === 0) {
    console.log(`   ⚠️  No relevant docs provided for comparison`);
    return {
      precision: 0,
      recall: 0,
      f1: 0,
    };
  }

  // Extract document IDs from retrieved sources
  // Use s.id which is the Qdrant point ID
  const retrievedIds = retrievedSources.map((s) => s.id).filter(Boolean);

  console.log(`   🔍 Retrieved IDs:`, retrievedIds);
  console.log(`   🔍 Expected IDs:`, relevantDocIds);

  if (retrievedIds.length === 0) {
    console.log(`   ⚠️  No IDs extracted from sources`);
    return {
      precision: 0,
      recall: 0,
      f1: 0,
    };
  }

  // Calculate intersection
  const intersection = retrievedIds.filter((id) =>
    relevantDocIds.includes(id)
  ).length;

  console.log(`   ✅ Matched ${intersection} documents`);

  const precision = intersection / retrievedIds.length;
  const recall = intersection / relevantDocIds.length;
  const f1 =
    precision + recall > 0
      ? (2 * precision * recall) / (precision + recall)
      : 0;

  return {
    precision,
    recall,
    f1,
  };
};

/**
 * Call RAG API endpoint
 */
const queryRAG = async ({ question, heritageId, topK, collectionName }) => {
  try {
    const response = await fetch("http://localhost:8017/v1/rag/query", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question,
        heritageId,
        topK,
        collectionName,
      }),
    });

    if (!response.ok) {
      throw new Error(`RAG API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data; // Return the data object
  } catch (error) {
    console.error("Error calling RAG API:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Benchmark một test case sử dụng queryRAG service
 */
export const benchmarkTestCase = async (
  testCase,
  collectionName = "heritage_documents",
  topK = 5
) => {
  try {
    console.log(`\n📝 Test Case: ${testCase.id}`);
    console.log(`   Question: ${testCase.question}`);

    const startTime = Date.now();

    // Gọi queryRAG service - giống như production
    const requestBody = {
      question: testCase.question,
      topK: topK,
      collectionName: collectionName,
    };

    // Chỉ thêm heritageId nếu có giá trị
    // if (testCase.heritageId) {
    //   requestBody.heritageId = testCase.heritageId;
    // }

    const ragResponse = await queryRAG(requestBody);

    const totalTime = Date.now() - startTime;

    // Extract data từ response
    const generatedAnswer = ragResponse?.answer || "No answer generated";
    const sources = ragResponse?.sources || [];
    const mode = ragResponse?.mode || "unknown";

    console.log(`   🤖 Mode: ${mode}`);
    console.log(`   ⏱️  Total time: ${totalTime}ms`);

    // Evaluate answer nếu không có error
    let metrics = null;
    if (ragResponse?.success) {
      const evaluation = evaluateAnswer(generatedAnswer, testCase.ground_truth);

      // Calculate retrieval metrics
      // Debug: Log sources structure
      if (sources.length > 0) {
        console.log(`   🔍 Retrieved ${sources.length} sources`);
        console.log(
          `   🔍 First source metadata:`,
          JSON.stringify(sources[0].metadata, null, 2)
        );
        console.log(`   🔍 Expected related_docs:`, testCase.related_docs);
      }

      const retrievalMetrics = calculateRetrievalMetrics(
        sources,
        testCase.related_docs || []
      );

      metrics = {
        ...evaluation,
        ...retrievalMetrics,
        totalTime,
        mode,
      };

      console.log(
        `   📊 BLEU: ${(evaluation.bleu || 0).toFixed(3)} | ROUGE-L: ${(
          evaluation.rouge_l_f1 || 0
        ).toFixed(3)} | Cosine: ${(evaluation.cosine_tfidf || 0).toFixed(3)}`
      );

      if (retrievalMetrics.precision !== undefined) {
        console.log(
          `   📊 Retrieval - Precision: ${retrievalMetrics.precision.toFixed(
            3
          )} | Recall: ${retrievalMetrics.recall.toFixed(3)}`
        );
      }
    } else {
      console.log(`   ⚠️  RAG query failed`);
    }

    return {
      testCaseId: testCase.id,
      question: testCase.question,
      groundTruth: testCase.ground_truth,
      generatedAnswer,
      mode,
      sources: sources.map((s) => ({
        content: (s.content || s.document || "").substring(0, 200),
        vectorScore: s.vectorScore || s.score,
        rerankerScore: s.rerankerScore,
        metadata: s.metadata,
      })),
      metrics,
      success: ragResponse?.success || false,
    };
  } catch (error) {
    console.error(`   ❌ Error benchmarking test case ${testCase.id}:`, error);
    return {
      testCaseId: testCase.id,
      question: testCase.question,
      error: error.message,
      metrics: null,
      success: false,
    };
  }
};

/**
 * Benchmark toàn bộ dataset
 */
export const benchmarkDataset = async (
  testCases,
  collectionName = "heritage_documents",
  topK = 5
) => {
  console.log(`\n🚀 Starting benchmark with ${testCases.length} test cases`);
  console.log(`   Collection: ${collectionName}`);
  console.log(`   Top-K: ${topK}\n`);

  const results = [];

  for (let i = 0; i < testCases.length; i++) {
    console.log(`\n[${i + 1}/${testCases.length}] Processing...`);
    const result = await benchmarkTestCase(testCases[i], collectionName, topK);
    results.push(result);

    // Add delay between requests to avoid rate limiting
    if (i < testCases.length - 1) {
      console.log("   ⏳ Waiting 2s before next test case...");
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  console.log("\n✅ Benchmark completed!");
  return results;
};

/**
 * Check Qdrant collection status
 */
export const checkCollectionStatus = async (
  collectionName = "heritage_documents"
) => {
  try {
    console.log(`\n🔍 Checking Qdrant collection: ${collectionName}`);

    const collectionInfo = await qdrantClient.getCollection(collectionName);

    console.log(`   ✅ Collection exists`);
    console.log(`   📊 Vector count: ${collectionInfo.points_count}`);
    console.log(
      `   📏 Vector size: ${collectionInfo.config.params.vectors.size}`
    );

    return {
      exists: true,
      pointsCount: collectionInfo.points_count,
      vectorSize: collectionInfo.config.params.vectors.size,
    };
  } catch (error) {
    console.log(`   ❌ Collection not found or error: ${error.message}`);
    return {
      exists: false,
      error: error.message,
    };
  }
};
