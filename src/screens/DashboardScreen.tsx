import { router } from "expo-router";
import { Text, View } from "react-native";

import { AppScreen } from "../components/AppScreen";
import { DeckCard } from "../components/DeckCard";
import { EmptyState } from "../components/EmptyState";
import { LoadingState } from "../components/LoadingState";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenHeader } from "../components/ScreenHeader";
import { SectionCard } from "../components/SectionCard";
import { StatTile } from "../components/StatTile";
import { ThemeToggleButton } from "../components/ThemeToggleButton";
import { APP_NAME } from "../constants/app";
import { useDashboardData } from "../features/dashboard/hooks";
import { useSyncNowMutation, useSyncStatus } from "../features/sync/hooks";
import { formatDateTime, getRelativeTime } from "../utils/date";

export default function DashboardScreen() {
  const dashboardQuery = useDashboardData();
  const syncStatusQuery = useSyncStatus();
  const syncNowMutation = useSyncNowMutation();

  if (dashboardQuery.isLoading) {
    return <LoadingState message="Loading decks, activity, and review data..." />;
  }

  const dashboard = dashboardQuery.data;

  if (!dashboard) {
    return (
      <AppScreen>
        <ScreenHeader title="Dashboard" subtitle="Your study dashboard could not be loaded." />
        <EmptyState title="No data yet" message="Open the app again to initialize the local database." />
      </AppScreen>
    );
  }

  const averageScore =
    dashboard.testHistory.length === 0
      ? 0
      : Math.round(
          dashboard.testHistory.reduce((sum, attempt) => sum + attempt.scorePercent, 0) / dashboard.testHistory.length,
        );
  const syncStatus = syncStatusQuery.data;

  async function handleSyncNow(): Promise<void> {
    try {
      await syncNowMutation.mutateAsync();
    } catch {
      // The settings screen carries the detailed error state.
    }
  }

  return (
    <AppScreen>
      <ScreenHeader
        eyebrow="Local-first library"
        title={APP_NAME}
        subtitle="Everything stays local-first in SQLite, with optional parser, AI, and sync features routed through backend interfaces."
        trailing={<ThemeToggleButton />}
      />

      <SectionCard className="gap-5 bg-ink-900">
        <View className="gap-2">
          <Text className="text-xs font-medium uppercase tracking-[2px] text-white/60">Today’s study pulse</Text>
          <Text className="text-3xl font-bold tracking-tight text-white">Keep your decks tight, current, and reviewable.</Text>
          <Text className="text-sm leading-6 text-white/75">
            Create sets manually, import note files, resume flashcards, and run mixed test sessions from the same local library.
          </Text>
        </View>

        <View className="flex-row gap-3">
          <PrimaryButton className="flex-1 bg-white" textClassName="text-ink-900" label="New set" onPress={() => router.push("/sets/new")} />
          <PrimaryButton className="flex-1 border border-white/20 bg-white/10" textClassName="text-white" label="Import notes" onPress={() => router.push("/import")} />
        </View>
      </SectionCard>

      <SectionCard className="gap-4">
        <View className="gap-1">
          <Text className="text-xs font-medium uppercase tracking-[2px] text-sea-700 dark:text-sea-300">Sync backend</Text>
          <Text className="text-xl font-semibold text-ink-900 dark:text-white">
            {syncStatus?.provider === "custom-api" && syncStatus.apiBaseUrl ? syncStatus.apiBaseUrl : "Local only"}
          </Text>
          <Text className="text-sm leading-6 text-ink-600 dark:text-ink-200">
            State: {syncStatus?.state ?? "disabled"} · Pending changes: {syncStatus?.pendingChanges ?? 0} · Last sync {formatDateTime(syncStatus?.lastSyncedAt)}
          </Text>
          {syncStatus?.lastError ? <Text className="text-sm leading-6 text-rose-600 dark:text-rose-300">{syncStatus.lastError}</Text> : null}
        </View>

        <View className="flex-row gap-3">
          <PrimaryButton
            className="flex-1"
            label="Sync settings"
            variant="secondary"
            onPress={() => router.push("/settings")}
          />
          <PrimaryButton
            className="flex-1"
            label="Sync now"
            loading={syncNowMutation.isPending}
            disabled={!syncStatus || syncStatus.provider !== "custom-api" || !syncStatus.apiBaseUrl}
            onPress={handleSyncNow}
          />
        </View>
      </SectionCard>

      <View className="flex-row gap-3">
        <StatTile label="Sets" value={`${dashboard.decks.length}`} />
        <StatTile label="Due cards" value={`${dashboard.dueCards.length}`} tone="amber" />
        <StatTile label="Avg score" value={`${averageScore}%`} tone="sea" />
      </View>

      <View className="gap-3">
        <Text className="text-lg font-semibold text-ink-900 dark:text-white">Study sets</Text>
        {dashboard.decks.length === 0 ? (
          <EmptyState title="No study sets yet" message="Create a set manually or import notes from a text file to get started." />
        ) : (
          dashboard.decks.map((deck) => (
            <DeckCard key={deck.id} deck={deck} onPress={() => router.push(`/sets/${deck.id}`)} />
          ))
        )}
      </View>

      <View className="gap-3">
        <Text className="text-lg font-semibold text-ink-900 dark:text-white">Recent activity</Text>
        {dashboard.recentActivity.length === 0 ? (
          <EmptyState title="No activity yet" message="Run a flashcard session or take a test to populate your study timeline." />
        ) : (
          dashboard.recentActivity.map((item) => (
            <SectionCard key={item.id} className="gap-2">
              <Text className="text-xs font-medium uppercase tracking-[2px] text-sea-700 dark:text-sea-300">{item.type}</Text>
              <Text className="text-lg font-semibold text-ink-900 dark:text-white">{item.title}</Text>
              <Text className="text-sm leading-6 text-ink-600 dark:text-ink-200">{item.subtitle}</Text>
              <Text className="text-xs font-medium text-ink-500 dark:text-ink-300">{getRelativeTime(item.happenedAt)}</Text>
            </SectionCard>
          ))
        )}
      </View>

      <View className="gap-3">
        <Text className="text-lg font-semibold text-ink-900 dark:text-white">Due for review</Text>
        {dashboard.dueCards.length === 0 ? (
          <EmptyState title="Nothing due right now" message="Mark cards easy or hard in flashcard mode to build a review queue." />
        ) : (
          dashboard.dueCards.map((card) => (
            <SectionCard key={card.cardId} className="gap-2">
              <Text className="text-sm font-semibold uppercase tracking-[1.5px] text-amber-700 dark:text-amber-200">{card.deckTitle}</Text>
              <Text className="text-xl font-semibold text-ink-900 dark:text-white">{card.term}</Text>
              <Text className="text-sm text-ink-600 dark:text-ink-200">Due {formatDateTime(card.dueAt)}</Text>
            </SectionCard>
          ))
        )}
      </View>

      <View className="gap-3">
        <Text className="text-lg font-semibold text-ink-900 dark:text-white">Past test scores</Text>
        {dashboard.testHistory.length === 0 ? (
          <EmptyState title="No test attempts yet" message="Test mode will save scores, question breakdowns, and weak cards here." />
        ) : (
          dashboard.testHistory.map((attempt) => (
            <SectionCard key={attempt.id} className="flex-row items-center justify-between gap-4">
              <View className="flex-1 gap-1">
                <Text className="text-lg font-semibold text-ink-900 dark:text-white">{attempt.deckTitle}</Text>
                <Text className="text-sm text-ink-600 dark:text-ink-200">
                  {attempt.correctAnswers}/{attempt.totalQuestions} correct · {attempt.weakCardCount} weak cards
                </Text>
              </View>
              <View className="rounded-3xl bg-sea-50 px-4 py-3 dark:bg-sea-800/50">
                <Text className="text-lg font-bold text-sea-800 dark:text-sea-100">{attempt.scorePercent}%</Text>
              </View>
            </SectionCard>
          ))
        )}
      </View>
    </AppScreen>
  );
}
