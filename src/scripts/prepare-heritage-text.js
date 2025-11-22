/**
 * Script chuyển đổi JSON heritage data sang text chunks để upload vào Chroma
 * Usage: npx babel-node src/scripts/prepare-heritage-text.js
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Chuyển đổi một heritage item thành text chunk
 */
const convertHeritageToText = (item) => {
  const parts = []
  
  // Title
  parts.push(`Heritage Site: ${item.name}`)
  
  // Description
  if (item.description) {
    parts.push(`\nDescription:\n${item.description}`)
  }
  
  // Location
  if (item.location) {
    parts.push(`\nLocation: ${item.location}`)
  }
  
  // Coordinates
  if (item.coordinates) {
    parts.push(`\nCoordinates: ${item.coordinates.latitude}, ${item.coordinates.longitude}`)
  }
  
  // Tags
  if (item.popularTags && item.popularTags.length > 0) {
    parts.push(`\nTags: ${item.popularTags.join(', ')}`)
  }
  
  return parts.join('\n')
}

/**
 * Main function
 */
const main = async () => {
  try {
    console.log('📄 Converting Heritage JSON to Text Chunks...\n')
    
    // Đường dẫn file JSON
    const jsonPath = path.join(process.cwd(), 'History_Heritage_Database.HistoryHeritageEn.json')
    const outputPath = path.join(process.cwd(), 'heritage_documents_prepared.txt')
    
    // Đọc file JSON
    console.log(`📂 Reading file: ${jsonPath}`)
    const jsonData = await fs.readFile(jsonPath, 'utf-8')
    const heritageData = JSON.parse(jsonData)
    
    console.log(`✅ Found ${heritageData.length} heritage items\n`)
    
    // Chuyển đổi từng item
    const textChunks = []
    for (const item of heritageData) {
      if (item.name && item.description) {
        const text = convertHeritageToText(item)
        textChunks.push(text)
        textChunks.push('\n---\n') // Separator
      }
    }
    
    // Ghi ra file text
    const finalText = textChunks.join('\n')
    await fs.writeFile(outputPath, finalText, 'utf-8')
    
    console.log(`✅ Text chunks saved to: ${outputPath}`)
    console.log(`📊 Total chunks: ${textChunks.length / 2}`)
    console.log(`📏 Total characters: ${finalText.length}\n`)
    
    console.log('🎉 Conversion complete!')
    console.log('\n📋 Next steps:')
    console.log('1. Use Postman to upload this file:')
    console.log('   POST http://localhost:3000/api/v1/rag/upload')
    console.log('   Body: form-data')
    console.log('   Key: "file" (type: File)')
    console.log(`   Value: Select file "${outputPath}"\n`)
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

// Run
main()
