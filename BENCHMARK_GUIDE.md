# 📊 RAG Benchmark System - Hướng Dẫn Sử Dụng

## 🎯 Tổng Quan

Hệ thống benchmark RAG giúp đánh giá chất lượng của hệ thống Retrieval-Augmented Generation thông qua các metrics:

- **BLEU**: Đo độ chính xác n-gram với ground truth
- **ROUGE-L**: Đo độ tương đồng dựa trên Longest Common Subsequence
- **Cosine Similarity**: Đo độ tương tự ngữ nghĩa (TF-IDF và Semantic Embedding)

---

## 📁 Cấu Trúc File

```
heritage-naver-api/
├── benchmark_data.json              # Dữ liệu test cases (input)
├── benchmark_results.json           # Kết quả benchmark (output)
│
└── src/
    └── benchmark/
        ├── runBenchmark.js          # Script chính - Điều phối toàn bộ pipeline
        ├── ragBenchmark.js          # RAG pipeline - Retrieve + Generate + Evaluate
        ├── metrics.js               # Tính toán metrics (BLEU, ROUGE-L, Cosine)
        └── analyzer.js              # Phân tích và báo cáo kết quả
```

### 📄 Chi Tiết Chức Năng Từng File

#### 1️⃣ `benchmark_data.json` (Input)

**Mục đích**: Chứa test cases để đánh giá RAG

**Cấu trúc**:

```json
[
  {
    "id": "q1",
    "question": "Câu hỏi về di sản văn hóa",
    "ground_truth": "Câu trả lời chuẩn (reference answer)",
    "related_docs": ["doc_id_1", "doc_id_2"],
    "expected_context": "Ngữ cảnh mong đợi hệ thống retrieve được"
  }
]
```

**Vai trò**: Cung cấp questions + ground truth để so sánh với câu trả lời sinh ra từ RAG

---

#### 2️⃣ `metrics.js` (Core Calculation)

**Mục đích**: Tính toán các metrics đánh giá

**Functions chính**:

- `calculateBLEU(candidate, reference)`: Tính BLEU score (n-gram precision với brevity penalty)
- `calculateROUGEL(candidate, reference)`: Tính ROUGE-L score (LCS-based F1)
- `calculateCosineSimilarity(text1, text2)`: Tính Cosine similarity (TF-IDF vectors)
- `calculateSemanticSimilarity(text1, text2, embeddings)`: Cosine similarity trên embeddings
- `evaluateAnswer(generated, groundTruth, options)`: Tổng hợp tất cả metrics

**Input**: Generated answer + Ground truth answer
**Output**: Object chứa BLEU, ROUGE-L, Cosine, Semantic scores

---

#### 3️⃣ `ragBenchmark.js` (RAG Pipeline)

**Mục đích**: Thực thi RAG pipeline và đánh giá kết quả

**Functions chính**:

- `retrieveContext(question, collectionName, topK)`: Query Chroma DB để lấy context
  - Input: Question string, collection name, số documents cần retrieve
  - Output: Array of retrieved documents với content, metadata, distance
- `generateAnswer(question, context)`: Gọi Naver Chat API để sinh câu trả lời
  - Input: Question + retrieved context
  - Output: Generated answer string
- `benchmarkSingleQuestion(testCase, options)`: Pipeline hoàn chỉnh cho 1 question
  - Steps: Retrieve → Generate → Evaluate → Return result với metrics
- `benchmarkDataset(testCases, options)`: Chạy benchmark cho toàn bộ dataset
  - Input: Array of test cases
  - Output: Array of results với metrics cho từng question

**Data Flow**:

```
Question → retrieveContext() → Retrieved Docs
                                       ↓
Question + Context → generateAnswer() → Generated Answer
                                       ↓
Generated + Ground Truth → evaluateAnswer() → Metrics
```

---

#### 4️⃣ `analyzer.js` (Result Analysis)

**Mục đích**: Phân tích kết quả và tạo báo cáo chi tiết

