import { readInk } from "../features/practice/ink-storage";
import { useEffect, useState } from "react";
import { Switch, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { studyStore, studyChanged } from "../db/local/store";
import { writeEntity, resolveConflict } from "../db/local/operations";
import { syncStudy } from "../services/sync/study-sync";
import {
  legacyDeviceCount,
  adoptDeviceLibrary,
} from "../db/local/legacy-device";
import { rebuildStudyProgress } from "../db/local/library";
import type { Conflict, PendingOperation } from "../db/local/types";
import { SectionCard } from "./SectionCard";
import { PrimaryButton } from "./PrimaryButton";
export function StudySyncSettings() {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [legacy, setLegacy] = useState(0),
    [deleteReady, setDeleteReady] = useState(false);
  const query = useQuery({
    queryKey: ["sync", "settings"],
    queryFn: () =>
      studyStore().transaction(async (tx) => ({
        ink: !!(await tx.get("meta", "inkSync")),
        last: await tx.get<string>("meta", "lastSyncedAt"),
        pending: (await tx.all("outbox")).length,
        conflicts: await tx.all<Conflict>("conflicts"),
        adopted: !!(await tx.get("meta", "deviceAdopted")),
      })),
  });
  useEffect(() => {
    void legacyDeviceCount()
      .then(setLegacy)
      .catch(() => {});
  }, []);
  async function action(work: () => Promise<unknown>) {
    setBusy(true);
    try {
      await work();
      studyChanged();
      await query.refetch();
      setMessage("Saved.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not finish.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <SectionCard className="gap-3">
      <Text className="text-lg font-semibold text-ink-900 dark:text-white">
        Offline library and sync
      </Text>
      <Text className="text-ink-700 dark:text-ink-100">
        Downloaded sets, answers and drafts stay available on this device.{" "}
        {query.data?.pending ?? 0} pending changes. Last synced:{" "}
        {query.data?.last
          ? new Date(query.data.last).toLocaleString()
          : "not yet"}
        .
      </Text>
      <PrimaryButton
        label="Sync now"
        loading={busy}
        onPress={() => void action(syncStudy)}
      />
      <View className="flex-row items-center gap-3">
        <Switch
          accessibilityLabel="Sync handwriting"
          disabled={busy}
          value={query.data?.ink ?? false}
          onValueChange={(enabled) =>
            void action(async () => {
              await studyStore().transaction(async (tx) => {
                await tx.set("meta", "inkSync", enabled);
                if (enabled) {
                  for (const id of (await tx.get<string[]>("meta", "inkIds")) ??
                    []) {
                    const ink = await readInk(tx, id);
                    if (ink) await writeEntity(tx, "ink", id, ink);
                  }
                } else {
                  for (const op of await tx.all<PendingOperation>("outbox"))
                    if (op.kind === "ink" && !op.deleted)
                      await tx.remove("outbox", op.key);
                }
              });
            })
          }
        />
        <Text className="text-ink-900 dark:text-white">
          Upload my handwriting
        </Text>
      </View>
      <Text className="text-sm text-ink-600 dark:text-ink-200">
        Off by default. Answers and review history sync separately. Turning this
        off stops future ink uploads. Use the separate deletion control to
        remove cloud copies.
      </Text>
      <PrimaryButton
        label={
          deleteReady
            ? "Confirm cloud handwriting deletion"
            : "Delete cloud handwriting copies"
        }
        disabled={busy}
        variant="danger"
        onPress={() => {
          if (!deleteReady) {
            setDeleteReady(true);
            return;
          }
          void action(async () => {
            const store = studyStore();
            await store.transaction(async (tx) => {
              await tx.set("meta", "inkSync", false);
              await tx.set("meta", "deleteCloudInk", true);
            });
            setDeleteReady(false);
            await syncStudy();
          });
        }}
      />
      {query.data?.conflicts.map((c) => (
        <View key={c.key} className="gap-2">
          <Text className="font-semibold text-ink-900 dark:text-white">
            Conflict:{" "}
            {c.local.payload?.title ??
              c.local.payload?.problem?.prompt ??
              c.key}
          </Text>
          <Text className="text-sm text-ink-700 dark:text-ink-100" selectable>
            Device: {JSON.stringify(c.local.payload).slice(0, 1800)}
            {c.local.deleted ? " (deleted)" : ""}
          </Text>
          <Text className="text-sm text-ink-700 dark:text-ink-100" selectable>
            Cloud: {JSON.stringify(c.remote.payload).slice(0, 1800)}
            {c.remote.deleted ? " (deleted)" : ""}
          </Text>
          {(["local", "remote"] as const).map((choice) => (
            <PrimaryButton
              key={choice}
              label={
                choice === "local"
                  ? "Keep device version"
                  : "Keep cloud version"
              }
              disabled={busy}
              variant="secondary"
              onPress={() =>
                void action(() =>
                  studyStore().transaction((tx) =>
                    resolveConflict(tx, c.key, choice),
                  ),
                )
              }
            />
          ))}
        </View>
      ))}
      {legacy > 0 && !query.data?.adopted ? (
        <>
          <Text className="text-ink-700 dark:text-ink-100">
            This device has {legacy} sets from the older shared library. Adopt
            them only if they belong to the currently signed-in account.
          </Text>
          <PrimaryButton
            label="Adopt older device library into my account"
            disabled={busy}
            onPress={() => void action(adoptDeviceLibrary)}
          />
        </>
      ) : null}
      <PrimaryButton
        label="Rebuild progress summary"
        variant="secondary"
        disabled={busy}
        onPress={() => void action(rebuildStudyProgress)}
      />
      {message ? (
        <Text
          accessibilityRole="alert"
          className="text-ink-900 dark:text-white"
        >
          {message}
        </Text>
      ) : null}
    </SectionCard>
  );
}
