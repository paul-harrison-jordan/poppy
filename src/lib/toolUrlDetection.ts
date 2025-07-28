// Tool URL detection and integration utilities

export interface ToolMetadata {
  [key: string]: string | number | boolean | undefined;
}

export interface DetectedTool {
  type: 'figma' | 'jira' | 'slack' | 'github' | 'notion' | 'google_docs' | 'v0' | 'linear' | 'asana'
  url: string
  title?: string
  description?: string
  metadata?: ToolMetadata
}

export interface ToolPattern {
  type: DetectedTool['type']
  pattern: RegExp
  name: string
  icon: string
  color: string
  extractMetadata?: (url: string, match: RegExpMatchArray) => ToolMetadata
}

const toolPatterns: ToolPattern[] = [
  {
    type: 'figma',
    pattern: /https:\/\/(www\.)?figma\.com\/(file|proto|design)\/([a-zA-Z0-9]+)/,
    name: 'Figma',
    icon: '🎨',
    color: 'bg-purple-50 text-purple-700 border-purple-200',
    extractMetadata: (url, match) => ({
      fileId: match[3],
      isPrototype: match[2] === 'proto'
    })
  },
  {
    type: 'jira',
    pattern: /https:\/\/([a-zA-Z0-9-]+)\.atlassian\.net\/browse\/([A-Z]+-\d+)/,
    name: 'Jira',
    icon: '🔷',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    extractMetadata: (url, match) => ({
      domain: match[1],
      ticketKey: match[2]
    })
  },
  {
    type: 'slack',
    pattern: /https:\/\/([a-zA-Z0-9-]+)\.slack\.com\/(archives|thread)\/([a-zA-Z0-9]+)/,
    name: 'Slack',
    icon: '💬',
    color: 'bg-green-50 text-green-700 border-green-200',
    extractMetadata: (url, match) => ({
      workspace: match[1],
      channelId: match[3],
      isThread: match[2] === 'thread'
    })
  },
  {
    type: 'github',
    pattern: /https:\/\/github\.com\/([a-zA-Z0-9-_.]+)\/([a-zA-Z0-9-_.]+)/,
    name: 'GitHub',
    icon: '🐙',
    color: 'bg-gray-50 text-gray-700 border-gray-200',
    extractMetadata: (url, match) => ({
      owner: match[1],
      repo: match[2]
    })
  },
  {
    type: 'notion',
    pattern: /https:\/\/(www\.)?notion\.so\/([a-zA-Z0-9-]+)/,
    name: 'Notion',
    icon: '📝',
    color: 'bg-gray-50 text-gray-700 border-gray-200',
    extractMetadata: (url, match) => ({
      pageId: match[2]
    })
  },
  {
    type: 'google_docs',
    pattern: /https:\/\/docs\.google\.com\/(document|spreadsheets|presentation)\/d\/([a-zA-Z0-9-_]+)/,
    name: 'Google Docs',
    icon: '📄',
    color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    extractMetadata: (url, match) => ({
      docType: match[1],
      docId: match[2]
    })
  },
  {
    type: 'v0',
    pattern: /https:\/\/v0\.dev\/(t|chat)\/([a-zA-Z0-9-_]+)/,
    name: 'v0',
    icon: '⚡',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    extractMetadata: (url, match) => ({
      type: match[1] === 't' ? 'template' : 'chat',
      id: match[2]
    })
  },
  {
    type: 'linear',
    pattern: /https:\/\/linear\.app\/([a-zA-Z0-9-]+)\/issue\/([A-Z]+-\d+)/,
    name: 'Linear',
    icon: '🚀',
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    extractMetadata: (url, match) => ({
      team: match[1],
      issueKey: match[2]
    })
  },
  {
    type: 'asana',
    pattern: /https:\/\/app\.asana\.com\/0\/(\d+)\/(\d+)/,
    name: 'Asana',
    icon: '🎯',
    color: 'bg-pink-50 text-pink-700 border-pink-200',
    extractMetadata: (url, match) => ({
      projectId: match[1],
      taskId: match[2]
    })
  }
]

export function detectToolUrls(text: string): DetectedTool[] {
  const detected: DetectedTool[] = []
  
  for (const pattern of toolPatterns) {
    const matches = text.matchAll(new RegExp(pattern.pattern, 'g'))
    
    for (const match of matches) {
      const url = match[0]
      const metadata = pattern.extractMetadata ? pattern.extractMetadata(url, match) : {}
      
      detected.push({
        type: pattern.type,
        url,
        metadata
      })
    }
  }
  
  return detected
}

