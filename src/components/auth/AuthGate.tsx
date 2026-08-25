import { Redirect } from "expo-router";
import type { PropsWithChildren } from "react";

import { useAuth } from "../../services/auth/AuthProvider";
import { LoadingState } from "../LoadingState";
import { AuthErrorState } from "./AuthErrorState";

export function AuthGate({ children }: PropsWithChildren) {
  const { dismissError, error, isLoading, retrySession, session } = useAuth();

  if (isLoading) {
    return <LoadingState message="Restoring your secure session..." />;
  }

  if (error && error.kind !== "invalid-session") {
    return (
      <AuthErrorState
        error={error}
        onRetry={error.kind === "configuration" ? undefined : retrySession}
        onDismiss={session ? dismissError : undefined}
      />
    );
  }

  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  return children;
}
