import type {
  DeckSummary,
  RuntimeTestAnswer,
  RuntimeTestQuestion,
  TestAttemptSummary,
} from "../../types/models";
import { createId } from "../../utils/ids";
import { cloudDatabase, throwIfCloudError } from "./supabase-helpers.web";

type SaveAttemptInput = {
  deck: Pick<DeckSummary, "id" | "title">;
  questions: RuntimeTestQuestion[];
  answers: RuntimeTestAnswer[];
  startedAt: string;
  finishedAt: string;
};

export async function getRecentTestAttempts(limit = 20): Promise<TestAttemptSummary[]> {
  const result = await cloudDatabase()
    .from("test_attempts")
    .select("id,deck_id,deck_title,total_questions,correct_answers,objective_correct,objective_total,written_count,score_percent,started_at,finished_at,weak_card_count")
    .order("finished_at", { ascending: false })
    .limit(limit);
  throwIfCloudError(result.error, "Test history could not be loaded");

  return (result.data ?? []).map((row) => ({
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
  }));
}

export async function saveTestAttempt(input: SaveAttemptInput): Promise<string> {
  const client = cloudDatabase();
  const attemptId = createId("attempt");
  const answersByQuestionId = new Map(input.answers.map((answer) => [answer.questionId, answer]));
  const objectiveAnswers = input.answers.filter((answer) => answer.questionType !== "written");
  const objectiveCorrect = objectiveAnswers.filter((answer) => answer.isCorrect).length;
  const correctAnswers = input.answers.filter((answer) => answer.isCorrect).length;
  const writtenCount = input.answers.filter((answer) => answer.questionType === "written").length;
  const weakCardCount = new Set(
    input.answers.filter((answer) => answer.isCorrect === false).map((answer) => answer.cardId),
  ).size;
  const scorePercent =
    input.questions.length === 0 ? 0 : Math.round((correctAnswers / input.questions.length) * 100);

  const attemptResult = await client.from("test_attempts").insert({
    id: attemptId,
    deck_id: input.deck.id,
    deck_title: input.deck.title,
    total_questions: input.questions.length,
    correct_answers: correctAnswers,
    objective_correct: objectiveCorrect,
    objective_total: objectiveAnswers.length,
    written_count: writtenCount,
    score_percent: scorePercent,
    started_at: input.startedAt,
    finished_at: input.finishedAt,
    weak_card_count: weakCardCount,
  });
  throwIfCloudError(attemptResult.error, "The test attempt could not be saved");

  try {
    if (input.questions.length > 0) {
      const questionsResult = await client.from("test_questions").insert(
        input.questions.map((question) => {
          const answer = answersByQuestionId.get(question.id);

          return {
            id: question.id,
            attempt_id: attemptId,
            card_id: question.cardId,
            question_type: question.questionType,
            prompt: question.prompt,
            correct_answer: question.correctAnswer,
            selected_answer: answer?.selectedAnswer ?? null,
            options_json: question.options ?? null,
            is_correct: typeof answer?.isCorrect === "boolean" ? answer.isCorrect : null,
            explanation: question.explanation,
            created_at: input.finishedAt,
          };
        }),
      );
      throwIfCloudError(questionsResult.error, "The test questions could not be saved");
    }
  } catch (error) {
    await client.from("test_attempts").delete().eq("id", attemptId);
    throw error;
  }

  return attemptId;
}