**Functions chính**:

- `analyzeSummary(results)`: Tính toán thống kê tổng quan
  - Averages của tất cả metrics
  - Quality distribution (Excellent/Good/Fair/Poor/Very Poor)
  - Execution time statistics
- `printSummary(results)`: In ra tóm tắt kết quả với emoji indicators
- `printDetailedResults(results)`: In bảng ASCII chi tiết từng question
- `printWorstPerformers(results, topN)`: Hiển thị các câu hỏi có điểm thấp nhất
- `generateSuggestions(results)`: Đưa ra gợi ý cải thiện
  - Retrieval issues (context không đủ, không liên quan)
  - Generation issues (câu trả lời ngắn, không khớp ground truth)
  - Performance issues (slow execution)
- `generateFullReport(results)`: Tạo báo cáo đầy đủ (gọi tất cả functions trên)

**Output**: Console logs + exported JSON với metadata

---

#### 5️⃣ `runBenchmark.js` (Main Orchestrator)

**Mục đích**: Điều phối toàn bộ pipeline benchmark

**Workflow**:

```
1. Load benchmark_data.json
2. Check Chroma collection status
3. Run benchmarkDataset() từ ragBenchmark.js
4. Generate report bằng analyzer.js
5. Save results to benchmark_results.json
```

**CLI Options**:

```bash
--input <file>        # Input JSON file (default: benchmark_data.json)
--output <file>       # Output JSON file (default: benchmark_results.json)
--collection <name>   # Chroma collection name (default: heritage_documents)
--topk <number>       # Number of docs to retrieve (default: 5)
--mock                # Mock mode (không gọi API thật)
--help                # Show help
```

---

## 🔄 Data Flow Pipeline

### Bước 1: Chuẩn Bị Dữ Liệu

```
benchmark_data.json → runBenchmark.js (loadBenchmarkData)
```

### Bước 2: Kiểm Tra Collection

```
runBenchmark.js → ragBenchmark.checkCollectionStatus() → Chroma DB
```

### Bước 3: Thực Thi RAG Pipeline (Mỗi Test Case)

```
Test Case (question, ground_truth)
    ↓
ragBenchmark.benchmarkSingleQuestion()
    ├─→ retrieveContext()
    │       └─→ Chroma DB query → Retrieved Documents
    │
    ├─→ generateAnswer(question, context)
    │       └─→ Naver Chat API → Generated Answer
    │
    └─→ metrics.evaluateAnswer(generated, ground_truth)
            └─→ BLEU, ROUGE-L, Cosine, Semantic scores
    ↓
Result Object {
  id, question, ground_truth, generated_answer,
  retrieved_context, metrics, execution_time
}
```

### Bước 4: Phân Tích Kết Quả

```
Array of Results → analyzer.js
    ├─→ analyzeSummary() → Statistics
    ├─→ printSummary() → Console output
    ├─→ printDetailedResults() → ASCII table
    ├─→ printWorstPerformers() → Low score analysis
    └─→ generateSuggestions() → Improvement recommendations
```

### Bước 5: Lưu Kết Quả

```
Results + Metadata → exportResults() → benchmark_results.json
```

---

## 🚀 Hướng Dẫn Chạy

### Yêu Cầu Tiên Quyết

1. **Chroma DB đang chạy**:

```bash
docker run -p 8000:8000 chromadb/chroma
```

2. **Đã upload documents vào collection**:

```bash
# Sử dụng API endpoint để upload
POST http://localhost:3000/api/v1/rag/upload
Content-Type: multipart/form-data

{
  "files": [documents],
  "collectionName": "heritage_documents"
}
```

3. **Đã config .env với Naver API keys**:

