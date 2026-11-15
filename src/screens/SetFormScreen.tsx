import { AnswerInput } from "../components/math/AnswerInput";
import { MathContent } from "../components/math/MathContent";
import { stripMath, type GradingMode } from "../services/math/grading";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";

import { AppScreen } from "../components/AppScreen";
import { DataErrorState } from "../components/DataErrorState";
import { FormField } from "../components/FormField";
import { LoadingState } from "../components/LoadingState";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenHeader } from "../components/ScreenHeader";
import { SectionCard } from "../components/SectionCard";
import { useCreateDeckMutation, useDeck, useUpdateDeckMutation } from "../features/sets/hooks";
import { createId } from "../utils/ids";
import { joinTags, splitTags } from "../utils/text";

type EditableCard = {
  key: string;
  id?: string;
  term: string;
  definition: string;
  example: string;
  gradingMode: GradingMode;
  numericTolerance: string;
};

function createBlankCard(): EditableCard {
  return {
    key: createId("draft"),
    term: "",
    definition: "",
    example: "",
    gradingMode: "self_review",
    numericTolerance: "0.001",
  };
}

export default function SetFormScreen({ deckId }: { deckId?: string }) {
  const isEditing = Boolean(deckId);
  const deckQuery = useDeck(deckId ?? "");
  const createDeckMutation = useCreateDeckMutation();
  const updateDeckMutation = useUpdateDeckMutation(deckId ?? "");

  const [saveError, setSaveError] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagsValue, setTagsValue] = useState("");
  const [cards, setCards] = useState<EditableCard[]>([createBlankCard(), createBlankCard(), createBlankCard()]);

  useEffect(() => {
    if (!deckQuery.data) {
      return;
    }

    setTitle(deckQuery.data.title);
    setDescription(deckQuery.data.description);
    setTagsValue(joinTags(deckQuery.data.tags));
    setCards(
      deckQuery.data.cards.map((card) => ({
        key: createId("draft"),
        id: card.id,
        term: card.term,
        definition: card.definition,
        example: card.example ?? "",
        gradingMode: card.gradingMode ?? "self_review",
        numericTolerance: String(card.numericTolerance ?? 0.001),
      })),
    );
  }, [deckQuery.data]);

  const validCardCount = useMemo(
    () => cards.filter((card) => stripMath(card.term) && stripMath(card.definition)).length,
    [cards],
  );

  function updateCard(key: string, field: keyof EditableCard, value: string) {
    setCards((currentCards) => currentCards.map((card) => (card.key === key ? { ...card, [field]: value } : card)));
  }

  function removeCard(key: string) {
    if (cards.length <= 1) {
      return;
    }

    setCards((currentCards) => currentCards.filter((card) => card.key !== key));
  }

  async function handleSave(): Promise<void> {
    if (!title.trim()) {
      setSaveError("Add a title for this study set.");
      return;
    }

    if (validCardCount === 0) {
      setSaveError("Add at least one term and definition before saving.");
      return;
    }

    if (
      cards.some(
        (card) =>
          card.gradingMode === "numeric" &&
          (!card.numericTolerance.trim() ||
            !Number.isFinite(Number(card.numericTolerance)) ||
            Number(card.numericTolerance) < 0),
      )
    ) {
      setSaveError("Enter a nonnegative numeric tolerance.");
      return;
    }

    setSaveError("");
    const payload = {
      title: title.trim(),
      description: description.trim(),
      tags: splitTags(tagsValue),
      cards: cards.map((card) => ({
        id: card.id,
        term: card.term,
        definition: card.definition,
        example: card.example,
        gradingMode: card.gradingMode,
        numericTolerance:
          Number.isFinite(Number(card.numericTolerance)) && Number(card.numericTolerance) >= 0
            ? Number(card.numericTolerance)
            : 0.001,
      })),
    };

    if (isEditing && deckId) {
      await updateDeckMutation.mutateAsync(payload);
      router.replace(`/sets/${deckId}`);
      return;
    }

    const createdDeckId = await createDeckMutation.mutateAsync(payload);
    router.replace(`/sets/${createdDeckId}`);
  }

  if (isEditing && deckQuery.isLoading) {
    return <LoadingState message="Loading set details for editing..." />;
  }

  if (isEditing && deckQuery.isError) {
    return <DataErrorState onRetry={() => void deckQuery.refetch()} />;
  }

  return (
    <AppScreen>
      <ScreenHeader
        eyebrow={isEditing ? "Edit set" : "Create set"}
        title={isEditing ? "Refine your study set" : "Build a new study set"}
        subtitle="Keep cards lightweight and specific so flashcard and test generation stay clean."
      />

      <FormField label="Title" value={title} onChangeText={setTitle} placeholder="Modern European History" />
      <FormField
        label="Description"
        value={description}
        onChangeText={setDescription}
        placeholder="What this set covers"
        multiline
      />
      <FormField
        label="Tags"
        value={tagsValue}
        onChangeText={setTagsValue}
        placeholder="midterm, lecture 5, memorization"
      />

      <SectionCard className="gap-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-lg font-semibold text-ink-900 dark:text-white">Cards</Text>
          <View className="rounded-full bg-sea-50 px-3 py-2 dark:bg-sea-800/50">
            <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-sea-800 dark:text-sea-100">
              {validCardCount} ready
            </Text>
          </View>
        </View>

        {cards.map((card, index) => (
          <SectionCard
            key={card.key}
            className="gap-3 border border-ink-100 bg-ink-50 dark:border-ink-700 dark:bg-ink-900/60"
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-semibold uppercase tracking-[1.5px] text-ink-600 dark:text-ink-200">
                Card {index + 1}
              </Text>
              <PrimaryButton
                label="Remove"
                variant="ghost"
                className="min-h-0 px-0 py-0"
                onPress={() => removeCard(card.key)}
              />
            </View>
            <Text className="text-sm font-semibold text-ink-700 dark:text-ink-100">Term / question</Text>
            <AnswerInput
              value={card.term}
              onChangeText={(value) => updateCard(card.key, "term", value)}
              allowHandwriting={false}
            />
            <Text className="text-sm font-semibold text-ink-700 dark:text-ink-100">Definition / expected answer</Text>
            <AnswerInput
              value={card.definition}
              onChangeText={(value) => updateCard(card.key, "definition", value)}
              allowHandwriting={false}
            />
            <Text className="text-sm font-semibold text-ink-700 dark:text-ink-100">Example</Text>
            <AnswerInput
              value={card.example}
              onChangeText={(value) => updateCard(card.key, "example", value)}
              allowHandwriting={false}
            />
            <MathContent className="text-ink-900 dark:text-white">{card.definition}</MathContent>
            <Text className="text-sm font-semibold text-ink-700 dark:text-ink-100">Written-answer grading</Text>
            <View className="flex-row flex-wrap gap-2">
              {(["self_review", "numeric", "expression"] as const).map((mode) => (
                <PrimaryButton
                  key={mode}
                  label={mode === "self_review" ? "Self-review" : mode === "numeric" ? "Numeric" : "Expression"}
                  variant={card.gradingMode === mode ? "primary" : "secondary"}
                  onPress={() => updateCard(card.key, "gradingMode", mode)}
                />
              ))}
            </View>
            {card.gradingMode === "numeric" ? (
              <FormField
                label="Absolute tolerance"
                value={card.numericTolerance}
                onChangeText={(value) => updateCard(card.key, "numericTolerance", value)}
              />
            ) : null}
            <Text className="text-xs text-ink-600 dark:text-ink-200">
              Unsupported or indeterminate math falls back to self-review. Use self-review when a particular formula
              form is required.
            </Text>
          </SectionCard>
        ))}

        <PrimaryButton
          label="Add another card"
          variant="secondary"
          onPress={() => setCards((currentCards) => [...currentCards, createBlankCard()])}
        />
      </SectionCard>

      {saveError ? (
        <Text accessibilityRole="alert" className="text-rose-500">
          {saveError}
        </Text>
      ) : null}
      <PrimaryButton
        label={isEditing ? "Save changes" : "Create set"}
        loading={createDeckMutation.isPending || updateDeckMutation.isPending}
        onPress={() =>
          void handleSave().catch(() =>
            setSaveError("Your set could not be saved. Check your connection and try again."),
          )
        }
      />
    </AppScreen>
  );
}
