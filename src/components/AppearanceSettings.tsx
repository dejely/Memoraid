import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { THEME_OPTIONS, themeColors } from "../theme/palettes";
import { useAppTheme } from "./ThemeProvider";
import { SectionCard } from "./SectionCard";
export function AppearanceSettings() {
  const theme = useAppTheme(),
    [error, setError] = useState("");
  async function apply(change: () => Promise<void>) {
    setError("");
    try {
      await change();
    } catch {
      setError(
        "Appearance changed for this session, but could not be saved. Try again.",
      );
    }
  }
  return (
    <SectionCard className="gap-4">
      <View className="gap-1">
        <Text className="text-xl font-semibold text-foreground">
          Appearance
        </Text>
        <Text className="text-sm text-muted-foreground">
          Choose your colors and light or dark mode. Saved on this device.
        </Text>
      </View>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="Color theme"
        className="flex-row flex-wrap gap-3"
      >
        {THEME_OPTIONS.map((option) => {
          const selected = theme.palette === option.id;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="radio"
              accessibilityLabel={`${option.label} theme`}
              accessibilityState={{ checked: selected }}
              onPress={() => void apply(() => theme.setPalette(option.id))}
              style={{
                borderColor: selected
                  ? theme.colors.primary
                  : theme.colors.border,
              }}
              className="min-w-[240px] flex-1 gap-3 rounded-xl border-2 bg-card p-4"
            >
              <View className="flex-row justify-between gap-2">
                <Text className="text-base font-semibold text-foreground">
                  {option.label}
                </Text>
                <Text className="text-sm font-semibold text-foreground">
                  {selected ? "✓ Selected" : ""}
                </Text>
              </View>
              <Text className="text-sm text-muted-foreground">
                {option.description}
              </Text>
              <View className="flex-row gap-3">
                {(["light", "dark"] as const).map((mode) => {
                  const colors = themeColors(option.id, mode);
                  return (
                    <View
                      key={mode}
                      style={{
                        flex: 1,
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        borderWidth: 1,
                        borderRadius: 12,
                        padding: 12,
                        gap: 8,
                      }}
                    >
                      <Text
                        style={{
                          color: colors.foreground,
                          fontSize: 12,
                          fontWeight: "600",
                        }}
                      >
                        {mode === "light" ? "Light" : "Dark"}
                      </Text>
                      <View
                        style={{
                          height: 8,
                          width: "80%",
                          backgroundColor: colors.muted,
                          borderRadius: 3,
                        }}
                      />
                      <View
                        style={{
                          height: 22,
                          width: "100%",
                          backgroundColor: colors.card,
                          borderRadius: 4,
                          borderWidth: 1,
                          borderColor: colors.border,
                        }}
                      />
                      <View className="flex-row gap-2">
                        {[colors.primary, colors.secondary, colors.accent].map(
                          (color, i) => (
                            <View
                              key={i}
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: 10,
                                backgroundColor: color,
                                borderWidth: 1,
                                borderColor: colors.border,
                              }}
                            />
                          ),
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </Pressable>
          );
        })}
      </View>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="Appearance mode"
        className="flex-row flex-wrap gap-2"
      >
        {(["light", "dark", "system"] as const).map((mode) => {
          const selected = theme.preference === mode;
          return (
            <Pressable
              key={mode}
              accessibilityRole="radio"
              accessibilityLabel={`${mode[0].toUpperCase() + mode.slice(1)} mode`}
              accessibilityState={{ checked: selected }}
              onPress={() => void apply(() => theme.setPreference(mode))}
              style={{
                backgroundColor: selected
                  ? theme.colors.primary
                  : theme.colors.secondary,
                borderColor: theme.colors.border,
              }}
              className="min-h-12 flex-1 items-center justify-center rounded-2xl border px-4"
            >
              <Text
                style={{
                  color: selected
                    ? theme.colors.primaryForeground
                    : theme.colors.secondaryForeground,
                  fontWeight: "600",
                }}
              >
                {selected ? "✓ " : ""}
                {mode === "system"
                  ? "Use device"
                  : mode === "light"
                    ? "Light"
                    : "Dark"}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text className="text-xs text-muted-foreground">
        Device mode follows your system appearance while keeping your chosen
        colors.
      </Text>
      {error ? (
        <Text accessibilityRole="alert" className="text-foreground">
          {error}
        </Text>
      ) : null}
    </SectionCard>
  );
}
