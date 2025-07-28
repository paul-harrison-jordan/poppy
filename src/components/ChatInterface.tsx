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

// Lazy load heavy components
const DesignSidebar = lazy(() => import('./DesignSidebar'));

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

type ChatMode = 'chat' | 'draft' | 'brainstorm' | 'agent' | 'design' | 'feedback';



export default function ChatInterface() {
  const { data: session, status } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<ChatMode>('brainstorm');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [pendingSummary, setPendingSummary] = useState<string | null>(null);
  const agenticMessages = usePRDStore((state) => state.agenticMessages);
  const [showBounce, setShowBounce] = useState(false);
  const [showStartPrdButton, setShowStartPrdButton] = useState(false);
  const [, setCompletedPrdContent] = useState<string>('');
  const [demoUrl, setDemoUrl] = useState<string | null>(null);
  const [isCreatingDesign, setIsCreatingDesign] = useState(false);
  const [v0ChatId, setV0ChatId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(256);

  // Use custom hooks
  const knowledgeSession = useKnowledgeSession();
  const prdFlow = usePRDFlow();

  // Initialize component after session and hooks are ready
  useEffect(() => {
    if (status !== 'loading' && knowledgeSession && prdFlow) {
      // Restore mode from localStorage
      const savedMode = localStorage.getItem('currentChatMode') as ChatMode;
      if (savedMode && ['chat', 'draft', 'brainstorm', 'agent', 'design', 'feedback'].includes(savedMode)) {
        setMode(savedMode);
      }
      
      setIsInitialized(true);
    }
  }, [status, knowledgeSession, prdFlow]);

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
      
      const response = await fetch(`/api/features/${featureId}/design`);
      
      if (response.ok) {
        const { feature } = await response.json();
        
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

  // Add useEffect for auto-scrolling
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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

  // Add useEffect to show Start PRD button after 3 messages in brainstorm mode
  useEffect(() => {
    if (mode === 'brainstorm') {
      const userMessages = messages.filter(msg => msg.role === 'user');
      console.log('Brainstorm Message count:', {
        total: messages.length,
        user: userMessages.length,
        showButton: userMessages.length >= 3
      });
      setShowStartPrdButton(userMessages.length >= 3);
    } else {
      setShowStartPrdButton(false);
    }
  }, [messages, mode]);

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

      // Add simple loading message
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: (
          <div className="flex items-center gap-3 py-4">
            <div className="w-6 h-6 border-2 border-poppy border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-700">Creating your design...</span>
          </div>
        )
      }]);


      // Call generate-design-prompt which now handles the v0 call
      const response = await fetch('/api/generate-design-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prdText: prdContent
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate design');
      }

      const result = await response.json();


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
              <div className="flex items-center gap-2 text-green-600">
                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-sm">✓</span>
                </div>
                <span className="font-medium">Design created successfully!</span>
              </div>
              <p className="text-gray-600 text-center">
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

  // Summarize and save as PRD for brainstorm mode
  const handleSummarizeAndSave = async () => {
    if (!messages.length || mode !== 'brainstorm') return;
    try {
      setLoading(true);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I'm summarizing our conversation and preparing to start the PRD..." 
      }]);

      const storedContext = localStorage.getItem("personalContext");
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
    // For now, directly change mode - can add confirmation logic later if needed
    handleModeChange(newMode);
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
            content: `Can you please define "${firstTerm.term}"?`
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
              await new Promise(resolve => setTimeout(resolve, 800));
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
                content: `Can you please define "${result.nextTerm.term}"?`
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
                    <div className="flex flex-col items-center gap-4">
                      <p>Your {docType.text} is ready! Click below to view it in Google Docs or create a design prototype.</p>
                      <div className="flex gap-3">
                      <a
                        href={docData.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-3 bg-poppy text-white rounded-full font-medium hover:bg-poppy/90 transition-colors shadow-md"
                      >
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
                            'Create Design'
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

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

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
            <div className="flex items-center gap-3 py-4">
              <div className="w-6 h-6 border-2 border-poppy border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-700">{v0ChatId ? 'Updating design...' : 'Creating design...'}</span>
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
      } else if (mode === 'brainstorm') {
        // Get embedding for the query
        const embedRes = await fetch("/api/embed-request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: input }),
        });
        
        if (!embedRes.ok) throw new Error("Failed to get embedding");
        const { queryEmbedding } = await embedRes.json();
        if (!queryEmbedding || !Array.isArray(queryEmbedding)) throw new Error("Invalid embedding response");

        const embedding = queryEmbedding[0].embedding;

        // Get matched context from Pinecone
        const matchRes = await fetch("/api/match-embeds", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ embedding }),
        });

        if (!matchRes.ok) throw new Error("Failed to match embeddings");
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
            storedContext: localStorage.getItem("personalContext"),
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
      } else {
        // Regular chat mode
        const response = await fetch("/api/brainstorm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...messages, userMessage],
            additionalContext: "",
            teamTerms: JSON.parse(localStorage.getItem("teamTerms") || "{}"),
            storedContext: localStorage.getItem("personalContext"),
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

  // Show loading state while initializing
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-poppy border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-600">Initializing Poppy...</span>
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
        <div className="p-4">
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
    ) : (
      // Centered overlay chat interface
      <div className="flex flex-col h-screen relative">
        {/* Messages area - centered container with consistent width */}
        <div className="flex-1 overflow-y-auto pb-48 relative">
          <div className="flex justify-center px-6">
            <div className="w-full max-w-4xl">
            {messages.length > 0 ? (
              <div className="py-4">
                <ChatMessageList
                  messages={messages}
                  loading={loading}
                  messagesEndRef={messagesEndRef}
                />
              </div>
            ) : (
              /* Empty state with contextual guidance */
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-gray-500 max-w-md">
                  <div className="text-lg font-medium mb-2 text-gray-700">
                    {mode === 'draft' && 'Ready to draft your PRD'}
                    {mode === 'brainstorm' && 'Let\'s brainstorm ideas'}
                    {mode === 'chat' && 'Chat with Poppy'}
                    {mode === 'design' && 'Design Mode'}
                    {mode === 'feedback' && 'Search Customer Feedback'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {mode === 'draft' && 'Share your product idea, JTBD, and context to get started'}
                    {mode === 'brainstorm' && 'Describe your initial thoughts or questions'}
                    {mode === 'chat' && 'Ask me anything about product management'}
                    {mode === 'design' && 'Create or iterate on designs'}
                    {mode === 'feedback' && 'Describe a feature idea or pain point to find relevant customer feedback'}
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>
          
          {/* Fade overlay at top */}
          <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-white via-white/80 to-transparent pointer-events-none z-10" />
          
          {/* Fade overlay at bottom to prevent content from showing behind input */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white via-white/90 to-transparent pointer-events-none z-10" />
        </div>

        {/* Input at bottom - normal positioning */}
        <div 
          className="fixed bottom-6 z-20"
          style={{
            left: `${sidebarWidth}px`,
            right: '0px',
            paddingLeft: '24px',
            paddingRight: '24px',
          }}
        >
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-6">
              <ChatInput
                input={input}
                loading={loading}
                mode={mode}
                draftStep={prdFlow.draftStep}
                currentQuestionIndex={prdFlow.currentQuestionIndex}
                questions={prdFlow.questions}
                currentTermIndex={prdFlow.currentTermIndex}
                teamTerms={prdFlow.teamTerms}
                showStartPrdButton={showStartPrdButton}
                agenticMessages={agenticMessages}
                showBounce={showBounce}
                onInputChange={setInput}
                onSubmit={sendMessage}
                onModeChange={handleSafeModeChange}
                onSummarizeAndSave={handleSummarizeAndSave}
                onOpenAgentMode={openAgentMode}
              />
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
