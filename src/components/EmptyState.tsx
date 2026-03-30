import { Text, View } from "react-native";

import { SectionCard } from "./SectionCard";

export function EmptyState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <SectionCard className="items-start gap-3">
      <Text className="text-lg font-semibold text-ink-900 dark:text-white">{title}</Text>
      <Text className="text-sm leading-6 text-ink-600 dark:text-ink-200">{message}</Text>
    </SectionCard>
  );
}
