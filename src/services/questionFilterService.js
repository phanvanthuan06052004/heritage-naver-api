/**
 * Question Filter Service
 * Validate, clean, và filter câu hỏi đầu vào của người dùng
 */

/**
 * Configuration cho question filtering
 */
const FILTER_CONFIG = {
  minLength: 10,
  maxLength: 500,
  maxRepeatedChars: 3, // Không cho phép aaaa
  maxPunctuation: 5, // Không cho phép !!!!!
  blockPatterns: [
    /https?:\/\//gi, // URLs
    /\b\d{10,}\b/g, // Phone numbers
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g // Emails
  ],
  heritageKeywords: {
    vietnamese: [
      'di sản', 'văn hóa', 'lịch sử', 'di tích', 'bảo tàng', 'đền', 'chùa', 
      'lăng', 'thành', 'hoàng', 'cung', 'điện', 'unesco', 'truyền thống',
      'nghệ thuật', 'kiến trúc', 'tượng', 'bia', 'tháp', 'đình', 'làng',
      'phố cổ', 'hội an', 'huế', 'hạ long', 'mỹ sơn', 'thăng long',
      'việt nam', 'heritage', 'cultural', 'monument', 'temple', 'citadel'
    ],
    english: [
      'heritage', 'cultural', 'history', 'monument', 'museum', 'temple',
      'pagoda', 'tomb', 'citadel', 'imperial', 'palace', 'unesco',
      'traditional', 'architecture', 'statue', 'tower', 'ancient',
      'vietnam', 'vietnamese'
    ]
  },
  irrelevantKeywords: [
    'thời tiết', 'weather', 'bóng đá', 'football', 'game', 'phim',
    'movie', 'ca nhạc', 'music', 'ăn uống', 'food', 'giá cả', 'price',
    'mua bán', 'shopping', 'chứng khoán', 'stock'
  ]
}

/**
 * Validate basic constraints (length, characters)
 */
