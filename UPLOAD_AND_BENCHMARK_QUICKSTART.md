# 🚀 Quick Guide: Upload Heritage Data & Run Benchmark

## ⚡ 3 Bước Nhanh

### 1️⃣ Convert JSON → Text

```bash
npm run prepare-heritage
```

**Output**: `heritage_documents_prepared.txt`

### 2️⃣ Upload bằng Postman

**Request:**

- Method: `POST`
- URL: `http://localhost:3000/api/v1/rag/upload`
- Body: `form-data`

**Fields:**
| Key | Type | Value |
|-----|------|-------|
| `file` | File | Chọn file `heritage_documents_prepared.txt` |
| `collectionName` | Text | `heritage_documents` |

### 3️⃣ Run Benchmark

```bash
npm run benchmark
```

---

## 📊 Chi Tiết

### Yêu Cầu Tiên Quyết

```bash
# Terminal 1: Chroma DB
docker run -p 8000:8000 chromadb/chroma

# Terminal 2: Backend
npm run dev
```

### Convert Dataset

```bash
npm run prepare-heritage
```

File input: `History_Heritage_Database.HistoryHeritageEn.json`  
File output: `heritage_documents_prepared.txt`

### Upload Steps (Postman)

1. **Open Postman**
2. **New Request**: `POST http://localhost:3000/api/v1/rag/upload`
3. **Body tab** → chọn `form-data`
4. **Add fields**:
   - `file` (Type: **File**) → chọn `heritage_documents_prepared.txt`
   - `collectionName` (Text) → `heritage_documents`
5. **Send**

**Success Response:**

```json
{
  "success": true,
  "message": "Document uploaded and processed successfully",
  "data": {
    "collection": "heritage_documents",
    "chunksCreated": 25
  }
}
```

### Verify Upload

```bash
# Request
GET http://localhost:3000/api/v1/rag/collection/heritage_documents/info

# Expected Response
{
  "success": true,
  "data": {
    "name": "heritage_documents",
    "count": 75
  }
}
```

### Test Query (Optional)

```bash
# Request
POST http://localhost:3000/api/v1/rag/query
Content-Type: application/json

{
  "question": "Where is the Ho Dynasty Citadel located?",
  "topK": 5,
  "collectionName": "heritage_documents"
}
```

### Run Benchmark

```bash
# Real API (cần Naver keys trong .env)
npm run benchmark

# Mock mode (không cần API keys)
npm run benchmark:mock
```

**Output:**

- Console: Detailed report với metrics, suggestions
- File: `benchmark_results.json`

---

## 📝 Thay Đổi Đã Thực Hiện

### ✅ Updated Files

1. **`benchmark_data.json`** ✨ NEW

   - Chuyển 10 questions sang tiếng Anh
   - Dựa trên dataset `History_Heritage_Database.HistoryHeritageEn.json`
   - Ground truth về Ho Dynasty Citadel, Thang Long Citadel

2. **`src/benchmark/ragBenchmark.js`** ✏️ UPDATED

   - System prompt: English version
   - User prompt: English version
   - Mock answers: English version

3. **`src/scripts/prepare-heritage-text.js`** ✨ NEW

   - Convert JSON → text chunks
   - Extract name, description, location, coordinates, tags
   - Output: `heritage_documents_prepared.txt`

4. **`POSTMAN_UPLOAD_GUIDE.md`** ✨ NEW

   - Hướng dẫn chi tiết upload bằng Postman
   - Upload file & upload text
   - Batch upload, verify, query, delete collection

5. **`package.json`** ✏️ UPDATED
   - Added script: `"prepare-heritage": "babel-node -r dotenv/config src/scripts/prepare-heritage-text.js"`

---

## 🎯 Workflow Hoàn Chỉnh

```
┌─────────────────────────────────────────────────────────┐
│ 1. Convert JSON Dataset                                 │
│    npm run prepare-heritage                             │
│    → heritage_documents_prepared.txt                    │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│ 2. Upload via Postman                                   │
│    POST /api/v1/rag/upload                              │
│    Body: form-data (file = heritage_documents_...)      │
│    → Documents chunked, embedded, saved to Chroma       │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│ 3. Verify Collection                                    │
│    GET /api/v1/rag/collection/heritage_documents/info   │
│    → Check count, metadata                              │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│ 4. Run Benchmark                                        │
│    npm run benchmark                                    │
│    → Retrieve + Generate + Evaluate                     │
│    → benchmark_results.json                             │
└─────────────────────────────────────────────────────────┘
```

---

## 📚 Documentation

- **Full Upload Guide**: `POSTMAN_UPLOAD_GUIDE.md` (detailed)
- **Benchmark Guide**: `BENCHMARK_GUIDE.md` (metrics, data flow)
- **Quick Start**: `BENCHMARK_QUICKSTART.md` (3-step guide)

---

## 🐛 Common Issues

### Error: "No file uploaded"

→ Ensure key name is `file` (not `files`), type is **File**

### Error: "Collection does not exist"

→ Upload documents first via Postman

### Error: "Chroma connection refused"

→ Start Chroma: `docker run -p 8000:8000 chromadb/chroma`

---

## 🎉 Tóm Tắt

**Dataset**: Tiếng Anh (English) ✅  
**Benchmark Questions**: Tiếng Anh (10 questions) ✅  
**Prompts**: Tiếng Anh ✅  
**Upload Method**: Postman (form-data) ✅  
**Output**: `benchmark_results.json` với metrics (BLEU, ROUGE-L, Cosine, Semantic) ✅

**Ready to benchmark! 🚀**
