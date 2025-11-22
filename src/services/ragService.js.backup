/**
 * RAG (Retrieval Augmented Generation) Service
 * Xử lý logic RAG: embedding, lưu trữ vector, và query
 */

import { env } from '~/config/environment'
import { semanticChunk, semanticChunkWithMetadata } from '~/utils/chunkUtils'
import { v4 as uuidv4 } from 'uuid'
import { ChromaClient } from 'chromadb'

// Khởi tạo ChromaDB client
const chromaClient = new ChromaClient({ path: env.CHROMA_URL })

// Rate limiting configuration (can be adjusted based on your API limits)
const RATE_LIMIT_CONFIG = {
  delayBetweenRequests: 1500, // 1.5 seconds delay between requests
  maxRetries: 5, // Retry up to 5 times
  retryDelay: 3000, // 3 seconds delay before first retry
  batchSize: 3, // Process 3 chunks at a time (conservative to avoid 429)
  batchDelay: 5000 // 5 seconds delay between batches
}

/**
 * Update rate limit configuration (useful for testing or adjusting limits)
 * @param {Object} config - New configuration
 */
export const updateRateLimitConfig = (config) => {
  Object.assign(RATE_LIMIT_CONFIG, config)
  console.log('📝 Rate limit config updated:', RATE_LIMIT_CONFIG)
}

/**
 * Sleep helper function
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Gọi Naver Cloud AI API để tạo embedding cho các chunks với rate limiting
 * @param {Array<string>} chunks - Mảng các văn bản cần embedding
 * @returns {Promise<Array<Array<number>>>} Mảng các vectors
 */
export const embedChunks = async (chunks) => {
  try {
    if (!chunks || chunks.length === 0) {
      throw new Error('Chunks array is empty')
    }

    const embeddings = []
    const totalChunks = chunks.length

    console.log(`🔄 Processing ${totalChunks} chunks with rate limiting...`)

    // Process chunks in batches to avoid rate limits
    for (let i = 0; i < chunks.length; i += RATE_LIMIT_CONFIG.batchSize) {
      const batch = chunks.slice(i, i + RATE_LIMIT_CONFIG.batchSize)
      const batchNumber = Math.floor(i / RATE_LIMIT_CONFIG.batchSize) + 1
      const totalBatches = Math.ceil(totalChunks / RATE_LIMIT_CONFIG.batchSize)

      console.log(`   📦 Batch ${batchNumber}/${totalBatches} (${batch.length} chunks)`)

      // Process each chunk in the batch sequentially with delay
      for (let j = 0; j < batch.length; j++) {
        const chunkIndex = i + j + 1
        console.log(`      [${chunkIndex}/${totalChunks}] Embedding chunk...`)

        const embedding = await callNaverEmbeddingAPIWithRetry(batch[j])
        embeddings.push(embedding)

        // Add delay between requests (except for the last chunk)
        if (chunkIndex < totalChunks) {
          await sleep(RATE_LIMIT_CONFIG.delayBetweenRequests)
        }
      }

      // Add extra delay between batches
      if (i + RATE_LIMIT_CONFIG.batchSize < chunks.length) {
        console.log(`   ⏳ Waiting ${RATE_LIMIT_CONFIG.batchDelay / 1000}s before next batch...`)
        await sleep(RATE_LIMIT_CONFIG.batchDelay)
      }
    }

    console.log(`✅ All ${totalChunks} chunks embedded successfully`)
    return embeddings
  } catch (error) {
    console.error('Error in embedChunks:', error)
    throw error
  }
}

/**
 * Gọi Naver Embedding API với retry logic
 * @param {string} text - Văn bản cần embedding
 * @param {number} retryCount - Số lần đã retry
 * @returns {Promise<Array<number>>} Vector embedding
 */
