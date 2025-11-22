/**
 * RAG (Retrieval Augmented Generation) Service
 * Xử lý logic RAG: embedding, lưu trữ vector, và query
 */

import { env } from "~/config/environment";
import { semanticChunkWithMetadata } from "~/utils/chunkUtils";
import { v4 as uuidv4 } from "uuid";
import { QdrantClient } from "@qdrant/js-client-rest";

// Khởi tạo Qdrant client
const qdrantClient = new QdrantClient({
  url: env.QDRANT_URL,
  apiKey: env.QDRANT_API_KEY,
});

// Rate limiting configuration (can be adjusted based on your API limits)
const RATE_LIMIT_CONFIG = {
  delayBetweenRequests: 1500, // 1.5 seconds delay between requests
  maxRetries: 5, // Retry up to 5 times
  retryDelay: 3000, // 3 seconds delay before first retry
  batchSize: 3, // Process 3 chunks at a time (conservative to avoid 429)
  batchDelay: 5000, // 5 seconds delay between batches
};

/**
 * Update rate limit configuration (useful for testing or adjusting limits)
 * @param {Object} config - New configuration
 */
export const updateRateLimitConfig = (config) => {
  Object.assign(RATE_LIMIT_CONFIG, config);
  console.log("📝 Rate limit config updated:", RATE_LIMIT_CONFIG);
};

/**
 * Sleep helper function
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Gọi Naver Cloud AI API để tạo embedding cho các chunks với rate limiting
 * @param {Array<string>} chunks - Mảng các văn bản cần embedding
 * @returns {Promise<Array<Array<number>>>} Mảng các vectors
 */
export const embedChunks = async (chunks) => {
  try {
    if (!chunks || chunks.length === 0) {
      throw new Error("Chunks array is empty");
    }

    const embeddings = [];
    const totalChunks = chunks.length;

    console.log(`🔄 Processing ${totalChunks} chunks with rate limiting...`);

    // Process chunks in batches to avoid rate limits
    for (let i = 0; i < chunks.length; i += RATE_LIMIT_CONFIG.batchSize) {
      const batch = chunks.slice(i, i + RATE_LIMIT_CONFIG.batchSize);
      const batchNumber = Math.floor(i / RATE_LIMIT_CONFIG.batchSize) + 1;
      const totalBatches = Math.ceil(totalChunks / RATE_LIMIT_CONFIG.batchSize);

      console.log(
        `   📦 Batch ${batchNumber}/${totalBatches} (${batch.length} chunks)`
      );

      // Process each chunk in the batch sequentially with delay
      for (let j = 0; j < batch.length; j++) {
        const chunkIndex = i + j + 1;
        console.log(`      [${chunkIndex}/${totalChunks}] Embedding chunk...`);

        const embedding = await callNaverEmbeddingAPIWithRetry(batch[j]);
        embeddings.push(embedding);

        // Add delay between requests (except for the last chunk)
        if (chunkIndex < totalChunks) {
          await sleep(RATE_LIMIT_CONFIG.delayBetweenRequests);
        }
      }

      // Add extra delay between batches
      if (i + RATE_LIMIT_CONFIG.batchSize < chunks.length) {
        console.log(
          `   ⏳ Waiting ${
            RATE_LIMIT_CONFIG.batchDelay / 1000
          }s before next batch...`
        );
        await sleep(RATE_LIMIT_CONFIG.batchDelay);
      }
    }

    console.log(`✅ All ${totalChunks} chunks embedded successfully`);
    return embeddings;
  } catch (error) {
    console.error("Error in embedChunks:", error);
    throw error;
  }
};

/**
 * Gọi Naver Embedding API với retry logic
 * @param {string} text - Văn bản cần embedding
 * @param {number} retryCount - Số lần đã retry
 * @returns {Promise<Array<number>>} Vector embedding
 */
