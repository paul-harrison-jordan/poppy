'use client'

import React, { useState, useEffect, useRef } from 'react'
import '@/styles/addictive-animations.css'
import { 
  FileText, 
  Loader2,
  Save,
  Flower2,
  Sparkles,
  Check,
  X,
  RefreshCw,
  Send,
  Brain
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import GoogleDocumentPicker from '@/components/GoogleDocumentPicker'
import PlanCard from '@/components/assistant/PlanCard'
import ToolCallIndicator from '@/components/assistant/ToolCallIndicator'
import TaskApprovalFlow from '@/components/assistant/TaskApprovalFlow'
import PetalGarden from '@/components/PetalGarden'
import type { ActionPlan, AssistantMessage, ToolCall, ProactiveAnalysis } from '@/types/assistant'

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
  position?: { top: number; left: number }
}

interface SelectionRange {
  text: string
  rect?: DOMRect
}

// Use AssistantMessage from types instead
// interface ChatMessage {
//   id: string
//   role: 'user' | 'assistant'
//   content: string
//   timestamp: Date
//   agent?: string
//   suggestions?: string[]
//   improvements?: Array<{text: string, section?: string}>
// }

export default function PetalsPage() {
  const { status } = useSession()
  const router = useRouter()
  const [selectedDocument, setSelectedDocument] = useState<DocumentContent | null>(null)
  const [isLoadingDocument, setIsLoadingDocument] = useState(false)
  const [documentError, setDocumentError] = useState<string | null>(null)
  const [selection, setSelection] = useState<SelectionRange | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState<string>('')
  const [currentEdit, setCurrentEdit] = useState<PetalEdit | null>(null)
  const [editHistory, setEditHistory] = useState<PetalEdit[]>([])
  const [documentContent, setDocumentContent] = useState<string>('')
  const [documentHtml, setDocumentHtml] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [showDocumentPicker, setShowDocumentPicker] = useState(false)
  const [revisionPrompt, setRevisionPrompt] = useState<string>('')
  const [showFloatingToolbar, setShowFloatingToolbar] = useState(false)
  const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0 })
  const [chatMessages, setChatMessages] = useState<AssistantMessage[]>([])
  const [chatInput, setChatInput] = useState<string>('')
  const [isChatProcessing, setIsChatProcessing] = useState(false)
  const [currentToolCalls, setCurrentToolCalls] = useState<ToolCall[]>([])
  const [proactiveAnalysis, setProactiveAnalysis] = useState<ProactiveAnalysis | null>(null)
  const [activePlans, setActivePlans] = useState<ActionPlan[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [currentTaskFlow, setCurrentTaskFlow] = useState<ActionPlan | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const floatingToolbarRef = useRef<HTMLDivElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const selectionTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Redirect to auth if not logged in
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  // Enhanced text selection handler with better stability
  useEffect(() => {
    const handleSelection = () => {
      // Clear any existing timeout
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current)
      }

      const sel = window.getSelection()
      if (!sel || sel.isCollapsed || !contentRef.current) {
        // Delay hiding to allow button clicks
        selectionTimeoutRef.current = setTimeout(() => {
          setShowFloatingToolbar(false)
          setSelection(null)
        }, 200)
        return
      }

      const text = sel.toString().trim()
      if (!text) {
        selectionTimeoutRef.current = setTimeout(() => {
          setShowFloatingToolbar(false)
          setSelection(null)
        }, 200)
        return
      }

      const range = sel.getRangeAt(0)
      const rect = range.getBoundingClientRect()

      // Only show toolbar for selections within the document content
      if (!contentRef.current.contains(range.commonAncestorContainer)) {
        selectionTimeoutRef.current = setTimeout(() => {
          setShowFloatingToolbar(false)
          setSelection(null)
        }, 200)
        return
      }

      // Cancel any pending hide
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current)
      }

      setSelection({
        text,
        rect
      })

      // Position toolbar above selection with proper bounds checking
      const contentRect = contentRef.current.getBoundingClientRect()
      const toolbarWidth = 200 // Approximate width
      const toolbarHeight = 50 // Approximate height
      
      let left = rect.left - contentRect.left + (rect.width / 2) - (toolbarWidth / 2)
      let top = rect.top - contentRect.top - toolbarHeight - 10

      // Keep toolbar within bounds
      left = Math.max(10, Math.min(left, contentRect.width - toolbarWidth - 10))
      top = Math.max(10, top)

      setToolbarPosition({ top, left })
      setShowFloatingToolbar(true)
    }

    // Use mouseup for selection end detection
    const handleMouseUp = () => {
      setTimeout(handleSelection, 10)
    }

    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('selectionchange', handleSelection)

    return () => {
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('selectionchange', handleSelection)
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current)
      }
    }
  }, [])

  // Smart selection on double/triple click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!contentRef.current?.contains(e.target as Node)) return

      if (e.detail === 2) {
        // Double click - select sentence
        e.preventDefault()
        const sel = window.getSelection()
        if (sel && sel.anchorNode) {
          const text = sel.anchorNode.textContent || ''
          const offset = sel.anchorOffset
          
          // Find sentence boundaries
          let start = text.lastIndexOf('.', offset - 1)
          start = start === -1 ? 0 : start + 1
          while (start < text.length && /\s/.test(text[start])) start++
          
          let end = text.indexOf('.', offset)
          end = end === -1 ? text.length : end + 1

          // Create range for sentence
          const range = document.createRange()
          if (sel.anchorNode.nodeType === Node.TEXT_NODE) {
            range.setStart(sel.anchorNode, Math.max(0, start))
            range.setEnd(sel.anchorNode, Math.min(end, text.length))
          }
          
          sel.removeAllRanges()
          sel.addRange(range)
        }
      }
    }

    document.addEventListener('dblclick', handleClick)
    return () => document.removeEventListener('dblclick', handleClick)
  }, [])

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatMessages])

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
      
      // Trigger proactive analysis
      analyzeDocumentProactively(data.content)
    } catch (error) {
      console.error('Error loading document:', error)
      setDocumentError(error instanceof Error ? error.message : 'Failed to load document')
    } finally {
      setIsLoadingDocument(false)
    }
  }

  const processPetalEdit = async (text: string, prompt?: string, previousAttempts: Array<{ suggestion: string; feedback: string }> = []) => {
    setIsProcessing(true)
    setShowFloatingToolbar(false)
    setProcessingStep('Searching context...')
    
    try {
      // Step 1: Search vector store for relevant context
      const vectorStoreId = localStorage.getItem('vectorStoreId')
      let contextFromVectorStore: Array<{ content: string }> = []
      let contextUsed = 0
      
      if (vectorStoreId) {
        try {
          const searchQuery = `Selected text: "${text}"\n\nImprovement request: "${prompt || 'Improve this text'}"\n\nRelated concepts: ${text} ${prompt || ''}`
          
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
            const rawContext = searchData.matchedContext || []
            contextFromVectorStore = rawContext.slice(0, 10).map((item: { content?: string; metadata?: { text?: string } }) => ({
              content: item.content || item.metadata?.text || 'No content available'
            }))
            contextUsed = contextFromVectorStore.length
          }
        } catch (error) {
          console.error('Error searching vector store:', error)
        }
      }

      setProcessingStep('Analyzing text...')
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setProcessingStep('Generating improvement...')

      // Step 2: Call Petals processing endpoint
      const petalResponse = await fetch('/api/petals/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedText: text,
          prompt: prompt || 'Improve this text',
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
        originalText: text,
        suggestedText,
        explanation,
        status: 'pending',
        timestamp: new Date(),
        previousAttempts,
        contextUsed,
        position: selection?.rect ? {
          top: selection.rect.top,
          left: selection.rect.left
        } : undefined
      }

      setCurrentEdit(newEdit)
      setEditHistory([newEdit, ...editHistory])
      setProcessingStep('')
    } catch (error) {
      console.error('Error processing edit:', error)
      alert('Failed to process your request. Please try again.')
      setProcessingStep('')
    } finally {
      setIsProcessing(false)
    }
  }

  const analyzeDocumentProactively = async (content: string) => {
    if (!content || content.length < 100) return
    
    setIsAnalyzing(true)
    
    // Simplified analysis for authentic experience
    setTimeout(() => {
      const mockAnalysis: ProactiveAnalysis = {
        documentScore: Math.floor(Math.random() * 40) + 60, // 60-100
        insights: [
          {
            type: 'gap',
            section: 'Success Metrics',
            description: 'Missing measurable success criteria',
            priority: 'high',
            suggestedAction: 'Define KPIs and success metrics'
          },
          {
            type: 'opportunity',
            section: 'User Stories',
            description: 'Could benefit from edge case scenarios',
            priority: 'medium',
            suggestedAction: 'Add edge case user stories'
          }
        ],
        topRecommendations: [
          'Add measurable success metrics',
          'Clarify acceptance criteria'
        ],
        estimatedImprovementTime: '1-2 hours'
      }
      
      setProactiveAnalysis(mockAnalysis)
      setIsAnalyzing(false)
    }, 1500)
  }

  const handleStreamingChat = async (message: string, planAction?: {id: string, action: 'accept' | 'reject' | 'improve', feedback?: string}) => {
    setIsChatProcessing(true)
    setCurrentToolCalls([])
    
    try {
      const response = await fetch('/api/petals/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          documentContext: documentContent,
          plan: planAction,
          mode: planAction?.action === 'accept' ? 'execute' : 'chat'
        }),
      })

      if (!response.ok) throw new Error('Failed to process request')
      
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      
      let currentMessage: AssistantMessage | null = null
      
      while (reader) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') break
            
            try {
              const parsed = JSON.parse(data)
              
              if (parsed.type === 'tool_call') {
                setCurrentToolCalls(prev => {
                  const existing = prev.find(tc => tc.id === parsed.data.id)
                  if (existing) {
                    return prev.map(tc => tc.id === parsed.data.id ? parsed.data : tc)
                  }
                  return [...prev, parsed.data]
                })
              }
              
              if (parsed.type === 'plan') {
                const plan = parsed.data
                setActivePlans(prev => [plan, ...prev.slice(0, 2)]) // Keep last 3 plans
                setCurrentTaskFlow(plan) // Set as current flow for approval
                
                currentMessage = {
                  id: Date.now().toString(),
                  role: 'assistant',
                  plan,
                  timestamp: new Date()
                }
                setChatMessages(prev => [...prev, currentMessage!])
              }
              
              if (parsed.type === 'message') {
                currentMessage = {
                  id: Date.now().toString(),
                  role: 'assistant',
                  content: parsed.data,
                  timestamp: new Date()
                }
                setChatMessages(prev => [...prev, currentMessage!])
              }
            } catch (e) {
              console.error('Error parsing stream data:', e)
            }
          }
        }
      }
    } catch (error) {
      console.error('Streaming chat error:', error)
      const errorMessage: AssistantMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      }
      setChatMessages(prev => [...prev, errorMessage])
    } finally {
      setIsChatProcessing(false)
      setCurrentToolCalls([])
    }
  }

  const handleTaskApproval = (taskId: string) => {
    // Simple task approval without gamification
    if (currentTaskFlow) {
      const updatedPlan = {
        ...currentTaskFlow,
        tasks: currentTaskFlow.tasks.map(task => 
          task.id === taskId 
            ? { ...task, status: 'completed' as const, result: `Task completed successfully!` }
            : task
        )
      };
      setCurrentTaskFlow(updatedPlan);
      setActivePlans(prev => prev.map(p => p.id === updatedPlan.id ? updatedPlan : p));
    }
  }

  const handleTaskRejection = (taskId: string, reason?: string) => {
    if (currentTaskFlow) {
      const updatedPlan = {
        ...currentTaskFlow,
        tasks: currentTaskFlow.tasks.map(task => 
          task.id === taskId 
            ? { ...task, status: 'failed' as const, result: reason || 'Task needs revision' }
            : task
        )
      };
      setCurrentTaskFlow(updatedPlan);
      setActivePlans(prev => prev.map(p => p.id === updatedPlan.id ? updatedPlan : p));
    }
  }

  const handleTaskChanges = (taskId: string, feedback: string) => {
    if (currentTaskFlow) {
      const updatedPlan = {
        ...currentTaskFlow,
        tasks: currentTaskFlow.tasks.map(task => 
          task.id === taskId 
            ? { ...task, status: 'pending' as const, result: `Changes requested: ${feedback}` }
            : task
        )
      };
      setCurrentTaskFlow(updatedPlan);
      setActivePlans(prev => prev.map(p => p.id === updatedPlan.id ? updatedPlan : p));
    }
  }

  const handleTaskFlowComplete = () => {
    setCurrentTaskFlow(null);
  }

  const handleImproveWithPetals = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (selection) {
      processPetalEdit(selection.text)
    }
  }

  const handleChatSubmit = async () => {
    if (!chatInput.trim() || isChatProcessing) return

    const userMessage: AssistantMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: chatInput,
      timestamp: new Date()
    }

    setChatMessages(prev => [...prev, userMessage])
    const message = chatInput
    setChatInput('')
    
    await handleStreamingChat(message)
  }

  const handlePlanAction = async (planId: string, action: 'accept' | 'reject' | 'improve', feedback?: string) => {
    const plan = activePlans.find(p => p.id === planId)
    if (!plan) return

    if (action === 'accept') {
      // Update plan status to accepted
      setActivePlans(prev => 
        prev.map(p => p.id === planId ? { ...p, status: 'accepted' } : p)
      )
      
      // Execute the plan
      await handleStreamingChat(`Execute the plan: ${plan.objective}`, {
        id: planId,
        action: 'accept',
        feedback: undefined
      })
    } else if (action === 'reject') {
      setActivePlans(prev => 
        prev.map(p => p.id === planId ? { ...p, status: 'rejected' } : p)
      )
    } else if (action === 'improve' && feedback) {
      await handleStreamingChat(`Improve the plan: ${feedback}`, {
        id: planId,
        action: 'improve',
        feedback
      })
    }
  }

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

    setSelection(null)
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

    setSelection(null)
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
    setCurrentEdit(null)
    processPetalEdit(currentEdit.originalText, revisionPrompt, previousAttempts)
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

  // Render inline diff
  const renderDocumentWithDiff = () => {
    if (!currentEdit || currentEdit.status !== 'pending') {
      return documentHtml
    }

    // Create inline diff view
    const diffHtml = documentHtml.replace(
      currentEdit.originalText,
      `<div class="inline-diff-container" style="display: inline-block; position: relative; background: linear-gradient(to right, #fee2e2 50%, #dcfce7 50%); padding: 4px 8px; border-radius: 4px; margin: 2px 0;">
        <span class="diff-old" style="text-decoration: line-through; color: #dc2626; opacity: 0.7;">${currentEdit.originalText}</span>
        <span class="diff-arrow" style="margin: 0 8px; color: #16a34a; font-weight: bold;">→</span>
        <span class="diff-new" style="color: #16a34a; font-weight: 500;">${currentEdit.suggestedText}</span>
      </div>`
    )

    return diffHtml
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-poppy-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-orange-50">
      {/* Organic Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-pink-100/30 to-purple-100/30 transform -skew-y-1"></div>
        <div className="relative px-8 py-8">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Flower2 className="w-10 h-10 text-poppy-primary drop-shadow-sm" />
                <div className="absolute inset-0 w-10 h-10 bg-poppy-primary/20 rounded-full animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-800 tracking-tight">Your Garden</h1>
                <p className="text-gray-600 text-lg">Nurture your ideas into beautiful features</p>
              </div>
            </div>
            
            {selectedDocument && (
              <button
                onClick={handleSaveToGoogleDrive}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full hover:from-green-600 hover:to-green-700 transition-all shadow-lg disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                Save Changes
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {!selectedDocument ? (
          // Petal Selection Screen
          <PetalGarden onSelectPetal={(doc) => handleDocumentSelect([doc])} />
        ) : (
          // Document Editing View  
          <div className="flex gap-8">
            {/* Document Editor */}
            <div className="flex-1 bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
              <div className="p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-3 h-3 bg-pink-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
                  <h2 className="text-2xl font-semibold text-gray-800 ml-4">{selectedDocument.title}</h2>
                </div>

                {isLoadingDocument ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="relative">
                      <Loader2 className="w-8 h-8 animate-spin text-poppy-primary" />
                      <div className="absolute inset-0 w-8 h-8 border-2 border-pink-200 rounded-full animate-ping"></div>
                    </div>
                  </div>
                ) : documentError ? (
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-800">
                    <p className="font-medium">Oops! Something went wrong</p>
                    <p className="text-sm mt-1">{documentError}</p>
                  </div>
                ) : (
                  <div 
                    ref={contentRef}
                    className="prose prose-lg max-w-none relative"
                  >
                    <div dangerouslySetInnerHTML={{ __html: renderDocumentWithDiff() }} />
                
                    {/* Floating Toolbar - More Organic */}
                    {showFloatingToolbar && !currentEdit && selection && (
                      <div
                        ref={floatingToolbarRef}
                        className="absolute z-50 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full shadow-xl border-2 border-white/20 backdrop-blur-sm"
                        style={{
                          top: `${toolbarPosition.top}px`,
                          left: `${toolbarPosition.left}px`
                        }}
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        <button
                          onMouseDown={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleImproveWithPetals(e)
                          }}
                          className="flex items-center gap-2 px-4 py-2 text-white hover:bg-white/10 rounded-full transition-all text-sm font-medium"
                        >
                          <Sparkles className="w-4 h-4" />
                          Polish this
                        </button>
                      </div>
                    )}

                {/* Inline Edit Actions */}
                {currentEdit && currentEdit.status === 'pending' && (
                  <div
                    className="absolute z-50 bg-white border border-border rounded-lg shadow-xl p-space-3"
                    style={{
                      top: currentEdit.position ? `${currentEdit.position.top - 50}px` : '50%',
                      left: currentEdit.position ? `${currentEdit.position.left}px` : '50%',
                      transform: 'translate(-50%, -100%)'
                    }}
                  >
                    <div className="flex items-center gap-space-2 mb-space-2">
                      <button
                        onClick={handleAcceptEdit}
                        className="flex items-center gap-1 px-space-3 py-space-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-smooth text-sm"
                      >
                        <Check className="w-3 h-3" />
                        Accept
                      </button>
                      <button
                        onClick={handleRejectEdit}
                        className="flex items-center gap-1 px-space-3 py-space-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-smooth text-sm"
                      >
                        <X className="w-3 h-3" />
                        Reject
                      </button>
                      <button
                        onClick={() => setRevisionPrompt('show')}
                        className="flex items-center gap-1 px-space-3 py-space-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-smooth text-sm"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Revise
                      </button>
                    </div>
                    <div className="text-xs text-warm-neutral bg-warm-neutral-light p-space-2 rounded">
                      {currentEdit.explanation}
                    </div>
                  </div>
                )}

                    {/* Persistent Selection Highlight */}
                    {selection && !currentEdit && (
                      <style jsx global>{`
                        ::selection {
                          background-color: rgba(147, 51, 234, 0.2);
                          color: inherit;
                        }
                      `}</style>
                    )}
                  </div>
                )}

                {/* Simplified Insights */}
                {proactiveAnalysis && (
              <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-600" />
                  Quick Suggestions
                </h3>
                <div className="space-y-2">
                  {proactiveAnalysis.topRecommendations.slice(0, 3).map((rec, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleStreamingChat(rec)}
                      className="block w-full text-left p-3 bg-white rounded-lg hover:bg-purple-50 transition-colors border border-purple-100"
                    >
                      <span className="text-purple-600 font-medium">•</span> {rec}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Task Flow */}
            {currentTaskFlow && (
              <div className="mt-8">
                <TaskApprovalFlow
                  plan={currentTaskFlow}
                  onApprove={handleTaskApproval}
                  onReject={handleTaskRejection}
                  onRequestChanges={handleTaskChanges}
                  onComplete={handleTaskFlowComplete}
                />
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

            {/* AI Presence Indicator */}
            {(isProcessing || processingStep) && (
              <div className="fixed bottom-8 right-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full p-4 shadow-2xl flex items-center gap-3 z-40 border-2 border-white/20">
                <div className="relative">
                  <Flower2 className="w-6 h-6 text-white animate-pulse" />
                  <div className="absolute inset-0 bg-white/30 rounded-full animate-ping" />
                </div>
                <span className="text-white font-medium">
                  {processingStep || 'Working on it...'}
                </span>
              </div>
            )}
            
            {/* Assistant Sidebar */}
            <div className="w-96 bg-gradient-to-b from-white to-purple-50/30 rounded-3xl shadow-xl border border-purple-100 overflow-hidden">
              <div className="p-6 bg-gradient-to-r from-purple-100 to-pink-100 border-b border-purple-200">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Brain className="w-6 h-6 text-purple-600" />
                    {(isChatProcessing || isAnalyzing) && (
                      <div className="absolute -inset-1 bg-purple-200 rounded-full animate-ping opacity-75" />
                    )}
                  </div>
                  <div>
                    <span className="font-bold text-gray-800 text-lg">Poppy AI</span>
                    <div className="text-xs text-gray-600">
                      {isAnalyzing ? 'Analyzing your petal...' :
                       isChatProcessing ? 'Crafting ideas...' :
                       'Ready to help you grow'}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Chat Messages */}
              <div className="flex-1 overflow-auto p-6 space-y-4 max-h-96">
                {chatMessages.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Flower2 className="w-16 h-16 mx-auto mb-4 text-purple-300" />
                    <p className="text-lg font-bold mb-2 text-gray-700">Let&apos;s grow something beautiful</p>
                    <p className="text-sm text-gray-500 max-w-[280px] mx-auto leading-relaxed">
                      I&apos;ll help you polish your PRD and make it shine ✨
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Tool Calls */}
                    {currentToolCalls.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-purple-600 uppercase tracking-wide px-1">
                          🌱 Growing ideas...
                        </div>
                        {currentToolCalls.map((toolCall) => (
                          <ToolCallIndicator key={toolCall.id} toolCall={toolCall} />
                        ))}
                      </div>
                    )}
                    
                    {/* Messages and Plans */}
                    {chatMessages.map((message) => (
                      <div key={message.id} className="space-y-3">
                        {/* User Messages */}
                        {message.role === 'user' && (
                          <div className="flex justify-end">
                            <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-3 rounded-2xl max-w-[85%] text-sm shadow-lg">
                              {message.content}
                            </div>
                          </div>
                        )}
                        
                        {/* Assistant Plans */}
                        {message.plan && (
                          <PlanCard
                            plan={message.plan}
                            onAccept={() => handlePlanAction(message.plan!.id, 'accept')}
                            onReject={() => handlePlanAction(message.plan!.id, 'reject')}
                            onImprove={(feedback) => handlePlanAction(message.plan!.id, 'improve', feedback)}
                            isExecuting={message.plan.status === 'in_progress'}
                          />
                        )}
                        
                        {/* Assistant Text Messages - only show if no plan */}
                        {message.content && message.role === 'assistant' && !message.plan && (
                          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-4 text-sm text-gray-800 max-w-[95%] border border-purple-100">
                            {message.content}
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {/* Processing Indicator */}
                    {isChatProcessing && (
                      <div className="flex items-center gap-2 text-purple-600 text-sm bg-purple-50 p-3 rounded-2xl">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Crafting your plan...</span>
                      </div>
                    )}
                    
                    <div ref={chatEndRef} />
                  </>
                )}
              
              </div>
              
              {/* Chat Input */}
              <div className="p-6 border-t border-purple-100 bg-gradient-to-r from-purple-50/50 to-pink-50/50">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleChatSubmit()
                      }
                    }}
                    placeholder={
                      selection ? "How should I polish this?" :
                      documentContent ? "What should we work on?" :
                      "What would you like to grow today?"
                    }
                    className="flex-1 px-4 py-3 border-2 border-purple-200 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm bg-white"
                    disabled={isChatProcessing}
                  />
                  <button
                    onClick={handleChatSubmit}
                    disabled={!chatInput.trim() || isChatProcessing}
                    className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg disabled:opacity-50"
                  >
                    {isChatProcessing ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {selection && (
                  <div className="mt-3 p-3 bg-white rounded-full text-xs text-purple-700 border border-purple-200">
                    ✨ Selected: &quot;{selection.text.substring(0, 50)}...&quot;
                  </div>
                )}
              </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Revision Modal */}
      {revisionPrompt === 'show' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-space-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-space-3">What should be different?</h3>
            <textarea
              value={revisionPrompt === 'show' ? '' : revisionPrompt}
              onChange={(e) => setRevisionPrompt(e.target.value)}
              placeholder="Describe what you want changed..."
              className="w-full p-space-3 border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-poppy-primary"
              rows={4}
              autoFocus
            />
            <div className="flex gap-space-2 mt-space-4">
              <button
                onClick={handleReviseEdit}
                disabled={revisionPrompt === 'show' || !revisionPrompt}
                className="flex-1 px-space-4 py-space-2 bg-poppy-primary text-white rounded-lg hover:bg-poppy-primary-dark transition-smooth disabled:opacity-50"
              >
                Revise
              </button>
              <button
                onClick={() => setRevisionPrompt('')}
                className="px-space-4 py-space-2 border border-border rounded-lg hover:bg-warm-neutral-light transition-smooth"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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