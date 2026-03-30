import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import { File } from "expo-file-system";
import { useState } from "react";
import { Alert, Text, View } from "react-native";

import { AppScreen } from "../components/AppScreen";
import { EmptyState } from "../components/EmptyState";
import { FormField } from "../components/FormField";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenHeader } from "../components/ScreenHeader";
import { SectionCard } from "../components/SectionCard";
import { useCreateImportedDeckMutation, useImportPreviewMutation } from "../features/import/hooks";
import { splitTags } from "../utils/text";

function stripExtension(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "");
}

export default function ImportScreen() {
  const previewMutation = useImportPreviewMutation();
  const createImportedDeckMutation = useCreateImportedDeckMutation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagsValue, setTagsValue] = useState("");
  const [rawText, setRawText] = useState("");
  const [sourceLabel, setSourceLabel] = useState("Pasted notes");

  async function handlePickDocument(): Promise<void> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["text/plain", "text/markdown", "text/*"],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const asset = result.assets[0];
      const file = new File(asset.uri);
      const contents = await file.text();

      setRawText(contents);
      setSourceLabel(asset.name);

      if (!title.trim()) {
        setTitle(stripExtension(asset.name));
      }
    } catch (error) {
      Alert.alert("Import failed", error instanceof Error ? error.message : "The selected file could not be read.");
    }
  }

  async function handlePreview(): Promise<void> {
    if (!rawText.trim()) {
      Alert.alert("Add notes first", "Paste notes or pick a text file before generating a preview.");
      return;
    }

    await previewMutation.mutateAsync({
      title: title.trim() || "Imported Notes",
      description,
      tags: splitTags(tagsValue),
      rawText,
      sourceLabel,
    });
  }

  async function handleCreateSet(): Promise<void> {
    if (!previewMutation.data || previewMutation.data.cards.length === 0) {
      Alert.alert("No cards to save", "Generate a preview with at least one parsed flashcard first.");
      return;
    }

    const deckId = await createImportedDeckMutation.mutateAsync({
      title: previewMutation.data.title,
      description: previewMutation.data.description,
      tags: previewMutation.data.tags,
      cards: previewMutation.data.cards,
      sourceType: "imported",
    });

    router.replace(`/sets/${deckId}`);
  }

  return (
    <AppScreen>
      <ScreenHeader
        eyebrow="Modular import"
        title="Import notes"
        subtitle="Use a local parser now, and keep the AI path behind a backend interface for a later build."
      />

      <SectionCard className="gap-4">
        <Text className="text-sm leading-6 text-ink-600 dark:text-ink-200">
          Supported line formats include `term: definition`, `term - definition`, `term::definition`, or tab-separated notes. Add `Example: ...` on the next line to attach an example to the previous card.
        </Text>
        <PrimaryButton label="Pick a text file" variant="secondary" onPress={handlePickDocument} />
      </SectionCard>

      <FormField label="Set title" value={title} onChangeText={setTitle} placeholder="Organic chemistry review" />
      <FormField label="Description" value={description} onChangeText={setDescription} placeholder="Short context for this import" multiline />
      <FormField label="Tags" value={tagsValue} onChangeText={setTagsValue} placeholder="exam prep, semester 2, notes" />
      <FormField
        label="Paste notes"
        value={rawText}
        onChangeText={setRawText}
        placeholder={"osmosis: movement of water across a membrane\nExample: Water moves toward higher solute concentration"}
        multiline
      />

      <PrimaryButton label="Preview cards" loading={previewMutation.isPending} onPress={handlePreview} />

      {previewMutation.data ? (
        <View className="gap-3">
          <SectionCard className="gap-3">
            <Text className="text-xs font-medium uppercase tracking-[2px] text-sea-700 dark:text-sea-300">{previewMutation.data.sourceLabel}</Text>
            <Text className="text-2xl font-semibold text-ink-900 dark:text-white">{previewMutation.data.cards.length} cards ready</Text>
            <Text className="text-sm text-ink-600 dark:text-ink-200">Warnings: {previewMutation.data.warnings.length}</Text>
            <PrimaryButton
              label="Create imported set"
              loading={createImportedDeckMutation.isPending}
              onPress={handleCreateSet}
            />
          </SectionCard>

          {previewMutation.data.warnings.length > 0 ? (
            <SectionCard className="gap-2">
              <Text className="text-lg font-semibold text-ink-900 dark:text-white">Parser warnings</Text>
              {previewMutation.data.warnings.slice(0, 6).map((warning) => (
                <Text key={warning} className="text-sm leading-6 text-ink-600 dark:text-ink-200">
                  {warning}
                </Text>
              ))}
            </SectionCard>
          ) : null}

          {previewMutation.data.cards.map((card, index) => (
            <SectionCard key={`${card.term}-${index}`} className="gap-3">
              <Text className="text-xs font-medium uppercase tracking-[2px] text-sea-700 dark:text-sea-300">Card {index + 1}</Text>
              <Text className="text-xl font-semibold text-ink-900 dark:text-white">{card.term}</Text>
              <Text className="text-sm leading-6 text-ink-600 dark:text-ink-200">{card.definition}</Text>
              {card.example ? <Text className="text-sm leading-6 text-ink-500 dark:text-ink-300">Example: {card.example}</Text> : null}
            </SectionCard>
          ))}
        </View>
      ) : (
        <EmptyState title="No preview yet" message="Import a file or paste raw notes, then generate a preview before saving the set." />
      )}
    </AppScreen>
  );
}