export function getToolInfo(type: DetectedTool['type']): ToolPattern {
  const pattern = toolPatterns.find(p => p.type === type)
  if (!pattern) {
    throw new Error(`Unknown tool type: ${type}`)
  }
  return pattern
}

export function generateToolSuggestionMessage(tools: DetectedTool[]): string {
  if (tools.length === 0) return ''
  
  const toolCounts = tools.reduce((acc, tool) => {
    acc[tool.type] = (acc[tool.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  const toolNames = Object.entries(toolCounts).map(([type, count]) => {
    const pattern = getToolInfo(type as DetectedTool['type'])
    return count > 1 ? `${count} ${pattern.name} links` : `${pattern.name}`
  })
  
  if (toolNames.length === 1) {
    return `I found a ${toolNames[0]} link. Would you like me to add it to your feature hub?`
  } else if (toolNames.length === 2) {
    return `I found ${toolNames[0]} and ${toolNames[1]} links. Would you like me to add them to your feature hub?`
  } else {
    const last = toolNames.pop()
    return `I found ${toolNames.join(', ')}, and ${last} links. Would you like me to add them to your feature hub?`
  }
}

export async function enrichToolMetadata(tool: DetectedTool): Promise<DetectedTool> {
  // In a real implementation, this would make API calls to get additional metadata
  // For now, we'll just add some mock enrichment based on the tool type
  
  const enriched = { ...tool }
  
  switch (tool.type) {
    case 'figma':
      enriched.title = 'Design File'
      enriched.description = 'Figma design file with interactive components'
      break
    case 'jira':
      enriched.title = String(tool.metadata?.ticketKey || 'Jira Ticket')
      enriched.description = 'Issue tracking and project management'
      break
    case 'slack':
      enriched.title = tool.metadata?.isThread ? 'Slack Thread' : 'Slack Channel'
      enriched.description = 'Team communication and discussion'
      break
    case 'github':
      enriched.title = `${String(tool.metadata?.owner || '')}/${String(tool.metadata?.repo || '')}`
      enriched.description = 'Source code repository'
      break
    case 'notion':
      enriched.title = 'Notion Page'
      enriched.description = 'Documentation and notes'
      break
    case 'google_docs':
      const docType = tool.metadata?.docType === 'document' ? 'Document' : 
                    tool.metadata?.docType === 'spreadsheets' ? 'Spreadsheet' : 'Presentation'
      enriched.title = `Google ${docType}`
      enriched.description = 'Collaborative document'
      break
    case 'v0':
      enriched.title = tool.metadata?.type === 'template' ? 'v0 Component' : 'v0 Chat'
      enriched.description = 'AI-generated UI component'
      break
    case 'linear':
      enriched.title = String(tool.metadata?.issueKey || 'Linear Issue')
      enriched.description = 'Issue tracking'
      break
    case 'asana':
      enriched.title = 'Asana Task'
      enriched.description = 'Project management task'
      break
  }
  
  return enriched
}

export function categorizeToolsForFeature(tools: DetectedTool[]): {
  design: DetectedTool[]
  engineering: DetectedTool[]
  communication: DetectedTool[]
  documentation: DetectedTool[]
} {
  return {
    design: tools.filter(t => ['figma', 'v0'].includes(t.type)),
    engineering: tools.filter(t => ['jira', 'github', 'linear', 'asana'].includes(t.type)),
    communication: tools.filter(t => ['slack'].includes(t.type)),
    documentation: tools.filter(t => ['notion', 'google_docs'].includes(t.type))
  }
}

export class ToolUrlWatcher {
  private listeners: Array<(tools: DetectedTool[]) => void> = []
  private watchedElements: WeakSet<HTMLElement> = new WeakSet()
  
  watch(element: HTMLElement) {
    if (this.watchedElements.has(element)) return
    
    this.watchedElements.add(element)
    
    const handleInput = async (event: Event) => {
      const target = event.target as HTMLInputElement | HTMLTextAreaElement
      if (!target.value) return
      
      const tools = detectToolUrls(target.value)
      if (tools.length > 0) {
        const enrichedTools = await Promise.all(tools.map(enrichToolMetadata))
        this.notifyListeners(enrichedTools)
      }
    }
    
    element.addEventListener('input', handleInput)
    element.addEventListener('paste', (event) => {
      // Handle paste with a small delay to let the content be pasted
      setTimeout(() => handleInput(event), 100)
    })
  }
  
  onToolsDetected(callback: (tools: DetectedTool[]) => void) {
    this.listeners.push(callback)
  }
  
  private notifyListeners(tools: DetectedTool[]) {
    this.listeners.forEach(listener => listener(tools))
  }
}