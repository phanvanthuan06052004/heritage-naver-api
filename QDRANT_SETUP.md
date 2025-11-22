# Hướng dẫn Setup Qdrant Vector Database

## Tổng quan

Hệ thống RAG đã được migrate từ **ChromaDB** sang **Qdrant** để:

- ✅ Lưu trữ trên cloud thay vì RAM local
- ✅ Hiệu năng truy vấn nhanh hơn
- ✅ Scalability tốt hơn
- ✅ Hỗ trợ nhiều tính năng nâng cao

## Phương án triển khai

### 1. Qdrant Cloud (Khuyến nghị - Free tier available)

**Ưu điểm:**

- Không tốn RAM máy local
- Managed service, không cần maintain
- Free tier: 1GB storage miễn phí
- High availability & auto-scaling
- HTTPS & API Key authentication

**Các bước setup:**

#### Bước 1: Tạo Qdrant Cloud account

1. Truy cập: https://cloud.qdrant.io/
2. Đăng ký tài khoản miễn phí
3. Verify email

#### Bước 2: Tạo Cluster mới

1. Click **"Create Cluster"**
2. Chọn **Free tier** (1GB storage)
3. Chọn region gần nhất (Singapore hoặc Tokyo cho VN)
4. Đặt tên cluster: `heritage-rag-vectors`
5. Click **"Create"**

#### Bước 3: Lấy thông tin kết nối

Sau khi cluster được tạo (khoảng 2-3 phút), bạn sẽ nhận được:

- **Cluster URL**: `https://xxxxx.qdrant.io:6333`
- **API Key**: Click vào cluster → **API Keys** → Generate new key

#### Bước 4: Cấu hình môi trường

Thêm vào file `.env`:

```env
# Qdrant Cloud Configuration
QDRANT_URL=https://xxxxx.qdrant.io:6333
QDRANT_API_KEY=your_api_key_here
```

### 2. Self-hosted Qdrant (Docker)

**Ưu điểm:**

- Full control
- Không giới hạn storage
- Tốc độ nhanh hơn nếu host local

**Nhược điểm:**

- Vẫn tốn RAM (nhưng tối ưu hơn ChromaDB)
- Cần maintain

#### Setup với Docker:

```bash
# Pull Qdrant image
docker pull qdrant/qdrant

# Run Qdrant container
docker run -p 6333:6333 -p 6334:6334 \
  -v $(pwd)/qdrant_storage:/qdrant/storage:z \
  qdrant/qdrant
```

#### Cấu hình `.env`:

```env
QDRANT_URL=http://localhost:6333
# Không cần API key cho local
```

### 3. Qdrant trên VPS/Cloud Server

Nếu bạn có VPS (AWS, DigitalOcean, etc.):

```bash
# SSH vào server
ssh user@your-server-ip

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Run Qdrant với persistent storage
docker run -d \
  --name qdrant \
  -p 6333:6333 \
  -p 6334:6334 \
  -v /data/qdrant:/qdrant/storage:z \
  --restart unless-stopped \
  qdrant/qdrant
```

#### Cấu hình `.env`:

```env
QDRANT_URL=http://your-server-ip:6333
QDRANT_API_KEY=optional_custom_key
```

## Migration dữ liệu từ ChromaDB

Nếu bạn đã có dữ liệu trong ChromaDB cần migrate:

### Script Migration (Tạo file `migrate-to-qdrant.js`)

```javascript
import { ChromaClient } from "chromadb";
import { QdrantClient } from "@qdrant/js-client-rest";
import { env } from "./src/config/environment.js";

const chromaClient = new ChromaClient({ path: env.CHROMA_URL });
const qdrantClient = new QdrantClient({
  url: env.QDRANT_URL,
  apiKey: env.QDRANT_API_KEY,
});

async function migrateCollection(collectionName) {
  console.log(`🔄 Migrating collection: ${collectionName}`);

  try {
    // 1. Lấy dữ liệu từ ChromaDB
    const chromaCollection = await chromaClient.getCollection({
      name: collectionName,
    });

    const count = await chromaCollection.count();
    console.log(`📊 Total documents: ${count}`);

    // Get all data from Chroma
    const results = await chromaCollection.get({
      limit: count,
      include: ["embeddings", "documents", "metadatas"],
    });

    // 2. Tạo collection trong Qdrant
    const vectorSize = results.embeddings[0].length;
    await qdrantClient.createCollection(collectionName, {
      vectors: {
        size: vectorSize,
        distance: "Cosine",
      },
    });

    // 3. Upload dữ liệu vào Qdrant
    const points = results.ids.map((id, index) => ({
      id: id,
      vector: results.embeddings[index],
      payload: {
        content: results.documents[index],
        ...results.metadatas[index],
      },
    }));

    // Batch upload
    const batchSize = 100;
    for (let i = 0; i < points.length; i += batchSize) {
      const batch = points.slice(i, i + batchSize);
      await qdrantClient.upsert(collectionName, {
        wait: true,
        points: batch,
      });
      console.log(`✅ Migrated ${i + batch.length}/${points.length}`);
    }

    console.log(`✅ Migration completed for ${collectionName}`);
  } catch (error) {
    console.error(`❌ Error migrating ${collectionName}:`, error);
  }
}

// Run migration
migrateCollection("heritage_documents");
```

