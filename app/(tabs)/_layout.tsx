import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import { useAppTheme } from "../../src/components/ThemeProvider";

function getTabBarIcon(routeName: string, focused: boolean): keyof typeof Ionicons.glyphMap {
  if (routeName === "index") {
    return focused ? "grid" : "grid-outline";
  }

  if (routeName === "import") {
    return focused ? "document-text" : "document-text-outline";
  }

  if (routeName === "settings") {
    return focused ? "settings" : "settings-outline";
  }

  return focused ? "time" : "time-outline";
}

export default function TabsLayout() {
  const theme = useAppTheme();
  const isDark = theme.colorScheme === "dark";

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        sceneStyle: {
          backgroundColor: isDark ? "#0b1220" : "#f5f7fb",
        },
        tabBarActiveTintColor: isDark ? "#d4f4f1" : "#172136",
        tabBarInactiveTintColor: isDark ? "#a7b8d7" : "#6f88b7",
        tabBarStyle: {
          height: 68,
          paddingTop: 8,
          paddingBottom: 8,
          backgroundColor: isDark ? "#172136" : "#ffffff",
          borderTopColor: isDark ? "#2a3a59" : "#e8edf6",
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
        tabBarIcon: ({ color, size, focused }) => (
          <Ionicons name={getTabBarIcon(route.name, focused)} size={size} color={color} />
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Dashboard" }} />
      <Tabs.Screen name="import" options={{ title: "Import" }} />
      <Tabs.Screen name="history" options={{ title: "History" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
