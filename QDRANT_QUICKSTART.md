# Quick Start - Qdrant Setup (5 phút) ⚡

## Setup nhanh Qdrant Cloud (FREE)

### Bước 1: Tạo tài khoản (1 phút)

1. Vào https://cloud.qdrant.io
2. Sign up với Google/GitHub
3. Verify email

### Bước 2: Tạo cluster (2 phút)

1. Click **"Create Cluster"**
2. Chọn **Free tier** (1GB storage)
3. Region: **Singapore** hoặc **Tokyo**
4. Tên: `heritage-rag`
5. Click **"Create"** → Đợi 2-3 phút

### Bước 3: Lấy credentials (1 phút)

Sau khi cluster ready:

1. Click vào cluster name
2. Copy **Cluster URL**: `https://xxxxx.qdrant.io:6333`
3. Tab **API Keys** → **Generate** → Copy API key

### Bước 4: Cấu hình .env (30 giây)

Mở file `.env`, thêm:

```env
QDRANT_URL=https://xxxxx.qdrant.io:6333
QDRANT_API_KEY=paste_your_api_key_here
```

### Bước 5: Test connection (30 giây)

```bash
npm run test-qdrant
```

Nếu thấy `✅ Connected successfully!` → DONE! 🎉

---

## Nếu dùng Docker Local

```bash
# Start Qdrant
docker run -d --name qdrant \
  -p 6333:6333 \
  -v $(pwd)/qdrant_storage:/qdrant/storage:z \
  qdrant/qdrant

# Update .env
QDRANT_URL=http://localhost:6333

# Test
npm run test-qdrant
```

---

## Next: Upload data

```bash
# Start server
npm run dev

# Upload documents
npm run prepare-heritage
```

---

## Xem chi tiết

- Full guide: `QDRANT_SETUP.md`
- Migration info: `MIGRATION_SUMMARY.md`
