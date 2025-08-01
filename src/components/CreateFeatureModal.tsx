'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { X, Lightbulb, FileText } from 'lucide-react';

interface CreateFeatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFeatureCreated: (feature: { id: number; title: string; description: string }) => void;
}

export default function CreateFeatureModal({ isOpen, onClose, onFeatureCreated }: CreateFeatureModalProps) {
  const { data: session } = useSession();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !session?.user?.email) return;

    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const nextStep = formData.get('nextStep') as string;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/roadmap/create-feature', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
        }),
      });

      if (response.ok) {
        const feature = await response.json();
        onFeatureCreated(feature);
        setTitle('');
        setDescription('');
        onClose();

        // Handle next step
        if (nextStep === 'prd') {
          // Open chat in PRD mode with the feature details
          window.open(`/?mode=prd&feature_title=${encodeURIComponent(title.trim())}&feature_description=${encodeURIComponent(description.trim())}`, '_blank');
        }
      } else {
        console.error('Failed to create feature');
      }
    } catch (error) {
      console.error('Error creating feature:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-poppy-primary-light rounded-lg">
              <Lightbulb className="w-5 h-5 text-poppy-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-poppy-primary">Create New Feature</h2>
              <p className="text-sm text-warm-neutral">Start with a simple idea and expand later</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Title Input */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Feature Title *
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., User Dashboard Redesign, Mobile Payment Flow, Smart Notifications..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-poppy-primary/20 focus:border-poppy-primary"
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Description Input */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Brief Description <span className="text-gray-500">(optional)</span>
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What problem does this solve? What's the main user benefit? Keep it brief - you can expand this later."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-poppy-primary/20 focus:border-poppy-primary resize-none"
                disabled={isSubmitting}
              />
            </div>

            {/* Next Steps Options */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">What would you like to do after creating this feature?</h3>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input type="radio" name="nextStep" value="prd" className="mr-3" defaultChecked />
                  <span className="flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4 text-poppy-primary" />
                    Start writing the PRD immediately
                  </span>
                </label>
                <label className="flex items-center">
                  <input type="radio" name="nextStep" value="later" className="mr-3" />
                  <span className="flex items-center gap-2 text-sm">
                    <Lightbulb className="w-4 h-4 text-gray-500" />
                    Just capture the idea for now
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || isSubmitting}
              className="px-6 py-2 bg-poppy-primary text-poppy-primary-foreground rounded-lg font-medium hover:bg-poppy-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Creating...' : 'Create Feature'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}