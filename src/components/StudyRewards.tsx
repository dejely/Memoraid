import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Text, View } from "react-native";
import { getStudyProgress } from "../db/repositories/progress-repository";
import { studyDay } from "../features/progress/model";
import { useAuth } from "../services/auth/AuthProvider";
import { SectionCard } from "./SectionCard";
import { PrimaryButton } from "./PrimaryButton";
import { useThemeColors } from "./ThemeProvider";
function ProgressBar({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max, now: Math.min(value, max) }}
      className="h-1.5 overflow-hidden rounded-full bg-border"
    >
      <View
        className="h-full rounded-full bg-primary"
        style={{ width: `${Math.min(100, Math.max(0, (value / max) * 100))}%` }}
      />
    </View>
  );
}
export function StudyRewards() {
  const { user } = useAuth();
  const colors = useThemeColors();
  const query = useQuery({
    queryKey: ["dashboard", "rewards", user?.id, studyDay()],
    queryFn: getStudyProgress,
  });
  useEffect(() => {
    void query.refetch();
  }, [user?.id]);
  const progress = query.data;
  return (
    <SectionCard className="gap-5">
      <View className="flex-row items-center justify-between">
        <Text className="text-lg font-semibold text-foreground">
          Daily goals
        </Text>
        <Ionicons name="flame-outline" size={20} color={colors.foreground} />
      </View>
      {query.isError ? (
        <>
          <Text className="text-sm text-muted-foreground">
            Progress could not be loaded.
          </Text>
          <PrimaryButton
            label="Retry progress"
            onPress={() => void query.refetch()}
          />
        </>
      ) : !progress ? (
        <Text className="text-sm text-muted-foreground">Loading progress…</Text>
      ) : (
        <>
          <View className="gap-3 rounded-xl bg-muted p-4">
            <View className="flex-row items-center justify-between gap-2">
              <Text className="text-sm font-semibold text-foreground">
                Level {progress.level}
              </Text>
              <Text className="text-xs text-foreground">{progress.xp} XP</Text>
            </View>
            <ProgressBar
              label="XP toward next level"
              value={progress.xp % 250}
              max={250}
            />
            <Text className="text-xs text-muted-foreground">
              {250 - (progress.xp % 250)} XP to your next level
            </Text>
          </View>
          <View className="flex-row items-baseline gap-2">
            <Text className="text-2xl font-semibold text-foreground">
              {progress.streak}
            </Text>
            <Text className="text-sm text-muted-foreground">day streak</Text>
          </View>
          <Text className="-mt-3 text-xs leading-5 text-muted-foreground">
            Review 5 distinct cards to count a streak day.
          </Text>
          {progress.quests.map((quest) => (
            <View key={quest.label} className="gap-2">
              <View className="flex-row items-start justify-between gap-2">
                <Text className="flex-1 text-xs leading-5 text-foreground">
                  {quest.current >= quest.target ? "✓ " : ""}
                  {quest.label}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  {Math.min(quest.current, quest.target)}/{quest.target}
                </Text>
              </View>
              <ProgressBar
                label={quest.label}
                value={quest.current}
                max={quest.target}
              />
            </View>
          ))}
          <Text className="text-[11px] text-muted-foreground">
            +25 XP per goal · card XP once per day
          </Text>
          <View className="gap-3 border-t border-border pt-4">
            <Text className="text-sm font-semibold text-foreground">
              Topic mastery
            </Text>
            {progress.topics.length ? (
              progress.topics.map((topic) => (
                <View key={topic.tag} className="gap-2">
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-foreground">{topic.tag}</Text>
                    <Text className="text-xs text-muted-foreground">
                      {topic.percent}%
                    </Text>
                  </View>
                  <ProgressBar
                    label={`${topic.tag} mastery`}
                    value={topic.percent}
                    max={100}
                  />
                  {topic.selfReviewed ? (
                    <Text className="text-[10px] text-muted-foreground">
                      Includes self-review
                    </Text>
                  ) : null}
                </View>
              ))
            ) : (
              <Text className="text-xs leading-5 text-muted-foreground">
                Tag your sets to see your practice progress by topic.
              </Text>
            )}
          </View>
        </>
      )}
    </SectionCard>
  );
}
