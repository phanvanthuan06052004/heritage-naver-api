/**
 * RAG Configuration
 * Centralized configuration cho toàn bộ RAG pipeline
 */

/**
 * Question Filter Configuration
 */
export const QUESTION_FILTER_CONFIG = {
  enabled: true,
  minLength: 10,
  maxLength: 500,
  rejectIrrelevant: true, // Reject non-heritage questions
  supportedLanguages: ['vi', 'en'], // Vietnamese + English
  relevanceThreshold: 0.15 // Minimum confidence for relevance (0-1)
}

/**
 * Reranking Configuration
 */
export const RERANKING_CONFIG = {
  enabled: true,
  algorithm: 'bm25', // 'bm25', 'bm25-only', or 'fusion'
  retrievalTopK: 20, // Retrieve 20 documents initially
  finalTopN: 5,      // Return top 5 after reranking
  weights: {
    semantic: 0.50,  // Vector similarity weight
    bm25: 0.25,      // BM25 keyword weight
    keyword: 0.15,   // Jaccard overlap weight
    metadata: 0.05,  // Metadata relevance weight
    position: 0.05   // Term position weight
  },
  minSemanticScore: 0.3 // Filter out very dissimilar docs
}

/**
 * BM25 Algorithm Configuration
 */
export const BM25_CONFIG = {
  k1: 1.5, // Term frequency saturation (1.2 - 2.0)
  b: 0.75  // Length normalization (0 - 1)
}

/**
 * RAG Pipeline Configuration
 */
export const RAG_PIPELINE_CONFIG = {
  defaultTopK: 5,
  defaultCollectionName: 'heritage_documents',
  enableLogging: true,
  logLevel: 'info' // 'info', 'debug', 'error'
}

/**
 * Rate Limiting Configuration (from existing)
 */
export const RATE_LIMIT_CONFIG = {
  delayBetweenRequests: 1500, // 1.5 seconds
  maxRetries: 5,
  retryDelay: 3000,
  batchSize: 3,
  batchDelay: 5000
}

/**
 * Update any config section
 */
export const updateConfig = (section, newConfig) => {
  const configs = {
    questionFilter: QUESTION_FILTER_CONFIG,
    reranking: RERANKING_CONFIG,
    bm25: BM25_CONFIG,
    pipeline: RAG_PIPELINE_CONFIG,
    rateLimit: RATE_LIMIT_CONFIG
  }

  if (configs[section]) {
    Object.assign(configs[section], newConfig)
    console.log(`📝 ${section} config updated:`, configs[section])
    return true
  }

  return false
}

/**
 * Get all configurations
 */
export const getAllConfigs = () => {
  return {
    questionFilter: { ...QUESTION_FILTER_CONFIG },
    reranking: { ...RERANKING_CONFIG },
    bm25: { ...BM25_CONFIG },
    pipeline: { ...RAG_PIPELINE_CONFIG },
    rateLimit: { ...RATE_LIMIT_CONFIG }
  }
}
