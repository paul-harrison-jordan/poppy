import React from 'react';

interface WinniProactiveMessageProps {
  prdTitle: string;
  openQuestions: string[];
}

const WinniProactiveMessage: React.FC<WinniProactiveMessageProps> = ({
  prdTitle,
  openQuestions,
}) => {
  return (
    <div className="max-w-xl mx-auto my-6 p-4 bg-winni-50 border border-winni-200 rounded-xl shadow flex gap-4 items-start animate-fade-in">
      <div className="flex-shrink-0">
        <div className="w-12 h-12 rounded-full bg-winni-200 flex items-center justify-center text-winni-700 font-bold text-2xl">
          ⚠️
        </div>
      </div>
      <div className="flex-1">
        <div className="font-semibold text-winni-700 mb-1">Winni noticed this PRD is at risk</div>
        <p className="text-sm text-gray-600 mb-3">
          The PRD &quot;{prdTitle}&quot; has some open questions that need to be addressed:
        </p>
        <ul className="list-disc list-inside text-sm text-gray-600 mb-4">
          {openQuestions.map((question, index) => (
            <li key={index}>{question}</li>
          ))}
        </ul>
        <button
          onClick={() => {
            const event = new CustomEvent('winni-agentic-message', {
              detail: { prdId: prdTitle }
            });
            window.dispatchEvent(event);
          }}
          className="bg-winni-600 text-white px-3 py-1 rounded hover:bg-winni-700 transition"
        >
          Let&apos;s address these
        </button>
      </div>
    </div>
  );
};

export default WinniProactiveMessage; 