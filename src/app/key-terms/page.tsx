"use client";

import { useSession } from "next-auth/react";
import Sidebar from "@/components/Sidebar";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";

interface TeamTerms {
  [term: string]: string;
}

export default function KeyTermsPage() {
  const { data: session, status } = useSession();
  const [terms, setTerms] = useState<TeamTerms>({});
  const [editingTerm, setEditingTerm] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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

  const handleEdit = (term: string, currentDefinition: string) => {
    setEditingTerm(term);
    setEditValue(currentDefinition);
    setIsEditModalOpen(true);
  };

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

  const handleDelete = (term: string) => {
    const updatedTerms = { ...terms };
    delete updatedTerms[term];
    setTerms(updatedTerms);
    localStorage.setItem("teamTerms", JSON.stringify(updatedTerms));
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

  const termEntries = Object.entries(terms);

  return (
    <div className="min-h-screen bg-[#FFFAF3]">
      <Sidebar />
      <div className="ml-64 flex items-center justify-center min-h-screen">
        <div className="max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8 flex justify-center">
          <div className="w-full max-w-4xl space-y-8">
            <div className="bg-white rounded-xl shadow-lg border border-[#E9DCC6] overflow-x-auto">
              <h2 className="text-2xl font-bold text-[#232426] px-6 pt-6">Key Terms</h2>
              <p className="text-sm text-[#BBC7B6] mb-6 px-6 pt-2">
                Edit your team&apos;s key terms and definitions. Changes are saved automatically.
              </p>
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Term</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Definition</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {termEntries.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-4 text-center text-gray-400">
                        No key terms found.
                      </td>
                    </tr>
                  )}
                  {termEntries.map(([term, definition]) => (
                    <tr key={term}>
                      <td className="px-6 py-4 font-medium text-gray-900">{term}</td>
                      <td className="px-6 py-4">
                        <span>{definition}</span>
                      </td>
                      <td className="px-6 py-4 text-right flex gap-2 justify-end">
                        <button
                          className="text-poppy-600 hover:underline text-sm"
                          onClick={() => handleEdit(term, definition)}
                        >
                          Edit
                        </button>
                        <button
                          className="text-red-500 hover:underline text-sm ml-2"
                          onClick={() => handleDelete(term)}
                          aria-label={`Delete ${term}`}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      {/* Edit Definition Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[600px] bg-white/90 backdrop-blur-sm border-rose-100/30 rounded-2xl shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-[#232426]">Edit Definition</DialogTitle>
          </DialogHeader>
          <div className="mb-4">
            <div className="font-medium text-gray-900 mb-2">{editingTerm}</div>
            <textarea
              className="border rounded px-2 py-2 w-full min-h-[8rem] resize-vertical"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              autoFocus
              rows={6}
              placeholder="Enter definition..."
            />
          </div>
          <DialogFooter>
            <button
              className="px-4 py-2 rounded bg-[#EF6351] text-white font-semibold hover:bg-[#d94d38] transition-colors"
              onClick={() => editingTerm && handleSave(editingTerm)}
              disabled={!editValue.trim()}
            >
              Save
            </button>
            <DialogClose asChild>
              <button
                className="px-4 py-2 rounded bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition-colors"
                onClick={handleCancel}
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