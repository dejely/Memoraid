export const DEFAULT_FREE_OPENROUTER_MODEL = "openrouter/free";
export const FREE_OPENROUTER_MODEL_ERROR =
  "OpenRouter supports free models only. Use openrouter/free or an image-capable model ID ending in :free.";

export function isFreeOpenRouterModel(model: string): boolean {
  return model === DEFAULT_FREE_OPENROUTER_MODEL || /^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+:free$/.test(model);
}
