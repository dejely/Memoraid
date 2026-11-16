import { exportRecognitionReport } from "../services/recognition/export-report";
import { useEffect, useState } from "react";
import { Platform, Switch, Text, View } from "react-native";
import { studyStore } from "../db/local/store";
import { createId } from "../utils/ids";
import type { Ink } from "../features/practice/ink";
import {
  trainSymbols,
  predictSymbol,
  benchmarkLocal,
  assessLocalReports,
  type LabeledInk,
  type LocalReport,
} from "../services/recognition/local-symbols";
import { MathSurface } from "./math/MathSurface";
import { FormField } from "./FormField";
import { PrimaryButton } from "./PrimaryButton";
import { SectionCard } from "./SectionCard";
export function LocalRecognitionLab() {
  const [open, setOpen] = useState(false),
    [samples, setSamples] = useState<LabeledInk[]>([]),
    [ink, setInk] = useState<Ink>(),
    [label, setLabel] = useState(""),
    [message, setMessage] = useState(""),
    [stylus, setStylus] = useState(false),
    [memory, setMemory] = useState(""),
    [reports, setReports] = useState<LocalReport[]>([]);
  useEffect(() => {
    void studyStore()
      .transaction(async (tx) => ({
        samples: (await tx.get<LabeledInk[]>("meta", "symbolSamples")) ?? [],
        reports: (await tx.get<LocalReport[]>("meta", "symbolReports")) ?? [],
      }))
      .then((v) => {
        setSamples(v.samples);
        setReports(v.reports);
      });
  }, []);
  async function save(split: LabeledInk["split"]) {
    if (!ink?.strokes.length || !label.trim()) return;
    const next = [
      ...samples,
      {
        id: createId("sample"),
        label: label.trim(),
        ink,
        split,
        source: stylus ? "stylus" : "synthetic",
      } as LabeledInk,
    ];
    try {
      await studyStore().transaction((tx) =>
        tx.set("meta", "symbolSamples", next),
      );
      setSamples(next);
      setInk(undefined);
      setMessage(
        "Sample saved locally. Draw a new sample for the other split.",
      );
    } catch {
      setMessage("Could not save sample.");
    }
  }
  const gate = assessLocalReports(reports);
  return (
    <SectionCard className="gap-3">
      <PrimaryButton
        label={
          open
            ? "Close local recognition lab"
            : "Experimental local recognition lab"
        }
        variant="secondary"
        onPress={() => setOpen(!open)}
      />
      {open ? (
        <>
          <Text className="text-ink-700 dark:text-ink-100">
            Isolated-symbol prototype. It learns only from your labeled training
            samples. Held-out samples are used only for evaluation. Regular
            recognition continues using your configured providers.
          </Text>
          <MathSurface
            key={samples.length}
            config={{ mode: "draw", value: "" }}
            onMessage={(e) => {
              if (e.type === "inkChanged") setInk(e.ink);
            }}
          />
          <FormField
            label="Symbol label (LaTeX)"
            value={label}
            onChangeText={setLabel}
          />
          <View className="flex-row gap-3 items-center">
            <Switch value={stylus} onValueChange={setStylus} />
            <Text className="text-ink-900 dark:text-white">
              I drew this with a stylus on physical hardware
            </Text>
          </View>
          <View className="flex-row flex-wrap gap-2">
            <PrimaryButton
              label="Save training sample"
              disabled={!ink?.strokes.length || !label.trim()}
              onPress={() => void save("training")}
            />
            <PrimaryButton
              label="Save held-out sample"
              disabled={!ink?.strokes.length || !label.trim()}
              variant="secondary"
              onPress={() => void save("heldout")}
            />
          </View>
          <PrimaryButton
            label="Test local symbol"
            disabled={!ink?.strokes.length}
            onPress={() => {
              try {
                setMessage(
                  predictSymbol(trainSymbols(samples), ink!)
                    .map(
                      (c) => `${c.latex} (distance ${c.distance.toFixed(3)})`,
                    )
                    .join(" · ") || "Add training samples first.",
                );
              } catch (e) {
                setMessage(String(e));
              }
            }}
          />
          <Text className="text-sm text-ink-700 dark:text-ink-100">
            {samples.filter((s) => s.split === "training").length} training ·{" "}
            {samples.filter((s) => s.split === "heldout").length} held-out
            samples. Chromium web and a physical Android tablet both need a
            passing report.
          </Text>
          <FormField
            label="Measured additional memory in MB (leave blank if unmeasured)"
            value={memory}
            onChangeText={setMemory}
          />
          <PrimaryButton
            label="Benchmark held-out samples"
            onPress={() => {
              try {
                const device: LocalReport["device"] =
                  Platform.OS === "android"
                    ? "android-physical"
                    : Platform.OS === "web" &&
                        /Chrome|Chromium/.test(navigator.userAgent)
                      ? "chromium"
                      : "other";
                const extra =
                  memory.trim() && Number.isFinite(Number(memory))
                    ? Number(memory)
                    : null;
                const report = benchmarkLocal(samples, device, stylus, extra);
                const next = [
                  ...reports.filter((r) => r.device !== device),
                  report,
                ];
                setReports(next);
                void studyStore().transaction((tx) =>
                  tx.set("meta", "symbolReports", next),
                );
                setMessage(JSON.stringify(report));
              } catch (e) {
                setMessage(
                  e instanceof Error ? e.message : "Benchmark failed.",
                );
              }
            }}
          />
          <PrimaryButton
            label="Share local dataset and reports"
            variant="secondary"
            onPress={() =>
              void exportRecognitionReport({
                version: 1,
                samples,
                reports,
              }).catch(() => setMessage("Export failed. Try another app."))
            }
          />
          <Text className="text-sm text-ink-700 dark:text-ink-100">
            {gate.promotable
              ? "Numerical gates passed. Review dataset provenance before promotion."
              : "Experimental: " + gate.reasons.join("; ")}
          </Text>
          {message ? (
            <Text selectable className="text-sm text-ink-900 dark:text-white">
              {message}
            </Text>
          ) : null}
        </>
      ) : null}
    </SectionCard>
  );
}
