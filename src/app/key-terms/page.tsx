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
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
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

  const handleAddNew = () => {
    setNewTerm("");
    setNewDefinition("");
    setAddError("");
    setIsAddModalOpen(true);
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

  // Filtered and paginated terms
  const filteredEntries = Object.entries(terms)
    .filter(([term, definition]) =>
      term.toLowerCase().includes(searchQuery.toLowerCase()) ||
      definition.toLowerCase().includes(searchQuery.toLowerCase())
    );
  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);
  const paginatedEntries = filteredEntries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset to page 1 on search
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

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

  return (
    <div className="min-h-screen bg-[#FFFAF3]">
      <Sidebar />
      <div className="ml-64 flex items-center justify-center min-h-screen">
        <div className="max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8 flex justify-center">
          <div className="w-full max-w-4xl space-y-8">
            <div className="bg-white rounded-xl shadow-lg border border-[#E9DCC6] overflow-x-auto">
              <div className="flex items-center justify-between px-6 pt-6">
                <h2 className="text-2xl font-bold text-[#232426]">Key Terms</h2>
                <button
                  className="px-4 py-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-400 text-white font-semibold shadow-sm hover:from-rose-600 hover:to-pink-500 transition-colors"
                  onClick={handleAddNew}
                >
                  + New Key Term
                </button>
              </div>
              <p className="text-sm text-[#BBC7B6] mb-6 px-6 pt-2">
                Edit your team's key terms and definitions. Changes are saved automatically.
              </p>
              <div className="px-6 pb-4 flex items-center justify-between">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search terms or definitions..."
                  className="w-full max-w-xs rounded-full border border-rose-100 bg-white/80 px-4 py-2 text-sm text-gray-800 shadow-sm focus:border-rose-200 focus:outline-none focus:ring-1 focus:ring-rose-200"
                />
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Term</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Definition</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedEntries.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-4 text-center text-gray-400">
                        No key terms found.
                      </td>
                    </tr>
                  )}
                  {paginatedEntries.map(([term, definition]) => (
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
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 py-4">
                  <button
                    className="px-3 py-1 rounded-full bg-white border border-rose-100 text-rose-500 font-medium hover:bg-rose-50/70 transition-colors disabled:opacity-50"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-500">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    className="px-3 py-1 rounded-full bg-white border border-rose-100 text-rose-500 font-medium hover:bg-rose-50/70 transition-colors disabled:opacity-50"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </div>
              )}
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