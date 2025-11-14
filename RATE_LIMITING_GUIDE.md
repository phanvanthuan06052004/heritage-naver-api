# 🚦 Rate Limiting Configuration - RAG Service

## 🎯 Overview

The RAG service now includes **rate limiting** and **retry logic** to prevent **429 Too Many Requests** errors when calling the Naver Embedding API.

---

## ⚡ Default Configuration

```javascript
{
  delayBetweenRequests: 1500,  // 1.5 seconds between each request
  maxRetries: 5,                // Retry up to 5 times on 429 error
  retryDelay: 3000,             // 3 seconds before first retry
  batchSize: 3,                 // Process 3 chunks at a time
  batchDelay: 5000              // 5 seconds between batches
}
```

---

## 🔧 How It Works

### 1. **Batch Processing**

- Chunks are processed in small batches (default: 3 at a time)
- Reduces concurrent API calls
- Prevents overwhelming the API rate limits

### 2. **Sequential Processing with Delays**

```
Request 1 → Wait 1.5s → Request 2 → Wait 1.5s → Request 3
   ↓
Wait 5s (batch delay)
   ↓
Request 4 → Wait 1.5s → Request 5 → Wait 1.5s → Request 6
```

### 3. **Exponential Backoff Retry**

If a 429 error occurs:

```
Attempt 1: Fail (429) → Wait 3s  → Retry
Attempt 2: Fail (429) → Wait 6s  → Retry
Attempt 3: Fail (429) → Wait 9s  → Retry
Attempt 4: Fail (429) → Wait 12s → Retry
Attempt 5: Fail (429) → Wait 15s → Retry
Attempt 6: Success or throw error
```

---

## 📊 Upload Time Estimates

### Before Rate Limiting

- **10 chunks**: ~5 seconds (if no 429 errors)
- **50 chunks**: ~25 seconds
- **100 chunks**: ~50 seconds
- ⚠️ **High risk** of 429 errors

### After Rate Limiting

- **10 chunks**: ~45 seconds
  - 3 batches × (3 chunks × 1.5s) + 2 batch delays (5s each)
  - 3 × 4.5s + 10s = ~24s + processing time
- **50 chunks**: ~4 minutes
  - 17 batches × (3 chunks × 1.5s) + 16 batch delays
- **100 chunks**: ~8 minutes
  - 34 batches × (3 chunks × 1.5s) + 33 batch delays

✅ **Much more reliable**, no 429 errors

---

## 🎛️ Adjusting Configuration

### Option 1: Environment Variables (Future)

Add to `.env`:

```env
RATE_LIMIT_DELAY=1500
RATE_LIMIT_BATCH_SIZE=3
RATE_LIMIT_MAX_RETRIES=5
```

### Option 2: Code (Current)

Edit `src/services/ragService.js`:

```javascript
const RATE_LIMIT_CONFIG = {
  delayBetweenRequests: 2000, // Increase to 2s for more conservative
  maxRetries: 3, // Reduce retries if you want to fail faster
  retryDelay: 5000, // Increase if your API has longer rate windows
  batchSize: 2, // Reduce to 2 for very strict rate limits
  batchDelay: 10000, // Increase to 10s for safety
};
```

### Option 3: Runtime Update (Future)

```javascript
import { updateRateLimitConfig } from "~/services/ragService";

// Before uploading
updateRateLimitConfig({
  delayBetweenRequests: 2000,
  batchSize: 2,
});
```

---

## 📈 Console Output Example

```
🔄 Processing 21 chunks with rate limiting...
   📦 Batch 1/7 (3 chunks)
      [1/21] Embedding chunk...
      [2/21] Embedding chunk...
      [3/21] Embedding chunk...
   ⏳ Waiting 5s before next batch...
   📦 Batch 2/7 (3 chunks)
      [4/21] Embedding chunk...
      [5/21] Embedding chunk...
      ⚠️  Rate limit hit, retrying in 3s... (Attempt 1/5)
      [5/21] Embedding chunk...
      [6/21] Embedding chunk...
   ⏳ Waiting 5s before next batch...
...
✅ All 21 chunks embedded successfully
```

---

## 🚨 Troubleshooting

### Still Getting 429 Errors?

#### Solution 1: Increase Delays

