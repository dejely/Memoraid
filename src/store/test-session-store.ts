import { create } from "zustand";

import type { RuntimeTestAnswer, RuntimeTestQuestion } from "../types/models";

type TestPhase = "config" | "running" | "results";

type TestSessionState = {
  phase: TestPhase;
  questions: RuntimeTestQuestion[];
  answers: Record<string, RuntimeTestAnswer>;
  currentIndex: number;
  startedAt: string | null;
  start: (questions: RuntimeTestQuestion[]) => void;
  answerObjective: (question: RuntimeTestQuestion, selectedAnswer: string, isCorrect: boolean) => void;
  submitWrittenDraft: (question: RuntimeTestQuestion, selectedAnswer: string) => void;
  reviewWrittenAnswer: (question: RuntimeTestQuestion, isCorrect: boolean) => void;
  next: () => void;
  showResults: () => void;
  reset: () => void;
};

export const useTestSessionStore = create<TestSessionState>((set) => ({
  phase: "config",
  questions: [],
  answers: {},
  currentIndex: 0,
  startedAt: null,
  start: (questions) =>
    set({
      phase: "running",
      questions,
      answers: {},
      currentIndex: 0,
      startedAt: new Date().toISOString(),
    }),
  answerObjective: (question, selectedAnswer, isCorrect) =>
    set((state) => ({
      answers: {
        ...state.answers,
        [question.id]: {
          questionId: question.id,
          cardId: question.cardId,
          questionType: question.questionType,
          selectedAnswer,
          isCorrect,
          reviewed: true,
        },
      },
    })),
  submitWrittenDraft: (question, selectedAnswer) =>
    set((state) => ({
      answers: {
        ...state.answers,
        [question.id]: {
          questionId: question.id,
          cardId: question.cardId,
          questionType: question.questionType,
          selectedAnswer,
          isCorrect: null,
          reviewed: false,
        },
      },
    })),
  reviewWrittenAnswer: (question, isCorrect) =>
    set((state) => ({
      answers: {
        ...state.answers,
        [question.id]: {
          ...(state.answers[question.id] ?? {
            questionId: question.id,
            cardId: question.cardId,
            questionType: question.questionType,
            selectedAnswer: "",
            isCorrect: null,
            reviewed: false,
          }),
          isCorrect,
          reviewed: true,
        },
      },
    })),
  next: () =>
    set((state) => {
      const nextIndex = state.currentIndex + 1;

      if (nextIndex >= state.questions.length) {
        return {
          currentIndex: state.currentIndex,
          phase: "results",
        };
      }

      return {
        currentIndex: nextIndex,
      };
    }),
  showResults: () =>
    set({
      phase: "results",
    }),
  reset: () =>
    set({
      phase: "config",
      questions: [],
      answers: {},
      currentIndex: 0,
      startedAt: null,
    }),
}));
