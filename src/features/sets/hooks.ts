import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getDeckById, getDeckSummaries, createDeck, deleteDeck, updateDeck } from "../../db/repositories/deck-repository";
import type { DeckDraft } from "../../types/models";

export const setKeys = {
  all: ["decks"] as const,
  detail: (deckId: string) => ["decks", deckId] as const,
};

export function useDecks() {
  return useQuery({
    queryKey: setKeys.all,
    queryFn: getDeckSummaries,
  });
}

export function useDeck(deckId: string) {
  return useQuery({
    queryKey: setKeys.detail(deckId),
    queryFn: () => getDeckById(deckId),
    enabled: Boolean(deckId),
  });
}

export function useCreateDeckMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DeckDraft) => createDeck(input),
    onSuccess: async (deckId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: setKeys.all }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
      await queryClient.invalidateQueries({ queryKey: setKeys.detail(deckId) });
    },
  });
}

export function useUpdateDeckMutation(deckId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DeckDraft) => updateDeck(deckId, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: setKeys.all }),
        queryClient.invalidateQueries({ queryKey: setKeys.detail(deckId) }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
    },
  });
}

export function useDeleteDeckMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (deckId: string) => deleteDeck(deckId),
    onSuccess: async (_, deckId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: setKeys.all }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.removeQueries({ queryKey: setKeys.detail(deckId) }),
      ]);
    },
  });
}
