/**
 * RAG Benchmark - Main Execution Script for Qdrant
 *
 * Chạy benchmark cho hệ thống RAG với Qdrant
 * Usage: npm run benchmark:qdrant hoặc npx babel-node src/benchmark/runQdrantBenchmark.js
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { benchmarkDataset, checkCollectionStatus } from "./qdrantBenchmark.js";
import { generateFullReport, exportResults } from "./analyzer.js";

// ES Module directory resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load benchmark data từ JSON file
 */
const loadBenchmarkData = async (filePath) => {
  try {
    console.log(`📂 Loading benchmark data from: ${filePath}`);
    const data = await fs.readFile(filePath, "utf-8");
    const testCases = JSON.parse(data);
    console.log(`✅ Loaded ${testCases.length} test cases\n`);
    return testCases;
  } catch (error) {
    console.error(`❌ Error loading benchmark data: ${error.message}`);
    throw error;
  }
};

/**
 * Save results to JSON file
 */
const saveResults = async (results, outputPath) => {
  try {
    console.log(`\n💾 Saving results to: ${outputPath}`);

    const exportData = exportResults(results, outputPath);
    await fs.writeFile(
      outputPath,
      JSON.stringify(exportData, null, 2),
      "utf-8"
    );

    console.log(`✅ Results saved successfully!`);
  } catch (error) {
    console.error(`❌ Error saving results: ${error.message}`);
  }
};

/**
 * Save console output to text file
 */
const saveConsoleOutput = async (content, outputPath) => {
  try {
    await fs.writeFile(outputPath, content, "utf-8");
    console.log(`✅ Console output saved to: ${outputPath}`);
  } catch (error) {
    console.error(`❌ Error saving console output: ${error.message}`);
  }
};

/**
 * Main benchmark execution
 */
const main = async () => {
  console.log("╔═══════════════════════════════════════════════════════╗");
  console.log("║         RAG BENCHMARK SYSTEM (QDRANT VERSION)         ║");
  console.log("╚═══════════════════════════════════════════════════════╝\n");

  // Capture console output
  let consoleOutput = "";
  const originalLog = console.log;
  console.log = (...args) => {
    const message = args.join(" ");
    consoleOutput += message + "\n";
    originalLog(...args);
  };

  try {
    // 1. Check collection status
    const collectionName = "heritage_documents";
    const collectionStatus = await checkCollectionStatus(collectionName);

    if (!collectionStatus.exists) {
      console.error(
        "\n❌ Qdrant collection does not exist. Please create it first."
      );
      process.exit(1);
    }

    // 2. Load benchmark data
    const benchmarkDataPath = path.join(__dirname, "../../benchmark_data.json");
    const testCases = await loadBenchmarkData(benchmarkDataPath);

    // 3. Run benchmark
    const topK = 5;
    const results = await benchmarkDataset(testCases, collectionName, topK);

    // 4. Generate report
    console.log("\n" + "=".repeat(60));
    console.log("📊 GENERATING BENCHMARK REPORT");
    console.log("=".repeat(60) + "\n");

    const report = generateFullReport(results);

    // 5. Save results
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const outputDir = path.join(__dirname, "../../benchmark_results");

    // Create output directory if it doesn't exist
    try {
      await fs.mkdir(outputDir, { recursive: true });
    } catch (error) {
      console.error("Error creating output directory:", error.message);
    }

    const jsonOutputPath = path.join(
      outputDir,
      `benchmark_qdrant_${timestamp}.json`
    );
    const consoleOutputPath = path.join(
      outputDir,
      `benchmark_qdrant_${timestamp}.txt`
    );

    await saveResults(results, jsonOutputPath);
    await saveConsoleOutput(consoleOutput, consoleOutputPath);

    // 6. Display summary
    console.log("\n" + "=".repeat(60));
    console.log("✅ BENCHMARK COMPLETED SUCCESSFULLY");
    console.log("=".repeat(60));
    console.log(`\n📁 Results saved to:`);
    console.log(`   - JSON: ${jsonOutputPath}`);
    console.log(`   - Console: ${consoleOutputPath}`);
    console.log("\n🎉 All done!\n");
  } catch (error) {
    console.error("\n❌ Fatal error during benchmark:", error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Restore original console.log
    console.log = originalLog;
  }
};

// Run the benchmark
main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
