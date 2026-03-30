import { router } from "expo-router";

import { AppScreen } from "../src/components/AppScreen";
import { EmptyState } from "../src/components/EmptyState";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { ScreenHeader } from "../src/components/ScreenHeader";

export default function NotFoundScreen() {
  return (
    <AppScreen>
      <ScreenHeader eyebrow="Missing route" title="That page is not in this study flow." />
      <EmptyState
        title="Route not found"
        message="The screen you requested does not exist in this app build."
      />
      <PrimaryButton label="Go to dashboard" onPress={() => router.replace("/")} />
    </AppScreen>
  );
}
