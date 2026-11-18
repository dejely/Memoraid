import { Tabs } from "expo-router";
import { Platform, useWindowDimensions } from "react-native";
import { useThemeColors } from "../../src/components/ThemeProvider";
import { WorkspaceNavigation } from "../../src/components/WorkspaceNavigation";

export default function TabsLayout() {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  return (
    <Tabs
      tabBar={(props) => <WorkspaceNavigation {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarPosition:
          Platform.OS === "web" && width >= 1024 ? "left" : "bottom",
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Overview" }} />
      <Tabs.Screen name="practice" options={{ title: "Practice" }} />
      <Tabs.Screen name="import" options={{ title: "Import notes" }} />
      <Tabs.Screen name="history" options={{ title: "History" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
