import "../global.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";

import { AppScreen } from "../src/components/AppScreen";
import { LoadingState } from "../src/components/LoadingState";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { ThemeProvider, useAppTheme } from "../src/components/ThemeProvider";
import { useAppBootstrap } from "../src/hooks/useAppBootstrap";

function RootNavigator() {
  const theme = useAppTheme();

  return (
    <>
      <StatusBar style={theme.colorScheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colorScheme === "dark" ? "#0b1220" : "#f5f7fb" },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="sets/new" />
        <Stack.Screen name="sets/[setId]/index" />
        <Stack.Screen name="sets/[setId]/edit" />
        <Stack.Screen name="sets/[setId]/study" />
        <Stack.Screen name="sets/[setId]/test" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());
  const bootstrap = useAppBootstrap();

  if (!bootstrap.isReady && !bootstrap.error) {
    return <LoadingState />;
  }

  if (bootstrap.error) {
    return (
      <AppScreen scroll={false} className="items-center justify-center">
        <View className="w-full max-w-md rounded-[32px] border border-rose-200 bg-white p-6 dark:border-rose-500/40 dark:bg-ink-800">
          <Text className="text-sm font-semibold uppercase tracking-[2px] text-rose-500">Initialization error</Text>
          <Text className="mt-3 text-2xl font-bold text-ink-900 dark:text-white">The local study database could not start.</Text>
          <Text className="mt-3 text-sm leading-6 text-ink-600 dark:text-ink-200">{bootstrap.error}</Text>
          <PrimaryButton className="mt-6" label="Close and reopen the app" variant="secondary" />
        </View>
      </AppScreen>
    );
  }

  return (
    <ThemeProvider initialPreference={bootstrap.themePreference}>
      <QueryClientProvider client={queryClient}>
        <RootNavigator />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