const callNaverEmbeddingAPIWithRetry = async (text, retryCount = 0) => {
  try {
    const embedding = await callNaverEmbeddingAPI(text)
    return embedding
  } catch (error) {
    // Check if it's a rate limit error (429)
    if (error.message.includes('429') && retryCount < RATE_LIMIT_CONFIG.maxRetries) {
      const waitTime = RATE_LIMIT_CONFIG.retryDelay * (retryCount + 1) // Exponential backoff
      console.log(`      ⚠️  Rate limit hit, retrying in ${waitTime / 1000}s... (Attempt ${retryCount + 1}/${RATE_LIMIT_CONFIG.maxRetries})`)
      
      await sleep(waitTime)
      return callNaverEmbeddingAPIWithRetry(text, retryCount + 1)
    }
    
    // If not rate limit error or max retries reached, throw
    throw error
  }
}

/**
 * Gọi Naver Embedding API cho một văn bản
 * @param {string} text - Văn bản cần embedding
 * @returns {Promise<Array<number>>} Vector embedding
 */
const callNaverEmbeddingAPI = async (text) => {
  try {
    const response = await fetch(env.NAVER_EMBEDDING_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.NAVER_API_KEY}`,
        'X-NCP-CLOVASTUDIO-REQUEST-ID': uuidv4()
      },
      body: JSON.stringify({
        text: text
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Naver Embedding API error: ${response.status} - ${errorData}`)
    }

    const data = await response.json()
    
    // Naver API trả về embedding trong trường 'result.embedding' hoặc 'embedding'
    // Điều chỉnh theo cấu trúc response thực tế
    return data.result?.embedding || data.embedding || []
  } catch (error) {
    console.error('Error calling Naver Embedding API:', error)
    throw error
  }
}

/**
 * Lưu chunks và embeddings vào Chroma vector database
 * @param {Array<Object>} chunksWithMetadata - Mảng chunks với metadata
 * @param {Array<Array<number>>} embeddings - Mảng embeddings tương ứng
 * @param {string} collectionName - Tên collection trong Chroma
 * @returns {Promise<Object>} Kết quả lưu trữ
 */
export const saveToChroma = async (chunksWithMetadata, embeddings, collectionName = 'heritage_documents') => {
  try {
    if (!chunksWithMetadata || chunksWithMetadata.length === 0) {
      throw new Error('Chunks array is empty')
    }

    if (!embeddings || embeddings.length === 0) {
      throw new Error('Embeddings array is empty')
    }

    if (chunksWithMetadata.length !== embeddings.length) {
      throw new Error('Chunks and embeddings arrays must have the same length')
    }

    // Lấy hoặc tạo collection
    const collection = await chromaClient.getOrCreateCollection({
      name: collectionName,
      metadata: { description: 'Heritage documents for RAG system' }
    })

    // Chuẩn bị dữ liệu cho Chroma
    const ids = chunksWithMetadata.map(() => uuidv4())
    const documents = chunksWithMetadata.map(chunk => chunk.content)
    const metadatas = chunksWithMetadata.map(chunk => {
      const { content, ...metadata } = chunk
      return metadata
    })

    // Thêm documents vào collection
    await collection.add({
      ids: ids,
      embeddings: embeddings,
      documents: documents,
      metadatas: metadatas
    })

    return {
      success: true,
      collectionName: collectionName,
      documentsAdded: ids.length,
      ids: ids
    }
  } catch (error) {
    console.error('Error in saveToChroma:', error)
    throw error
  }
}

/**
 * Đảm bảo collection tồn tại trong Chroma
 * @param {string} collectionName - Tên collection
 * @returns {Promise<Object>} Collection object
 */
export const ensureCollection = async (collectionName = 'heritage_documents') => {
  try {
    // Lấy hoặc tạo collection (getOrCreateCollection tự động xử lý)
    const collection = await chromaClient.getOrCreateCollection({
      name: collectionName,
      metadata: { description: 'Heritage documents for RAG system' }
    })

    return collection
  } catch (error) {
    console.error('Error in ensureCollection:', error)
    throw error
  }
}

/**
 * Query RAG: embedding câu hỏi → tìm top-k documents → gọi Naver Chat API
 * @param {string} question - Câu hỏi của người dùng
 * @param {number} topK - Số lượng documents liên quan nhất cần lấy
 * @param {string} collectionName - Tên collection trong Chroma
 * @returns {Promise<Object>} Kết quả RAG với answer và sources
 */
