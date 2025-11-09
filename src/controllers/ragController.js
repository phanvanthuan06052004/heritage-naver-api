/**
 * RAG Controller
 * Xử lý các API requests cho hệ thống RAG
 */

import { StatusCodes } from 'http-status-codes'
import { processDocument, queryRAG, deleteCollection, listCollections, getCollectionInfo } from '~/services/ragService'
import fs from 'fs/promises'
import path from 'path'

/**
 * Upload và xử lý tài liệu (Admin only)
 * POST /api/v1/rag/upload
 */
const uploadDocument = async (req, res, next) => {
  try {
    // Kiểm tra file có được upload không
    if (!req.file) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'No file uploaded'
      })
    }

    // Đọc nội dung file
    const filePath = req.file.path
    const fileContent = await fs.readFile(filePath, 'utf-8')

    // Metadata từ request body
    const metadata = {
      filename: req.file.originalname,
      uploadedBy: req.user?.userId || 'admin', // Giả sử có middleware auth
      uploadedAt: new Date().toISOString(),
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      category: req.body.category || 'general',
      title: req.body.title || req.file.originalname,
      description: req.body.description || ''
    }

    // Collection name từ request hoặc mặc định
    const collectionName = req.body.collectionName || 'heritage_documents'

    // Xử lý document: chunk → embed → save to Chroma
    const result = await processDocument(fileContent, metadata, collectionName)

    // Xóa file tạm sau khi xử lý (optional)
    try {
      await fs.unlink(filePath)
    } catch (unlinkError) {
      console.error('Error deleting temp file:', unlinkError)
    }

    return res.status(StatusCodes.OK).json({
      success: true,
      message: 'Document uploaded and processed successfully',
      data: result
    })
  } catch (error) {
    console.error('Error in uploadDocument:', error)
    next(error)
  }
}

/**
 * Upload tài liệu từ text trực tiếp (không qua file)
 * POST /api/v1/rag/upload-text
 */
const uploadText = async (req, res, next) => {
  try {
    const { text, metadata, collectionName } = req.body

    // Validate input
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Text content is required'
      })
    }

    // Metadata mặc định
    const documentMetadata = {
      uploadedBy: req.user?.userId || 'admin',
      uploadedAt: new Date().toISOString(),
      ...metadata
    }

    // Xử lý document
    const result = await processDocument(
      text,
      documentMetadata,
      collectionName || 'heritage_documents'
    )

    return res.status(StatusCodes.OK).json({
      success: true,
      message: 'Text uploaded and processed successfully',
      data: result
    })
  } catch (error) {
    console.error('Error in uploadText:', error)
    next(error)
  }
}

/**
 * Query RAG - người dùng đặt câu hỏi
 * POST /api/v1/rag/query
 */
const query = async (req, res, next) => {
  try {
    const { question, topK, collectionName } = req.body

    // Validate input
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Question is required'
      })
    }

    // Thực hiện RAG query
    const result = await queryRAG(
      question.trim(),
      topK || 5,
      collectionName || 'heritage_documents'
    )

    return res.status(StatusCodes.OK).json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Error in query:', error)
    next(error)
  }
}

/**
 * Xóa toàn bộ collection (Admin only - cẩn thận!)
 * DELETE /api/v1/rag/collection/:collectionName
 */
const deleteCollectionHandler = async (req, res, next) => {
  try {
    const { collectionName } = req.params

    if (!collectionName) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Collection name is required'
      })
    }

    await deleteCollection(collectionName)

    return res.status(StatusCodes.OK).json({
      success: true,
      message: `Collection '${collectionName}' deleted successfully`
    })
  } catch (error) {
    console.error('Error in deleteCollectionHandler:', error)
    next(error)
  }
}

/**
 * Health check cho RAG system
 * GET /api/v1/rag/health
 */
const healthCheck = async (req, res, next) => {
  try {
    // Kiểm tra kết nối với Chroma
    // Kiểm tra API keys
    const checks = {
      chromaConfigured: !!process.env.CHROMA_URL,
      naverApiKeyConfigured: !!process.env.NAVER_API_KEY,
      timestamp: new Date().toISOString()
    }

    return res.status(StatusCodes.OK).json({
      success: true,
      message: 'RAG system is running',
      checks: checks
    })
  } catch (error) {
    console.error('Error in healthCheck:', error)
    next(error)
  }
}

/**
 * Upload batch documents (nhiều files cùng lúc)
 * POST /api/v1/rag/upload-batch
 */
const uploadBatchDocuments = async (req, res, next) => {
  try {
    // Kiểm tra files có được upload không
    if (!req.files || req.files.length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'No files uploaded'
      })
    }

    const collectionName = req.body.collectionName || 'heritage_documents'
    const results = []
    const errors = []

    // Xử lý từng file
    for (const file of req.files) {
      try {
        const fileContent = await fs.readFile(file.path, 'utf-8')
        
        const metadata = {
          filename: file.originalname,
          uploadedBy: req.user?.userId || 'admin',
          uploadedAt: new Date().toISOString(),
          fileSize: file.size,
          mimeType: file.mimetype
        }

        const result = await processDocument(fileContent, metadata, collectionName)
        results.push({
          filename: file.originalname,
          success: true,
          ...result
        })

        // Xóa file tạm
        try {
          await fs.unlink(file.path)
        } catch (unlinkError) {
          console.error('Error deleting temp file:', unlinkError)
        }
      } catch (error) {
        errors.push({
          filename: file.originalname,
          error: error.message
        })
      }
    }

    return res.status(StatusCodes.OK).json({
      success: true,
      message: 'Batch upload completed',
      data: {
        successful: results.length,
        failed: errors.length,
        results: results,
        errors: errors
      }
    })
  } catch (error) {
    console.error('Error in uploadBatchDocuments:', error)
    next(error)
  }
}

/**
 * Lấy danh sách tất cả collections
 * GET /api/v1/rag/collections
 */
const listCollectionsHandler = async (req, res, next) => {
  try {
    const collections = await listCollections()

    return res.status(StatusCodes.OK).json({
      success: true,
      data: {
        count: collections.length,
        collections: collections
      }
    })
  } catch (error) {
    console.error('Error in listCollectionsHandler:', error)
    next(error)
  }
}

/**
 * Lấy thông tin chi tiết của một collection
 * GET /api/v1/rag/collection/:collectionName/info
 */
const getCollectionInfoHandler = async (req, res, next) => {
  try {
    const { collectionName } = req.params

    if (!collectionName) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Collection name is required'
      })
    }

    const info = await getCollectionInfo(collectionName)

    return res.status(StatusCodes.OK).json({
      success: true,
      data: info
    })
  } catch (error) {
    console.error('Error in getCollectionInfoHandler:', error)
    next(error)
  }
}

export const ragController = {
  uploadDocument,
  uploadText,
  query,
  deleteCollectionHandler,
  healthCheck,
  uploadBatchDocuments,
  listCollectionsHandler,
  getCollectionInfoHandler
}
