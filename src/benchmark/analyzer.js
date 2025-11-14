/**
 * Result Analyzer
 * Phân tích và hiển thị kết quả benchmark
 */

import { calculateAverage, findLowestScores, classifyQuality } from './metrics.js'

/**
 * Tạo bảng ASCII đẹp
 */
const createTable = (headers, rows) => {
  const columnWidths = headers.map((header, i) => {
    const maxContentWidth = Math.max(
      ...rows.map(row => String(row[i] || '').length)
    )
    return Math.max(header.length, maxContentWidth)
  })

  const separator = '+' + columnWidths.map(w => '-'.repeat(w + 2)).join('+') + '+'
  const headerRow = '|' + headers.map((h, i) => ` ${h.padEnd(columnWidths[i])} `).join('|') + '|'
  const dataRows = rows.map(row =>
    '|' + row.map((cell, i) => ` ${String(cell || '').padEnd(columnWidths[i])} `).join('|') + '|'
  )

  return [separator, headerRow, separator, ...dataRows, separator].join('\n')
}

/**
 * Phân tích tổng quan kết quả
 */
export const analyzeSummary = (results) => {
  if (!results || results.length === 0) {
    console.log('❌ No results to analyze')
    return null
  }

  const summary = {
    totalQuestions: results.length,
    successfulQuestions: results.filter(r => !r.error).length,
    failedQuestions: results.filter(r => r.error).length,
    avgBLEU: calculateAverage(results, 'metrics.bleu') || calculateAverageNested(results, 'bleu'),
    avgROUGEL: calculateAverageNested(results, 'rouge_l_f1'),
    avgCosineTFIDF: calculateAverageNested(results, 'cosine_tfidf'),
    avgCosineSemantic: calculateAverageNested(results, 'cosine_semantic'),
    avgExecutionTime: calculateAverage(results, 'execution_time_ms'),
    avgSourcesRetrieved: calculateAverageNested(results, 'sources', true)
  }

  // Phân loại chất lượng
  const qualityDistribution = {
    Excellent: 0,
    Good: 0,
    Fair: 0,
    Poor: 0,
    'Very Poor': 0
  }

  results.forEach(result => {
    if (result.metrics) {
      const quality = classifyQuality(result.metrics)
      qualityDistribution[quality]++
    }
  })

  summary.qualityDistribution = qualityDistribution

  return summary
}

/**
 * In summary ra console với format đẹp
 */
export const printSummary = (results) => {
  console.log('\n' + '='.repeat(80))
  console.log('📊 BENCHMARK SUMMARY REPORT')
  console.log('='.repeat(80))

  const summary = analyzeSummary(results)
  if (!summary) return

  console.log('\n🎯 Overall Statistics:')
  console.log(`   Total Questions: ${summary.totalQuestions}`)
  console.log(`   Successful: ${summary.successfulQuestions} ✅`)
  console.log(`   Failed: ${summary.failedQuestions} ❌`)
  console.log(`   Average Execution Time: ${summary.avgExecutionTime.toFixed(2)}ms`)
  console.log(`   Average Sources Retrieved: ${summary.avgSourcesRetrieved.toFixed(2)}`)

  console.log('\n📈 Average Metrics:')
  console.log(`   BLEU Score:            ${summary.avgBLEU.toFixed(4)} ${getScoreEmoji(summary.avgBLEU)}`)
  console.log(`   ROUGE-L F1:            ${summary.avgROUGEL.toFixed(4)} ${getScoreEmoji(summary.avgROUGEL)}`)
  console.log(`   Cosine (TF-IDF):       ${summary.avgCosineTFIDF.toFixed(4)} ${getScoreEmoji(summary.avgCosineTFIDF)}`)
  
  if (summary.avgCosineSemantic > 0) {
    console.log(`   Cosine (Semantic):     ${summary.avgCosineSemantic.toFixed(4)} ${getScoreEmoji(summary.avgCosineSemantic)}`)
  }

  console.log('\n🏆 Quality Distribution:')
  Object.entries(summary.qualityDistribution).forEach(([quality, count]) => {
    if (count > 0) {
      const percentage = ((count / summary.totalQuestions) * 100).toFixed(1)
      const bar = '█'.repeat(Math.floor(count * 30 / summary.totalQuestions))
      console.log(`   ${quality.padEnd(12)} ${count.toString().padStart(3)} (${percentage.padStart(5)}%) ${bar}`)
    }
  })

  return summary
}

