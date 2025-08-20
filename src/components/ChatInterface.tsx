'use client';
import React, { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { collectStream } from "@/lib/collectStream"
import { Paintbrush } from "lucide-react"
import PoppyProactiveMessage from './poppy/PoppyProactiveMessage';
import { usePRDStore } from '@/store/prdStore';
import { useKnowledgeSession } from '@/hooks/useKnowledgeSession';
import { usePRDFlow } from '@/hooks/usePRDFlow';
import ChatMessageList from './ChatMessageList';
import ChatInput from './ChatInput';
import { getEnrichedPersonalContext } from '@/lib/utils/contextHelpers';
import CompetitiveAnalysisResults from './CompetitiveAnalysisResults';

// Lazy load heavy components
const DesignSidebar = lazy(() => import('./DesignSidebar'));
const TechDocWizard = lazy(() => import('./TechDocWizard'));

declare global {
  interface Window {
    usePRDStore: typeof import('@/store/prdStore').usePRDStore;
  }
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string | React.ReactNode;
  className?: string;
}

type ChatMode = 'chat' | 'draft' | 'techdoc' | 'agent' | 'design' | 'feedback' | 'competitive';



export default function ChatInterface() {
  const { data: session, status } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  // Initialize mode from localStorage or default to 'draft' (PRD mode)
  const [mode, setMode] = useState<ChatMode>('draft');
  // Handle client-side initialization
  useEffect(() => {
    const savedMode = localStorage.getItem('currentChatMode') as ChatMode;
    if (savedMode && ['chat', 'draft', 'techdoc', 'agent', 'design', 'feedback', 'competitive'].includes(savedMode)) {
      setMode(savedMode);
    }
  }, []);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [pendingSummary, setPendingSummary] = useState<string | null>(null);
  const agenticMessages = usePRDStore((state) => state.agenticMessages);
  const [showBounce, setShowBounce] = useState(false);
  const [showStartPrdButton, setShowStartPrdButton] = useState(false);
  const [, setCompletedPrdContent] = useState<string>('');
  const [demoUrl, setDemoUrl] = useState<string | null>(null);
  const [competitiveUrls, setCompetitiveUrls] = useState<string[]>(['']);
  const [showCompetitiveUrlInput, setShowCompetitiveUrlInput] = useState(false);
  const [competitiveQuery, setCompetitiveQuery] = useState<string>('');
  const [isCreatingDesign, setIsCreatingDesign] = useState(false);
  const [v0ChatId, setV0ChatId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [typingDemo, setTypingDemo] = useState(false);

  // Use custom hooks
  const knowledgeSession = useKnowledgeSession();
  const prdFlow = usePRDFlow();

  // Initialize component after session and hooks are ready
  useEffect(() => {
    if (status !== 'loading' && knowledgeSession && prdFlow) {
      setIsInitialized(true);
    }
  }, [status, knowledgeSession, prdFlow]);

  // Subtle typing demo on first load when there are no messages
  useEffect(() => {
    if (messages.length === 0 && input === '' && isInitialized && !typingDemo) {
      const timer = setTimeout(() => {
        setTypingDemo(true);
        const demoTexts = {
          draft: "Draft a PRD for user authentication...",
          techdoc: "Create technical documentation for checkout flow...",
          design: "Create a design for mobile checkout...",
          feedback: "Find customer feedback about search...",
          competitive: "Analyze how Slack handles notifications...",
          chat: "Help me with roadmap planning..."
        };
        
        const demoText = demoTexts[mode as keyof typeof demoTexts] || demoTexts.draft;
        let i = 0;
        
        const typeInterval = setInterval(() => {
          if (i < demoText.length) {
            setInput(demoText.slice(0, i + 1));
            i++;
          } else {
            // Clear after showing full text for 1.5 seconds
            setTimeout(() => {
              setInput('');
              setTypingDemo(false);
            }, 1500);
            clearInterval(typeInterval);
          }
        }, 50);
        
        return () => clearInterval(typeInterval);
      }, 2000); // Start demo after 2 seconds
      
      return () => clearTimeout(timer);
    }
  }, [messages.length, input, isInitialized, mode, typingDemo]);

  // Track design mode changes
  useEffect(() => {
    const checkDesignMode = () => {
      const currentMode = localStorage.getItem('currentChatMode');
      const designMode = currentMode === 'design';
      
      
      // In design mode, no sidebar. Otherwise, check if sidebar is collapsed
      if (designMode) {
        setSidebarWidth(0);
      } else {
        const collapsed = localStorage.getItem('sidebarCollapsed') === 'true';
        setSidebarWidth(collapsed ? 64 : 256);
      }
    };

    checkDesignMode();

    const handleModeChange = () => checkDesignMode();
    const handleStorageChange = () => checkDesignMode();

    window.addEventListener('chatModeChange', handleModeChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('chatModeChange', handleModeChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);


  const DOCUMENT_TYPES = {
    'draft': {
      type: 'prd',
      title: 'Draft PRD',
      text: 'PRD'
    }
  } as const;

  const getDocumentType = () => {
    return DOCUMENT_TYPES['draft'];
  };

  // Check for PRD summary on mount and URL parameters
  useEffect(() => {
    const prdSummary = localStorage.getItem('prdSummary');
    if (prdSummary) {
      setInput(prdSummary);
      // Clear the summary after using it
      localStorage.removeItem('prdSummary');
    }

    // Check URL parameters for design mode
    const urlParams = new URLSearchParams(window.location.search);
    const modeParam = urlParams.get('mode');
    const prdParam = urlParams.get('prd');
    const featureIdParam = urlParams.get('feature_id');
    
    if (modeParam === 'design') {
      setMode('design');
      
      if (featureIdParam) {
        // Load existing design by feature ID
        loadExistingDesign(featureIdParam);
      } else if (prdParam) {
        // Fetch PRD content and trigger design creation for new design
        fetchPRDAndCreateDesign(prdParam);
      }
    } else if (modeParam === 'feedback') {
      setMode('feedback');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Function to fetch PRD content and create design
  const fetchPRDAndCreateDesign = async (driveLink: string) => {
    try {
      // Extract document ID from Google Drive link
      const docIdMatch = driveLink.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (!docIdMatch) {
        console.error('Invalid Google Drive link');
        return;
      }
      
      const docId = docIdMatch[1];
      
      // Fetch document content
      const response = await fetch('/api/get-google-doc-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docId }),
      });

      if (response.ok) {
        const { content } = await response.json();
        if (content) {
          // Use the document content to create design, pass driveLink for PRD updating
          await handleCreateDesign(content, driveLink);
        } else {
          console.error('No content found in document');
        }
      } else {
        console.error('Failed to fetch document content');
      }
    } catch (error) {
      console.error('Error fetching PRD and creating design:', error);
    }
  };

  // Function to load existing design by feature ID
  const loadExistingDesign = async (featureId: string) => {
    try {
      console.log('Loading existing design for feature:', featureId);
      
      const response = await fetch(`/api/roadmap/prd/${featureId}`);
      
      if (response.ok) {
        const feature = await response.json();
        
        if (feature.demoUrl && feature.chatId) {
          console.log('Loading existing design:', {
            chatId: feature.chatId,
            demoUrl: feature.demoUrl,
            title: feature.title
          });
          
          // Set up design mode with existing data
          setDemoUrl(feature.demoUrl);
          setV0ChatId(feature.chatId);
          
          // Update localStorage and dispatch event
          localStorage.setItem('currentChatMode', 'design');
          window.dispatchEvent(new CustomEvent('chatModeChange', { detail: { mode: 'design' } }));
          
          // Add a message indicating we're in edit mode
          setMessages([{
            role: 'assistant',
            content: `Design for "${feature.title || 'Feature'}" loaded in edit mode. You can now make changes to the existing design by describing what you'd like to modify.`
          }]);
        } else {
          console.error('Feature has no design data');
          setMessages([{
            role: 'assistant',
            content: 'This feature does not have a design yet. Please create a design first from the feature details page.'
          }]);
        }
      } else {
        console.error('Failed to load feature design data');
        setMessages([{
          role: 'assistant',
          content: 'Failed to load the design. Please try again or check if the feature exists.'
        }]);
      }
    } catch (error) {
      console.error('Error loading existing design:', error);
      setMessages([{
        role: 'assistant',
        content: 'An error occurred while loading the design. Please try again.'
      }]);
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const scrollTimeout = setTimeout(() => {
      if (messagesEndRef.current) {
        const container = messagesEndRef.current.closest('.overflow-y-auto');
        if (container) {
          // Always scroll to absolute bottom to show latest message
          container.scrollTop = container.scrollHeight;
        }
      }
    }, 100);
    
    return () => clearTimeout(scrollTimeout);
  }, [messages, loading]);

  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.role === 'assistant') {
        setInput('')
      }
    }
  }, [messages, messages.length]);

  // Effect to handle setting input when switching to PRD mode
  useEffect(() => {
    if (mode === 'draft' && pendingSummary) {
      console.log('Setting input from pending summary:', pendingSummary);
      setInput(pendingSummary);
      setPendingSummary(null);
    }
  }, [mode, pendingSummary]);

  // Debug effect to log input changes
  useEffect(() => {
    console.log('Input state changed to:', input);
  }, [input]);

  // Remove Start PRD button logic as tech doc mode doesn't need it
  useEffect(() => {
    setShowStartPrdButton(false);
  }, [mode]);

  // Effect to log demoUrl changes
  useEffect(() => {
    console.log('demoUrl useEffect triggered - demoUrl:', demoUrl, 'mode:', mode);
    if (demoUrl) {
      console.log('Demo URL updated:', demoUrl);
    } else {
      console.log('Demo URL is null or undefined');
    }
  }, [demoUrl, mode]);

  // Effect to handle mode changes and localStorage sync
  useEffect(() => {
    // Store current mode in localStorage for GlobalLayout to access
    localStorage.setItem('currentChatMode', mode);
    
    // Dispatch custom event to notify GlobalLayout of mode change
    window.dispatchEvent(new CustomEvent('chatModeChange', { detail: { mode } }));
  }, [mode]);

  const handleCreateDesign = async (prdContent: string, driveLink?: string) => {
    try {
      setIsCreatingDesign(true);
      console.log('Creating design with PRD content');

      // Add loading message for two-step process
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: (
          <div className="os-notification p-space-4 flex items-center gap-space-3">
            <div className="loading-spinner"></div>
            <div className="flex flex-col">
              <span className="text-poppy-primary font-medium">Analyzing PRD and generating design prompt...</span>
              <span className="text-xs text-warm-neutral">Step 1 of 2 • Product OS</span>
            </div>
          </div>
        )
      }]);


      // Step 1: Generate design prompt from PRD
      const promptResponse = await fetch('/api/generate-design-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prdText: prdContent
        }),
      });

      if (!promptResponse.ok) {
        throw new Error('Failed to generate design prompt');
      }

      const promptResult = await promptResponse.json();
      
      if (!promptResult.success || !promptResult.designPrompt) {
        throw new Error('No design prompt generated');
      }

      console.log('Generated design prompt:', {
        summary: promptResult.designSummary?.substring(0, 100) + '...',
        promptLength: promptResult.designPrompt?.length
      });

      // Update loading message for step 2
      setMessages(prev => prev.map((msg, index) => 
        index === prev.length - 1 && typeof msg.content === 'object' ? {
          ...msg,
          content: (
            <div className="os-notification p-space-4 flex items-center gap-space-3">
              <div className="loading-spinner"></div>
              <div className="flex flex-col">
                <span className="text-poppy-primary font-medium">Creating design with v0...</span>
                <span className="text-xs text-warm-neutral">Step 2 of 2 • Product OS</span>
              </div>
            </div>
          )
        } : msg
      ));

      // Step 2: Create v0 chat with both design prompt and PRD context
      const v0Response = await fetch('/api/create-v0-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          designPrompt: promptResult.designPrompt,
          prdContent: prdContent
        }),
      });

      if (!v0Response.ok) {
        throw new Error('Failed to create design');
      }

      const result = await v0Response.json();


      // Remove loading message
      setMessages(prev => prev.filter(msg => 
        !(typeof msg.content === 'object' && React.isValidElement(msg.content))
      ));

      if (result.success && result.demoUrl) {
        console.log('Design created successfully with iframe URL:', result.demoUrl);
        
        // Switch to design mode and set the iframe URL
        setDemoUrl(result.demoUrl);
        setV0ChatId(result.chatId);
        setMode('design');
        
        // Update localStorage and dispatch event
        localStorage.setItem('currentChatMode', 'design');
        window.dispatchEvent(new CustomEvent('chatModeChange', { detail: { mode: 'design' } }));
        
        // Update PRD with design link and chat ID if driveLink is provided
        if (driveLink && result.chatId) {
          try {
            console.log('Updating PRD with design link and chat ID:', {
              driveLink,
              demoUrl: result.demoUrl,
              chatId: result.chatId
            });
            
            const updateResponse = await fetch('/api/update-prd-v0-link', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                driveLink: driveLink,
                v0Link: result.demoUrl,
                chatId: result.chatId
              }),
            });
            
            if (updateResponse.ok) {
              console.log('PRD successfully updated with design link and chat ID');
            } else {
              console.error('Failed to update PRD with design link');
            }
          } catch (error) {
            console.error('Error updating PRD with design link:', error);
          }
        }
        
        // Add success message
        setMessages([{
          role: 'assistant',
          content: (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="flex items-center gap-space-3 text-sprout-success">
                <div className="w-8 h-8 rounded-full bg-sprout-success-light flex items-center justify-center elevation-sm">
                  <span className="text-lg">✓</span>
                </div>
                <span className="font-semibold">Design created successfully!</span>
              </div>
              <p className="text-warm-neutral text-center">
                Your design is ready above. Describe any changes you&apos;d like to make and I&apos;ll iterate on it for you.
              </p>
            </div>
          )
        }]);
        
      } else {
        console.error('Design creation failed:', result);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="flex items-center gap-2 text-red-600">
                <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                  <span className="text-sm">✗</span>
                </div>
                <span className="font-medium">Design creation failed</span>
              </div>
              <p className="text-gray-600 text-center">
                {result.error || 'Something went wrong. Please try again or check your API key in Settings.'}
              </p>
            </div>
          )
        }]);
      }
    } catch (error) {
      console.error('Error creating design:', error);
      // Remove loading message and show error
      setMessages(prev => prev.filter(msg => 
        !(typeof msg.content === 'object' && React.isValidElement(msg.content))
      ));
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="flex items-center gap-2 text-red-600">
              <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                <span className="text-sm">✗</span>
              </div>
              <span className="font-medium">Connection error</span>
            </div>
            <p className="text-gray-600 text-center">
              {error instanceof Error ? error.message : "Unable to connect to the design service. Please check your internet connection and try again."}
            </p>
          </div>
        )
      }]);
    } finally {
      console.log('Setting isCreatingDesign to false');
      setIsCreatingDesign(false);
    }
  };

  // Summarize and save as PRD - removed as tech doc mode handles this differently
  const handleSummarizeAndSave = async () => {
    if (!messages.length) return;
    try {
      setLoading(true);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I'm summarizing our conversation and preparing to start the PRD..." 
      }]);

      const storedContext = getEnrichedPersonalContext();
      const teamTerms = JSON.parse(localStorage.getItem("teamTerms") || "{}");
      const chatMessages = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ];
      const res = await fetch('/api/brainstorm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: chatMessages,
          additionalContext: prdFlow.matchedContext.join("\n"),
          teamTerms,
          storedContext,
          startPrd: true
        }),
      });
      const prd = await res.json();

      console.log('PRD response received:', prd);
      console.log('Summary to set:', prd.summary);
      console.log('Title received:', prd.title);

      // Store the summary to set after state changes
      const summaryToSet = prd.summary || '';

      // Switch to draft mode first
      setMode('draft');
      
      // Reset other states for draft mode
      prdFlow.resetFlow();
      setShowStartPrdButton(false);

      // Clear the chat messages and switch to draft mode LAST
      // This prevents the useEffect from clearing our input
      setTimeout(() => {
        setMessages([]);
        
        // Set input after all state changes
        setTimeout(() => {
          console.log('Setting input after all state changes:', summaryToSet);
          setInput(summaryToSet);
        }, 50);
      }, 50);

    } catch (error) {
      console.error(error);
      alert('Failed to generate PRD summary.');
      // Remove the loading message on error
      setMessages(prev => prev.filter(msg => msg.content !== "I'm summarizing our conversation and preparing to start the PRD..."));
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = (newMode: ChatMode) => {
    // Batch state updates for smooth transitions
    const performModeChange = () => {
      setMode(newMode);
      prdFlow.resetFlow();
      setMessages([]);
      
      // Update localStorage and dispatch event
      localStorage.setItem('currentChatMode', newMode);
      window.dispatchEvent(new CustomEvent('chatModeChange', { detail: { mode: newMode } }));
      
      if (newMode === 'draft') {
        knowledgeSession.createKnowledgeSession('prd_generation', newMode);
      }
    };

    // Use requestAnimationFrame for smooth visual transitions
    requestAnimationFrame(performModeChange);
  };

  const handleSafeModeChange = (newMode: ChatMode) => {
    // Reset competitive mode UI when switching modes
    if (newMode !== 'competitive') {
      setShowCompetitiveUrlInput(false);
      setCompetitiveQuery('');
      setCompetitiveUrls(['']);
    }
    
    // For now, directly change mode - can add confirmation logic later if needed
    handleModeChange(newMode);
  };

  const handleCompetitiveAnalyze = async () => {
    const validUrls = competitiveUrls.filter(url => url.trim() !== '');
    
    if (validUrls.length === 0 || !competitiveQuery) {
      return;
    }

    try {
      setLoading(true);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Analyzing ${validUrls.length} competitor help sites for insights on "${competitiveQuery}"...`
      }]);

      const response = await fetch("/api/competitive-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: competitiveQuery,
          urls: validUrls
        }),
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Remove loading message
      setMessages(prev => prev.filter(msg => typeof msg.content === 'string' && !msg.content.includes('Analyzing')));
      
      // Add styled competitive analysis results
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: (
          <CompetitiveAnalysisResults 
            query={competitiveQuery}
            competitors={result.competitors || []}
            summary={result.summary}
            sourceCount={result.sourceCount || 0}
            searchedUrls={result.searchedUrls || []}
            onSearchOtherCompetitors={() => {
              // Reset the competitive analysis UI and show suggestion message
              setMessages(prev => [...prev, {
                role: 'assistant',
                content: `Let's find alternative competitors for "${competitiveQuery}". Please provide different competitor help desk URLs, or I can suggest some common competitors in this space. What type of product/service are you building?`
              }]);
            }}
          />
        )
      }]);

      // Hide the URL input UI after successful analysis
      setShowCompetitiveUrlInput(false);

    } catch (error) {
      console.error('Error in competitive analysis:', error);
      setMessages(prev => prev.filter(msg => typeof msg.content === 'string' && !msg.content.includes('Analyzing')));
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, I encountered an error while analyzing the competitor documentation. Please try again with valid help desk URLs."
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleGetEmailFromChat = async (customerMatch: Record<string, unknown>, index: number) => {
    try {
      // Get Google Sheets ID from localStorage
      const CUSTOMER_SHEET_ID = localStorage.getItem('customer_sheet_id');
      
      if (!CUSTOMER_SHEET_ID) {
        alert('Please configure your Google Sheets ID in Settings first. Go to Instructions/Settings page and add your customer sheet ID.');
        return;
      }

      console.log('Customer match data:', customerMatch);
      console.log('Row number:', customerMatch.row_number);
      
      // Use row_number if available, otherwise fallback to index + 2 (assuming header row)
      const rowNumber = customerMatch.row_number && typeof customerMatch.row_number === 'number' && customerMatch.row_number > 0 
        ? customerMatch.row_number 
        : index + 2;
      
      const response = await fetch('/api/get-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: CUSTOMER_SHEET_ID,
          rowNumber: rowNumber
        })
      });

      if (response.ok) {
        const { email } = await response.json();
        
        // Generate and open email draft
        await generateEmailFromChat(customerMatch, email);
      } else {
        const errorData = await response.json();
        console.error('Failed to fetch email:', errorData);
        alert('Failed to fetch customer email. Please check your Google Sheets configuration.');
      }
    } catch (error) {
      console.error('Error fetching email:', error);
      alert('An error occurred while fetching customer email.');
    }
  };

  const generateEmailFromChat = async (customerMatch: Record<string, unknown>, email: string) => {
    try {
      const emailSubject = `Following up on your feedback`;
      const emailBody = `Hi there,

I hope this email finds you well! I'm reaching out because I noticed you provided some valuable feedback in our recent survey (NPS: ${customerMatch.nps_score_raw}).

You mentioned: "${customerMatch.nps_verbatim}"

Your feedback has been incredibly helpful in shaping our product roadmap, and I wanted to personally follow up with you.

I'd love to:
1. Share more details about improvements we're making based on your feedback
2. Get your thoughts on our approach
3. Potentially include you in early testing when new features are ready

Would you be interested in a brief 15-minute call to discuss this further? I'm happy to work around your schedule.

Thanks for being such a valuable customer and for taking the time to share your feedback with us.

Best regards,
[Your Name]

P.S. If you have any other thoughts or suggestions, I'm always happy to hear them!`;

      // Create Gmail compose URL
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
      
      // Open Gmail in new tab
      window.open(gmailUrl, '_blank');
      
    } catch (error) {
      console.error('Error generating email:', error);
      alert('An error occurred while generating the email.');
    }
  };

  const handleDraftMode = async (input: string) => {
    switch (prdFlow.draftStep) {
      case 'initial':
        try {
          const firstTerm = await prdFlow.processInitialInput(input);
          // Remove thinking message
          setMessages(prev => prev.filter(msg => msg.content !== "Thinking..."));
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `Excellent! I love the direction you're taking. To make sure we're aligned on terminology, can you please define "${firstTerm.term}" in your own words?`
          }]);
        } catch (error) {
          console.error("Error processing initial input:", error);
          setMessages(prev => prev.filter(msg => msg.content !== "Thinking..."));
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: "Sorry, I encountered an error while processing your input. Please try again."
          }]);
        }
        break;

      case 'vocabulary':
        try {
          const { isLastTerm } = prdFlow.processVocabularyInput(input);
          if (isLastTerm) {
            const result = await prdFlow.showNextTerm();
            if (result.shouldGenerateQuestions) {
              // Add transition message
              setMessages(prev => [...prev, {
                role: 'assistant',
                content: "Great! I understand your key terms. Now let me ask some questions to help shape your PRD..."
              }]);
              await new Promise(resolve => setTimeout(resolve, 1500));
              try {
                const firstQuestion = await prdFlow.generateQuestions();
                setMessages(prev => [...prev, {
                  role: 'assistant',
                  content: firstQuestion.text
                }]);
              } catch (error) {
                console.error("Error generating questions:", error);
                setMessages(prev => [...prev, {
                  role: 'assistant',
                  content: "Sorry, I encountered an error while generating questions. Please try again."
                }]);
              }
            }
          } else {
            const result = await prdFlow.showNextTerm();
            if (result.shouldDelay) {
              await new Promise(resolve => setTimeout(resolve, 800));
            }
            if (result.nextTerm) {
              setMessages(prev => [...prev, {
                role: 'assistant',
                content: `Thanks! Now, can you please define "${result.nextTerm.term}"?`
              }]);
            }
          }
        } catch (error) {
          console.error("Error processing vocabulary:", error);
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: "Sorry, I encountered an error. Please try again."
          }]);
        }
        break;

      case 'questions':
        try {
          const { isLastQuestion, currentQuestion } = prdFlow.processQuestionInput(input);
          
          // Store this question/answer immediately in the database
          if (currentQuestion) {
            await knowledgeSession.storeQuestionResponse(currentQuestion, input, mode);
          }

          if (isLastQuestion) {
            // Remove the thinking message
            setMessages(prev => prev.filter(msg => msg.content !== "Thinking..."));
            
            // Show writing message
            const docType = getDocumentType();
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: <span className="animate-pulse">I&apos;m writing your {docType.text} document now...</span>
            }]);

            try {
              const docData = await prdFlow.generateContent();

              // Store the generated PRD markdown content
              const prdMarkdown = docData.markdown || '';
              setCompletedPrdContent(prdMarkdown);

              // Remove the writing message and show completion
              setMessages(prev => {
                const withoutWriting = prev.filter(msg => {
                  if (typeof msg.content === 'string') {
                    return msg.content !== `I&apos;m writing your ${docType.text} document now...`;
                  }
                  if (React.isValidElement(msg.content)) {
                    const element = msg.content as React.ReactElement<{ children: React.ReactNode }>;
                    return element.props.children !== `I&apos;m writing your ${docType.text} document now...`;
                  }
                  return true;
                });
                return [...withoutWriting, {
                  role: 'assistant',
                  content: (
                    <div className="flex flex-col items-center gap-4 py-4">
                      <div className="text-4xl mb-2">🎉</div>
                      <h3 className="text-xl font-bold text-gray-900">Congratulations! Your PRD is complete!</h3>
                      <p className="text-gray-600 text-center max-w-md">
                        I&apos;ve captured all your insights and organized them into a comprehensive PRD. You can now share it with your team or turn it into a design.
                      </p>
                      <div className="flex gap-3 mt-2">
                      <a
                        href={docData.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-3 bg-poppy text-white rounded-full font-medium hover:bg-poppy/90 transition-colors shadow-md flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        View {docType.title} in Google Docs
                      </a>
                        <button
                          onClick={() => handleCreateDesign(prdMarkdown)}
                          disabled={isCreatingDesign}
                          className="px-6 py-3 bg-orange-500 text-white rounded-full font-medium hover:bg-orange-600 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {isCreatingDesign ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Creating Design...
                            </>
                          ) : (
                            <>
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              Create Design
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )
                }];
              });

              // Save the document link
              const savedDocs = JSON.parse(localStorage.getItem("savedPRD") || "[]");
              savedDocs.push({
                url: docData.url,
                title: docData.title,
                createdAt: new Date().toISOString(),
                id: docData.docId,
              });
              localStorage.setItem("savedPRD", JSON.stringify(savedDocs));
              console.log('Dispatching PRD update events, savedDocs count:', savedDocs.length);
              window.dispatchEvent(new CustomEvent("prdCountUpdated", { detail: { count: savedDocs.length } }));
              window.dispatchEvent(new CustomEvent("savedPRDUpdated"));

              // Save to Supabase database
              if (session?.user?.email) {
                try {
                  const savedPrd = await savePrdToDatabase({
                    url: docData.url,
                    title: docData.title
                  });
                  console.log('PRD successfully saved to database:', savedPrd);
                } catch (error) {
                  console.error('Failed to save PRD to database:', error);
                  // Show user-friendly error message but don't break the flow
                  setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: '⚠️ Note: Your PRD was created successfully, but there was an issue saving it to the database. Please contact support if this persists.'
                  }]);
                }
              } else {
                console.warn('User not authenticated, skipping database save');
              }
              
              // Complete the knowledge session to update PM profile
              await knowledgeSession.completeKnowledgeSession(
                prdFlow.termDefinitions,
                prdFlow.questionAnswers,
                prdFlow.questions,
                mode
              );
            } catch (error) {
              console.error("Error generating content:", error);
              setMessages(prev => {
                const withoutWriting = prev.filter(msg => msg.content !== "I&apos;m writing your PRD document now...");
                return [...withoutWriting, {
                  role: 'assistant',
                  content: "Sorry, I encountered an error while generating the content. Please try again."
                }];
              });
            }
          } else {
            // Show next question
            const result = await prdFlow.showNextQuestion();
            if (result.shouldDelay) {
              await new Promise(resolve => setTimeout(resolve, 800));
            }
            if (result.nextQuestion) {
              setMessages(prev => [...prev, {
                role: 'assistant',
                content: result.nextQuestion.text
              }]);
            }
          }
        } catch (error) {
          console.error("Error processing question:", error);
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: "Sorry, I encountered an error. Please try again."
          }]);
        }
        break;

      case 'content':
        // Remove the thinking message
        setMessages(prev => prev.filter(msg => msg.content !== "Thinking..."));
        const docType = getDocumentType();
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `I&apos;ve noted your feedback. The ${docType.text} has been generated and saved to Google Docs.`
        }]);
        break;
    }
  };

  const openAgentMode = () => {
    setMode('agent');
    setShowBounce(false);
  };

  const handleCompetitorAnalysis = async (userQuery: string, competitorUrls: string[]) => {
    console.log('Starting competitor analysis:', { userQuery, competitorUrls });
    
    try {
      setLoading(true);
      
      // Add loading message
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '🔍 Analyzing competitors (this may take a moment)...'
      }]);

      // Call the comprehensive analysis API
      const response = await fetch('/api/analyze-competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userQuery,
          competitorUrls,
          username: session?.user?.name
        })
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('Analysis result:', result);
      
      // Create stylized result card
      setMessages(prev => prev.slice(0, -1).concat([{
        role: 'assistant',
        content: `✅ **Competitive Analysis Complete**

**Query:** ${result.query}
**Search Strategy:** ${result.synthesizedQuery}
**Pages Analyzed:** ${result.pagesAnalyzed}

## Summary
${result.summary}

## Key Insights
${result.insights.map((insight: string, index: number) => `${index + 1}. ${insight}`).join('\n')}

## Educational References
${result.references.slice(0, 10).map((ref: { title: string; url: string; snippet: string }) => 
  `**[${ref.title}](${ref.url})**\n*${ref.snippet.substring(0, 150)}...*`
).join('\n\n')}

---
*Analysis completed using ${result.pagesAnalyzed} pages from competitor help documentation*`
      }]));

    } catch (error) {
      console.error('Analysis failed:', error);
      setMessages(prev => prev.slice(0, -1).concat([{
        role: 'assistant',
        content: `❌ **Analysis Failed**
        
${error instanceof Error ? error.message : 'Unknown error occurred'}

Please try again with different URLs or check your internet connection.`
      }]));
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Check if user wants competitive analysis
    const lowerInput = input.toLowerCase();
    if (lowerInput.includes('analyze competitors') || lowerInput.includes('competitive analysis')) {
      const userMessage: ChatMessage = { role: 'user', content: input };
      setMessages(prev => [...prev, userMessage]);
      
      setInput('');
      
      // Ask for competitor URLs
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I\'ll help you analyze competitors! Please provide competitor help desk URLs (e.g., https://help.zendesk.com, https://support.intercom.com) by typing them, one per line:'
      }]);
      return;
    }

    // Check if user is providing URLs for analysis
    const urlPattern = /https?:\/\/[^\s]+/g;
    const urls = input.match(urlPattern);
    if (urls && urls.length > 0) {
      const userMessage: ChatMessage = { role: 'user', content: input };
      setMessages(prev => [...prev, userMessage]);
      setInput('');
      
      // Look for the query in previous messages
      const recentMessages = messages.slice(-5);
      const queryMessage = recentMessages.find(msg => 
        msg.role === 'user' && 
        msg.content &&
        !msg.content.toString().match(urlPattern) &&
        msg.content.toString().length > 10
      );
      
      if (queryMessage && queryMessage.content) {
        await handleCompetitorAnalysis(queryMessage.content.toString(), urls);
        return;
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Please first tell me what product or feature you\'re building so I can analyze how competitors solve similar problems.'
        }]);
        return;
      }
    }

    try {
      const userMessage: ChatMessage = { role: 'user', content: input };
      setMessages(prev => [...prev, userMessage]);
      setInput('');
      setLoading(true);
              setMessages(prev => [...prev, {
                role: 'assistant',
        content: "Thinking..." 
      }]);

      if (mode === ('design' as ChatMode)) {
        // Design mode: send message to v0 chat for iteration OR create new design
        console.log('Design mode - chatId:', v0ChatId, 'input:', input.substring(0, 50) + '...');
        
        // Add simple loading message
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: (
            <div className="os-notification p-space-4 flex items-center gap-space-3">
              <div className="loading-spinner"></div>
              <span className="text-poppy-primary font-medium">{v0ChatId ? 'Updating design...' : 'Creating design...'}</span>
            </div>
          )
        }]);
          
          
        // Call v0 API for design creation or update
        try {
          const v0ApiKey = localStorage.getItem('v0_api_key'); // Optional client-side API key
          
          const v0Response = await fetch('/api/v0-chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: input,
              chatId: v0ChatId, // Pass existing chatId for updates, null for new designs
              apiKey: v0ApiKey
            }),
          });

          if (!v0Response.ok) {
            const errorData = await v0Response.json();
            throw new Error(errorData.error || 'Failed to process design request');
          }

          const result = await v0Response.json();
          
          // Remove loading message and thinking message
          setMessages(prev => prev.filter(msg => 
            msg.content !== "Thinking..." && 
            !(typeof msg.content === 'object' && React.isValidElement(msg.content))
          ));

          if (result.success && result.demoUrl) {
            console.log('Design processed successfully:', result.chatId, result.demoUrl);
            
            // Update the iframe URL and chat ID
            setDemoUrl(result.demoUrl);
            setV0ChatId(result.chatId);
            
            // Add success message
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: (
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="flex items-center gap-2 text-green-600">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                      <span className="text-sm">✓</span>
                    </div>
                    <span className="font-medium">{result.isNewChat ? 'Design created!' : 'Design updated!'}</span>
                  </div>
                  <p className="text-gray-600 text-center">
                    Your design is live above. Keep iterating by describing changes you&apos;d like to make.
                  </p>
                </div>
              )
            }]);
            
            console.log('New design created with URL:', result.demoUrl, 'and chatId:', result.chatId);
          } else {
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: (
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="flex items-center gap-2 text-red-600">
                    <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                      <span className="text-sm">✗</span>
                    </div>
                    <span className="font-medium">Design creation failed</span>
                  </div>
                  <p className="text-gray-600 text-center">
                    {result.error || "Something went wrong. Please try again or check your API key in Settings."}
                  </p>
                </div>
              )
            }]);
          }
        } catch (error) {
          console.error('Error in design mode:', error);
          // Remove loading message and thinking message
          setMessages(prev => prev.filter(msg => 
            msg.content !== "Thinking..." && 
            !(typeof msg.content === 'object' && React.isValidElement(msg.content))
          ));
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: (
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="flex items-center gap-2 text-red-600">
                  <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                    <span className="text-sm">✗</span>
                  </div>
                  <span className="font-medium">Error</span>
                </div>
                <p className="text-gray-600 text-center">
                  {error instanceof Error ? error.message : "Something went wrong. Please try again."}
                </p>
              </div>
            )
          }]);
        }
      } else if (mode === 'draft') {
        await handleDraftMode(input);
      } else if (mode === 'chat') {
        // Get matched context from vector store using assistant search
        const cachedVectorStoreId = localStorage.getItem('vectorStoreId');
        const matchRes = await fetch("/api/assistant-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            query: input,
            vectorStoreId: cachedVectorStoreId 
          }),
        });

        if (!matchRes.ok) throw new Error("Failed to search vector store");
        const { matchedContext } = await matchRes.json();
        if (!matchedContext || !Array.isArray(matchedContext)) throw new Error("Invalid matched context response");

        prdFlow.setMatchedContext(matchedContext);

        // Generate brainstorm response
        const response = await fetch("/api/brainstorm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...messages, userMessage],
            additionalContext: prdFlow.matchedContext.join("\n"),
            teamTerms: JSON.parse(localStorage.getItem("teamTerms") || "{}"),
            storedContext: getEnrichedPersonalContext(),
            startPrd: false
          }),
        });
        const responseText = await collectStream(response);

        // Remove the thinking message
        setMessages(prev => prev.filter(msg => msg.content !== "Thinking..."));

        setMessages(prev => [...prev, { role: 'assistant', content: responseText }]);
      } else if (mode === 'feedback') {
        // Feedback mode: directly search for customer feedback matches
        console.log('Feedback mode - searching for matches:', input.substring(0, 50) + '...');
        
        // Remove thinking message and show searching message
        setMessages(prev => prev.filter(msg => msg.content !== "Thinking..."));
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: "Searching for relevant customer feedback..."
        }]);

        try {
          // Call the match-customers-to-prd API directly with the user's feedback input
          const response = await fetch('/api/match-customers-to-prd', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prdSummary: input // Use the user input directly as the search query
            })
          });

          if (!response.ok) {
            throw new Error('Failed to search for customer feedback');
          }

          const result = await response.json();
          
          // Remove searching message
          setMessages(prev => prev.filter(msg => msg.content !== "Searching for relevant customer feedback..."));

          if (result.matches && result.matches.length > 0) {
            // Create interactive customer cards with email CTAs
            const customerCards = (
              <div className="space-y-4">
                <div className="text-lg font-semibold text-gray-800 mb-4">
                  Found {result.matchCount} customers with relevant feedback:
                </div>
                {result.matches.slice(0, 5).map((match: Record<string, unknown>, index: number) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          Customer {String(match.klaviyo_account_id)}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            NPS: {String(match.nps_score_raw)}
                          </span>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {String(match.gmv)}
                          </span>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {Math.round(Number(match.match_score) * 100)}% match
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(String(match.survey_end_date)).toLocaleDateString()}
                      </div>
                    </div>
                    <p className="text-gray-700 text-sm mb-3 leading-relaxed">
                      &ldquo;{String(match.nps_verbatim)}&rdquo;
                    </p>
                    <button
                      onClick={() => handleGetEmailFromChat(match, index)}
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-poppy rounded-lg hover:bg-poppy/90 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Get Email &amp; Contact
                    </button>
                  </div>
                ))}
                <div className="text-sm text-gray-500 italic text-center mt-4">
                  💡 Tip: Click &ldquo;Get Email &amp; Contact&rdquo; to automatically open Gmail with a personalized message to each customer.
                </div>
              </div>
            );

            setMessages(prev => [...prev, {
              role: 'assistant',
              content: customerCards
            }]);
          } else {
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: "No relevant customer feedback found for your search. Try rephrasing your query or using different keywords related to customer pain points or feature requests."
            }]);
          }
        } catch (error) {
          console.error('Error in feedback search:', error);
          // Remove searching message
          setMessages(prev => prev.filter(msg => msg.content !== "Searching for relevant customer feedback..."));
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: "Sorry, I encountered an error while searching for customer feedback. Please try again."
          }]);
        }
      } else if (mode === 'competitive') {
        // Competitive analysis mode - show URL input UI
        setCompetitiveQuery(input);
        setShowCompetitiveUrlInput(true);
        
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `I&apos;ll help you research how competitors handle "${input}". Please add competitor help desk URLs below to analyze their documentation.`
        }]);
      } else {
        // Regular chat mode
        const response = await fetch("/api/brainstorm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...messages, userMessage],
            additionalContext: "",
            teamTerms: JSON.parse(localStorage.getItem("teamTerms") || "{}"),
            storedContext: getEnrichedPersonalContext(),
            startPrd: false
          }),
        });
        const responseText = await collectStream(response);

        // Remove the thinking message
        setMessages(prev => prev.filter(msg => msg.content !== "Thinking..."));

        setMessages(prev => [...prev, { role: 'assistant', content: responseText }]);
      }
    } catch (error) {
      console.error("Error:", error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Sorry, I encountered an error. Please try again." 
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to save PRD to Supabase database
  const savePrdToDatabase = async (prdData: { url: string; title: string }) => {
    try {
      console.log('Saving PRD to database:', prdData);
      
      const response = await fetch('/api/save-prd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: prdData.url,
          title: prdData.title
        }),
      });

      const result = await response.json();

      if (response.ok) {
        console.log('PRD saved to database successfully:', result.data);
        return result.data;
      } else {
        console.error('Failed to save PRD to database:', {
          status: response.status,
          error: result.error,
          details: result.details
        });
        throw new Error(`Failed to save PRD: ${result.error}${result.details ? ` - ${result.details}` : ''}`);
      }
    } catch (error) {
      console.error('Error saving PRD to database:', error);
      throw error;
    }
  };

  // Show professional loading state while initializing
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="os-panel p-space-8 flex flex-col items-center gap-space-4">
          <div className="loading-spinner loading-spinner--lg"></div>
          <div className="text-center">
            <span className="text-poppy-primary font-semibold">Initializing Product OS</span>
            <p className="text-warm-neutral text-sm mt-1">Setting up your workspace...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative transition-all duration-700 ease-in-out ${
      mode === 'design' ? 'h-screen' : ''
    }`}>
      {mode === 'agent' ? (
        // Agent mode UI
        <div className="p-4 relative z-30">
          {agenticMessages.map((msg, idx) => (
            <PoppyProactiveMessage
              key={idx}
              prdTitle={msg.prdTitle}
              openQuestions={msg.openQuestions}
              onScheduleWithCommenters={() => alert('Schedule with commenters')}
              onScheduleWithCustomers={() => alert('Schedule with customers')}
              onBrainstorm={() => alert('Brainstorm solutions')}
            />
          ))}
        </div>
      ) : mode === ('design' as ChatMode) ? (
      // Design mode: Split-screen layout with smooth visual transition
      <div className="flex h-screen w-full bg-neutral/80 transition-all duration-500 ease-in-out">
        {/* Left panel - chat interface */}
        <div className="w-96 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col shadow-lg">
          <Suspense fallback={
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-poppy"></div>
            </div>
          }>
            <DesignSidebar
              messages={messages}
              input={input}
              loading={loading}
              v0ChatId={v0ChatId}
              onInputChange={setInput}
              onSubmit={sendMessage}
              onModeChange={handleSafeModeChange}
            />
          </Suspense>
        </div>

        {/* Right area - design canvas */}
        <div className="flex-1 bg-white">
          {demoUrl ? (
            <iframe 
              src={demoUrl}
              width="100%" 
              height="100%"
              className="border-0 block transition-opacity duration-500"
              title="v0 Design Demo"
              style={{ display: 'block' }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100">
              <div className="text-center max-w-lg px-8">
                <div className="w-32 h-32 bg-gradient-to-br from-orange-100 via-yellow-100 to-orange-200 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg transform transition-transform duration-700 hover:scale-110">
                  <Paintbrush className="w-16 h-16 text-poppy" />
                </div>
                <h3 className="text-3xl font-bold text-primary mb-4">Design Canvas Ready</h3>
                <p className="text-gray-600 leading-relaxed text-lg">Your design will come to life here. Start chatting to create or iterate on your design prototype.</p>
                <div className="mt-8 flex items-center justify-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-sprout rounded-full animate-pulse"></div>
                    <span>Live Preview</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-poppy rounded-full animate-pulse"></div>
                    <span>Real-time Updates</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    ) : mode === ('techdoc' as ChatMode) ? (
      // Tech Doc mode: Full-screen wizard interface
      <div className="flex h-screen w-full bg-gray-50">
        <Suspense fallback={
          <div className="flex items-center justify-center h-full w-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-poppy"></div>
          </div>
        }>
          <TechDocWizard />
        </Suspense>
      </div>
    ) : (
      // Centered overlay chat interface
      <div className="flex flex-col h-screen relative">
        {/* Messages area - anchored to bottom when scrollable */}
        <div className="flex-1 overflow-y-auto relative flex flex-col" style={{ paddingBottom: '240px' }}>
          <div className="flex-1 flex flex-col justify-end px-6">
            <div className="w-full max-w-4xl mx-auto">
            {messages.length > 0 ? (
              <div className="py-4">
                <ChatMessageList
                  messages={messages}
                  loading={loading}
                  messagesEndRef={messagesEndRef}
                />
              </div>
            ) : (
              /* Empty state - warm and welcoming */
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center max-w-lg">
                  <div className="w-20 h-20 bg-gradient-to-br from-poppy/20 to-orange-100 rounded-3xl flex items-center justify-center mx-auto mb-6 transform transition-transform hover:scale-110">
                    <div className="text-3xl">
                      {mode === 'draft' && '✨'}
                      {mode === 'techdoc' && '📚'}
                      {mode === 'chat' && '👋'}
                      {mode === 'design' && '🎨'}
                      {mode === 'feedback' && '💬'}
                    </div>
                  </div>
                  <div className="text-2xl font-bold mb-3 text-gray-900">
                    {mode === 'draft' && 'Let\'s create something amazing'}
                    {mode === 'techdoc' && 'Transform PRDs into Documentation'}
                    {mode === 'chat' && 'Hi! I\'m Poppy, your PM partner'}
                    {mode === 'design' && 'Design Studio'}
                    {mode === 'feedback' && 'Let\'s find customer insights'}
                  </div>
                  <div className="text-base text-gray-600 leading-relaxed">
                    {mode === 'draft' && 'I\'ll guide you through creating a comprehensive PRD. Just share your product idea and I\'ll ask the right questions to help you think through every detail.'}
                    {mode === 'techdoc' && 'Select a PRD and I\'ll help you create comprehensive technical documentation that matches Klaviyo\'s style guide.'}
                    {mode === 'chat' && 'I can help with roadmap planning, feature prioritization, stakeholder communication, or any product challenge you\'re facing.'}
                    {mode === 'design' && 'Transform your ideas into interactive prototypes. Describe what you want to build and I\'ll help you visualize it.'}
                    {mode === 'feedback' && 'I\'ll search through customer feedback to find insights relevant to your feature or pain point. Just describe what you\'re looking for.'}
                  </div>
                  <div className="mt-6 text-sm text-gray-500 italic">
                    {mode === 'draft' && '💡 Tip: The more context you share, the better I can tailor the PRD to your needs'}
                    {mode === 'techdoc' && '💡 Tip: Have 2-3 Klaviyo help articles ready to ensure the documentation matches their style'}
                    {mode === 'chat' && '💡 Tip: Try the different modes below for specialized workflows'}
                    {mode === 'design' && '💡 Tip: You can also paste a PRD link to create designs from existing specs'}
                    {mode === 'feedback' && '💡 Tip: I can help you reach out to specific customers with relevant feedback'}
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>
          
        </div>

        {/* Floating input at bottom with border separator */}
        <div 
          className="fixed bottom-6 z-20"
          style={{
            left: `${sidebarWidth + 24}px`,
            right: '24px',
          }}
        >
          <div className="max-w-4xl mx-auto">
            {/* Subtle border line above input */}
            <div className="w-full h-px bg-gray-900/10 mb-4"></div>
            <div className="os-panel p-space-6 elevation-lg border-2 border-poppy-primary/10 bg-white" style={{
              boxShadow: '0 4px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)'
            }}>
              <ChatInput
                input={input}
                loading={loading}
                mode={mode}
                draftStep={prdFlow.draftStep}
                currentQuestionIndex={prdFlow.currentQuestionIndex}
                questions={prdFlow.questions}
                currentTermIndex={prdFlow.currentTermIndex}
                teamTerms={prdFlow.teamTerms}
                competitorUrls={prdFlow.competitorUrls}
                competitorAnalysis={prdFlow.competitorAnalysis}
                showStartPrdButton={showStartPrdButton}
                agenticMessages={agenticMessages}
                showBounce={showBounce}
                onInputChange={setInput}
                onSubmit={sendMessage}
                onModeChange={handleSafeModeChange}
                onSummarizeAndSave={handleSummarizeAndSave}
                onOpenAgentMode={openAgentMode}
                onCompetitorUrlsChange={prdFlow.setCompetitorUrls}
                competitiveUrls={competitiveUrls}
                showCompetitiveUrlInput={showCompetitiveUrlInput}
                onCompetitiveUrlsChange={setCompetitiveUrls}
                onCompetitiveAnalyze={handleCompetitiveAnalyze}
              />
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
