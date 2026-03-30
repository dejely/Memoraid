import { DisabledStudyAiService } from "../ai/disabled-study-ai-service";
import type { StudyAiService } from "../ai/types";
import type { ImportPreview } from "../../types/models";
import { LocalNoteParser, type NoteParser } from "./note-parser";

type PreviewInput = {
  title: string;
  description: string;
  tags: string[];
  rawText: string;
  sourceLabel: string;
  useAi?: boolean;
};

export class StudyImportService {
  constructor(
    private readonly parser: NoteParser = new LocalNoteParser(),
    private readonly aiService: StudyAiService = new DisabledStudyAiService(),
  ) {}

  async preview(input: PreviewInput): Promise<ImportPreview> {
    if (input.useAi) {
      const cards = await this.aiService.generateCardsFromNotes({
        rawText: input.rawText,
        title: input.title,
        tags: input.tags,
      });

      return {
        title: input.title,
        description: input.description,
        tags: input.tags,
        cards,
        warnings: [],
        sourceLabel: `${input.sourceLabel} · AI`,
      };
    }

    return this.parser.parse(input);
  }
}

export const studyImportService = new StudyImportService();
