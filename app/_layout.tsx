import "../global.css";

import {
  MutationCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";

import { AppScreen } from "../src/components/AppScreen";
import { AuthErrorState } from "../src/components/auth/AuthErrorState";
import { LoadingState } from "../src/components/LoadingState";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { ThemeProvider, useAppTheme } from "../src/components/ThemeProvider";
import { useAppBootstrap } from "../src/hooks/useAppBootstrap";
import { AuthProvider, useAuth } from "../src/services/auth/AuthProvider";
import { setStudyAccount, onStudyChange } from "../src/db/local/store";
import { syncStudy } from "../src/services/sync/study-sync";
import { clearRecognitionCache } from "../src/services/ai/client";
import { AppState, Platform } from "react-native";
import SignInScreen from "./sign-in";

function RootNavigator() {
  const theme = useAppTheme();

  return (
    <>
      <StatusBar style={theme.colorScheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="sign-in" />
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

function SessionBoundary({ queryClient }: { queryClient: QueryClient }) {
  const { dismissError, error, isLoading, isRecoveringPassword, retrySession, session, user } =
    useAuth();
  const userId = isRecoveringPassword ? null : user?.id ?? null;
  const [preparedUserId, setPreparedUserId] = useState<string | null>(null);

  useEffect(() => {
    if (
      Platform.OS === "web" &&
      process.env.NODE_ENV === "production" &&
      "serviceWorker" in navigator
    )
      void navigator.serviceWorker
        .register("/sw.js", { updateViaCache: "none" })
        .catch(() => {});
    queryClient.clear();
    clearRecognitionCache();
    setStudyAccount(userId);
    setPreparedUserId(userId);
    return () => setStudyAccount(null);
  }, [queryClient, userId]);

  useEffect(() => {
    if (!userId || preparedUserId !== userId) return;
    let active = true;
    const unsubscribe = onStudyChange(() => {
      if (active) void queryClient.invalidateQueries();
    });
    const sync = () => {
      void syncStudy().catch(() => {});
    };
    sync();
    const timer = setInterval(sync, 30000);
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") sync();
    });
    if (Platform.OS === "web") window.addEventListener("online", sync);
    return () => {
      active = false;
      unsubscribe();
      clearInterval(timer);
      listener.remove();
      if (Platform.OS === "web") window.removeEventListener("online", sync);
    };
  }, [userId, preparedUserId, queryClient]);

  if (isLoading || (userId && preparedUserId !== userId)) {
    return <LoadingState message="Restoring your secure session..." />;
  }

  if (error && error.kind !== "invalid-session") {
    return (
      <AuthErrorState
        error={error}
        onRetry={
          error.kind === "configuration" ? undefined : () => void retrySession()
        }
        onDismiss={session ? dismissError : undefined}
      />
    );
  }

  if (!session || isRecoveringPassword) {
    return <SignInScreen />;
  }

  return <RootNavigator />;
}

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, networkMode: "always" },
          mutations: { retry: false, networkMode: "always" },
        },
        mutationCache: new MutationCache({
          onError: (error) => {
            Alert.alert(
              "Changes were not saved",
              error instanceof Error
                ? error.message
                : "Memoraid could not reach your study library. Check your connection and try again.",
            );
          },
        }),
      }),
  );
  const bootstrap = useAppBootstrap();

  if (!bootstrap.isReady && !bootstrap.error) {
    return <LoadingState />;
  }

  if (bootstrap.error) {
    return (
      <AppScreen scroll={false} className="items-center justify-center">
        <View className="w-full max-w-md rounded-[32px] border border-rose-200 bg-white p-6 dark:border-rose-500/40 dark:bg-ink-800">
          <Text className="text-sm font-semibold uppercase tracking-[2px] text-rose-500">
            Initialization error
          </Text>
          <Text className="mt-3 text-2xl font-bold text-ink-900 dark:text-white">
            The local study database could not start.
          </Text>
          <Text className="mt-3 text-sm leading-6 text-ink-600 dark:text-ink-200">
            {bootstrap.error}
          </Text>
          <PrimaryButton
            className="mt-6"
            label="Close and reopen the app"
            variant="secondary"
          />
        </View>
      </AppScreen>
    );
  }

  return (
    <ThemeProvider
      initialPreference={bootstrap.themePreference}
      initialPalette={bootstrap.themePalette}
    >
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SessionBoundary queryClient={queryClient} />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
