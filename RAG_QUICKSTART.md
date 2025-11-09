# 🚀 Quick Start Guide - RAG System

## Bước 1: Cài đặt Dependencies

Hệ thống RAG đã được tích hợp vào project hiện có. Không cần cài thêm dependencies mới.

## Bước 2: Cài đặt và Chạy Chroma Vector Database

### Option 1: Sử dụng Docker (Khuyến nghị)

```bash
docker run -p 8000:8000 chromadb/chroma
```

### Option 2: Cài đặt từ pip

```bash
pip install chromadb
chroma run --host 0.0.0.0 --port 8000
```

## Bước 3: Cấu hình Environment Variables

1. Copy file `.env.example` thành `.env`:

```bash
cp .env.example .env
```

2. Mở file `.env` và cập nhật các giá trị sau:

```env
# Naver Cloud AI API Keys
NAVER_API_KEY=your_actual_naver_api_key
NAVER_APIGW_API_KEY=your_actual_apigw_key

# Naver API Endpoints (cập nhật nếu cần)
NAVER_EMBEDDING_API_URL=https://clovastudio.stream.ntruss.com/YOUR_APP/v1/api-tools/embedding/v2/YOUR_MODEL
NAVER_CHAT_API_URL=https://clovastudio.stream.ntruss.com/YOUR_APP/v1/chat-completions/YOUR_MODEL

# Chroma URL
CHROMA_URL=http://localhost:8000
```

### Cách lấy Naver API Keys:

1. Truy cập: https://console.ncloud.com/clovastudio
2. Đăng ký/Đăng nhập tài khoản Naver Cloud
3. Tạo project mới trong CLOVA Studio
4. Vào Settings → API Keys để lấy keys
5. Copy `API Key` và `API Gateway Key`

## Bước 4: Chạy Server

```bash
npm run dev
```

Server sẽ chạy tại `http://localhost:8017` (hoặc port bạn đã cấu hình).

## Bước 5: Kiểm tra Health Check

```bash
curl http://localhost:8017/api/v1/rag/health
```

Kết quả mong đợi:

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

## Bước 6: Upload Tài liệu

### Option A: Upload từ file

```bash
curl -X POST http://localhost:8017/api/v1/rag/upload \
  -F "file=@path/to/your/document.txt" \
  -F "title=Tên tài liệu" \
  -F "category=di-san-van-hoa" \
  -F "description=Mô tả tài liệu"
```

### Option B: Upload từ text

```bash
curl -X POST http://localhost:8017/api/v1/rag/upload-text \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Nội dung tài liệu của bạn...",
    "metadata": {
      "title": "Tên tài liệu",
      "category": "di-san-van-hoa"
    }
  }'
```

## Bước 7: Hỏi đáp với RAG

```bash
curl -X POST http://localhost:8017/api/v1/rag/query \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Chùa Một Cột được xây dựng vào năm nào?",
    "topK": 5
  }'
```

## Bước 8: Test với Script

Chạy script test tự động:

```bash
# Nếu sử dụng babel-node
npm install node-fetch form-data
npx babel-node src/test/test-rag-system.js

# Hoặc sử dụng node trực tiếp (cần build trước)
npm run build
node build/src/test/test-rag-system.js
```

## 📊 Kiến trúc Hệ thống

```
Client Request
      ↓
[RAG Routes] /api/v1/rag/*
      ↓
[RAG Controller]
      ↓
[RAG Service]
      ├──→ [Chunk Utils] (Semantic Chunking)
      ├──→ [Naver Embedding API]
      ├──→ [Chroma DB]
      └──→ [Naver Chat API]
```

## 🎯 Use Cases

### 1. Upload tài liệu về di sản văn hóa

```javascript
// Admin upload file PDF/TXT về các di sản
POST / api / v1 / rag / upload;
```

### 2. Người dùng hỏi về di sản

```javascript
// User hỏi: "Chùa Một Cột ở đâu?"
POST / api / v1 / rag / query;
// → RAG tìm kiếm trong documents → trả lời chính xác
```

### 3. Câu hỏi chung

```javascript
// User hỏi: "Xin chào!"
POST / api / v1 / rag / query;
// → Không tìm thấy document liên quan → general chat
```

## 🔧 Troubleshooting

### ❌ Error: "Chroma connection refused"

**Giải pháp:**

- Đảm bảo Chroma đang chạy: `docker ps` hoặc kiểm tra port 8000
- Kiểm tra CHROMA_URL trong .env

### ❌ Error: "Naver API unauthorized"

**Giải pháp:**

- Kiểm tra NAVER_API_KEY và NAVER_APIGW_API_KEY
- Đảm bảo API endpoints đúng với project của bạn

### ❌ Error: "No chunks generated"

**Giải pháp:**

- Kiểm tra nội dung file upload (phải là text)
- Đảm bảo file không rỗng

### ❌ Error: "File type not allowed"

**Giải pháp:**

- Chỉ hỗ trợ: .txt, .md, .json, .html, .csv
- Hoặc sử dụng `/upload-text` để upload text trực tiếp

## 📝 API Endpoints Summary

| Method | Endpoint                       | Description        | Auth   |
| ------ | ------------------------------ | ------------------ | ------ |
| GET    | `/api/v1/rag/health`           | Health check       | Public |
| POST   | `/api/v1/rag/query`            | Hỏi đáp RAG        | Public |
| POST   | `/api/v1/rag/upload`           | Upload file        | Admin  |
| POST   | `/api/v1/rag/upload-text`      | Upload text        | Admin  |
| POST   | `/api/v1/rag/upload-batch`     | Upload nhiều files | Admin  |
| DELETE | `/api/v1/rag/collection/:name` | Xóa collection     | Admin  |

## 📚 Tài liệu chi tiết

Xem file `RAG_DOCUMENTATION.md` để biết thêm chi tiết về:

- Kiến trúc hệ thống
- API endpoints đầy đủ
- Semantic chunking algorithm
- Tùy chỉnh và mở rộng

## 🎉 Hoàn thành!

Bây giờ bạn có thể:

1. ✅ Upload tài liệu về di sản văn hóa
2. ✅ Hệ thống tự động chunk, embed, và lưu vào vector DB
3. ✅ Người dùng hỏi → RAG tự động tìm kiếm và trả lời
4. ✅ Nếu không có tài liệu liên quan → general chat

## 💡 Tips

- Upload nhiều tài liệu để tăng độ chính xác
- Sử dụng topK phù hợp (3-5 cho kết quả tốt)
- Thêm metadata chi tiết khi upload
- Bật authentication cho production

## 🔗 Links

- [Naver Cloud Platform](https://console.ncloud.com/)
- [CLOVA Studio](https://console.ncloud.com/clovastudio)
- [Chroma Documentation](https://docs.trychroma.com/)
