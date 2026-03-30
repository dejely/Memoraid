import { Text, View } from "react-native";

import type { StudyCard } from "../types/models";
import { SectionCard } from "./SectionCard";

export function FlashcardPanel({
  card,
  flipped,
}: {
  card: StudyCard;
  flipped: boolean;
}) {
  return (
    <SectionCard className="min-h-72 justify-between rounded-[32px] bg-ink-900 px-5 py-6">
      <View className="gap-3">
        <Text className="text-xs font-medium uppercase tracking-[2px] text-white/60">
          {flipped ? "Definition" : "Term"}
        </Text>
        <Text className="text-3xl font-bold tracking-tight text-white">{flipped ? card.definition : card.term}</Text>
      </View>

      {flipped && card.example ? (
        <View className="rounded-3xl bg-white/10 p-4">
          <Text className="text-xs font-medium uppercase tracking-[1.5px] text-white/60">Example</Text>
          <Text className="mt-2 text-sm leading-6 text-white/90">{card.example}</Text>
        </View>
      ) : (
        <Text className="text-sm leading-6 text-white/70">
          Tap to flip. Swipe left or right to move through the stack.
        </Text>
      )}
    </SectionCard>
  );
}
