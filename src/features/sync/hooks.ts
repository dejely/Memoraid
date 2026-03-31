import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { saveBackendConfig, loadBackendConfig } from "../../services/secure/preferences-service";
import {
  getCurrentSyncStatus,
  runConfiguredSyncNow,
  verifyConfiguredSyncConnection,
} from "../../services/sync";
import type { BackendConfig } from "../../types/models";

export const syncKeys = {
  config: ["sync", "config"] as const,
  status: ["sync", "status"] as const,
};

export function useBackendConfig() {
  return useQuery({
    queryKey: syncKeys.config,
    queryFn: loadBackendConfig,
  });
}

export function useSyncStatus() {
  return useQuery({
    queryKey: syncKeys.status,
    queryFn: getCurrentSyncStatus,
  });
}

export function useSaveBackendConfigMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (config: BackendConfig) => saveBackendConfig(config),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: syncKeys.config }),
        queryClient.invalidateQueries({ queryKey: syncKeys.status }),
      ]);
    },
  });
}

export function useVerifySyncConnectionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: verifyConfiguredSyncConnection,
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: syncKeys.status });
    },
  });
}

export function useSyncNowMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: runConfiguredSyncNow,
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: syncKeys.status }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["decks"] }),
        queryClient.invalidateQueries({ queryKey: ["tests", "history"] }),
      ]);
    },
  });
}
