import { useThemeColors } from "./ThemeProvider";
import { MathContent } from "./math/MathContent";
import { Animated, StyleSheet, Text, View } from "react-native";

import type { StudyCard } from "../types/models";
import { SectionCard } from "./SectionCard";

export function FlashcardPanel({
  card,
  flipAnimation,
}: {
  card: StudyCard;
  flipAnimation: Animated.Value;
}) {
  const colors = useThemeColors();
  const frontRotation = flipAnimation.interpolate({
    inputRange: [0, 180],
    outputRange: ["0deg", "180deg"],
  });

  const backRotation = flipAnimation.interpolate({
    inputRange: [0, 180],
    outputRange: ["180deg", "360deg"],
  });

  return (
    <View className="relative min-h-72">
      <Animated.View
        pointerEvents="none"
        style={[
          styles.cardFace,
          {
            transform: [{ perspective: 1200 }, { rotateY: frontRotation }],
          },
        ]}
      >
        <SectionCard className="flex-1 justify-between rounded-[32px] bg-primary px-5 py-6">
          <View className="gap-3">
            <Text className="text-xs font-medium uppercase tracking-[2px] text-primary-foreground/60">
              Term
            </Text>
            <MathContent
              className="text-3xl font-bold tracking-tight text-primary-foreground"
              color={colors.primaryForeground}
            >
              {card.term}
            </MathContent>
          </View>
          <Text className="text-sm leading-6 text-primary-foreground/70">
            Tap to flip or use the flip button for a side-turn animation.
          </Text>
        </SectionCard>
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.cardFace,
          {
            transform: [{ perspective: 1200 }, { rotateY: backRotation }],
          },
        ]}
      >
        <SectionCard className="flex-1 justify-between rounded-[32px] bg-primary px-5 py-6">
          <View className="gap-3">
            <Text className="text-xs font-medium uppercase tracking-[2px] text-primary-foreground/60">
              Definition
            </Text>
            <MathContent
              className="text-3xl font-bold tracking-tight text-primary-foreground"
              color={colors.primaryForeground}
            >
              {card.definition}
            </MathContent>
          </View>

          {card.example ? (
            <View className="rounded-3xl bg-primary-foreground/10 p-4">
              <Text className="text-xs font-medium uppercase tracking-[1.5px] text-primary-foreground/60">
                Example
              </Text>
              <MathContent
                className="mt-2 text-sm leading-6 text-primary-foreground/90"
                color={colors.primaryForeground}
              >
                {card.example}
              </MathContent>
            </View>
          ) : (
            <Text className="text-sm leading-6 text-primary-foreground/70">
              Swipe left or right to move through the stack.
            </Text>
          )}
        </SectionCard>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardFace: {
    ...StyleSheet.absoluteFillObject,
    backfaceVisibility: "hidden",
  },
});
