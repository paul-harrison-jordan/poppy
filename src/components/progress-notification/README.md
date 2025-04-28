# Progress Notification Component

A clean, animated progress notification component for Next.js projects.

## Features

- Real-time progress tracking
- Smooth animations with Framer Motion
- Auto-dismissal on completion
- Customizable positioning
- TypeScript support
- Responsive design

## Installation

1. Copy the `progress-notification` folder to your project's components directory
2. Install dependencies if needed:

\`\`\`bash
npm install framer-motion lucide-react
# or
yarn add framer-motion lucide-react
\`\`\`

## Basic Usage

\`\`\`tsx
import { useState } from 'react'
import { ProgressNotification, type Document } from '@/components/progress-notification'

export default function YourComponent() {
  const [isLoading, setIsLoading] = useState(false)
  const [documents, setDocuments] = useState<Document[]>([
    { id: '1', name: 'Document 1.pdf', synced: false },
    { id: '2', name: 'Document 2.docx', synced: false },
  ])

  const startSync = () => {
    setIsLoading(true)
    // Your sync logic here
    // Update document.synced to true as they complete
  }

  const handleComplete = () => {
    setIsLoading(false)
    // Handle completion
  }

  return (
    <div>
      <button onClick={startSync}>Start Sync</button>
      
      <ProgressNotification
        isLoading={isLoading}
        documents={documents}
        onComplete={handleComplete}
        position="top-right"
      />
    </div>
  )
}
\`\`\`

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isLoading` | boolean | required | Controls whether the notification is active |
| `documents` | Document[] | required | Array of documents to display |
| `onComplete` | () => void | optional | Callback when all documents are synced |
| `onDismiss` | () => void | optional | Callback when notification is dismissed |
| `position` | string | "top-right" | Position of the notification |

## Document Type

\`\`\`tsx
interface Document {
  id: string
  name: string
  synced: boolean
}
\`\`\`

## Helper Functions

The component comes with helper functions in `helpers.ts` to convert API responses to the required format:

\`\`\`tsx
import { convertApiResponseToDocuments, updateDocumentStatus } from '@/components/progress-notification/helpers'

// Convert initial API response
const documents = convertApiResponseToDocuments(apiResponse)

// Update a document's status
const updatedDocuments = updateDocumentStatus(documents, syncResponse)
\`\`\`

## Customization

You can customize the appearance by modifying the component's CSS classes. The component uses Tailwind CSS by default.
