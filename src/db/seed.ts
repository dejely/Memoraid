import { type SQLiteDatabase } from "expo-sqlite";

import type { DeckDraft } from "../types/models";
import { createDeck } from "./repositories/deck-repository";

const SAMPLE_DECKS: DeckDraft[] = [
  {
    title: "World Geography Essentials",
    description: "Fast refreshers for capitals, climate, and regional landmarks.",
    tags: ["geography", "travel", "seeded"],
    sourceType: "manual",
    cards: [
      {
        term: "Kyoto Protocol",
        definition: "An international treaty focused on reducing greenhouse gas emissions.",
        example: "It was adopted in Kyoto, Japan, in 1997.",
      },
      {
        term: "Andes Mountains",
        definition: "The mountain range running along the western edge of South America.",
        example: "It stretches through countries like Peru, Chile, and Argentina.",
      },
      {
        term: "Canberra",
        definition: "The capital city of Australia.",
        example: "Canberra was selected as a compromise between Sydney and Melbourne.",
      },
      {
        term: "Sahara",
        definition: "The largest hot desert in the world, located in North Africa.",
      },
      {
        term: "Strait of Malacca",
        definition: "A major shipping lane between the Malay Peninsula and Sumatra.",
      },
    ],
  },
  {
    title: "Biology Foundations",
    description: "Short, high-yield cell and genetics notes for quick study blocks.",
    tags: ["biology", "science", "seeded"],
    sourceType: "manual",
    cards: [
      {
        term: "Mitochondria",
        definition: "Organelles that generate ATP through cellular respiration.",
        example: "They are often described as the powerhouse of the cell.",
      },
      {
        term: "Photosynthesis",
        definition: "The process plants use to convert light energy into chemical energy.",
      },
      {
        term: "DNA",
        definition: "A molecule that stores genetic information in living organisms.",
      },
      {
        term: "Homeostasis",
        definition: "The maintenance of a stable internal environment in an organism.",
      },
      {
        term: "Dominant allele",
        definition: "An allele expressed even when only one copy is present.",
      },
    ],
  },
];

export async function seedDatabaseIfNeeded(database: SQLiteDatabase): Promise<void> {
  const deckCountRow = await database.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM decks LIMIT 1;");
  const deckCount = deckCountRow?.count ?? 0;

  if (deckCount > 0) {
    return;
  }

  for (const deck of SAMPLE_DECKS) {
    await createDeck(deck);
  }
}
