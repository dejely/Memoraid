import { Pressable, Text, View } from "react-native";

import { formatShortDate, getRelativeTime } from "../utils/date";
import type { DeckSummary } from "../types/models";
import { SectionCard } from "./SectionCard";
import { TagChip } from "./TagChip";

export function DeckCard({
  deck,
  onPress,
}: {
  deck: DeckSummary;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <SectionCard className="gap-4">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 gap-2">
            <Text className="text-xl font-semibold tracking-tight text-ink-900 dark:text-white">{deck.title}</Text>
            <Text className="text-sm leading-6 text-ink-600 dark:text-ink-200">{deck.description || "No description yet."}</Text>
          </View>
          <View className="rounded-2xl bg-ink-900 px-3 py-2 dark:bg-sea-500">
            <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-white">{deck.cardCount} cards</Text>
          </View>
        </View>

        <View className="flex-row flex-wrap gap-2">
          {deck.tags.map((tag) => (
            <TagChip key={`${deck.id}-${tag}`} label={tag} />
          ))}
        </View>

        <View className="flex-row flex-wrap gap-3">
          <View className="rounded-2xl bg-amber-50 px-3 py-2 dark:bg-amber-900/40">
            <Text className="text-xs font-medium text-amber-800 dark:text-amber-100">{deck.dueCount} due now</Text>
          </View>
          <View className="rounded-2xl bg-ink-100 px-3 py-2 dark:bg-ink-700">
            <Text className="text-xs font-medium text-ink-700 dark:text-ink-100">Updated {getRelativeTime(deck.updatedAt)}</Text>
          </View>
          <View className="rounded-2xl bg-sea-50 px-3 py-2 dark:bg-sea-800/50">
            <Text className="text-xs font-medium text-sea-800 dark:text-sea-100">Last studied {formatShortDate(deck.lastStudiedAt)}</Text>
          </View>
        </View>
      </SectionCard>
    </Pressable>
  );
}
