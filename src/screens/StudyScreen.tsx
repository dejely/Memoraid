import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useMemo, useRef } from "react";
import { Animated, Pressable, Text, View, PanResponder } from "react-native";

import { AppScreen } from "../components/AppScreen";
import { EmptyState } from "../components/EmptyState";
import { FlashcardPanel } from "../components/FlashcardPanel";
import { LoadingState } from "../components/LoadingState";
import { PrimaryButton } from "../components/PrimaryButton";
import { ProgressBar } from "../components/ProgressBar";
import { ScreenHeader } from "../components/ScreenHeader";
import { SectionCard } from "../components/SectionCard";
import { saveFlashcardSession } from "../db/repositories/session-repository";
import { useDeck } from "../features/sets/hooks";
import { useFlashcardSession, useRecordReviewMutation } from "../features/study/hooks";
import { useFlashcardPlayerStore } from "../store/flashcard-player-store";

export default function StudyScreen({ deckId }: { deckId: string }) {
  const deckQuery = useDeck(deckId);
  const sessionQuery = useFlashcardSession(deckId);
  const recordReviewMutation = useRecordReviewMutation(deckId);
  const queryClient = useQueryClient();

  const translateX = useRef(new Animated.Value(0)).current;

  const store = useFlashcardPlayerStore((state) => state);
  const cardIds = deckQuery.data?.cards.map((card) => card.id) ?? [];
  const initializedKey = `${deckId}:${deckQuery.data?.updatedAt ?? "pending"}:${sessionQuery.data?.updatedAt ?? "fresh"}`;

  useEffect(() => {
    const deck = deckQuery.data;

    if (!deck || store.initializedKey === initializedKey) {
      return;
    }

    const restoredOrder = (sessionQuery.data?.order ?? []).filter((cardId) => cardIds.includes(cardId));
    const missingCardIds = cardIds.filter((cardId) => !restoredOrder.includes(cardId));
    const order = restoredOrder.length > 0 ? [...restoredOrder, ...missingCardIds] : cardIds;

    store.initialize({
      deckId,
      sessionId: sessionQuery.data?.id ?? null,
      order,
      currentIndex: sessionQuery.data?.currentIndex ?? 0,
      shuffleEnabled: sessionQuery.data?.shuffleEnabled ?? false,
      easyCount: sessionQuery.data?.easyCount ?? 0,
      hardCount: sessionQuery.data?.hardCount ?? 0,
      startedAt: sessionQuery.data?.startedAt ?? null,
      completedAt: sessionQuery.data?.completedAt ?? null,
      initializedKey,
    });
  }, [cardIds, deckId, deckQuery.data, initializedKey, sessionQuery.data, store]);

  useEffect(() => {
    if (!deckQuery.data || store.deckId !== deckId || store.order.length === 0) {
      return;
    }

    const timeoutId = setTimeout(() => {
      void saveFlashcardSession({
        deckId,
        currentIndex: store.currentIndex,
        order: store.order,
        shuffleEnabled: store.shuffleEnabled,
        easyCount: store.easyCount,
        hardCount: store.hardCount,
        completedAt: store.completedAt,
        sessionId: store.sessionId,
        startedAt: store.startedAt,
      });
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [
    deckId,
    deckQuery.data,
    store.completedAt,
    store.currentIndex,
    store.deckId,
    store.easyCount,
    store.hardCount,
    store.order,
    store.sessionId,
    store.shuffleEnabled,
    store.startedAt,
  ]);

  useEffect(() => {
    return () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["decks", deckId] });
      queryClient.invalidateQueries({ queryKey: ["study", "session", deckId] });
    };
  }, [deckId, queryClient]);

  const cardMap = useMemo(
    () => new Map((deckQuery.data?.cards ?? []).map((card) => [card.id, card])),
    [deckQuery.data?.cards],
  );
  const currentCardId = store.order[store.currentIndex];
  const currentCard = currentCardId ? cardMap.get(currentCardId) : undefined;
  const isLastCard = store.currentIndex >= Math.max(0, store.order.length - 1);

  function springBack() {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      speed: 18,
      bounciness: 7,
    }).start();
  }

  function animateTo(direction: "next" | "previous") {
    Animated.timing(translateX, {
      toValue: direction === "next" ? -150 : 150,
      duration: 140,
      useNativeDriver: true,
    }).start(() => {
      if (direction === "next") {
        store.next();
      } else {
        store.previous();
      }

      translateX.setValue(0);
    });
  }

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 12 && Math.abs(gestureState.dy) < 20,
        onPanResponderMove: (_, gestureState) => {
          translateX.setValue(gestureState.dx);
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx <= -80 && !isLastCard) {
            animateTo("next");
            return;
          }

          if (gestureState.dx >= 80 && store.currentIndex > 0) {
            animateTo("previous");
            return;
          }

          springBack();
        },
      }),
    [isLastCard, store, translateX],
  );

  async function handleMark(result: "easy" | "hard"): Promise<void> {
    if (!currentCard) {
      return;
    }

    store.mark(result);
    recordReviewMutation.mutate({
      cardId: currentCard.id,
      result,
    });

    if (isLastCard) {
      store.complete();
      return;
    }

    store.next();
  }

  if (deckQuery.isLoading || sessionQuery.isLoading) {
    return <LoadingState message="Loading flashcards and your last session..." />;
  }

  if (!deckQuery.data || !currentCard) {
    return (
      <AppScreen>
        <ScreenHeader eyebrow="Flashcard mode" title="No cards available" />
        <EmptyState title="Nothing to study yet" message="Add cards to this set before starting flashcard mode." />
      </AppScreen>
    );
  }

  const rotation = translateX.interpolate({
    inputRange: [-180, 0, 180],
    outputRange: ["-5deg", "0deg", "5deg"],
  });

  return (
    <AppScreen>
      <ScreenHeader
        eyebrow="Flashcard mode"
        title={deckQuery.data.title}
        subtitle="Tap to flip, swipe to move, and mark cards easy or hard to update local review stats."
        trailing={<PrimaryButton label="Back" variant="secondary" onPress={() => router.back()} />}
      />

      <SectionCard className="gap-4">
        <ProgressBar current={store.currentIndex + 1} total={store.order.length} label="Session progress" />
        <View className="flex-row flex-wrap gap-3">
          <View className="rounded-full bg-sea-50 px-3 py-2 dark:bg-sea-800/50">
            <Text className="text-xs font-medium text-sea-800 dark:text-sea-100">Easy marked {store.easyCount}</Text>
          </View>
          <View className="rounded-full bg-amber-50 px-3 py-2 dark:bg-amber-900/40">
            <Text className="text-xs font-medium text-amber-800 dark:text-amber-100">Hard marked {store.hardCount}</Text>
          </View>
          {store.completedAt ? (
            <View className="rounded-full bg-ink-100 px-3 py-2 dark:bg-ink-700">
              <Text className="text-xs font-medium text-ink-700 dark:text-ink-100">Session finished</Text>
            </View>
          ) : null}
        </View>
      </SectionCard>

      <Animated.View
        {...panResponder.panHandlers}
        style={{
          transform: [{ translateX }, { rotate: rotation }],
        }}
      >
        <Pressable onPress={store.flip}>
          <FlashcardPanel card={currentCard} flipped={store.flipped} />
        </Pressable>
      </Animated.View>

      <View className="flex-row gap-3">
        <PrimaryButton
          className="flex-1"
          label="Previous"
          variant="secondary"
          disabled={store.currentIndex === 0}
          onPress={store.previous}
        />
        <PrimaryButton className="flex-1" label={store.flipped ? "Show term" : "Flip"} variant="secondary" onPress={store.flip} />
        <PrimaryButton
          className="flex-1"
          label={isLastCard ? "Finish" : "Next"}
          onPress={() => {
            if (isLastCard) {
              store.complete();
              return;
            }

            store.next();
          }}
        />
      </View>

      <View className="flex-row gap-3">
        <PrimaryButton className="flex-1" label="Mark hard" variant="secondary" onPress={() => void handleMark("hard")} />
        <PrimaryButton className="flex-1" label="Mark easy" onPress={() => void handleMark("easy")} />
      </View>

      <SectionCard className="gap-3">
        <Text className="text-lg font-semibold text-ink-900 dark:text-white">Session controls</Text>
        <View className="flex-row gap-3">
          <PrimaryButton
            className="flex-1"
            label={store.shuffleEnabled ? "Ordered view" : "Shuffle stack"}
            variant="secondary"
            onPress={() => store.toggleShuffle(cardIds)}
          />
          <PrimaryButton className="flex-1" label="Restart" variant="ghost" onPress={() => store.restart(cardIds)} />
        </View>
      </SectionCard>
    </AppScreen>
  );
}
