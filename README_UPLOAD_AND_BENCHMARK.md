# 📤 Heritage Data Upload & Benchmark - Complete Guide

## 🎯 Overview

This guide covers:

1. ✅ Converting JSON dataset to text format
2. ✅ Uploading to Chroma vector database via Postman
3. ✅ Running benchmark evaluation with English dataset
4. ✅ Understanding metrics and results

---

## 🚀 Quick Start (3 Steps)

### Step 1: Convert Dataset

```bash
npm run prepare-heritage
```

**Output**: `heritage_documents_prepared.txt`

### Step 2: Upload via Postman

- **Import Collection**: `Heritage_RAG_API.postman_collection.json`
- **Run Request**: "1. Upload Document (File)"
- **Select File**: `heritage_documents_prepared.txt`

### Step 3: Run Benchmark

```bash
npm run benchmark
```

---

## 📋 Detailed Instructions

### Prerequisites

```bash
# Terminal 1: Start Chroma DB
docker run -p 8000:8000 chromadb/chroma

# Terminal 2: Start Backend
npm run dev
```

### 1️⃣ Convert JSON to Text

**Command:**

```bash
npm run prepare-heritage
```

**What it does:**

- Reads `History_Heritage_Database.HistoryHeritageEn.json`
- Extracts: name, description, location, coordinates, tags
- Converts to text chunks separated by `---`
- Saves to `heritage_documents_prepared.txt`

**Example Output:**

```
Heritage Site: Ho Dynasty Citadel

Description:
Ho Dynasty Citadel, located in district Vinh Loc, province Thanh Hoa...

Location: District Vinh Loc, province Thanh Hoa

Coordinates: 20°8′49″B, 105°36′17″Đ

Tags: unesco, heritage, architecture, history

---

Heritage Site: Central Thang Long Imperial Citadel - Hanoi

Description:
The central area Thang Long Imperial Citadel in Hanoi is an archaeological...
```

### 2️⃣ Upload to Chroma (Postman)

#### Option A: Import Postman Collection (Recommended)

1. **Open Postman**
2. **Import** → Select `Heritage_RAG_API.postman_collection.json`
3. **Run Request**: "1. Upload Document (File)"
4. **Body tab**:
   - `file` field: Click "Select Files" → choose `heritage_documents_prepared.txt`
   - `collectionName`: `heritage_documents`
5. **Send**

#### Option B: Manual Setup

**Request Details:**

```
POST http://localhost:3000/api/v1/rag/upload
Content-Type: multipart/form-data

Body (form-data):
┌─────────────────┬──────┬──────────────────────────────────┐
│ Key             │ Type │ Value                            │
├─────────────────┼──────┼──────────────────────────────────┤
│ file            │ File │ heritage_documents_prepared.txt  │
│ collectionName  │ Text │ heritage_documents               │
│ category        │ Text │ heritage                         │
│ title           │ Text │ Vietnamese Heritage Database     │
└─────────────────┴──────┴──────────────────────────────────┘
```

**Expected Response:**

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
      "category": "heritage"
    }
  }
}
```

### 3️⃣ Verify Upload

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

### 4️⃣ Test Query (Optional)

**Request:**

```
POST http://localhost:3000/api/v1/rag/query
Content-Type: application/json

{
  "question": "Where is the Ho Dynasty Citadel located?",
  "topK": 5,
  "collectionName": "heritage_documents"
}
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "question": "Where is the Ho Dynasty Citadel located?",
    "answer": "The Ho Dynasty Citadel is located in Vinh Loc district, Thanh Hoa province...",
    "sources": [
      {
        "content": "Heritage Site: Ho Dynasty Citadel...",
        "metadata": {...},
        "relevance_score": 0.85
      }
    ]
  }
}
```

### 5️⃣ Run Benchmark

```bash
# With real Naver API (need keys in .env)
npm run benchmark