export const queryRAG = async (question, topK = 5, collectionName = 'heritage_documents') => {
  try {
    // Bước 1: Tạo embedding cho câu hỏi
    const questionEmbedding = await callNaverEmbeddingAPI(question)
    // Bước 2: Tìm kiếm top-k documents trong Chroma
    const relevantDocs = await queryChroma(questionEmbedding, topK, collectionName)

    // Bước 3: Kiểm tra xem có documents liên quan không
    if (!relevantDocs || relevantDocs.length === 0) {
      // Không tìm thấy documents → trả lời general
      return await generateGeneralAnswer(question)
    }

    // Bước 4: Xây dựng context từ documents
    const context = buildContext(relevantDocs)

    // Bước 5: Gọi Naver Chat API với context và question
    const answer = await callNaverChatAPI(question, context)

    return {
      success: true,
      answer: answer,
      sources: relevantDocs.map(doc => ({
        content: doc.document,
        metadata: doc.metadata,
        score: doc.distance
      })),
      mode: 'rag' // Chế độ RAG
    }
  } catch (error) {
    console.error('Error in queryRAG:', error)
    throw error
  }
}

/**
 * Query Chroma để tìm các documents liên quan nhất
 * @param {Array<number>} embedding - Vector embedding của câu hỏi
 * @param {number} topK - Số lượng kết quả
 * @param {string} collectionName - Tên collection
 * @returns {Promise<Array<Object>>} Mảng các documents liên quan
 */
const queryChroma = async (embedding, topK, collectionName) => {
  try {
    // check collection tồn tại
    await ensureCollection(collectionName)
    // Lấy collection
    const collection = await chromaClient.getCollection({ name: collectionName })
    console.log("collection: ", collection)
    // Query collection với embedding
    const results = await collection.query({
      queryEmbeddings: [embedding],
      nResults: topK,
      include: ['documents', 'metadatas', 'distances']
    })

    // Chroma trả về dạng nested arrays
    const documents = results.documents?.[0] || []
    const metadatas = results.metadatas?.[0] || []
    const distances = results.distances?.[0] || []

    return documents.map((doc, index) => ({
      document: doc,
      metadata: metadatas[index] || {},
      distance: distances[index] || 0
    }))
  } catch (error) {
    console.error('Error querying Chroma:', error)
    // Nếu collection không tồn tại, trả về mảng rỗng
    if (error.message?.includes('not found') || error.message?.includes('does not exist')) {
      return []
    }
    throw error
  }
}

/**
 * Xây dựng context từ các documents liên quan
 * @param {Array<Object>} documents - Mảng documents
 * @returns {string} Context string
 */
const buildContext = (documents) => {
  if (!documents || documents.length === 0) {
    return ''
  }

  return documents
    .map((doc, index) => `[Document ${index + 1}]\n${doc.document}`)
    .join('\n\n')
}

/**
 * Gọi Naver Chat Completion API với context và question
 * @param {string} question - Câu hỏi
 * @param {string} context - Context từ RAG
 * @returns {Promise<string>} Câu trả lời
 */
