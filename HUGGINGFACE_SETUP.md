# Hugging Face Classification Setup

## 🎯 Overview

Sử dụng **mDeBERTa-v3-base-mnli-xnli** model từ Hugging Face để classify intent của câu hỏi.

## 📋 Setup Steps

### 1. Lấy Hugging Face API Key (Access Token)

1. Truy cập: https://huggingface.co/settings/tokens
2. Đăng nhập hoặc tạo account (miễn phí)
3. Click **"New token"** (hoặc "Create new token")
4. Đặt tên token (ví dụ: "heritage-rag-api")
5. **Chọn Token Type/Role:**

   - ⚪ Read: Chỉ đọc repos
   - ⚪ Write: Tạo/sửa repos
   - ✅ **Fine-grained (recommended)**: Chọn permissions chi tiết 👈 **CHỌN CÁI NÀY**

6. **Nếu chọn Fine-grained, check permissions:**

   - ✅ **Inference** → `Make calls to Inference Providers` (BẮT BUỘC!)
   - ℹ️ Repositories: Có thể bỏ trống hoặc để default
   - ℹ️ Không cần check gì khác

7. Click "Generate token"
8. Copy token (format: `hf_xxxxxxxxxx...`)

⚠️ **Lưu ý**:

- Token chỉ hiện 1 lần, save ngay vào `.env` file!
- **Dùng Fine-grained** để chỉ cấp quyền Inference, an toàn hơn Read/Write!### 2. Thêm vào `.env`

```env
# Hugging Face Configuration (Access Token)
HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Ví dụ token thật**: `hf_AbCdEfGhIjKlMnOpQrStUvWxYz1234567890`

Token này là **FREE** và cho phép:

- ✅ 30,000 requests/month
- ✅ Gọi Inference API
- ✅ Access public models

### 3. Model Used

**Model**: `MoritzLaurer/mDeBERTa-v3-base-mnli-xnli`

- Zero-shot classification
- Multilingual support (EN, VI, etc.)
- Fast inference (~200-500ms)
- Free tier: 30,000 requests/month

## 🚀 How It Works

```javascript
// Input: User question
"Tell me about Hue Imperial City"

// Zero-shot classification with labels
candidate_labels: [
  "historical heritage and cultural sites",
  "general unrelated topics"
]

// Output: Scores for each label
{
  labels: ["historical heritage...", "general unrelated..."],
  scores: [0.95, 0.05]  // 95% heritage, 5% unrelated
}

// Result
isRelevant: true
confidence: 0.95
```

## 🛡️ Fallback Strategy

Nếu HuggingFace API fail → **Keyword-based classification**:

### Heritage Keywords:

- heritage, monument, temple, pagoda, citadel, palace
- historical, history, ancient, culture, relic, unesco
- hue, hoi an, my son, imperial, dynasty, architecture
- when, where, built, founded, constructed

### Non-Heritage Keywords:

- weather, food, recipe, cook, joke, game, sport
- movie, music, shopping, hotel, restaurant, sex

## 📊 Benefits vs Naver Chat API

| Feature     | Hugging Face           | Naver Chat                     |
| ----------- | ---------------------- | ------------------------------ |
| Speed       | ⚡ Fast (~300ms)       | 🐢 Slow (~2s)                  |
| Cost        | 💰 Free tier generous  | 💸 Pay per request             |
| Reliability | ✅ Consistent scores   | ❌ Inconsistent (confidence=0) |
| Control     | ✅ Direct model access | ❌ Black box                   |
| Fallback    | ✅ Keyword-based       | ❌ None                        |

## 🧪 Testing

```bash
# Test classification
curl -X POST http://localhost:8017/api/v1/rag/query \
  -H "Content-Type: application/json" \
  -d '{"question": "Tell me about Hue Citadel"}'

# Expected log:
# 🎯 HuggingFace Classification: RELEVANT (confidence: 0.95)
```

## 🔧 Tuning

Adjust confidence threshold in code:

```javascript
const isRelevant = heritageScore > 0.5; // Change 0.5 to 0.6 for stricter
```
