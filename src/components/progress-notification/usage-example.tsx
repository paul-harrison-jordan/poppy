"use client"

import { useState } from "react"
import { ProgressNotification, type Document } from "./index"
import { convertApiResponseToDocuments, updateDocumentStatus } from "./helpers"

// Mock API response for demonstration
const mockApiResponse = {
  documents: [
    {
      id: "doc1",
      name: "Annual Report 2023.pdf",
    },
    {
      id: "doc2",
      name: "Financial Statement Q4.xlsx",
    },
    {
      id: "doc3",
      name: "Marketing Strategy.docx",
    },
    {
      id: "doc4",
      name: "Product Roadmap.pptx",
    },
  ],
  totalDocuments: 4,
}

export default function ProgressExample() {
  const [isLoading, setIsLoading] = useState(false)
  const [documents, setDocuments] = useState<Document[]>([])

  const startSync = () => {
    // Convert API response to documents
    const docs = convertApiResponseToDocuments(mockApiResponse)
    setDocuments(docs)
    setIsLoading(true)

    // Simulate document syncing
    simulateDocumentSync(docs)
  }

  const simulateDocumentSync = (docs: Document[]) => {
    // Create a copy of the documents array
    const docsCopy = [...docs]

    // Function to sync a random document
    const syncRandomDocument = () => {
      // Find documents that haven't been synced yet
      const unsyncedDocs = docsCopy.filter((doc) => !doc.synced)

      if (unsyncedDocs.length === 0) {
        // All documents have been synced
        return
      }

      // Select a random unsynced document
      const randomIndex = Math.floor(Math.random() * unsyncedDocs.length)
      const docToSync = unsyncedDocs[randomIndex]

      // Simulate API response for document sync
      const syncResponse = {
        message: "Document synced successfully",
        documentName: docToSync.name,
      }

      // Update documents with the sync response
      const updatedDocs = updateDocumentStatus(docsCopy, syncResponse)
      docsCopy.splice(0, docsCopy.length, ...updatedDocs)

      // Update the state
      setDocuments([...docsCopy])

      // If there are still documents to sync, schedule the next one
      if (unsyncedDocs.length > 1) {
        // Random delay between 500ms and 2000ms
        const delay = 500 + Math.random() * 1500
        setTimeout(syncRandomDocument, delay)
      }
    }

    // Start syncing documents with a small initial delay
    setTimeout(syncRandomDocument, 500)
  }

  const handleComplete = () => {
    setIsLoading(false)
    setDocuments([])
    // Additional logic after sync completes
  }

  const handleDismiss = () => {
    setIsLoading(false)
    setDocuments([])
    // Additional logic for cancellation
  }

  return (
    <div className="p-8">
      <button
        onClick={startSync}
        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
      >
        Start Sync
      </button>

      <ProgressNotification
        isLoading={isLoading}
        documents={documents}
        onComplete={handleComplete}
        onDismiss={handleDismiss}
        position="top-right"
      />
    </div>
  )
}
