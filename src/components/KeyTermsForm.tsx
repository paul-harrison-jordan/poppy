import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';

interface TeamTerms {
  [key: string]: string;
}

interface KeyTermsFormProps {
  onComplete?: () => void;
}

export default function KeyTermsForm({ onComplete }: KeyTermsFormProps) {
  const [terms, setTerms] = useState<TeamTerms>({});
  const [editingTerm, setEditingTerm] = useState<string | null>(null);
  const [editingDefinition, setEditingDefinition] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newTerm, setNewTerm] = useState('');
  const [newDefinition, setNewDefinition] = useState('');
  const itemsPerPage = 10;

  useEffect(() => {
    const savedTerms = localStorage.getItem('teamTerms');
    if (savedTerms) {
      setTerms(JSON.parse(savedTerms));
    }
  }, []);

  const handleAddNew = () => {
    setShowAddDialog(true);
  };

  const handleAddTerm = () => {
    if (newTerm && newDefinition) {
      const updatedTerms = { ...terms, [newTerm]: newDefinition };
      setTerms(updatedTerms);
      localStorage.setItem('teamTerms', JSON.stringify(updatedTerms));
      setShowAddDialog(false);
      setNewTerm('');
      setNewDefinition('');
    }
  };

  const handleEdit = (term: string, definition: string) => {
    setEditingTerm(term);
    setEditingDefinition(definition);
  };

  const handleSaveEdit = () => {
    if (editingTerm && editingDefinition) {
      const updatedTerms = { ...terms };
      delete updatedTerms[editingTerm];
      updatedTerms[editingDefinition] = editingDefinition;
      setTerms(updatedTerms);
      localStorage.setItem('teamTerms', JSON.stringify(updatedTerms));
      setEditingTerm(null);
      setEditingDefinition('');
    }
  };

  const handleDelete = (term: string) => {
    const updatedTerms = { ...terms };
    delete updatedTerms[term];
    setTerms(updatedTerms);
    localStorage.setItem('teamTerms', JSON.stringify(updatedTerms));
  };

  const filteredEntries = Object.entries(terms).filter(([term, definition]) => {
    const searchLower = searchQuery.toLowerCase();
    return term.toLowerCase().includes(searchLower) || definition.toLowerCase().includes(searchLower);
  });

  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);
  const paginatedEntries = filteredEntries.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleComplete = () => {
    if (onComplete) {
      onComplete();
    }
  };

  return (
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
        Edit your team&apos;s key terms and definitions. Changes are saved automatically.
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

      {/* Add New Term Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Key Term</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label htmlFor="term" className="block text-sm font-medium text-gray-700">
                Term
              </label>
              <input
                type="text"
                id="term"
                value={newTerm}
                onChange={e => setNewTerm(e.target.value)}
                className="mt-1 block w-full rounded-md border border-rose-100 px-3 py-2 text-gray-900 shadow-sm focus:border-rose-200 focus:outline-none focus:ring-1 focus:ring-rose-200"
                placeholder="Enter term..."
              />
            </div>
            <div>
              <label htmlFor="definition" className="block text-sm font-medium text-gray-700">
                Definition
              </label>
              <textarea
                id="definition"
                value={newDefinition}
                onChange={e => setNewDefinition(e.target.value)}
                className="mt-1 block w-full rounded-md border border-rose-100 px-3 py-2 text-gray-900 shadow-sm focus:border-rose-200 focus:outline-none focus:ring-1 focus:ring-rose-200"
                placeholder="Enter definition..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </DialogClose>
            <button
              type="button"
              onClick={handleAddTerm}
              className="px-4 py-2 text-sm font-medium text-white bg-rose-500 rounded-md hover:bg-rose-600"
            >
              Add Term
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Term Dialog */}
      <Dialog open={!!editingTerm} onOpenChange={() => setEditingTerm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Key Term</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label htmlFor="edit-term" className="block text-sm font-medium text-gray-700">
                Term
              </label>
              <input
                type="text"
                id="edit-term"
                value={editingTerm || ''}
                onChange={e => setEditingTerm(e.target.value)}
                className="mt-1 block w-full rounded-md border border-rose-100 px-3 py-2 text-gray-900 shadow-sm focus:border-rose-200 focus:outline-none focus:ring-1 focus:ring-rose-200"
              />
            </div>
            <div>
              <label htmlFor="edit-definition" className="block text-sm font-medium text-gray-700">
                Definition
              </label>
              <textarea
                id="edit-definition"
                value={editingDefinition}
                onChange={e => setEditingDefinition(e.target.value)}
                className="mt-1 block w-full rounded-md border border-rose-100 px-3 py-2 text-gray-900 shadow-sm focus:border-rose-200 focus:outline-none focus:ring-1 focus:ring-rose-200"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </DialogClose>
            <button
              type="button"
              onClick={handleSaveEdit}
              className="px-4 py-2 text-sm font-medium text-white bg-rose-500 rounded-md hover:bg-rose-600"
            >
              Save Changes
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Button */}
      <div className="px-6 py-4 border-t border-gray-200">
        <button
          onClick={handleComplete}
          className="w-full px-4 py-2 text-sm font-medium text-white bg-rose-500 rounded-md hover:bg-rose-600"
        >
          Complete Setup
        </button>
      </div>
    </div>
  );
} 