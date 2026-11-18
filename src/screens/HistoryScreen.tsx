import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAttemptQuestions } from "../db/repositories/test-repository";
import { MathContent } from "../components/math/MathContent";
import { PrimaryButton } from "../components/PrimaryButton";
import { Text, View } from "react-native";

import { AppScreen } from "../components/AppScreen";
import { DataErrorState } from "../components/DataErrorState";
import { EmptyState } from "../components/EmptyState";
import { LoadingState } from "../components/LoadingState";
import { ScreenHeader } from "../components/ScreenHeader";
import { SectionCard } from "../components/SectionCard";
import {
  useActivityHistory,
  useTestHistory,
} from "../features/dashboard/hooks";
import { formatDateTime } from "../utils/date";

export default function HistoryScreen() {
  const [selectedAttempt, setSelectedAttempt] = useState<string | null>(null);
  const details = useQuery({
    queryKey: ["tests", "details", selectedAttempt],
    queryFn: () => getAttemptQuestions(selectedAttempt!),
    enabled: !!selectedAttempt,
  });
  const activityQuery = useActivityHistory();
  const testHistoryQuery = useTestHistory();

  if (activityQuery.isLoading || testHistoryQuery.isLoading) {
    return (
      <LoadingState message="Loading study activity and saved test attempts..." />
    );
  }

  if (activityQuery.isError || testHistoryQuery.isError) {
    return (
      <DataErrorState
        onRetry={() => {
          void activityQuery.refetch();
          void testHistoryQuery.refetch();
        }}
      />
    );
  }

  return (
    <AppScreen>
      <ScreenHeader
        eyebrow="Your learning journey"
        title="History"
        subtitle="Every session is a step forward. Revisit your results and see what needs another look."
      />

      <View className="gap-3">
        <Text className="text-lg font-semibold text-ink-900 dark:text-white">
          Study activity
        </Text>
        {(activityQuery.data ?? []).length === 0 ? (
          <EmptyState
            title="No study activity yet"
            message="Flashcard sessions and test attempts will show up here after you start studying."
          />
        ) : (
          (activityQuery.data ?? []).map((item) => (
            <SectionCard key={item.id} className="gap-2">
              <Text className="text-xs font-medium uppercase tracking-[2px] text-sea-700 dark:text-sea-300">
                {item.type}
              </Text>
              <Text className="text-xl font-semibold text-ink-900 dark:text-white">
                {item.title}
              </Text>
              <Text className="text-sm leading-6 text-ink-600 dark:text-ink-200">
                {item.subtitle}
              </Text>
              <Text className="text-xs font-medium text-ink-500 dark:text-ink-300">
                {formatDateTime(item.happenedAt)}
              </Text>
            </SectionCard>
          ))
        )}
      </View>

      <View className="gap-3">
        <Text className="text-lg font-semibold text-ink-900 dark:text-white">
          Test attempts
        </Text>
        {(testHistoryQuery.data ?? []).length === 0 ? (
          <EmptyState
            title="No saved tests yet"
            message="Run a generated test to save scores, weak cards, and question corrections locally."
          />
        ) : (
          (testHistoryQuery.data ?? []).map((attempt) => (
            <SectionCard key={attempt.id} className="gap-2">
              <View className="flex-row items-center justify-between">
                <Text className="text-lg font-semibold text-ink-900 dark:text-white">
                  {attempt.deckTitle}
                </Text>
                <View className="rounded-full bg-primary px-3 py-2">
                  <Text className="text-sm font-semibold text-primary-foreground">
                    {attempt.scorePercent}%
                  </Text>
                </View>
              </View>
              <Text className="text-sm text-ink-600 dark:text-ink-200">
                Objective: {attempt.objectiveCorrect}/{attempt.objectiveTotal} ·
                Written: {attempt.writtenCount}
              </Text>
              <Text className="text-sm text-ink-600 dark:text-ink-200">
                {attempt.weakCardCount} weak cards identified
              </Text>
              <Text className="text-xs font-medium text-ink-500 dark:text-ink-300">
                {formatDateTime(attempt.finishedAt)}
              </Text>
              <PrimaryButton
                label={
                  selectedAttempt === attempt.id
                    ? "Hide answers"
                    : "Review answers"
                }
                variant="secondary"
                onPress={() =>
                  setSelectedAttempt(
                    selectedAttempt === attempt.id ? null : attempt.id,
                  )
                }
              />
              {selectedAttempt === attempt.id ? (
                <View className="gap-3">
                  {details.isLoading ? (
                    <Text className="text-ink-600 dark:text-ink-200">
                      Loading answers…
                    </Text>
                  ) : details.isError ? (
                    <PrimaryButton
                      label="Retry answers"
                      onPress={() => void details.refetch()}
                    />
                  ) : (
                    details.data?.map((question) => (
                      <View key={question.id} className="gap-2">
                        <MathContent className="text-lg text-ink-900 dark:text-white">
                          {question.prompt}
                        </MathContent>
                        <MathContent className="text-ink-600 dark:text-ink-200">{`Your answer: ${question.selectedAnswer ?? "No answer"}`}</MathContent>
                        <MathContent className="text-ink-900 dark:text-white">{`Expected: ${question.correctAnswer}`}</MathContent>
                        <Text className="text-sm text-ink-600 dark:text-ink-200">
                          {question.isCorrect === null
                            ? "Unmarked"
                            : question.isCorrect
                              ? "Correct"
                              : "Needs review"}{" "}
                          ·{" "}
                          {question.gradingMethod === "automatic"
                            ? "Automatically marked"
                            : "Self-reviewed"}
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              ) : null}
            </SectionCard>
          ))
        )}
      </View>
    </AppScreen>
  );
}