export const validateQuestion = (question) => {
  const errors = []

  if (!question || typeof question !== 'string') {
    return { valid: false, errors: ['Question must be a string'] }
  }

  const trimmed = question.trim()

  // Check length
  if (trimmed.length < FILTER_CONFIG.minLength) {
    errors.push(`Question too short (min ${FILTER_CONFIG.minLength} characters)`)
  }

  if (trimmed.length > FILTER_CONFIG.maxLength) {
    errors.push(`Question too long (max ${FILTER_CONFIG.maxLength} characters)`)
  }

  // Check for repeated characters (aaaa)
  const repeatedCharsRegex = new RegExp(`(.)\\1{${FILTER_CONFIG.maxRepeatedChars},}`, 'gi')
  if (repeatedCharsRegex.test(trimmed)) {
    errors.push('Question contains too many repeated characters')
  }

  // Check for excessive punctuation (!!!!!)
  const punctuationRegex = /[!?.,;:]{6,}/g
  if (punctuationRegex.test(trimmed)) {
    errors.push('Question contains excessive punctuation')
  }

  // Check for blocked patterns (URL, email, phone)
  for (const pattern of FILTER_CONFIG.blockPatterns) {
    if (pattern.test(trimmed)) {
      errors.push('Question contains blocked content (URL, email, or phone number)')
      break
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors
  }
}

/**
 * Clean và normalize question
 */
export const cleanQuestion = (question) => {
  if (!question || typeof question !== 'string') {
    return ''
  }

  let cleaned = question.trim()

  // Remove extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ')

  // Remove leading/trailing punctuation (but keep question marks)
  cleaned = cleaned.replace(/^[^\w\s?]+|[^\w\s?]+$/gi, '')

  // Normalize Vietnamese characters (optional - keeps diacritics)
  // If you want to remove diacritics, add normalization here

  return cleaned
}

/**
 * Detect language (Vietnamese vs English)
 */
export const detectLanguage = (question) => {
  const vietnamesePattern = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/gi
  
  const hasVietnamese = vietnamesePattern.test(question)
  
  if (hasVietnamese) {
    return 'vi'
  }

  // Check for English patterns
  const englishPattern = /^[a-zA-Z0-9\s.,!?;:'"-]+$/
  if (englishPattern.test(question)) {
    return 'en'
  }

  return 'unknown'
}

/**
 * Classify question type
 */
export const classifyQuestionType = (question) => {
  const lowerQ = question.toLowerCase()

  // Factual questions (What, When, Where, Who)
  if (/^(what|when|where|who|which|how many|how old|gì|nào|đâu|ai|bao nhiêu|năm nào)/i.test(lowerQ)) {
    return 'factual'
  }

  // How questions (procedures, explanations)
  if (/^(how|why|làm sao|tại sao|như thế nào|vì sao)/i.test(lowerQ)) {
    return 'explanatory'
  }

  // Yes/No questions
  if (/^(is|are|do|does|did|can|could|would|will|có|có phải|được|là)/i.test(lowerQ)) {
    return 'boolean'
  }

  // Comparison questions
  if (/(compare|difference|between|khác|giống|so sánh)/i.test(lowerQ)) {
    return 'comparison'
  }

  return 'general'
}

/**
 * Check relevance to heritage topic
 */
export const checkRelevance = (question) => {
  const lowerQ = question.toLowerCase()
  const language = detectLanguage(question)

  // Check for irrelevant keywords first
  for (const keyword of FILTER_CONFIG.irrelevantKeywords) {
    if (lowerQ.includes(keyword.toLowerCase())) {
      return {
        relevant: false,
        confidence: 0.1,
        reason: `Question contains irrelevant keyword: "${keyword}"`
      }
    }
  }

  // Check for heritage-related keywords
  let relevantKeywordCount = 0
  let totalKeywords = 0

  const keywordsToCheck = language === 'vi' 
    ? [...FILTER_CONFIG.heritageKeywords.vietnamese]
    : [...FILTER_CONFIG.heritageKeywords.english, ...FILTER_CONFIG.heritageKeywords.vietnamese]

  for (const keyword of keywordsToCheck) {
    totalKeywords++
    if (lowerQ.includes(keyword.toLowerCase())) {
      relevantKeywordCount++
    }
  }

  const confidence = relevantKeywordCount > 0 
    ? Math.min(relevantKeywordCount / 3, 1.0) // Cap at 1.0, need at least 3 keywords for 100%
    : 0

  // Decision threshold
  const isRelevant = confidence >= 0.15 // At least 1 keyword match = 0.33 confidence

  return {
    relevant: isRelevant,
    confidence: confidence,
    matchedKeywords: relevantKeywordCount,
    reason: isRelevant 
      ? `Found ${relevantKeywordCount} heritage-related keywords`
      : 'No heritage-related keywords found'
  }
}

/**
 * Main filter pipeline
 */
export const filterQuestion = (question) => {
  // Step 1: Validate
  const validation = validateQuestion(question)
  if (!validation.valid) {
    return {
      passed: false,
      reason: validation.errors.join(', '),
      suggestions: ['Please provide a valid question between 10-500 characters']
    }
  }

  // Step 2: Clean
  const cleaned = cleanQuestion(question)

  // Step 3: Detect language
  const language = detectLanguage(cleaned)

  // Step 4: Classify type
  const questionType = classifyQuestionType(cleaned)

  // Step 5: Check relevance
  const relevance = checkRelevance(cleaned)

  if (!relevance.relevant) {
    return {
      passed: false,
      reason: relevance.reason,
      suggestions: [
        'This question does not appear to be about Vietnamese cultural heritage.',
        'Please ask questions about heritage sites, monuments, UNESCO sites, traditional culture, etc.',
        'Example: "What is the history of Hue Imperial Citadel?" or "When was Ha Long Bay recognized by UNESCO?"'
      ],
      metadata: {
        language,
        questionType,
        relevanceScore: relevance.confidence
      }
    }
  }

  // All checks passed
  return {
    passed: true,
    cleaned: cleaned,
    metadata: {
      language,
      questionType,
      relevanceScore: relevance.confidence,
      matchedKeywords: relevance.matchedKeywords
    }
  }
}

/**
 * Update filter configuration (for testing or customization)
 */
export const updateFilterConfig = (newConfig) => {
  Object.assign(FILTER_CONFIG, newConfig)
  console.log('📝 Filter config updated:', FILTER_CONFIG)
}

/**
 * Get current filter configuration
 */
export const getFilterConfig = () => {
  return { ...FILTER_CONFIG }
}
