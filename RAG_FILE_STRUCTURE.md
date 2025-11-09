# 📋 RAG System - File Structure Summary

## Files Created/Modified

### ✅ New Files Created

```
src/
├── utils/
│   └── chunkUtils.js                    # Semantic chunking utility
├── services/
│   └── ragService.js                    # RAG service layer (core logic)
├── controllers/
│   └── ragController.js                 # RAG API handlers
├── routes/v1/
│   └── ragRoute.js                      # RAG API routes
├── validations/
│   └── ragValidation.js                 # Input validation schemas
└── test/
    └── test-rag-system.js              # Testing script

Uploads/
└── rag-documents/                       # Directory for uploaded documents

Root files:
├── RAG_DOCUMENTATION.md                 # Complete documentation
├── RAG_QUICKSTART.md                    # Quick start guide
└── .env.example                         # Updated with RAG config
```

### ✏️ Files Modified

```
src/
├── config/
│   └── environment.js                   # Added RAG environment variables
└── routes/v1/
    └── index.js                         # Imported and registered RAG routes
```

## File Descriptions

### Core Files

#### 1. `src/utils/chunkUtils.js`

**Purpose:** Semantic text chunking
**Key Functions:**

- `semanticChunk(text, maxChunkSize, overlapSize)` - Smart text splitting
- `semanticChunkWithMetadata(text, metadata, maxChunkSize, overlapSize)` - Chunking with metadata

**Features:**

- Splits by sentence boundaries (not hard character limit)
- Preserves context with overlapping chunks
- Handles Vietnamese and English
- Special handling for long sentences

#### 2. `src/services/ragService.js`

**Purpose:** Core RAG logic
**Key Functions:**

- `embedChunks(chunks)` - Call Naver Embedding API
- `saveToChroma(chunksWithMetadata, embeddings, collectionName)` - Save to vector DB
- `queryRAG(question, topK, collectionName)` - RAG query pipeline
- `processDocument(fileContent, metadata, collectionName)` - Complete document processing
- `generateGeneralAnswer(question)` - Fallback for non-RAG queries
- `ensureCollection(collectionName)` - Collection management
- `deleteCollection(collectionName)` - Collection deletion

**Integration:**

- Naver Cloud AI Embedding API
- Naver Cloud AI Chat Completion API
- Chroma Vector Database

#### 3. `src/controllers/ragController.js`

**Purpose:** API request handlers
**Exports:**

- `uploadDocument` - Handle file uploads
- `uploadText` - Handle text uploads
- `query` - Handle RAG queries
- `uploadBatchDocuments` - Handle multiple file uploads
- `deleteCollectionHandler` - Handle collection deletion
- `healthCheck` - System health check

#### 4. `src/routes/v1/ragRoute.js`

**Purpose:** API route definitions
**Endpoints:**

- `GET /api/v1/rag/health` - Health check
- `POST /api/v1/rag/query` - Query RAG
- `POST /api/v1/rag/upload` - Upload file
- `POST /api/v1/rag/upload-text` - Upload text
- `POST /api/v1/rag/upload-batch` - Upload multiple files
- `DELETE /api/v1/rag/collection/:name` - Delete collection

**Features:**

- Multer configuration for file uploads
- File type filtering (text files only)
- Size limits (10MB)
- Validation middleware
- Auth placeholders (commented)

#### 5. `src/validations/ragValidation.js`

**Purpose:** Input validation
**Exports:**

- `uploadText` - Validate text upload
- `query` - Validate query request
- `uploadDocument` - Validate file upload metadata
- `deleteCollection` - Validate collection name

### Configuration Files

#### 6. `src/config/environment.js`

**Added Variables:**

```javascript
NAVER_API_KEY; // Naver CLOVA Studio API key
NAVER_APIGW_API_KEY; // Naver API Gateway key
NAVER_EMBEDDING_API_URL; // Embedding endpoint
NAVER_CHAT_API_URL; // Chat completion endpoint
CHROMA_URL; // Chroma vector DB URL
```

#### 7. `.env.example`

**Added Section:** RAG System configuration with:

- API key placeholders
- Default endpoint URLs
- Setup instructions

### Documentation Files

#### 8. `RAG_DOCUMENTATION.md`

**Contents:**

- System architecture overview
- Complete API documentation
- Environment setup guide
- RAG flow diagrams
- Semantic chunking explanation
- Customization guide
- Troubleshooting
- Performance tips

#### 9. `RAG_QUICKSTART.md`

**Contents:**

- Step-by-step setup guide
- Quick start commands
- Naver API key acquisition
- Testing examples
- Use cases
- Common errors and solutions

### Testing Files

#### 10. `src/test/test-rag-system.js`