const callNaverEmbeddingAPIWithRetry = async (text, retryCount = 0) => {
  try {
    const embedding = await callNaverEmbeddingAPI(text);
    return embedding;
  } catch (error) {
    // Check if it's a rate limit error (429)
    if (
      error.message.includes("429") &&
      retryCount < RATE_LIMIT_CONFIG.maxRetries
    ) {
      const waitTime = RATE_LIMIT_CONFIG.retryDelay * (retryCount + 1); // Exponential backoff
      console.log(
        `      ⚠️  Rate limit hit, retrying in ${
          waitTime / 1000
        }s... (Attempt ${retryCount + 1}/${RATE_LIMIT_CONFIG.maxRetries})`
      );

      await sleep(waitTime);
      return callNaverEmbeddingAPIWithRetry(text, retryCount + 1);
    }

    // If not rate limit error or max retries reached, throw
    throw error;
  }
};

/**
 * Gọi Naver Embedding API cho một văn bản
 * @param {string} text - Văn bản cần embedding
 * @returns {Promise<Array<number>>} Vector embedding
 */
const callNaverEmbeddingAPI = async (text) => {
  try {
    const response = await fetch(env.NAVER_EMBEDDING_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.NAVER_API_KEY}`,
        "X-NCP-CLOVASTUDIO-REQUEST-ID": uuidv4(),
      },
      body: JSON.stringify({
        text: text,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(
        `Naver Embedding API error: ${response.status} - ${errorData}`
      );
    }

    const data = await response.json();
    // console.log("✅ Embedding API response received", data);

    // Naver API trả về embedding trong trường 'result.embedding'
    return data.result?.embedding || [];
  } catch (error) {
    console.error("Error calling Naver Embedding API:", error);
    throw error;
  }
};

/**
 * Lưu chunks và embeddings vào Qdrant vector database
 * @param {Array<Object>} chunksWithMetadata - Mảng chunks với metadata
 * @param {Array<Array<number>>} embeddings - Mảng embeddings tương ứng
 * @param {string} collectionName - Tên collection trong Qdrant
 * @returns {Promise<Object>} Kết quả lưu trữ
 */
export const saveToQdrant = async (
  chunksWithMetadata,
  embeddings,
  collectionName = "heritage_documents"
) => {
  try {
    if (!chunksWithMetadata || chunksWithMetadata.length === 0) {
      throw new Error("Chunks array is empty");
    }

    if (!embeddings || embeddings.length === 0) {
      throw new Error("Embeddings array is empty");
    }

    if (chunksWithMetadata.length !== embeddings.length) {
      throw new Error("Chunks and embeddings arrays must have the same length");
    }

    // Đảm bảo collection tồn tại
    await ensureCollection(collectionName, embeddings[0].length);

    // Chuẩn bị points cho Qdrant
    const points = chunksWithMetadata.map((chunk, index) => {
      const { content, ...metadata } = chunk;
      return {
        id: uuidv4(),
        vector: embeddings[index],
        payload: {
          content: content,
          ...metadata,
        },
      };
    });

    // Upsert points vào collection (batch upload)
    const batchSize = 100; // Qdrant recommend batch size
    for (let i = 0; i < points.length; i += batchSize) {
      const batch = points.slice(i, i + batchSize);
      await qdrantClient.upsert(collectionName, {
        wait: true,
        points: batch,
      });
      console.log(
        `📤 Uploaded batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
          points.length / batchSize
        )}`
      );
    }

    return {
      success: true,
      collectionName: collectionName,
      documentsAdded: points.length,
      ids: points.map((p) => p.id),
    };
  } catch (error) {
    console.error("Error in saveToQdrant:", error);
    throw error;
  }
};

/**
 * Đảm bảo collection tồn tại trong Qdrant
 * @param {string} collectionName - Tên collection
 * @param {number} vectorSize - Kích thước vector (mặc định 1024 cho Naver CLIR Embedding)
 * @returns {Promise<boolean>} True nếu collection đã tồn tại hoặc được tạo mới
 */
export const ensureCollection = async (
  collectionName = "heritage_documents",
  vectorSize = 1024
) => {
  try {
    // Kiểm tra collection có tồn tại không
    const collections = await qdrantClient.getCollections();
    const exists = collections.collections.some(
      (col) => col.name === collectionName
    );

    if (exists) {
      console.log(`✅ Collection "${collectionName}" already exists`);
      return true;
    }

    // Tạo collection mới với cấu hình tối ưu
    await qdrantClient.createCollection(collectionName, {
      vectors: {
        size: vectorSize,
        distance: "Cosine", // Cosine similarity cho text embeddings
      },
      optimizers_config: {
        default_segment_number: 2,
      },
      replication_factor: 2,
    });

    console.log(`✅ Collection "${collectionName}" created successfully`);

    // Tạo payload index cho heritageId để filter nhanh
    try {
      await qdrantClient.createPayloadIndex(collectionName, {
        field_name: "heritageId",
        field_schema: "keyword",
      });
      console.log(`✅ Created index for "heritageId" field`);
    } catch (indexError) {
      console.warn(
        `⚠️  Could not create index for heritageId:`,
        indexError.message
      );
    }

    return true;
  } catch (error) {
    console.error("Error in ensureCollection:", error);
    throw error;
  }
};

/**
 * Classify câu hỏi sử dụng Hugging Face Zero-Shot Classification
 * Model: facebook/bart-large-mnli (tốt hơn mDeBERTa cho tiếng Anh)
 * @param {string} question - Câu hỏi của người dùng
 * @returns {Promise<Object>} { isRelevant: boolean, confidence: number, reason: string }
 */
const classifyQuestionIntent = async (question) => {
  try {
    // Hugging Face Inference API endpoint
    // Try BART model - better for zero-shot classification
    const HF_API_URL = "http://localhost:3000/classify";

    const response = await fetch(HF_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: question,
      }),
    });

    if (!response.ok) {
      // const errorText = await response.text();
      // console.warn(
      //   `⚠️ Hugging Face classification failed: ${response.status} - ${errorText}`
      // );
      // Fallback to keyword-based classification
      return fallbackKeywordClassification(question);
    }

    const data = await response.json();
    const heritageLabel = "heritage";
    const isRelevant = data.label === heritageLabel ? true : false;

    return isRelevant;
  } catch (error) {
    // console.error("Error in classifyQuestionIntent:", error);
    // Fallback to keyword-based classification
    return fallbackKeywordClassification(question);
  }
};

/**
 * Fallback keyword-based classification khi HuggingFace API fail
 * @param {string} question - Câu hỏi
 * @returns {Object} Classification result
 */
const fallbackKeywordClassification = (question) => {
  const lowerQ = question.toLowerCase();

  // Heritage keywords
  const heritageKeywords = [
    "heritage",
    "monument",
    "temple",
    "pagoda",
    "citadel",
    "palace",
    "historical",
    "history",
    "ancient",
    "culture",
    "relic",
    "unesco",
    "imperial",
    "dynasty",
    "architecture",
    "when",
    "where",
    "built",
    "founded",
    "constructed",
  ];

  // Non-heritage keywords
  const nonHeritageKeywords = [
    "weather",
    "food",
    "recipe",
    "cook",
    "joke",
    "game",
    "sport",
    "movie",
    "music",
    "shopping",
    "hotel",
    "restaurant",
    "sex",
  ];

  const hasHeritageKeyword = heritageKeywords.some((kw) => lowerQ.includes(kw));
  const hasNonHeritageKeyword = nonHeritageKeywords.some((kw) =>
    lowerQ.includes(kw)
  );

  if (hasNonHeritageKeyword) return false;
  return true;
};

/**
 * Query RAG: embedding câu hỏi → tìm top-k documents → gọi Naver Chat API
 * @param {string} question - Câu hỏi của người dùng
 * @param {number} topK - Số lượng documents liên quan nhất cần lấy
 * @param {string} collectionName - Tên collection trong Qdrant
 * @param {string} heritageId - ID của di tích để filter (optional)
 * @returns {Promise<Object>} Kết quả RAG với answer và sources
 */
export const queryRAG = async (
  question,
  topK = 5,
  collectionName = "heritage_documents",
  heritageId = null
) => {
  try {
    // Bước 0: Classify intent trước khi gọi RAG
    const intentResult = await classifyQuestionIntent(question);

    // Nếu câu hỏi không liên quan, trả lời general luôn
    if (!intentResult) {
      console.log(
        `❌ Question classified as non-heritage related, returning general answer`
      );
      return await generateGeneralAnswer(question);
    }

    // Bước 1: Tạo embedding cho câu hỏi
    const questionEmbedding = await callNaverEmbeddingAPI(question);

    // Bước 2: Tạo filter nếu có heritageId
    let filter = null;
    if (heritageId) {
      filter = {
        must: [
          {
            key: "heritageId",
            match: { value: heritageId },
          },
        ],
      };
    }

    // Bước 3: Tìm kiếm top-k*2 documents trong Qdrant (lấy nhiều hơn để re-rank)
    const candidateDocs = await queryQdrant(
      questionEmbedding,
      topK * 2, // Lấy gấp đôi để có nhiều candidates cho re-ranking
      collectionName,
      filter
    );
    // console.log(
    //   `🔍 Found ${candidateDocs.length} candidate documents from Qdrant`,
    //   candidateDocs
    // );

    // Bước 3.5: Kiểm tra xem có documents liên quan không
    if (!candidateDocs || candidateDocs.length === 0) {
      // Không tìm thấy documents → trả lời general
      return await generateGeneralAnswer(question);
    }

    // Bước 4: Re-rank documents sử dụng Naver Reranker API
    // console.log(
    //   `🔄 Re-ranking ${candidateDocs.length} candidate documents with Naver Reranker...`
    // );
    const rerankedDocs = await rerankDocuments(question, candidateDocs);

    //
    if (!rerankedDocs || rerankedDocs.length === 0) {
      // console.log(
      //   `⚠️  Reranker returned no relevant documents, falling back to general answer`
      // );
      const fallbackPrompt = `
