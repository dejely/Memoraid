import type { StudyAiService } from "./types";

export class DisabledStudyAiService implements StudyAiService {
  async generateCardsFromNotes(): Promise<never> {
    throw new Error("AI card generation is disabled. Connect a backend service to enable it.");
  }
}
