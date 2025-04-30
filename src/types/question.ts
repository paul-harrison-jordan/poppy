export interface Question {
  text: string;
  answer: string;
}

export interface QuestionContext {
  questions: Question[];
} 