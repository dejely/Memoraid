export async function readPickedTextFile(uri: string): Promise<string> {
  const response = await fetch(uri);

  if (!response.ok) {
    throw new Error("The selected file could not be read.");
  }

  return response.text();
}

