/**
 * RAG Benchmark Metrics
 * Các chỉ số đánh giá chất lượng câu trả lời RAG
 */

/**
 * Tính BLEU Score (Bilingual Evaluation Understudy)
 * Đo lường độ chính xác của n-grams giữa generated và reference text
 * 
 * @param {string} generated - Câu trả lời sinh ra
 * @param {string} reference - Câu trả lời chuẩn (ground truth)
 * @param {number} n - N-gram size (mặc định 4)
 * @returns {number} BLEU score (0-1)
 */
export const calculateBLEU = (generated, reference, n = 4) => {
  try {
    // Tokenize (tách từ)
    const generatedTokens = tokenize(generated)
    const referenceTokens = tokenize(reference)

    if (generatedTokens.length === 0 || referenceTokens.length === 0) {
      return 0
    }

    // Tính precision cho từng n-gram
    const precisions = []
    for (let i = 1; i <= n; i++) {
      const generatedNgrams = getNgrams(generatedTokens, i)
      const referenceNgrams = getNgrams(referenceTokens, i)

      if (generatedNgrams.length === 0) {
        precisions.push(0)
        continue
      }

      // Đếm số n-grams khớp
      let matches = 0
      const refCounts = countNgrams(referenceNgrams)

      for (const ngram of generatedNgrams) {
        const key = ngram.join(' ')
        if (refCounts[key] && refCounts[key] > 0) {
          matches++
          refCounts[key]--
        }
      }

      const precision = matches / generatedNgrams.length
      precisions.push(precision)
    }

    // Tính brevity penalty
    const brevityPenalty = Math.min(1, Math.exp(1 - referenceTokens.length / generatedTokens.length))

    // Geometric mean của precisions
    const geometricMean = Math.exp(
      precisions.reduce((sum, p) => sum + Math.log(p + 1e-10), 0) / n
    )

    return brevityPenalty * geometricMean
  } catch (error) {
    console.error('Error calculating BLEU:', error)
    return 0
  }
}

/**
 * Tính ROUGE-L Score (Longest Common Subsequence)
 * Đo lường độ dài chuỗi con chung dài nhất
 * 
 * @param {string} generated - Câu trả lời sinh ra
 * @param {string} reference - Câu trả lời chuẩn
 * @returns {Object} { precision, recall, f1 }
 */
export const calculateROUGEL = (generated, reference) => {
  try {
    const generatedTokens = tokenize(generated)
    const referenceTokens = tokenize(reference)

    if (generatedTokens.length === 0 || referenceTokens.length === 0) {
      return { precision: 0, recall: 0, f1: 0 }
    }

    // Tính LCS (Longest Common Subsequence)
    const lcsLength = longestCommonSubsequence(generatedTokens, referenceTokens)

    // ROUGE-L Precision = LCS / length of generated
    const precision = lcsLength / generatedTokens.length

    // ROUGE-L Recall = LCS / length of reference
    const recall = lcsLength / referenceTokens.length

    // F1 Score
    const f1 = precision + recall > 0
      ? (2 * precision * recall) / (precision + recall)
      : 0

    return { precision, recall, f1 }
  } catch (error) {
    console.error('Error calculating ROUGE-L:', error)
    return { precision: 0, recall: 0, f1: 0 }
  }
}

/**
 * Tính Cosine Similarity giữa hai câu
 * Sử dụng TF-IDF vectors để so sánh
 * 
 * @param {string} text1 - Câu thứ nhất
 * @param {string} text2 - Câu thứ hai
 * @returns {number} Cosine similarity (0-1)
 */
export const calculateCosineSimilarity = (text1, text2) => {
  try {
    const tokens1 = tokenize(text1)
    const tokens2 = tokenize(text2)

    if (tokens1.length === 0 || tokens2.length === 0) {
      return 0
    }

    // Tạo TF-IDF vectors
    const vector1 = createTFIDFVector(tokens1, tokens2)
    const vector2 = createTFIDFVector(tokens2, tokens1)

    // Tính cosine similarity
    const dotProduct = vector1.reduce((sum, val, idx) => sum + val * vector2[idx], 0)
    const magnitude1 = Math.sqrt(vector1.reduce((sum, val) => sum + val * val, 0))
    const magnitude2 = Math.sqrt(vector2.reduce((sum, val) => sum + val * val, 0))

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0
    }

    return dotProduct / (magnitude1 * magnitude2)
  } catch (error) {
    console.error('Error calculating Cosine Similarity:', error)
    return 0
  }
}

/**
 * Tính Semantic Similarity sử dụng embeddings
 * (Nếu có Naver Embedding API)
 * 
 * @param {Array<number>} embedding1 - Vector embedding câu 1
 * @param {Array<number>} embedding2 - Vector embedding câu 2
 * @returns {number} Cosine similarity (0-1)
 */
