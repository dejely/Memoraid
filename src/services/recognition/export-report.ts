import { Share } from "react-native";
export async function exportRecognitionReport(value: unknown) {
  await Share.share({ message: JSON.stringify(value) });
}