You are an AI assistant specialized in Vietnamese historical heritage sites.

The user's question is related to a heritage site, but the website/database does not have specific information about it yet.

Your rules:
1. Do NOT invent or guess any historical facts, names, dynasties, dates, or numbers about the site or historical figures. 
2. If exact data is unavailable, simply acknowledge that the specific information is not available. 
3. Provide only general context about ancient Vietnamese fortresses, military practices, or the era in general, without referencing specific dynasties or historical figures. 
4. Politely mention that the website currently does not have detailed information on this site.
5. Offer suggestions such as:
   - asking the user if they want to know about a different heritage site,
   - explaining general background of the era or region,
   - explaining why detailed information might not exist.
6. Keep the answer polite, concise, and educational.
7. Respond in English.
`.trim();

      return await generateGeneralAnswer(question, fallbackPrompt);
    }

    // Chỉ lấy top-k documents sau re-ranking
    const relevantDocs = rerankedDocs.slice(0, topK);
    // console.log(
    //   `✅ Selected top ${relevantDocs.length} documents after re-ranking`
    // );

    // Bước 5: Xây dựng context từ documents
    const context = buildContext(relevantDocs);

    // Bước 6: Gọi Naver Chat API với context và question
    const answer = await callNaverChatAPI(question, context);

    return {
      success: true,
      answer: answer,
      sources: relevantDocs.map((doc) => ({
        content: doc.document,
        metadata: doc.metadata,
        vectorScore: doc.score,
        rerankScore: doc.rerankScore,
        scores: doc.scores, // Detailed scoring breakdown
      })),
      mode: "rag", // Chế độ RAG
    };
  } catch (error) {
    console.error("Error in queryRAG:", error);
    throw error;
  }
};

/**
 * Query Qdrant để tìm các documents liên quan nhất
 * @param {Array<number>} embedding - Vector embedding của câu hỏi
 * @param {number} topK - Số lượng kết quả
 * @param {string} collectionName - Tên collection
 * @param {Object} filter - Qdrant filter (optional)
 * @returns {Promise<Array<Object>>} Mảng các documents liên quan
 */
const queryQdrant = async (embedding, topK, collectionName, filter = null) => {
  try {
    // Kiểm tra collection tồn tại
    const collections = await qdrantClient.getCollections();
    const exists = collections.collections.some(
      (col) => col.name === collectionName
    );

    if (!exists) {
      // console.log(`⚠️  Collection "${collectionName}" does not exist`);
      return [];
    }

    // Build search params
    const searchParams = {
      vector: embedding,
      limit: topK,
      with_payload: true,
    };

    // Thêm filter nếu có
    if (filter) {
      searchParams.filter = filter;
      // console.log("🔍 Filtering with:", JSON.stringify(filter));
    }

    // Search trong Qdrant
    const searchResult = await qdrantClient.search(
      collectionName,
      searchParams
    );
    // console.log(`✅ Qdrant search returned  results`, searchResult);
    // Format kết quả
    return searchResult.map((result) => ({
      document: result.payload.content,
      metadata: {
        ...result.payload,
        content: undefined, // Remove content from metadata
      },
      score: result.score, // Qdrant trả về score (0-1 với Cosine)
      id: result.id,
    }));
  } catch (error) {
    console.error("Error querying Qdrant:", error);
    // Nếu collection không tồn tại, trả về mảng rỗng
    if (
      error.message?.includes("not found") ||
      error.message?.includes("does not exist")
    ) {
      return [];
    }
    throw error;
  }
};

/**
 * Re-rank documents sử dụng Naver Reranker API
 * Model hiểu ngữ nghĩa sâu để đánh giá mức độ liên quan
 * @param {string} question - Câu hỏi
 * @param {Array<Object>} documents - Mảng documents từ vector search
 * @returns {Promise<Array<Object>>} Documents đã được re-rank
 */
const rerankDocuments = async (question, documents) => {
  if (!documents || documents.length === 0) {
    return [];
  }

  try {
    // Chuẩn bị documents cho Reranker API
    const rerankerDocs = documents.map((doc, index) => ({
      id: `doc_${index}`,
      doc: doc.document,
    }));

    // Gọi Naver Reranker API
    const response = await fetch(env.NAVER_RERANKER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.NAVER_API_KEY}`,
        "X-NCP-CLOVASTUDIO-REQUEST-ID": uuidv4(),
      },
      body: JSON.stringify({
        documents: rerankerDocs,
        query: question,
        maxTokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      // console.error(`Reranker API error: ${response.status} - ${errorData}`);
      // Fallback: trả về documents gốc với vector score
      return documents;
    }

    const data = await response.json();
    // console.log("✅ Reranker API response received", data);

    // Lấy cited documents (những documents được reranker chọn)
    const citedDocuments = data.result?.citedDocuments;
    // console.log("Console result", data.result);
    // console.log(
    //   `🔍 Reranker found ${citedDocuments.length} cited documents`,
    //   citedDocuments
    // );

    if (citedDocuments.length === 0) {
      // Nếu không có cited documents, giữ nguyên thứ tự vector search
      console.log(
        "⚠️  Reranker found no relevant documents, using vector search order"
      );
      return [];
    }

    // Map cited documents về original documents và thêm rerank score
    const rerankedDocs = citedDocuments.map((citedDoc, index) => {
      // Tìm document gốc dựa trên ID
      const docIndex = parseInt(citedDoc.id.replace("doc_", ""));
      const originalDoc = documents[docIndex];

      return {
        ...originalDoc,
        rerankScore: 1.0 - index * 0.1, // Score giảm dần theo thứ tự (1.0, 0.9, 0.8, ...)
        rerankPosition: index + 1,
        citedByReranker: true,
      };
    });

    // console.log(
    //   `✅ Reranker selected ${rerankedDocs.length}/${documents.length} documents`
    // );

    return rerankedDocs;
  } catch (error) {
    console.error("Error in rerankDocuments:", error);
    // Fallback: trả về documents gốc
    return documents;
  }
};

