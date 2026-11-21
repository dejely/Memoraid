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
  async function deleteKey(provider: AiProvider) {
    if (!user) return;
    const next = { ...credentials, [provider]: "" };
    setBusy(true);
    try {
      await saveAiConfiguration(user.id, settings, next);
      setCredentials(next);
      setMessage("Key deleted.");
    } catch {
      setMessage("Key deletion failed. Try again.");
    } finally {
      setBusy(false);
    }
  }
  async function testFallback() {
    setBusy(true);
    setMessage("");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);
    try {
      const result = await callAiRelay(
        {
          operation: "testConnection",
          provider: "openrouter",
          settings,
          credentials: { gemini: "", openrouter: credentials.openrouter },
        },
        controller.signal,
      );
      setMessage(
        `OpenRouter connected to ${result.model}. Free model usage limits apply.`,
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
              UniMERNet turns handwritten equations into editable LaTeX when
              it’s available. It uses your drawing and requires no personal API key.
            </Text>
          </View>
          <SectionCard className="gap-3">
            <Text className="text-lg font-semibold text-foreground">
              OpenRouter fallback
            </Text>
            <Text className="text-sm leading-6 text-muted-foreground">
              Enable fallback to send the drawing to a free vision model when
              UniMERNet can’t read it or is unavailable.
            </Text>
            <Text className="text-sm text-muted-foreground">
              {Platform.OS === "web"
                ? "Your key is stored for this tab’s session."
                : "Your key stays in secure account storage on this device."}
            </Text>
            <TextInput
              accessibilityLabel="OpenRouter API key"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              value={credentials.openrouter}
              onChangeText={(value) =>
                setCredentials((current) => ({ ...current, openrouter: value }))
              }
              placeholder="OpenRouter API key"
              placeholderTextColor={themeColors.mutedForeground}
              className="min-h-12 rounded-xl border border-border bg-input p-4 text-foreground"
            />
            <FormField
              label="Model ID"
              value={settings.openrouterModel}
              onChangeText={(value) =>
                setSettings((current) => ({ ...current, openrouterModel: value.trim() }))
              }
            />
            <Text className="text-sm text-muted-foreground">
              Use openrouter/free or an image-capable model ending in :free.
            </Text>
            <View className="flex-row items-center gap-4">
              <ThemedSwitch
                accessibilityLabel="Free OpenRouter fallback"
                value={settings.fallbackEnabled}
                onValueChange={(value) =>
                  setSettings((current) => ({ ...current, fallbackEnabled: value }))
                }
              />
              <Text className="text-foreground">Enable free fallback</Text>
            </View>
            <View className="flex-row flex-wrap gap-2">
              <PrimaryButton
                label="Test connection"
                disabled={!ready || busy || !credentials.openrouter.trim()}
                onPress={() => void testFallback()}
              />
              <PrimaryButton
                label="Delete key"
                variant="secondary"
                disabled={!ready || busy || !credentials.openrouter}
                onPress={() => void deleteKey("openrouter")}
              />
            </View>
            {credentials.gemini ? (
              <PrimaryButton
                label="Remove saved Gemini key"
                variant="secondary"
                disabled={!ready || busy}
                onPress={() => void deleteKey("gemini")}
              />
            ) : null}
          </SectionCard>
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
