import { create } from 'zustand';
import { Prd } from '@/types/my-work';

export type PRD = Prd;

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