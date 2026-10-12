export type Choice = { id: string; text: string };
export type Question = {
  id: string;
  subject: string;
  originalGroupNumber: number;
  groupTitle: string;
  topic: string;
  originalQuestionNumber: number;
  sourceLocalNumber: number;
  type: "multiple-choice" | "true-false" | "identification";
  prompt: string;
  choices?: Choice[];
  correctAnswer: string | boolean;
  acceptedAnswers?: string[];
  caseSensitive?: boolean;
  explanation: string;
  distractorExplanations: Record<string, string>;
  correctedStatement?: string;
  verification: string;
  choicesMayShuffle: boolean;
};
export type Quiz = {
  id: string;
  title: string;
  description: string;
  subject: string;
  questions: Question[];
};
export type Response = {
  value: string | boolean;
  checked: boolean;
  correct?: boolean;
};
export type Attempt = {
  version: string;
  quizId: string;
  mode: "original" | "mistakes";
  questionOrder: string[];
  choiceOrder: Record<string, string[]>;
  current: number;
  responses: Record<string, Response>;
  originalResponses?: Record<string, Response>;
  setup: {
    shuffleQuestions: boolean;
    shuffleChoices: boolean;
    startingQuestion: number;
  };
  originalScore?: number;
  originalMistakes: string[];
  remainingMistakes: string[];
  rounds: number;
  completed: boolean;
};
