"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import KeyTermsForm from "@/components/KeyTermsForm";

interface TeamTerms {
  [term: string]: string;
}

export default function KeyTermsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [terms, setTerms] = useState<TeamTerms>({});
  const [editingTerm, setEditingTerm] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [searchQuery] = useState("");
  const [setCurrentPage] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTerm, setNewTerm] = useState("");
  const [newDefinition, setNewDefinition] = useState("");
  const [addError, setAddError] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("teamTerms");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setTerms(parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {});
        } catch {
          setTerms({});
        }
      } else {
        setTerms({});
      }
    }
  }, []);

  const handleSave = (term: string) => {
    const updatedTerms = { ...terms, [term]: editValue };
    setTerms(updatedTerms);
    localStorage.setItem("teamTerms", JSON.stringify(updatedTerms));
    setEditingTerm(null);
    setEditValue("");
    setIsEditModalOpen(false);
  };

  const handleCancel = () => {
    setEditingTerm(null);
    setEditValue("");
    setIsEditModalOpen(false);
  };

  const handleSaveNew = () => {
    const trimmedTerm = newTerm.trim();
    const trimmedDef = newDefinition.trim();
    if (!trimmedTerm || !trimmedDef) {
      setAddError("Both term and definition are required.");
      return;
    }
    if (terms.hasOwnProperty(trimmedTerm)) {
      setAddError("This term already exists.");
      return;
    }
    const updatedTerms = { ...terms, [trimmedTerm]: trimmedDef };
    setTerms(updatedTerms);
    localStorage.setItem("teamTerms", JSON.stringify(updatedTerms));
    setIsAddModalOpen(false);
    setNewTerm("");
    setNewDefinition("");
    setAddError("");
  };


  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#FFFAF3] flex items-center justify-center">
        <div className="text-[#232426] animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const handleKeyTermsComplete = () => {
    // Mark the key terms step as complete
    const completedSteps = JSON.parse(localStorage.getItem('completedSteps') || '[]');
    if (!completedSteps.includes('terms')) {
      completedSteps.push('terms');
      localStorage.setItem('completedSteps', JSON.stringify(completedSteps));
    }
    router.push('/onboarding');
  };

  return (
    <div className="min-h-screen bg-[#FFFAF3]">
      <Sidebar />
      <div className="ml-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center min-h-[calc(100vh-4rem)]">
            <div className="w-full max-w-4xl space-y-8">
              <KeyTermsForm onComplete={handleKeyTermsComplete} />
            </div>
          </div>
        </div>
      </div>
      {/* Edit Definition Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[600px] bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-rose-100/30 p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-[#232426]">Edit Definition</DialogTitle>
          </DialogHeader>
          <div className="mb-4">
            <div className="font-medium text-gray-900 mb-2">{editingTerm}</div>
            <textarea
              className="w-full rounded-xl border border-rose-100 bg-white/90 backdrop-blur-sm px-4 py-3 text-gray-800 shadow-sm focus:border-rose-200 focus:outline-none focus:ring-1 focus:ring-rose-200 resize-vertical min-h-[8rem]"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              autoFocus
              rows={6}
              placeholder="Enter definition..."
            />
          </div>
          <DialogFooter>
            <button
              className="px-4 py-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-400 text-white font-semibold shadow-sm hover:from-rose-600 hover:to-pink-500 transition-colors"
              onClick={() => editingTerm && handleSave(editingTerm)}
              disabled={!editValue.trim()}
            >
              Save
            </button>
            <DialogClose asChild>
              <button
                className="px-4 py-2 rounded-full bg-white border border-rose-200 text-rose-500 font-medium hover:bg-rose-50/70 transition-colors"
                onClick={handleCancel}
                type="button"
              >
                Cancel
              </button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Add New Key Term Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[600px] bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-rose-100/30 p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-[#232426]">Add New Key Term</DialogTitle>
          </DialogHeader>
          <div className="mb-4">
            <input
              type="text"
              className="w-full rounded-xl border border-rose-100 bg-white/90 backdrop-blur-sm px-4 py-3 text-gray-800 shadow-sm focus:border-rose-200 focus:outline-none focus:ring-1 focus:ring-rose-200 mb-3"
              value={newTerm}
              onChange={e => setNewTerm(e.target.value)}
              placeholder="Term"
              autoFocus
              maxLength={64}
            />
            <textarea
              className="w-full rounded-xl border border-rose-100 bg-white/90 backdrop-blur-sm px-4 py-3 text-gray-800 shadow-sm focus:border-rose-200 focus:outline-none focus:ring-1 focus:ring-rose-200 resize-vertical min-h-[6rem]"
              value={newDefinition}
              onChange={e => setNewDefinition(e.target.value)}
              rows={4}
              placeholder="Definition"
              maxLength={1000}
            />
            {addError && <div className="text-red-500 text-sm mt-2">{addError}</div>}
          </div>
          <DialogFooter>
            <button
              className="px-4 py-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-400 text-white font-semibold shadow-sm hover:from-rose-600 hover:to-pink-500 transition-colors"
              onClick={handleSaveNew}
              disabled={!newTerm.trim() || !newDefinition.trim()}
            >
              Add
            </button>
            <DialogClose asChild>
              <button
                className="px-4 py-2 rounded-full bg-white border border-rose-200 text-rose-500 font-medium hover:bg-rose-50/70 transition-colors"
                onClick={() => setIsAddModalOpen(false)}
                type="button"
              >
                Cancel
              </button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 