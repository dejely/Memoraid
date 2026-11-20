import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { AppScreen } from "../components/AppScreen";
import { CloudMigrationCard } from "../components/CloudMigrationCard";
import { DataErrorState } from "../components/DataErrorState";
import { DeckCard } from "../components/DeckCard";
import { EmptyState } from "../components/EmptyState";
import { LoadingState } from "../components/LoadingState";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenHeader } from "../components/ScreenHeader";
import { SectionCard } from "../components/SectionCard";
import { StudyRewards } from "../components/StudyRewards";
import { useThemeColors } from "../components/ThemeProvider";
import { useDashboardData } from "../features/dashboard/hooks";
import { getRelativeTime } from "../utils/date";

export default function DashboardScreen() {
  const dashboardQuery = useDashboardData();
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const [search, setSearch] = useState("");
  const [dueOnly, setDueOnly] = useState(false);
  const phone = width < 768;
  const wide = width >= 1200;
  if (dashboardQuery.isLoading)
    return <LoadingState message="Getting your study space ready…" />;
  if (dashboardQuery.isError)
    return <DataErrorState onRetry={() => void dashboardQuery.refetch()} />;
  const dashboard = dashboardQuery.data;
  if (!dashboard)
    return (
      <AppScreen>
        <EmptyState
          title="Your library is not ready"
          message="Reopen the app to load your study sets."
        />
      </AppScreen>
    );
  const setCount = dashboard.decks.length;
  const testCount = dashboard.testHistory.length;
  const showActivity =
    setCount > 0 || dashboard.recentActivity.length > 0 || testCount > 0;
  const averageScore = testCount
    ? Math.round(
        dashboard.testHistory.reduce((sum, item) => sum + item.scorePercent, 0) /
          testCount,
      )
    : null;
  const dueCount = dashboard.decks.reduce(
    (sum, deck) => sum + deck.dueCount,
    0,
  );
  const reviewSet = dashboard.decks.find((deck) => deck.dueCount > 0);
  const query = search.trim().toLowerCase();
  const filtered = dashboard.decks.filter(
    (deck) =>
      (!dueOnly || deck.dueCount > 0) &&
      [deck.title, deck.description, ...deck.tags].some((text) =>
        text.toLowerCase().includes(query),
      ),
  );

  const newSetButton = (
    <PrimaryButton
      label="New set"
      onPress={() => router.push("/sets/new")}
      icon={<Ionicons name="add" size={18} color={colors.primaryForeground} />}
    />
  );

  return (
    <AppScreen contentContainerClassName={phone ? "gap-4" : undefined}>
      <ScreenHeader
        eyebrow={phone ? undefined : "Your workspace"}
        title={phone ? "Overview" : "A little progress, every day."}
        subtitle={
          phone ? undefined : "Pick up where you left off, or learn something new."
        }
        trailing={!phone && setCount > 0 ? newSetButton : undefined}
      />
      <SectionCard className="items-start gap-3 bg-muted p-4 md:gap-5 md:p-8">
        <Text className="text-xl font-semibold tracking-tight text-foreground md:text-3xl">
          {reviewSet
            ? `${dueCount} ${dueCount === 1 ? "card" : "cards"} due across your library`
            : setCount > 0
              ? "You’re caught up"
              : "Your library starts here"}
        </Text>
        {reviewSet ? (
          <>
            <Text className="text-sm text-muted-foreground">
              {reviewSet.title} · {reviewSet.dueCount} due
            </Text>
            <PrimaryButton
              label={`Study ${reviewSet.title}`}
              onPress={() => router.push(`/sets/${reviewSet.id}/study`)}
              className="max-w-full py-2"
              textClassName="shrink"
              icon={
                <Ionicons
                  name="arrow-forward"
                  size={17}
                  color={colors.primaryForeground}
                />
              }
            />
          </>
        ) : setCount > 0 ? (
          <PrimaryButton
            label="Open practice"
            onPress={() => router.push("/practice")}
          />
        ) : (
          <>
            <Text className="text-sm text-muted-foreground">
              Create a study set or import your notes to get started.
            </Text>
            <View className="flex-row flex-wrap gap-3">
              <PrimaryButton
                label="Create a set"
                onPress={() => router.push("/sets/new")}
              />
              <PrimaryButton
                label="Import notes"
                variant="secondary"
                onPress={() => router.push("/import")}
              />
            </View>
          </>
        )}
      </SectionCard>
      <View
        style={{
          flexDirection: wide ? "row" : "column",
          alignItems: "stretch",
          gap: 24,
        }}
      >
        <View style={{ flex: 1, minWidth: 0, gap: phone ? 12 : 20 }}>
          {setCount > 0 ? (
            <>
              <View className="flex-row flex-wrap items-center justify-between gap-3">
                <View className="min-w-0 flex-row flex-wrap items-baseline gap-x-3 gap-y-1">
                  <Text
                    accessibilityRole="header"
                    className="text-xl font-semibold tracking-tight text-foreground"
                  >
                    Your library
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    {setCount} {setCount === 1 ? "set" : "sets"}
                  </Text>
                </View>
                {phone ? newSetButton : null}
              </View>
              <View className="min-h-12 flex-row items-center gap-3 rounded-xl border border-border bg-card px-4">
                <Ionicons
                  name="search-outline"
                  size={18}
                  color={colors.mutedForeground}
                />
                <TextInput
                  accessibilityLabel="Search study sets"
                  placeholder="Search sets or tags…"
                  placeholderTextColor={colors.mutedForeground}
                  value={search}
                  onChangeText={setSearch}
                  className="min-h-12 min-w-0 flex-1 text-sm text-foreground"
                />
                {search ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Clear search"
                    onPress={() => setSearch("")}
                    className="min-h-11 min-w-11 items-center justify-center"
                  >
                    <Ionicons name="close" size={18} color={colors.foreground} />
                  </Pressable>
                ) : null}
              </View>
              <View
                accessibilityRole="tablist"
                accessibilityLabel="Library filter"
                className="flex-row flex-wrap gap-2"
              >
                {[false, true].map((due) => (
                  <Pressable
                    key={String(due)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: dueOnly === due }}
                    onPress={() => setDueOnly(due)}
                    className={`min-h-11 justify-center rounded-xl border px-4 ${dueOnly === due ? "border-border bg-muted" : "border-transparent"}`}
                  >
                    <Text
                      className={`text-xs ${dueOnly === due ? "font-semibold text-foreground" : "text-muted-foreground"}`}
                    >
                      {due ? "Due for review" : "All sets"}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {!filtered.length ? (
                <SectionCard className="items-center gap-3 py-10">
                  <Ionicons
                    name="search-outline"
                    size={30}
                    color={colors.mutedForeground}
                  />
                  <Text className="text-base font-semibold text-foreground">
                    No matching sets
                  </Text>
                  <Text className="max-w-sm text-center text-sm leading-6 text-muted-foreground">
                    Try another search or switch back to all sets.
                  </Text>
                  <PrimaryButton
                    label="Reset filters"
                    variant="secondary"
                    onPress={() => {
                      setSearch("");
                      setDueOnly(false);
                    }}
                  />
                </SectionCard>
              ) : (
                <View className="flex-row flex-wrap gap-4">
                  {filtered.map((deck) => (
                    <View
                      key={deck.id}
                      style={{ width: phone ? "100%" : "48%", flexGrow: 1 }}
                    >
                      <DeckCard
                        deck={deck}
                        onPress={() => router.push(`/sets/${deck.id}`)}
                      />
                    </View>
                  ))}
                </View>
              )}
            </>
          ) : null}
          {showActivity ? (
            <View className="mt-2 gap-4">
              <View className="flex-row flex-wrap items-center justify-between gap-3">
                <Text
                  accessibilityRole="header"
                  className="text-lg font-semibold text-foreground"
                >
                  Recent activity
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push("/history")}
                  className="min-h-11 justify-center px-2"
                >
                  <Text className="text-xs font-semibold text-foreground">
                    View history →
                  </Text>
                </Pressable>
              </View>
              {averageScore !== null ? (
                <Text className="text-sm text-muted-foreground">
                  {testCount === 1
                    ? "Average of 1 test"
                    : `Average of last ${testCount} tests`}
                  {" · "}{averageScore}%
                </Text>
              ) : null}
              {dashboard.recentActivity.length ? (
                <SectionCard className="gap-4">
                  {dashboard.recentActivity.slice(0, 3).map((item) => (
                    <View key={item.id} className="flex-row items-start gap-3">
                      <View className="h-9 w-9 items-center justify-center rounded-full bg-muted">
                        <Ionicons
                          name={
                            item.type === "test"
                              ? "checkmark-done-outline"
                              : "book-outline"
                          }
                          size={17}
                          color={colors.foreground}
                        />
                      </View>
                      <View className="flex-1 gap-1">
                        <Text className="text-sm font-semibold text-foreground">
                          {item.title}
                        </Text>
                        <Text className="text-xs leading-5 text-muted-foreground">
                          {item.subtitle}
                        </Text>
                        <Text className="text-[11px] text-muted-foreground">
                          {getRelativeTime(item.happenedAt)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </SectionCard>
              ) : (
                <EmptyState
                  title="A fresh start"
                  message="Your study sessions and test results will appear here."
                />
              )}
            </View>
          ) : null}
        </View>
        <View style={{ width: wide ? 300 : undefined, gap: 20 }}>
          <StudyRewards />
          {reviewSet ? (
            <SectionCard className="gap-3">
              <View className="flex-row items-center gap-2">
                <Ionicons
                  name="pencil-outline"
                  size={18}
                  color={colors.foreground}
                />
                <Text className="text-base font-semibold text-foreground">
                  Think it through
                </Text>
              </View>
              <Text className="text-sm leading-6 text-muted-foreground">
                Work through statistics or write answers with your stylus. Your
                draft is saved as you go.
              </Text>
              <PrimaryButton
                label="Open practice"
                variant="secondary"
                onPress={() => router.push("/practice")}
              />
            </SectionCard>
          ) : null}
          <CloudMigrationCard />
        </View>
      </View>
    </AppScreen>
  );
}
