/**
 * Semantic Chunking Utility
 * Chia văn bản theo ngữ nghĩa thay vì chia cứng theo ký tự
 */

/**
 * Chia văn bản thành các chunks theo ngữ nghĩa
 * @param {string} text - Văn bản cần chia
 * @param {number} maxChunkSize - Kích thước tối đa của mỗi chunk (số ký tự)
 * @param {number} overlapSize - Độ chồng lấp giữa các chunk
 * @returns {Array<string>} Mảng các chunks
 */
export const semanticChunk = (text, maxChunkSize = 1000, overlapSize = 200) => {
  if (!text || typeof text !== 'string') {
    return []
  }

  // Loại bỏ khoảng trắng thừa
  const cleanedText = text.trim().replace(/\s+/g, ' ')

  // Nếu văn bản nhỏ hơn maxChunkSize, trả về nguyên văn bản
  if (cleanedText.length <= maxChunkSize) {
    return [cleanedText]
  }

  const chunks = []
  const sentences = splitIntoSentences(cleanedText)
  
  let currentChunk = ''
  let previousChunk = ''

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i]
    const potentialChunk = currentChunk + (currentChunk ? ' ' : '') + sentence

    // Nếu thêm câu này vẫn nhỏ hơn maxChunkSize, tiếp tục thêm
    if (potentialChunk.length <= maxChunkSize) {
      currentChunk = potentialChunk
    } else {
      // Nếu vượt quá maxChunkSize
      if (currentChunk) {
        // Lưu chunk hiện tại
        chunks.push(currentChunk)
        previousChunk = currentChunk

        // Bắt đầu chunk mới với overlap
        const overlapText = getOverlapText(currentChunk, overlapSize)
        currentChunk = overlapText + (overlapText ? ' ' : '') + sentence
      } else {
        // Trường hợp câu đơn lẻ quá dài, chia nhỏ câu đó
        const subChunks = splitLongSentence(sentence, maxChunkSize, overlapSize)
        chunks.push(...subChunks.slice(0, -1))
        currentChunk = subChunks[subChunks.length - 1]
      }
    }
  }

  // Thêm chunk cuối cùng
  if (currentChunk) {
    chunks.push(currentChunk)
  }

  return chunks.filter(chunk => chunk.trim().length > 0)
}

/**
 * Chia văn bản thành các câu dựa trên dấu câu
 * @param {string} text - Văn bản cần chia
 * @returns {Array<string>} Mảng các câu
 */
const splitIntoSentences = (text) => {
  // Regex để chia câu dựa trên dấu chấm, chấm hỏi, chấm than
  // Hỗ trợ cả tiếng Việt và tiếng Anh
  const sentenceRegex = /[^.!?。！？]+[.!?。！？]+|[^.!?。！？]+$/g
  const sentences = text.match(sentenceRegex) || []
  
  return sentences.map(s => s.trim()).filter(s => s.length > 0)
}

/**
 * Lấy phần overlap từ cuối chunk
 * @param {string} chunk - Chunk cần lấy overlap
 * @param {number} overlapSize - Kích thước overlap
 * @returns {string} Văn bản overlap
 */
const getOverlapText = (chunk, overlapSize) => {
  if (chunk.length <= overlapSize) {
    return chunk
  }

  // Lấy overlapSize ký tự cuối và cố gắng cắt tại ranh giới từ
  const overlapText = chunk.slice(-overlapSize)
  const firstSpaceIndex = overlapText.indexOf(' ')
  
  if (firstSpaceIndex !== -1 && firstSpaceIndex < overlapSize * 0.3) {
    return overlapText.slice(firstSpaceIndex + 1)
  }
  
  return overlapText
}

/**
 * Chia câu dài thành các chunks nhỏ hơn
 * @param {string} sentence - Câu cần chia
 * @param {number} maxChunkSize - Kích thước tối đa
 * @param {number} overlapSize - Độ chồng lấp
 * @returns {Array<string>} Mảng các chunks
 */
const splitLongSentence = (sentence, maxChunkSize, overlapSize) => {
  const words = sentence.split(' ')
  const chunks = []
  let currentChunk = ''

  for (const word of words) {
    const potentialChunk = currentChunk + (currentChunk ? ' ' : '') + word

    if (potentialChunk.length <= maxChunkSize) {
      currentChunk = potentialChunk
    } else {
      if (currentChunk) {
        chunks.push(currentChunk)
        const overlapText = getOverlapText(currentChunk, overlapSize)
        currentChunk = overlapText + (overlapText ? ' ' : '') + word
      } else {
        // Từ đơn lẻ quá dài, cắt cứng
        chunks.push(word.slice(0, maxChunkSize))
        currentChunk = word.slice(maxChunkSize)
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk)
  }

  return chunks
}

/**
 * Chia văn bản thành chunks với metadata bổ sung
 * @param {string} text - Văn bản cần chia
 * @param {Object} metadata - Metadata của tài liệu
 * @param {number} maxChunkSize - Kích thước tối đa của mỗi chunk
 * @param {number} overlapSize - Độ chồng lấp giữa các chunk
 * @returns {Array<Object>} Mảng các chunks với metadata
 */
export const semanticChunkWithMetadata = (text, metadata = {}, maxChunkSize = 450, overlapSize = 120) => {
  const chunks = semanticChunk(text, maxChunkSize, overlapSize)
  
  return chunks.map((chunk, index) => ({
    content: chunk,
    chunkIndex: index,
    totalChunks: chunks.length,
    ...metadata
  }))
}
