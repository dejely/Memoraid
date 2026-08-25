import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { AppState, Platform } from "react-native";

import { MemoraidAuthError, toMemoraidAuthError } from "./auth-errors";
import {
  clearLocalSession,
  consumeAuthCallback,
  getStoredSession,
  isAuthCallbackUrl,
  isAuthErrorCallbackUrl,
  requestMagicLink,
} from "./auth-service";
import { getSupabaseClient } from "./supabase-client";

type AuthState = {
  session: Session | null;
  isLoading: boolean;
  error: MemoraidAuthError | null;
};

export type AuthContextValue = AuthState & {
  user: User | null;
  sendMagicLink: (email: string) => Promise<string>;
  signOut: () => Promise<void>;
  retrySession: () => Promise<void>;
  dismissError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const clientRef = useRef<SupabaseClient | null>(null);
  const mountedRef = useRef(true);
  const handledCallbackUrls = useRef(new Set<string>());
  const [state, setState] = useState<AuthState>({
    session: null,
    isLoading: true,
    error: null,
  });

  const getClient = useCallback((): SupabaseClient => {
    if (!clientRef.current) {
      clientRef.current = getSupabaseClient();
    }

    return clientRef.current;
  }, []);

  const updateFromError = useCallback(async (error: unknown, client?: SupabaseClient) => {
    const authError = toMemoraidAuthError(error);

    if (authError.kind === "invalid-session" && client) {
      try {
        await clearLocalSession(client);
      } catch {
        // The actionable invalid-session message is more useful than a cleanup error.
      }
    }

    if (mountedRef.current) {
      setState((current) => ({
        session: authError.kind === "invalid-session" ? null : current.session,
        isLoading: false,
        error: authError,
      }));
    }
  }, []);

  const handleCallbackUrl = useCallback(
    async (url: string, client: SupabaseClient): Promise<Session | null> => {
      if (!isAuthCallbackUrl(url) || handledCallbackUrls.current.has(url)) {
        return null;
      }

      handledCallbackUrls.current.add(url);
      setState((current) => ({ ...current, isLoading: true, error: null }));

      try {
        const session = await consumeAuthCallback(url, client);

        if (mountedRef.current) {
          setState({ session, isLoading: false, error: null });
        }

        return session;
      } catch (error) {
        await updateFromError(error, client);
        return null;
      }
    },
    [updateFromError],
  );

  const restoreSession = useCallback(async () => {
    setState((current) => ({ ...current, isLoading: true, error: null }));

    let client: SupabaseClient;

    try {
      client = getClient();
    } catch (error) {
      await updateFromError(error);
      return;
    }

    try {
      const initialUrl = await Linking.getInitialURL();

      if (
        initialUrl &&
        isAuthCallbackUrl(initialUrl) &&
        (Platform.OS !== "web" || isAuthErrorCallbackUrl(initialUrl))
      ) {
        await handleCallbackUrl(initialUrl, client);
        return;
      }

      const session = await getStoredSession(client);

      if (mountedRef.current) {
        setState({ session, isLoading: false, error: null });
      }
    } catch (error) {
      await updateFromError(error, client);
    }
  }, [getClient, handleCallbackUrl, updateFromError]);

  useEffect(() => {
    mountedRef.current = true;

    let client: SupabaseClient;

    try {
      client = getClient();
    } catch (error) {
      void updateFromError(error);
      return () => {
        mountedRef.current = false;
      };
    }

    const { data: authListener } = client.auth.onAuthStateChange((_event, session) => {
      if (mountedRef.current) {
        setState({ session, isLoading: false, error: null });
      }
    });

    const linkListener =
      Platform.OS === "web"
        ? null
        : Linking.addEventListener("url", ({ url }) => {
            void handleCallbackUrl(url, client);
          });

    const appStateListener =
      Platform.OS === "web"
        ? null
        : AppState.addEventListener("change", (nextState) => {
            if (nextState === "active") {
              client.auth.startAutoRefresh();
            } else {
              client.auth.stopAutoRefresh();
            }
          });

    if (Platform.OS !== "web" && AppState.currentState === "active") {
      client.auth.startAutoRefresh();
    }

    void restoreSession();

    return () => {
      mountedRef.current = false;
      authListener.subscription.unsubscribe();
      linkListener?.remove();
      appStateListener?.remove();

      if (Platform.OS !== "web") {
        client.auth.stopAutoRefresh();
      }
    };
  }, [getClient, handleCallbackUrl, restoreSession, updateFromError]);

  const sendMagicLink = useCallback(
    async (email: string): Promise<string> => {
      try {
        return await requestMagicLink(email, getClient());
      } catch (error) {
        throw toMemoraidAuthError(error, "The magic link could not be sent.");
      }
    },
    [getClient],
  );

  const signOut = useCallback(async () => {
    setState((current) => ({ ...current, isLoading: true, error: null }));

    try {
      const { error } = await getClient().auth.signOut();

      if (error) {
        throw error;
      }

      if (mountedRef.current) {
        setState({ session: null, isLoading: false, error: null });
      }
    } catch (error) {
      await updateFromError(error, clientRef.current ?? undefined);
    }
  }, [getClient, updateFromError]);

  const dismissError = useCallback(() => {
    setState((current) => ({ ...current, error: null }));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      user: state.session?.user ?? null,
      sendMagicLink,
      signOut,
      retrySession: restoreSession,
      dismissError,
    }),
    [dismissError, restoreSession, sendMagicLink, signOut, state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