/**
 * Xây dựng context từ các documents liên quan
 * @param {Array<Object>} documents - Mảng documents
 * @returns {string} Context string
 */
const buildContext = (documents) => {
  if (!documents || documents.length === 0) {
    return "";
  }

  return documents
    .map((doc, index) => `[Document ${index + 1}]\n${doc.document}`)
    .join("\n\n");
};

/**
 * Gọi Naver Chat Completion API với context và question
 * @param {string} question - Câu hỏi
 * @param {string} context - Context từ RAG
 * @returns {Promise<string>} Câu trả lời
 */
const callNaverChatAPI = async (question, context) => {
  try {
    const systemPrompt =
      `You are an AI assistant specializing in Vietnamese cultural heritage.
You will receive some background reference information, but you must NOT mention or refer to it directly.

STRICT RULES:
1. Do NOT say phrases such as:
   - "Based on the information provided"
   - "According to the documents"
   - "From the context"
   - "Document 1, Document 2"
   - "The context says"
   - or any similar meta statements.
2. Do NOT mention or imply that you were given documents, sources, or context.
3. Answer naturally as if you already know the information.
4. If the reference information is incomplete, simply state that the available historical information is limited—without mentioning documents or context.
5. Do NOT invent dates, numbers, or historical facts.
6. Keep your answer clear, accurate, and friendly.
7. Respond in English.
`.trim();

    const userPrompt = `Here is some reference information that may help:

${context}

User question: ${question}

Please answer naturally using the information above, without mentioning that it came from references or documents.
If the information is incomplete, politely say that detailed information is limited.`.trim();

    const response = await fetch(env.NAVER_CHAT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.NAVER_API_KEY}`,
        "X-NCP-CLOVASTUDIO-REQUEST-ID": uuidv4(),
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
        topP: 0.8,
        topK: 0,
        maxTokens: 1000,
        temperature: 0.5,
        repeatPenalty: 5.0,
        stopBefore: [],
        includeAiFilters: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(
        `Naver Chat API error: ${response.status} - ${errorData}`
      );
    }

    const data = await response.json();

    return (
      data.result?.message?.content ||
      data.content ||
      "Unable to generate an answer"
    );
  } catch (error) {
    console.error("Error calling Naver Chat API:", error);
    throw error;
  }
};

/**
 * Tạo câu trả lời general khi không tìm thấy documents liên quan
 * @param {string} question - Câu hỏi
 * @returns {Promise<Object>} Câu trả lời general
 */
const generateGeneralAnswer = async (question, fallbackPrompt = null) => {
  try {
    // console.log("fallback", fallbackPrompt);
    const systemPrompt = fallbackPrompt
      ? fallbackPrompt
      : `You are an AI assistant specialized in Vietnamese historical heritage.

The user's question is outside your area of expertise and does not relate to heritage sites.

Your rules:
1. Politely acknowledge that the question is outside your main area of expertise, mentioning that you are a heritage assistant.
2. Provide a helpful answer to the user's question using general, widely-known knowledge.
3. Keep the tone friendly, concise, and educational.
4. Do NOT invent historical facts or fabricate information about heritage sites.
5. Respond in English.
`.trim();

    const response = await fetch(env.NAVER_CHAT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.NAVER_API_KEY}`,
        "X-NCP-CLOVASTUDIO-REQUEST-ID": uuidv4(),
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: question,
          },
        ],
        topP: 0.8,
        topK: 0,
        maxTokens: 500,
        temperature: 0.7,
        repeatPenalty: 5.0,
        stopBefore: [],
        includeAiFilters: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(
        `Naver Chat API error: ${response.status} - ${errorData}`
      );
    }

    const data = await response.json();
    const answer =
      data.result?.message?.content ||
      data.content ||
      "I apologize, but I cannot answer this question.";

    return {
      success: true,
      answer: answer,
      sources: [],
      mode: "general", // Chế độ general
    };
  } catch (error) {
    console.error("Error generating general answer:", error);
    throw error;
  }
};

