import type { CardDraft, ImportPreview } from "../../types/models";

export interface NoteParser {
  parse(input: {
    title: string;
    description: string;
    tags: string[];
    rawText: string;
    sourceLabel: string;
  }): Promise<ImportPreview>;
}

function parseLine(line: string): CardDraft | null {
  const tabParts = line.split("\t").map((part) => part.trim());

  if (tabParts.length >= 2) {
    return {
      term: tabParts[0],
      definition: tabParts[1],
      example: tabParts[2],
    };
  }

  const separators = ["::", " - ", " — ", ": "];

  for (const separator of separators) {
    if (!line.includes(separator)) {
      continue;
    }

    const [term, ...definitionParts] = line.split(separator);
    const definition = definitionParts.join(separator).trim();

    if (term.trim() && definition) {
      return {
        term: term.trim(),
        definition,
      };
    }
  }

  return null;
}

export class LocalNoteParser implements NoteParser {
  async parse(input: {
    title: string;
    description: string;
    tags: string[];
    rawText: string;
    sourceLabel: string;
  }): Promise<ImportPreview> {
    const warnings: string[] = [];
    const cards: CardDraft[] = [];
    let lastCard: CardDraft | null = null;

    for (const rawLine of input.rawText.split(/\r?\n/)) {
      const line = rawLine.trim();

      if (!line) {
        lastCard = null;
        continue;
      }

      if (/^example\s*:/i.test(line) && lastCard) {
        lastCard.example = line.replace(/^example\s*:/i, "").trim();
        continue;
      }

      const parsed = parseLine(line);

      if (!parsed) {
        warnings.push(`Skipped line: "${line}"`);
        continue;
      }

      cards.push(parsed);
      lastCard = parsed;
    }

    return {
      title: input.title.trim(),
      description: input.description.trim(),
      tags: input.tags,
      cards,
      warnings,
      sourceLabel: input.sourceLabel,
    };
  }
}