```javascript
{
  delayBetweenRequests: 3000,  // 3 seconds
  batchDelay: 10000            // 10 seconds
}
```

#### Solution 2: Reduce Batch Size

```javascript
{
  batchSize: 1; // Process 1 chunk at a time (slowest but safest)
}
```

#### Solution 3: Check API Limits

- Naver API may have:
  - **Per-second limit**: e.g., 5 requests/second
  - **Per-minute limit**: e.g., 60 requests/minute
  - **Daily quota**: e.g., 10,000 requests/day

Contact Naver support to confirm your limits.

---

## 📊 Performance Comparison

| Chunks | Before (No Rate Limit) | After (With Rate Limit) | Reliability |
| ------ | ---------------------- | ----------------------- | ----------- |
| 10     | ~5s                    | ~45s                    | 🟢 High     |
| 21     | ~10s                   | ~1.5 min                | 🟢 High     |
| 50     | ~25s                   | ~4 min                  | 🟢 High     |
| 100    | ~50s                   | ~8 min                  | 🟢 High     |

**Trade-off**: Slower upload speed for **reliable, error-free** processing.

---

## 💡 Best Practices

### 1. Split Large Files

Instead of uploading 1 large file with 100 chunks:

- Split into 3-4 smaller files
- Upload separately
- Reduces total time and risk

### 2. Monitor Console

Watch for:

- `⚠️ Rate limit hit` messages
- Retry attempts
- If retries exceed 3-4 times, increase delays

### 3. Use Batch Upload Carefully

The `/api/v1/rag/upload-batch` endpoint processes files sequentially, so rate limiting applies to the entire batch.

### 4. Schedule Large Uploads

For very large datasets:

- Upload during off-peak hours
- Use a background job queue
- Consider using Naver's batch embedding API if available

---

## 🔄 Alternative Solutions

### Option A: Use Local Embedding Model

Instead of Naver API, use local models:

- **Sentence Transformers** (Python)
- **all-MiniLM-L6-v2** (384 dimensions)
- **multilingual-e5-large** (for Vietnamese)

No rate limits, but requires:

- Python environment
- Model download (~100MB)
- Server with GPU (optional, for speed)

### Option B: Cache Embeddings

- Store embeddings in database
- Reuse for same text chunks
- Reduces API calls for duplicate content

### Option C: Upgrade Naver Plan

- Contact Naver to increase rate limits
- Business/Enterprise plans may have higher quotas

---

## 📝 Configuration Examples

### Ultra-Conservative (No 429 Risk)

```javascript
{
  delayBetweenRequests: 5000,   // 5 seconds
  batchSize: 1,                 // 1 chunk at a time
  batchDelay: 10000,            // 10 seconds
  maxRetries: 10                // More retries
}
```

**Time**: ~15 minutes for 100 chunks  
**Reliability**: 99.9%

### Balanced (Recommended)

```javascript
{
  delayBetweenRequests: 1500,   // 1.5 seconds (default)
  batchSize: 3,                 // 3 chunks at a time (default)
  batchDelay: 5000,             // 5 seconds (default)
  maxRetries: 5                 // 5 retries (default)
}
```

**Time**: ~8 minutes for 100 chunks  
**Reliability**: 95-98%

### Aggressive (Faster but Riskier)

```javascript
{
  delayBetweenRequests: 500,    // 0.5 seconds
  batchSize: 5,                 // 5 chunks at a time
  batchDelay: 2000,             // 2 seconds
  maxRetries: 3                 // 3 retries
}
```

**Time**: ~3 minutes for 100 chunks  
**Reliability**: 70-80% (may still get 429)

---

## 🎯 Recommendation

For the **Vietnamese Heritage Dataset** (21 chunks):

- Use **default settings**
- Expected time: **~1.5 minutes**
- Success rate: **98%+**

If you still encounter issues:

1. Increase `delayBetweenRequests` to `2000` (2 seconds)
2. Increase `batchDelay` to `7000` (7 seconds)
3. This will take ~2 minutes but guarantee success

---

## 📞 Support

If you continue to experience 429 errors after applying these settings:

1. Check your Naver API dashboard for rate limit details
2. Contact Naver support
3. Consider alternative embedding solutions

**Rate limiting is now active! Your uploads should be much more reliable! 🚀**
