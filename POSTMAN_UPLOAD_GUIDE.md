# 📤 Upload Heritage Data với Postman - Hướng Dẫn Chi Tiết

## 🎯 Tổng Quan

Có **2 cách upload** dữ liệu vào Chroma vector database:

1. **Upload File** - Tốt cho dataset lớn (recommend)
2. **Upload Text** - Tốt cho test nhanh hoặc dữ liệu ngắn

---

## 📋 Chuẩn Bị

### 1️⃣ Khởi động hệ thống

```bash
# Terminal 1: Chroma DB
docker run -p 8000:8000 chromadb/chroma

# Terminal 2: Backend server
npm run dev
```

### 2️⃣ Convert JSON dataset sang text

```bash
npx babel-node src/scripts/prepare-heritage-text.js
```

**Output**: File `heritage_documents_prepared.txt` sẽ được tạo ở thư mục gốc

---

## 🚀 Cách 1: Upload File (Recommended)

### Step 1: Mở Postman và tạo request mới

- **Method**: `POST`
- **URL**: `http://localhost:3000/api/v1/rag/upload`

### Step 2: Headers

Không cần thêm headers (Postman tự động thêm `Content-Type: multipart/form-data`)

### Step 3: Body

1. Chọn tab **Body**
2. Chọn **form-data**
3. Thêm các fields:

| Key              | Type     | Value                                       | Description               |
| ---------------- | -------- | ------------------------------------------- | ------------------------- |
| `file`           | **File** | Chọn file `heritage_documents_prepared.txt` | File text chứa documents  |
| `collectionName` | Text     | `heritage_documents`                        | Tên collection (optional) |
| `category`       | Text     | `heritage`                                  | Danh mục (optional)       |
| `title`          | Text     | `Vietnamese Heritage Database`              | Tiêu đề (optional)        |
| `description`    | Text     | `UNESCO heritage sites in Vietnam`          | Mô tả (optional)          |

**Ảnh minh họa Postman Body:**

```
┌─────────────────┬──────┬─────────────────────────────────────┐
│ Key             │ Type │ Value                               │
├─────────────────┼──────┼─────────────────────────────────────┤
│ file            │ File │ heritage_documents_prepared.txt     │
│ collectionName  │ Text │ heritage_documents                  │
│ category        │ Text │ heritage                            │
│ title           │ Text │ Vietnamese Heritage Database        │
│ description     │ Text │ UNESCO heritage sites in Vietnam    │
└─────────────────┴──────┴─────────────────────────────────────┘
```

### Step 4: Send Request

Nhấn **Send** và đợi response

**Expected Response (Success):**

```json
{
  "success": true,
  "message": "Document uploaded and processed successfully",
  "data": {
    "collection": "heritage_documents",
    "chunksCreated": 25,
    "metadata": {
      "filename": "heritage_documents_prepared.txt",
      "uploadedBy": "admin",
      "category": "heritage",
      "title": "Vietnamese Heritage Database"
    }
  }
}
```

---

## 🚀 Cách 2: Upload Text (Direct)

### Step 1: Tạo request mới

- **Method**: `POST`
- **URL**: `http://localhost:3000/api/v1/rag/upload-text`

### Step 2: Headers

```
Content-Type: application/json
```

### Step 3: Body (Raw JSON)

```json
{
  "text": "Heritage Site: Ho Dynasty Citadel\n\nDescription:\nHo Dynasty Citadel, located in district Vinh Loc, province Thanh Hoa, is a massive and unique stone structure, built in 1397 under the reign Ho Dynasty. Not only is it a historical relic, Ho Dynasty Citadel is also a cultural icon, a demonstration of the remarkable creativity and construction techniques of the ancient Vietnamese. The relic was designated as a World Cultural Heritage by UNESCO in 2011.\n\nLocation: District Vinh Loc, province Thanh Hoa\n\nCoordinates: 20°8′49″B, 105°36′17″Đ",
  "metadata": {
    "title": "Ho Dynasty Citadel",
    "category": "unesco_heritage",
    "location": "Thanh Hoa"
  },
  "collectionName": "heritage_documents"
}
```

### Step 4: Send Request

**Expected Response (Success):**

```json
{
  "success": true,
  "message": "Text uploaded and processed successfully",
  "data": {
    "collection": "heritage_documents",
    "chunksCreated": 3,
    "metadata": {
      "title": "Ho Dynasty Citadel",
      "category": "unesco_heritage",
      "uploadedBy": "admin"
    }
  }
}
```