```env
NAVER_EMBEDDING_API_URL=https://clovastudio.stream.ntruss.com/testapp/v1/api-tools/embedding/clir-emb-dolphin/04e3d63176554bbeb55d0f72f2b5e96a
NAVER_EMBEDDING_API_KEY=your_embedding_key

NAVER_CHAT_COMPLETION_API_URL=https://clovastudio.stream.ntruss.com/testapp/v1/chat-completions/HCX-DASH-001
NAVER_CHAT_COMPLETION_API_KEY=your_chat_key
NAVER_CHAT_APIGW_KEY=your_apigw_key
NAVER_CHAT_REQUEST_ID=your_request_id
```

---

### Vị Trí File benchmark_data.json

**Đặt file ở thư mục gốc của project** (cùng cấp với package.json):

```
heritage-naver-api/
├── benchmark_data.json  ← ĐÂY
├── package.json
├── src/
└── ...
```

Hoặc bạn có thể đặt ở bất kỳ đâu và chỉ định đường dẫn với `--input`:

```bash
npm run benchmark -- --input /path/to/my_data.json
```

---

### Các Lệnh Chạy

#### 1. Chạy Benchmark Cơ Bản (Mặc Định)

```bash
npm run benchmark
```

Hoặc:

```bash
npx babel-node src/benchmark/runBenchmark.js
```

**Mặc định**:

- Input: `benchmark_data.json` (thư mục gốc)
- Output: `benchmark_results.json` (thư mục gốc)
- Collection: `heritage_documents`
- Top-K: 5 documents
- Mode: Real API calls

---

#### 2. Chạy Với Custom Input/Output Files

```bash
npm run benchmark -- --input my_test_data.json --output my_results.json
```

---

#### 3. Chạy Với Collection Khác

```bash
npm run benchmark -- --collection my_custom_collection --topk 10
```

---

#### 4. Chạy Mock Mode (Không Gọi API)

Hữu ích khi:

- Chưa có Naver API keys
- Collection chưa có documents
- Muốn test logic mà không tốn API quota

```bash
npm run benchmark -- --mock
```

---

#### 5. Xem Hướng Dẫn

```bash
npm run benchmark -- --help
```

---

### Thêm Script vào package.json (Nếu Chưa Có)

Mở file `package.json` và thêm vào phần `scripts`:

```json
{
  "scripts": {
    "benchmark": "babel-node src/benchmark/runBenchmark.js",
    "benchmark:mock": "babel-node src/benchmark/runBenchmark.js --mock"
  }
}
```

---

## 📊 Output Mẫu

### Console Output

