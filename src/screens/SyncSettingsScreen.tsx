import { useEffect, useState } from "react";
import { Alert, Text, View } from "react-native";

import { AppScreen } from "../components/AppScreen";
import { FormField } from "../components/FormField";
import { LoadingState } from "../components/LoadingState";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenHeader } from "../components/ScreenHeader";
import { SectionCard } from "../components/SectionCard";
import {
  useBackendConfig,
  useSaveBackendConfigMutation,
  useSyncNowMutation,
  useSyncStatus,
  useVerifySyncConnectionMutation,
} from "../features/sync/hooks";
import { formatDateTime } from "../utils/date";
import type { BackendConfig, SyncProvider } from "../types/models";

function normalizeConfig(config: BackendConfig): BackendConfig {
  const isCustomApi = config.provider === "custom-api";

  return {
    aiEnabled: isCustomApi ? config.aiEnabled : false,
    syncEnabled: isCustomApi ? config.syncEnabled : false,
    provider: isCustomApi ? "custom-api" : "local-only",
    apiBaseUrl: isCustomApi ? config.apiBaseUrl?.trim() || null : null,
    accessToken: isCustomApi ? config.accessToken?.trim() || null : null,
  };
}

export default function SyncSettingsScreen() {
  const backendConfigQuery = useBackendConfig();
  const syncStatusQuery = useSyncStatus();
  const saveBackendConfigMutation = useSaveBackendConfigMutation();
  const verifySyncConnectionMutation = useVerifySyncConnectionMutation();
  const syncNowMutation = useSyncNowMutation();

  const [provider, setProvider] = useState<SyncProvider>("local-only");
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [apiBaseUrl, setApiBaseUrl] = useState("");
  const [accessToken, setAccessToken] = useState("");

  useEffect(() => {
    if (!backendConfigQuery.data) {
      return;
    }

    setProvider(backendConfigQuery.data.provider);
    setSyncEnabled(backendConfigQuery.data.syncEnabled);
    setAiEnabled(backendConfigQuery.data.aiEnabled);
    setApiBaseUrl(backendConfigQuery.data.apiBaseUrl ?? "");
    setAccessToken(backendConfigQuery.data.accessToken ?? "");
  }, [backendConfigQuery.data]);

  if (backendConfigQuery.isLoading || syncStatusQuery.isLoading) {
    return <LoadingState message="Loading backend config and sync status..." />;
  }

  const normalizedConfig = normalizeConfig({
    aiEnabled,
    syncEnabled,
    provider,
    apiBaseUrl,
    accessToken,
  });
  const customApiSelected = normalizedConfig.provider === "custom-api";
  const remoteReady = customApiSelected && normalizedConfig.syncEnabled && Boolean(normalizedConfig.apiBaseUrl);
  const syncStatus = syncStatusQuery.data;

  async function handleSave(): Promise<void> {
    try {
      await saveBackendConfigMutation.mutateAsync(normalizedConfig);
      Alert.alert("Backend saved", customApiSelected ? "Your custom sync backend is saved locally." : "The app is back to local-only mode.");
    } catch (error) {
      Alert.alert("Save failed", error instanceof Error ? error.message : "The backend settings could not be saved.");
    }
  }

  async function handleVerify(): Promise<void> {
    try {
      await saveBackendConfigMutation.mutateAsync(normalizedConfig);
      const result = await verifySyncConnectionMutation.mutateAsync();
      Alert.alert(
        "Backend verified",
        `${result.server.service}${result.server.version ? ` ${result.server.version}` : ""} responded to Memoraid discovery.`,
      );
    } catch (error) {
      Alert.alert("Verification failed", error instanceof Error ? error.message : "The backend could not be verified.");
    }
  }

  async function handleSyncNow(): Promise<void> {
    try {
      await saveBackendConfigMutation.mutateAsync(normalizedConfig);
      const result = await syncNowMutation.mutateAsync();
      Alert.alert(
        "Sync complete",
        `${result.acknowledgedCount} local change${result.acknowledgedCount === 1 ? "" : "s"} acknowledged by the backend.`,
      );
    } catch (error) {
      Alert.alert("Sync failed", error instanceof Error ? error.message : "The app could not finish syncing.");
    }
  }

  return (
    <AppScreen>
      <ScreenHeader
        eyebrow="Bring your own backend"
        title="Sync settings"
        subtitle="Point Memoraid at a custom sync API so mobile and web clients can share one library while the app stays local-first."
      />

      <SectionCard className="gap-4">
        <View className="gap-2">
          <Text className="text-lg font-semibold text-ink-900 dark:text-white">Connection mode</Text>
          <Text className="text-sm leading-6 text-ink-600 dark:text-ink-200">
            The app never connects directly to a raw database. It talks to a Memoraid-compatible sync API that can sit in front of any backend you own.
          </Text>
        </View>

        <View className="flex-row gap-3">
          <PrimaryButton
            className="flex-1"
            label="Local only"
            variant={provider === "local-only" ? "primary" : "secondary"}
            onPress={() => setProvider("local-only")}
          />
          <PrimaryButton
            className="flex-1"
            label="Custom API"
            variant={provider === "custom-api" ? "primary" : "secondary"}
            onPress={() => setProvider("custom-api")}
          />
        </View>
      </SectionCard>

      {customApiSelected ? (
        <SectionCard className="gap-4">
          <Text className="text-lg font-semibold text-ink-900 dark:text-white">Backend details</Text>
          <FormField
            label="API base URL"
            value={apiBaseUrl}
            onChangeText={setApiBaseUrl}
            placeholder="https://sync.example.com"
            autoCapitalize="none"
          />
          <FormField
            label="Access token"
            value={accessToken}
            onChangeText={setAccessToken}
            placeholder="Optional bearer token"
            autoCapitalize="none"
            secureTextEntry
          />

          <View className="flex-row gap-3">
            <PrimaryButton
              className="flex-1"
              label={syncEnabled ? "Sync on" : "Sync off"}
              variant={syncEnabled ? "primary" : "secondary"}
              onPress={() => setSyncEnabled((value) => !value)}
            />
            <PrimaryButton
              className="flex-1"
              label={aiEnabled ? "AI on" : "AI off"}
              variant={aiEnabled ? "primary" : "secondary"}
              onPress={() => setAiEnabled((value) => !value)}
            />
          </View>
        </SectionCard>
      ) : null}

      <SectionCard className="gap-3">
        <Text className="text-lg font-semibold text-ink-900 dark:text-white">Current status</Text>
        <Text className="text-sm text-ink-600 dark:text-ink-200">Provider: {syncStatus?.provider ?? "local-only"}</Text>
        <Text className="text-sm text-ink-600 dark:text-ink-200">State: {syncStatus?.state ?? "disabled"}</Text>
        <Text className="text-sm text-ink-600 dark:text-ink-200">Pending local changes: {syncStatus?.pendingChanges ?? 0}</Text>
        <Text className="text-sm text-ink-600 dark:text-ink-200">Last verified: {formatDateTime(syncStatus?.lastVerifiedAt)}</Text>
        <Text className="text-sm text-ink-600 dark:text-ink-200">Last synced: {formatDateTime(syncStatus?.lastSyncedAt)}</Text>
        {syncStatus?.serverName ? (
          <Text className="text-sm text-ink-600 dark:text-ink-200">
            Server: {syncStatus.serverName}
            {syncStatus.serverVersion ? ` ${syncStatus.serverVersion}` : ""}
          </Text>
        ) : null}
        {syncStatus?.lastError ? (
          <Text className="text-sm leading-6 text-rose-600 dark:text-rose-300">{syncStatus.lastError}</Text>
        ) : null}
      </SectionCard>

      <View className="gap-3">
        <PrimaryButton label="Save backend config" loading={saveBackendConfigMutation.isPending} onPress={handleSave} />
        <PrimaryButton
          label="Verify backend"
          variant="secondary"
          loading={verifySyncConnectionMutation.isPending}
          disabled={!remoteReady}
          onPress={handleVerify}
        />
        <PrimaryButton
          label="Sync now"
          variant="secondary"
          loading={syncNowMutation.isPending}
          disabled={!remoteReady}
          onPress={handleSyncNow}
        />
      </View>

      <SectionCard className="gap-2">
        <Text className="text-lg font-semibold text-ink-900 dark:text-white">Expected API contract</Text>
        <Text className="text-sm leading-6 text-ink-600 dark:text-ink-200">GET `/.well-known/memoraid-sync` for discovery and capability checks.</Text>
        <Text className="text-sm leading-6 text-ink-600 dark:text-ink-200">POST `/v1/sync/push` for queued local changes.</Text>
        <Text className="text-sm leading-6 text-ink-600 dark:text-ink-200">POST `/v1/sync/pull` for remote changes since the last cursor.</Text>
      </SectionCard>
    </AppScreen>
  );
}