Chạy migration:

```bash
node migrate-to-qdrant.js
```

## Upload documents mới

Sau khi setup xong, upload documents như bình thường:

```bash
# Prepare documents
npm run prepare-heritage

# Upload sẽ tự động lưu vào Qdrant
curl -X POST http://localhost:3000/api/v1/rag/upload \
  -H "Content-Type: application/json" \
  -d '{"content": "Your document content..."}'
```

## Test kết nối Qdrant

Tạo file test: `test-qdrant.js`

```javascript
import { QdrantClient } from "@qdrant/js-client-rest";
import { env } from "./src/config/environment.js";

const client = new QdrantClient({
  url: env.QDRANT_URL,
  apiKey: env.QDRANT_API_KEY,
});

async function testConnection() {
  try {
    console.log("🔗 Testing Qdrant connection...");
    console.log("URL:", env.QDRANT_URL);

    // List collections
    const collections = await client.getCollections();
    console.log("✅ Connected successfully!");
    console.log("📁 Collections:", collections.collections);

    // Get collection info
    for (const col of collections.collections) {
      const info = await client.getCollection(col.name);
      console.log(`\n📊 Collection: ${col.name}`);
      console.log(`   Points: ${info.points_count}`);
      console.log(`   Vectors: ${info.vectors_count}`);
    }
  } catch (error) {
    console.error("❌ Connection failed:", error.message);
  }
}

testConnection();
```

Chạy test:

```bash
node test-qdrant.js
```

## So sánh ChromaDB vs Qdrant

| Feature                | ChromaDB         | Qdrant                 |
| ---------------------- | ---------------- | ---------------------- |
| Storage                | RAM-based        | Disk + RAM (optimized) |
| Cloud support          | Limited          | Native cloud support   |
| Performance            | Good             | Excellent              |
| Scalability            | Limited          | High                   |
| Free tier              | Self-hosted only | 1GB free on cloud      |
| RAM usage (1M vectors) | ~4GB             | ~200MB (with disk)     |

## Monitoring & Maintenance

### Check collection status

```javascript
import { getCollectionInfo } from "./src/services/ragService.js";

const info = await getCollectionInfo("heritage_documents");
console.log("Collection info:", info);
```

### Qdrant Web UI

- Cloud: `https://cloud.qdrant.io` → Dashboard
- Self-hosted: `http://localhost:6333/dashboard`

### Backup (Cloud)

Qdrant Cloud tự động backup. Để backup manual:

```bash
# Snapshot API
curl -X POST 'https://xxxxx.qdrant.io:6333/collections/heritage_documents/snapshots' \
  -H 'api-key: your_api_key'
```

## Troubleshooting

### Lỗi connection timeout

```env
# Tăng timeout trong code
const client = new QdrantClient({
  url: env.QDRANT_URL,
  apiKey: env.QDRANT_API_KEY,
  timeout: 60000 // 60 seconds
})
```

### Lỗi "Collection already exists"

```javascript
// Delete và tạo lại
await deleteCollection("heritage_documents");
await ensureCollection("heritage_documents");
```

### Performance tuning

```javascript
// Optimize collection config
await qdrantClient.createCollection(collectionName, {
  vectors: {
    size: 1024,
    distance: "Cosine",
  },
  optimizers_config: {
    default_segment_number: 5, // Tăng cho dataset lớn
    indexing_threshold: 20000,
  },
  hnsw_config: {
    m: 16, // Connections per node
    ef_construct: 100, // Quality vs speed tradeoff
  },
});
```

## API Reference

### Các functions đã được migrate:

- `ensureCollection(collectionName, vectorSize)` - Tạo/kiểm tra collection
- `saveToQdrant(chunks, embeddings, collectionName)` - Lưu vectors
- `queryQdrant(embedding, topK, collectionName)` - Search vectors
- `queryRAG(question, topK, collectionName)` - RAG pipeline
- `deleteCollection(collectionName)` - Xóa collection
- `listCollections()` - List tất cả collections
- `getCollectionInfo(collectionName)` - Thông tin chi tiết
- `scrollCollection(collectionName, limit)` - Paginate points

## Next Steps

1. ✅ Setup Qdrant (Cloud hoặc Self-hosted)
2. ✅ Update `.env` với QDRANT_URL và QDRANT_API_KEY
3. ✅ Test connection với `test-qdrant.js`
4. ✅ Migrate data từ ChromaDB (nếu có)
5. ✅ Upload new documents
6. ✅ Test RAG queries

## Support

- Qdrant Documentation: https://qdrant.tech/documentation/
- Qdrant Discord: https://discord.gg/qdrant
- GitHub Issues: https://github.com/qdrant/qdrant/issues