/**
 * Xử lý upload và lưu trữ tài liệu
 * @param {string} fileContent - Nội dung file
 * @param {Object} metadata - Metadata của file
 * @param {string} collectionName - Tên collection
 * @returns {Promise<Object>} Kết quả xử lý
 */
export const processDocument = async (
  fileContent,
  metadata = {},
  collectionName = "heritage_documents"
) => {
  try {
    // Bước 1: Chia văn bản thành chunks với metadata
    const chunksWithMetadata = semanticChunkWithMetadata(fileContent, metadata);

    if (chunksWithMetadata.length === 0) {
      throw new Error("No chunks generated from document");
    }

    // Bước 2: Tạo embeddings cho các chunks
    const chunks = chunksWithMetadata.map((c) => c.content);
    const embeddings = await embedChunks(chunks);

    // Bước 3: Lưu vào Qdrant
    const result = await saveToQdrant(
      chunksWithMetadata,
      embeddings,
      collectionName
    );

    return {
      success: true,
      message: "Document processed successfully",
      chunksCount: chunksWithMetadata.length,
      collectionName: collectionName,
      ...result,
    };
  } catch (error) {
    console.error("Error in processDocument:", error);
    throw error;
  }
};

/**
 * Xóa toàn bộ collection (dùng cho việc reset dữ liệu)
 * @param {string} collectionName - Tên collection cần xóa
 * @returns {Promise<boolean>} True nếu xóa thành công
 */
