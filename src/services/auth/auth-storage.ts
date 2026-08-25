import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export type AuthStorageAdapter = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

type SecureManifest = {
  version: 1;
  generation: string;
  chunks: number;
};

const SECURE_CHUNK_SIZE = 1800;
const browserMemoryFallback = new Map<string, string>();

function stableHash(value: string): string {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

function secureKey(key: string): string {
  const readablePart = key.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 48);
  return `memoraid.auth.${readablePart}.${stableHash(key)}`;
}

function parseManifest(value: string | null): SecureManifest | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<SecureManifest>;

    if (
      parsed.version === 1 &&
      typeof parsed.generation === "string" &&
      typeof parsed.chunks === "number" &&
      parsed.chunks >= 0
    ) {
      return parsed as SecureManifest;
    }
  } catch {
    // A value written before chunking support is treated as the stored value itself.
  }

  return null;
}

async function deleteSecureChunks(baseKey: string, manifest: SecureManifest | null): Promise<void> {
  if (!manifest) {
    return;
  }

  await Promise.all(
    Array.from({ length: manifest.chunks }, (_, index) =>
      SecureStore.deleteItemAsync(`${baseKey}.${manifest.generation}.${index}`),
    ),
  );
}

const nativeSecureStorage: AuthStorageAdapter = {
  async getItem(key) {
    const baseKey = secureKey(key);
    const storedValue = await SecureStore.getItemAsync(baseKey);
    const manifest = parseManifest(storedValue);

    if (!manifest) {
      return storedValue;
    }

    const chunks = await Promise.all(
      Array.from({ length: manifest.chunks }, (_, index) =>
        SecureStore.getItemAsync(`${baseKey}.${manifest.generation}.${index}`),
      ),
    );

    if (chunks.some((chunk) => chunk === null)) {
      return null;
    }

    return chunks.join("");
  },

  async setItem(key, value) {
    const baseKey = secureKey(key);
    const previousManifest = parseManifest(await SecureStore.getItemAsync(baseKey));
    const generation = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    const chunks = Array.from(
      { length: Math.max(1, Math.ceil(value.length / SECURE_CHUNK_SIZE)) },
      (_, index) => value.slice(index * SECURE_CHUNK_SIZE, (index + 1) * SECURE_CHUNK_SIZE),
    );

    await Promise.all(
      chunks.map((chunk, index) =>
        SecureStore.setItemAsync(`${baseKey}.${generation}.${index}`, chunk, {
          keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
        }),
      ),
    );

    await SecureStore.setItemAsync(
      baseKey,
      JSON.stringify({ version: 1, generation, chunks: chunks.length } satisfies SecureManifest),
      { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY },
    );
    await deleteSecureChunks(baseKey, previousManifest);
  },

  async removeItem(key) {
    const baseKey = secureKey(key);
    const manifest = parseManifest(await SecureStore.getItemAsync(baseKey));
    await SecureStore.deleteItemAsync(baseKey);
    await deleteSecureChunks(baseKey, manifest);
  },
};

function getBrowserStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

const browserStorage: AuthStorageAdapter = {
  async getItem(key) {
    try {
      return getBrowserStorage()?.getItem(key) ?? browserMemoryFallback.get(key) ?? null;
    } catch {
      return browserMemoryFallback.get(key) ?? null;
    }
  },

  async setItem(key, value) {
    browserMemoryFallback.set(key, value);

    try {
      getBrowserStorage()?.setItem(key, value);
    } catch {
      // The in-memory fallback still supports the active browser session.
    }
  },

  async removeItem(key) {
    browserMemoryFallback.delete(key);

    try {
      getBrowserStorage()?.removeItem(key);
    } catch {
      // Nothing else to clear when browser storage is unavailable.
    }
  },
};

export const authStorage = Platform.OS === "web" ? browserStorage : nativeSecureStorage;
