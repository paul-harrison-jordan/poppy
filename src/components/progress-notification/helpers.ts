import type { Document } from "./index"

// API response interfaces
export interface DocumentResponse {
  documents: {
    id: string
    name: string
  }[]
  totalDocuments: number
}

export interface DocumentSyncResponse {
  message: string
  documentName: string
}

// Helper function to convert API response to our component format
export function convertApiResponseToDocuments(response: DocumentResponse): Document[] {
  return response.documents.map((doc) => ({
    id: doc.id,
    name: doc.name,
    synced: false,
  }))
}

// Helper function to update documents based on sync response
export function updateDocumentStatus(documents: Document[], syncResponse: DocumentSyncResponse): Document[] {
  return documents.map((doc) => {
    if (doc.name === syncResponse.documentName) {
      return { ...doc, synced: true }
    }
    return doc
  })
}
