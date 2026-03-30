import { router } from "expo-router";
import { Alert, Text, View } from "react-native";

import { AppScreen } from "../components/AppScreen";
import { EmptyState } from "../components/EmptyState";
import { LoadingState } from "../components/LoadingState";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenHeader } from "../components/ScreenHeader";
import { SectionCard } from "../components/SectionCard";
import { TagChip } from "../components/TagChip";
import { useDeleteDeckMutation, useDeck } from "../features/sets/hooks";
import { formatShortDate } from "../utils/date";

export default function SetDetailScreen({ deckId }: { deckId: string }) {
  const deckQuery = useDeck(deckId);
  const deleteDeckMutation = useDeleteDeckMutation();

  async function confirmDelete(): Promise<void> {
    Alert.alert("Delete study set", "This removes the set, cards, sessions, and saved test history from local storage.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteDeckMutation.mutateAsync(deckId);
          router.replace("/");
        },
      },
    ]);
  }

  if (deckQuery.isLoading) {
    return <LoadingState message="Loading study set..." />;
  }

  if (!deckQuery.data) {
    return (
      <AppScreen>
        <ScreenHeader eyebrow="Missing set" title="Study set not found" />
        <EmptyState title="Nothing here" message="The requested study set could not be found in local storage." />
      </AppScreen>
    );
  }

  const deck = deckQuery.data;

  return (
    <AppScreen>
      <ScreenHeader
        eyebrow={deck.sourceType === "imported" ? "Imported set" : "Manual set"}
        title={deck.title}
        subtitle={deck.description || "No description yet."}
        trailing={<PrimaryButton label="Edit" variant="secondary" onPress={() => router.push(`/sets/${deck.id}/edit`)} />}
      />

      <SectionCard className="gap-4 bg-ink-900">
        <View className="flex-row flex-wrap gap-2">
          {deck.tags.map((tag) => (
            <TagChip key={`${deck.id}-${tag}`} label={tag} />
          ))}
        </View>
        <View className="flex-row gap-3">
          <PrimaryButton className="flex-1 bg-white" textClassName="text-ink-900" label="Study" onPress={() => router.push(`/sets/${deck.id}/study`)} />
          <PrimaryButton className="flex-1 border border-white/20 bg-white/10" textClassName="text-white" label="Test" onPress={() => router.push(`/sets/${deck.id}/test`)} />
        </View>
      </SectionCard>

      <View className="flex-row gap-3">
        <SectionCard className="flex-1 gap-2">
          <Text className="text-xs font-medium uppercase tracking-[1.5px] text-ink-500 dark:text-ink-300">Cards</Text>
          <Text className="text-2xl font-bold text-ink-900 dark:text-white">{deck.cardCount}</Text>
        </SectionCard>
        <SectionCard className="flex-1 gap-2">
          <Text className="text-xs font-medium uppercase tracking-[1.5px] text-ink-500 dark:text-ink-300">Due now</Text>
          <Text className="text-2xl font-bold text-ink-900 dark:text-white">{deck.dueCount}</Text>
        </SectionCard>
        <SectionCard className="flex-1 gap-2">
          <Text className="text-xs font-medium uppercase tracking-[1.5px] text-ink-500 dark:text-ink-300">Last studied</Text>
          <Text className="text-lg font-bold text-ink-900 dark:text-white">{formatShortDate(deck.lastStudiedAt)}</Text>
        </SectionCard>
      </View>

      <View className="gap-3">
        <Text className="text-lg font-semibold text-ink-900 dark:text-white">Cards</Text>
        {deck.cards.map((card, index) => (
          <SectionCard key={card.id} className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-medium uppercase tracking-[2px] text-sea-700 dark:text-sea-300">Card {index + 1}</Text>
              {card.reviewStats?.dueAt ? (
                <View className="rounded-full bg-amber-50 px-3 py-2 dark:bg-amber-900/40">
                  <Text className="text-xs font-medium text-amber-800 dark:text-amber-100">Due {formatShortDate(card.reviewStats.dueAt)}</Text>
                </View>
              ) : null}
            </View>
            <Text className="text-xl font-semibold text-ink-900 dark:text-white">{card.term}</Text>
            <Text className="text-sm leading-6 text-ink-600 dark:text-ink-200">{card.definition}</Text>
            {card.example ? <Text className="text-sm leading-6 text-ink-500 dark:text-ink-300">Example: {card.example}</Text> : null}
          </SectionCard>
        ))}
      </View>

      <PrimaryButton label="Delete set" variant="danger" loading={deleteDeckMutation.isPending} onPress={confirmDelete} />
    </AppScreen>
  );
}
