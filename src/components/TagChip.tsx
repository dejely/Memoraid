import { Text, View } from "react-native";

export function TagChip({ label }: { label: string }) {
  return (
    <View className="rounded-full bg-sea-50 px-3 py-1 dark:bg-sea-800/50">
      <Text className="text-xs font-medium text-sea-800 dark:text-sea-100">{label}</Text>
    </View>
  );
}
