/**
 * Text Utilities
 * Helper functions cho text processing, tokenization, normalization
 */

/**
 * Tokenize text thành words (support Vietnamese + English)
 */
export const tokenize = (text) => {
  if (!text || typeof text !== 'string') {
    return []
  }

  // Remove punctuation và split by whitespace
  const tokens = text
    .toLowerCase()
    .replace(/[^\w\sàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/gi, ' ')
    .split(/\s+/)
    .filter(token => token.length > 0)

  return tokens
}

/**
 * Calculate word frequency
 */
export const wordFrequency = (tokens) => {
  const freq = {}
  
  for (const token of tokens) {
    freq[token] = (freq[token] || 0) + 1
  }

  return freq
}

/**
 * Remove stopwords (common words that don't add meaning)
 */
export const removeStopwords = (tokens) => {
  const stopwords = new Set([
    // Vietnamese stopwords
    'và', 'của', 'có', 'là', 'được', 'cho', 'với', 'từ', 'trong', 'trên',
    'về', 'các', 'này', 'đó', 'những', 'một', 'không', 'như', 'đã', 'để',
    'khi', 'bởi', 'cũng', 'theo', 'rất', 'nhiều', 'hay', 'hoặc', 'nhưng',
    // English stopwords
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these',
    'those', 'what', 'which', 'who', 'when', 'where', 'why', 'how'
  ])

  return tokens.filter(token => !stopwords.has(token.toLowerCase()))
}

/**
 * Calculate TF (Term Frequency)
 */
export const calculateTF = (tokens) => {
  const freq = wordFrequency(tokens)
  const maxFreq = Math.max(...Object.values(freq))

  const tf = {}
  for (const [term, count] of Object.entries(freq)) {
    tf[term] = count / maxFreq // Normalized TF
  }

  return tf
}

/**
 * Calculate IDF (Inverse Document Frequency)
 */
export const calculateIDF = (documents) => {
  const N = documents.length
  const df = {} // Document frequency

  // Count document frequency for each term
  for (const doc of documents) {
    const tokens = tokenize(doc)
    const uniqueTokens = new Set(tokens)

    for (const term of uniqueTokens) {
      df[term] = (df[term] || 0) + 1
    }
  }

  // Calculate IDF
  const idf = {}
  for (const [term, count] of Object.entries(df)) {
    idf[term] = Math.log(N / count)
  }

  return idf
}

/**
 * Calculate TF-IDF vector for a document
 */
export const calculateTFIDF = (document, idf) => {
  const tokens = tokenize(document)
  const tf = calculateTF(tokens)
  const tfidf = {}

  for (const [term, tfValue] of Object.entries(tf)) {
    const idfValue = idf[term] || 0
    tfidf[term] = tfValue * idfValue
  }

  return tfidf
}

/**
 * Calculate cosine similarity between two TF-IDF vectors
 */
export const cosineSimilarity = (vec1, vec2) => {
  // Get all unique terms
  const terms = new Set([...Object.keys(vec1), ...Object.keys(vec2)])

  let dotProduct = 0
  let norm1 = 0
  let norm2 = 0

  for (const term of terms) {
    const v1 = vec1[term] || 0
    const v2 = vec2[term] || 0

    dotProduct += v1 * v2
    norm1 += v1 * v1
    norm2 += v2 * v2
  }

  if (norm1 === 0 || norm2 === 0) {
    return 0
  }

  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2))
}

/**
 * Normalize text (remove diacritics for Vietnamese - optional)
 */
export const normalizeVietnamese = (text) => {
  // This is optional - keeps diacritics by default
  // If you want to remove diacritics, implement here
  return text.toLowerCase().trim()
}

/**
 * Extract key phrases (simple n-gram extraction)
 */
export const extractKeyPhrases = (text, n = 2) => {
  const tokens = tokenize(text)
  const phrases = []

  for (let i = 0; i <= tokens.length - n; i++) {
    const phrase = tokens.slice(i, i + n).join(' ')
    phrases.push(phrase)
  }

  return phrases
}

/**
 * Calculate Jaccard similarity (for keyword overlap)
 */
export const jaccardSimilarity = (set1, set2) => {
  const s1 = new Set(set1)
  const s2 = new Set(set2)

  const intersection = new Set([...s1].filter(x => s2.has(x)))
  const union = new Set([...s1, ...s2])

  if (union.size === 0) {
    return 0
  }

  return intersection.size / union.size
}
