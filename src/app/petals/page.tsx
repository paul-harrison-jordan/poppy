'use client'

import React, { useState, useEffect, useRef } from 'react'
import { 
  FileText, 
  Loader2,
  Save,
  Flower2,
  ChevronRight
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import GoogleDocumentPicker from '@/components/GoogleDocumentPicker'

interface DocumentContent {
  id: string
  title: string
  content: string
  htmlContent?: string
}

interface PetalEdit {
  id: string
  originalText: string
  suggestedText: string
  explanation: string
  status: 'pending' | 'accepted' | 'rejected' | 'revising'
  timestamp: Date
  previousAttempts?: Array<{
    suggestion: string
    feedback: string
  }>
  contextUsed?: number
}

export default function PetalsPage() {
  const { status } = useSession()
  const router = useRouter()
  const [selectedDocument, setSelectedDocument] = useState<DocumentContent | null>(null)
  const [isLoadingDocument, setIsLoadingDocument] = useState(false)
  const [documentError, setDocumentError] = useState<string | null>(null)
  const [selectedText, setSelectedText] = useState<string>('')
  const [petalPrompt, setPetalPrompt] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentEdit, setCurrentEdit] = useState<PetalEdit | null>(null)
  const [editHistory, setEditHistory] = useState<PetalEdit[]>([])
  const [documentContent, setDocumentContent] = useState<string>('')
  const [documentHtml, setDocumentHtml] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [showDocumentPicker, setShowDocumentPicker] = useState(false)
  const [revisionPrompt, setRevisionPrompt] = useState<string>('')
  const [showRevisionInput, setShowRevisionInput] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const revisionInputRef = useRef<HTMLTextAreaElement>(null)

  // Redirect to auth if not logged in
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!currentEdit || currentEdit.status !== 'pending') return
      
      if (e.key.toLowerCase() === 'y' && !showRevisionInput) {
        handleAcceptEdit()
      } else if (e.key.toLowerCase() === 'n' && !showRevisionInput) {
        handleRejectEdit()
      } else if (e.key.toLowerCase() === 'r' && !showRevisionInput) {
        setShowRevisionInput(true)
        setTimeout(() => revisionInputRef.current?.focus(), 100)
      } else if (e.key === 'Escape' && showRevisionInput) {
        setShowRevisionInput(false)
        setRevisionPrompt('')
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEdit, showRevisionInput])

  const handleDocumentSelect = async (documents: { id: string; name: string }[]) => {
    if (documents.length === 0) return
    
    const doc = documents[0]
    setIsLoadingDocument(true)
    setDocumentError(null)
    setShowDocumentPicker(false)
    
    try {
      const response = await fetch('/api/get-google-doc-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          docId: doc.id,
          format: 'html'
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch document')
      }

      const data = await response.json()
      
      setSelectedDocument({
        id: doc.id,
        title: doc.name,
        content: data.content,
        htmlContent: data.htmlContent
      })
      setDocumentContent(data.content)
      setDocumentHtml(data.htmlContent || data.content)
    } catch (error) {
      console.error('Error loading document:', error)
      setDocumentError(error instanceof Error ? error.message : 'Failed to load document')
    } finally {
      setIsLoadingDocument(false)
    }
  }

  const handleTextSelection = () => {
    const selection = window.getSelection()
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString())
    }
  }

  const processPetalEdit = async (previousAttempts: Array<{ suggestion: string; feedback: string }> = []) => {
    if (!selectedText || (!petalPrompt && previousAttempts.length === 0)) return

    setIsProcessing(true)
    setShowRevisionInput(false)
    
    try {
      // Step 1: Search vector store for relevant context
      const vectorStoreId = localStorage.getItem('vectorStoreId')
      let contextFromVectorStore: Array<{ content: string }> = []
      let contextUsed = 0
      
      if (vectorStoreId) {
        try {
          // Create a comprehensive search query combining selected text and user intent
          const searchQuery = `Selected text: "${selectedText}"\n\nImprovement request: "${petalPrompt || 'Improve this text'}"\n\nRelated concepts: ${selectedText} ${petalPrompt || ''}`
          
          console.log('Searching vector store with query:', searchQuery)
          
          const searchResponse = await fetch('/api/assistant-search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: searchQuery,
              vectorStoreId,
            }),
          })

          if (searchResponse.ok) {
            const searchData = await searchResponse.json()
            // assistant-search returns matchedContext with different structure
            const rawContext = searchData.matchedContext || []
            console.log(`Received ${rawContext.length} context items from vector store`)
            
            // Take up to 10 context items (assistant-search now guarantees 10)
            contextFromVectorStore = rawContext.slice(0, 10).map((item: { content?: string; metadata?: { text?: string } }) => ({
              content: item.content || item.metadata?.text || 'No content available'
            }))
            contextUsed = contextFromVectorStore.length
            console.log(`Using ${contextUsed} context items for Petal processing`)
          } else {
            console.error('Vector store search failed:', await searchResponse.text())
          }
        } catch (error) {
          console.error('Error searching vector store:', error)
          // Continue without vector store context
        }
      }

      // Step 2: Call Petals processing endpoint with context and conversation history
      const petalResponse = await fetch('/api/petals/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedText,
          prompt: petalPrompt || 'Improve this text',
          documentContext: documentContent,
          vectorStoreContext: contextFromVectorStore,
          conversationHistory: previousAttempts
        }),
      })

      if (!petalResponse.ok) {
        throw new Error('Failed to process edit')
      }

      const { suggestedText, explanation, contextUsed: responseContextUsed } = await petalResponse.json()
      contextUsed = responseContextUsed || contextUsed
      
      const newEdit: PetalEdit = {
        id: Date.now().toString(),
        originalText: selectedText,
        suggestedText,
        explanation,
        status: 'pending',
        timestamp: new Date(),
        previousAttempts,
        contextUsed
      }

      setCurrentEdit(newEdit)
      setEditHistory([newEdit, ...editHistory])
    } catch (error) {
      console.error('Error processing edit:', error)
      alert('Failed to process your request. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePasteIntoPetal = () => processPetalEdit()

  const handleAcceptEdit = () => {
    if (!currentEdit) return

    const updatedContent = documentContent.replace(
      currentEdit.originalText,
      currentEdit.suggestedText
    )
    setDocumentContent(updatedContent)
    
    const updatedHtml = documentHtml.replace(
      currentEdit.originalText,
      currentEdit.suggestedText
    )
    setDocumentHtml(updatedHtml)

    setCurrentEdit({ ...currentEdit, status: 'accepted' })
    setEditHistory(history => 
      history.map(edit => 
        edit.id === currentEdit.id 
          ? { ...edit, status: 'accepted' as const }
          : edit
      )
    )

    setSelectedText('')
    setPetalPrompt('')
    setRevisionPrompt('')
    setTimeout(() => setCurrentEdit(null), 1500)
  }

  const handleRejectEdit = () => {
    if (!currentEdit) return

    setCurrentEdit({ ...currentEdit, status: 'rejected' })
    setEditHistory(history => 
      history.map(edit => 
        edit.id === currentEdit.id 
          ? { ...edit, status: 'rejected' as const }
          : edit
      )
    )

    setSelectedText('')
    setPetalPrompt('')
    setRevisionPrompt('')
    setTimeout(() => setCurrentEdit(null), 1500)
  }

  const handleReviseEdit = () => {
    if (!currentEdit || !revisionPrompt) return

    const previousAttempts = [
      ...(currentEdit.previousAttempts || []),
      {
        suggestion: currentEdit.suggestedText,
        feedback: revisionPrompt
      }
    ]

    setRevisionPrompt('')
    processPetalEdit(previousAttempts)
  }

  const handleSaveToGoogleDrive = async () => {
    if (!selectedDocument) return
    
    setIsSaving(true)
    
    try {
      const response = await fetch('/api/update-google-doc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          docId: selectedDocument.id,
          content: documentContent,
          htmlContent: documentHtml
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save document')
      }

      alert('Document saved successfully!')
    } catch (error) {
      console.error('Error saving document:', error)
      alert('Failed to save document. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-poppy-primary" />
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-warm-neutral-light">
      {/* Main Document Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-border p-space-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-space-3">
              <Flower2 className="w-6 h-6 text-poppy-primary" />
              <h1 className="text-2xl font-bold text-poppy-primary">Petals</h1>
              {selectedDocument && (
                <>
                  <span className="text-warm-neutral">/</span>
                  <span className="text-lg font-medium">{selectedDocument.title}</span>
                </>
              )}
            </div>
            
            <div className="flex items-center gap-space-3">
              {selectedDocument && (
                <button
                  onClick={handleSaveToGoogleDrive}
                  disabled={isSaving}
                  className="flex items-center gap-space-2 px-space-4 py-space-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-smooth disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save to Drive
                </button>
              )}
              
              {!selectedDocument && (
                <button
                  onClick={() => setShowDocumentPicker(true)}
                  className="px-space-4 py-space-2 bg-poppy-primary text-white rounded-lg hover:bg-poppy-primary-dark transition-smooth"
                >
                  Select PRD to Improve
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Document Content */}
        <div className="flex-1 overflow-auto p-space-6">
          {isLoadingDocument && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-poppy-primary" />
            </div>
          )}

          {documentError && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-space-4 text-destructive">
              {documentError}
            </div>
          )}

          {selectedDocument && !isLoadingDocument && (
            <div 
              ref={contentRef}
              className="prose prose-lg max-w-none bg-white rounded-xl p-space-8 elevation-md"
              onMouseUp={handleTextSelection}
            >
              {currentEdit && currentEdit.status === 'pending' ? (
                <div 
                  dangerouslySetInnerHTML={{
                    __html: documentHtml.replace(
                      currentEdit.originalText,
                      `<span class="bg-yellow-200 relative">
                        <span class="line-through opacity-50">${currentEdit.originalText}</span>
                        <span class="text-green-600 ml-2">[→]</span>
                      </span>`
                    )
                  }}
                />
              ) : (
                <div dangerouslySetInnerHTML={{ __html: documentHtml }} />
              )}
            </div>
          )}

          {!selectedDocument && !isLoadingDocument && (
            <div className="flex flex-col items-center justify-center h-full text-warm-neutral">
              <FileText className="w-16 h-16 mb-space-4 opacity-50" />
              <p className="text-xl mb-space-2">No document selected</p>
              <p className="text-sm">Choose a PRD to start improving with Petals</p>
            </div>
          )}
        </div>
      </div>

      {/* Action-Oriented Sidebar */}
      <div className="w-[480px] bg-white border-l border-border flex flex-col">
        {/* Header */}
        <div className="px-space-4 py-space-3 border-b border-border bg-warm-neutral-light/50">
          <h2 className="font-medium text-content">Petal Assistant</h2>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-space-4">
          {/* Selected Text */}
          {selectedText && !currentEdit && (
            <div className="mb-space-4">
              <div className="text-xs text-warm-neutral mb-space-2">SELECTED TEXT</div>
              <div className="bg-warm-neutral-light p-space-3 rounded-lg text-sm">
                {selectedText}
              </div>
            </div>
          )}

          {/* Current Edit */}
          {currentEdit && (
            <div className="space-y-space-4">
              {/* Original */}
              <div>
                <div className="text-xs text-warm-neutral mb-space-2">ORIGINAL</div>
                <div className="bg-warm-neutral-light p-space-3 rounded-lg text-sm line-through opacity-60">
                  {currentEdit.originalText}
                </div>
              </div>

              {/* Suggested */}
              <div>
                <div className="text-xs text-warm-neutral mb-space-2">SUGGESTED</div>
                <div className="bg-green-50 border border-green-200 p-space-3 rounded-lg text-sm">
                  {currentEdit.suggestedText}
                </div>
              </div>

              {/* Reasoning */}
              <div>
                <div className="text-xs text-warm-neutral mb-space-2">
                  REASONING {currentEdit.contextUsed ? `(${currentEdit.contextUsed} context items used)` : ''}
                </div>
                <div className="bg-blue-50 border border-blue-200 p-space-3 rounded-lg text-sm text-warm-neutral">
                  {currentEdit.explanation}
                </div>
              </div>

              {/* Actions */}
              {currentEdit.status === 'pending' && !showRevisionInput && (
                <div className="border-t pt-space-4">
                  <div className="space-y-space-2">
                    <button
                      onClick={handleAcceptEdit}
                      className="w-full text-left px-space-3 py-space-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-smooth flex items-center justify-between"
                    >
                      <span>Accept change</span>
                      <span className="text-xs opacity-75">Press Y</span>
                    </button>
                    
                    <button
                      onClick={handleRejectEdit}
                      className="w-full text-left px-space-3 py-space-2 bg-warm-neutral text-white rounded-lg hover:bg-warm-neutral-dark transition-smooth flex items-center justify-between"
                    >
                      <span>Reject change</span>
                      <span className="text-xs opacity-75">Press N</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        setShowRevisionInput(true)
                        setTimeout(() => revisionInputRef.current?.focus(), 100)
                      }}
                      className="w-full text-left px-space-3 py-space-2 border border-border rounded-lg hover:bg-warm-neutral-light transition-smooth flex items-center justify-between"
                    >
                      <span>Revise with feedback</span>
                      <span className="text-xs opacity-75">Press R</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Revision Input */}
              {showRevisionInput && (
                <div className="border-t pt-space-4">
                  <div className="text-xs text-warm-neutral mb-space-2">WHAT SHOULD BE DIFFERENT?</div>
                  <textarea
                    ref={revisionInputRef}
                    value={revisionPrompt}
                    onChange={(e) => setRevisionPrompt(e.target.value)}
                    placeholder="Describe what you want changed..."
                    className="w-full p-space-3 border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-poppy-primary"
                    rows={3}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.metaKey) {
                        handleReviseEdit()
                      }
                    }}
                  />
                  <div className="flex gap-space-2 mt-space-2">
                    <button
                      onClick={handleReviseEdit}
                      disabled={!revisionPrompt}
                      className="flex-1 px-space-3 py-space-2 bg-poppy-primary text-white rounded-lg hover:bg-poppy-primary-dark transition-smooth disabled:opacity-50"
                    >
                      Revise
                    </button>
                    <button
                      onClick={() => {
                        setShowRevisionInput(false)
                        setRevisionPrompt('')
                      }}
                      className="px-space-3 py-space-2 border border-border rounded-lg hover:bg-warm-neutral-light transition-smooth"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Status Messages */}
              {currentEdit.status === 'accepted' && (
                <div className="text-center py-space-3 text-green-600 font-medium">
                  ✓ Change applied
                </div>
              )}

              {currentEdit.status === 'rejected' && (
                <div className="text-center py-space-3 text-warm-neutral font-medium">
                  Change skipped
                </div>
              )}
            </div>
          )}

          {/* Processing State */}
          {isProcessing && (
            <div className="flex flex-col items-center justify-center py-space-8">
              <Loader2 className="w-8 h-8 animate-spin text-poppy-primary mb-space-3" />
              <p className="text-sm text-warm-neutral">Processing your request...</p>
            </div>
          )}

          {/* Empty State */}
          {!selectedText && !currentEdit && !isProcessing && editHistory.length === 0 && (
            <div className="text-center py-space-8 text-warm-neutral">
              <p className="text-sm">Select text in your document to start improving</p>
            </div>
          )}

          {/* History */}
          {editHistory.length > 0 && !currentEdit && !selectedText && (
            <div>
              <div className="text-xs text-warm-neutral mb-space-3">HISTORY</div>
              <div className="space-y-space-2">
                {editHistory.slice(0, 5).map((edit) => (
                  <div 
                    key={edit.id}
                    className="bg-warm-neutral-light rounded-lg p-space-3 flex items-center justify-between"
                  >
                    <span className="text-xs text-content truncate flex-1">
                      {edit.suggestedText.substring(0, 50)}...
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ml-2
                      ${edit.status === 'accepted' ? 'bg-green-100 text-green-700' : ''}
                      ${edit.status === 'rejected' ? 'bg-warm-neutral text-white' : ''}
                    `}>
                      {edit.status === 'accepted' ? 'Applied' : 'Skipped'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        {selectedText && !currentEdit && !isProcessing && (
          <div className="border-t border-border p-space-4">
            <textarea
              value={petalPrompt}
              onChange={(e) => setPetalPrompt(e.target.value)}
              placeholder="How should this be improved?"
              className="w-full p-space-3 border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-poppy-primary"
              rows={3}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.metaKey) {
                  handlePasteIntoPetal()
                }
              }}
            />
            <button
              onClick={handlePasteIntoPetal}
              disabled={!petalPrompt}
              className="w-full mt-space-2 px-space-4 py-space-2 bg-poppy-primary text-white rounded-lg hover:bg-poppy-primary-dark transition-smooth disabled:opacity-50 flex items-center justify-center gap-space-2"
            >
              <span>Improve</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Document Picker Modal */}
      {showDocumentPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-space-6 max-w-4xl w-full max-h-[80vh] overflow-auto">
            <h2 className="text-xl font-semibold mb-space-4">Select a PRD to Improve</h2>
            <GoogleDocumentPicker
              onDocumentsSelected={handleDocumentSelect}
              onSyncRequested={() => {}}
            />
            <button
              onClick={() => setShowDocumentPicker(false)}
              className="mt-space-4 px-space-4 py-space-2 bg-warm-neutral text-white rounded-lg hover:bg-warm-neutral-dark transition-smooth"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}