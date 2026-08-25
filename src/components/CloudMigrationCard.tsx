import { useEffect, useState } from "react";
import { Alert, Text } from "react-native";

import { useAuth } from "../services/auth/AuthProvider";
import {
  getLocalDeckCount,
  hasCompletedNativeCloudUpload,
  uploadNativeDataToCloud,
} from "../services/sync/native-cloud-upload-service";
import { PrimaryButton } from "./PrimaryButton";
import { SectionCard } from "./SectionCard";

type UploadState = "checking" | "available" | "uploading" | "complete" | "hidden";

export function CloudMigrationCard() {
  const { user } = useAuth();
  const [state, setState] = useState<UploadState>("checking");
  const [deckCount, setDeckCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function check(): Promise<void> {
      if (!user) {
        setState("hidden");
        return;
      }

      try {
        const [complete, count] = await Promise.all([
          hasCompletedNativeCloudUpload(user.id),
          getLocalDeckCount(),
        ]);

        if (!active) {
          return;
        }

        setDeckCount(count);
        setState(complete ? "complete" : count > 0 ? "available" : "hidden");
      } catch (caught) {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Local study data could not be checked.");
          setState("available");
        }
      }
    }

    void check();
    return () => {
      active = false;
    };
  }, [user]);

  async function upload(): Promise<void> {
    if (!user) {
      return;
    }

    setState("uploading");
    setError(null);

    try {
      const result = await uploadNativeDataToCloud(user.id);
      setState("complete");
      Alert.alert(
        "Cloud upload complete",
        `${result.decks} sets and ${result.cards} cards are now available when you sign in on the web.`,
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Local study data could not be uploaded.");
      setState("available");
    }
  }

  function confirmUpload(): void {
    Alert.alert(
      "Upload local study data?",
      `This will copy ${deckCount} local ${deckCount === 1 ? "set" : "sets"} into ${user?.email ?? "your cloud account"}. Existing local data will remain on this device.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Upload", onPress: () => void upload() },
      ],
    );
  }

  if (state === "checking" || state === "hidden") {
    return null;
  }

  return (
    <SectionCard className="gap-3 border border-sea-200 bg-sea-50 dark:border-sea-700 dark:bg-sea-900/40">
      <Text className="text-xs font-semibold uppercase tracking-[2px] text-sea-700 dark:text-sea-300">
        Cloud library
      </Text>
      <Text className="text-xl font-semibold text-ink-900 dark:text-white">
        {state === "complete" ? "Local data uploaded" : "Bring this device’s library to the web"}
      </Text>
      <Text className="text-sm leading-6 text-ink-600 dark:text-ink-200">
        {state === "complete"
          ? "This device has completed its one-time upload. Your local SQLite library remains available here."
          : `Copy ${deckCount} local ${deckCount === 1 ? "set" : "sets"} to your private account. Uploads can be safely resumed if the connection drops.`}
      </Text>
      {error ? (
        <Text accessibilityRole="alert" className="text-sm leading-6 text-rose-500">
          {error}
        </Text>
      ) : null}
      {state !== "complete" ? (
        <PrimaryButton label="Upload local data" loading={state === "uploading"} onPress={confirmUpload} />
      ) : null}
    </SectionCard>
  );
}

