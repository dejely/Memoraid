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
    <SectionCard className="flex-1 gap-3 px-3 py-4 md:px-5">
      <View className="flex-row items-center gap-2">
        <View
          className={`h-1.5 w-1.5 rounded-full ${tone === "ink" ? "bg-foreground" : "bg-primary"}`}
        />
        <Text className="text-[10px] font-medium uppercase tracking-[1px] text-muted-foreground">
          {label}
        </Text>
      </View>
      <Text className="text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </Text>
    </SectionCard>
  );
}