export const calculateSemanticSimilarity = (embedding1, embedding2) => {
  try {
    if (!embedding1 || !embedding2 || embedding1.length !== embedding2.length) {
      return 0
    }

    const dotProduct = embedding1.reduce((sum, val, idx) => sum + val * embedding2[idx], 0)
    const magnitude1 = Math.sqrt(embedding1.reduce((sum, val) => sum + val * val, 0))
    const magnitude2 = Math.sqrt(embedding2.reduce((sum, val) => sum + val * val, 0))

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0
    }

    return dotProduct / (magnitude1 * magnitude2)
  } catch (error) {
    console.error('Error calculating Semantic Similarity:', error)
    return 0
  }
}

/**
 * Đánh giá toàn diện một câu trả lời
 * 
 * @param {string} generated - Câu trả lời sinh ra
 * @param {string} groundTruth - Câu trả lời chuẩn
 * @param {Array<number>} generatedEmbedding - Embedding của generated (optional)
 * @param {Array<number>} groundTruthEmbedding - Embedding của ground truth (optional)
 * @returns {Object} Tất cả các metrics
 */
export const evaluateAnswer = (generated, groundTruth, generatedEmbedding = null, groundTruthEmbedding = null) => {
  const bleu = calculateBLEU(generated, groundTruth)
  const rougeL = calculateROUGEL(generated, groundTruth)
  const cosineTFIDF = calculateCosineSimilarity(generated, groundTruth)

  const result = {
    bleu: Number(bleu.toFixed(4)),
    rouge_l_precision: Number(rougeL.precision.toFixed(4)),
    rouge_l_recall: Number(rougeL.recall.toFixed(4)),
    rouge_l_f1: Number(rougeL.f1.toFixed(4)),
    cosine_tfidf: Number(cosineTFIDF.toFixed(4))
  }

  // Nếu có embeddings, tính semantic similarity
  if (generatedEmbedding && groundTruthEmbedding) {
    const semanticSim = calculateSemanticSimilarity(generatedEmbedding, groundTruthEmbedding)
    result.cosine_semantic = Number(semanticSim.toFixed(4))
  }

  return result
}

// ============ HELPER FUNCTIONS ============

/**
 * Tokenize text thành mảng các từ
 * Hỗ trợ tiếng Việt và tiếng Anh
 */
const tokenize = (text) => {
  if (!text || typeof text !== 'string') return []

  return text
    .toLowerCase()
    .replace(/[^\w\sàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/gi, ' ')
    .split(/\s+/)
    .filter(token => token.length > 0)
}

/**
 * Tạo n-grams từ mảng tokens
 */
const getNgrams = (tokens, n) => {
  const ngrams = []
  for (let i = 0; i <= tokens.length - n; i++) {
    ngrams.push(tokens.slice(i, i + n))
  }
  return ngrams
}

/**
 * Đếm số lần xuất hiện của mỗi n-gram
 */
const countNgrams = (ngrams) => {
  const counts = {}
  for (const ngram of ngrams) {
    const key = ngram.join(' ')
    counts[key] = (counts[key] || 0) + 1
  }
  return counts
}

/**
 * Tính độ dài Longest Common Subsequence
 */
const longestCommonSubsequence = (tokens1, tokens2) => {
  const m = tokens1.length
  const n = tokens2.length
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (tokens1[i - 1] === tokens2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  return dp[m][n]
}

/**
 * Tạo TF-IDF vector cho một tập tokens
 */
const createTFIDFVector = (tokens, otherTokens) => {
  const allTokens = [...new Set([...tokens, ...otherTokens])]
  const vector = []

  for (const token of allTokens) {
    // Term Frequency
    const tf = tokens.filter(t => t === token).length / tokens.length

    // Inverse Document Frequency (simplified - chỉ có 2 documents)
    const df = (tokens.includes(token) ? 1 : 0) + (otherTokens.includes(token) ? 1 : 0)
    const idf = Math.log(2 / (df + 1))

    vector.push(tf * idf)
  }

  return vector
}

/**
 * Tính trung bình của một metric trên toàn bộ kết quả
 */
export const calculateAverage = (results, metricName) => {
  if (!results || results.length === 0) return 0

  const sum = results.reduce((acc, result) => {
    return acc + (result[metricName] || 0)
  }, 0)

  return sum / results.length
}

/**
 * Tìm các kết quả có điểm thấp nhất
 */
export const findLowestScores = (results, metricName, count = 3) => {
  if (!results || results.length === 0) return []

  return results
    .map((result, index) => ({ ...result, originalIndex: index }))
    .sort((a, b) => (a[metricName] || 0) - (b[metricName] || 0))
    .slice(0, count)
}

/**
 * Phân loại chất lượng câu trả lời
 */
export const classifyQuality = (metrics) => {
  const avgScore = (
    metrics.bleu +
    metrics.rouge_l_f1 +
    metrics.cosine_tfidf +
    (metrics.cosine_semantic || metrics.cosine_tfidf)
  ) / 4

  if (avgScore >= 0.8) return 'Excellent'
  if (avgScore >= 0.6) return 'Good'
  if (avgScore >= 0.4) return 'Fair'
  if (avgScore >= 0.2) return 'Poor'
  return 'Very Poor'
}