/**
 * Tìm và hiển thị top worst performing questions
 */
export const printWorstPerformers = (results, count = 5) => {
  console.log('\n' + '='.repeat(80))
  console.log('⚠️  WORST PERFORMING QUESTIONS')
  console.log('='.repeat(80))

  // Tính composite score
  const resultsWithScore = results
    .filter(r => r.metrics)
    .map(r => ({
      ...r,
      compositeScore: (
        r.metrics.bleu +
        r.metrics.rouge_l_f1 +
        r.metrics.cosine_tfidf +
        (r.metrics.cosine_semantic || r.metrics.cosine_tfidf)
      ) / 4
    }))
    .sort((a, b) => a.compositeScore - b.compositeScore)
    .slice(0, count)

  resultsWithScore.forEach((result, index) => {
    console.log(`\n${index + 1}. Question ID ${result.id} (Score: ${result.compositeScore.toFixed(4)})`)
    console.log(`   ❓ Question: ${result.question}`)
    console.log(`   ✅ Ground Truth: ${result.ground_truth.substring(0, 100)}...`)
    console.log(`   🤖 Generated: ${result.generated_answer.substring(0, 100)}...`)
    console.log(`   📊 Metrics:`)
    console.log(`      - BLEU: ${result.metrics.bleu.toFixed(4)}`)
    console.log(`      - ROUGE-L F1: ${result.metrics.rouge_l_f1.toFixed(4)}`)
    console.log(`      - Cosine: ${result.metrics.cosine_tfidf.toFixed(4)}`)
    
    // Phân tích nguyên nhân
    const issues = diagnoseIssues(result)
    if (issues.length > 0) {
      console.log(`   🔍 Potential Issues:`)
      issues.forEach(issue => console.log(`      - ${issue}`))
    }
  })
}

/**
 * In detailed results table
 */
export const printDetailedResults = (results) => {
  console.log('\n' + '='.repeat(80))
  console.log('📋 DETAILED RESULTS')
  console.log('='.repeat(80) + '\n')

  const headers = ['ID', 'Question', 'BLEU', 'ROUGE-L', 'Cosine', 'Quality', 'Time(ms)']
  const rows = results
    .filter(r => r.metrics)
    .map(r => [
      r.id,
      r.question.substring(0, 40) + (r.question.length > 40 ? '...' : ''),
      r.metrics.bleu.toFixed(3),
      r.metrics.rouge_l_f1.toFixed(3),
      r.metrics.cosine_tfidf.toFixed(3),
      classifyQuality(r.metrics),
      r.execution_time_ms.toFixed(0)
    ])

  console.log(createTable(headers, rows))
}

/**
 * Generate improvement suggestions
 */
