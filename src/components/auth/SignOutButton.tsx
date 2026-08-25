import { useState } from "react";

import { useAuth } from "../../services/auth/AuthProvider";
import { PrimaryButton } from "../PrimaryButton";

export function SignOutButton({ className }: { className?: string }) {
  const { signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut(): Promise<void> {
    setIsSigningOut(true);

    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <PrimaryButton
      className={className}
      label="Sign out"
      loading={isSigningOut}
      variant="secondary"
      onPress={() => void handleSignOut()}
    />
  );
}
