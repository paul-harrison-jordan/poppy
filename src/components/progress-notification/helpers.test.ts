import { describe, it, expect } from 'vitest'
import { convertApiResponseToDocuments, updateDocumentStatus } from './helpers'

// Sample data for tests
const apiResponse = {
  documents: [
    { id: '1', name: 'file1' },
    { id: '2', name: 'file2' }
  ],
  totalDocuments: 2
}

const documents = [
  { id: '1', name: 'file1', synced: false },
  { id: '2', name: 'file2', synced: false }
]

describe('convertApiResponseToDocuments', () => {
  it('converts API response to document array', () => {
    const result = convertApiResponseToDocuments(apiResponse)
    expect(result).toEqual(documents)
  })
})

describe('updateDocumentStatus', () => {
  it('marks the correct document as synced', () => {
    const syncResponse = { message: 'ok', documentName: 'file2' }
    const updated = updateDocumentStatus(documents, syncResponse)
    expect(updated).toEqual([
      { id: '1', name: 'file1', synced: false },
      { id: '2', name: 'file2', synced: true }
    ])
  })
})
