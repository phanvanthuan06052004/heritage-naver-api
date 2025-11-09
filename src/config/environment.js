import 'dotenv/config'

export const env = {
    MONGODB_URI: process.env.MONGODB_URI,
    DATABASE_NAME: process.env.DATABASE_NAME,
    LOCAL_APP_HOST: process.env.LOCAL_APP_HOST,
    LOCAL_APP_PORT: process.env.LOCAL_APP_PORT,
    BUILD_MODE: process.env.BUILD_MODE,
    ACCESS_TOKEN_SECRET_SIGNATURE: process.env.ACCESS_TOKEN_SECRET_SIGNATURE,
    REFRESH_TOKEN_SECRET_SIGNATURE: process.env.REFRESH_TOKEN_SECRET_SIGNATURE,
    
    // RAG System Configuration
    NAVER_API_KEY: process.env.NAVER_API_KEY,
    NAVER_APIGW_API_KEY: process.env.NAVER_APIGW_API_KEY,
    NAVER_EMBEDDING_API_URL: process.env.NAVER_EMBEDDING_API_URL || 'https://clovastudio.stream.ntruss.com/v1/api-tools/embedding/clir-emb-dolphin',
    NAVER_CHAT_API_URL: process.env.NAVER_CHAT_API_URL || 'https://clovastudio.stream.ntruss.com/testapp/v1/chat-completions/HCX-DASH-001',
    CHROMA_URL: process.env.CHROMA_URL
}
