import { useEffect } from 'react';

interface BrandMessagingSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  doc: {
    docId: string;
    title: string;
    url: string;
  };
}

export default function BrandMessagingSuccessModal({
  isOpen,
  onClose,
  doc,
}: BrandMessagingSuccessModalProps) {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Brand Messaging Created!</h2>
        <p className="text-gray-600 mb-6">
          Your brand messaging document has been created and saved to Google Drive.
        </p>
        <div className="flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#EF6351]"
          >
            Close
          </button>
          <a
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-sm font-medium text-white bg-[#EF6351] rounded-md hover:bg-[#d85645] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#EF6351]"
          >
            View in Google Docs
          </a>
        </div>
      </div>
    </div>
  );
} 