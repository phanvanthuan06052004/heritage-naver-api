import { ChromaClient } from "chromadb";

const client = new ChromaClient({ path: "http://localhost:8000" });

const collections = await client.listCollections();
console.log(collections);
