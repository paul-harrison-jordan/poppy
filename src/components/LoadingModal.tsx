interface LoadingModalProps {
  isOpen: boolean;
  title: string;
  message: string;
}

export default function LoadingModal({ isOpen, title, message }: LoadingModalProps) {
  if (!isOpen) return null;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg p-6">
        <div className="flex items-center justify-center mb-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#EF6351]"></div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">{title}</h2>
        <p className="text-gray-600 text-center">{message}</p>
      </div>
    </div>
  );
} 