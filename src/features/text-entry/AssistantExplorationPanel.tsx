import { Pressable, StyleSheet, Text, View } from 'react-native';

import type {
  EmotionChoice,
  EmotionExplorerResponse,
  ExplorerSuggestion,
  NeedChoice,
} from '@/src/core/contracts';
import { borders, colors, spacing, typography, typeScale } from '@/src/ui/tokens';

interface AssistantExplorationPanelProps {
  mode: 'consent' | 'results';
  suggestions: EmotionExplorerResponse;
  selectedEmotionIds: ReadonlySet<string>;
  selectedNeedIds: ReadonlySet<string>;
  onAddEmotion: (choice: EmotionChoice) => void;
  onAddNeed: (choice: NeedChoice) => void;
}

export function AssistantExplorationPanel({
  mode,
  suggestions,
  selectedEmotionIds,
  selectedNeedIds,
  onAddEmotion,
  onAddNeed,
}: AssistantExplorationPanelProps) {
  if (mode === 'consent') {
    return (
      <View accessibilityLabel="AI 도움 요청 안내" style={styles.noticePanel}>
        <Text style={styles.heading}>요청하기 전에 확인해 주세요.</Text>
        <Text style={styles.body}>현재 버전은 외부 AI에 연결되지 않아, 기기 안의 임시 탐색기로 화면 흐름만 확인해요.</Text>
        <Text style={styles.emphasis}>지금은 어떤 내용도 외부로 보내지 않아요.</Text>
        <View style={styles.insetPanel}>
          <Text style={styles.label}>이 흐름에서 요청 후보가 되는 내용</Text>
          <Text style={styles.body}>• 작성한 이야기</Text>
          <Text style={styles.body}>• 카탈로그에서 직접 고른 감정·욕구 ID</Text>
        </View>
        <View style={styles.insetPanel}>
          <Text style={styles.label}>포함하지 않는 내용</Text>
          <Text style={styles.body}>• 날짜, 저장 ID, 다른 날의 기록, 기기 정보</Text>
          <Text style={styles.body}>• 목록에 없어 직접 추가한 표현</Text>
        </View>
        <Text style={styles.body}>AI 후보는 정답이 아니며 자동으로 저장되지 않아요. 내가 추가한 후보만 최종 확인에 들어가요.</Text>
      </View>
    );
  }

  const hasSuggestions = suggestions.emotions.length > 0 || suggestions.needs.length > 0;
  return (
    <View accessibilityLabel="AI 보조 후보" style={styles.resultsPanel}>
      <Text
        accessibilityLabel="AI 보조 후보가 도착했어요"
        accessibilityLiveRegion="polite"
        accessibilityRole="summary"
        style={styles.heading}
      >
        내 경험에 가까운지 직접 확인해 보세요.
      </Text>
      <Text style={styles.body}>AI가 마음을 판정한 결과가 아니에요. 가까운 표현만 내 선택에 추가하세요.</Text>
      {!hasSuggestions && (
        <Text accessibilityRole="summary" style={styles.emptyText}>추가로 보여 줄 후보가 없어요. 이미 고른 내용으로 계속해도 돼요.</Text>
      )}
      <SuggestionGroup
        kindLabel="감정 후보"
        onAdd={onAddEmotion}
        selectedIds={selectedEmotionIds}
        suggestions={suggestions.emotions}
      />
      <SuggestionGroup
        kindLabel="욕구 후보"
        onAdd={onAddNeed}
        selectedIds={selectedNeedIds}
        suggestions={suggestions.needs}
      />
    </View>
  );
}

interface SuggestionGroupProps<TChoice extends EmotionChoice | NeedChoice> {
  kindLabel: string;
  suggestions: readonly ExplorerSuggestion<TChoice>[];
  selectedIds: ReadonlySet<string>;
  onAdd: (choice: TChoice) => void;
}

function SuggestionGroup<TChoice extends EmotionChoice | NeedChoice>({
  kindLabel,
  suggestions,
  selectedIds,
  onAdd,
}: SuggestionGroupProps<TChoice>) {
  if (suggestions.length === 0) return null;

  return (
    <View accessibilityLabel={kindLabel} style={styles.group}>
      <Text style={styles.groupTitle}>{kindLabel}</Text>
      {suggestions.map(({ choice, reason }) => {
        const selected = selectedIds.has(choice.id);
        return (
          <View key={choice.id} style={styles.suggestion}>
            <Text style={styles.choiceLabel}>{choice.label}</Text>
            <Text style={styles.body}>{reason}</Text>
            <Pressable
              accessibilityLabel={`${choice.label} 내 선택에 추가`}
              accessibilityRole="button"
              accessibilityState={{ disabled: selected }}
              disabled={selected}
              onPress={() => onAdd(choice)}
              style={({ pressed }) => [
                styles.addButton,
                selected && styles.buttonDisabled,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.buttonText}>{selected ? '추가됨' : '내 선택에 추가'}</Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  addButton: {
    alignItems: 'center',
    backgroundColor: colors.button,
    borderBottomColor: colors.buttonShadow,
    borderLeftColor: colors.buttonHighlight,
    borderRightColor: colors.buttonShadow,
    borderTopColor: colors.buttonHighlight,
    borderWidth: borders.button,
    justifyContent: 'center',
    minHeight: 48,
    padding: spacing.md,
  },
  body: { color: colors.text, fontSize: typeScale.body, lineHeight: typeScale.bodyLineHeight },
  buttonDisabled: { opacity: 0.55 },
  buttonPressed: { opacity: 0.72 },
  buttonText: { color: colors.text, fontSize: typeScale.body, fontWeight: typography.statusWeight },
  choiceLabel: { color: colors.text, fontSize: typeScale.body, fontWeight: typography.headingWeight },
  emptyText: {
    backgroundColor: '#fff7d6',
    borderColor: colors.panelBorder,
    borderWidth: borders.panel,
    color: colors.text,
    fontSize: typeScale.body,
    lineHeight: typeScale.bodyLineHeight,
    padding: spacing.md,
  },
  emphasis: { color: colors.status, fontSize: typeScale.body, fontWeight: typography.statusWeight, lineHeight: typeScale.bodyLineHeight },
  group: { gap: spacing.sm },
  groupTitle: { color: colors.text, fontSize: typeScale.body, fontWeight: typography.headingWeight },
  heading: { color: colors.text, fontSize: typeScale.heading, fontWeight: typography.headingWeight, lineHeight: typeScale.headingLineHeight },
  insetPanel: { backgroundColor: colors.panel, borderColor: colors.panelBorder, borderWidth: borders.button, gap: spacing.xs, padding: spacing.md },
  label: { color: colors.text, fontSize: typeScale.body, fontWeight: typography.statusWeight },
  noticePanel: { gap: spacing.md },
  resultsPanel: { gap: spacing.lg },
  suggestion: { backgroundColor: colors.panel, borderColor: colors.panelBorder, borderWidth: borders.panel, gap: spacing.sm, padding: spacing.md },
});
