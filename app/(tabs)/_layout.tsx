import { themeAccentInk } from "../../src/theme/palettes";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import { useAppTheme } from "../../src/components/ThemeProvider";

function getTabBarIcon(
  routeName: string,
  focused: boolean,
): keyof typeof Ionicons.glyphMap {
  if (routeName === "index") {
    return focused ? "grid" : "grid-outline";
  }

  if (routeName === "practice") return focused ? "pencil" : "pencil-outline";

  if (routeName === "settings")
    return focused ? "settings" : "settings-outline";

  if (routeName === "import") {
    return focused ? "document-text" : "document-text-outline";
  }

  return focused ? "time" : "time-outline";
}

export default function TabsLayout() {
  const theme = useAppTheme();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        sceneStyle: {
          backgroundColor: theme.colors.background,
        },
        tabBarActiveTintColor: themeAccentInk(theme.colors),
        tabBarInactiveTintColor: theme.colors.mutedForeground,
        tabBarStyle: {
          height: 68,
          paddingTop: 8,
          paddingBottom: 8,
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
        tabBarIcon: ({ color, size, focused }) => (
          <Ionicons
            name={getTabBarIcon(route.name, focused)}
            size={size}
            color={color}
          />
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Dashboard" }} />
      <Tabs.Screen name="practice" options={{ title: "Practice" }} />
      <Tabs.Screen name="import" options={{ title: "Import" }} />
      <Tabs.Screen name="history" options={{ title: "History" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
