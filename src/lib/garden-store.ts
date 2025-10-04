import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { AgentUpdate, HumanQuestion, WorkflowPhase, ResearchFinding, QualityMetrics } from '../services/garden/types';

interface GardenState {
  // Core workflow state
  messages: AgentUpdate[];
  loading: boolean;
  workflowPhases: WorkflowPhase[];
  currentPhase: string;
  
  // Research and findings
  researchFindings: ResearchFinding[];
  humanQuestions: HumanQuestion[];
  qualityMetrics: QualityMetrics;
  
  // UI state
  activeTab: 'progress' | 'audit';
  expandedPhases: Set<string>;
  showHumanInput: boolean;
  showInput: boolean;
  isExporting: boolean;
  exportedDocUrl: string;
  
  // Connection state
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  reconnectAttempts: number;
}

interface GardenActions {
  // Message management
  addMessage: (message: AgentUpdate) => void;
  clearMessages: () => void;
  updateMessage: (id: string, updates: Partial<AgentUpdate>) => void;
  
  // Phase management
  updatePhaseStatus: (phaseId: string, status: WorkflowPhase['status']) => void;
  updateSubStep: (phaseId: string, stepIndex: number, status: 'pending' | 'active' | 'completed') => void;
  initializeWorkflowPhases: (requestType: string) => void;
  togglePhaseExpansion: (phaseId: string) => void;
  
  // Research management
  addResearchFinding: (finding: ResearchFinding) => void;
  clearResearchFindings: () => void;
  updateQualityMetrics: (metrics: Partial<QualityMetrics>) => void;
  
  // UI state management
  setActiveTab: (tab: 'progress' | 'audit') => void;
  setLoading: (loading: boolean) => void;
  setShowInput: (show: boolean) => void;
  setShowHumanInput: (show: boolean) => void;
  setHumanQuestions: (questions: HumanQuestion[]) => void;
  setExporting: (isExporting: boolean) => void;
  setExportedDocUrl: (url: string) => void;
  
  // Connection management
  setConnectionStatus: (status: GardenState['connectionStatus']) => void;
  incrementReconnectAttempts: () => void;
  resetReconnectAttempts: () => void;
  
  // Bulk operations
  reset: () => void;
}

type GardenStore = GardenState & GardenActions;

const initialState: GardenState = {
  messages: [],
  loading: false,
  workflowPhases: [],
  currentPhase: '',
  researchFindings: [],
  humanQuestions: [],
  qualityMetrics: {
    completeness: 0,
    confidence: 0,
    research_depth: 0
  },
  activeTab: 'progress',
  expandedPhases: new Set(['research']),
  showHumanInput: false,
  showInput: true,
  isExporting: false,
  exportedDocUrl: '',
  connectionStatus: 'disconnected',
  reconnectAttempts: 0
};

