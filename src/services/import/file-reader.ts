import { File } from "expo-file-system";

export async function readPickedTextFile(uri: string): Promise<string> {
  return new File(uri).text();
}

