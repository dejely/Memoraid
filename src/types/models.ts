import type { GradingMode, GradingMethod } from "../services/math/grading";
export type SourceType = "manual" | "imported";
export type ReviewResult = "easy" | "hard" | "correct" | "incorrect";
export type SessionMode = "flashcard";
export type QuestionType = "multiple_choice" | "true_false" | "written";
export type ThemePreference = "system" | "light" | "dark";

export interface StudyCard {
  id: string;
  deckId: string;
  term: string;
  definition: string;
  example: string | null;
  gradingMode?: GradingMode;
  numericTolerance?: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewStats {
  cardId: string;
  deckId: string;
  easeScore: number;
  easyCount: number;
  hardCount: number;
  lastReviewedAt: string | null;
  dueAt: string | null;
  lastResult: ReviewResult | null;
}

export interface DeckSummary {
  id: string;
  title: string;
  description: string;
  tags: string[];
  cardCount: number;
  dueCount: number;
  updatedAt: string;
  lastStudiedAt: string | null;
  sourceType: SourceType;
}

export interface Deck extends DeckSummary {
  cards: Array<StudyCard & { reviewStats?: ReviewStats | null }>;
}

export interface DeckDraft {
  title: string;
  description: string;
  tags: string[];
  cards: CardDraft[];
  sourceType?: SourceType;
}

export interface CardDraft {
  id?: string;
  term: string;
  definition: string;
  example?: string;
  gradingMode?: GradingMode;
  numericTolerance?: number;
}

export interface FlashcardSession {
  id: string;
  deckId: string;
  mode: SessionMode;
  currentIndex: number;
  order: string[];
  shuffleEnabled: boolean;
  easyCount: number;
  hardCount: number;
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface ActivityItem {
  id: string;
  type: "study" | "test";
  title: string;
  subtitle: string;
  happenedAt: string;
}

export interface DueCard {
  cardId: string;
  deckId: string;
  deckTitle: string;
  term: string;
  dueAt: string | null;
}

export interface TestAttemptSummary {
  id: string;
  deckId: string;
  deckTitle: string;
  totalQuestions: number;
  correctAnswers: number;
  objectiveCorrect: number;
  objectiveTotal: number;
  writtenCount: number;
  scorePercent: number;
  startedAt: string;
  finishedAt: string;
  weakCardCount: number;
}

export interface TestQuestionRecord {
  id: string;
  attemptId: string;
  cardId: string;
  questionType: QuestionType;
  prompt: string;
  correctAnswer: string;
  gradingMode?: GradingMode;
  numericTolerance?: number;
  selectedAnswer: string | null;
  gradingMethod?: GradingMethod;
  options: string[] | null;
  isCorrect: boolean | null;
  explanation: string | null;
  createdAt: string;
}

export interface DashboardData {
  decks: DeckSummary[];
  recentActivity: ActivityItem[];
  dueCards: DueCard[];
  testHistory: TestAttemptSummary[];
}

export interface RuntimeTestQuestion {
  id: string;
  cardId: string;
  questionType: QuestionType;
  prompt: string;
  correctAnswer: string;
  gradingMode?: GradingMode;
  numericTolerance?: number;
  options?: string[];
  explanation: string;
}

export interface RuntimeTestAnswer {
  questionId: string;
  cardId: string;
  questionType: QuestionType;
  selectedAnswer: string;
  isCorrect: boolean | null;
  reviewed: boolean;
  gradingMethod?: GradingMethod;
}

export interface ImportPreview {
  title: string;
  description: string;
  tags: string[];
  cards: CardDraft[];
  warnings: string[];
  sourceLabel: string;
}

export interface BackendConfig {
  aiEnabled: boolean;
  syncEnabled: boolean;
  apiBaseUrl: string | null;
}

export interface SyncStatus {
  provider: "local-only" | "supabase";
  lastSyncedAt: string | null;
  state: "idle" | "disabled";
}
