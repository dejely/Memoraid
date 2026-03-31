export type SourceType = "manual" | "imported";
export type ReviewResult = "easy" | "hard" | "correct" | "incorrect";
export type SessionMode = "flashcard";
export type QuestionType = "multiple_choice" | "true_false" | "written";
export type ThemePreference = "system" | "light" | "dark";
export type SyncProvider = "local-only" | "custom-api" | "supabase";
export type SyncRuntimeState = "idle" | "disabled" | "verifying" | "ready" | "syncing" | "error";
export type SyncEntityType = "deck" | "test_attempt";
export type SyncOperation = "upsert" | "delete";

export interface StudyCard {
  id: string;
  deckId: string;
  term: string;
  definition: string;
  example: string | null;
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
  selectedAnswer: string | null;
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
  provider: SyncProvider;
  apiBaseUrl: string | null;
  accessToken: string | null;
}

export interface SyncStatus {
  provider: SyncProvider;
  apiBaseUrl: string | null;
  lastSyncedAt: string | null;
  lastVerifiedAt: string | null;
  pendingChanges: number;
  lastError: string | null;
  serverName: string | null;
  serverVersion: string | null;
  state: SyncRuntimeState;
}

export interface SyncDeckRecord {
  id: string;
  title: string;
  description: string;
  tags: string[];
  sourceType: SourceType;
  createdAt: string;
  updatedAt: string;
  lastStudiedAt: string | null;
  cards: Array<StudyCard & { reviewStats: ReviewStats | null }>;
}

export interface SyncTestAttemptRecord {
  attempt: TestAttemptSummary;
  questions: TestQuestionRecord[];
}

export interface SyncChangeSet {
  decks: SyncDeckRecord[];
  deletedDeckIds: string[];
  testAttempts: SyncTestAttemptRecord[];
}

export interface SyncQueueEntry {
  id: string;
  entityType: SyncEntityType;
  entityId: string;
  operation: SyncOperation;
  payloadJson: string;
  createdAt: string;
  updatedAt: string;
  retryCount: number;
  lastError: string | null;
}

export interface SyncServerInfo {
  service: string;
  version: string | null;
  capabilities: string[];
  checkedAt: string;
}

export interface SyncVerificationResult {
  server: SyncServerInfo;
}

export interface SyncRunSummary {
  pushedCount: number;
  acknowledgedCount: number;
  pulledCounts: {
    decks: number;
    testAttempts: number;
  };
  status: SyncStatus;
}
