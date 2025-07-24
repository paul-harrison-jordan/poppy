import { create } from 'zustand';

interface Comment {
  id: string;
  content: string;
  user_id: string;
  user_name: string;
  created_at: string;
  resolved: boolean;
}

export interface PRD {
  id?: string;
  title?: string;
  metadata?: {
    comments?: Comment[];
    open_questions_summary?: string;
  };
}

export interface AgenticMessage {
  prdId: string;
  prdTitle: string;
  openQuestions: string[];
}

interface PRDStore {
  prds: PRD[];
  setPRDs: (prds: PRD[]) => void;
  updatePRD: (prd: PRD) => void;
  addPRD: (prd: PRD) => void;
  agenticMessages: AgenticMessage[];
  addAgenticMessage: (msg: AgenticMessage) => void;
  clearAgenticMessages: () => void;
}

export const usePRDStore = create<PRDStore>((set) => ({
  prds: [],
  setPRDs: (prds) => set({ prds }),
  updatePRD: (prd) =>
    set((state) => ({
      prds: state.prds.map((p) => (p.id === prd.id ? prd : p)),
    })),
  addPRD: (prd) =>
    set((state) => ({
      prds: [...state.prds, prd],
    })),
  agenticMessages: [],
  addAgenticMessage: (msg) =>
    set((state) => ({
      agenticMessages: state.agenticMessages.some((m) => m.prdId === msg.prdId)
        ? state.agenticMessages
        : [...state.agenticMessages, msg],
    })),
  clearAgenticMessages: () => set({ agenticMessages: [] }),
})); 