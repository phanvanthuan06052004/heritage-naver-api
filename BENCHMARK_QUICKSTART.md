# 🚀 RAG Benchmark - Quick Start Guide

## ✅ Hệ Thống Đã Sẵn Sàng!

Benchmark RAG system đã được tạo hoàn chỉnh với các file sau:

```
📁 heritage-naver-api/
├── 📄 benchmark_data.json           # 10 test cases (input)
├── 📄 BENCHMARK_GUIDE.md            # Documentation chi tiết
├── 📄 BENCHMARK_QUICKSTART.md       # Hướng dẫn nhanh này
│
└── src/benchmark/
    ├── runBenchmark.js              # ⭐ Script chính
    ├── ragBenchmark.js              # RAG pipeline
    ├── metrics.js                   # BLEU, ROUGE-L, Cosine
    └── analyzer.js                  # Phân tích kết quả
```

---

## ⚡ Chạy Ngay Trong 3 Bước

### 1️⃣ Khởi động Chroma DB

```bash
docker run -p 8000:8000 chromadb/chroma
```

### 2️⃣ Chạy Benchmark (Mock Mode - không cần API keys)

```bash
npm run benchmark:mock
```

**Hoặc với Real API** (cần config .env):

```bash
npm run benchmark
```

### 3️⃣ Xem Kết Quả

- **Console**: Báo cáo chi tiết hiển thị ngay trên terminal
- **File**: `benchmark_results.json` (tạo tự động)

---

## 📋 Commands Nhanh

| Command                                     | Mô tả                           |
| ------------------------------------------- | ------------------------------- |
| `npm run benchmark`                         | Chạy benchmark với real API     |
| `npm run benchmark:mock`                    | Chạy mock mode (no API calls)   |
| `npm run benchmark -- --help`               | Xem tất cả options              |
| `npm run benchmark -- --input my_data.json` | Dùng file input khác            |
| `npm run benchmark -- --topk 10`            | Retrieve 10 documents thay vì 5 |

---

## 🎯 Ví Dụ Output

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
  🔴 Poor (<0.4):      0 (0%)

⚠️  WORST PERFORMING QUESTIONS
❌ Question q5 (Average: 0.42)
   Issues:
   - ⚠️  Retrieved context not relevant
   - ⚠️  Generated answer too short

💡 IMPROVEMENT SUGGESTIONS
🔍 Retrieval Issues: Increase topK, better embeddings
🤖 Generation Issues: Improve prompt engineering

🎉 BENCHMARK COMPLETED SUCCESSFULLY!
```

---

## 🔧 Requirements

### Đã Có (Built-in)

- ✅ Node.js + npm
- ✅ ChromaDB client package (đã cài: chromadb@3.1.1)
- ✅ Babel transpiler
- ✅ All benchmark modules

### Cần Chuẩn Bị

- 🐳 **Docker** (để chạy Chroma DB)
- 🔑 **Naver API Keys** (optional - có thể dùng mock mode)

---

## 📊 Config Naver API (Optional)

Nếu muốn test với real API, thêm vào `.env`:

```env
# Naver Embedding API
NAVER_EMBEDDING_API_URL=https://clovastudio.stream.ntruss.com/testapp/v1/api-tools/embedding/clir-emb-dolphin/YOUR_ID
NAVER_EMBEDDING_API_KEY=your_embedding_key

# Naver Chat Completion API
NAVER_CHAT_COMPLETION_API_URL=https://clovastudio.stream.ntruss.com/testapp/v1/chat-completions/HCX-DASH-001
NAVER_CHAT_COMPLETION_API_KEY=your_chat_key
NAVER_CHAT_APIGW_KEY=your_apigw_key
NAVER_CHAT_REQUEST_ID=your_request_id

# Chroma DB
CHROMA_URL=http://localhost:8000
```

---

## 📚 Đọc Thêm

- **Chi tiết đầy đủ**: Xem `BENCHMARK_GUIDE.md`

  - Giải thích từng module
  - Data flow pipeline
  - Metrics (BLEU, ROUGE-L, Cosine)
  - Troubleshooting

- **Cấu trúc test data**: Xem `benchmark_data.json`
  - 10 câu hỏi mẫu về di sản văn hóa Việt Nam
  - Format: question, ground_truth, related_docs, expected_context

---

## 🎓 Metrics Giải Thích Ngắn Gọn

| Metric              | Đo gì?                                        | Range     |
| ------------------- | --------------------------------------------- | --------- |
| **BLEU**            | Độ chính xác từng từ/cụm từ (n-gram matching) | 0.0 - 1.0 |
| **ROUGE-L**         | Độ tương đồng cấu trúc câu (LCS-based)        | 0.0 - 1.0 |
| **Cosine (TF-IDF)** | Độ tương tự từ vựng                           | 0.0 - 1.0 |
| **Semantic**        | Độ tương tự ngữ nghĩa (embedding-based)       | 0.0 - 1.0 |

**Threshold**:

- 🟢 ≥ 0.8: Excellent
- 🟡 0.6 - 0.8: Good
- 🟠 0.4 - 0.6: Fair
- 🔴 < 0.4: Poor

---

## 💡 Tips

1. **Lần đầu chạy**: Dùng `--mock` để test logic
2. **Upload documents**: POST `/api/v1/rag/upload` trước khi benchmark thật
3. **Tune parameters**: Thử các giá trị topK khác nhau (5, 10, 15)
4. **Phân tích**: Focus vào "Worst Performers" để cải thiện

---

## 🆘 Troubleshooting

| Lỗi                           | Giải pháp                                                   |
| ----------------------------- | ----------------------------------------------------------- |
| "Collection does not exist"   | Chạy `--mock` hoặc upload documents trước                   |
| "Naver API failed"            | Check `.env` hoặc dùng `--mock`                             |
| "Chroma connection refused"   | Khởi động Docker: `docker run -p 8000:8000 chromadb/chroma` |
| "Cannot find module chromadb" | `npm install chromadb` (thường đã có)                       |

---

**🎉 Ready to benchmark! Chúc bạn đánh giá RAG thành công!**

Có vấn đề? Xem chi tiết trong `BENCHMARK_GUIDE.md`
