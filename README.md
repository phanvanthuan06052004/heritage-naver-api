# Heritage Naver - Backend API

Node.js + Express backend with RAG (Retrieval Augmented Generation) system powered by Naver CLOVA Studio and Qdrant vector database.

## 🚀 Features

### Core Features

- **RESTful API**: Express.js with MongoDB
- **RAG System**: Advanced retrieval augmented generation
  - Naver CLOVA Embedding (1024-dim vectors)
  - Qdrant vector database
  - Naver Reranker for improved relevance
  - Naver HyperCLOVA X for answer generation
- **Real-time Chat**: Socket.io for live discussions
- **Authentication**: JWT-based auth system
- **File Upload**: Document upload to vector database
- **Benchmark System**: Comprehensive RAG evaluation

### API Endpoints

- `/v1/heritage` - Heritage CRUD operations
- `/v1/rag` - RAG query & document upload
- `/v1/user` - User management
- `/v1/favorites` - Favorites system
- `/v1/comments` - Comments & reviews
- `/v1/knowledge-test` - Quiz system
- `/v1/leaderboard` - Ranking system

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose)
- **Vector DB**: Qdrant Cloud
- **AI Services**: Naver CLOVA Studio
  - HyperCLOVA X (Chat)
  - CLIR Embedding
  - Reranker API
- **Real-time**: Socket.io
- **Build**: Babel (ES6+ support)

## 📦 Installation

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env
```

## 🔧 Environment Variables

Create `.env` file:

```env
# Database
MONGODB_URI=your_mongodb_connection_string
DATABASE_NAME=History_Heritage_Database

# Server
LOCAL_APP_HOST=localhost
LOCAL_APP_PORT=8017

# JWT
ACCESS_TOKEN_SECRET_SIGNATURE=your_secret_key
REFRESH_TOKEN_SECRET_SIGNATURE=your_refresh_key

# Naver CLOVA Studio
NAVER_CLOVASTUDIO_API_KEY=your_clova_api_key
NAVER_APIGW_API_KEY=your_apigw_key

# Qdrant Vector Database
QDRANT_URL=your_qdrant_url
QDRANT_API_KEY=your_qdrant_api_key

# Email
GMAIL_USER=your_email
GMAIL_PASSWORD=your_app_password

# Frontend URLs
WEBSITE_DOMAIN_DEVELOPMENT=http://localhost:5173
WEBSITE_DOMAIN_PRODUCTION=your_production_url
```

## 🏃 Running the App

```bash
# Development mode
npm run dev

# Production build
npm run build
npm run production

# Run scripts
npm run upload-heritage-to-qdrant  # Upload documents to Qdrant
npm run create-qdrant-index        # Create Qdrant collection
npm run benchmark:qdrant           # Run RAG benchmark
```

## 📁 Project Structure

```
src/
├── server.js              # Main server file
├── config/                # Configuration
│   ├── environment.js
│   ├── mongodb.js
│   └── cors.js
├── controllers/           # Route controllers
├── middlewares/           # Express middlewares
├── models/               # MongoDB models
├── routes/               # API routes
│   └── v1/
├── services/             # Business logic
│   └── ragService.js     # RAG system core
├── validations/          # Request validation
├── sockets/              # Socket.io handlers
├── scripts/              # Utility scripts
│   ├── upload-heritage-to-qdrant.js
│   └── create-qdrant-index.js
└── benchmark/            # RAG benchmark system
    ├── runQdrantBenchmark.js
    ├── qdrantBenchmark.js
    ├── metrics.js
    └── analyzer.js
```

## 🎯 RAG System Architecture

```
User Question
    ↓
1. Question Classification (BERT)
    ↓
2. Embedding Generation (CLOVA Embedding)
    ↓
3. Vector Search (Qdrant) → Top 10 candidates
    ↓
4. Reranking (Naver Reranker) → Top 5 documents
    ↓
5. Context Building
    ↓
6. Answer Generation (HyperCLOVA X)
    ↓
Response
```

## 📊 Benchmark System

Comprehensive evaluation of RAG system quality:

```bash
# Run benchmark with 40 test cases
npm run benchmark:qdrant
```

**Metrics Evaluated:**

- BLEU Score (0-1): N-gram precision
- ROUGE-L (0-1): Longest common subsequence
- Cosine Similarity (0-1): TF-IDF based
- Retrieval Precision/Recall: Document relevance
- Response Time: End-to-end latency

**Output:**

- JSON results: `benchmark_results/benchmark_qdrant_[timestamp].json`
- Console log: `benchmark_results/benchmark_qdrant_[timestamp].txt`

## 🗄️ Database Collections

- `users` - User accounts
- `heritages` - Heritage sites data
- `comments` - Reviews & ratings
- `favorites` - User favorites
- `chatrooms` - Discussion rooms
- `messages` - Chat messages
- `knowledge_tests` - Quiz data
- `leaderboards` - User rankings

## 🔗 Related Repositories

- **Frontend**: [heritage-naver-fe](https://github.com/phanvanthuan06052004/heritage-naver-fe)
- **ML Classifier**: [train-model-classifier](https://github.com/th4nh-phat09/Model_Classifier)

## 📚 API Documentation

Postman collection available: `Heritage_RAG_API.postman_collection.json`

## 📄 License

MIT


