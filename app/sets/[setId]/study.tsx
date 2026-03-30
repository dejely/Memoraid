import { useLocalSearchParams } from "expo-router";

import StudyScreen from "../../../src/screens/StudyScreen";

export default function StudyRoute() {
  const params = useLocalSearchParams<{ setId: string }>();

  return <StudyScreen deckId={params.setId} />;
}
