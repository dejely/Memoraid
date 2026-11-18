import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { formatShortDate } from "../utils/date";
import type { DeckSummary } from "../types/models";
import { useThemeColors } from "./ThemeProvider";
import { SectionCard } from "./SectionCard";
import { TagChip } from "./TagChip";

export function DeckCard({
  deck,
  onPress,
}: {
  deck: DeckSummary;
  onPress?: () => void;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${deck.title}, ${deck.cardCount} cards, ${deck.dueCount} due`}
      onPress={onPress}
      style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.75 : 1 })}
    >
      <SectionCard className="flex-1 gap-4">
        <View className="flex-row items-center justify-between gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-muted">
            <Ionicons
              name="albums-outline"
              size={20}
              color={colors.foreground}
            />
          </View>
          <View className="rounded-full bg-muted px-2.5 py-1">
            <Text className="text-[11px] font-medium text-foreground">
              {deck.dueCount > 0 ? `${deck.dueCount} due` : "No cards due"}
            </Text>
          </View>
        </View>
        <View className="gap-2">
          <Text
            numberOfLines={2}
            className="text-lg font-semibold tracking-tight text-foreground"
          >
            {deck.title}
          </Text>
          <Text
            numberOfLines={2}
            className="text-sm leading-5 text-muted-foreground"
          >
            {deck.description || "Your next learning session starts here."}
          </Text>
        </View>
        {deck.tags.length ? (
          <View className="flex-row flex-wrap gap-1.5">
            {deck.tags.slice(0, 3).map((tag) => (
              <TagChip key={tag} label={tag} />
            ))}
          </View>
        ) : null}
        <View className="mt-auto flex-row items-center justify-between gap-2 border-t border-border pt-3">
          <Text className="text-xs text-muted-foreground">
            {deck.cardCount} cards ·{" "}
            {deck.lastStudiedAt
              ? formatShortDate(deck.lastStudiedAt)
              : "Not studied yet"}
          </Text>
          <Ionicons name="arrow-forward" size={16} color={colors.foreground} />
        </View>
      </SectionCard>
    </Pressable>
  );
}
