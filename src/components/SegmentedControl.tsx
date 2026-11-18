import { Pressable, Text, View } from "react-native";
export function SegmentedControl({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={label}
      className="flex-row flex-wrap gap-1 self-start rounded-xl border border-border bg-muted p-1"
    >
      {options.map((option) => (
        <Pressable
          key={option.value}
          accessibilityRole="tab"
          accessibilityState={{ selected: value === option.value }}
          onPress={() => onChange(option.value)}
          className={`min-h-11 items-center justify-center rounded-lg px-4 ${value === option.value ? "bg-card" : "bg-transparent"}`}
        >
          <Text
            className={`text-xs ${value === option.value ? "font-semibold text-foreground" : "text-muted-foreground"}`}
          >
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
