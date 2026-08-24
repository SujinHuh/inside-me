import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type LayoutChangeEvent } from 'react-native';

import type {
  EmotionGroupId,
  EmotionNeedVocabulary,
  NeedConnection,
  NeedGroupId,
  VocabularyItem,
  VocabularyKind,
} from '@/src/core/contracts';
import { VOCABULARY_GROUPS } from '@/src/core/vocabulary';
import { borders, colors, spacing, typography, typeScale } from '@/src/ui/tokens';

interface WholeEmotionNeedsMapProps {
  vocabulary: EmotionNeedVocabulary;
  selectedEmotionIds: ReadonlySet<string>;
  selectedNeedIds: ReadonlySet<string>;
  onToggle: (item: VocabularyItem) => void;
  onAdd: (kind: VocabularyKind, label: string) => void;
  onJumpToSection: (sectionId: MapSectionId) => void;
  onMapLayout: (event: LayoutChangeEvent) => void;
  onSectionLayout: (sectionId: MapSectionId, event: LayoutChangeEvent) => void;
  emotionUnknown: boolean;
  onToggleEmotionUnknown: () => void;
}

export type MapSectionId = 'fulfilled' | 'unfulfilled' | 'needs';

interface MapSection {
  id: MapSectionId;
  title: string;
  description: string;
  kind: VocabularyKind;
  needConnection?: NeedConnection;
  colors: readonly string[];
}

const sections: readonly MapSection[] = [
  {
    id: 'fulfilled',
    title: '욕구가 충족되었을 때 연결되는 느낌',
    description: '기쁨·편안함·활력처럼 지금의 경험에 가까운 말을 찾아보세요.',
    kind: 'emotion',
    needConnection: 'fulfilled',
    colors: ['#FFF2B8', '#FFE3A5', '#DDF3C4'],
  },
  {
    id: 'unfulfilled',
    title: '욕구가 충족되지 않았을 때 연결되는 느낌',
    description: '걱정·슬픔·분노처럼 불편한 느낌도 없애야 할 답이 아니라 살펴볼 단서예요.',
    kind: 'emotion',
    needConnection: 'unfulfilled',
    colors: ['#FFD9CC', '#EAD7F5', '#D7E7F6', '#E7DEC8'],
  },
  {
    id: 'needs',
    title: '내게 중요했던 욕구',
    description: '자율성부터 자기구현까지 여러 영역을 함께 골라도 괜찮아요.',
    kind: 'need',
    colors: ['#CDEEE7', '#D9EAF8', '#E1DDF6', '#F5E5B8'],
  },
];

