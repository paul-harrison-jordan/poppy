import React from 'react';

interface PoppyProactiveMessageProps {
  prdTitle: string;
  openQuestions: string[];
  onScheduleWithCommenters: () => void;
  onScheduleWithCustomers: () => void;
  onBrainstorm: () => void;
}

const PoppyProactiveMessage: React.FC<PoppyProactiveMessageProps> = ({
  prdTitle,
  openQuestions,
  onScheduleWithCommenters,
  onScheduleWithCustomers,
  onBrainstorm,
}) => {
  return (
    <div className="max-w-xl mx-auto my-6 p-4 bg-poppy-50 border border-poppy-200 rounded-xl shadow flex gap-4 items-start animate-fade-in">
      <div className="flex-shrink-0">
        <div className="w-12 h-12 rounded-full bg-poppy-200 flex items-center justify-center text-poppy-700 font-bold text-2xl">
          🧑‍💻
        </div>
      </div>
      <div className="flex-1">
        <div className="font-semibold text-poppy-700 mb-1">Poppy noticed this PRD is at risk</div>
        <div className="text-gray-800 mb-2">
          <span className="font-medium">{prdTitle}</span> has unresolved issues:
          <ul className="list-disc ml-6 mt-1 text-sm text-gray-700">
            {openQuestions.length > 0 ? openQuestions.map((q, i) => (
              <li key={i}>{q}</li>
            )) : <li>No open questions detected.</li>}
          </ul>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <button
            className="bg-poppy-600 text-white px-3 py-1 rounded hover:bg-poppy-700 transition"
            onClick={onScheduleWithCommenters}
          >
            Schedule with Commenters
          </button>
          <button
            className="bg-emerald-600 text-white px-3 py-1 rounded hover:bg-emerald-700 transition"
            onClick={onScheduleWithCustomers}
          >
            Schedule with Customers
          </button>
          <button
            className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition"
            onClick={onBrainstorm}
          >
            Brainstorm Solutions
          </button>
        </div>
      </div>
    </div>
  );
};

export default PoppyProactiveMessage; 