export const deleteCollection = async (
  collectionName = "heritage_documents"
) => {
  try {
    await qdrantClient.deleteCollection(collectionName);
    console.log(`✅ Collection "${collectionName}" deleted successfully`);
    return true;
  } catch (error) {
    console.error("Error in deleteCollection:", error);
    // Nếu collection không tồn tại, vẫn coi như thành công
    if (
      error.message?.includes("not found") ||
      error.message?.includes("does not exist")
    ) {
      return true;
    }
    throw error;
  }
};

/**
 * Lấy danh sách tất cả collections
 * @returns {Promise<Array>} Danh sách collections
 */
export const listCollections = async () => {
  try {
    const result = await qdrantClient.getCollections();
    return result.collections;
  } catch (error) {
    console.error("Error listing collections:", error);
    throw error;
  }
};

/**
 * Lấy thông tin chi tiết của một collection
 * @param {string} collectionName - Tên collection
 * @returns {Promise<Object>} Thông tin collection
 */
export const getCollectionInfo = async (
  collectionName = "heritage_documents"
) => {
  try {
    const collectionInfo = await qdrantClient.getCollection(collectionName);

    return {
      name: collectionName,
      vectorsCount: collectionInfo.vectors_count || collectionInfo.points_count,
      status: collectionInfo.status,
      config: {
        vectorSize: collectionInfo.config?.params?.vectors?.size,
        distance: collectionInfo.config?.params?.vectors?.distance,
      },
    };
  } catch (error) {
    console.error("Error getting collection info:", error);
    throw error;
  }
};

/**
 * Scroll (paginate) through all points in a collection
 * @param {string} collectionName - Tên collection
 * @param {number} limit - Số lượng points mỗi batch
 * @returns {Promise<Array>} Danh sách tất cả points
 */
export const scrollCollection = async (
  collectionName = "heritage_documents",
  limit = 100
) => {
  try {
    const allPoints = [];
    let offset = null;

    while (true) {
      const result = await qdrantClient.scroll(collectionName, {
        limit: limit,
        offset: offset,
        with_payload: true,
        with_vector: false,
      });

      allPoints.push(...result.points);

      if (!result.next_page_offset) {
        break;
      }

      offset = result.next_page_offset;
    }

    return allPoints;
  } catch (error) {
    console.error("Error scrolling collection:", error);
    throw error;
  }
};
