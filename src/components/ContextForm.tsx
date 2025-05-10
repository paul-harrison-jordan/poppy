'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Toast from './Toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";

interface FormData {
  teamStrategy: string;
  howYouThinkAboutProduct: string;
  pillarGoalsKeyTermsBackground: string;
  examplesOfHowYouThink: string;
}

const defaultFormData: FormData = {
  teamStrategy: '',
  howYouThinkAboutProduct: '',
  pillarGoalsKeyTermsBackground: '',
  examplesOfHowYouThink: '',
};

interface ContextFormProps {
  onComplete?: () => void;
}

export default function ContextForm({ onComplete }: ContextFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [editField, setEditField] = useState<keyof FormData | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showGetStarted, setShowGetStarted] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('personalContext');
      if (stored) {
        try {
          setFormData({ ...defaultFormData, ...JSON.parse(stored) });
        } catch {}
      }
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('personalContext', JSON.stringify(formData));
    setToastMessage('Context updated successfully!');
    setShowToast(true);
    setShowGetStarted(true);
    
    // Call onComplete if provided
    if (onComplete) {
      onComplete();
    }
  };

  const handleEditClick = (field: keyof FormData) => {
    setEditField(field);
    setEditValue(formData[field]);
  };

  const handleEditSave = () => {
    setFormData(prev => ({ ...prev, [editField!]: editValue }));
    setEditField(null);
    setEditValue("");
  };

  const handleEditCancel = () => {
    setEditField(null);
    setEditValue("");
  };

  const handleGetStarted = () => {
    localStorage.setItem('onboardingComplete', 'true');
    router.push('/');
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-neutral p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <h1 className="text-3xl font-bold text-primary font-sans mb-2 text-center">
            Personal Context
          </h1>
          <p className="text-sm text-gray-500 text-center mb-4">
            Fill out as much as you can. This context will help generate better PRDs.
          </p>
          <div className="space-y-6">
            <div>
              <label htmlFor="teamStrategy" className="block font-medium text-gray-900 mb-1">
                Team Strategy
              </label>
              <div className="flex gap-2 items-start">
                <textarea
                  id="teamStrategy"
                  name="teamStrategy"
                  value={formData.teamStrategy}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full rounded-xl border border-neutral bg-white/90 backdrop-blur-sm px-4 py-3 text-primary shadow-sm focus:ring-2 focus:ring-poppy focus:outline-none resize-vertical"
                  placeholder="Provide the text of the best strategy document you have for your product area, or provide a view of where you want your product to be a year from now"
                  required
                  readOnly
                />
                <button
                  type="button"
                  className="ml-2 px-3 py-2 rounded-xl bg-poppy text-white font-semibold shadow-sm hover:bg-poppy/90 focus:outline-none focus:ring-2 focus:ring-poppy"
                  onClick={() => handleEditClick("teamStrategy")}
                >
                  Edit
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="howYouThinkAboutProduct" className="block font-medium text-gray-900 mb-1">
                How you think about Product
              </label>
              <div className="flex gap-2 items-start">
                <textarea
                  id="howYouThinkAboutProduct"
                  name="howYouThinkAboutProduct"
                  value={formData.howYouThinkAboutProduct}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full rounded-xl border border-neutral bg-white/90 backdrop-blur-sm px-4 py-3 text-primary shadow-sm focus:ring-2 focus:ring-poppy focus:outline-none resize-vertical"
                  placeholder="Give a few examples of how you've solved problems in the past with your product area, and how you generally approach developing your product area. This will help give ChatPRD of how you think about developing your product area."
                  required
                  readOnly
                />
                <button
                  type="button"
                  className="ml-2 px-3 py-2 rounded-xl bg-poppy text-white font-semibold shadow-sm hover:bg-poppy/90 focus:outline-none focus:ring-2 focus:ring-poppy"
                  onClick={() => handleEditClick("howYouThinkAboutProduct")}
                >
                  Edit
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="pillarGoalsKeyTermsBackground" className="block font-medium text-gray-900 mb-1">
                Pillar Goals, Key Terms, and Background
              </label>
              <div className="flex gap-2 items-start">
                <textarea
                  id="pillarGoalsKeyTermsBackground"
                  name="pillarGoalsKeyTermsBackground"
                  value={formData.pillarGoalsKeyTermsBackground}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full rounded-xl border border-neutral bg-white/90 backdrop-blur-sm px-4 py-3 text-primary shadow-sm focus:ring-2 focus:ring-poppy focus:outline-none resize-vertical"
                  placeholder="Provide context about the teams in your pillar, how you're product area fits into that pillar achieving the business goals, and any other background information that will help ChatPRD understand the bigger picture and write a better PRD."
                  required
                  readOnly
                />
                <button
                  type="button"
                  className="ml-2 px-3 py-2 rounded-xl bg-poppy text-white font-semibold shadow-sm hover:bg-poppy/90 focus:outline-none focus:ring-2 focus:ring-poppy"
                  onClick={() => handleEditClick("pillarGoalsKeyTermsBackground")}
                >
                  Edit
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="examplesOfHowYouThink" className="block font-medium text-gray-900 mb-1">
                Annotated Example PRD
              </label>
              <div className="flex gap-2 items-start">
                <textarea
                  id="examplesOfHowYouThink"
                  name="examplesOfHowYouThink"
                  value={formData.examplesOfHowYouThink}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full rounded-xl border border-neutral bg-white/90 backdrop-blur-sm px-4 py-3 text-primary shadow-sm focus:ring-2 focus:ring-poppy focus:outline-none resize-vertical"
                  placeholder="Paste the markdown text of an example PRD that has additional context written by you explaining why you wrote things the way you did, and why the structure of the document is important. The more you provide about how you think and why the PRD looks the way it does, the better your results will be."
                  required
                  readOnly
                />
                <button
                  type="button"
                  className="ml-2 px-3 py-2 rounded-xl bg-poppy text-white font-semibold shadow-sm hover:bg-poppy/90 focus:outline-none focus:ring-2 focus:ring-poppy"
                  onClick={() => handleEditClick("examplesOfHowYouThink")}
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
          <div className="flex justify-center">
            <button
              type="submit"
              className="rounded-full bg-poppy text-white font-semibold px-6 py-3 shadow-sm hover:bg-poppy/90 transition-all font-sans"
            >
              Save
            </button>
          </div>
        </form>
      </div>
      {showToast && (
        <Toast
          message={toastMessage}
          onClose={() => setShowToast(false)}
        />
      )}
      {editField && (
        <Dialog open={!!editField} onOpenChange={handleEditCancel}>
          <DialogContent className="sm:max-w-[600px] bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-neutral p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-[#232426]">
                Edit {(() => {
                  switch (editField) {
                    case "teamStrategy": return "Team Strategy";
                    case "howYouThinkAboutProduct": return "How you think about Product";
                    case "pillarGoalsKeyTermsBackground": return "Pillar Goals, Key Terms, and Background";
                    case "examplesOfHowYouThink": return "Annotated Example PRD";
                    default: return "";
                  }
                })()}
              </DialogTitle>
            </DialogHeader>
            <textarea
              className="w-full rounded-xl border border-neutral bg-white/90 px-4 py-3 text-primary shadow-sm focus:ring-2 focus:ring-poppy focus:outline-none resize-vertical min-h-[10rem]"
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              rows={10}
              autoFocus
            />
            <DialogFooter className="flex justify-end gap-2 mt-4">
              <DialogClose asChild>
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  onClick={handleEditCancel}
                >
                  Cancel
                </button>
              </DialogClose>
              <button
                type="button"
                className="px-4 py-2 rounded-xl bg-poppy text-white font-semibold shadow-sm hover:bg-poppy/90 focus:outline-none focus:ring-2 focus:ring-poppy"
                onClick={handleEditSave}
              >
                Save
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {showGetStarted && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-neutral p-6 text-center">
          <p className="text-gray-700 mb-4">Great! Your context has been saved. Ready to start writing PRDs?</p>
          <button
            onClick={handleGetStarted}
            className="px-8 py-3 rounded-xl bg-poppy text-white font-semibold shadow-sm hover:bg-poppy/90 focus:outline-none focus:ring-2 focus:ring-poppy"
          >
            Get Started
          </button>
        </div>
      )}
    </div>
  );
} 