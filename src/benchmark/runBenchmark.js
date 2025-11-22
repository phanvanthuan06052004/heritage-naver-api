/**
 * RAG Benchmark - Main Execution Script
 * 
 * Chạy benchmark cho hệ thống RAG
 * Usage: npm run benchmark hoặc npx babel-node src/benchmark/runBenchmark.js
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { benchmarkDataset, checkCollectionStatus } from './ragBenchmark.js'
import { generateFullReport, exportResults } from './analyzer.js'

// ES Module directory resolution
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Load benchmark data từ JSON file
 */
const loadBenchmarkData = async (filePath) => {
  try {
    console.log(`📂 Loading benchmark data from: ${filePath}`)
    const data = await fs.readFile(filePath, 'utf-8')
    const testCases = JSON.parse(data)
    console.log(`✅ Loaded ${testCases.length} test cases\n`)
    return testCases
  } catch (error) {
    console.error(`❌ Error loading benchmark data: ${error.message}`)
    throw error
  }
}

/**
 * Save results to JSON file
 */
const saveResults = async (results, outputPath) => {
  try {
    console.log(`\n💾 Saving results to: ${outputPath}`)
    
    const exportData = exportResults(results, outputPath)
    await fs.writeFile(
      outputPath,
      JSON.stringify(exportData, null, 2),
      'utf-8'
    )
    
    console.log(`✅ Results saved successfully!`)
  } catch (error) {
    console.error(`❌ Error saving results: ${error.message}`)
  }
}

/**
 * Main benchmark execution
 */
const runBenchmark = async (options = {}) => {
  const {
    inputFile = 'benchmark_data.json',
    outputFile = 'benchmark_results.json',
    collectionName = 'heritage_documents',
    topK = 5,
    useMock = false
  } = options

  console.log('\n' + '='.repeat(80))
  console.log('🚀 RAG BENCHMARK SYSTEM')
  console.log('='.repeat(80))
  console.log(`\n📋 Configuration:`)
  console.log(`   Input File: ${inputFile}`)
  console.log(`   Output File: ${outputFile}`)
  console.log(`   Collection: ${collectionName}`)
  console.log(`   Top-K: ${topK}`)
  console.log(`   Mock Mode: ${useMock ? 'Yes (no API calls)' : 'No (using real API)'}`)
  console.log('='.repeat(80))

  try {
    // 1. Check collection status
    console.log('\n🔍 Checking Chroma collection status...')
    const collectionStatus = await checkCollectionStatus(collectionName)
    
    if (!collectionStatus.exists) {
      console.log(`⚠️  Warning: Collection "${collectionName}" does not exist!`)
      console.log(`   You need to upload documents first using: POST /api/v1/rag/upload`)
      console.log(`   Continuing in mock mode...\n`)
    } else {
      console.log(`✅ Collection "${collectionName}" found with ${collectionStatus.count} documents\n`)
    }

    // 2. Load benchmark data
    const inputPath = path.isAbsolute(inputFile)
      ? inputFile
      : path.join(process.cwd(), inputFile)
    
    const testCases = await loadBenchmarkData(inputPath)

    if (testCases.length === 0) {
      console.log('❌ No test cases found in input file')
      return
    }

    // 3. Run benchmark
    const benchmarkOptions = {
      collectionName,
      topK,
      useMock: useMock || !collectionStatus.exists
    }

    const results = await benchmarkDataset(testCases, benchmarkOptions)

    // 4. Generate and display report
    generateFullReport(results)

    // 5. Save results
    const outputPath = path.isAbsolute(outputFile)
      ? outputFile
      : path.join(process.cwd(), outputFile)
    
    await saveResults(results, outputPath)

    console.log('\n' + '='.repeat(80))
    console.log('🎉 BENCHMARK COMPLETED SUCCESSFULLY!')
    console.log('='.repeat(80))
    console.log(`\n📊 Summary:`)
    console.log(`   Total Questions: ${results.length}`)
    console.log(`   Successful: ${results.filter(r => !r.error).length}`)
    console.log(`   Failed: ${results.filter(r => r.error).length}`)
    console.log(`\n📁 Output files:`)
    console.log(`   Results: ${outputPath}`)
    console.log('\n')

  } catch (error) {
    console.error('\n❌ Benchmark failed:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

/**
 * Parse command line arguments
 */
const parseArgs = () => {
  const args = process.argv.slice(2)
  const options = {
    inputFile: 'benchmark_data.json',
    outputFile: 'benchmark_results.json',
    collectionName: 'heritage_documents',
    topK: 5,
    useMock: false
  }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--input':
      case '-i':
        options.inputFile = args[++i]
        break
      case '--output':
      case '-o':
        options.outputFile = args[++i]
        break
      case '--collection':
      case '-c':
        options.collectionName = args[++i]
        break
      case '--topk':
      case '-k':
        options.topK = parseInt(args[++i])
        break
      case '--mock':
      case '-m':
        options.useMock = true
        break
      case '--help':
      case '-h':
        printHelp()
        process.exit(0)
        break
      default:
        console.warn(`Unknown argument: ${args[i]}`)
    }
  }

  return options
}

/**
 * Print help message
 */
const printHelp = () => {
  console.log(`
RAG Benchmark System - Help

Usage:
  npm run benchmark [options]
  npx babel-node src/benchmark/runBenchmark.js [options]

Options:
  -i, --input <file>        Input JSON file with test cases (default: benchmark_data.json)
  -o, --output <file>       Output JSON file for results (default: benchmark_results.json)
  -c, --collection <name>   Chroma collection name (default: heritage_documents)
  -k, --topk <number>       Number of documents to retrieve (default: 5)
  -m, --mock                Use mock mode (no API calls)
  -h, --help                Show this help message

Examples:
  npm run benchmark
  npm run benchmark -- --input my_data.json --output my_results.json
  npm run benchmark -- --collection test_collection --topk 10
  npm run benchmark -- --mock

Before running:
  1. Make sure Chroma DB is running: docker run -p 8000:8000 chromadb/chroma
  2. Make sure you have uploaded documents: POST /api/v1/rag/upload
  3. Configure .env with Naver API keys (or use --mock for testing)
`)
}

// Run if executed directly
// Check if this file is being run directly (works on both Unix and Windows)
const isMainModule = () => {
  try {
    // Method 1: Compare resolved paths
    const scriptPath = fileURLToPath(import.meta.url)
    const mainPath = process.argv[1]
    
    // Normalize paths for comparison (handle Windows backslashes)
    const normalizedScript = path.resolve(scriptPath).toLowerCase()
    const normalizedMain = path.resolve(mainPath).toLowerCase()
    
    return normalizedScript === normalizedMain
  } catch {
    // Fallback: if any error, assume it's main module
    return true
  }
}

if (isMainModule()) {
  const options = parseArgs()
  runBenchmark(options)
    .then(() => {
      console.log('✅ Benchmark execution completed')
      process.exit(0)
    })
    .catch(error => {
      console.error('❌ Benchmark execution failed:', error)
      console.error(error.stack)
      process.exit(1)
    })
}

export { runBenchmark, loadBenchmarkData, saveResults }
