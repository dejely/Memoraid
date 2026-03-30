import { Text, View } from "react-native";

import { SectionCard } from "./SectionCard";

export function StatTile({
  label,
  value,
  tone = "ink",
}: {
  label: string;
  value: string;
  tone?: "ink" | "sea" | "amber";
}) {
  return (
    <SectionCard
      className={[
        "flex-1 gap-2",
        tone === "sea" ? "bg-sea-900" : "",
        tone === "amber" ? "bg-amber-500" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Text
        className={[
          "text-xs font-medium uppercase tracking-[1.5px]",
          tone === "ink" ? "text-ink-500 dark:text-ink-300" : "text-white/70",
        ].join(" ")}
      >
        {label}
      </Text>
      <Text className={["text-2xl font-bold", tone === "ink" ? "text-ink-900 dark:text-white" : "text-white"].join(" ")}>
        {value}
      </Text>
    </SectionCard>
  );
}