**Purpose:** Automated testing
**Test Functions:**

- `testHealthCheck()` - Test system health
- `testUploadText()` - Test text upload
- `testRAGUpload()` - Test file upload
- `testRAGQuery()` - Test RAG queries
- `runAllTests()` - Run all tests

## Directory Structure

```
heritage-naver-api/
│
├── src/
│   ├── config/
│   │   ├── cors.js
│   │   ├── environment.js          ← Modified
│   │   └── mongodb.js
│   │
│   ├── controllers/
│   │   ├── ... (existing)
│   │   └── ragController.js        ← NEW
│   │
│   ├── routes/v1/
│   │   ├── ... (existing)
│   │   ├── index.js                ← Modified
│   │   └── ragRoute.js             ← NEW
│   │
│   ├── services/
│   │   ├── ... (existing)
│   │   └── ragService.js           ← NEW
│   │
│   ├── utils/
│   │   ├── ... (existing)
│   │   └── chunkUtils.js           ← NEW
│   │
│   ├── validations/
│   │   ├── ... (existing)
│   │   └── ragValidation.js        ← NEW
│   │
│   └── test/
│       ├── ... (existing)
│       └── test-rag-system.js      ← NEW
│
├── Uploads/
│   ├── avatar/
│   ├── comments/
│   └── rag-documents/              ← NEW
│
├── .env.example                     ← Modified
├── RAG_DOCUMENTATION.md            ← NEW
├── RAG_QUICKSTART.md               ← NEW
└── package.json
```

## Integration Points

### 1. Main Router

**File:** `src/routes/v1/index.js`

```javascript
import { ragRoute } from "./ragRoute";
// ...
Router.use("/rag", ragRoute);
```

### 2. Environment Config

**File:** `src/config/environment.js`

```javascript
export const env = {
  // ... existing config
  NAVER_API_KEY: process.env.NAVER_API_KEY,
  NAVER_APIGW_API_KEY: process.env.NAVER_APIGW_API_KEY,
  // ... RAG config
};
```

### 3. File Uploads

**Directory:** `Uploads/rag-documents/`

- Created automatically for RAG document uploads
- Separate from existing avatar/comments uploads

## Dependencies Used

### Existing (no new installs needed):

- `express` - Web framework
- `multer` - File upload handling
- `joi` - Validation
- `uuid` - Unique ID generation
- `http-status-codes` - HTTP status constants

### External Services:

- **Naver Cloud AI** - Embedding & Chat APIs
- **Chroma DB** - Vector database (requires separate installation)

## Environment Variables Required

```env
# Required
NAVER_API_KEY=xxx
NAVER_APIGW_API_KEY=xxx
CHROMA_URL=http://localhost:8000

# Optional (have defaults)
NAVER_EMBEDDING_API_URL=...
NAVER_CHAT_API_URL=...
```

## API Flow Summary

### Upload Flow

```
Client → ragRoute → ragValidation → ragController
  → ragService.processDocument
    → chunkUtils.semanticChunkWithMetadata
    → ragService.embedChunks → Naver Embedding API
    → ragService.saveToChroma → Chroma DB
  → Response
```

### Query Flow

```
Client → ragRoute → ragValidation → ragController
  → ragService.queryRAG
    → Embed question → Naver Embedding API
    → Query Chroma → Find top-K documents
    → If documents found:
      → Build context
      → Call Naver Chat API with context
    → Else:
      → Call Naver Chat API (general)
  → Response
```

## Security Considerations

1. **Authentication**: Placeholders added (commented) - uncomment to enable
2. **File Validation**: Only text files, max 10MB
3. **Input Validation**: Joi schemas for all inputs
4. **Rate Limiting**: Not implemented (recommended for production)

## Next Steps for Production

- [ ] Enable authentication for admin endpoints
- [ ] Add rate limiting
- [ ] Implement caching
- [ ] Add monitoring/logging
- [ ] Set up backup for Chroma data
- [ ] Configure CORS for specific domains
- [ ] Add API documentation (Swagger/OpenAPI)
- [ ] Implement error tracking (Sentry, etc.)
- [ ] Add unit tests
- [ ] Configure CI/CD pipeline

## Support & Maintenance

**Key Files to Monitor:**

- `ragService.js` - Core logic, API integrations
- `ragController.js` - Error handling, response formatting
- `environment.js` - Configuration management

**Common Modifications:**

- Adjust chunk size: `chunkUtils.js`
- Change embedding model: `environment.js` + Naver API URL
- Add authentication: Uncomment in `ragRoute.js`
- Custom validation: `ragValidation.js`

---

**Status:** ✅ Complete and Ready for Use
**Last Updated:** November 8, 2025
