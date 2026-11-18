import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import {
  Platform,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../services/auth/AuthProvider";
import { useThemeColors } from "./ThemeProvider";
import { ThemeToggleButton } from "./ThemeToggleButton";

const links: Record<
  string,
  { label: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  index: { label: "Overview", icon: "grid-outline" },
  practice: { label: "Practice", icon: "pencil-outline" },
  import: { label: "Import notes", icon: "documents-outline" },
  history: { label: "History", icon: "time-outline" },
  settings: { label: "Settings", icon: "settings-outline" },
};

export function WorkspaceNavigation({
  state,
  navigation,
  descriptors,
}: BottomTabBarProps) {
  const colors = useThemeColors();
  const { user } = useAuth();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const sidebar = Platform.OS === "web" && width >= 1024;
  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderColor: colors.border,
        ...(sidebar
          ? { width: 224, borderRightWidth: 1, padding: 20, paddingTop: 32 }
          : {
              flexDirection: "row",
              borderTopWidth: 1,
              paddingBottom: Math.max(insets.bottom, 8),
              paddingTop: 8,
            }),
      }}
    >
      {sidebar ? (
        <View className="mb-12 gap-3 px-2">
          <View className="flex-row items-center gap-3">
            <View className="h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <Ionicons
                name="layers"
                size={20}
                color={colors.primaryForeground}
              />
            </View>
            <Text className="text-xl font-bold tracking-tight text-foreground">
              Memoraid
            </Text>
          </View>
          <Text className="text-xs text-muted-foreground">
            A little progress, every day.
          </Text>
        </View>
      ) : null}
      {sidebar ? (
        <Text className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[2px] text-muted-foreground">
          Workspace
        </Text>
      ) : null}
      <View
        accessibilityRole="tablist"
        accessibilityLabel="Main navigation"
        style={{
          flexDirection: sidebar ? "column" : "row",
          gap: sidebar ? 6 : 0,
          flex: sidebar ? undefined : 1,
        }}
      >
        {state.routes.map((route, index) => {
          const link = links[route.name];
          if (!link) return null;
          const focused = state.index === index;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={link.label}
              accessibilityState={{ selected: focused }}
              testID={descriptors[route.key].options.tabBarButtonTestID}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented)
                  navigation.navigate(route.name, route.params);
              }}
              onLongPress={() =>
                navigation.emit({ type: "tabLongPress", target: route.key })
              }
              style={({ pressed }) => ({
                flex: sidebar ? undefined : 1,
                minHeight: 48,
                borderRadius: 10,
                paddingHorizontal: sidebar ? 12 : 2,
                paddingVertical: 10,
                flexDirection: sidebar ? "row" : "column",
                alignItems: "center",
                gap: sidebar ? 12 : 4,
                backgroundColor: focused ? colors.muted : "transparent",
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Ionicons
                name={link.icon}
                size={sidebar ? 19 : 21}
                color={colors.foreground}
                style={{ opacity: focused ? 1 : 0.6 }}
              />
              <Text
                style={{
                  color: focused ? colors.foreground : colors.mutedForeground,
                  fontSize: sidebar ? 14 : 10,
                  fontWeight: focused ? "600" : "400",
                }}
              >
                {!sidebar && route.name === "import" ? "Import" : link.label}
              </Text>
              {sidebar && focused ? (
                <View className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
              ) : null}
            </Pressable>
          );
        })}
      </View>
      {sidebar ? (
        <View className="mt-auto gap-5 pt-8">
          {height >= 800 ? (
            <View className="gap-2 rounded-xl border border-border bg-background p-3">
              <Text className="text-xs font-semibold text-foreground">
                Make this space yours
              </Text>
              <Text className="text-xs leading-5 text-muted-foreground">
                Find your colors in Settings.
              </Text>
              <ThemeToggleButton />
            </View>
          ) : null}
          <View className="flex-row items-center gap-3 border-t border-border pt-4">
            <View className="h-9 w-9 items-center justify-center rounded-full bg-muted">
              <Text className="font-semibold text-foreground">
                {(user?.email?.[0] ?? "M").toUpperCase()}
              </Text>
            </View>
            <View className="flex-1 gap-1">
              <Text className="text-xs font-semibold text-foreground">
                Personal workspace
              </Text>
              <Text
                numberOfLines={1}
                className="text-[11px] text-muted-foreground"
              >
                {user?.email ?? "Signed in"}
              </Text>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}