---

## 🔍 Verify Upload

### Check Collection Info

**Request:**

```
GET http://localhost:3000/api/v1/rag/collection/heritage_documents/info
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "name": "heritage_documents",
    "count": 75,
    "metadata": {...}
  }
}
```

### List All Collections

**Request:**

```
GET http://localhost:3000/api/v1/rag/collections
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "count": 1,
    "collections": [
      {
        "name": "heritage_documents",
        "id": "..."
      }
    ]
  }
}
```

---

## 🧪 Test Query (After Upload)

### Step 1: Tạo query request

- **Method**: `POST`
- **URL**: `http://localhost:3000/api/v1/rag/query`

### Step 2: Headers

```
Content-Type: application/json
```

### Step 3: Body (Raw JSON)

```json
{
  "question": "Where is the Ho Dynasty Citadel located?",
  "topK": 5,
  "collectionName": "heritage_documents"
}
```

### Step 4: Send Request

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "question": "Where is the Ho Dynasty Citadel located?",
    "answer": "The Ho Dynasty Citadel is located in Vinh Loc district, Thanh Hoa province. It was built in 1397 and designated as a World Cultural Heritage by UNESCO in 2011.",
    "sources": [
      {
        "content": "Heritage Site: Ho Dynasty Citadel\n\nDescription:\nHo Dynasty Citadel, located in district Vinh Loc...",
        "metadata": {
          "title": "Ho Dynasty Citadel",
          "category": "unesco_heritage"
        },
        "relevance_score": 0.85
      }
    ],
    "context_used": "Heritage Site: Ho Dynasty Citadel..."
  }
}
```

---

## 🔄 Upload Nhiều Files (Batch Upload)

### Request Setup

- **Method**: `POST`
- **URL**: `http://localhost:3000/api/v1/rag/upload-batch`

### Body (form-data)

```
┌─────────────────┬──────┬──────────────────────────┐
│ Key             │ Type │ Value                    │
├─────────────────┼──────┼──────────────────────────┤
│ files           │ File │ heritage_part1.txt       │
│ files           │ File │ heritage_part2.txt       │
│ files           │ File │ heritage_part3.txt       │
│ collectionName  │ Text │ heritage_documents       │
└─────────────────┴──────┴──────────────────────────┘
```

**Note**: Chọn cùng một key `files` nhiều lần để upload nhiều files

---

## 🧹 Delete Collection (Clean Up)

**⚠️ Cẩn thận: Sẽ xóa toàn bộ documents trong collection!**

### Request

- **Method**: `DELETE`
- **URL**: `http://localhost:3000/api/v1/rag/collection/heritage_documents`

### Expected Response

```json
{
  "success": true,
  "message": "Collection 'heritage_documents' deleted successfully"
}
```

---

## 📊 Workflow Hoàn Chỉnh

```
1. Convert JSON → Text
   npx babel-node src/scripts/prepare-heritage-text.js

2. Upload via Postman
   POST /api/v1/rag/upload
   (form-data: file = heritage_documents_prepared.txt)

3. Verify Upload
   GET /api/v1/rag/collection/heritage_documents/info

4. Test Query
   POST /api/v1/rag/query
   (JSON: {"question": "Where is Ho Dynasty Citadel?"})

5. Run Benchmark
   npm run benchmark
```

---

## 🐛 Troubleshooting

### Error: "No file uploaded"

- **Cause**: Không chọn file trong Postman
- **Fix**: Đảm bảo key name là `file` (không phải `files`), type là **File**

### Error: "Collection does not exist"

- **Cause**: Chưa upload documents
- **Fix**: Upload documents trước khi query

### Error: "Chroma connection refused"

- **Cause**: Chroma DB chưa chạy
- **Fix**: `docker run -p 8000:8000 chromadb/chroma`

### Error: "Naver API failed"

- **Cause**: API keys chưa config hoặc sai
- **Fix**: Check file `.env` hoặc dùng mock mode

---

## 📚 Additional Resources

- **RAG API Documentation**: Xem `ragController.js`
- **Benchmark Guide**: Xem `BENCHMARK_GUIDE.md`
- **Quick Start**: Xem `BENCHMARK_QUICKSTART.md`

---

**🎉 Upload thành công! Giờ bạn có thể chạy benchmark:**

```bash
npm run benchmark
```
