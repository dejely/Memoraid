import { useLocalSearchParams } from "expo-router";

import SetFormScreen from "../../../src/screens/SetFormScreen";

export default function EditSetRoute() {
  const params = useLocalSearchParams<{ setId: string }>();

  return <SetFormScreen deckId={params.setId} />;
}
