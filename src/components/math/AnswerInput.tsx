import { useThemeColors } from "../ThemeProvider";
import type { Ink } from "../../features/practice/ink";
import { useEffect, useRef, useState } from "react";
import { Modal, ScrollView, Text, TextInput, View } from "react-native";
import { PrimaryButton } from "../PrimaryButton";
import { MathSurface } from "./MathSurface";
import { MathContent } from "./MathContent";
import { recognizeMath } from "../../services/ai/client";
import { useAuth } from "../../services/auth/AuthProvider";
import type { SurfaceMessage } from "./MathSurface.types";
export function unwrapMath(value: string) {
  return value.replace(/^\\[([]/, "").replace(/\\[)\]]$/, "");
}
export function AnswerInput({
  value,
  onChangeText,
  locked = false,
  allowHandwriting = true,
  initialInk,
  onInkChange,
  onConfirmed,
}: {
  value: string;
  onChangeText: (value: string) => void;
  locked?: boolean;
  allowHandwriting?: boolean;
  initialInk?: Ink;
  onInkChange?: (ink: Ink) => void;
  onConfirmed?: (original: string, confirmed: string) => void;
}) {
  const themeColors = useThemeColors();
  const [mode, setMode] = useState<"text" | "editor" | "draw">("text");
  const ink = useRef<Ink | undefined>(initialInk);
  const transcription = useRef("");
  const previewStarted = useRef(0);
  const [preview, setPreview] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const request = useRef<AbortController | null>(null);
  const revision = useRef(0);
  const { user } = useAuth();
  function cancel() {
    request.current?.abort();
    request.current = null;
    setBusy(false);
  }
  useEffect(() => () => request.current?.abort(), [user?.id]);
  useEffect(() => {
    if (locked) cancel();
  }, [locked]);
  function handleMessage(event: SurfaceMessage) {
    if (event.type === "change" && !locked)
      onChangeText(`\\(${event.value}\\)`);
    if (event.type === "inkChanged") {
      revision.current = event.revision;
      ink.current = event.ink;
      onInkChange?.(event.ink);
      cancel();
      setPreview("");
      setPreviewOpen(false);
      setMessage("");
    }
    if (event.type === "recognize" && !locked) {
      cancel();
      const controller = new AbortController();
      request.current = controller;
      const startedRevision = event.revision;
      setBusy(true);
      setPreview("");
      setPreviewOpen(false);
      setMessage(
        `Prepared drawing in ${Math.round(event.preparationMs)}ms. Waiting for recognition service…`,
      );
      const timer = setTimeout(() => controller.abort(), 45000);
      void recognizeMath(event.image, controller.signal)
        .then((result) => {
          if (
            controller.signal.aborted ||
            request.current !== controller ||
            revision.current !== startedRevision
          )
            return;
          setMessage(
            result.unreadable
              ? "Could not read this expression. Adjust your drawing and try again."
              : result.cached
                ? `Reused recognition from ${result.provider} · ${result.model}. Check before using it.`
                : `Recognized with ${result.provider} · ${result.model}. ${result.networkMs ?? 0}ms round trip; auth ${result.timings?.authMs ?? 0}ms, provider ${result.timings?.upstreamMs ?? 0}ms. Check before using it.`,
          );
          if (!result.unreadable) {
            transcription.current = result.latex;
            previewStarted.current = Date.now();
            setPreviewReady(false);
            setPreview(result.latex);
            setPreviewOpen(true);
          }
        })
        .catch((error) => {
          if (request.current === controller)
            setMessage(
              controller.signal.aborted
                ? "Recognition stopped. Your drawing is preserved."
                : error instanceof Error
                  ? error.message
                  : "Recognition failed.",
            );
        })
        .finally(() => {
          clearTimeout(timer);
          if (request.current === controller) {
            request.current = null;
            setBusy(false);
          }
        });
    }
  }
  if (locked)
    return (
      <View className="gap-2">
        <Text className="text-sm text-ink-700 dark:text-ink-100">
          Your answer
        </Text>
        <MathContent className="text-base text-ink-900 dark:text-white">
          {value}
        </MathContent>
      </View>
    );
  return (
    <View className="gap-3">
      <View className="flex-row flex-wrap gap-2">
        {(
          ["text", "editor", ...(allowHandwriting ? ["draw"] : [])] as const
        ).map((item) => (
          <PrimaryButton
            key={item}
            disabled={locked}
            label={
              item === "editor"
                ? "Math"
                : item === "draw"
                  ? "Handwrite"
                  : "Text"
            }
            variant={mode === item ? "primary" : "secondary"}
            onPress={() => {
              cancel();
              setMode(item as typeof mode);
              setPreview("");
              setPreviewOpen(false);
              setMessage("");
            }}
          />
        ))}
      </View>
      {mode === "text" ? (
        <TextInput
          accessibilityLabel="Answer"
          editable={!locked}
          multiline
          value={value}
          onChangeText={onChangeText}
          placeholder="Type your answer…"
          placeholderTextColor={themeColors.mutedForeground}
          className="min-h-28 rounded-2xl border border-ink-200 p-4 text-base text-ink-900 dark:text-white"
        />
      ) : (
        <MathSurface
          config={{
            mode,
            value: mode === "editor" ? unwrapMath(value) : "",
            locked,
            busy,
            ink: ink.current,
          }}
          onMessage={handleMessage}
        />
      )}
      {busy ? (
        <PrimaryButton
          label="Cancel recognition"
          variant="secondary"
          onPress={cancel}
        />
      ) : null}
      {message ? (
        <Text
          accessibilityRole="alert"
          className="text-sm text-ink-700 dark:text-ink-100"
        >
          {message}
        </Text>
      ) : null}
      <Modal
        visible={previewOpen}
        transparent
        animationType="none"
        onRequestClose={() => setPreviewOpen(false)}
      >
        <View
          style={{
            flex: 1,
            padding: 20,
            justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.55)",
          }}
        >
          <View
            style={{
              height: "90%",
              maxWidth: 900,
              width: "100%",
              alignSelf: "center",
              borderRadius: 24,
              padding: 16,
              gap: 12,
            }}
            className="bg-white dark:bg-ink-800"
          >
            <Text className="text-lg font-semibold text-ink-900 dark:text-white">
              Check recognized equation
            </Text>
            <Text className="text-sm text-ink-700 dark:text-ink-100">
              Edit any recognition mistakes before using this answer.
            </Text>
            <ScrollView style={{ flex: 1 }}>
              {previewOpen ? (
                <MathSurface
                  config={{ mode: "editor", value: preview, locked }}
                  onMessage={(event) => {
                    if (event.type === "configured") {
                      setPreviewReady(true);
                      if (previewStarted.current) {
                        const previewMs = Date.now() - previewStarted.current;
                        setMessage(
                          (current) =>
                            `${current} Preview ready in ${previewMs}ms.`,
                        );
                        previewStarted.current = 0;
                      }
                    }
                    if (event.type === "change") setPreview(event.value);
                  }}
                />
              ) : null}
            </ScrollView>
            <View className="flex-row gap-3">
              <PrimaryButton
                className="flex-1"
                label="Keep drawing"
                variant="secondary"
                onPress={() => setPreviewOpen(false)}
              />
              <PrimaryButton
                className="flex-1"
                disabled={locked || !previewReady || !preview.trim()}
                label="Use this equation"
                onPress={() => {
                  onConfirmed?.(transcription.current, preview);
                  onChangeText(`\\(${preview}\\)`);
                  setMode("editor");
                  setPreview("");
                  setPreviewOpen(false);
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
      {mode === "draw" && value ? (
        <View>
          <Text className="text-sm text-ink-700 dark:text-ink-100">
            Current answer
          </Text>
          <MathContent className="text-ink-900 dark:text-white">
            {value}
          </MathContent>
        </View>
      ) : null}
    </View>
  );
}
