import { DEFAULT_TEST_LENGTH, MAX_TEST_LENGTH } from "../../constants/app";
import type { RuntimeTestQuestion, StudyCard } from "../../types/models";
import { shuffleList } from "../../utils/array";
import { createId } from "../../utils/ids";

const QUESTION_TYPES = ["multiple_choice", "true_false", "written"] as const;

function buildMultipleChoiceQuestion(card: StudyCard, cards: StudyCard[]): RuntimeTestQuestion | null {
  const distractors = shuffleList(cards.filter((candidate) => candidate.id !== card.id))
    .map((candidate) => candidate.definition)
    .filter((definition) => definition !== card.definition)
    .slice(0, 3);

  if (distractors.length < 2) {
    return null;
  }

  return {
    id: createId("question"),
    cardId: card.id,
    questionType: "multiple_choice",
    prompt: `Which definition matches "${card.term}"?`,
    correctAnswer: card.definition,
    options: shuffleList([card.definition, ...distractors]),
    explanation: card.example ?? `Focus on the exact wording of ${card.term}.`,
  };
}

function buildTrueFalseQuestion(card: StudyCard, cards: StudyCard[]): RuntimeTestQuestion {
  const alternatives = cards.filter((candidate) => candidate.id !== card.id);
  const useTrueStatement = alternatives.length === 0 || Math.random() > 0.5;
  const falseDefinition = alternatives.length > 0 ? shuffleList(alternatives)[0].definition : card.definition;
  const candidateDefinition = useTrueStatement ? card.definition : falseDefinition;

  return {
    id: createId("question"),
    cardId: card.id,
    questionType: "true_false",
    prompt: `True or false: "${candidateDefinition}" matches "${card.term}".`,
    correctAnswer: useTrueStatement ? "True" : "False",
    options: ["True", "False"],
    explanation: `${card.term}: ${card.definition}`,
  };
}

function buildWrittenQuestion(card: StudyCard): RuntimeTestQuestion {
  return {
    id: createId("question"),
    cardId: card.id,
    questionType: "written",
    prompt: `Write the definition for "${card.term}".`,
    correctAnswer: card.definition,
    explanation: card.example ?? `Expected answer: ${card.definition}`,
  };
}

export function buildTestQuestions(cards: StudyCard[], requestedCount = DEFAULT_TEST_LENGTH): RuntimeTestQuestion[] {
  if (cards.length === 0) {
    return [];
  }

  const shuffledCards = shuffleList(cards);
  const safeCount = Math.min(MAX_TEST_LENGTH, Math.max(3, requestedCount));
  const questions: RuntimeTestQuestion[] = [];
  let cursor = 0;

  while (questions.length < safeCount) {
    const card = shuffledCards[cursor % shuffledCards.length];
    const desiredType = QUESTION_TYPES[questions.length % QUESTION_TYPES.length];

    if (desiredType === "multiple_choice") {
      const question = buildMultipleChoiceQuestion(card, cards);
      questions.push(question ?? buildWrittenQuestion(card));
    } else if (desiredType === "true_false") {
      questions.push(buildTrueFalseQuestion(card, cards));
    } else {
      questions.push(buildWrittenQuestion(card));
    }

    cursor += 1;
  }

  return questions;
}
