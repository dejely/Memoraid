import { z } from "zod";

const sourceTypeSchema = z.enum(["manual", "imported"]);
const reviewResultSchema = z.enum(["easy", "hard", "correct", "incorrect"]);
const questionTypeSchema = z.enum(["multiple_choice", "true_false", "written"]);

const reviewStatsSchema = z.object({
  cardId: z.string().min(1),
  deckId: z.string().min(1),
  easeScore: z.number(),
  easyCount: z.number().int().nonnegative(),
  hardCount: z.number().int().nonnegative(),
  lastReviewedAt: z.string().datetime().nullable(),
  dueAt: z.string().datetime().nullable(),
  lastResult: reviewResultSchema.nullable(),
});

const studyCardSchema = z.object({
  id: z.string().min(1),
  deckId: z.string().min(1),
  term: z.string(),
  definition: z.string(),
  example: z.string().nullable(),
  sortOrder: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  reviewStats: reviewStatsSchema.nullable(),
});

export const syncDeckRecordSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  tags: z.array(z.string()),
  sourceType: sourceTypeSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastStudiedAt: z.string().datetime().nullable(),
  cards: z.array(studyCardSchema),
});

const testQuestionSchema = z.object({
  id: z.string().min(1),
  attemptId: z.string().min(1),
  cardId: z.string().min(1),
  questionType: questionTypeSchema,
  prompt: z.string(),
  correctAnswer: z.string(),
  selectedAnswer: z.string().nullable(),
  options: z.array(z.string()).nullable(),
  isCorrect: z.boolean().nullable(),
  explanation: z.string().nullable(),
  createdAt: z.string().datetime(),
});

const testAttemptSummarySchema = z.object({
  id: z.string().min(1),
  deckId: z.string().min(1),
  deckTitle: z.string().min(1),
  totalQuestions: z.number().int().nonnegative(),
  correctAnswers: z.number().int().nonnegative(),
  objectiveCorrect: z.number().int().nonnegative(),
  objectiveTotal: z.number().int().nonnegative(),
  writtenCount: z.number().int().nonnegative(),
  scorePercent: z.number().nonnegative(),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime(),
  weakCardCount: z.number().int().nonnegative(),
});

export const syncTestAttemptRecordSchema = z.object({
  attempt: testAttemptSummarySchema,
  questions: z.array(testQuestionSchema),
});

export const syncChangeSetSchema = z.object({
  decks: z.array(syncDeckRecordSchema),
  deletedDeckIds: z.array(z.string()),
  testAttempts: z.array(syncTestAttemptRecordSchema),
});

const deckUpsertChangeSchema = z.object({
  id: z.string().min(1),
  entityType: z.literal("deck"),
  entityId: z.string().min(1),
  operation: z.literal("upsert"),
  payload: syncDeckRecordSchema,
  updatedAt: z.string().datetime().optional(),
});

const deckDeleteChangeSchema = z.object({
  id: z.string().min(1),
  entityType: z.literal("deck"),
  entityId: z.string().min(1),
  operation: z.literal("delete"),
  payload: z.object({
    id: z.string().min(1),
  }),
  updatedAt: z.string().datetime().optional(),
});

const testAttemptUpsertChangeSchema = z.object({
  id: z.string().min(1),
  entityType: z.literal("test_attempt"),
  entityId: z.string().min(1),
  operation: z.literal("upsert"),
  payload: syncTestAttemptRecordSchema,
  updatedAt: z.string().datetime().optional(),
});

export const syncChangeSchema = z.union([
  deckUpsertChangeSchema,
  deckDeleteChangeSchema,
  testAttemptUpsertChangeSchema,
]);

export const pushBodySchema = z.object({
  cursor: z.string().nullable().optional(),
  client: z
    .object({
      app: z.string().optional(),
      platform: z.string().optional(),
    })
    .optional(),
  changes: z.array(syncChangeSchema).default([]),
});

export const pullBodySchema = z.object({
  cursor: z.string().nullable().optional(),
});

export type SyncDeckRecord = z.infer<typeof syncDeckRecordSchema>;
export type SyncTestAttemptRecord = z.infer<typeof syncTestAttemptRecordSchema>;
export type SyncChangeSet = z.infer<typeof syncChangeSetSchema>;
export type PushBody = z.infer<typeof pushBodySchema>;
export type PullBody = z.infer<typeof pullBodySchema>;
export type SyncChange = z.infer<typeof syncChangeSchema>;
