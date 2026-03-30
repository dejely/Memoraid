import { Text, View } from "react-native";

export function ProgressBar({
  current,
  total,
  label,
}: {
  current: number;
  total: number;
  label?: string;
}) {
  const safeTotal = Math.max(total, 1);
  const progress = Math.min(100, Math.round((current / safeTotal) * 100));

  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-medium uppercase tracking-[1.5px] text-ink-500 dark:text-ink-300">{label ?? "Progress"}</Text>
        <Text className="text-xs font-semibold text-ink-700 dark:text-ink-100">
          {current}/{total}
        </Text>
      </View>
      <View className="h-2 rounded-full bg-ink-100 dark:bg-ink-700">
        <View className="h-2 rounded-full bg-sea-500" style={{ width: `${progress}%` }} />
      </View>
    </View>
  );
}
