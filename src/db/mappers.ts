import type {
  DeckSummary,
  FlashcardSession,
  ReviewStats,
  RuntimeTestAnswer,
  RuntimeTestQuestion,
  StudyCard,
  TestAttemptSummary,
  TestQuestionRecord,
} from "../types/models";

function parseJsonArray<T>(value: string | null | undefined, fallback: T[] = []): T[] {
  if (!value) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function intToBool(value: number | null | undefined): boolean {
  return value === 1;
}

export function mapDeckSummaryRow(
  row: {
    id: string;
    title: string;
    description: string;
    tags_json: string;
    card_count: number;
    due_count: number;
    updated_at: string;
    last_studied_at: string | null;
    source_type: "manual" | "imported";
  },
): DeckSummary {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    tags: parseJsonArray<string>(row.tags_json),
    cardCount: row.card_count,
    dueCount: row.due_count,
    updatedAt: row.updated_at,
    lastStudiedAt: row.last_studied_at,
    sourceType: row.source_type,
  };
}

export function mapCardRow(
  row: {
    id: string;
    deck_id: string;
    term: string;
    definition: string;
    example: string | null;
    sort_order: number;
    created_at: string;
    updated_at: string;
    ease_score?: number | null;
    easy_count?: number | null;
    hard_count?: number | null;
    last_reviewed_at?: string | null;
    due_at?: string | null;
    last_result?: ReviewStats["lastResult"];
  },
): StudyCard & { reviewStats?: ReviewStats | null } {
  return {
    id: row.id,
    deckId: row.deck_id,
    term: row.term,
    definition: row.definition,
    example: row.example,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    reviewStats:
      typeof row.ease_score === "number"
        ? {
            cardId: row.id,
            deckId: row.deck_id,
            easeScore: row.ease_score,
            easyCount: row.easy_count ?? 0,
            hardCount: row.hard_count ?? 0,
            lastReviewedAt: row.last_reviewed_at ?? null,
            dueAt: row.due_at ?? null,
            lastResult: row.last_result ?? null,
          }
        : null,
  };
}

export function mapSessionRow(row: {
  id: string;
  deck_id: string;
  mode: "flashcard";
  current_index: number;
  order_json: string;
  shuffle_enabled: number;
  easy_count: number;
  hard_count: number;
  started_at: string;
  updated_at: string;
  completed_at: string | null;
}): FlashcardSession {
  return {
    id: row.id,
    deckId: row.deck_id,
    mode: row.mode,
    currentIndex: row.current_index,
    order: parseJsonArray<string>(row.order_json),
    shuffleEnabled: intToBool(row.shuffle_enabled),
    easyCount: row.easy_count,
    hardCount: row.hard_count,
    startedAt: row.started_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

export function mapAttemptRow(row: {
  id: string;
  deck_id: string;
  deck_title: string;
  total_questions: number;
  correct_answers: number;
  objective_correct: number;
  objective_total: number;
  written_count: number;
  score_percent: number;
  started_at: string;
  finished_at: string;
  weak_card_count: number;
}): TestAttemptSummary {
  return {
    id: row.id,
    deckId: row.deck_id,
    deckTitle: row.deck_title,
    totalQuestions: row.total_questions,
    correctAnswers: row.correct_answers,
    objectiveCorrect: row.objective_correct,
    objectiveTotal: row.objective_total,
    writtenCount: row.written_count,
    scorePercent: row.score_percent,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    weakCardCount: row.weak_card_count,
  };
}

export function mapTestQuestionRow(row: {
  id: string;
  attempt_id: string;
  card_id: string;
  question_type: "multiple_choice" | "true_false" | "written";
  prompt: string;
  correct_answer: string;
  selected_answer: string | null;
  options_json: string | null;
  is_correct: number | null;
  explanation: string | null;
  created_at: string;
}): TestQuestionRecord {
  return {
    id: row.id,
    attemptId: row.attempt_id,
    cardId: row.card_id,
    questionType: row.question_type,
    prompt: row.prompt,
    correctAnswer: row.correct_answer,
    selectedAnswer: row.selected_answer,
    options: row.options_json ? parseJsonArray<string>(row.options_json) : null,
    isCorrect: row.is_correct === null ? null : intToBool(row.is_correct),
    explanation: row.explanation,
    createdAt: row.created_at,
  };
}

export function toQuestionRecord(
  question: RuntimeTestQuestion,
  answer: RuntimeTestAnswer,
  attemptId: string,
  createdAt: string,
): TestQuestionRecord {
  return {
    id: question.id,
    attemptId,
    cardId: question.cardId,
    questionType: question.questionType,
    prompt: question.prompt,
    correctAnswer: question.correctAnswer,
    selectedAnswer: answer.selectedAnswer,
    options: question.options ?? null,
    isCorrect: answer.isCorrect,
    explanation: question.explanation,
    createdAt,
  };
}
