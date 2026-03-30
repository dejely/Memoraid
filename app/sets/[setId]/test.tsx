import { useLocalSearchParams } from "expo-router";

import TestScreen from "../../../src/screens/TestScreen";

export default function TestRoute() {
  const params = useLocalSearchParams<{ setId: string }>();

  return <TestScreen deckId={params.setId} />;
}
