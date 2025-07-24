'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { collectStream } from "@/lib/collectStream"
import { Paintbrush } from "lucide-react"
import PoppyProactiveMessage from './poppy/PoppyProactiveMessage';
import { usePRDStore } from '@/store/prdStore';
import { createClient } from '@/utils/supabase/client';
import { useKnowledgeSession } from '@/hooks/useKnowledgeSession';
import { usePRDFlow } from '@/hooks/usePRDFlow';
import DesignSidebar from './DesignSidebar';
import ChatMessageList from './ChatMessageList';
import ChatInput from './ChatInput';

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

type ChatMode = 'chat' | 'draft' | 'brainstorm' | 'agent' | 'design';



export default function ChatInterface() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<ChatMode>('brainstorm');
  const [sidebarWidth, setSidebarWidth] = useState(256); // Default width
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [pendingSummary, setPendingSummary] = useState<string | null>(null);
  const agenticMessages = usePRDStore((state) => state.agenticMessages);
  const [showBounce, setShowBounce] = useState(false);
  const [showStartPrdButton, setShowStartPrdButton] = useState(false);
  const [, setCompletedPrdContent] = useState<string>('');
  const [demoUrl, setDemoUrl] = useState<string | null>(null);
  const [isCreatingDesign, setIsCreatingDesign] = useState(false);
  const [v0ChatId, setV0ChatId] = useState<string | null>(null);

  // Use custom hooks
  const knowledgeSession = useKnowledgeSession();
  const prdFlow = usePRDFlow();


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

    // Check URL parameters for design mode and PRD link
    const urlParams = new URLSearchParams(window.location.search);
    const modeParam = urlParams.get('mode');
    const prdParam = urlParams.get('prd');
    
    if (modeParam === 'design' && prdParam) {
      setMode('design');
      // Fetch PRD content and trigger design creation
      fetchPRDAndCreateDesign(prdParam);
    }
  }, []);

  // Listen for sidebar width changes
  useEffect(() => {
    const updateSidebarWidth = () => {
      const sidebar = document.querySelector('nav[class*="w-"]');
      if (sidebar) {
        setSidebarWidth(sidebar.getBoundingClientRect().width);
      }
    };

    // Initial width calculation
    updateSidebarWidth();

    // Listen for window resize and sidebar changes
    window.addEventListener('resize', updateSidebarWidth);
    
    // Create observer to watch for sidebar changes
    const observer = new MutationObserver(updateSidebarWidth);
    const sidebar = document.querySelector('nav[class*="w-"]');
    if (sidebar) {
      observer.observe(sidebar, { attributes: true, attributeFilter: ['class'] });
    }

    return () => {
      window.removeEventListener('resize', updateSidebarWidth);
      observer.disconnect();
    };
  }, []);

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
          // Use the document content to create design
          await handleCreateDesign(content);
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

  const handleCreateDesign = async (prdContent: string) => {
    try {
      setIsCreatingDesign(true);
      console.log('Creating design with PRD content');

      // Add engaging loading message
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 border-4 border-poppy border-t-transparent rounded-full animate-spin" />
              <span className="text-lg font-medium text-gray-700">Creating your design...</span>
            </div>
            <div className="text-sm text-gray-500 animate-pulse">
              ✨ Analyzing your PRD and generating UI components
            </div>
          </div>
        )
      }]);

      // Get the user's V0 API key from localStorage
      const v0ApiKey = localStorage.getItem('v0_api_key');
      if (!v0ApiKey) {
        // Remove loading message and show error
        setMessages(prev => prev.filter(msg => 
          !(typeof msg.content === 'object' && React.isValidElement(msg.content))
        ));
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: "Please configure your V0 API key in Settings before using Design Mode."
        }]);
        return;
      }

      // First generate the design prompt
      const designPromptResponse = await fetch('/api/generate-design-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prdText: prdContent
        }),
      });

      if (!designPromptResponse.ok) {
        throw new Error('Failed to generate design prompt');
      }

      const designPromptData = await designPromptResponse.json();

      // Then create V0 chat with the generated design prompt
      const response = await fetch('/api/create-v0-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: designPromptData.designPrompt,
          apiKey: v0ApiKey,
          designSummary: designPromptData.designSummary,
          pmProfileUsed: designPromptData.pmProfileUsed
        }),
      });

      console.log('API response status:', response.status);
      const result = await response.json();
      console.log('Design creation result:', result);

      // Remove loading message
      setMessages(prev => prev.filter(msg => 
        !(typeof msg.content === 'object' && React.isValidElement(msg.content))
      ));

      if (result.success) {
        console.log('Design created successfully:', result.chat.id);
        console.log('Demo URL:', result.chat.demo);
        console.log('Setting demoUrl state to:', result.chat.demo);
        console.log('Current mode before switch:', mode);
        
        // SENIOR ENGINEER FIX: Direct state update with immediate mode transition
        const newDemoUrl = result.chat.demo || null;
        const newChatId = result.chat.id || null;
        
        setDemoUrl(newDemoUrl);
        setV0ChatId(newChatId);
        setMode('design');
        
        // Update localStorage and dispatch event for sidebar collapse
        localStorage.setItem('currentChatMode', 'design');
        window.dispatchEvent(new CustomEvent('chatModeChange', { detail: { mode: 'design' } }));
        
        // Set the design mode message directly with the known URL
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
        
        console.log('Switched to design mode with URL:', newDemoUrl, 'and chatId:', newChatId);
        
        // Update Supabase with v0 demo link
        if (session?.user?.email && result.chat.demo) {
          try {
            const savedDocs = JSON.parse(localStorage.getItem("savedPRD") || "[]");
            const latestPrd = savedDocs[savedDocs.length - 1]; // Get the most recent PRD
            
            if (latestPrd?.url) {
              const response = await fetch('/api/update-prd-v0-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  driveLink: latestPrd.url,
                  v0Link: result.chat.demo
                }),
              });

              if (response.ok) {
                console.log('Updated PRD with v0 demo link in database:', result.chat.demo);
              } else {
                console.error('Error updating v0 link in database');
              }
            }
          } catch (error) {
            console.error('Error updating v0 link in database:', error);
          }
        }
        
        // Force a re-render by logging after state updates
        setTimeout(() => {
          console.log('After state updates - demoUrl should be:', newDemoUrl);
          console.log('After state updates - mode should be: design');
        }, 100);
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
              Unable to connect to the design service. Please check your internet connection and try again.
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
    setMode(newMode);
    prdFlow.resetFlow();
    
    // Update localStorage and dispatch event for consistent state tracking
    localStorage.setItem('currentChatMode', newMode);
    window.dispatchEvent(new CustomEvent('chatModeChange', { detail: { mode: newMode } }));
    
    if (newMode === 'draft') {
      // Create a new knowledge session for PRD generation
      knowledgeSession.createKnowledgeSession('prd_generation', newMode);
    }
    
    // Don't add default messages - let the input be the focus
    setMessages([]);
  };

  const handleSafeModeChange = (newMode: ChatMode) => {
    // For now, directly change mode - can add confirmation logic later if needed
    handleModeChange(newMode);
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
        if (!v0ChatId) {
          // No active session - create a new design
          console.log('Creating new design from design mode input:', input);
          
          // Add engaging loading message for new design creation
              setMessages(prev => [...prev, {
                role: 'assistant',
            content: (
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 border-4 border-poppy border-t-transparent rounded-full animate-spin" />
                  <span className="text-lg font-medium text-gray-700">Bringing your idea to life...</span>
                </div>
                <div className="text-sm text-gray-500 animate-pulse">
                  🎨 Crafting UI components based on your description
                </div>
              </div>
            )
          }]);
          
          // Get the user's V0 API key from localStorage
          const v0ApiKey = localStorage.getItem('v0_api_key');
          if (!v0ApiKey) {
            // Remove loading message
            setMessages(prev => prev.filter(msg => 
              !(typeof msg.content === 'object' && React.isValidElement(msg.content))
            ));
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: "Please configure your V0 API key in Settings before using Design Mode. Click the Settings icon in the top right corner."
            }]);
            setLoading(false);
            return;
          }
          
          const response = await fetch('/api/create-v0-chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
                  body: JSON.stringify({
              message: input, // Use the user's input directly as the design prompt
              apiKey: v0ApiKey
            }),
          });

          const result = await response.json();
          
          // Remove loading message and thinking message
          setMessages(prev => prev.filter(msg => 
            msg.content !== "Thinking..." && 
            !(typeof msg.content === 'object' && React.isValidElement(msg.content))
          ));

          if (result.success) {
            // Set up the new design session
            const newDemoUrl = result.chat.demo || null;
            const newChatId = result.chat.id || null;
            
            setDemoUrl(newDemoUrl);
            setV0ChatId(newChatId);
            
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: (
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="flex items-center gap-2 text-green-600">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                      <span className="text-sm">✓</span>
                    </div>
                    <span className="font-medium">Design created!</span>
                  </div>
                  <p className="text-gray-600 text-center">
                    Your design is live above. Keep iterating by describing changes you&apos;d like to make.
                  </p>
                </div>
              )
            }]);
            
            console.log('New design created with URL:', newDemoUrl, 'and chatId:', newChatId);
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
        } else {
          // Existing session - update the design
          // Add engaging loading message for design updates
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: (
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-lg font-medium text-gray-700">Updating your design...</span>
                </div>
                <div className="text-sm text-gray-500 animate-pulse">
                  🔄 Applying your changes and regenerating components
                </div>
              </div>
            )
          }]);
          
          // Get the user's V0 API key from localStorage
          const v0ApiKey = localStorage.getItem('v0_api_key');
          if (!v0ApiKey) {
            // Remove loading message
            setMessages(prev => prev.filter(msg => 
              !(typeof msg.content === 'object' && React.isValidElement(msg.content))
            ));
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: "Your V0 API key is missing. Please reconfigure it in Settings."
            }]);
            setLoading(false);
            return;
          }
          
          const response = await fetch('/api/update-v0-chat', {
                    method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              chatId: v0ChatId,
              message: input,
              apiKey: v0ApiKey
            }),
          });

          const result = await response.json();
          
          // Remove loading message and thinking message
          setMessages(prev => prev.filter(msg => 
            msg.content !== "Thinking..." && 
            !(typeof msg.content === 'object' && React.isValidElement(msg.content))
          ));

          if (result.success) {
            // Update the demo URL with the new iteration
            setDemoUrl(result.chat.demo || null);
            
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: (
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="flex items-center gap-2 text-blue-600">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-sm">✓</span>
                    </div>
                    <span className="font-medium">Design updated!</span>
                  </div>
                  <p className="text-gray-600 text-center">
                    Your changes have been applied. The updated design is now showing above.
                  </p>
                </div>
              )
            }]);
                        } else {
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: (
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="flex items-center gap-2 text-red-600">
                    <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                      <span className="text-sm">✗</span>
                    </div>
                    <span className="font-medium">Update failed</span>
                  </div>
                  <p className="text-gray-600 text-center">
                    {result.error || "Unable to update the design. Please try again or check your API key."}
                  </p>
                </div>
              )
            }]);
          }
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

  return (
    <div className={`relative ${mode === 'design' ? 'h-screen' : ''}`}>
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
      // Design mode: Split-screen layout with sidebar hidden
      <div 
        className="flex h-screen w-full bg-neutral/80" 
      >
        {/* Left panel - chat interface flush with left edge */}
        <div className="w-96 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col shadow-lg">
          <DesignSidebar
            messages={messages}
            input={input}
            loading={loading}
            v0ChatId={v0ChatId}
            onInputChange={setInput}
            onSubmit={sendMessage}
            onModeChange={handleSafeModeChange}
          />
        </div>

        {/* Right area - full iframe taking remaining space */}
        <div className="flex-1 bg-white">
          {demoUrl ? (
            <iframe 
              src={demoUrl}
              width="100%" 
              height="100%"
              className="border-0 block"
              title="v0 Design Demo"
              style={{ display: 'block' }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100">
              <div className="text-center max-w-lg px-8">
                <div className="w-32 h-32 bg-gradient-to-br from-orange-100 via-yellow-100 to-orange-200 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg">
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
      // Chat mode: fixed position layout with scrolling messages and fade effect
      <div className="flex flex-col h-screen max-w-6xl mx-auto relative">
        {/* Messages area - fixed position with overflow scroll */}
        <div className="flex-1 overflow-y-auto pb-40 relative">
          {messages.length > 0 ? (
            <div className="px-6 py-4">
              <ChatMessageList
                messages={messages}
                loading={loading}
                messagesEndRef={messagesEndRef}
              />
            </div>
          ) : (
            /* Empty state with contextual guidance */
            <div className="h-full flex items-center justify-center px-6">
              <div className="text-center text-gray-500 max-w-md">
                <div className="text-lg font-medium mb-2 text-gray-700">
                  {mode === 'draft' && 'Ready to draft your PRD'}
                  {mode === 'brainstorm' && 'Let\'s brainstorm ideas'}
                  {mode === 'chat' && 'Chat with Poppy'}
                  {mode === 'design' && 'Design Mode'}
                </div>
                <div className="text-sm text-gray-500">
                  {mode === 'draft' && 'Share your product idea, JTBD, and context to get started'}
                  {mode === 'brainstorm' && 'Describe your initial thoughts or questions'}
                  {mode === 'chat' && 'Ask me anything about product management'}
                  {mode === 'design' && 'Create or iterate on designs'}
                </div>
              </div>
            </div>
          )}
          
          {/* Fade overlay at top */}
          <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-white via-white/80 to-transparent pointer-events-none z-10" />
        </div>

        {/* Input at bottom - fixed position */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg z-20">
          <div className="max-w-6xl mx-auto p-6">
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
      )}
    </div>
  );
}
