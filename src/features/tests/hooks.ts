import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getRecentTestAttempts, saveTestAttempt } from "../../db/repositories/test-repository";

export const testKeys = {
  history: ["tests", "history"] as const,
};

export function useRecentTestAttempts() {
  return useQuery({
    queryKey: testKeys.history,
    queryFn: () => getRecentTestAttempts(20),
  });
}

export function useSaveTestAttemptMutation(deckId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveTestAttempt,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: testKeys.history }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["decks", deckId] }),
      ]);
    },
  });
}
