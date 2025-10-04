'use client'

import React, { useState } from 'react'
import { Flower2, Plus, FileText, Calendar, Users, Sparkles } from 'lucide-react'

interface PetalProps {
  id: string
  name: string
  lastModified?: string
  collaborators?: number
  status?: 'draft' | 'in_review' | 'published'
  color?: string
}

interface PetalGardenProps {
  onSelectPetal: (petal: { id: string; name: string }) => void
}

// Mock recent petals data
const mockPetals: PetalProps[] = [
  {
    id: '1',
    name: 'User Authentication Redesign',
    lastModified: '2 hours ago',
    collaborators: 3,
    status: 'in_review',
    color: 'bg-gradient-to-br from-pink-400 to-rose-500'
  },
  {
    id: '2', 
    name: 'Mobile App Performance Optimization',
    lastModified: '1 day ago',
    collaborators: 5,
    status: 'draft',
    color: 'bg-gradient-to-br from-purple-400 to-violet-500'
  },
  {
    id: '3',
    name: 'Analytics Dashboard v2.0',
    lastModified: '3 days ago',
    collaborators: 2,
    status: 'published',
    color: 'bg-gradient-to-br from-blue-400 to-cyan-500'
  },
  {
    id: '4',
    name: 'Customer Feedback Integration',
    lastModified: '1 week ago',
    collaborators: 4,
    status: 'draft',
    color: 'bg-gradient-to-br from-green-400 to-emerald-500'
  },
  {
    id: '5',
    name: 'AI-Powered Search Features',
    lastModified: '2 weeks ago',
    collaborators: 6,
    status: 'in_review',
    color: 'bg-gradient-to-br from-orange-400 to-red-500'
  }
]

const PetalCard = ({ petal, onClick }: { petal: PetalProps; onClick: () => void }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'in_review': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'published': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <button
      onClick={onClick}
      className="group relative bg-white rounded-3xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-gray-100 hover:border-purple-200 hover:-translate-y-2 transform w-full text-left overflow-hidden"
    >
      {/* Decorative gradient background */}
      <div className={`absolute top-0 right-0 w-20 h-20 ${petal.color} rounded-full opacity-10 group-hover:opacity-20 transition-opacity -mr-8 -mt-8`}></div>
      
      {/* Petal icon */}
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-12 h-12 ${petal.color} rounded-2xl flex items-center justify-center shadow-lg`}>
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(petal.status || 'draft')}`}>
            {petal.status?.replace('_', ' ')}
          </div>
        </div>
        
        <h3 className="font-bold text-gray-800 text-lg mb-3 leading-tight group-hover:text-purple-700 transition-colors">
          {petal.name}
        </h3>
        
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {petal.lastModified}
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            {petal.collaborators}
          </div>
        </div>
        
        {/* Hover indicator */}
        <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center shadow-lg">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>
    </button>
  )
}

const CreateNewPetal = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    className="group relative bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-dashed border-purple-300 rounded-3xl p-8 hover:border-purple-400 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 transform w-full min-h-[200px] flex flex-col items-center justify-center"
  >
    <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg">
      <Plus className="w-8 h-8 text-white" />
    </div>
    
    <h3 className="font-bold text-gray-700 text-lg mb-2 group-hover:text-purple-700 transition-colors">
      Plant a New Petal
    </h3>
    
    <p className="text-gray-500 text-sm text-center max-w-[200px] leading-relaxed">
      Start fresh with a new PRD or idea to nurture into a beautiful feature
    </p>
    
    {/* Decorative dots */}
    <div className="absolute top-4 right-4 flex gap-1">
      <div className="w-2 h-2 bg-purple-300 rounded-full group-hover:bg-purple-400 transition-colors"></div>
      <div className="w-2 h-2 bg-pink-300 rounded-full group-hover:bg-pink-400 transition-colors"></div>
    </div>
  </button>
)

export default function PetalGarden({ onSelectPetal }: PetalGardenProps) {
  const [showDocumentPicker, setShowDocumentPicker] = useState(false)

  const handlePetalSelect = (petal: PetalProps) => {
    onSelectPetal({ id: petal.id, name: petal.name })
  }

  const handleCreateNew = () => {
    setShowDocumentPicker(true)
  }

  return (
    <div className="relative">
      {/* Garden Header */}
      <div className="text-center mb-12">
        <div className="relative inline-block">
          <Flower2 className="w-20 h-20 text-purple-400 mx-auto mb-6" />
          <div className="absolute inset-0 w-20 h-20 bg-purple-200 rounded-full animate-pulse opacity-30 mx-auto"></div>
        </div>
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Your Petal Garden</h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Each petal represents a feature you&apos;re growing. Pick up where you left off, or plant something new.
        </p>
      </div>

      {/* Recent Petals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
        <CreateNewPetal onClick={handleCreateNew} />
        {mockPetals.map((petal) => (
          <PetalCard
            key={petal.id}
            petal={petal}
            onClick={() => handlePetalSelect(petal)}
          />
        ))}
      </div>

      {/* Quick Stats */}
      <div className="bg-gradient-to-r from-purple-50 via-pink-50 to-orange-50 rounded-3xl p-8 border border-purple-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div>
            <div className="text-3xl font-bold text-purple-600 mb-2">{mockPetals.length}</div>
            <div className="text-gray-600">Active Petals</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-pink-600 mb-2">
              {mockPetals.filter(p => p.status === 'in_review').length}
            </div>
            <div className="text-gray-600">In Review</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-orange-600 mb-2">
              {mockPetals.filter(p => p.status === 'published').length}
            </div>
            <div className="text-gray-600">Bloomed</div>
          </div>
        </div>
      </div>

      {/* Document Picker Modal */}
      {showDocumentPicker && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-4xl w-full max-h-[80vh] overflow-auto shadow-2xl border border-purple-100">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Choose Your Seed</h2>
              <p className="text-gray-600">Select a PRD or document to start growing your new petal</p>
            </div>
            
            {/* This would be replaced with actual GoogleDocumentPicker */}
            <div className="min-h-[300px] bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 flex items-center justify-center border-2 border-dashed border-purple-200">
              <div className="text-center">
                <FileText className="w-16 h-16 text-purple-300 mx-auto mb-4" />
                <p className="text-gray-500">Google Documents integration would appear here</p>
              </div>
            </div>
            
            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setShowDocumentPicker(false)}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-2xl hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Mock selection
                  onSelectPetal({ id: 'new-doc', name: 'New Feature PRD' })
                  setShowDocumentPicker(false)
                }}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg font-medium"
              >
                Start Growing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}