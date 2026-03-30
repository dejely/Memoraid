export function shuffleList<T>(items: T[]): T[] {
  const clone = [...items];

  for (let index = clone.length - 1; index > 0; index -= 1) {
    const targetIndex = Math.floor(Math.random() * (index + 1));
    const nextValue = clone[index];

    clone[index] = clone[targetIndex];
    clone[targetIndex] = nextValue;
  }

  return clone;
}

export function uniqueValues<T>(items: T[]): T[] {
  return [...new Set(items)];
}
