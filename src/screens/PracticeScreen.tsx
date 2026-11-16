import { studyStore } from "../db/local/store";
import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { AppScreen } from "../components/AppScreen";
import { ScreenHeader } from "../components/ScreenHeader";
import { SectionCard } from "../components/SectionCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { AnswerInput } from "../components/math/AnswerInput";
import { MathContent } from "../components/math/MathContent";
import { MathSurface } from "../components/math/MathSurface";
import { FormField } from "../components/FormField";
import { useDecks } from "../features/sets/hooks";
import { getDeckById } from "../db/local/library";
import { gradeMath, type GradingMethod } from "../services/math/grading";
import {
  concepts,
  statisticsProblem,
  weakConcept,
  type StatisticsConcept,
} from "../features/practice/statistics";
import {
  loadPracticeDraft,
  savePracticeDraft,
  newPracticeDraft,
  finishPractice,
  practiceAttempts,
  correctAttempt,
  loadInk,
  type PracticeDraft,
  type PracticeAttempt,
} from "../features/practice/repository";
import type { Ink } from "../features/practice/ink";
export default function PracticeScreen() {
  const decks = useDecks(),
    attempts = useQuery({
      queryKey: ["practice", "attempts"],
      queryFn: practiceAttempts,
    });
  const [draft, setDraft] = useState<PracticeDraft>(),
    [ready, setReady] = useState(false),
    [tab, setTab] = useState<"practice" | "notebook">("practice");
  const [concept, setConcept] = useState<StatisticsConcept>("mean"),
    [feedback, setFeedback] = useState(""),
    [needsReview, setNeedsReview] = useState(false),
    [busy, setBusy] = useState(false);
  const store = useRef(studyStore()).current;
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const current = useRef<PracticeDraft | undefined>(undefined);
  const saves = useRef<Promise<unknown>>(Promise.resolve());
  const [result, setResult] = useState(false);
  useEffect(() => {
    let active = true;
    void loadPracticeDraft(store)
      .then((d) => {
        if (active) {
          current.current = d;
          setDraft(d);
          setReady(true);
        }
      })
      .catch((e) => setFeedback(e.message));
    return () => {
      active = false;
      clearTimeout(saveTimer.current);
      const pending = current.current;
      if (pending) void savePracticeDraft(pending, store).catch(() => {});
    };
  }, []);
  function change(next: PracticeDraft) {
    current.current = next;
    setDraft(next);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saves.current = saves.current
        .then(() => savePracticeDraft(next, store))
        .catch(() =>
          setFeedback(
            "Your draft could not be saved. Check device storage and retry.",
          ),
        );
    }, 200);
  }
  function start(next: PracticeDraft) {
    setResult(false);
    setFeedback("");
    setNeedsReview(false);
    change(next);
  }
  function generated(selected = concept) {
    start(
      newPracticeDraft(
        statisticsProblem(selected, Math.floor(Math.random() * 0xffffffff)),
      ),
    );
  }
  async function fromDeck(id: string) {
    setBusy(true);
    try {
      const deck = await getDeckById(id);
      if (!deck?.cards.length) return;
      const cards = [...deck.cards].sort((a, b) =>
        (a.reviewStats?.dueAt ?? "").localeCompare(b.reviewStats?.dueAt ?? ""),
      );
      const card = cards[0];
      start(
        newPracticeDraft({
          id: card.id,
          cardId: card.id,
          deckId: id,
          concept: deck.tags[0] ?? "written",
          prompt: card.term,
          expected: card.definition,
          mode: card.gradingMode ?? "self_review",
          tolerance: card.numericTolerance ?? 0.001,
          explanation: card.example ?? "",
        }),
      );
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : "Could not open set.");
    } finally {
      setBusy(false);
    }
  }
  async function complete(correct: boolean, method: GradingMethod) {
    const snapshot = current.current;
    if (!snapshot) return;
    setBusy(true);
    try {
      clearTimeout(saveTimer.current);
      await saves.current;
      await finishPractice(snapshot, correct, method, store);
      current.current = undefined;
      setResult(true);
      setNeedsReview(false);
      setFeedback(
        correct ? "Correct. Attempt saved." : "Saved to your mistake notebook.",
      );
      void attempts.refetch();
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : "Could not save attempt.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <AppScreen>
      <ScreenHeader
        title="Practice"
        subtitle="Write, confirm, then check your answer. Drafts and strokes save on this device."
      />
      <View className="flex-row gap-2">
        <PrimaryButton
          label="Practice"
          variant={tab === "practice" ? "primary" : "secondary"}
          onPress={() => setTab("practice")}
        />
        <PrimaryButton
          label="Mistake notebook"
          variant={tab === "notebook" ? "primary" : "secondary"}
          onPress={() => setTab("notebook")}
        />
      </View>
      {tab === "notebook" ? (
        <>
          <Text className="text-ink-700 dark:text-ink-100">
            Review confirmed answers and add your own correction. Recognition
            errors do not identify a misconception.
          </Text>
          {attempts.data
            ?.filter((a) => !a.isCorrect)
            .map((a) => (
              <NotebookEntry
                key={a.id}
                attempt={a}
                onSave={() => void attempts.refetch()}
              />
            ))}
          {!attempts.data?.some((a) => !a.isCorrect) ? (
            <Text className="text-ink-700 dark:text-ink-100">
              No mistakes saved yet.
            </Text>
          ) : null}
        </>
      ) : (
        <>
          <SectionCard className="gap-3">
            <Text className="text-lg font-semibold text-ink-900 dark:text-white">
              Core statistics
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {concepts.map((c) => (
                <PrimaryButton
                  key={c}
                  label={c.replaceAll("_", " ")}
                  variant={concept === c ? "primary" : "secondary"}
                  onPress={() => setConcept(c)}
                />
              ))}
            </View>
            <PrimaryButton
              label="New statistics problem"
              disabled={!ready || busy}
              onPress={() => generated()}
            />
            <PrimaryButton
              label="Practice a weak concept"
              variant="secondary"
              disabled={!ready || busy}
              onPress={() => {
                const c = weakConcept(
                  (attempts.data ?? []).map((a) => ({
                    concept: a.problem.concept,
                    isCorrect: a.isCorrect,
                    createdAt: a.createdAt,
                  })),
                );
                setConcept(c);
                generated(c);
              }}
            />
          </SectionCard>
          <SectionCard className="gap-3">
            <Text className="text-lg font-semibold text-ink-900 dark:text-white">
              Your written cards · due first
            </Text>
            {decks.data?.map((d) => (
              <PrimaryButton
                key={d.id}
                label={`${d.title} · ${d.dueCount} due`}
                variant="secondary"
                disabled={!ready || busy}
                onPress={() => void fromDeck(d.id)}
              />
            ))}
            {!decks.data?.length ? (
              <Text className="text-ink-700 dark:text-ink-100">
                Create or import a study set to practice its written cards.
              </Text>
            ) : null}
          </SectionCard>
          {draft ? (
            <SectionCard className="gap-4">
              <Text className="text-sm text-ink-600 dark:text-ink-200">
                {draft.problem.concept.replaceAll("_", " ")} ·{" "}
                {draft.problem.mode === "numeric"
                  ? "Tolerance ±0.001"
                  : "Confirm your answer before grading"}
              </Text>
              <MathContent>{draft.problem.prompt}</MathContent>
              <AnswerInput
                key={draft.id}
                value={draft.answer}
                locked={result}
                initialInk={draft.ink}
                onChangeText={(answer) => {
                  if (current.current) change({ ...current.current, answer });
                }}
                onInkChange={(ink) => {
                  if (current.current) change({ ...current.current, ink });
                }}
                onConfirmed={(originalRecognition, confirmedRecognition) => {
                  if (current.current)
                    change({
                      ...current.current,
                      originalRecognition,
                      confirmedRecognition,
                    });
                }}
              />
              {!result && !needsReview ? (
                <PrimaryButton
                  label="Check answer"
                  disabled={busy || !draft.answer.trim()}
                  onPress={() => {
                    const correct = gradeMath(
                      draft.answer,
                      draft.problem.expected,
                      draft.problem.mode,
                      draft.problem.tolerance,
                    );
                    if (correct === null) {
                      setNeedsReview(true);
                      setFeedback(
                        "Compare your confirmed answer, then rate it yourself.",
                      );
                    } else void complete(correct, "automatic");
                  }}
                />
              ) : null}
              {needsReview || result ? (
                <>
                  <Text className="text-sm text-ink-700 dark:text-ink-100">
                    Expected answer
                  </Text>
                  <MathContent>{draft.problem.expected}</MathContent>
                  <MathContent>{draft.problem.explanation}</MathContent>
                </>
              ) : null}
              {needsReview ? (
                <View className="flex-row gap-2">
                  <PrimaryButton
                    label="I was correct"
                    disabled={busy}
                    onPress={() => void complete(true, "self_review")}
                  />
                  <PrimaryButton
                    label="I need practice"
                    variant="secondary"
                    disabled={busy}
                    onPress={() => void complete(false, "self_review")}
                  />
                </View>
              ) : null}
              {result ? (
                <PrimaryButton
                  label="Practice again"
                  onPress={() => start(newPracticeDraft(draft.problem))}
                />
              ) : null}
            </SectionCard>
          ) : null}
        </>
      )}
      {feedback ? (
        <Text
          accessibilityRole="alert"
          className="text-ink-900 dark:text-white"
        >
          {feedback}
        </Text>
      ) : null}
    </AppScreen>
  );
}
function NotebookEntry({
  attempt,
  onSave,
}: {
  attempt: PracticeAttempt;
  onSave: () => void;
}) {
  const [correction, setCorrection] = useState(attempt.correction ?? ""),
    [ink, setInk] = useState<Ink>(),
    [message, setMessage] = useState("");
  return (
    <SectionCard className="gap-3">
      <MathContent>{attempt.problem.prompt}</MathContent>
      <Text className="text-sm text-ink-700 dark:text-ink-100">
        {attempt.method === "automatic"
          ? "Automatically graded"
          : "Self-reviewed"}{" "}
        · {new Date(attempt.createdAt).toLocaleDateString()}
      </Text>
      {attempt.originalRecognition ? (
        <>
          <Text className="text-ink-700 dark:text-ink-100">
            Original transcription
          </Text>
          <MathContent>{`\\(${attempt.originalRecognition}\\)`}</MathContent>
        </>
      ) : null}
      <Text className="text-ink-700 dark:text-ink-100">Confirmed answer</Text>
      <MathContent>{attempt.answer}</MathContent>
      <Text className="text-ink-700 dark:text-ink-100">Expected answer</Text>
      <MathContent>{attempt.problem.expected}</MathContent>
      <MathContent>{attempt.problem.explanation}</MathContent>
      <FormField
        label="My correction / working"
        multiline
        value={correction}
        onChangeText={setCorrection}
      />
      <PrimaryButton
        label="Save correction"
        onPress={() => {
          void correctAttempt(attempt, correction)
            .then(() => {
              setMessage("Correction saved.");
              onSave();
            })
            .catch(() => setMessage("Could not save correction."));
        }}
      />
      {attempt.inkId && !ink ? (
        <PrimaryButton
          label="Show strokes and replay"
          variant="secondary"
          onPress={() => {
            void loadInk(attempt.inkId!).then((value) => {
              setInk(value);
              if (!value)
                setMessage("Strokes are not available on this device.");
            });
          }}
        />
      ) : null}
      {ink ? (
        <MathSurface config={{ mode: "draw", value: "", ink, locked: true }} />
      ) : null}
      {message ? (
        <Text className="text-ink-700 dark:text-ink-100">{message}</Text>
      ) : null}
    </SectionCard>
  );
}