export const useGardenStore = create<GardenStore>()(
  devtools(
    (set, get) => ({
      ...initialState,
      
      // Message management
      addMessage: (message) => 
        set((state) => ({ 
          messages: [...state.messages, { ...message, id: message.id || Date.now().toString() }] 
        }), false, 'addMessage'),
        
      clearMessages: () => 
        set({ messages: [] }, false, 'clearMessages'),
        
      updateMessage: (id, updates) =>
        set((state) => ({
          messages: state.messages.map(msg => 
            msg.id === id ? { ...msg, ...updates } : msg
          )
        }), false, 'updateMessage'),
      
      // Phase management
      updatePhaseStatus: (phaseId, status) =>
        set((state) => ({
          workflowPhases: state.workflowPhases.map(phase =>
            phase.id === phaseId ? { ...phase, status } : phase
          ),
          currentPhase: phaseId
        }), false, 'updatePhaseStatus'),
        
      updateSubStep: (phaseId, stepIndex, status) =>
        set((state) => ({
          workflowPhases: state.workflowPhases.map(phase => {
            if (phase.id === phaseId && phase.subSteps) {
              const newSubSteps = [...phase.subSteps];
              newSubSteps[stepIndex] = { ...newSubSteps[stepIndex], status };
              return { ...phase, subSteps: newSubSteps };
            }
            return phase;
          })
        }), false, 'updateSubStep'),
        
      initializeWorkflowPhases: (requestType) => {
        const phases: WorkflowPhase[] = [
          {
            id: 'research',
            name: 'Deep Research',
            icon: 'Search',
            status: 'pending',
            subSteps: [
              { name: 'Analyzing problem space', status: 'pending' },
              { name: 'Retrieving team knowledge', status: 'pending' },
              { name: 'Searching external sources', status: 'pending' },
              { name: 'Synthesizing insights', status: 'pending' }
            ]
          },
          {
            id: 'questions',
            name: 'Intelligent Questions',
            icon: 'MessageSquare',
            status: 'pending',
            subSteps: [
              { name: 'Identifying knowledge gaps', status: 'pending' },
              { name: 'Generating clarifying questions', status: 'pending' }
            ]
          },
          {
            id: 'analysis',
            name: 'Agent Analysis',
            icon: 'Brain',
            status: 'pending',
            subSteps: [
              { name: 'Planning agent analysis', status: 'pending' },
              { name: 'Strategy validation', status: 'pending' },
              { name: 'Design considerations', status: 'pending' },
              { name: 'Release phase planning', status: 'pending' }
            ]
          },
          {
            id: 'validation',
            name: 'Quality Validation',
            icon: 'CheckCircle2',
            status: 'pending',
            subSteps: [
              { name: 'Checking completeness', status: 'pending' },
              { name: 'Validating against standards', status: 'pending' },
              { name: 'Identifying gaps', status: 'pending' }
            ]
          },
          {
            id: 'writing',
            name: 'PRD Creation',
            icon: 'FileText',
            status: 'pending',
            subSteps: [
              { name: 'Structuring document', status: 'pending' },
              { name: 'Writing sections', status: 'pending' },
              { name: 'Final review', status: 'pending' }
            ]
          }
        ];
        
        set({ 
          workflowPhases: phases,
          expandedPhases: new Set(['research'])
        }, false, 'initializeWorkflowPhases');
      },
      
      togglePhaseExpansion: (phaseId) =>
        set((state) => {
          const newExpanded = new Set(state.expandedPhases);
          if (newExpanded.has(phaseId)) {
            newExpanded.delete(phaseId);
          } else {
            newExpanded.add(phaseId);
          }
          return { expandedPhases: newExpanded };
        }, false, 'togglePhaseExpansion'),
      
      // Research management
      addResearchFinding: (finding) =>
        set((state) => ({
          researchFindings: [...state.researchFindings, finding]
        }), false, 'addResearchFinding'),
        
      clearResearchFindings: () =>
        set({ researchFindings: [] }, false, 'clearResearchFindings'),
        
      updateQualityMetrics: (metrics) =>
        set((state) => ({
          qualityMetrics: { ...state.qualityMetrics, ...metrics }
        }), false, 'updateQualityMetrics'),
      
      // UI state management
      setActiveTab: (tab) => 
        set({ activeTab: tab }, false, 'setActiveTab'),
        
      setLoading: (loading) => 
        set({ loading }, false, 'setLoading'),
        
      setShowInput: (show) => 
        set({ showInput: show }, false, 'setShowInput'),
        
      setShowHumanInput: (show) => 
        set({ showHumanInput: show }, false, 'setShowHumanInput'),
        
      setHumanQuestions: (questions) => 
        set({ humanQuestions: questions }, false, 'setHumanQuestions'),
        
      setExporting: (isExporting) => 
        set({ isExporting }, false, 'setExporting'),
        
      setExportedDocUrl: (url) => 
        set({ exportedDocUrl: url }, false, 'setExportedDocUrl'),
      
      // Connection management
      setConnectionStatus: (status) =>
        set({ connectionStatus: status }, false, 'setConnectionStatus'),
        
      incrementReconnectAttempts: () =>
        set((state) => ({ 
          reconnectAttempts: state.reconnectAttempts + 1 
        }), false, 'incrementReconnectAttempts'),
        
      resetReconnectAttempts: () =>
        set({ reconnectAttempts: 0 }, false, 'resetReconnectAttempts'),
      
      // Bulk operations
      reset: () => 
        set(initialState, false, 'reset')
    }),
    {
      name: 'garden-store',
      partialize: (state) => ({
        // Only persist essential state, not UI state
        messages: state.messages.slice(-50), // Keep last 50 messages
        workflowPhases: state.workflowPhases,
        researchFindings: state.researchFindings.slice(-20), // Keep last 20 findings
        qualityMetrics: state.qualityMetrics
      })
    }
  )
);

// Selectors for optimized re-renders
export const useGardenMessages = () => useGardenStore(state => state.messages);
export const useGardenLoading = () => useGardenStore(state => state.loading);
export const useGardenPhases = () => useGardenStore(state => state.workflowPhases);
export const useGardenFindings = () => useGardenStore(state => state.researchFindings);
export const useGardenQuality = () => useGardenStore(state => state.qualityMetrics);
export const useGardenUI = () => useGardenStore(state => ({
  activeTab: state.activeTab,
  showInput: state.showInput,
  showHumanInput: state.showHumanInput,
  expandedPhases: state.expandedPhases,
  isExporting: state.isExporting,
  connectionStatus: state.connectionStatus
}));