import { getDatabase } from "../client";
import { mapAttemptRow } from "../mappers";
import { enqueueTestAttemptUpsert } from "./sync-repository";
import { createId } from "../../utils/ids";
import type {
  DeckSummary,
  RuntimeTestAnswer,
  RuntimeTestQuestion,
  TestAttemptSummary,
} from "../../types/models";

type SaveAttemptInput = {
  deck: Pick<DeckSummary, "id" | "title">;
  questions: RuntimeTestQuestion[];
  answers: RuntimeTestAnswer[];
  startedAt: string;
  finishedAt: string;
};

export async function getRecentTestAttempts(limit = 20): Promise<TestAttemptSummary[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{
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
  }>(
    `
      SELECT *
      FROM test_attempts
      ORDER BY finished_at DESC
      LIMIT ?;
    `,
    [limit],
  );

  return rows.map(mapAttemptRow);
}

export async function saveTestAttempt(input: SaveAttemptInput): Promise<string> {
  const database = await getDatabase();
  const attemptId = createId("attempt");
  const answersByQuestionId = new Map(input.answers.map((answer) => [answer.questionId, answer]));
  const objectiveAnswers = input.answers.filter((answer) => answer.questionType !== "written");
  const objectiveCorrect = objectiveAnswers.filter((answer) => answer.isCorrect).length;
  const correctAnswers = input.answers.filter((answer) => answer.isCorrect).length;
  const writtenCount = input.answers.filter((answer) => answer.questionType === "written").length;
  const weakCardCount = new Set(input.answers.filter((answer) => answer.isCorrect === false).map((answer) => answer.cardId)).size;
  const scorePercent =
    input.questions.length === 0 ? 0 : Math.round((correctAnswers / input.questions.length) * 100);

  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `
        INSERT INTO test_attempts (
          id,
          deck_id,
          deck_title,
          total_questions,
          correct_answers,
          objective_correct,
          objective_total,
          written_count,
          score_percent,
          started_at,
          finished_at,
          weak_card_count
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
      [
        attemptId,
        input.deck.id,
        input.deck.title,
        input.questions.length,
        correctAnswers,
        objectiveCorrect,
        objectiveAnswers.length,
        writtenCount,
        scorePercent,
        input.startedAt,
        input.finishedAt,
        weakCardCount,
      ],
    );

    for (const question of input.questions) {
      const answer = answersByQuestionId.get(question.id);

      await database.runAsync(
        `
          INSERT INTO test_questions (
            id,
            attempt_id,
            card_id,
            question_type,
            prompt,
            correct_answer,
            selected_answer,
            options_json,
            is_correct,
            explanation,
            created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `,
        [
          question.id,
          attemptId,
          question.cardId,
          question.questionType,
          question.prompt,
          question.correctAnswer,
          answer?.selectedAnswer ?? null,
          question.options ? JSON.stringify(question.options) : null,
          typeof answer?.isCorrect === "boolean" ? (answer.isCorrect ? 1 : 0) : null,
          question.explanation,
          input.finishedAt,
        ],
      );
    }
  });

  await enqueueTestAttemptUpsert(attemptId);

  return attemptId;
}
