import type { CardDraft } from "../../types/models";

export interface StudyAiService {
  generateCardsFromNotes(input: {
    rawText: string;
    title?: string;
    tags?: string[];
  }): Promise<CardDraft[]>;
}
