import { Tool } from './types';

export const tools: Record<string, Tool> = {
  // Document Generation Tools
  generateVocabulary: {
    name: 'generateVocabulary',
    description: 'Generate a list of terms that need to be defined for a document',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Document title', required: true },
        query: { type: 'string', description: 'Document query/description', required: true },
        matchedContext: { 
          type: 'array',
          items: { type: 'string' },
          description: 'Relevant context from previous documents'
        },
        type: { type: 'string', description: 'Document type (prd/strategy)' },
        teamTerms: { 
          type: 'object',
          additionalProperties: { type: 'string' },
          description: 'Team-specific terminology'
        }
      }
    },
    execute: async (params) => {
      const response = await fetch('/api/generate-vocabulary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      return response.json();
    }
  },

  generateQuestions: {
    name: 'generateQuestions',
    description: 'Generate questions to help structure a document',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Document title', required: true },
        query: { type: 'string', description: 'Document query/description', required: true },
        matchedContext: { 
          type: 'array',
          items: { type: 'string' },
          description: 'Relevant context from previous documents'
        },
        storedContext: { type: 'string', description: 'User\'s stored context' },
        teamTerms: { 
          type: 'object',
          additionalProperties: { type: 'string' },
          description: 'Team-specific terminology'
        },
        type: { type: 'string', description: 'Document type (prd/strategy)' }
      }
    },
    execute: async (params) => {
      const response = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      return response.json();
    }
  },

  generateContent: {
    name: 'generateContent',
    description: 'Generate document content based on answers to questions',
    parameters: {
      type: 'object',
      properties: {
        type: { type: 'string', description: 'Document type', required: true },
        title: { type: 'string', description: 'Document title', required: true },
        query: { type: 'string', description: 'Document query', required: true },
        teamTerms: { 
          type: 'object',
          additionalProperties: { type: 'string' },
          description: 'Team-specific terminology'
        },
        storedContext: { type: 'string', description: 'User\'s stored context' },
        matchedContext: { 
          type: 'array',
          items: { type: 'string' },
          description: 'Relevant context from previous documents'
        },
        questions: { 
          type: 'array',
          items: { type: 'string' },
          description: 'Questions to answer'
        },
        questionAnswers: { 
          type: 'object',
          additionalProperties: { type: 'string' },
          description: 'Answers to questions'
        }
      }
    },
    execute: async (params) => {
      const response = await fetch('/api/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      return response.json();
    }
  },

  // Document Management Tools
  createGoogleDoc: {
    name: 'createGoogleDoc',
    description: 'Create a new Google Doc with specified content',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Document title', required: true },
        content: { type: 'string', description: 'Document content in markdown', required: true }
      }
    },
    execute: async (params) => {
      const response = await fetch('/api/create-google-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      return response.json();
    }
  },

  getDocumentContent: {
    name: 'getDocumentContent',
    description: 'Retrieve content from a Google Doc',
    parameters: {
      type: 'object',
      properties: {
        documentId: { type: 'string', description: 'Google Doc ID', required: true }
      }
    },
    execute: async (params) => {
      const response = await fetch('/api/get-document-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      return response.json();
    }
  },

  // Context and Embedding Tools
  embedRequest: {
    name: 'embedRequest',
    description: 'Generate embeddings for text input',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to embed' },
        title: { type: 'string', description: 'Optional title for context' },
        query: { type: 'string', description: 'Query to embed' }
      }
    },
    execute: async (params) => {
      const response = await fetch('http://localhost:3000/api/embed-request', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': document.cookie // Forward the session cookie
        },
        credentials: 'include', // Include credentials in the request
        body: JSON.stringify(params)
      });
      return response.json();
    }
  },

  matchEmbeds: {
    name: 'matchEmbeds',
    description: 'Find matching documents based on embeddings',
    parameters: {
      type: 'object',
      properties: {
        embedding: { 
          type: 'array',
          items: { type: 'number' },
          description: 'Vector embedding to match',
          required: true
        },
        useCase: { type: 'string', description: 'Use case for matching' }
      }
    },
    execute: async (params) => {
      const response = await fetch('http://localhost:3000/api/match-embeds', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': document.cookie // Forward the session cookie
        },
        credentials: 'include', // Include credentials in the request
        body: JSON.stringify(params)
      });
      return response.json();
    }
  },

  // Brainstorming and Analysis Tools
  brainstorm: {
    name: 'brainstorm',
    description: 'Engage in a brainstorming session',
    parameters: {
      type: 'object',
      properties: {
        messages: { 
          type: 'array',
          items: { type: 'string' },
          description: 'Chat messages',
          required: true
        },
        additionalContext: { type: 'string', description: 'Additional context' },
        teamTerms: { 
          type: 'object',
          additionalProperties: { type: 'string' },
          description: 'Team-specific terminology'
        },
        storedContext: { type: 'string', description: 'User\'s stored context' },
        startPrd: { type: 'boolean', description: 'Whether to start PRD generation' }
      }
    },
    execute: async (params) => {
      const response = await fetch('/api/brainstorm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      return response.json();
    }
  },

  analyzeDocument: {
    name: 'analyzeDocument',
    description: 'Analyze a document and find relevant matches',
    parameters: {
      type: 'object',
      properties: {
        documentBody: { type: 'string', description: 'Document content to analyze', required: true }
      }
    },
    execute: async (params) => {
      const response = await fetch('/api/analyze-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      return response.json();
    }
  },

  // Calendar and Scheduling Tools
  findAvailability: {
    name: 'findAvailability',
    description: 'Find available time slots for scheduling',
    parameters: {
      type: 'object',
      properties: {
        attendees: { 
          type: 'array',
          items: { type: 'string' },
          description: 'List of attendee emails'
        },
        duration: { type: 'number', description: 'Duration in minutes' },
        startDate: { type: 'string', description: 'Start date for search' },
        endDate: { type: 'string', description: 'End date for search' }
      }
    },
    execute: async (params) => {
      const response = await fetch('/api/google-calendar/find-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      return response.json();
    }
  },

  createCalendarEvent: {
    name: 'createCalendarEvent',
    description: 'Create a new calendar event',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Event title', required: true },
        attendees: { 
          type: 'array',
          items: { type: 'string' },
          description: 'List of attendee emails'
        },
        start: { type: 'string', description: 'Start time', required: true },
        end: { type: 'string', description: 'End time', required: true }
      }
    },
    execute: async (params) => {
      const response = await fetch('/api/google-calendar/create-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      return response.json();
    }
  }
}; 