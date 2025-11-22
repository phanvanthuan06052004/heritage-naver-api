/**
 * RAG Benchmark Service
 * Xử lý benchmark pipeline: retrieve → generate → evaluate
 */

import { ChromaClient } from 'chromadb'
import { env } from '../config/environment.js'
import { v4 as uuidv4 } from 'uuid'
import { evaluateAnswer } from './metrics.js'

// Khởi tạo ChromaDB client
const chromaClient = new ChromaClient({ path: env.CHROMA_URL })

/**
 * Retrieve context từ Chroma vector database
 * 
 * @param {string} question - Câu hỏi
 * @param {string} collectionName - Tên collection
 * @param {number} topK - Số lượng documents cần lấy
 * @returns {Promise<Object>} { context, sources, embeddings }
 */
export const retrieveContext = async (question, collectionName = 'heritage_documents', topK = 5) => {
  try {
    console.log(`   🔍 Retrieving context for: "${question.substring(0, 50)}..."`)

    // 1. Tạo embedding cho câu hỏi
    const questionEmbedding = await generateEmbedding(question)

    if (!questionEmbedding || questionEmbedding.length === 0) {
      console.log('   ⚠️  No embedding generated, using empty context')
      return {
        context: '',
        sources: [],
        questionEmbedding: null
      }
    }

    // 2. Query Chroma để lấy documents liên quan
    try {
      const collection = await chromaClient.getCollection({ name: collectionName })
      
      const results = await collection.query({
        queryEmbeddings: [questionEmbedding],
        nResults: topK,
        include: ['documents', 'metadatas', 'distances']
      })

      const documents = results.documents?.[0] || []
      const metadatas = results.metadatas?.[0] || []
      const distances = results.distances?.[0] || []

      if (documents.length === 0) {
        console.log('   ⚠️  No documents found in collection')
        return {
          context: '',
          sources: [],
          questionEmbedding
        }
      }

      // 3. Build context từ documents
      const context = documents
        .map((doc, index) => `[Document ${index + 1}] ${doc}`)
        .join('\n\n')

      const sources = documents.map((doc, index) => ({
        content: doc,
        metadata: metadatas[index] || {},
        distance: distances[index] || 0,
        relevanceScore: 1 - (distances[index] || 0) // Convert distance to similarity
      }))

      console.log(`   ✅ Retrieved ${documents.length} documents`)

      return {
        context,
        sources,
        questionEmbedding
      }
    } catch (collectionError) {
      // Collection không tồn tại hoặc lỗi khác
      if (collectionError.message?.includes('not found') || collectionError.message?.includes('does not exist')) {
        console.log(`   ⚠️  Collection "${collectionName}" not found`)
      } else {
        console.error('   ❌ Error querying collection:', collectionError.message)
      }
      
      return {
        context: '',
        sources: [],
        questionEmbedding
      }
    }
  } catch (error) {
    console.error('   ❌ Error in retrieveContext:', error)
    return {
      context: '',
      sources: [],
      questionEmbedding: null
    }
  }
}

/**
 * Generate answer sử dụng Naver Chat API
 * 
 * @param {string} question - Câu hỏi
 * @param {string} context - Context từ retrieved documents
 * @param {boolean} useMock - Sử dụng mock answer (khi chưa có API key)
 * @returns {Promise<Object>} { answer, embedding }
 */
export const generateAnswer = async (question, context, useMock = false) => {
  try {
    console.log('   🤖 Generating answer...')

    // Mock mode - để test khi chưa có Naver API key
    if (useMock || !env.NAVER_API_KEY || env.NAVER_API_KEY.includes('your_')) {
      console.log('   ⚠️  Using mock mode (no API key)')
      return await generateMockAnswer(question, context)
    }

    // Gọi Naver Chat API
    const systemPrompt = `You are an AI assistant specializing in Vietnamese cultural heritage.
Please answer the question based on the information provided in the context.
If the information is not sufficient to answer, state that clearly.
Provide accurate, concise, and easy-to-understand answers in English.`

    const userPrompt = context
      ? `Context:\n${context}\n\nQuestion: ${question}\n\nAnswer:`
      : `Question: ${question}\n\nAnswer:`

    const response = await fetch(env.NAVER_CHAT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.NAVER_API_KEY}`,
        'X-NCP-CLOVASTUDIO-REQUEST-ID': uuidv4()
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        topP: 0.8,
        topK: 0,
        maxTokens: 500,
        temperature: 0.3, // Lower temperature cho câu trả lời chính xác hơn
        repeatPenalty: 5.0,
        stopBefore: [],
        includeAiFilters: true
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Naver Chat API error: ${response.status} - ${errorData}`)
    }

    const data = await response.json()
    const answer = data.result?.message?.content || data.content || 'Không thể tạo câu trả lời'

    console.log('   ✅ Answer generated')

    // Tạo embedding cho answer
    const answerEmbedding = await generateEmbedding(answer)

    return {
      answer,
      embedding: answerEmbedding
    }
  } catch (error) {
    console.error('   ❌ Error generating answer:', error.message)
    
    // Fallback to mock nếu API call failed
    return await generateMockAnswer(question, context)
  }
}

