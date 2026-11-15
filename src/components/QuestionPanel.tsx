import { AnswerInput } from "./math/AnswerInput";
import { MathContent } from "./math/MathContent";
import { Pressable, Text, View } from "react-native";

import type { RuntimeTestQuestion } from "../types/models";
import { cn } from "../utils/classnames";
import { SectionCard } from "./SectionCard";

export function QuestionPanel({
  question,
  selectedAnswer,
  onSelect,
  onChangeText,
  answerLocked,
}: {
  question: RuntimeTestQuestion;
  selectedAnswer?: string;
  onSelect?: (value: string) => void;
  onChangeText?: (value: string) => void;
  answerLocked?: boolean;
}) {
  return (
    <SectionCard className="gap-4">
      <Text className="text-xs font-medium uppercase tracking-[2px] text-sea-700 dark:text-sea-300">
        {question.questionType.replace("_", " ")}
      </Text>
      <MathContent className="text-2xl font-semibold leading-9 text-ink-900 dark:text-white">
        {question.prompt}
      </MathContent>

      {question.questionType === "written" ? (
        <AnswerInput
          key={question.id}
          value={selectedAnswer ?? ""}
          onChangeText={onChangeText ?? (() => {})}
          locked={!!answerLocked}
        />
      ) : (
        <View className="gap-3">
          {(question.options ?? []).map((option) => {
            const isSelected = selectedAnswer === option;

            return (
              <Pressable
                key={option}
                onPress={() => onSelect?.(option)}
                disabled={answerLocked}
                className={cn(
                  "rounded-3xl border px-4 py-4",
                  isSelected
                    ? "border-sea-500 bg-sea-50 dark:bg-sea-900/40"
                    : "border-ink-200 bg-white dark:border-ink-600 dark:bg-ink-700",
                )}
              >
                <MathContent
                  className={cn(
                    "text-base leading-7",
                    isSelected ? "text-sea-900 dark:text-sea-100" : "text-ink-800 dark:text-ink-100",
                  )}
                >
                  {option}
                </MathContent>
              </Pressable>
            );
          })}
        </View>
      )}
    </SectionCard>
  );
}
