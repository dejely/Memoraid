import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";

import { DEFAULT_TEST_LENGTH } from "../constants/app";
import { AppScreen } from "../components/AppScreen";
import { EmptyState } from "../components/EmptyState";
import { LoadingState } from "../components/LoadingState";
import { PrimaryButton } from "../components/PrimaryButton";
import { ProgressBar } from "../components/ProgressBar";
import { QuestionPanel } from "../components/QuestionPanel";
import { ScreenHeader } from "../components/ScreenHeader";
import { SectionCard } from "../components/SectionCard";
import { recordReview } from "../db/repositories/review-repository";
import { useDeck } from "../features/sets/hooks";
import { buildTestQuestions } from "../features/tests/generators";
import { useSaveTestAttemptMutation } from "../features/tests/hooks";
import { useTestSessionStore } from "../store/test-session-store";
import type { RuntimeTestQuestion } from "../types/models";

export default function TestScreen({ deckId }: { deckId: string }) {
  const deckQuery = useDeck(deckId);
  const saveAttemptMutation = useSaveTestAttemptMutation(deckId);
  const queryClient = useQueryClient();
  const testState = useTestSessionStore((state) => state);
  const [questionCount, setQuestionCount] = useState(DEFAULT_TEST_LENGTH);
  const [writtenDraft, setWrittenDraft] = useState("");
  const [savedAttemptId, setSavedAttemptId] = useState<string | null>(null);
  const [resultsFinishedAt, setResultsFinishedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!deckQuery.data) {
      return;
    }

    setQuestionCount(Math.min(DEFAULT_TEST_LENGTH, Math.max(3, deckQuery.data.cards.length)));
  }, [deckQuery.data]);

  useEffect(() => {
    const currentQuestion = testState.questions[testState.currentIndex];

    if (!currentQuestion) {
      setWrittenDraft("");
      return;
    }

    setWrittenDraft(testState.answers[currentQuestion.id]?.selectedAnswer ?? "");
  }, [testState.answers, testState.currentIndex, testState.questions]);

  const answers = Object.values(testState.answers);
  const currentQuestion = testState.questions[testState.currentIndex];
  const currentAnswer = currentQuestion ? testState.answers[currentQuestion.id] : undefined;

  const summary = useMemo(() => {
    const correctAnswers = answers.filter((answer) => answer.isCorrect).length;
    const weakCards = new Set(answers.filter((answer) => answer.isCorrect === false).map((answer) => answer.cardId));

    return {
      totalQuestions: testState.questions.length,
      correctAnswers,
      scorePercent:
        testState.questions.length === 0 ? 0 : Math.round((correctAnswers / testState.questions.length) * 100),
      objectiveCorrect: answers.filter((answer) => answer.questionType !== "written" && answer.isCorrect).length,
      objectiveTotal: answers.filter((answer) => answer.questionType !== "written").length,
      weakCards,
    };
  }, [answers, testState.questions]);

  useEffect(() => {
    if (
      testState.phase !== "results" ||
      !deckQuery.data ||
      !testState.startedAt ||
      savedAttemptId ||
      saveAttemptMutation.isPending
    ) {
      return;
    }

    const finishedAt = new Date().toISOString();

    async function persistAttempt(): Promise<void> {
      const attemptId = await saveAttemptMutation.mutateAsync({
        deck: {
          id: deckQuery.data!.id,
          title: deckQuery.data!.title,
        },
        questions: testState.questions,
        answers,
        startedAt: testState.startedAt!,
        finishedAt,
      });

      await Promise.all(
        answers
          .filter((answer) => typeof answer.isCorrect === "boolean")
          .map((answer) => recordReview(answer.cardId, deckQuery.data!.id, answer.isCorrect ? "correct" : "incorrect")),
      );

      setSavedAttemptId(attemptId);
      setResultsFinishedAt(finishedAt);

      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["decks", deckId] });
    }

    void persistAttempt();
  }, [
    answers,
    deckId,
    deckQuery.data,
    queryClient,
    saveAttemptMutation,
    savedAttemptId,
    testState.phase,
    testState.questions,
    testState.startedAt,
  ]);

  useEffect(() => {
    return () => {
      useTestSessionStore.getState().reset();
    };
  }, []);

  function startTest(): void {
    if (!deckQuery.data) {
      return;
    }

    const questions = buildTestQuestions(deckQuery.data.cards, questionCount);

    setSavedAttemptId(null);
    setResultsFinishedAt(null);
    testState.start(questions);
  }

  function handleObjectiveAnswer(question: RuntimeTestQuestion, selectedAnswer: string): void {
    testState.answerObjective(question, selectedAnswer, selectedAnswer === question.correctAnswer);
  }

  if (deckQuery.isLoading) {
    return <LoadingState message="Preparing test mode..." />;
  }

  if (!deckQuery.data) {
    return (
      <AppScreen>
        <ScreenHeader eyebrow="Test mode" title="Study set not found" />
        <EmptyState title="Nothing to test" message="The requested study set is not available." />
      </AppScreen>
    );
  }

  if (deckQuery.data.cards.length === 0) {
    return (
      <AppScreen>
        <ScreenHeader eyebrow="Test mode" title={deckQuery.data.title} />
        <EmptyState title="Add cards first" message="Test mode needs at least one card in the set." />
      </AppScreen>
    );
  }

  if (testState.phase === "config") {
    return (
      <AppScreen>
        <ScreenHeader
          eyebrow="Generated locally"
          title={`Test ${deckQuery.data.title}`}
          subtitle="Build a mixed test using multiple choice, true/false, and written prompts from saved cards."
          trailing={<PrimaryButton label="Back" variant="secondary" onPress={() => router.back()} />}
        />

        <SectionCard className="gap-4 bg-ink-900">
          <Text className="text-xs font-medium uppercase tracking-[2px] text-white/60">Test builder</Text>
          <Text className="text-3xl font-bold text-white">{deckQuery.data.cardCount} cards ready</Text>
          <Text className="text-sm leading-6 text-white/75">
            Objective questions are auto-graded. Written answers reveal the expected answer and let you self-mark the result.
          </Text>
        </SectionCard>

        <SectionCard className="gap-4">
          <Text className="text-lg font-semibold text-ink-900 dark:text-white">Question count</Text>
          <View className="flex-row items-center justify-between rounded-3xl bg-ink-50 px-4 py-4 dark:bg-ink-700">
            <PrimaryButton
              label="Less"
              variant="ghost"
              onPress={() => setQuestionCount((count) => Math.max(3, count - 1))}
            />
            <Text className="text-3xl font-bold text-ink-900 dark:text-white">{questionCount}</Text>
            <PrimaryButton
              label="More"
              variant="ghost"
              onPress={() => setQuestionCount((count) => Math.min(15, count + 1))}
            />
          </View>
          <PrimaryButton label="Start test" onPress={startTest} />
        </SectionCard>
      </AppScreen>
    );
  }

  if (!currentQuestion) {
    return <LoadingState message="Preparing questions..." />;
  }

  if (testState.phase === "results") {
    const weakCards = deckQuery.data.cards.filter((card) => summary.weakCards.has(card.id));

    return (
      <AppScreen>
        <ScreenHeader
          eyebrow="Results"
          title={`${summary.scorePercent}% score`}
          subtitle={`${summary.correctAnswers} out of ${summary.totalQuestions} questions marked correct`}
        />

        <View className="flex-row gap-3">
          <SectionCard className="flex-1 gap-2 bg-sea-900">
            <Text className="text-xs font-medium uppercase tracking-[2px] text-white/70">Objective</Text>
            <Text className="text-2xl font-bold text-white">
              {summary.objectiveCorrect}/{summary.objectiveTotal}
            </Text>
          </SectionCard>
          <SectionCard className="flex-1 gap-2 bg-amber-500">
            <Text className="text-xs font-medium uppercase tracking-[2px] text-white/70">Weak cards</Text>
            <Text className="text-2xl font-bold text-white">{summary.weakCards.size}</Text>
          </SectionCard>
        </View>

        <SectionCard className="gap-3">
          <Text className="text-lg font-semibold text-ink-900 dark:text-white">Saved locally</Text>
          <Text className="text-sm leading-6 text-ink-600 dark:text-ink-200">
            {saveAttemptMutation.isPending
              ? "Saving your attempt and updating review stats..."
              : `Attempt ${savedAttemptId ? "saved" : "processed"}${resultsFinishedAt ? ` on ${resultsFinishedAt}` : ""}.`}
          </Text>
        </SectionCard>

        <View className="gap-3">
          <Text className="text-lg font-semibold text-ink-900 dark:text-white">Weak cards</Text>
          {weakCards.length === 0 ? (
            <EmptyState title="No weak cards this time" message="You cleared every question in this test session." />
          ) : (
            weakCards.map((card) => (
              <SectionCard key={card.id} className="gap-2">
                <Text className="text-lg font-semibold text-ink-900 dark:text-white">{card.term}</Text>
                <Text className="text-sm leading-6 text-ink-600 dark:text-ink-200">{card.definition}</Text>
              </SectionCard>
            ))
          )}
        </View>

        <View className="gap-3">
          <Text className="text-lg font-semibold text-ink-900 dark:text-white">Corrections</Text>
          {testState.questions.map((question) => {
            const answer = testState.answers[question.id];

            return (
              <SectionCard key={question.id} className="gap-2">
                <Text className="text-xs font-medium uppercase tracking-[2px] text-sea-700 dark:text-sea-300">
                  {question.questionType.replace("_", " ")}
                </Text>
                <Text className="text-lg font-semibold text-ink-900 dark:text-white">{question.prompt}</Text>
                <Text className="text-sm text-ink-600 dark:text-ink-200">Your answer: {answer?.selectedAnswer || "No answer"}</Text>
                <Text className="text-sm text-ink-900 dark:text-white">Correct answer: {question.correctAnswer}</Text>
                <Text className="text-sm text-ink-500 dark:text-ink-300">{question.explanation}</Text>
              </SectionCard>
            );
          })}
        </View>

        <View className="flex-row gap-3">
          <PrimaryButton
            className="flex-1"
            label="Retake"
            variant="secondary"
            onPress={() => {
              testState.reset();
              setSavedAttemptId(null);
              setResultsFinishedAt(null);
            }}
          />
          <PrimaryButton className="flex-1" label="Back to set" onPress={() => router.replace(`/sets/${deckId}`)} />
        </View>
      </AppScreen>
    );
  }

  const answerLocked = Boolean(currentAnswer?.reviewed);

  return (
    <AppScreen>
      <ScreenHeader
        eyebrow="Test mode"
        title={deckQuery.data.title}
        subtitle="Objective questions auto-grade immediately. Written questions reveal the expected answer before you score yourself."
      />

      <SectionCard className="gap-4">
        <ProgressBar current={testState.currentIndex + 1} total={testState.questions.length} label="Question progress" />
      </SectionCard>

      <QuestionPanel
        question={currentQuestion}
        selectedAnswer={currentQuestion.questionType === "written" ? writtenDraft : currentAnswer?.selectedAnswer}
        onSelect={
          currentQuestion.questionType === "written"
            ? undefined
            : (value) => handleObjectiveAnswer(currentQuestion, value)
        }
        onChangeText={currentQuestion.questionType === "written" ? setWrittenDraft : undefined}
        answerLocked={answerLocked}
      />

      {currentQuestion.questionType === "written" && !currentAnswer ? (
        <PrimaryButton
          label="Reveal answer"
          onPress={() => testState.submitWrittenDraft(currentQuestion, writtenDraft)}
        />
      ) : null}

      {currentQuestion.questionType === "written" && currentAnswer && !currentAnswer.reviewed ? (
        <SectionCard className="gap-4">
          <Text className="text-lg font-semibold text-ink-900 dark:text-white">Expected answer</Text>
          <Text className="text-sm leading-6 text-ink-600 dark:text-ink-200">{currentQuestion.correctAnswer}</Text>
          <View className="flex-row gap-3">
            <PrimaryButton
              className="flex-1"
              label="Needs review"
              variant="secondary"
              onPress={() => testState.reviewWrittenAnswer(currentQuestion, false)}
            />
            <PrimaryButton
              className="flex-1"
              label="I got it"
              onPress={() => testState.reviewWrittenAnswer(currentQuestion, true)}
            />
          </View>
        </SectionCard>
      ) : null}

      {currentQuestion.questionType !== "written" && currentAnswer ? (
        <SectionCard className="gap-3">
          <Text className="text-lg font-semibold text-ink-900 dark:text-white">
            {currentAnswer.isCorrect ? "Correct" : "Needs review"}
          </Text>
          {!currentAnswer.isCorrect ? (
            <Text className="text-sm leading-6 text-ink-600 dark:text-ink-200">Correct answer: {currentQuestion.correctAnswer}</Text>
          ) : null}
          <Text className="text-sm leading-6 text-ink-500 dark:text-ink-300">{currentQuestion.explanation}</Text>
        </SectionCard>
      ) : null}

      {answerLocked ? (
        <PrimaryButton
          label={testState.currentIndex === testState.questions.length - 1 ? "Finish test" : "Next question"}
          onPress={() => testState.next()}
        />
      ) : null}
    </AppScreen>
  );
}
