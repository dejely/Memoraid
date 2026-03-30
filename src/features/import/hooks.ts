import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createDeck } from "../../db/repositories/deck-repository";
import { studyImportService } from "../../services/import/study-import-service";
import type { DeckDraft } from "../../types/models";

export function useImportPreviewMutation() {
  return useMutation({
    mutationFn: (input: Parameters<typeof studyImportService.preview>[0]) => studyImportService.preview(input),
  });
}

export function useCreateImportedDeckMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DeckDraft) =>
      createDeck({
        ...input,
        sourceType: "imported",
      }),
    onSuccess: async (deckId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["decks"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["decks", deckId] }),
      ]);
    },
  });
}
