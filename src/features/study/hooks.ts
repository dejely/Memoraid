import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getFlashcardSession, saveFlashcardSession } from "../../db/repositories/session-repository";
import { recordReview } from "../../db/repositories/review-repository";

export const studyKeys = {
  session: (deckId: string) => ["study", "session", deckId] as const,
};

export function useFlashcardSession(deckId: string) {
  return useQuery({
    queryKey: studyKeys.session(deckId),
    queryFn: () => getFlashcardSession(deckId),
    enabled: Boolean(deckId),
  });
}

export function useSaveFlashcardSessionMutation(deckId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Parameters<typeof saveFlashcardSession>[0]) => saveFlashcardSession(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: studyKeys.session(deckId) }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["decks", deckId] }),
      ]);
    },
  });
}

export function useRecordReviewMutation(deckId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { cardId: string; result: "easy" | "hard" | "correct" | "incorrect" }) =>
      recordReview(input.cardId, deckId, input.result),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["decks", deckId] }),
      ]);
    },
  });
}
