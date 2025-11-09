import express from 'express'
import multer from 'multer'
import path from 'path'
import { ragController } from '~/controllers/ragController'
import { ragValidation } from '~/validations/ragValidation'
// import { authMiddleware } from '~/middlewares/authMiddeware' // Uncomment nếu cần auth

const Router = express.Router()

// Cấu hình multer để upload files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Lưu vào thư mục Uploads/rag-documents
    cb(null, 'Uploads/rag-documents')
  },
  filename: (req, file, cb) => {
    // Tạo tên file unique với timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const ext = path.extname(file.originalname)
    const nameWithoutExt = path.basename(file.originalname, ext)
    cb(null, `${nameWithoutExt}-${uniqueSuffix}${ext}`)
  }
})

// File filter - chỉ chấp nhận text files
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'text/plain',
    'text/markdown',
    'application/json',
    'text/html',
    'text/csv'
  ]
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('Only text-based files are allowed (txt, md, json, html, csv)'), false)
  }
}

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
})

/**
 * Health check endpoint
 * GET /api/v1/rag/health
 * Public
 */
Router.get('/health', ragController.healthCheck)

/**
 * Query RAG - Người dùng đặt câu hỏi
 * POST /api/v1/rag/query
 * Public hoặc Authenticated
 * Body: { question, topK?, collectionName? }
 */
Router.post('/query', ragValidation.query, ragController.query)

/**
 * Upload tài liệu từ file (Admin only)
 * POST /api/v1/rag/upload
 * Requires: Admin authentication
 * Body: multipart/form-data with file, category?, title?, description?, collectionName?
 */
Router.post(
  '/upload',
  // authMiddleware.verifyToken, // Uncomment để bật auth
  // authMiddleware.isAdmin,      // Uncomment để chỉ admin
  upload.single('file'),
  ragValidation.uploadDocument,
  ragController.uploadDocument
)

/**
 * Upload tài liệu từ text trực tiếp (Admin only)
 * POST /api/v1/rag/upload-text
 * Requires: Admin authentication
 * Body: { text, metadata?, collectionName? }
 */
Router.post(
  '/upload-text',
  // authMiddleware.verifyToken, // Uncomment để bật auth
  // authMiddleware.isAdmin,      // Uncomment để chỉ admin
  ragValidation.uploadText,
  ragController.uploadText
)

/**
 * Upload nhiều tài liệu cùng lúc (Admin only)
 * POST /api/v1/rag/upload-batch
 * Requires: Admin authentication
 * Body: multipart/form-data with multiple files
 */
Router.post(
  '/upload-batch',
  // authMiddleware.verifyToken, // Uncomment để bật auth
  // authMiddleware.isAdmin,      // Uncomment để chỉ admin
  upload.array('files', 10), // Max 10 files
  ragController.uploadBatchDocuments
)

/**
 * Lấy danh sách tất cả collections
 * GET /api/v1/rag/collections
 * Requires: Admin authentication
 */
Router.get(
  '/collections',
  // authMiddleware.verifyToken, // Uncomment để bật auth
  // authMiddleware.isAdmin,      // Uncomment để chỉ admin
  ragController.listCollectionsHandler
)

/**
 * Lấy thông tin chi tiết của collection
 * GET /api/v1/rag/collection/:collectionName/info
 * Requires: Admin authentication
 */
Router.get(
  '/collection/:collectionName/info',
  // authMiddleware.verifyToken, // Uncomment để bật auth
  // authMiddleware.isAdmin,      // Uncomment để chỉ admin
  ragController.getCollectionInfoHandler
)

/**
 * Xóa collection (Admin only - CẨNH THẬN!)
 * DELETE /api/v1/rag/collection/:collectionName
 * Requires: Admin authentication
 */
Router.delete(
  '/collection/:collectionName',
  // authMiddleware.verifyToken, // Uncomment để bật auth
  // authMiddleware.isAdmin,      // Uncomment để chỉ admin
  ragValidation.deleteCollection,
  ragController.deleteCollectionHandler
)

export const ragRoute = Router
