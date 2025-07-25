import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Question } from '@/types/knowledge';

interface QuestionAnswer {
  question: string;
  reasoning?: string;
  answer: string;
  domain_category: string;
}

interface VocabularyAnswer {
  term: string;
  definition: string;
  domain_tags: string[];
  usage_context: string;
}

export function useKnowledgeSession() {
  const { data: session } = useSession();
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);

  const createKnowledgeSession = async (sessionType: 'vocabulary' | 'questions' | 'brainstorm' | 'prd_generation', mode: string) => {
    if (!session?.user?.email) return;
    
    try {
      const response = await fetch('/api/knowledge/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_type: sessionType,
          context_data: {
            mode: mode,
            startTime: new Date().toISOString()
          }
        })
      });
      
      if (response.ok) {
        const { session: newSession } = await response.json();
        setCurrentSessionId(newSession.id);
        console.log('Knowledge session created:', newSession.id);
        return newSession.id;
      }
    } catch (error) {
      console.error('Failed to create knowledge session:', error);
    }
  };

  const storeQuestionResponse = async (question: Question, answer: string, mode: string) => {
    if (!currentSessionId || !session?.user?.email) return;
    
    try {
      const response = await fetch('/api/knowledge/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: currentSessionId,
          question_text: question.text,
          question_reasoning: question.reasoning,
          user_answer: answer,
          domain_category: 'product_management',
          context_data: {
            mode: mode,
            question_id: question.id,
            timestamp: new Date().toISOString()
          }
        })
      });
      
      if (response.ok) {
        console.log('Question response stored:', question.id);
      } else {
        console.error('Failed to store question response');
      }
    } catch (error) {
      console.error('Error storing question response:', error);
    }
  };

  const completeKnowledgeSession = async (
    termDefinitions: Record<string, string>,
    questionAnswers: Record<string, string>,
    questions: Question[],
    mode: string
  ) => {
    if (!currentSessionId || !session?.user?.email) return;
    
    try {
      const vocabularyAnswers: VocabularyAnswer[] = Object.entries(termDefinitions).map(([term, definition]) => ({
        term,
        definition,
        domain_tags: ['product_management'],
        usage_context: `Defined during ${mode} mode`
      }));

      const questionAnswersArray: QuestionAnswer[] = Object.entries(questionAnswers).map(answer => {
        const question = questions.find(q => q.text === answer[0]);
        return {
          question: answer[0],
          reasoning: question?.reasoning,
          answer: answer[1],
          domain_category: 'product_management'
        };
      });

      const response = await fetch('/api/knowledge/complete-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSessionId,
          vocabularyAnswers: vocabularyAnswers.length > 0 ? vocabularyAnswers : undefined,
          questionAnswers: questionAnswersArray.length > 0 ? questionAnswersArray : undefined,
          contextData: {
            mode: mode,
            endTime: new Date().toISOString(),
            documentsCreated: 1
          }
        })
      });
      
      if (response.ok) {
        console.log('Knowledge session completed and PM profile updated');
        setCurrentSessionId(null);
      }
    } catch (error) {
      console.error('Failed to complete knowledge session:', error);
    }
  };

  return {
    currentSessionId,
    createKnowledgeSession,
    storeQuestionResponse,
    completeKnowledgeSession
  };
}