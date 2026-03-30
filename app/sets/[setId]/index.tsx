import { useLocalSearchParams } from "expo-router";

import SetDetailScreen from "../../../src/screens/SetDetailScreen";

export default function SetDetailRoute() {
  const params = useLocalSearchParams<{ setId: string }>();

  return <SetDetailScreen deckId={params.setId} />;
}