const callNaverChatAPI = async (question, context) => {
  try {
    const systemPrompt = `Bạn là một trợ lý AI chuyên về di sản văn hóa Việt Nam. 
Hãy trả lời câu hỏi dựa trên thông tin được cung cấp trong context.
Nếu thông tin không đủ để trả lời, hãy nói rõ điều đó.
Trả lời bằng tiếng Việt một cách chính xác và dễ hiểu.`

    const userPrompt = `Context:\n${context}\n\nCâu hỏi: ${question}\n\nTrả lời:`

    const response = await fetch(env.NAVER_CHAT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.NAVER_API_KEY}`,
        'X-NCP-CLOVASTUDIO-REQUEST-ID': uuidv4()
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        topP: 0.8,
        topK: 0,
        maxTokens: 1000,
        temperature: 0.5,
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
    
    // Điều chỉnh theo cấu trúc response thực tế của Naver Chat API
    return data.result?.message?.content || data.content || 'Không thể tạo câu trả lời'
  } catch (error) {
    console.error('Error calling Naver Chat API:', error)
    throw error
  }
}

/**
 * Tạo câu trả lời general khi không tìm thấy documents liên quan
 * @param {string} question - Câu hỏi
 * @returns {Promise<Object>} Câu trả lời general
 */
const generateGeneralAnswer = async (question) => {
  try {
    const systemPrompt = `Bạn là một trợ lý AI chuyên về di sản văn hóa Việt Nam.
Trả lời câu hỏi một cách thân thiện và hữu ích.
Nếu câu hỏi không liên quan đến di sản văn hóa thì bạn hãy trả lời xin lỗi một cách lịch sự, hãy hướng dẫn người dùng về các chủ đề bạn có thể hỗ trợ.
Trả lời bằng tiếng Việt.`

    const response = await fetch(env.NAVER_CHAT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.NAVER_API_KEY}`,
        'X-NCP-CLOVASTUDIO-REQUEST-ID': uuidv4()
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: question
          }
        ],
        topP: 0.8,
        topK: 0,
        maxTokens: 500,
        temperature: 0.7,
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
    const answer = data.result?.message?.content || data.content || 'Xin lỗi, tôi không thể trả lời câu hỏi này.'

    return {
      success: true,
      answer: answer,
      sources: [],
      mode: 'general' // Chế độ general
    }
  } catch (error) {
    console.error('Error generating general answer:', error)
    throw error
  }
}

/**
 * Xử lý upload và lưu trữ tài liệu
 * @param {string} fileContent - Nội dung file
 * @param {Object} metadata - Metadata của file
 * @param {string} collectionName - Tên collection
 * @returns {Promise<Object>} Kết quả xử lý
 */
export const processDocument = async (fileContent, metadata = {}, collectionName = 'heritage_documents') => {
  try {
    // Bước 1: Đảm bảo collection tồn tại
    await ensureCollection(collectionName)

    // Bước 2: Chia văn bản thành chunks với metadata
    const chunksWithMetadata = semanticChunkWithMetadata(fileContent, metadata)

    if (chunksWithMetadata.length === 0) {
      throw new Error('No chunks generated from document')
    }

    // Bước 3: Tạo embeddings cho các chunks
    const chunks = chunksWithMetadata.map(c => c.content)
    const embeddings = await embedChunks(chunks)

    // Bước 4: Lưu vào Chroma
    const result = await saveToChroma(chunksWithMetadata, embeddings, collectionName)

    return {
      success: true,
      message: 'Document processed successfully',
      chunksCount: chunksWithMetadata.length,
      collectionName: collectionName,
      ...result
    }
  } catch (error) {
    console.error('Error in processDocument:', error)
    throw error
  }
}

/**
 * Xóa toàn bộ collection (dùng cho việc reset dữ liệu)
 * @param {string} collectionName - Tên collection cần xóa
 * @returns {Promise<boolean>} True nếu xóa thành công
 */
export const deleteCollection = async (collectionName = 'heritage_documents') => {
  try {
    await chromaClient.deleteCollection({ name: collectionName })
    return true
  } catch (error) {
    console.error('Error in deleteCollection:', error)
    // Nếu collection không tồn tại, vẫn coi như thành công
    if (error.message?.includes('not found') || error.message?.includes('does not exist')) {
      return true
    }
    throw error
  }
}

/**
 * Lấy danh sách tất cả collections
 * @returns {Promise<Array>} Danh sách collections
 */
export const listCollections = async () => {
  try {
    const collections = await chromaClient.listCollections()
    return collections
  } catch (error) {
    console.error('Error listing collections:', error)
    throw error
  }
}

/**
 * Lấy thông tin chi tiết của một collection
 * @param {string} collectionName - Tên collection
 * @returns {Promise<Object>} Thông tin collection
 */
export const getCollectionInfo = async (collectionName = 'heritage_documents') => {
  try {
    const collection = await chromaClient.getCollection({ name: collectionName })
    const count = await collection.count()
    
    return {
      name: collectionName,
      count: count,
      metadata: collection.metadata
    }
  } catch (error) {
    console.error('Error getting collection info:', error)
    throw error
  }
}
