import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Text, View } from "react-native";
import { getStudyProgress } from "../db/repositories/progress-repository";
import { studyDay } from "../features/progress/model";
import { useAuth } from "../services/auth/AuthProvider";
import { SectionCard } from "./SectionCard";
import { PrimaryButton } from "./PrimaryButton";
export function StudyRewards() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["dashboard", "rewards", user?.id, studyDay()],
    queryFn: getStudyProgress,
  });
  useEffect(() => {
    void query.refetch();
  }, [user?.id]);
  return (
    <SectionCard className="gap-3">
      <Text className="text-xl font-semibold text-ink-900 dark:text-white">Your study progress</Text>
      {query.isError ? (
        <>
          <Text className="text-sm text-ink-700 dark:text-ink-100">
            Progress could not be loaded. Check your connection and database migrations.
          </Text>
          <PrimaryButton label="Retry progress" onPress={() => void query.refetch()} />
        </>
      ) : !query.data ? (
        <Text className="text-ink-700 dark:text-ink-100">Loading progress…</Text>
      ) : (
        <>
          <Text className="text-lg text-ink-900 dark:text-white">
            Level {query.data.level} · {query.data.xp} XP · {query.data.streak} day streak
          </Text>
          <Text className="text-sm text-ink-600 dark:text-ink-200">
            Review 5 distinct cards to count a streak day. Earn XP once per card per day.
          </Text>
          {query.data.quests.map((quest) => (
            <Text key={quest.label} className="text-base text-ink-900 dark:text-white">
              {quest.current >= quest.target ? "✓" : "○"} {quest.label}: {Math.min(quest.current, quest.target)}/
              {quest.target} · 25 XP
            </Text>
          ))}
          <Text className="text-lg font-semibold text-ink-900 dark:text-white">Topic mastery · practice progress</Text>
          {query.data.topics.length ? (
            query.data.topics.map((topic) => (
              <View key={topic.tag}>
                <Text className="text-ink-900 dark:text-white">
                  {topic.tag}: {topic.percent}%{topic.selfReviewed ? " · includes self-review" : ""}
                </Text>
              </View>
            ))
          ) : (
            <Text className="text-sm text-ink-600 dark:text-ink-200">Add tags to your study sets to track topics.</Text>
          )}
        </>
      )}
    </SectionCard>
  );
}