# Mock mode (no API keys needed)
npm run benchmark:mock
```

**Output:**

- **Console**: Full report with metrics, suggestions
- **File**: `benchmark_results.json`

---

## 📊 What Changed

### ✅ Updated Files

1. **`benchmark_data.json`**

   - ✨ Changed to English (10 questions)
   - Based on `History_Heritage_Database.HistoryHeritageEn.json`
   - Questions about Ho Dynasty Citadel, Thang Long Citadel

2. **`src/benchmark/ragBenchmark.js`**

   - ✏️ System prompt: English
   - ✏️ User prompt: English
   - ✏️ Mock answers: English

3. **`src/scripts/prepare-heritage-text.js`**

   - ✨ NEW: Convert JSON → text chunks
   - Extracts: name, description, location, coordinates, tags

4. **`package.json`**

   - ✨ Added: `"prepare-heritage": "babel-node -r dotenv/config src/scripts/prepare-heritage-text.js"`

5. **`Heritage_RAG_API.postman_collection.json`**
   - ✨ NEW: Ready-to-import Postman collection
   - 8 requests: Upload, Query, List, Delete, Health

---

## 📚 Documentation Files

| File                                       | Description                          |
| ------------------------------------------ | ------------------------------------ |
| `POSTMAN_UPLOAD_GUIDE.md`                  | Detailed Postman upload instructions |
| `UPLOAD_AND_BENCHMARK_QUICKSTART.md`       | Quick 3-step guide                   |
| `BENCHMARK_GUIDE.md`                       | Full benchmark system documentation  |
| `BENCHMARK_QUICKSTART.md`                  | Quick benchmark reference            |
| `Heritage_RAG_API.postman_collection.json` | Importable Postman collection        |

---

## 🔄 Complete Workflow

```
┌─────────────────────────────────────────────┐
│ 1. JSON Dataset (English)                   │
│    History_Heritage_Database.                │
│    HistoryHeritageEn.json                    │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│ 2. Convert to Text Chunks                   │
│    npm run prepare-heritage                  │
│    → heritage_documents_prepared.txt         │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│ 3. Upload via Postman                       │
│    POST /api/v1/rag/upload                   │
│    → Chunked, Embedded, Saved to Chroma      │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│ 4. Verify Collection                        │
│    GET /api/v1/rag/collection/.../info       │
│    → Check document count                    │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│ 5. Run Benchmark (English)                  │
│    npm run benchmark                         │
│    → BLEU, ROUGE-L, Cosine, Semantic         │
│    → benchmark_results.json                  │
└─────────────────────────────────────────────┘
```

---

## 📈 Benchmark Metrics

| Metric              | What it measures                        | Range     |
| ------------------- | --------------------------------------- | --------- |
| **BLEU**            | N-gram precision (word/phrase accuracy) | 0.0 - 1.0 |
| **ROUGE-L**         | Longest Common Subsequence (structure)  | 0.0 - 1.0 |
| **Cosine (TF-IDF)** | Vocabulary similarity                   | 0.0 - 1.0 |
| **Semantic**        | Embedding-based semantic similarity     | 0.0 - 1.0 |

**Quality Thresholds:**

- 🟢 ≥ 0.8: Excellent
- 🟡 0.6 - 0.8: Good
- 🟠 0.4 - 0.6: Fair
- 🔴 < 0.4: Poor

---

## 🐛 Troubleshooting

### Error: "No file uploaded"

**Cause**: File not selected in Postman  
**Fix**: Ensure key is `file` (not `files`), type is **File**

### Error: "Collection does not exist"

**Cause**: Documents not uploaded yet  
**Fix**: Upload documents via Postman first

### Error: "Chroma connection refused"

**Cause**: Chroma DB not running  
**Fix**: `docker run -p 8000:8000 chromadb/chroma`

### Error: "Naver API failed"

**Cause**: API keys not configured  
**Fix**: Check `.env` file or use `npm run benchmark:mock`

---

## 🎯 Example Benchmark Results

```
================================================================================
🚀 RAG BENCHMARK SYSTEM
================================================================================

📊 BENCHMARK SUMMARY
Overall Metrics:
  BLEU Score:              0.6234 🟢
  ROUGE-L Score:           0.7128 🟢
  Cosine Similarity:       0.6891 🟢
  Semantic Similarity:     0.7456 🟢

Quality Distribution:
  🟢 Excellent (≥0.8): 3 (30%)
  🟡 Good (0.6-0.8):   5 (50%)
  🟠 Fair (0.4-0.6):   2 (20%)

📋 DETAILED RESULTS
┌────┬─────────────────────────────┬──────┬─────────┬────────┐
│ ID │ Question                    │ BLEU │ ROUGE-L │ Cosine │
├────┼─────────────────────────────┼──────┼─────────┼────────┤
│ q1 │ Where is Ho Dynasty...      │ 0.75 │ 0.82    │ 0.78   │
│ q2 │ What is special about...    │ 0.68 │ 0.71    │ 0.65   │
└────┴─────────────────────────────┴──────┴─────────┴────────┘

⚠️  WORST PERFORMING QUESTIONS
💡 IMPROVEMENT SUGGESTIONS

🎉 BENCHMARK COMPLETED SUCCESSFULLY!
```

---

## 📁 Files Summary

**Created Files:**

- ✨ `src/scripts/prepare-heritage-text.js` - JSON to text converter
- ✨ `POSTMAN_UPLOAD_GUIDE.md` - Detailed Postman guide
- ✨ `UPLOAD_AND_BENCHMARK_QUICKSTART.md` - Quick reference
- ✨ `Heritage_RAG_API.postman_collection.json` - Postman collection
- ✨ `README_UPLOAD_AND_BENCHMARK.md` - This file

**Updated Files:**

- ✏️ `benchmark_data.json` - English questions
- ✏️ `src/benchmark/ragBenchmark.js` - English prompts
- ✏️ `package.json` - Added `prepare-heritage` script

---

## 🎉 Ready to Go!

**Language**: English ✅  
**Dataset**: `History_Heritage_Database.HistoryHeritageEn.json` ✅  
**Benchmark**: 10 English questions ✅  
**Upload Method**: Postman (form-data) ✅  
**Metrics**: BLEU, ROUGE-L, Cosine, Semantic ✅

**Run:**

```bash
npm run prepare-heritage  # Convert
# Upload via Postman
npm run benchmark         # Evaluate
```

**Questions?** Check the documentation files listed above!
