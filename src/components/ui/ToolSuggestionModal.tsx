'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ExternalLink, 
  Plus, 
  X, 
  Check,
  Link as LinkIcon,
  Sparkles
} from 'lucide-react'
import { DetectedTool, getToolInfo, categorizeToolsForFeature } from '@/lib/toolUrlDetection'

interface ToolSuggestionModalProps {
  isOpen: boolean
  onClose: () => void
  detectedTools: DetectedTool[]
  suggestionMessage: string
  onAddToFeature: (tools: DetectedTool[]) => void
  onAddToHub?: (tools: DetectedTool[]) => void
  featureTitle?: string
}

export default function ToolSuggestionModal({
  isOpen,
  onClose,
  detectedTools,
  suggestionMessage,
  onAddToFeature,
  onAddToHub,
  featureTitle
}: ToolSuggestionModalProps) {
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set(detectedTools.map(t => t.url)))
  const [isAdding, setIsAdding] = useState(false)

  const categorizedTools = categorizeToolsForFeature(detectedTools)

  const toggleToolSelection = (url: string) => {
    const newSelected = new Set(selectedTools)
    if (newSelected.has(url)) {
      newSelected.delete(url)
    } else {
      newSelected.add(url)
    }
    setSelectedTools(newSelected)
  }

  const handleAddToFeature = async () => {
    const toolsToAdd = detectedTools.filter(tool => selectedTools.has(tool.url))
    setIsAdding(true)
    
    try {
      await onAddToFeature(toolsToAdd)
      onClose()
    } catch (error) {
      console.error('Error adding tools to feature:', error)
    } finally {
      setIsAdding(false)
    }
  }

  const handleAddToHub = async () => {
    const toolsToAdd = detectedTools.filter(tool => selectedTools.has(tool.url))
    setIsAdding(true)
    
    try {
      await onAddToHub?.(toolsToAdd)
      onClose()
    } catch (error) {
      console.error('Error adding tools to hub:', error)
    } finally {
      setIsAdding(false)
    }
  }

  const renderToolCard = (tool: DetectedTool) => {
    const toolInfo = getToolInfo(tool.type)
    const isSelected = selectedTools.has(tool.url)

    return (
      <div
        key={tool.url}
        className={`p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
          isSelected 
            ? 'border-poppy bg-poppy/5' 
            : 'border-gray-200 hover:border-gray-300 bg-white'
        }`}
        onClick={() => toggleToolSelection(tool.url)}
      >
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${toolInfo.color}`}>
            {toolInfo.icon}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-gray-900">{tool.title || toolInfo.name}</span>
              <Badge variant="outline" className="text-xs">{toolInfo.name}</Badge>
              {isSelected && <Check className="w-4 h-4 text-poppy flex-shrink-0" />}
            </div>
            
            {tool.description && (
              <p className="text-sm text-gray-600 mb-2">{tool.description}</p>
            )}
            
            <div className="flex items-center gap-2">
              <LinkIcon className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-500 font-mono truncate">{tool.url}</span>
              <a 
                href={tool.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-600"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderCategory = (title: string, tools: DetectedTool[], icon: React.ReactNode) => {
    if (tools.length === 0) return null

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {icon}
          <h4 className="font-medium text-gray-900">{title}</h4>
          <Badge variant="secondary" className="text-xs">{tools.length}</Badge>
        </div>
        <div className="space-y-2">
          {tools.map(renderToolCard)}
        </div>
      </div>
    )
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl">
              <CardHeader className="border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-poppy/10 rounded-xl flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-poppy" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Add Tools to Feature Hub</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">{suggestionMessage}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={onClose}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-6 overflow-y-auto">
                <div className="space-y-6">
                  {renderCategory(
                    "Design", 
                    categorizedTools.design, 
                    <div className="w-5 h-5 bg-purple-100 rounded flex items-center justify-center">
                      🎨
                    </div>
                  )}
                  
                  {renderCategory(
                    "Engineering", 
                    categorizedTools.engineering,
                    <div className="w-5 h-5 bg-blue-100 rounded flex items-center justify-center">
                      🔧
                    </div>
                  )}
                  
                  {renderCategory(
                    "Communication", 
                    categorizedTools.communication,
                    <div className="w-5 h-5 bg-green-100 rounded flex items-center justify-center">
                      💬
                    </div>
                  )}
                  
                  {renderCategory(
                    "Documentation", 
                    categorizedTools.documentation,
                    <div className="w-5 h-5 bg-yellow-100 rounded flex items-center justify-center">
                      📄
                    </div>
                  )}
                </div>

                {featureTitle && (
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Plus className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-blue-900">Adding to Feature</span>
                    </div>
                    <p className="text-sm text-blue-700">{featureTitle}</p>
                  </div>
                )}
              </CardContent>

              <div className="border-t border-gray-200 p-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    {selectedTools.size} of {detectedTools.length} tools selected
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" onClick={onClose}>
                      Cancel
                    </Button>
                    
                    {onAddToHub && (
                      <Button
                        variant="outline"
                        onClick={handleAddToHub}
                        disabled={selectedTools.size === 0 || isAdding}
                        className="flex items-center gap-2"
                      >
                        <LinkIcon className="w-4 h-4" />
                        Add to Hub
                      </Button>
                    )}
                    
                    <Button
                      variant="poppy"
                      onClick={handleAddToFeature}
                      disabled={selectedTools.size === 0 || isAdding}
                      className="flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      {isAdding ? 'Adding...' : 'Add to Feature'}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}