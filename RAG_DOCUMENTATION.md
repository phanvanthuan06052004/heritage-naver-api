# Hệ thống RAG (Retrieval Augmented Generation)

## Tổng quan

Hệ thống RAG cho phép upload tài liệu, chia nhỏ theo ngữ nghĩa, tạo embedding và lưu vào vector database (Chroma), sau đó trả lời câu hỏi dựa trên kiến thức từ tài liệu.

## Kiến trúc

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│         RAG Controller              │
│  - uploadDocument                   │
│  - uploadText                       │
│  - query                            │
│  - uploadBatchDocuments             │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│         RAG Service                 │
│  - processDocument                  │
│  - embedChunks                      │
│  - saveToChroma                     │
│  - queryRAG                         │
│  - generateGeneralAnswer            │
└──────┬──────────────────────────────┘
       │
       ├──────► Naver Cloud AI
       │        - Embedding API
       │        - Chat Completion API
       │
       └──────► Chroma Vector DB
                - Lưu trữ embeddings
                - Tìm kiếm semantic
```

## Cấu hình Environment Variables

Thêm các biến sau vào file `.env`:

```env
# Naver Cloud AI API Configuration
NAVER_API_KEY=your_naver_clovastudio_api_key
NAVER_APIGW_API_KEY=your_naver_apigw_api_key

# Naver API Endpoints (tùy chọn - có giá trị mặc định)
NAVER_EMBEDDING_API_URL=https://clovastudio.stream.ntruss.com/testapp/v1/api-tools/embedding/v2/6e29c6cb34784b2198d70ca16605da7a
NAVER_CHAT_API_URL=https://clovastudio.stream.ntruss.com/testapp/v1/chat-completions/HCX-DASH-001

# Chroma Vector Database
CHROMA_URL=http://localhost:8000
```

## API Endpoints

### 1. Health Check

Kiểm tra trạng thái hệ thống RAG

**Endpoint:** `GET /api/v1/rag/health`

**Response:**

```json
{
  "success": true,
  "message": "RAG system is running",
  "checks": {
    "chromaConfigured": true,
    "naverApiKeyConfigured": true,
    "timestamp": "2025-11-08T10:00:00.000Z"
  }
}
```

### 2. Upload Document (Admin)

Upload và xử lý tài liệu từ file

**Endpoint:** `POST /api/v1/rag/upload`

**Headers:**

- `Content-Type: multipart/form-data`

**Body:**

- `file`: File tài liệu (txt, md, json, html, csv) - max 10MB
- `category` (optional): Danh mục tài liệu
- `title` (optional): Tiêu đề tài liệu
- `description` (optional): Mô tả tài liệu
- `collectionName` (optional): Tên collection trong Chroma

**Response:**

```json
{
  "success": true,
  "message": "Document uploaded and processed successfully",
  "data": {
    "success": true,
    "message": "Document processed successfully",
    "chunksCount": 15,
    "collectionName": "heritage_documents",
    "documentsAdded": 15
  }
}
```

### 3. Upload Text (Admin)

Upload tài liệu từ text trực tiếp

**Endpoint:** `POST /api/v1/rag/upload-text`

**Headers:**

- `Content-Type: application/json`

**Body:**

```json
{
  "text": "Nội dung tài liệu...",
  "metadata": {
    "title": "Tiêu đề",
    "category": "Di sản văn hóa",
    "description": "Mô tả"
  },
  "collectionName": "heritage_documents"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Text uploaded and processed successfully",
  "data": {
    "chunksCount": 10,
    "collectionName": "heritage_documents"
  }
}
```

### 4. Query RAG

Đặt câu hỏi và nhận câu trả lời từ RAG

**Endpoint:** `POST /api/v1/rag/query`

**Headers:**

- `Content-Type: application/json`

**Body:**

```json
{
  "question": "Chùa Một Cột được xây dựng vào năm nào?",
  "topK": 5,
  "collectionName": "heritage_documents"
}
```

**Response - RAG Mode (có tài liệu liên quan):**

```json
{
  "success": true,
  "data": {
    "success": true,
    "answer": "Chùa Một Cột được xây dựng vào năm 1049 dưới thời vua Lý Thái Tông...",
    "sources": [
      {
        "content": "Đoạn văn bản liên quan 1...",
        "metadata": {
          "filename": "chua-mot-cot.txt",
          "title": "Chùa Một Cột"
        },
        "score": 0.85
      }
    ],
    "mode": "rag"
  }
}
```

**Response - General Mode (không có tài liệu liên quan):**

```json
{
  "success": true,
  "data": {
    "success": true,
    "answer": "Xin chào! Tôi có thể giúp bạn tìm hiểu về di sản văn hóa Việt Nam...",
    "sources": [],
    "mode": "general"
  }
}
```

### 5. Upload Batch Documents (Admin)

Upload nhiều tài liệu cùng lúc

**Endpoint:** `POST /api/v1/rag/upload-batch`

**Headers:**

- `Content-Type: multipart/form-data`

**Body:**

- `files`: Mảng các files (max 10 files)
- `collectionName` (optional): Tên collection

**Response:**

```json
{
  "success": true,
  "message": "Batch upload completed",
  "data": {
    "successful": 8,
    "failed": 2,
    "results": [...],
    "errors": [...]
  }
}
```

### 6. Delete Collection (Admin - CẨNH THẬN!)

Xóa toàn bộ collection

**Endpoint:** `DELETE /api/v1/rag/collection/:collectionName`

**Response:**

```json
{
  "success": true,
  "message": "Collection 'heritage_documents' deleted successfully"
}
```

## Cài đặt và Chạy

### 1. Cài đặt Chroma Vector Database

```bash
# Sử dụng Docker
docker run -p 8000:8000 chromadb/chroma

