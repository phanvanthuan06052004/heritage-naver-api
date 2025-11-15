/**
 * Scoring Utilities
 * Các thuật toán scoring cho reranking: BM25, TF-IDF, etc.
 */

import { tokenize, removeStopwords, wordFrequency } from './textUtils.js'

/**
 * BM25 Configuration
 */
const BM25_CONFIG = {
  k1: 1.5, // Term frequency saturation parameter (1.2 - 2.0)
  b: 0.75  // Length normalization parameter (0 - 1)
}

/**
 * Calculate BM25 score for a document given a query
 * BM25 is a ranking function used by search engines
 * 
 * @param {string} query - User query
 * @param {string} document - Document to score
 * @param {Array<string>} corpus - All documents (for IDF calculation)
 * @returns {number} BM25 score
 */
export const calculateBM25 = (query, document, corpus) => {
  const queryTokens = removeStopwords(tokenize(query))
  const docTokens = removeStopwords(tokenize(document))
  const docLength = docTokens.length

  // Calculate average document length
  const avgDocLength = corpus.reduce((sum, doc) => {
    return sum + removeStopwords(tokenize(doc)).length
  }, 0) / corpus.length

  // Calculate IDF for query terms
  const N = corpus.length
  const idf = {}

  for (const term of queryTokens) {
    let docFreq = 0
    for (const doc of corpus) {
      if (tokenize(doc).includes(term)) {
        docFreq++
      }
    }
    // IDF formula: log((N - df + 0.5) / (df + 0.5) + 1)
    idf[term] = Math.log((N - docFreq + 0.5) / (docFreq + 0.5) + 1)
  }

  // Calculate term frequency in document
  const termFreq = wordFrequency(docTokens)

  // Calculate BM25 score
  let score = 0
  for (const term of queryTokens) {
    const tf = termFreq[term] || 0
    const termIDF = idf[term] || 0

    // BM25 formula
    const numerator = tf * (BM25_CONFIG.k1 + 1)
    const denominator = tf + BM25_CONFIG.k1 * (1 - BM25_CONFIG.b + BM25_CONFIG.b * (docLength / avgDocLength))

    score += termIDF * (numerator / denominator)
  }

  return score
}

/**
 * Calculate keyword overlap score (Jaccard similarity)
 */
export const calculateKeywordScore = (query, document) => {
  const queryTokens = new Set(removeStopwords(tokenize(query)))
  const docTokens = new Set(removeStopwords(tokenize(document)))

  const intersection = new Set([...queryTokens].filter(x => docTokens.has(x)))
  const union = new Set([...queryTokens, ...docTokens])

  if (union.size === 0) {
    return 0
  }

  return intersection.size / union.size
}

/**
 * Calculate position-based score (prefer documents with query terms at the beginning)
 */
export const calculatePositionScore = (query, document) => {
  const queryTokens = removeStopwords(tokenize(query))
  const docTokens = removeStopwords(tokenize(document))

  if (docTokens.length === 0) {
    return 0
  }

  let positionScore = 0
  for (const term of queryTokens) {
    const position = docTokens.indexOf(term)
    if (position !== -1) {
      // Earlier positions get higher scores
      positionScore += 1 / (position + 1)
    }
  }

  // Normalize by query length
  return positionScore / queryTokens.length
}

/**
 * Calculate metadata relevance score
 */
export const calculateMetadataScore = (query, metadata) => {
  if (!metadata) {
    return 0
  }

  let score = 0
  const queryLower = query.toLowerCase()

  // Check title/filename match
  if (metadata.title && metadata.title.toLowerCase().includes(queryLower)) {
    score += 0.5
  }

  if (metadata.filename && metadata.filename.toLowerCase().includes(queryLower)) {
    score += 0.3
  }

  // Check category match
  if (metadata.category) {
    const categories = ['heritage', 'unesco', 'monument', 'cultural']
    if (categories.some(cat => metadata.category.toLowerCase().includes(cat))) {
      score += 0.2
    }
  }

  // Boost recent documents (recency)
  if (metadata.uploadedAt) {
    const uploadDate = new Date(metadata.uploadedAt)
    const now = new Date()
    const daysDiff = (now - uploadDate) / (1000 * 60 * 60 * 24)

    // Decay function: newer documents get higher score
    if (daysDiff < 30) {
      score += 0.3
    } else if (daysDiff < 90) {
      score += 0.2
    } else if (daysDiff < 365) {
      score += 0.1
    }
  }

  return Math.min(score, 1.0) // Cap at 1.0
}

/**
 * Combine multiple scores with weights
 */
export const fusionScoring = (scores, weights) => {
  const defaultWeights = {
    semantic: 0.5,
    keyword: 0.3,
    metadata: 0.1,
    position: 0.1
  }

  const finalWeights = { ...defaultWeights, ...weights }

  let totalScore = 0
  let totalWeight = 0

  for (const [scoreType, score] of Object.entries(scores)) {
    const weight = finalWeights[scoreType] || 0
    totalScore += score * weight
    totalWeight += weight
  }

  // Normalize if weights don't sum to 1
  if (totalWeight > 0 && totalWeight !== 1) {
    totalScore = totalScore / totalWeight
  }

  return totalScore
}

/**
 * Normalize scores to 0-1 range
 */
export const normalizeScores = (scores) => {
  if (scores.length === 0) {
    return []
  }

  const min = Math.min(...scores)
  const max = Math.max(...scores)

  if (max === min) {
    return scores.map(() => 1.0)
  }

  return scores.map(score => (score - min) / (max - min))
}

/**
 * Update BM25 configuration
 */
export const updateBM25Config = (config) => {
  Object.assign(BM25_CONFIG, config)
  console.log('📝 BM25 config updated:', BM25_CONFIG)
}

/**
 * Get current BM25 configuration
 */
export const getBM25Config = () => {
  return { ...BM25_CONFIG }
}
