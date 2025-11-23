/**
 * Wrapper for ragService to use in benchmark
 * Exports queryRAG function with proper path resolution
 */

import { fileURLToPath, pathToFileURL } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import ragService với đường dẫn tương đối và convert sang file URL
const ragServicePath = resolve(__dirname, "../services/ragService.js");
const ragServiceURL = pathToFileURL(ragServicePath).href;

// Dynamic import để tránh lỗi với alias
const ragService = await import(ragServiceURL);

export const queryRAG = ragService.queryRAG;
