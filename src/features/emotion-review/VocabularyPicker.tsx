import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import type {
  EmotionGroupId,
  EmotionNeedVocabulary,
  NeedGroupId,
  VocabularyItem,
  VocabularyKind,
} from '@/src/core/contracts';
import { VOCABULARY_GROUPS } from '@/src/core/vocabulary';
import { borders, colors, spacing, typography, typeScale } from '@/src/ui/tokens';

interface VocabularyPickerProps {
  kind: VocabularyKind;
  vocabulary: EmotionNeedVocabulary;
  selectedIds: ReadonlySet<string>;
  onToggle: (item: VocabularyItem) => void;
  onAdd: (label: string) => void;
}

const labels = {
  emotion: { noun: '감정', search: '감정 검색', add: '내 감정 직접 추가' },
  need: { noun: '욕구', search: '욕구 검색', add: '내 욕구 직접 추가' },
} as const;

export function VocabularyPicker({
  kind,
  vocabulary,
  selectedIds,
  onToggle,
  onAdd,
}: VocabularyPickerProps) {
  const [query, setQuery] = useState('');
  const [groupId, setGroupId] = useState<EmotionGroupId | NeedGroupId | null>(null);
  const [customLabel, setCustomLabel] = useState('');
  const copy = labels[kind];
  const groups = VOCABULARY_GROUPS.filter((group) => group.kind === kind);
  const items = useMemo(() => {
    if (kind === 'emotion') {
      return vocabulary.search({
        kind,
        text: query,
        ...(groupId ? { group: groupId as EmotionGroupId } : {}),
      });
    }
    return vocabulary.search({
      kind,
      text: query,
      ...(groupId ? { group: groupId as NeedGroupId } : {}),
    });
  }, [groupId, kind, query, vocabulary]);

  const addCustomItem = () => {
    const label = customLabel.trim();
    if (!label) return;
    onAdd(label);
    setCustomLabel('');
  };

  return (
    <View style={styles.container}>
      <TextInput
        accessibilityLabel={copy.search}
        onChangeText={setQuery}
        placeholder={`${copy.noun} 이름을 입력하세요`}
        returnKeyType="search"
        style={styles.input}
        value={query}
      />

      <ScrollView
        accessibilityLabel={`${copy.noun} 주제 필터`}
        contentContainerStyle={styles.groupRow}
        horizontal
        keyboardShouldPersistTaps="handled"
        showsHorizontalScrollIndicator={false}
      >
        <FilterButton active={groupId === null} label="전체" onPress={() => setGroupId(null)} />
        {groups.map((group) => (
          <FilterButton
            active={group.id === groupId}
            key={group.id}
            label={group.label}
            onPress={() => setGroupId(group.id)}
          />
        ))}
      </ScrollView>

      <View accessibilityLabel={`${copy.noun} 목록`} style={styles.itemList}>
        {items.length === 0 ? (
          <Text accessibilityLiveRegion="polite" style={styles.emptyText}>
            찾는 표현이 없어요. 아래에서 직접 추가할 수 있어요.
          </Text>
        ) : (
          items.map((item) => {
            const selected = selectedIds.has(item.id);
            return (
              <Pressable
                accessibilityLabel={`${item.label} ${selected ? '선택 해제' : '선택'}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                key={item.id}
                onPress={() => onToggle(item)}
                style={({ pressed }) => [
                  styles.itemButton,
                  selected && styles.itemButtonSelected,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.itemText}>{selected ? '✓ ' : ''}{item.label}</Text>
              </Pressable>
            );
          })
        )}
      </View>

      <View style={styles.addRow}>
        <TextInput
          accessibilityLabel={copy.add}
          onChangeText={setCustomLabel}
          onSubmitEditing={addCustomItem}
          placeholder="목록에 없는 표현"
          returnKeyType="done"
          style={[styles.input, styles.addInput]}
          value={customLabel}
        />
        <Pressable
          accessibilityRole="button"
          disabled={!customLabel.trim()}
          onPress={addCustomItem}
          style={({ pressed }) => [
            styles.addButton,
            !customLabel.trim() && styles.buttonDisabled,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.itemText}>추가</Text>
        </Pressable>
      </View>
    </View>
  );
}

interface FilterButtonProps {
  active: boolean;
  label: string;
  onPress: () => void;
}

function FilterButton({ active, label, onPress }: FilterButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.filterButton, active && styles.filterButtonActive, pressed && styles.buttonPressed]}
    >
      <Text style={styles.filterText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  addButton: {
    alignItems: 'center',
    backgroundColor: colors.button,
    borderColor: colors.buttonShadow,
    borderWidth: borders.button,
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 68,
    paddingHorizontal: spacing.md,
  },
  addInput: { flex: 1 },
  addRow: { flexDirection: 'row', gap: spacing.sm },
  buttonDisabled: { opacity: 0.5 },
  buttonPressed: { opacity: 0.72 },
  container: { gap: spacing.md },
  emptyText: { color: colors.textMuted, fontSize: typeScale.body, lineHeight: typeScale.bodyLineHeight },
  filterButton: {
    backgroundColor: colors.button,
    borderColor: colors.buttonShadow,
    borderWidth: borders.panel,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterButtonActive: { backgroundColor: '#b9c9e3', borderWidth: borders.button },
  filterText: { color: colors.text, fontSize: typeScale.status, fontWeight: typography.statusWeight },
  groupRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  input: {
    backgroundColor: colors.panel,
    borderColor: colors.panelBorder,
    borderWidth: borders.button,
    color: colors.text,
    fontSize: typeScale.body,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  itemButton: {
    backgroundColor: colors.panel,
    borderColor: colors.panelBorder,
    borderWidth: borders.panel,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  itemButtonSelected: { backgroundColor: '#dce7d7', borderColor: colors.status, borderWidth: borders.button },
  itemList: { gap: spacing.sm },
  itemText: { color: colors.text, fontSize: typeScale.body, fontWeight: typography.statusWeight },
});