export function WholeEmotionNeedsMap({
  vocabulary,
  selectedEmotionIds,
  selectedNeedIds,
  onToggle,
  onAdd,
  onJumpToSection,
  onMapLayout,
  onSectionLayout,
  emotionUnknown,
  onToggleEmotionUnknown,
}: WholeEmotionNeedsMapProps) {
  const [query, setQuery] = useState('');

  return (
    <View onLayout={onMapLayout} style={styles.map}>
      <View style={styles.introPanel}>
        <Text style={styles.introTitle}>한 장 마음 지도</Text>
        <Text style={styles.introCopy}>
          어느 한쪽을 먼저 고를 필요 없이 전체 지도를 훑어보세요. 서로 다른 영역의 표현을 함께 선택할 수 있어요.
        </Text>
        <TextInput
          accessibilityLabel="감정과 욕구 전체 검색"
          onChangeText={setQuery}
          placeholder="감정이나 욕구 이름을 검색하세요"
          returnKeyType="search"
          style={styles.searchInput}
          value={query}
        />
        <View accessibilityLabel="마음 지도 빠른 이동" style={styles.jumpRow}>
          {sections.map((section) => (
            <Pressable
              accessibilityRole="button"
              key={section.id}
              onPress={() => onJumpToSection(section.id)}
              style={({ pressed }) => [styles.jumpButton, pressed && styles.buttonPressed]}
            >
              <Text style={styles.jumpButtonText}>
                {section.id === 'fulfilled' ? '충족 감정' : section.id === 'unfulfilled' ? '미충족 감정' : '욕구'}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          accessibilityLabel="감정을 아직 모르겠어요"
          accessibilityRole="checkbox"
          accessibilityState={{ checked: emotionUnknown }}
          onPress={onToggleEmotionUnknown}
          style={[styles.unknownChoice, emotionUnknown && styles.unknownChoiceSelected]}
        >
          <Text style={styles.unknownChoiceText}>{emotionUnknown ? '✓ ' : ''}감정을 아직 모르겠어요</Text>
        </Pressable>
      </View>

      {sections.map((section) => (
        <VocabularySection
          key={section.id}
          query={query}
          section={section}
          selectedIds={section.kind === 'emotion' ? selectedEmotionIds : selectedNeedIds}
          vocabulary={vocabulary}
          onToggle={onToggle}
          onLayout={(event) => onSectionLayout(section.id, event)}
        />
      ))}

      <View style={styles.customPanel}>
        <Text style={styles.groupTitle}>목록에 없는 내 표현</Text>
        <CustomInput kind="emotion" onAdd={onAdd} />
        <CustomInput kind="need" onAdd={onAdd} />
      </View>
    </View>
  );
}

interface VocabularySectionProps {
  section: MapSection;
  query: string;
  vocabulary: EmotionNeedVocabulary;
  selectedIds: ReadonlySet<string>;
  onToggle: (item: VocabularyItem) => void;
  onLayout: (event: LayoutChangeEvent) => void;
}

function VocabularySection({ section, query, vocabulary, selectedIds, onToggle, onLayout }: VocabularySectionProps) {
  const groups = VOCABULARY_GROUPS.filter((group) => group.kind === section.kind);
  const itemsByGroup = useMemo(() => groups.map((group) => {
    const items = section.kind === 'emotion'
      ? vocabulary.search({
        kind: 'emotion',
        group: group.id as EmotionGroupId,
        text: query,
        ...(section.needConnection ? { needConnection: section.needConnection } : {}),
      })
      : vocabulary.search({ kind: 'need', group: group.id as NeedGroupId, text: query });
    return { group, items };
  }).filter(({ items }) => items.length > 0), [groups, query, section, vocabulary]);

  const selectedCount = section.kind === 'emotion'
    ? vocabulary.search({ kind: 'emotion', ...(section.needConnection ? { needConnection: section.needConnection } : {}) })
      .filter((item) => selectedIds.has(item.id)).length
    : vocabulary.search({ kind: 'need' }).filter((item) => selectedIds.has(item.id)).length;

  return (
    <View
      accessibilityLabel={section.title}
      onLayout={onLayout}
      style={[styles.section, { backgroundColor: section.colors[0] }]}
    >
      <View style={styles.sectionHeadingRow}>
        <View style={styles.sectionHeadingCopy}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.sectionDescription}>{section.description}</Text>
        </View>
        <Text accessibilityLiveRegion="polite" style={styles.countBadge}>{selectedCount} 선택</Text>
      </View>

      {itemsByGroup.length === 0 ? (
        <Text accessibilityLiveRegion="polite" style={styles.emptyText}>이 영역에는 검색 결과가 없어요.</Text>
      ) : itemsByGroup.map(({ group, items }, index) => (
        <View
          accessibilityLabel={`${group.label} 표현 목록`}
          key={group.id}
          style={[styles.groupPanel, { backgroundColor: section.colors[index % section.colors.length] }]}
        >
          <Text style={styles.groupTitle}>{group.label} · {items.length}개</Text>
          <View style={styles.wordList}>
            {items.map((item) => {
              const selected = selectedIds.has(item.id);
              return (
                <Pressable
                  accessibilityLabel={`${item.label} ${selected ? '선택 해제' : '선택'}`}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  key={item.id}
                  onPress={() => onToggle(item)}
                  style={({ pressed }) => [
                    styles.wordButton,
                    selected && styles.wordButtonSelected,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text style={styles.wordText}>{selected ? '✓ ' : ''}{item.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

interface CustomInputProps {
  kind: VocabularyKind;
  onAdd: (kind: VocabularyKind, label: string) => void;
}

function CustomInput({ kind, onAdd }: CustomInputProps) {
  const [value, setValue] = useState('');
  const noun = kind === 'emotion' ? '감정' : '욕구';
  const add = () => {
    const label = value.trim();
    if (!label) return;
    onAdd(kind, label);
    setValue('');
  };

  return (
    <View style={styles.customRow}>
      <TextInput
        accessibilityLabel={`내 ${noun} 직접 추가`}
        onChangeText={setValue}
        onSubmitEditing={add}
        placeholder={`목록에 없는 ${noun}`}
        returnKeyType="done"
        style={styles.customInput}
        value={value}
      />
      <Pressable
        accessibilityLabel={`${noun} 직접 추가하기`}
        accessibilityRole="button"
        disabled={!value.trim()}
        onPress={add}
        style={({ pressed }) => [styles.addButton, !value.trim() && styles.disabled, pressed && styles.buttonPressed]}
      >
        <Text style={styles.wordText}>추가</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  addButton: { alignItems: 'center', backgroundColor: '#F7F4EC', borderColor: colors.buttonShadow, borderWidth: borders.panel, justifyContent: 'center', minHeight: 48, minWidth: 64, paddingHorizontal: spacing.md },
  buttonPressed: { opacity: 0.7 },
  countBadge: { backgroundColor: '#FFFFFFCC', borderColor: colors.panelBorder, borderRadius: 14, borderWidth: borders.panel, color: colors.text, fontSize: typeScale.status, fontWeight: typography.statusWeight, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  customInput: { backgroundColor: colors.panel, borderColor: colors.panelBorder, borderWidth: borders.panel, color: colors.text, flex: 1, fontSize: typeScale.body, minHeight: 48, paddingHorizontal: spacing.md },
  customPanel: { backgroundColor: '#F3E8F7', borderColor: colors.windowBorder, borderRadius: 12, borderWidth: borders.panel, gap: spacing.sm, padding: spacing.md },
  customRow: { flexDirection: 'row', gap: spacing.sm },
  disabled: { opacity: 0.45 },
  emptyText: { color: colors.textMuted, fontSize: typeScale.body, paddingVertical: spacing.md },
  groupPanel: { borderColor: '#FFFFFFAA', borderRadius: 12, borderWidth: borders.panel, gap: spacing.sm, padding: spacing.md },
  groupTitle: { color: colors.text, fontSize: typeScale.body, fontWeight: typography.headingWeight },
  introCopy: { color: colors.textMuted, fontSize: typeScale.body, lineHeight: typeScale.bodyLineHeight },
  introPanel: { backgroundColor: '#EDF4FF', borderColor: colors.titleBar, borderRadius: 12, borderWidth: borders.panel, gap: spacing.sm, padding: spacing.md },
  introTitle: { color: colors.text, fontSize: typeScale.heading, fontWeight: typography.headingWeight },
  jumpButton: { backgroundColor: '#FFFFFFD9', borderColor: colors.titleBar, borderRadius: 16, borderWidth: borders.panel, flex: 1, minHeight: 44, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  jumpButtonText: { color: colors.text, fontSize: typeScale.status, fontWeight: typography.statusWeight, textAlign: 'center' },
  jumpRow: { flexDirection: 'row', gap: spacing.xs },
  map: { gap: spacing.lg },
  searchInput: { backgroundColor: colors.panel, borderColor: colors.titleBar, borderRadius: 8, borderWidth: borders.button, color: colors.text, fontSize: typeScale.body, minHeight: 50, paddingHorizontal: spacing.md },
  section: { borderColor: colors.windowBorder, borderRadius: 14, borderWidth: borders.panel, gap: spacing.md, padding: spacing.md },
  sectionDescription: { color: colors.textMuted, fontSize: typeScale.status, lineHeight: 21 },
  sectionHeadingCopy: { flex: 1, gap: spacing.xs },
  sectionHeadingRow: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' },
  sectionTitle: { color: colors.text, fontSize: typeScale.heading, fontWeight: typography.headingWeight, lineHeight: typeScale.headingLineHeight },
  unknownChoice: { backgroundColor: '#F7F4EC', borderColor: colors.panelBorder, borderRadius: 10, borderWidth: borders.panel, minHeight: 48, padding: spacing.md },
  unknownChoiceSelected: { backgroundColor: '#E6E0F4', borderColor: colors.titleBar, borderWidth: borders.button },
  unknownChoiceText: { color: colors.text, fontSize: typeScale.body, fontWeight: typography.statusWeight },
  wordButton: { backgroundColor: '#FFFFFFD9', borderColor: '#6C675E', borderRadius: 18, borderWidth: borders.panel, flexGrow: 1, minHeight: 44, minWidth: 92, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  wordButtonSelected: { backgroundColor: '#FFFDF6', borderColor: colors.titleBar, borderWidth: borders.button },
  wordList: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  wordText: { color: colors.text, fontSize: typeScale.status, fontWeight: typography.statusWeight, textAlign: 'center' },
});
