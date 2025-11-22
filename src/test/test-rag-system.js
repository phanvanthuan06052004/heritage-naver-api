/**
 * RAG System Testing Script
 * Script để test các chức năng của hệ thống RAG
 */

// Run this script with: node src/test/test-rag-system.js

const testRAGUpload = async () => {
  console.log('🧪 Testing RAG Upload...\n')

  const FormData = require('form-data')
  const fs = require('fs')
  const fetch = require('node-fetch')

  try {
    // Tạo sample document
    const sampleText = `
Chùa Một Cột (chữ Hán: 一柱寺) là một ngôi chùa Phật giáo nổi tiếng ở Hà Nội, Việt Nam.
Chùa được xây dựng vào năm 1049 dưới thời vua Lý Thái Tông.
Chùa có kiến trúc đặc biệt với một cột đá chống đỡ, giống như hoa sen nở trên mặt nước.
Chùa Một Cột là một trong những biểu tượng văn hóa quan trọng của Hà Nội và Việt Nam.
Chùa đã được trùng tu nhiều lần qua các thời kỳ lịch sử.
    `.trim()

    // Save to temp file
    const tempFile = 'temp-test-document.txt'
    fs.writeFileSync(tempFile, sampleText)

    // Upload document
    const formData = new FormData()
    formData.append('file', fs.createReadStream(tempFile))
    formData.append('title', 'Chùa Một Cột')
    formData.append('category', 'di-san-van-hoa')
    formData.append('description', 'Thông tin về Chùa Một Cột')

    const uploadResponse = await fetch('http://localhost:8017/api/v1/rag/upload', {
      method: 'POST',
      body: formData
    })

    const uploadResult = await uploadResponse.json()
    console.log('✅ Upload Result:', JSON.stringify(uploadResult, null, 2))

    // Clean up
    fs.unlinkSync(tempFile)

    return uploadResult.success
  } catch (error) {
    console.error('❌ Upload Error:', error.message)
    return false
  }
}

const testRAGQuery = async () => {
  console.log('\n🧪 Testing RAG Query...\n')

  const fetch = require('node-fetch')

  const questions = [
    'Chùa Một Cột được xây dựng vào năm nào?',
    'Chùa Một Cột có kiến trúc như thế nào?',
    'Chùa Một Cột ở đâu?',
    'Thời tiết hôm nay thế nào?' // General question
  ]

  for (const question of questions) {
    try {
      console.log(`\n❓ Question: ${question}`)

      const queryResponse = await fetch('http://localhost:8017/api/v1/rag/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          question: question,
          topK: 3
        })
      })

      const queryResult = await queryResponse.json()

      if (queryResult.success) {
        console.log(`\n💬 Answer (${queryResult.data.mode} mode):`)
        console.log(queryResult.data.answer)

        if (queryResult.data.sources && queryResult.data.sources.length > 0) {
          console.log(`\n📚 Sources (${queryResult.data.sources.length}):`)
          queryResult.data.sources.forEach((source, index) => {
            console.log(`  ${index + 1}. Score: ${source.score}`)
            console.log(`     Content: ${source.content.substring(0, 100)}...`)
          })
        }
      } else {
        console.log('❌ Query failed:', queryResult.message)
      }

      // Wait 1 second between questions
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (error) {
      console.error('❌ Query Error:', error.message)
    }
  }
}

const testHealthCheck = async () => {
  console.log('🧪 Testing Health Check...\n')

  const fetch = require('node-fetch')

  try {
    const response = await fetch('http://localhost:8017/api/v1/rag/health')
    const result = await response.json()

    console.log('✅ Health Check Result:', JSON.stringify(result, null, 2))
    return result.success
  } catch (error) {
    console.error('❌ Health Check Error:', error.message)
    return false
  }
}

const testUploadText = async () => {
  console.log('\n🧪 Testing Upload Text...\n')

  const fetch = require('node-fetch')

  try {
    const sampleText = `
Văn Miếu - Quốc Tử Giám là một quần thể di tích lịch sử văn hóa nằm ở quận Đống Đa, Hà Nội.
Văn Miếu được xây dựng vào năm 1070 dưới thời vua Lý Thánh Tông.
Đây là ngôi trường đại học đầu tiên của Việt Nam.
Văn Miếu - Quốc Tử Giám là nơi thờ Khổng Tử và các bậc hiền tài của nước Việt.
    `.trim()

    const response = await fetch('http://localhost:8017/api/v1/rag/upload-text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: sampleText,
        metadata: {
          title: 'Văn Miếu - Quốc Tử Giám',
          category: 'di-san-van-hoa',
          description: 'Thông tin về Văn Miếu'
        }
      })
    })

    const result = await response.json()
    console.log('✅ Upload Text Result:', JSON.stringify(result, null, 2))
    return result.success
  } catch (error) {
    console.error('❌ Upload Text Error:', error.message)
    return false
  }
}

// Main test runner
const runAllTests = async () => {
  console.log('🚀 Starting RAG System Tests\n')
  console.log('=' .repeat(50))

  // Test 1: Health Check
  const healthOk = await testHealthCheck()
  if (!healthOk) {
    console.log('\n⚠️  Health check failed. Please ensure:')
    console.log('   1. Server is running (npm run dev)')
    console.log('   2. Chroma is running (docker run -p 8000:8000 chromadb/chroma)')
    console.log('   3. Environment variables are set')
    return
  }

  console.log('\n' + '='.repeat(50))

  // Test 2: Upload Text
  await testUploadText()

  console.log('\n' + '='.repeat(50))

  // Test 3: Upload Document
  // await testRAGUpload() // Uncomment to test file upload

  console.log('\n' + '='.repeat(50))

  // Test 4: Query RAG
  await testRAGQuery()

  console.log('\n' + '='.repeat(50))
  console.log('\n✨ All tests completed!\n')
}

// Run tests
if (require.main === module) {
  runAllTests().catch(console.error)
}

module.exports = {
  testHealthCheck,
  testRAGUpload,
  testRAGQuery,
  testUploadText
}