```
================================================================================
🚀 RAG BENCHMARK SYSTEM
================================================================================

📋 Configuration:
   Input File: benchmark_data.json
   Output File: benchmark_results.json
   Collection: heritage_documents
   Top-K: 5
   Mock Mode: No (using real API)
================================================================================

🔍 Checking Chroma collection status...
✅ Collection "heritage_documents" found with 150 documents

📂 Loading benchmark data from: benchmark_data.json
✅ Loaded 10 test cases

🔄 Running Benchmark...
Progress: ⬛⬛⬛⬜⬜⬜⬜⬜⬜⬜ 30% (3/10) [Elapsed: 5.2s | ETA: 12.1s]

================================================================================
📊 BENCHMARK SUMMARY
================================================================================

Overall Metrics:
  BLEU Score:              0.6234 🟢
  ROUGE-L Score:           0.7128 🟢
  Cosine Similarity:       0.6891 🟢
  Semantic Similarity:     0.7456 🟢
  Average Execution Time:  1.8s

Quality Distribution:
  🟢 Excellent (≥0.8): 3 (30%)
  🟡 Good (0.6-0.8):   5 (50%)
  🟠 Fair (0.4-0.6):   2 (20%)
  🔴 Poor (<0.4):      0 (0%)

================================================================================
📋 DETAILED RESULTS
================================================================================

┌────┬────────────────────────────────┬──────┬─────────┬────────┬──────────┐
│ ID │ Question (truncated)           │ BLEU │ ROUGE-L │ Cosine │ Semantic │
├────┼────────────────────────────────┼──────┼─────────┼────────┼──────────┤
│ q1 │ Nhã nhạc cung đình Huế là...  │ 0.75 │ 0.82    │ 0.78   │ 0.85     │
│ q2 │ Di sản Vịnh Hạ Long được...   │ 0.68 │ 0.71    │ 0.65   │ 0.73     │
│ q3 │ Hát xoan có nguồn gốc từ...   │ 0.55 │ 0.64    │ 0.61   │ 0.68     │
└────┴────────────────────────────────┴──────┴─────────┴────────┴──────────┘

================================================================================
⚠️  WORST PERFORMING QUESTIONS
================================================================================

❌ Question q5 (Average: 0.42)
   "Nghệ thuật Đờn ca tài tử Nam Bộ có đặc điểm gì?"

   Issues:
   - ⚠️  Retrieved context may not be highly relevant (cosine < 0.5)
   - ⚠️  Generated answer is too short (< 50 chars)
   - ⚠️  Low semantic similarity (< 0.5)

   Metrics:
   - BLEU: 0.35 🔴
   - ROUGE-L: 0.48 🟠
   - Cosine: 0.44 🟠
   - Semantic: 0.41 🔴

================================================================================
💡 IMPROVEMENT SUGGESTIONS
================================================================================

🔍 Retrieval Issues (2 questions):
   - Consider using better embedding models
   - Increase topK parameter from 5 to 10
   - Review document chunking strategy
   - Affected questions: q5, q8

🤖 Generation Issues (3 questions):
   - Improve prompt engineering for Naver Chat API
   - Add more context to generation phase
   - Review ground truth quality
   - Affected questions: q3, q5, q7

📊 Overall Recommendations:
   ✓ Average score is Good (0.62), but has room for improvement
   ✓ Focus on questions with cosine similarity < 0.5
   ✓ Consider fine-tuning retrieval parameters

💾 Saving results to: benchmark_results.json
✅ Results saved successfully!

================================================================================
🎉 BENCHMARK COMPLETED SUCCESSFULLY!
================================================================================

📊 Summary:
   Total Questions: 10
   Successful: 10
   Failed: 0

📁 Output files:
   Results: benchmark_results.json
```

---

### JSON Output (benchmark_results.json)

```json
{
  "results": [
    {
      "id": "q1",
      "question": "Nhã nhạc cung đình Huế là di sản văn hóa phi vật thể nào của Việt Nam?",
      "ground_truth": "Nhã nhạc cung đình Huế là di sản văn hóa phi vật thể được UNESCO công nhận năm 2003...",
      "generated_answer": "Nhã nhạc cung đình Huế được UNESCO công nhận là Di sản văn hóa phi vật thể đại diện của nhân loại vào năm 2003...",
      "retrieved_context": [
        {
          "content": "Nhã nhạc cung đình Huế là hệ thống âm nhạc cung đình...",
          "metadata": {
            "doc_id": "heritage_001",
            "title": "Nhã nhạc cung đình Huế"
          },
          "distance": 0.15
        }
      ],
      "metrics": {
        "bleu": 0.7523,
        "rougeL": 0.8234,
        "cosine": 0.7812,
        "semantic": 0.8456
      },
      "execution_time": 1.823,
      "timestamp": "2024-11-10T10:30:45.123Z"
    }
  ],
  "metadata": {
    "total_questions": 10,
    "successful": 10,
    "failed": 0,
    "average_metrics": {
      "bleu": 0.6234,
      "rougeL": 0.7128,
      "cosine": 0.6891,
      "semantic": 0.7456
    },
    "config": {
      "collection": "heritage_documents",
      "topK": 5,
      "mockMode": false
    },
    "timestamp": "2024-11-10T10:30:50.456Z",
    "export_path": "benchmark_results.json"
  }
}
```

---

## 🔧 Troubleshooting

### Lỗi: "Collection does not exist"

**Nguyên nhân**: Chưa upload documents vào Chroma
**Giải pháp**:

