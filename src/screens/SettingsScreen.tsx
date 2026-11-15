import { useEffect, useState } from "react";
import { Platform, Switch, Text, TextInput, View } from "react-native";
import { AppScreen } from "../components/AppScreen";
import { ScreenHeader } from "../components/ScreenHeader";
import { SectionCard } from "../components/SectionCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { FormField } from "../components/FormField";
import { ThemeToggleButton } from "../components/ThemeToggleButton";
import { useAuth } from "../services/auth/AuthProvider";
import { DEFAULT_AI_SETTINGS, EMPTY_CREDENTIALS, type AiProvider } from "../services/ai/config";
import { loadAiConfiguration, saveAiConfiguration } from "../services/secure/ai-storage";
import { callAiRelay } from "../services/ai/client";

export default function SettingsScreen() {
  const { user } = useAuth();
  const [settings, setSettings] = useState({ ...DEFAULT_AI_SETTINGS });
  const [credentials, setCredentials] = useState({ ...EMPTY_CREDENTIALS });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    setReady(false);
    setCredentials({ ...EMPTY_CREDENTIALS });
    if (user)
      void loadAiConfiguration(user.id)
        .then((config) => {
          if (active) {
            setSettings(config.settings);
            setCredentials(config.credentials);
            setReady(true);
          }
        })
        .catch(() => {
          if (active) setMessage("Settings could not be loaded. Reopen Settings to retry.");
        });
    return () => {
      active = false;
    };
  }, [user?.id]);
  async function save() {
    if (!user) return;
    setBusy(true);
    try {
      await saveAiConfiguration(user.id, settings, {
        gemini: credentials.gemini.trim(),
        openrouter: credentials.openrouter.trim(),
      });
      setMessage("Settings saved on this device.");
    } catch {
      setMessage("Settings could not be saved. Check device storage permissions.");
    } finally {
      setBusy(false);
    }
  }
  async function test(provider: AiProvider) {
    setBusy(true);
    setMessage("");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);
    try {
      const result = await callAiRelay(
        { operation: "testConnection", provider, settings, credentials },
        controller.signal,
      );
      setMessage(`${provider}: connected to ${result.model}. This test may incur a small provider charge.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Connection failed.");
    } finally {
      clearTimeout(timer);
      setBusy(false);
    }
  }
  return (
    <AppScreen>
      <ScreenHeader title="Settings" subtitle="Your math recognition providers" trailing={<ThemeToggleButton />} />
      <SectionCard className="gap-3">
        <Text className="text-base leading-6 text-ink-900 dark:text-white">
          Enter your own API keys. Recognition sends your drawing and credentials through Memoraid’s authenticated relay
          to the selected provider. Keys are never saved on the server. Provider charges may apply.
        </Text>
        <Text className="text-sm text-ink-600 dark:text-ink-200">
          {Platform.OS === "web"
            ? "Keys stay in this tab’s session and clear when you sign out or close it."
            : "Keys are kept in secure storage for this account on this device."}{" "}
          Math entry and self-review work without keys.
        </Text>
      </SectionCard>
      {(["gemini", "openrouter"] as const).map((provider) => (
        <SectionCard key={provider} className="gap-3">
          <Text className="text-lg font-semibold text-ink-900 dark:text-white">
            {provider === "gemini" ? "Gemini · primary" : "OpenRouter · fallback"}
          </Text>
          <TextInput
            accessibilityLabel={`${provider} API key`}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            value={credentials[provider]}
            onChangeText={(value) => setCredentials((current) => ({ ...current, [provider]: value }))}
            placeholder="API key"
            placeholderTextColor="#6f88b7"
            className="rounded-2xl border border-ink-200 p-4 text-ink-900 dark:text-white"
          />
          <FormField
            label="Model ID"
            value={provider === "gemini" ? settings.geminiModel : settings.openrouterModel}
            onChangeText={(value) =>
              setSettings((current) => ({
                ...current,
                [provider === "gemini" ? "geminiModel" : "openrouterModel"]: value.trim(),
              }))
            }
          />
          <View className="flex-row gap-2">
            <PrimaryButton
              label="Test connection"
              disabled={!ready || busy || !credentials[provider].trim()}
              onPress={() => void test(provider)}
            />
            <PrimaryButton
              label="Delete key"
              variant="secondary"
              disabled={!ready || busy}
              onPress={() => {
                if (!user) return;
                const next = { ...credentials, [provider]: "" };
                setCredentials(next);
                setBusy(true);
                void saveAiConfiguration(user.id, settings, next)
                  .then(() => setMessage("Key deleted."))
                  .catch(() => setMessage("Key deletion failed. Try again."))
                  .finally(() => setBusy(false));
              }}
            />
          </View>
        </SectionCard>
      ))}
      <View className="flex-row items-center gap-4">
        <Switch
          accessibilityLabel="Automatic provider fallback"
          value={settings.fallbackEnabled}
          onValueChange={(value) => setSettings((current) => ({ ...current, fallbackEnabled: value }))}
        />
        <Text className="text-ink-900 dark:text-white">Automatic fallback</Text>
      </View>
      <PrimaryButton label="Save settings" disabled={!ready} loading={busy} onPress={() => void save()} />
      {message ? (
        <Text accessibilityRole="alert" className="text-ink-900 dark:text-white">
          {message}
        </Text>
      ) : null}
    </AppScreen>
  );
}
