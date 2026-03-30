import { create } from "zustand";

import { shuffleList } from "../utils/array";

type FlashcardPlayerState = {
  sessionId: string | null;
  deckId: string | null;
  order: string[];
  currentIndex: number;
  shuffleEnabled: boolean;
  easyCount: number;
  hardCount: number;
  startedAt: string | null;
  completedAt: string | null;
  flipped: boolean;
  initializedKey: string | null;
  initialize: (input: {
    deckId: string;
    sessionId?: string | null;
    order: string[];
    currentIndex?: number;
    shuffleEnabled?: boolean;
    easyCount?: number;
    hardCount?: number;
    startedAt?: string | null;
    completedAt?: string | null;
    initializedKey: string;
  }) => void;
  flip: () => void;
  next: () => void;
  previous: () => void;
  toggleShuffle: (cardIds: string[]) => void;
  mark: (result: "easy" | "hard") => void;
  restart: (cardIds: string[]) => void;
  complete: () => void;
  reset: () => void;
};

function clampIndex(index: number, itemCount: number): number {
  if (itemCount === 0) {
    return 0;
  }

  return Math.max(0, Math.min(index, itemCount - 1));
}

export const useFlashcardPlayerStore = create<FlashcardPlayerState>((set, get) => ({
  sessionId: null,
  deckId: null,
  order: [],
  currentIndex: 0,
  shuffleEnabled: false,
  easyCount: 0,
  hardCount: 0,
  startedAt: null,
  completedAt: null,
  flipped: false,
  initializedKey: null,
  initialize: (input) =>
    set({
      sessionId: input.sessionId ?? null,
      deckId: input.deckId,
      order: input.order,
      currentIndex: clampIndex(input.currentIndex ?? 0, input.order.length),
      shuffleEnabled: input.shuffleEnabled ?? false,
      easyCount: input.easyCount ?? 0,
      hardCount: input.hardCount ?? 0,
      startedAt: input.startedAt ?? new Date().toISOString(),
      completedAt: input.completedAt ?? null,
      flipped: false,
      initializedKey: input.initializedKey,
    }),
  flip: () => set((state) => ({ flipped: !state.flipped })),
  next: () =>
    set((state) => ({
      currentIndex: clampIndex(state.currentIndex + 1, state.order.length),
      flipped: false,
    })),
  previous: () =>
    set((state) => ({
      currentIndex: clampIndex(state.currentIndex - 1, state.order.length),
      flipped: false,
    })),
  toggleShuffle: (cardIds) => {
    const state = get();
    const currentCardId = state.order[state.currentIndex];

    if (!currentCardId) {
      return;
    }

    if (state.shuffleEnabled) {
      const nextIndex = Math.max(0, cardIds.indexOf(currentCardId));

      set({
        order: cardIds,
        currentIndex: nextIndex,
        shuffleEnabled: false,
        flipped: false,
      });

      return;
    }

    const remaining = shuffleList(cardIds.filter((cardId) => cardId !== currentCardId));

    set({
      order: [currentCardId, ...remaining],
      currentIndex: 0,
      shuffleEnabled: true,
      flipped: false,
    });
  },
  mark: (result) =>
    set((state) => ({
      easyCount: state.easyCount + (result === "easy" ? 1 : 0),
      hardCount: state.hardCount + (result === "hard" ? 1 : 0),
    })),
  restart: (cardIds) =>
    set((state) => ({
      order: state.shuffleEnabled ? shuffleList(cardIds) : cardIds,
      currentIndex: 0,
      easyCount: 0,
      hardCount: 0,
      flipped: false,
      startedAt: new Date().toISOString(),
      completedAt: null,
    })),
  complete: () =>
    set({
      completedAt: new Date().toISOString(),
    }),
  reset: () =>
    set({
      sessionId: null,
      deckId: null,
      order: [],
      currentIndex: 0,
      shuffleEnabled: false,
      easyCount: 0,
      hardCount: 0,
      startedAt: null,
      completedAt: null,
      flipped: false,
      initializedKey: null,
    }),
}));
