import { Text, View } from "react-native";

import { AppScreen } from "../components/AppScreen";
import { EmptyState } from "../components/EmptyState";
import { LoadingState } from "../components/LoadingState";
import { ScreenHeader } from "../components/ScreenHeader";
import { SectionCard } from "../components/SectionCard";
import { useActivityHistory, useTestHistory } from "../features/dashboard/hooks";
import { formatDateTime } from "../utils/date";

export default function HistoryScreen() {
  const activityQuery = useActivityHistory();
  const testHistoryQuery = useTestHistory();

  if (activityQuery.isLoading || testHistoryQuery.isLoading) {
    return <LoadingState message="Loading study activity and saved test attempts..." />;
  }

  return (
    <AppScreen>
      <ScreenHeader
        eyebrow="Saved locally"
        title="History"
        subtitle="Study sessions and test attempts are persisted on-device so you can track your practice over time."
      />

      <View className="gap-3">
        <Text className="text-lg font-semibold text-ink-900 dark:text-white">Study activity</Text>
        {(activityQuery.data ?? []).length === 0 ? (
          <EmptyState title="No study activity yet" message="Flashcard sessions and test attempts will show up here after you start studying." />
        ) : (
          (activityQuery.data ?? []).map((item) => (
            <SectionCard key={item.id} className="gap-2">
              <Text className="text-xs font-medium uppercase tracking-[2px] text-sea-700 dark:text-sea-300">{item.type}</Text>
              <Text className="text-xl font-semibold text-ink-900 dark:text-white">{item.title}</Text>
              <Text className="text-sm leading-6 text-ink-600 dark:text-ink-200">{item.subtitle}</Text>
              <Text className="text-xs font-medium text-ink-500 dark:text-ink-300">{formatDateTime(item.happenedAt)}</Text>
            </SectionCard>
          ))
        )}
      </View>

      <View className="gap-3">
        <Text className="text-lg font-semibold text-ink-900 dark:text-white">Test attempts</Text>
        {(testHistoryQuery.data ?? []).length === 0 ? (
          <EmptyState title="No saved tests yet" message="Run a generated test to save scores, weak cards, and question corrections locally." />
        ) : (
          (testHistoryQuery.data ?? []).map((attempt) => (
            <SectionCard key={attempt.id} className="gap-2">
              <View className="flex-row items-center justify-between">
                <Text className="text-lg font-semibold text-ink-900 dark:text-white">{attempt.deckTitle}</Text>
                <View className="rounded-full bg-ink-900 px-3 py-2 dark:bg-sea-500">
                  <Text className="text-sm font-semibold text-white">{attempt.scorePercent}%</Text>
                </View>
              </View>
              <Text className="text-sm text-ink-600 dark:text-ink-200">
                Objective: {attempt.objectiveCorrect}/{attempt.objectiveTotal} · Written: {attempt.writtenCount}
              </Text>
              <Text className="text-sm text-ink-600 dark:text-ink-200">{attempt.weakCardCount} weak cards identified</Text>
              <Text className="text-xs font-medium text-ink-500 dark:text-ink-300">{formatDateTime(attempt.finishedAt)}</Text>
            </SectionCard>
          ))
        )}
      </View>
    </AppScreen>
  );
}