export const generateSuggestions = (results) => {
  console.log('\n' + '='.repeat(80))
  console.log('💡 IMPROVEMENT SUGGESTIONS')
  console.log('='.repeat(80))

  const summary = analyzeSummary(results)
  const suggestions = []

  // Check retrieval quality
  const avgSources = summary.avgSourcesRetrieved
  if (avgSources < 2) {
    suggestions.push({
      category: 'Retrieval',
      issue: 'Very few documents retrieved on average',
      suggestion: 'Consider increasing topK parameter or improving document indexing'
    })
  }

  // Check BLEU scores
  if (summary.avgBLEU < 0.3) {
    suggestions.push({
      category: 'Generation',
      issue: 'Low BLEU scores indicate poor word-level matching',
      suggestion: 'Review prompt engineering or consider fine-tuning the generation model'
    })
  }

  // Check ROUGE-L scores
  if (summary.avgROUGEL < 0.4) {
    suggestions.push({
      category: 'Generation',
      issue: 'Low ROUGE-L scores indicate poor sequence matching',
      suggestion: 'Generated answers may be too different from expected format. Review context quality.'
    })
  }

  // Check cosine similarity
  if (summary.avgCosineTFIDF < 0.5) {
    suggestions.push({
      category: 'Semantic',
      issue: 'Low cosine similarity indicates semantic mismatch',
      suggestion: 'Retrieved context may not be relevant. Improve embedding quality or document preprocessing.'
    })
  }

  // Check execution time
  if (summary.avgExecutionTime > 5000) {
    suggestions.push({
      category: 'Performance',
      issue: 'High average execution time',
      suggestion: 'Consider caching embeddings or optimizing API calls'
    })
  }

  // Quality distribution analysis
  const poorQuality = (summary.qualityDistribution.Poor || 0) + (summary.qualityDistribution['Very Poor'] || 0)
  const poorPercentage = (poorQuality / summary.totalQuestions) * 100

  if (poorPercentage > 30) {
    suggestions.push({
      category: 'Overall Quality',
      issue: `${poorPercentage.toFixed(1)}% of answers are of poor quality`,
      suggestion: 'Consider comprehensive review of RAG pipeline: document quality, retrieval strategy, and generation prompts'
    })
  }

  // Check failed questions
  if (summary.failedQuestions > 0) {
    suggestions.push({
      category: 'Reliability',
      issue: `${summary.failedQuestions} questions failed to process`,
      suggestion: 'Review error logs and improve error handling. Check API connectivity and rate limits.'
    })
  }

  // Print suggestions
  if (suggestions.length === 0) {
    console.log('\n✨ Great job! No major issues detected. Your RAG system is performing well!')
  } else {
    suggestions.forEach((s, index) => {
      console.log(`\n${index + 1}. [${s.category}]`)
      console.log(`   ⚠️  Issue: ${s.issue}`)
      console.log(`   💡 Suggestion: ${s.suggestion}`)
    })
  }

  console.log('\n' + '='.repeat(80))
}

/**
 * Xuất báo cáo hoàn chỉnh
 */
export const generateFullReport = (results) => {
  printSummary(results)
  printDetailedResults(results)
  printWorstPerformers(results, 5)
  generateSuggestions(results)

  console.log('\n✅ Report generation completed!\n')
}

// ============ HELPER FUNCTIONS ============

/**
 * Get emoji based on score
 */
const getScoreEmoji = (score) => {
  if (score >= 0.8) return '🟢'
  if (score >= 0.6) return '🟡'
  if (score >= 0.4) return '🟠'
  return '🔴'
}

/**
 * Calculate average for nested properties
 */
const calculateAverageNested = (results, key, isArray = false) => {
  const values = results
    .filter(r => r.metrics && r.metrics[key] !== undefined)
    .map(r => isArray && Array.isArray(r[key]) ? r[key].length : r.metrics[key])

  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

/**
 * Diagnose issues for a single result
 */
const diagnoseIssues = (result) => {
  const issues = []

  // Check if context was empty
  if (!result.context_used || result.context_used.trim().length === 0) {
    issues.push('No context retrieved - retriever may be failing')
  }

  // Check if sources are relevant
  if (result.sources && result.sources.length > 0) {
    const avgRelevance = result.sources.reduce((sum, s) => sum + (s.relevanceScore || 0), 0) / result.sources.length
    if (avgRelevance < 0.5) {
      issues.push('Low relevance scores - retrieved documents may not be relevant')
    }
  } else {
    issues.push('No sources found in collection')
  }

  // Check if generated answer is too short
  if (result.generated_answer && result.generated_answer.length < 50) {
    issues.push('Generated answer is very short - may need better prompting')
  }

  // Check if all metrics are low
  if (result.metrics) {
    const allLow = result.metrics.bleu < 0.2 &&
                   result.metrics.rouge_l_f1 < 0.2 &&
                   result.metrics.cosine_tfidf < 0.3
    if (allLow) {
      issues.push('All metrics are low - fundamental mismatch between generated and expected')
    }
  }

  // Check execution time
  if (result.execution_time_ms > 10000) {
    issues.push('Very slow execution - check API latency')
  }

  return issues
}

/**
 * Export results to JSON with analysis
 */
export const exportResults = (results, outputPath) => {
  const summary = analyzeSummary(results)
  
  const exportData = {
    metadata: {
      totalQuestions: results.length,
      timestamp: new Date().toISOString(),
      benchmarkVersion: '1.0.0'
    },
    summary: summary,
    results: results
  }

  return exportData
}
