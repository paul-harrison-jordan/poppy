interface InlineSuccessProps {
  doc: {
    docId: string;
    title: string;
    url: string;
  };
  onClose: () => void;
}

export default function InlineSuccess({ doc, onClose }: InlineSuccessProps) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-[#E9DCC6]/50 p-6 mb-8">
      <h2 className="text-2xl font-bold text-[#232426] mb-4">Document Created Successfully!</h2>
      <p className="text-[#4A4A4A] mb-6">
        Your document {doc.title} has been created. You can view it now or find it later in your documents list.
      </p>
      <div className="flex justify-end space-x-4">
        <button
          onClick={onClose}
          className="px-4 py-2 text-[#4A4A4A] hover:text-[#232426]"
        >
          Close
        </button>
        <a
          href={doc.url}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-[#EF6351] text-white rounded-md hover:bg-[#d94d38] transition-colors"
        >
          View Document
        </a>
      </div>
    </div>
  );
} 