/**
 * Generate mock answer (dùng khi test mà chưa có API key)
 */
const generateMockAnswer = async (question, context) => {
  // Extract key information từ context để tạo mock answer
  if (context && context.length > 0) {
    // Lấy câu đầu tiên từ context
    const firstSentence = context.split(/[.!?]/)[0] + '.'
    return {
      answer: `Based on the available information: ${firstSentence}`,
      embedding: null
    }
  }

  return {
    answer: `Sorry, I don't have enough information to answer the question "${question}".`,
    embedding: null
  }
}

/**
 * Generate embedding cho text
 */
const generateEmbedding = async (text) => {
  try {
    // Kiểm tra API key
    if (!env.NAVER_API_KEY || env.NAVER_API_KEY.includes('your_')) {
      return null // Mock mode
    }

    const response = await fetch(env.NAVER_EMBEDDING_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.NAVER_API_KEY}`,
        'X-NCP-CLOVASTUDIO-REQUEST-ID': uuidv4()
      },
      body: JSON.stringify({ text })
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return data.result?.embedding || data.embedding || null
  } catch (error) {
    return null
  }
}

/**
 * Benchmark một câu hỏi đơn lẻ
 * 
 * @param {Object} testCase - { question, ground_truth, related_docs }
 * @param {Object} options - { collectionName, topK, useMock }
 * @returns {Promise<Object>} Kết quả benchmark
 */
export const benchmarkSingleQuestion = async (testCase, options = {}) => {
  const {
    collectionName = 'heritage_documents',
    topK = 5,
    useMock = false
  } = options

  const startTime = Date.now()

  try {
    console.log(`\n📝 Question ${testCase.id}: ${testCase.question}`)

    // 1. Retrieve context
    const retrievalResult = await retrieveContext(testCase.question, collectionName, topK)

    // 2. Generate answer
    const generationResult = await generateAnswer(testCase.question, retrievalResult.context, useMock)

    // 3. Generate embedding cho ground truth (nếu có API)
    let groundTruthEmbedding = null
    if (!useMock && retrievalResult.questionEmbedding) {
      groundTruthEmbedding = await generateEmbedding(testCase.ground_truth)
    }

    // 4. Evaluate metrics
    console.log('   📊 Evaluating metrics...')
    const metrics = evaluateAnswer(
      generationResult.answer,
      testCase.ground_truth,
      generationResult.embedding,
      groundTruthEmbedding
    )

    const executionTime = Date.now() - startTime

    console.log(`   ⏱️  Execution time: ${executionTime}ms`)
    console.log(`   📈 BLEU: ${metrics.bleu}, ROUGE-L F1: ${metrics.rouge_l_f1}, Cosine: ${metrics.cosine_tfidf}`)

    return {
      id: testCase.id,
      question: testCase.question,
      ground_truth: testCase.ground_truth,
      generated_answer: generationResult.answer,
      context_used: retrievalResult.context,
      sources: retrievalResult.sources,
      metrics: metrics,
      execution_time_ms: executionTime,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error(`   ❌ Error benchmarking question ${testCase.id}:`, error.message)
    
    return {
      id: testCase.id,
      question: testCase.question,
      ground_truth: testCase.ground_truth,
      generated_answer: 'ERROR',
      error: error.message,
      metrics: {
        bleu: 0,
        rouge_l_f1: 0,
        cosine_tfidf: 0
      },
      execution_time_ms: Date.now() - startTime,
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * Benchmark toàn bộ dataset
 * 
 * @param {Array<Object>} testCases - Mảng các test cases
 * @param {Object} options - Options
 * @returns {Promise<Array<Object>>} Mảng kết quả
 */
export const benchmarkDataset = async (testCases, options = {}) => {
  console.log(`\n🚀 Starting benchmark for ${testCases.length} questions...\n`)
  console.log('='.repeat(70))

  const results = []

  for (const testCase of testCases) {
    const result = await benchmarkSingleQuestion(testCase, options)
    results.push(result)

    // Delay nhỏ giữa các requests để tránh rate limit
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  console.log('\n' + '='.repeat(70))
  console.log('✅ Benchmark completed!\n')

  return results
}

/**
 * Kiểm tra xem collection có tồn tại và có data không
 */
export const checkCollectionStatus = async (collectionName = 'heritage_documents') => {
  try {
    const collection = await chromaClient.getCollection({ name: collectionName })
    const count = await collection.count()

    return {
      exists: true,
      count: count,
      name: collectionName
    }
  } catch (error) {
    return {
      exists: false,
      count: 0,
      name: collectionName,
      error: error.message
    }
  }
}
