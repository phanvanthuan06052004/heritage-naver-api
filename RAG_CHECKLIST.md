# ✅ RAG System Setup Checklist

## Pre-deployment Checklist

### 1. ⚙️ Installation & Configuration

- [ ] **Install Chroma Vector Database**

  ```bash
  # Option 1: Docker (Recommended)
  docker run -p 8000:8000 chromadb/chroma

  # Option 2: pip
  pip install chromadb && chroma run --host 0.0.0.0 --port 8000
  ```

- [ ] **Get Naver Cloud API Keys**

  - [ ] Visit https://console.ncloud.com/clovastudio
  - [ ] Create or select a project
  - [ ] Get API Key from Settings
  - [ ] Get API Gateway Key from Settings
  - [ ] Note your App ID and Model IDs

- [ ] **Configure Environment Variables**

  - [ ] Copy `.env.example` to `.env`
  - [ ] Set `NAVER_API_KEY`
  - [ ] Set `NAVER_APIGW_API_KEY`
  - [ ] Set `NAVER_EMBEDDING_API_URL` (if different from default)
  - [ ] Set `NAVER_CHAT_API_URL` (if different from default)
  - [ ] Set `CHROMA_URL` (default: http://localhost:8000)

- [ ] **Verify File Structure**
  - [ ] Directory `Uploads/rag-documents/` exists
  - [ ] All RAG files in `src/` are present
  - [ ] Routes are properly imported in `src/routes/v1/index.js`

### 2. 🧪 Testing

- [ ] **Start Services**

  - [ ] Chroma DB is running (check: `curl http://localhost:8000/api/v1/heartbeat`)
  - [ ] Node.js server is running (`npm run dev`)

- [ ] **Health Check**

  ```bash
  curl http://localhost:8017/api/v1/rag/health
  ```

  - [ ] Response shows `"success": true`
  - [ ] `chromaConfigured`: true
  - [ ] `naverApiKeyConfigured`: true

- [ ] **Test Upload**

  ```bash
  curl -X POST http://localhost:8017/api/v1/rag/upload-text \
    -H "Content-Type: application/json" \
    -d '{"text":"Test document content"}'
  ```

  - [ ] Response shows successful upload
  - [ ] Chunks were created
  - [ ] Documents saved to Chroma

- [ ] **Test Query**

  ```bash
  curl -X POST http://localhost:8017/api/v1/rag/query \
    -H "Content-Type: application/json" \
    -d '{"question":"Test question?"}'
  ```

  - [ ] Response contains answer
  - [ ] Mode is either "rag" or "general"
  - [ ] No errors in response

- [ ] **Run Automated Tests**
  ```bash
  npx babel-node src/test/test-rag-system.js
  ```
  - [ ] Health check passes
  - [ ] Upload test passes
  - [ ] Query test passes

### 3. 🔒 Security (Production)

- [ ] **Enable Authentication**

  - [ ] Uncomment auth middleware in `src/routes/v1/ragRoute.js`
  - [ ] Test admin endpoints require authentication
  - [ ] Test query endpoint (decide if public or auth required)

- [ ] **Configure CORS**

  - [ ] Update `src/config/cors.js` if needed
  - [ ] Allow only trusted domains

- [ ] **Add Rate Limiting**

  - [ ] Install rate limiter package if not present
  - [ ] Apply to RAG endpoints
  - [ ] Set appropriate limits

- [ ] **File Upload Security**
  - [ ] Verify file type filtering works
  - [ ] Test file size limits (10MB)
  - [ ] Ensure uploaded files are sanitized

### 4. 📊 Production Readiness

- [ ] **Environment Variables**

  - [ ] `.env` file is NOT committed to git
  - [ ] Production env vars are set in hosting platform
  - [ ] Secrets are securely stored

- [ ] **Monitoring**

  - [ ] Set up error logging (e.g., Sentry)
  - [ ] Configure application monitoring
  - [ ] Set up alerts for API failures

- [ ] **Performance**

  - [ ] Test with realistic document sizes
  - [ ] Verify query response times
  - [ ] Consider implementing caching

- [ ] **Data Management**

  - [ ] Plan for Chroma DB backups
  - [ ] Document collection management procedures
  - [ ] Set up data retention policy

- [ ] **Documentation**
  - [ ] Team is familiar with RAG_QUICKSTART.md
  - [ ] API documentation is accessible
  - [ ] Troubleshooting guide is available

### 5. 🚀 Deployment

- [ ] **Pre-deployment**

  - [ ] All tests pass
  - [ ] Environment variables configured
  - [ ] Chroma DB accessible from production server
  - [ ] Naver API quota is sufficient

- [ ] **Deployment Steps**

  - [ ] Deploy application code
  - [ ] Ensure Chroma DB is running and accessible
  - [ ] Verify environment variables
  - [ ] Run health check

- [ ] **Post-deployment**
  - [ ] Health check endpoint works
  - [ ] Upload test document
  - [ ] Test query functionality
  - [ ] Monitor for errors

### 6. 📚 Documentation Review

- [ ] **Read Documentation**

  - [ ] `RAG_README.md` - Overview
  - [ ] `RAG_QUICKSTART.md` - Setup guide
  - [ ] `RAG_DOCUMENTATION.md` - Technical details
  - [ ] `RAG_FILE_STRUCTURE.md` - Code organization

- [ ] **Understanding**
  - [ ] Understand semantic chunking algorithm
  - [ ] Know how RAG pipeline works
  - [ ] Familiar with dual-mode operation (RAG vs General)
  - [ ] Can troubleshoot common issues

### 7. ✨ Optional Enhancements

- [ ] **Advanced Features**

  - [ ] Add PDF/DOCX support
  - [ ] Implement document versioning
  - [ ] Add analytics/metrics
  - [ ] Create admin dashboard

- [ ] **Optimization**

  - [ ] Implement embedding caching
  - [ ] Add Redis for response caching
  - [ ] Optimize chunk sizes for your use case
  - [ ] Batch embedding requests

- [ ] **User Experience**
  - [ ] Add streaming responses
  - [ ] Implement conversation history
  - [ ] Add source citation links
  - [ ] Create feedback mechanism

## Quick Verification Script

Run this to verify everything is set up:

```bash
#!/bin/bash

echo "🔍 Checking RAG System Setup..."

# Check Chroma
if curl -s http://localhost:8000/api/v1/heartbeat > /dev/null; then
  echo "✅ Chroma DB is running"
else
  echo "❌ Chroma DB is not running"
fi

# Check Node.js server
if curl -s http://localhost:8017/api/v1/status > /dev/null; then
  echo "✅ Node.js server is running"
else
  echo "❌ Node.js server is not running"
fi

# Check RAG health
if curl -s http://localhost:8017/api/v1/rag/health | grep -q "success"; then
  echo "✅ RAG system is healthy"
else
  echo "❌ RAG system is not healthy"
fi

# Check env vars
if [ -f .env ]; then
  if grep -q "NAVER_API_KEY=your_" .env; then
    echo "⚠️  Naver API keys not configured"
  else
    echo "✅ Naver API keys configured"
  fi

  if grep -q "CHROMA_URL" .env; then
    echo "✅ Chroma URL configured"
  else
    echo "⚠️  Chroma URL not configured"
  fi
else
  echo "❌ .env file not found"
fi

echo "✅ Verification complete!"
```

## Common Issues Checklist

### ❌ Cannot connect to Chroma

- [ ] Chroma is running: `docker ps | grep chroma`
- [ ] Port 8000 is accessible
- [ ] CHROMA_URL in .env is correct
- [ ] No firewall blocking port 8000

### ❌ Naver API errors

- [ ] API keys are valid and not expired
- [ ] API endpoints URLs are correct
- [ ] Request format matches Naver API docs
- [ ] API quota not exceeded

### ❌ Upload fails

- [ ] File is text-based format
- [ ] File size under 10MB
- [ ] `Uploads/rag-documents/` directory exists
- [ ] Proper permissions on upload directory

### ❌ Query returns no results

- [ ] Documents have been uploaded
- [ ] Collection name is correct
- [ ] Embeddings were successfully created
- [ ] Chroma DB has data

### ❌ Server errors

- [ ] All dependencies installed: `npm install`
- [ ] No TypeScript/Babel errors
- [ ] Environment variables loaded
- [ ] Check server logs for details

---

## ✅ Final Checklist

Before going live:

- [ ] All items in sections 1-5 are checked
- [ ] Performed end-to-end testing
- [ ] Team trained on system usage
- [ ] Monitoring is active
- [ ] Backup procedures in place
- [ ] Rollback plan prepared
- [ ] Documentation is updated
- [ ] Support contacts identified

**Status:** ******\_\_\_******

**Deployed by:** ******\_\_\_******

**Date:** ******\_\_\_******

---

**🎉 Once all items are checked, your RAG system is ready for production!**
