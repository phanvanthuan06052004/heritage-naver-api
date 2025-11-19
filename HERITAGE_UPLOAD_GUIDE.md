# Upload Heritage với Metadata - Quick Guide

## 🎯 Tổng quan

Hệ thống upload heritage theo chiến lược:

- **Mỗi di tích** → Nhiều chunks (overview, history, architecture...)
- **Mỗi chunk** → Có metadata đầy đủ bao gồm `heritageId`
- **Filter context** → Query theo heritageId cho độ chính xác cao

---

## 📦 1. Upload Heritage lên Qdrant

### Chạy script upload:

```bash
npm run upload-heritage-to-qdrant
```

Script sẽ:

1. Đọc tất cả heritages từ MongoDB collection `HistoryHeritageEn`
2. Mỗi heritage chia thành nhiều chunks:
   - **Overview**: Tên, mô tả, địa điểm
   - **Architecture**: Kiến trúc (nếu có)
   - **History**: Các sự kiện lịch sử (mỗi event 1 chunk)
   - **Festival**: Lễ hội văn hóa (nếu có)
   - **Preservation**: Bảo tồn (nếu có)
3. Upload từng chunk với metadata đầy đủ lên Qdrant

### Metadata structure:

```javascript
{
  // Content
  content: "Tên di tích: Chùa Một Cột\n\nMô tả: ...",

  // Heritage info
  heritageId: "67f3edb13834bd66e6e1c678",
  name: "Chùa Một Cột",
  nameSlug: "chua-mot-cot",

  // Location
  location: "Hà Nội",
  locationSlug: "ha-noi",
  latitude: "21.0368",
  longitude: "105.8342",

  // Tags
  tags: ["di tích lịch sử", "kiến trúc"],
  tagsSlug: ["di-tich-lich-su", "kien-truc"],

  // Stats
  averageRating: "4.5",
  totalReviews: "100",
  totalVisits: "500",
  totalFavorites: "50",

  // Chunk info
  contentType: "overview" | "history" | "architecture" | "festival" | "preservation",
  chunkIndex: 0,
  totalChunks: 5,

  // Type
  documentType: "heritage",
  uploadedAt: "2025-11-17T..."
}
```

---

## 🔍 2. Query RAG với heritageId filter

### API Endpoint:

```
POST http://localhost:8017/api/v1/rag/query
```

### Case 1: User đang xem 1 di tích cụ thể (Có heritageId)

**Request:**

```json
{
  "question": "Chùa này được xây dựng năm nào?",
  "heritageId": "67f3edb13834bd66e6e1c678",
  "topK": 5
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "answer": "Chùa Một Cột được xây dựng vào năm 1049...",
    "sources": [
      {
        "content": "...",
        "metadata": {
          "heritageId": "67f3edb13834bd66e6e1c678",
          "name": "Chùa Một Cột",
          "contentType": "history",
          ...
        },
        "score": 0.95
      }
    ],
    "mode": "rag"
  }
}
```

### Case 2: User hỏi chung (Không có heritageId)

**Request:**

```json
{
  "question": "Các di tích nào ở Hà Nội?",
  "topK": 10
}
```

**Response:** Sẽ search toàn bộ collection, không filter

---

## 💻 3. Frontend Integration

### React/Vue Example:

```javascript
// HeritagePage.jsx
const HeritageDetailPage = () => {
  const { heritageId } = useParams(); // From route
  const [chatMessages, setChatMessages] = useState([]);

  const handleAskQuestion = async (question) => {
    try {
      const response = await fetch("/api/v1/rag/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          heritageId, // ← Pass heritageId để filter context
          topK: 5,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setChatMessages([
          ...chatMessages,
          { role: "user", content: question },
          { role: "assistant", content: data.data.answer },
        ]);
      }
    } catch (error) {
      console.error("RAG query failed:", error);
    }
  };

  return (
    <div>
      <HeritageInfo heritageId={heritageId} />
      <ChatBot onAskQuestion={handleAskQuestion} />
    </div>
  );
};
```

### General Search Page:

```javascript
// SearchPage.jsx
const SearchPage = () => {
  const handleSearch = async (query) => {
    const response = await fetch("/api/v1/rag/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: query,
        // Không có heritageId → Search toàn bộ
        topK: 10,
      }),
    });
    // ...
  };
};
```

---

## 🧪 4. Testing

### Test với Postman/curl:

**Test 1: Query với heritageId (Context-aware)**

```bash
curl -X POST http://localhost:8017/api/v1/rag/query \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Kể về kiến trúc của di tích này",
    "heritageId": "67f3edb13834bd66e6e1c678"
  }'
```

**Test 2: Query không filter (General search)**

```bash
curl -X POST http://localhost:8017/api/v1/rag/query \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Những di tích nào có kiến trúc độc đáo?"
  }'
```

**Test 3: So sánh độ chính xác**

```bash
# Với filter
curl -X POST http://localhost:8017/api/v1/rag/query \
  -d '{"question": "Năm xây dựng", "heritageId": "67f3edb13834bd66e6e1c678"}'

# Không filter (có thể nhầm lẫn với di tích khác)
curl -X POST http://localhost:8017/api/v1/rag/query \
  -d '{"question": "Năm xây dựng"}'
```

---

## 📊 5. Kiểm tra dữ liệu trong Qdrant

### Qdrant Dashboard:

- **Local**: http://localhost:6333/dashboard
- **Cloud**: https://cloud.qdrant.io

### Check collection:

```bash
# List collections
curl http://localhost:6333/collections

# Get collection info
curl http://localhost:6333/collections/heritage_documents

# Scroll points (xem data)
curl -X POST http://localhost:6333/collections/heritage_documents/points/scroll \
  -H "Content-Type: application/json" \
  -d '{"limit": 10, "with_payload": true}'
```

---

## 🎯 Ưu điểm của approach này:

1. **Độ chính xác cao**:

   - User xem "Chùa Một Cột" → Chỉ lấy context về Chùa Một Cột
   - Không bị nhiễu từ các di tích khác

2. **Performance tốt**:

   - Filter trước khi vector search → Nhanh hơn
   - Không cần search toàn bộ collection

3. **Flexible**:

   - Có thể filter theo: heritageId, location, tags, rating...
   - Kết hợp nhiều filters

4. **Traceability**:
   - Biết answer lấy từ chunk nào (contentType, chunkIndex)
   - Có thể highlight source trong UI

---

## 📝 Next Steps:

1. ✅ Đã tạo script upload
2. ✅ Đã update RAG service hỗ trợ filter
3. ✅ Đã update API endpoint
4. ⏭️ Chạy upload: `npm run upload-heritage-to-qdrant`
5. ⏭️ Test API với heritageId
6. ⏭️ Integrate vào Frontend

---

**Tài liệu thêm:**

- Upload script: `src/scripts/upload-heritage-to-qdrant.js`
- RAG service: `src/services/ragService.js`
- Controller: `src/controllers/ragController.js`
