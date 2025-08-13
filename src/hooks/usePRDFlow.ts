import { useState } from 'react';
import { Question, TeamTerm, MatchedContext } from '@/types/knowledge';
import { collectStream } from '@/lib/collectStream';
import { generateDocument } from '@/lib/services/documentGenerator';

interface CompetitorAnalysis {
  name: string;
  summary: string;
  ourEdge: string;
  sourceUrl?: string;
  features?: string[];
  relevantArticles?: Array<{
    title: string;
    url: string;
  }>;
  insights?: Array<{
    feature: string;
    description: string;
    customerBenefit: string;
    implementationHints: string;
    confidence: number;
    sourceUrl: string;
    keySection: string;
  }>;
}

type DraftStep = 'initial' | 'vocabulary' | 'questions' | 'content';

export function usePRDFlow() {
  const [draftStep, setDraftStep] = useState<DraftStep>('initial');
  const [originalQuery, setOriginalQuery] = useState<string>('');
  const [competitorUrls, setCompetitorUrls] = useState<string[]>(['']);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(-1);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});
  const [matchedContext, setMatchedContext] = useState<MatchedContext[]>([]);
  const [teamTerms, setTeamTerms] = useState<TeamTerm[]>([]);
  const [currentTermIndex, setCurrentTermIndex] = useState<number>(-1);
  const [termDefinitions, setTermDefinitions] = useState<Record<string, string>>({});
  const [internalTerms, setInternalTerms] = useState<string[]>([]);
  const [competitorAnalysis, setCompetitorAnalysis] = useState<CompetitorAnalysis[]>([]);

  const resetFlow = () => {
    setDraftStep('initial');
    setOriginalQuery('');
    setCompetitorUrls(['']);
    setQuestions([]);
    setCurrentQuestionIndex(-1);
    setQuestionAnswers({});
    setMatchedContext([]);
    setTeamTerms([]);
    setCurrentTermIndex(-1);
    setTermDefinitions({});
    setInternalTerms([]);
    setCompetitorAnalysis([]);
  };

  const processInitialInput = async (input: string) => {
    // Store the original query
    setOriginalQuery(input);
    
    // First, embed the request
    const embedResponse = await fetch("/api/embed-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: input }),
    });
    const embedResponseJson = await embedResponse.json();
    const embedding = embedResponseJson.queryEmbedding[0].embedding;

    // Then match context
    const matchResponse = await fetch("/api/match-embeds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embedding }),
    });
    const { matchedContext } = await matchResponse.json();
    setMatchedContext(matchedContext);

    // Generate vocabulary
    const vocabResponse = await fetch("/api/generate-vocabulary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Draft PRD",
        query: input,
        matchedContext: matchedContext,
        type: 'prd',
        teamTerms: JSON.parse(localStorage.getItem("teamTerms") || "{}")
      }),
    });
    const vocabText = await collectStream(vocabResponse);
    const vocabData = JSON.parse(vocabText);
    if (!Array.isArray(vocabData) || vocabData.length === 0) {
      throw new Error("No terms generated");
    }
    
    // Transform the terms into our TeamTerm format
    const formattedTerms = vocabData.map((term: string, index: number) => ({
      id: `term-${index}`,
      term: term,
      definition: ''
    }));
    setTeamTerms(formattedTerms);
    setDraftStep('vocabulary');
    setCurrentTermIndex(0);
    
    return formattedTerms[0];
  };

  const processVocabularyInput = (input: string) => {
    const currentTerm = teamTerms[currentTermIndex];
    const newDefinitions = {
      ...termDefinitions,
      [currentTerm.term]: input
    };
    setTermDefinitions(newDefinitions);
    
    // Merge with existing teamTerms in localStorage
    const existingTeamTerms = JSON.parse(localStorage.getItem("teamTerms") || "{}") || {};
    const mergedTeamTerms = { ...existingTeamTerms, ...newDefinitions };
    localStorage.setItem("teamTerms", JSON.stringify(mergedTeamTerms));
    
    return { isLastTerm: currentTermIndex >= teamTerms.length - 1 };
  };

  const showNextTerm = async () => {
    if (currentTermIndex < teamTerms.length - 1) {
      const nextIndex = currentTermIndex + 1;
      setCurrentTermIndex(nextIndex);
      return { nextTerm: teamTerms[nextIndex], shouldDelay: true };
    } else {
      setDraftStep('questions');
      return { shouldGenerateQuestions: true, shouldDelay: true };
    }
  };

  const generateQuestions = async () => {
    const questionsResponse = await fetch("/api/generate-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        title: "Draft PRD",
        query: originalQuery,
        matchedContext: matchedContext.join("\n"), // Convert array to string
        type: 'prd',
        teamTerms: JSON.stringify(JSON.parse(localStorage.getItem("teamTerms") || "{}")), // Convert to string
        storedContext: localStorage.getItem("personalContext") || ""
      }),
    });

    if (!questionsResponse.ok) {
      throw new Error("Failed to generate questions");
    }

    const questionsText = await collectStream(questionsResponse);
    const questionsData = JSON.parse(questionsText);

    if (!questionsData.questions || !Array.isArray(questionsData.questions) || questionsData.questions.length === 0) {
      console.error("Invalid questions response:", questionsData);
      throw new Error("No questions generated");
    }

    setQuestions(questionsData.questions);
    if (questionsData.internalTerms) {
      setInternalTerms(questionsData.internalTerms);
    }
    
    setCurrentQuestionIndex(0);
    return questionsData.questions[0];
  };

  const processQuestionInput = (input: string) => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) {
      console.error("No current question found");
      return { error: "No current question found" };
    }

    const newAnswers = {
      ...questionAnswers,
      [currentQuestion.text]: input
    };
    setQuestionAnswers(newAnswers);

    return { 
      isLastQuestion: currentQuestionIndex === questions.length - 1,
      currentQuestion,
      updatedAnswers: newAnswers
    };
  };

  const showNextQuestion = async () => {
    if (currentQuestionIndex < questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      return { nextQuestion: questions[nextIndex], shouldDelay: true };
    } else {
      setDraftStep('content');
      return { shouldGenerateContent: true, shouldDelay: true };
    }
  };

  const generateContent = async () => {
    const questionAnswersWithReasoning = Object.entries(questionAnswers).map(([questionText, answer]) => {
      const question = questions.find(q => q.text === questionText);
      return {
        question: questionText,
        reasoning: question?.reasoning,
        answer: answer
      };
    });

    // Filter out empty competitor URLs
    const validCompetitorUrls = competitorUrls.filter(url => url.trim() !== '');

    const docData = await generateDocument(
      'prd',
      'Draft PRD',
      originalQuery,
      questionAnswersWithReasoning,
      undefined, // matchedContext (passed as undefined for now)
      validCompetitorUrls
    );

    if (!docData.url) {
      throw new Error("No document URL received");
    }

    return docData;
  };

  const analyzeCompetitors = async (username?: string, query?: string) => {
    // Use provided query or fall back to original query
    const analysisQuery = query || originalQuery;
    
    if (!analysisQuery.trim()) {
      return { competitors: [], error: 'Please provide a query to analyze' };
    }

    // Filter out empty competitor URLs
    const validCompetitorUrls = competitorUrls.filter(url => url.trim() !== '');
    
    if (validCompetitorUrls.length === 0) {
      return { competitors: [], error: 'Please provide competitor URLs to analyze' };
    }

    try {
      // Build product context from available data
      const productContext = {
        productArea: analysisQuery,
        userPersona: internalTerms.join(', '),
        businessGoals: Object.values(questionAnswers).join(' '),
        existingFeatures: Object.keys(termDefinitions)
      };

      const response = await fetch('/api/competitive-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: analysisQuery,
          urls: validCompetitorUrls,
          productContext,
          username
        })
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`);
      }

      const data = await response.json();
      setCompetitorAnalysis(data.competitors || []);
      return data;
    } catch (error) {
      console.error('Failed to analyze competitors:', error);
      setCompetitorAnalysis([]);
      return { competitors: [], error: error instanceof Error ? error.message : 'Analysis failed' };
    }
  };

  return {
    // State
    draftStep,
    originalQuery,
    competitorUrls,
    competitorAnalysis,
    questions,
    currentQuestionIndex,
    questionAnswers,
    matchedContext,
    teamTerms,
    currentTermIndex,
    termDefinitions,
    internalTerms,
    
    // Actions
    resetFlow,
    processInitialInput,
    processVocabularyInput,
    showNextTerm,
    generateQuestions,
    processQuestionInput,
    showNextQuestion,
    generateContent,
    analyzeCompetitors,
    
    // Setters for external use
    setDraftStep,
    setOriginalQuery,
    setCompetitorUrls,
    setQuestions,
    setCurrentQuestionIndex,
    setQuestionAnswers,
    setMatchedContext,
    setTeamTerms,
    setCurrentTermIndex,
    setTermDefinitions,
    setInternalTerms
  };
}