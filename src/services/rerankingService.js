/**
 * Reranking Service
 * Rerank retrieved documents để chọn best matches cho RAG
 */

import {
  calculateBM25,
  calculateKeywordScore,
  calculatePositionScore,
  calculateMetadataScore,
  fusionScoring,
  normalizeScores
} from '../utils/scoringUtils.js'

/**
 * Reranking Configuration
 */
const RERANKING_CONFIG = {
  enabled: true,
  retrievalTopK: 20, // Retrieve 20 documents từ Chroma
  finalTopN: 5,      // Rerank và chọn 5 best documents
  weights: {
    semantic: 0.50,   // 50% - Vector similarity từ Chroma
    bm25: 0.25,       // 25% - BM25 keyword matching
    keyword: 0.15,    // 15% - Jaccard keyword overlap
    metadata: 0.05,   // 5% - Metadata relevance
    position: 0.05    // 5% - Term position in document
  },
  minSemanticScore: 0.3 // Threshold để filter documents quá khác biệt
}

/**
 * Rerank documents với multiple scoring factors
 * 
 * @param {string} question - User query
 * @param {Array<Object>} documents - Documents từ Chroma với structure:
 *   [{ document: string, metadata: {}, distance: number }]
 * @param {Object} options - Reranking options
 * @returns {Array<Object>} Reranked documents với scores
 */
export const rerankDocuments = async (question, documents, options = {}) => {
  try {
    if (!documents || documents.length === 0) {
      return []
    }

    // Merge config with options
    const config = { ...RERANKING_CONFIG, ...options }

    console.log(`   🔄 Reranking ${documents.length} documents...`)

    // Extract document texts for corpus (needed for BM25)
    const corpus = documents.map(doc => doc.document)

    // Calculate scores for each document
    const scoredDocs = documents.map((doc, index) => {
      // 1. Semantic score (từ Chroma - convert distance to similarity)
      const semanticScore = 1 - (doc.distance || 0)

      // Skip documents with very low semantic similarity
      if (semanticScore < config.minSemanticScore) {
        return null
      }

      // 2. BM25 score (keyword-based ranking)
      const bm25Score = calculateBM25(question, doc.document, corpus)

      // 3. Keyword overlap score (Jaccard similarity)
      const keywordScore = calculateKeywordScore(question, doc.document)

      // 4. Position score (query terms at beginning of document)
      const positionScore = calculatePositionScore(question, doc.document)

      // 5. Metadata score (title, category, recency)
      const metadataScore = calculateMetadataScore(question, doc.metadata)

      // Combine scores with weighted fusion
      const allScores = {
        semantic: semanticScore,
        bm25: bm25Score,
        keyword: keywordScore,
        position: positionScore,
        metadata: metadataScore
      }

      const finalScore = fusionScoring(allScores, config.weights)

      return {
        ...doc,
        scores: {
          ...allScores,
          final: finalScore
        },
        rank: index + 1 // Original rank from Chroma
      }
    }).filter(doc => doc !== null) // Remove filtered out documents

    // Normalize BM25 scores (since they can have different scales)
    const bm25Scores = scoredDocs.map(doc => doc.scores.bm25)
    const normalizedBM25 = normalizeScores(bm25Scores)

    // Update normalized BM25 scores and recalculate final scores
    scoredDocs.forEach((doc, index) => {
      doc.scores.bm25 = normalizedBM25[index]
      doc.scores.final = fusionScoring(doc.scores, config.weights)
    })

    // Sort by final score (descending)
    scoredDocs.sort((a, b) => b.scores.final - a.scores.final)

    // Take top N documents
    const topN = scoredDocs.slice(0, config.finalTopN)

    console.log(`   ✅ Reranked: Selected top ${topN.length} from ${documents.length} documents`)
    
    // Log top 3 scores for debugging
    if (topN.length > 0) {
      console.log(`   📊 Top scores:`)
      topN.slice(0, 3).forEach((doc, idx) => {
        console.log(`      [${idx + 1}] Final: ${doc.scores.final.toFixed(3)} ` +
          `(S:${doc.scores.semantic.toFixed(2)} ` +
          `BM25:${doc.scores.bm25.toFixed(2)} ` +
          `KW:${doc.scores.keyword.toFixed(2)})`)
      })
    }

    return topN
  } catch (error) {
    console.error('Error in rerankDocuments:', error)
    // Fallback: return original documents sorted by distance
    return documents
      .sort((a, b) => (a.distance || 0) - (b.distance || 0))
      .slice(0, RERANKING_CONFIG.finalTopN)
  }
}

/**
 * Simple reranking chỉ dựa trên BM25 (faster, no multiple factors)
 */
export const rerankWithBM25Only = (question, documents) => {
  if (!documents || documents.length === 0) {
    return []
  }

  const corpus = documents.map(doc => doc.document)

  const scoredDocs = documents.map((doc, index) => {
    const bm25Score = calculateBM25(question, doc.document, corpus)
    
    return {
      ...doc,
      scores: {
        bm25: bm25Score,
        final: bm25Score
      },
      rank: index + 1
    }
  })

  scoredDocs.sort((a, b) => b.scores.final - a.scores.final)
  
  return scoredDocs.slice(0, RERANKING_CONFIG.finalTopN)
}

/**
 * Update reranking configuration
 */
export const updateRerankingConfig = (config) => {
  Object.assign(RERANKING_CONFIG, config)
  console.log('📝 Reranking config updated:', RERANKING_CONFIG)
}

/**
 * Get current reranking configuration
 */
export const getRerankingConfig = () => {
  return { ...RERANKING_CONFIG }
}

/**
 * Disable/Enable reranking
 */
export const toggleReranking = (enabled) => {
  RERANKING_CONFIG.enabled = enabled
  console.log(`🔄 Reranking ${enabled ? 'enabled' : 'disabled'}`)
}