# Hoặc cài đặt từ pip
pip install chromadb
chroma run --host 0.0.0.0 --port 8000
```

### 2. Cấu hình Environment Variables

Tạo file `.env` và thêm các biến cần thiết (xem phần Cấu hình ở trên).

### 3. Chạy server

```bash
npm run dev
```

### 4. Test API

```bash
# Test health check
curl http://localhost:3000/api/v1/rag/health

# Upload document
curl -X POST http://localhost:3000/api/v1/rag/upload \
  -F "file=@document.txt" \
  -F "title=Di sản văn hóa" \
  -F "category=heritage"

# Query
curl -X POST http://localhost:3000/api/v1/rag/query \
  -H "Content-Type: application/json" \
  -d '{"question":"Chùa Một Cột ở đâu?"}'
```

## Quy trình RAG

### Upload Document Flow:

1. Admin upload file → `POST /api/v1/rag/upload`
2. Đọc nội dung file
3. **Semantic Chunking**: Chia văn bản theo ngữ nghĩa (không cắt cứng)
   - Sử dụng `semanticChunk()` từ `chunkUtils.js`
   - Chunk size: 1000 ký tự (có thể tùy chỉnh)
   - Overlap: 200 ký tự giữa các chunks
4. **Embedding**: Gọi Naver Embedding API cho từng chunk
   - API: `/api-tools/embedding/v2/...`
   - Trả về vector embeddings
5. **Save to Chroma**: Lưu chunks + embeddings + metadata vào Chroma
6. Return kết quả

### Query Flow:

1. User gửi câu hỏi → `POST /api/v1/rag/query`
2. **Embedding question**: Gọi Naver Embedding API cho câu hỏi
3. **Query Chroma**: Tìm top-K documents gần nhất (cosine similarity)
4. **Decision**:
   - Nếu có documents liên quan (score cao):
     - Build context từ documents
     - Gọi Naver Chat API với context + question
     - Return mode: "rag"
   - Nếu không có documents liên quan:
     - Gọi Naver Chat API trực tiếp (general chat)
     - Return mode: "general"
5. Return câu trả lời + sources

## Semantic Chunking

Thuật toán chunking thông minh:

- Chia theo câu, không cắt giữa câu
- Overlap giữa các chunks để bảo toàn ngữ cảnh
- Xử lý đặc biệt cho câu quá dài
- Hỗ trợ tiếng Việt và tiếng Anh

Ví dụ:

```javascript
const chunks = semanticChunk(text, 1000, 200);
// → ["Chunk 1...", "...overlap... Chunk 2...", ...]
```

## Tùy chỉnh

### Thay đổi Chunk Size

Sửa trong `ragController.js`:

```javascript
const chunksWithMetadata = semanticChunkWithMetadata(
  fileContent,
  metadata,
  2000, // maxChunkSize
  400 // overlapSize
);
```

### Thay đổi Top-K

Trong query request:

```json
{
  "question": "...",
  "topK": 10 // Mặc định là 5
}
```

### Thêm Authentication

Uncomment các dòng trong `ragRoute.js`:

```javascript
Router.post(
  "/upload",
  authMiddleware.verifyToken, // Uncomment
  authMiddleware.isAdmin, // Uncomment
  upload.single("file"),
  ragController.uploadDocument
);
```

## Lưu ý

1. **API Keys**: Đảm bảo có API keys hợp lệ từ Naver Cloud Platform
2. **Chroma**: Phải chạy Chroma server trước khi sử dụng
3. **File Types**: Chỉ hỗ trợ text-based files (txt, md, json, html, csv)
4. **File Size**: Giới hạn 10MB mỗi file
5. **Security**: Endpoints upload nên được bảo vệ bằng authentication

## Troubleshooting

### Chroma connection error

- Kiểm tra Chroma server đang chạy: `curl http://localhost:8000/api/v1/heartbeat`
- Kiểm tra CHROMA_URL trong .env

### Naver API error

- Kiểm tra API keys
- Kiểm tra API endpoints
- Xem logs chi tiết trong console

### Empty embeddings

- Kiểm tra response format từ Naver API
- Có thể cần điều chỉnh code parse response

## Performance Tips

1. Batch upload documents thay vì upload từng file
2. Cache embeddings nếu có thể
3. Điều chỉnh chunk size phù hợp với use case
4. Sử dụng topK hợp lý (không quá lớn)

## Mở rộng

- [ ] Thêm validation cho input
- [ ] Implement caching layer
- [ ] Thêm metrics và monitoring
- [ ] Support thêm file types (PDF, DOCX)
- [ ] Implement hybrid search (keyword + semantic)
- [ ] Add rate limiting
- [ ] Implement document versioning
- [ ] Add analytics dashboard
