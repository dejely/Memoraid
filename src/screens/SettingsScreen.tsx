import { SignOutButton } from "../components/auth/SignOutButton";
import { SegmentedControl } from "../components/SegmentedControl";
import { ThemedSwitch } from "../components/ThemedSwitch";
import { useThemeColors } from "../components/ThemeProvider";
import { AppearanceSettings } from "../components/AppearanceSettings";
import { LocalRecognitionLab } from "../components/LocalRecognitionLab";
import { StudySyncSettings } from "../components/StudySyncSettings";
import {
  FREE_OPENROUTER_MODEL_ERROR,
  isFreeOpenRouterModel,
} from "../../supabase/functions/_shared/openrouter-policy";
import { useEffect, useState } from "react";
import { Platform, Text, TextInput, View } from "react-native";
import { AppScreen } from "../components/AppScreen";
import { ScreenHeader } from "../components/ScreenHeader";
import { SectionCard } from "../components/SectionCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { FormField } from "../components/FormField";
import { ThemeToggleButton } from "../components/ThemeToggleButton";
import { useAuth } from "../services/auth/AuthProvider";
import {
  DEFAULT_AI_SETTINGS,
  EMPTY_CREDENTIALS,
  type AiProvider,
} from "../services/ai/config";
import {
  loadAiConfiguration,
  saveAiConfiguration,
} from "../services/secure/ai-storage";
import { callAiRelay } from "../services/ai/client";

export default function SettingsScreen() {
  const themeColors = useThemeColors();
  const [section, setSection] = useState("appearance");
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
          if (active)
            setMessage(
              "Settings could not be loaded. Reopen Settings to retry.",
            );
        });
    return () => {
      active = false;
    };
  }, [user?.id]);
  async function save() {
    if (!user) return;
    if (!isFreeOpenRouterModel(settings.openrouterModel)) {
      setMessage(FREE_OPENROUTER_MODEL_ERROR);
      return;
    }
    setBusy(true);
    try {
      await saveAiConfiguration(user.id, settings, {
        gemini: credentials.gemini.trim(),
        openrouter: credentials.openrouter.trim(),
      });
      setMessage("Settings saved on this device.");
    } catch {
      setMessage(
        "Settings could not be saved. Check device storage permissions.",
      );
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
      setMessage(
        `${provider}: connected to ${result.model}.${provider === "openrouter" ? " Free model; usage limits apply." : " Gemini usage charges may apply."}`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Connection failed.");
    } finally {
      clearTimeout(timer);
      setBusy(false);
    }
  }
  return (
    <AppScreen>
      <ScreenHeader
        title="Settings"
        eyebrow="Make it yours"
        subtitle="A study space that works the way you do."
        trailing={<ThemeToggleButton />}
      />
      <SegmentedControl
        label="Settings sections"
        value={section}
        onChange={setSection}
        options={[
          { value: "appearance", label: "Appearance" },
          { value: "recognition", label: "Recognition" },
          { value: "data", label: "Data & sync" },
          { value: "advanced", label: "Advanced" },
        ]}
      />
      {section === "appearance" ? <AppearanceSettings /> : null}
      {section === "data" ? (
        <>
          <StudySyncSettings />
          <SectionCard className="gap-3">
            <Text className="text-lg font-semibold text-foreground">
              Your account
            </Text>
            <Text className="text-sm text-muted-foreground">
              {user?.email ?? "Signed in"}
            </Text>
            <Text className="text-sm leading-6 text-muted-foreground">
              Signing out keeps this device’s study library for your next
              session.
            </Text>
            <SignOutButton />
          </SectionCard>
        </>
      ) : null}
      {section === "advanced" ? <LocalRecognitionLab /> : null}
      {section === "recognition" ? (
        <>
          <View className="gap-2">
            <Text className="text-xl font-semibold text-foreground">
              Handwriting recognition
            </Text>
            <Text className="text-sm leading-6 text-muted-foreground">
              Connect a provider to turn your handwriting into an editable
              answer. Math entry and self-review work without keys.
            </Text>
          </View>
          <SectionCard className="gap-3">
            <Text className="text-base leading-6 text-ink-900 dark:text-white">
              Enter your own API keys. Recognition sends your drawing and
              credentials through Memoraid’s authenticated relay to the selected
              provider. Keys are never saved on the server. OpenRouter uses free
              models only; Gemini usage charges may apply.
            </Text>
            <Text className="text-sm text-ink-600 dark:text-ink-200">
              {Platform.OS === "web"
                ? "Keys stay in this tab’s session and clear when you sign out or close it."
                : "Keys are kept in secure storage for this account on this device."}{" "}
              Math entry and self-review work without keys.
            </Text>
          </SectionCard>
          <View className="flex-row flex-wrap gap-4">
            {(["gemini", "openrouter"] as const).map((provider) => (
              <SectionCard
                key={provider}
                className="min-w-[280px] flex-1 gap-3"
              >
                <Text className="text-lg font-semibold text-ink-900 dark:text-white">
                  {provider === "gemini"
                    ? "Gemini · primary"
                    : "OpenRouter · free models only"}
                </Text>
                <TextInput
                  accessibilityLabel={`${provider} API key`}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={credentials[provider]}
                  onChangeText={(value) =>
                    setCredentials((current) => ({
                      ...current,
                      [provider]: value,
                    }))
                  }
                  placeholder="API key"
                  placeholderTextColor={themeColors.mutedForeground}
                  className="min-h-12 rounded-xl border border-border bg-input p-4 text-foreground"
                />
                <FormField
                  label="Model ID"
                  value={
                    provider === "gemini"
                      ? settings.geminiModel
                      : settings.openrouterModel
                  }
                  onChangeText={(value) =>
                    setSettings((current) => ({
                      ...current,
                      [provider === "gemini"
                        ? "geminiModel"
                        : "openrouterModel"]: value.trim(),
                    }))
                  }
                />
                {provider === "openrouter" ? (
                  <Text className="text-sm text-ink-600 dark:text-ink-200">
                    Use openrouter/free to select a free model automatically, or
                    an image-capable model ending in :free. Free models have
                    usage limits; paid models are blocked.
                  </Text>
                ) : null}
                <View className="flex-row flex-wrap gap-2">
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
                        .catch(() =>
                          setMessage("Key deletion failed. Try again."),
                        )
                        .finally(() => setBusy(false));
                    }}
                  />
                </View>
              </SectionCard>
            ))}
          </View>
          <View className="flex-row items-center gap-4">
            <ThemedSwitch
              accessibilityLabel="Automatic provider fallback"
              value={settings.fallbackEnabled}
              onValueChange={(value) =>
                setSettings((current) => ({
                  ...current,
                  fallbackEnabled: value,
                }))
              }
            />
            <Text className="text-ink-900 dark:text-white">
              Automatic fallback
            </Text>
          </View>
          <PrimaryButton
            label="Save settings"
            disabled={!ready}
            loading={busy}
            onPress={() => void save()}
          />
        </>
      ) : null}
      {message ? (
        <Text
          accessibilityRole="alert"
          className="text-ink-900 dark:text-white"
        >
          {message}
        </Text>
      ) : null}
    </AppScreen>
  );
}