1. Chạy lại với `--mock` để test logic
2. Hoặc upload documents qua API endpoint `/api/v1/rag/upload`

### Lỗi: "Naver API connection failed"

**Nguyên nhân**: API keys chưa được config hoặc sai
**Giải pháp**:

1. Kiểm tra file `.env`
2. Chạy với `--mock` nếu chưa có API keys

### Lỗi: "Cannot find module chromadb"

**Nguyên nhân**: Package chromadb chưa được cài
**Giải pháp**:

```bash
npm install chromadb
```

### Lỗi: "Chroma DB connection refused"

**Nguyên nhân**: Chroma DB chưa chạy
**Giải pháp**:

```bash
docker run -p 8000:8000 chromadb/chroma
```

---

## 📈 Giải Thích Metrics

### BLEU (Bilingual Evaluation Understudy)

- **Range**: 0.0 - 1.0 (càng cao càng tốt)
- **Ý nghĩa**: Đo độ chính xác của n-grams (1-gram, 2-gram, 3-gram, 4-gram)
- **Áp dụng**: So sánh từng từ và cụm từ giữa generated answer và ground truth
- **Threshold**:
  - ≥ 0.8: Excellent
  - 0.6-0.8: Good
  - 0.4-0.6: Fair
  - < 0.4: Poor

### ROUGE-L (Recall-Oriented Understudy for Gisting Evaluation - Longest Common Subsequence)

- **Range**: 0.0 - 1.0 (càng cao càng tốt)
- **Ý nghĩa**: Đo độ tương đồng dựa trên chuỗi con chung dài nhất
- **Áp dụng**: Đánh giá cấu trúc và thứ tự từ
- **Threshold**: Tương tự BLEU

### Cosine Similarity (TF-IDF)

- **Range**: 0.0 - 1.0 (càng cao càng tốt)
- **Ý nghĩa**: Đo độ tương tự về mặt từ vựng (TF-IDF vectors)
- **Áp dụng**: Đánh giá nội dung và từ khóa quan trọng
- **Threshold**: Tương tự BLEU

### Semantic Similarity (Embedding-based)

- **Range**: 0.0 - 1.0 (càng cao càng tốt)
- **Ý nghĩa**: Đo độ tương tự về mặt ngữ nghĩa (embedding vectors)
- **Áp dụng**: Đánh giá ý nghĩa tổng thể, không phụ thuộc từ vựng cụ thể
- **Threshold**: Tương tự BLEU

---

## 🎯 Best Practices

1. **Tạo test cases chất lượng**:

   - Ground truth phải chính xác và đầy đủ
   - Questions nên đa dạng (easy, medium, hard)
   - Cover nhiều topics khác nhau

2. **Tune parameters**:

   - Bắt đầu với `topK=5`, tăng lên nếu retrieval kém
   - Monitor execution time vs quality tradeoff

3. **Phân tích kết quả**:

   - Focus vào worst performers để cải thiện
   - Xem suggestions để biết nơi cần optimize
   - Compare metrics giữa các lần chạy

4. **Iterate và improve**:
   - Chạy benchmark thường xuyên sau khi thay đổi code
   - Track metrics theo thời gian
   - A/B test giữa các chiến lược khác nhau

---

## 📚 Tài Liệu Tham Khảo

- **BLEU Paper**: Papineni et al. (2002) "BLEU: a Method for Automatic Evaluation of Machine Translation"
- **ROUGE Paper**: Lin (2004) "ROUGE: A Package for Automatic Evaluation of Summaries"
- **Chroma DB Docs**: https://docs.trychroma.com/
- **Naver Cloud AI**: https://www.ncloud.com/product/aiService/clovaStudio

---

## ✉️ Support

Nếu gặp vấn đề, hãy kiểm tra:

1. Logs trong console output
2. File `benchmark_results.json` để xem chi tiết errors
3. Network connectivity đến Chroma DB và Naver API

---

**Chúc bạn benchmark thành công! 🚀**
