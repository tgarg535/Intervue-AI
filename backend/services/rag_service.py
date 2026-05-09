import os
import fitz  # PyMuPDF 
from typing import List, Optional
from dotenv import load_dotenv

# LangChain and Vector Store imports 
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_postgres import PGVector
from langchain_core.documents import Document

# Load environment variables for DB and API keys 
load_dotenv()

# The connection string for your Supabase Postgres instance 
# Format: postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres
CONNECTION_STRING = os.getenv("DATABASE_URL")

class RAGService:
    def __init__(self):
        """
        Initializes the RAG service with Gemini Embeddings and 
        connects to the pgvector instance. 
        """
        # We use Gemini's text-embedding-004 to maintain consistency with the Flash models 
        try:
            self.embeddings = GoogleGenerativeAIEmbeddings(model="models/text-embedding-004")
        except Exception as e:
            print(f"Warning: Could not initialize embeddings: {str(e)}")
            self.embeddings = None
        
        # Standard chunking logic: 1000 chars with overlap to preserve context 
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=150
        )
        
        # Initialize pgvector via LangChain (Updated for langchain-postgres)
        # Only initialize if DATABASE_URL is provided
        if CONNECTION_STRING and self.embeddings:
            try:
                self.vector_store = PGVector(
                    embeddings=self.embeddings,
                    collection_name="intervue_chunks",
                    connection=CONNECTION_STRING,  # Changed from connection_string to connection
                    use_jsonb=True 
                )
            except Exception as e:
                print(f"Warning: Could not initialize PGVector: {str(e)}")
                self.vector_store = None
        else:
            print("Warning: DATABASE_URL not set. Vector store will be unavailable.")
            self.vector_store = None

    def process_and_store_document(self, file_path: str, session_id: str, doc_type: str = "resume"):
        """
        Parses a PDF, chunks the text, and stores it in the database. 
        """
        try:
            # Check if vector store is available
            if not self.vector_store:
                return {"status": "warning", "message": "Vector store not available. Configure DATABASE_URL to enable RAG functionality."}
            
            # 1. Open the PDF using PyMuPDF (fitz) 
            doc = fitz.open(file_path)
            full_text = ""
            for page in doc:
                page_text = page.get_text()
                if isinstance(page_text, str):
                    full_text += page_text
            
            # 2. Split the text into manageable chunks 
            chunks = self.text_splitter.split_text(full_text)
            
            # 3. Create Document objects with metadata for session-based filtering 
            documents = [
                Document(
                    page_content=chunk, 
                    metadata={"session_id": session_id, "type": doc_type}
                ) 
                for chunk in chunks
            ]
            
            # 4. Add to pgvector (this generates embeddings automatically) 
            self.vector_store.add_documents(documents)
            
            return {"status": "success", "chunks": len(documents), "message": f"Indexed {len(documents)} chunks."}
            
        except Exception as e:
            print(f"RAG Ingestion Error: {str(e)}")
            return {"status": "error", "message": str(e)}

    def get_relevant_context(self, query: str, session_id: str, k: int = 4) -> str:
        """
        Retrieves the most relevant snippets for the AI to use during the interview. 
        """
        if not self.vector_store:
            return ""
        
        # Similarity search filtered by the specific interview session 
        results = self.vector_store.similarity_search(
            query, 
            k=k, 
            filter={"session_id": session_id}
        )
        
        # Join the snippets into a single context block 
        context_block = "\n\n".join([res.page_content for res in results])
        return context_block


# Instantiate the service for use in routers 
rag_service = RAGService()