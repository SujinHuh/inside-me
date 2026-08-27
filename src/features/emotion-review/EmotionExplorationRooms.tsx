import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { EmotionNeedVocabulary, VocabularyItem, VocabularyKind } from '@/src/core/contracts';
import {
  createInitialEmotionExplorationState,
  getEmotionExplorationView,
  transitionEmotionExploration,
  type EmotionExplorationAction,
  type EmotionExplorationRoomId,
  type EmotionExplorationSection,
  type EmotionExplorationState,
  type EmotionExplorationView,
} from '@/src/core/emotion-exploration/emotion-exploration';
import { borders, colors, spacing, typography, typeScale } from '@/src/ui/tokens';

interface EmotionExplorationRoomsProps {
  vocabulary: EmotionNeedVocabulary;
  selectedEmotionIds: ReadonlySet<string>;
  selectedNeedIds: ReadonlySet<string>;
  selectedLabels: readonly string[];
  onToggle: (item: VocabularyItem) => void;
  onAdd: (kind: VocabularyKind, label: string) => void;
  onResetSelections: () => void;
  emotionUnknown: boolean;
  onToggleEmotionUnknown: () => void;
}

const roomPresentation: Record<EmotionExplorationRoomId, {
  backgroundColor: string;
  eyebrow: string;
  preview: string;
}> = {
  fulfilled: {
    backgroundColor: '#DDEAF6',
    eyebrow: '마음이 채워졌을 때',
    preview: '기쁨과 즐거움 · 편안함과 평온 · 자신감과 활력',
  },
  unfulfilled: {
    backgroundColor: '#F8D9CA',
    eyebrow: '마음이 채워지지 않았을 때',
    preview: '걱정과 불안 · 두려움 · 긴장 · 슬픔 · 외로움 · 피로 · 혼란 · 화',
  },
  needs: {
    backgroundColor: '#DCEEE5',
    eyebrow: '내게 중요했던 것',
    preview: '',
  },
};

const groupPalette: Record<EmotionExplorationRoomId, readonly string[]> = {
  fulfilled: ['#F8E8A9', '#DDEFC8', '#D6E8F6'],
  unfulfilled: ['#F5D4C7', '#E8DCF4', '#DCE8F5', '#E9E1CF'],
  needs: ['#D7ECE3', '#DCEAF5', '#ECE0F3', '#F3E7BF'],
};

export function EmotionExplorationRooms({
  vocabulary,
  selectedEmotionIds,
  selectedNeedIds,
  selectedLabels,
  onToggle,
  onAdd,
  onResetSelections,
  emotionUnknown,
  onToggleEmotionUnknown,
}: EmotionExplorationRoomsProps) {
  const [navigationState, setNavigationState] = useState<EmotionExplorationState>(
    createInitialEmotionExplorationState,
  );
  const selectedItemIds = useMemo(
    () => [...selectedEmotionIds, ...selectedNeedIds],
    [selectedEmotionIds, selectedNeedIds],
  );
  const state = useMemo(
    () => ({ ...navigationState, selectedItemIds }),
    [navigationState, selectedItemIds],
  );
  const view = useMemo(() => getEmotionExplorationView(state, vocabulary), [state, vocabulary]);

  const dispatch = (action: EmotionExplorationAction) => {
    setNavigationState((current) => {
      const next = transitionEmotionExploration({ ...current, selectedItemIds }, action, vocabulary);
      return { ...next, selectedItemIds: [] };
    });
  };

  const reset = () => {
    onResetSelections();
    setNavigationState(createInitialEmotionExplorationState());
  };

  const canGoBack = Boolean(navigationState.roomId || navigationState.groupId
    || navigationState.query.trim() || navigationState.isAllItemsOpen);

  const guidePanel = (
    <View accessibilityLabel="추가 탐색 도구" style={styles.guidePanel}>
      <TextInput
        accessibilityLabel="감정과 욕구 전체 검색"
        onChangeText={(query) => dispatch({ type: 'set-query', query })}
        placeholder="271개 감정과 욕구에서 검색"
        returnKeyType="search"
        style={styles.searchInput}
        value={navigationState.query}
      />
      <View style={styles.toolRow}>
        {canGoBack && <SoftButton label="한 단계 뒤로" onPress={() => dispatch({ type: 'back' })} />}
        <SoftButton label="전체 목록 보기" onPress={() => dispatch({ type: 'open-all-items' })} />
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
  );
  const selectionSummary = (
    <SelectionSummary count={selectedItemIds.length} labels={selectedLabels} onReset={reset} />
  );
  const explorationContent = (
    <ExplorationContent
      onDispatch={dispatch}
      onToggle={onToggle}
      selectedItemIds={new Set(selectedItemIds)}
      view={view}
    />
  );

  return (
    <View accessibilityLabel="세 개의 마음 방" style={styles.explorer}>
      {view.mode === 'rooms' ? (
        <>
          {explorationContent}
          {selectionSummary}
          {guidePanel}
        </>
      ) : (
        <>
          {guidePanel}
          {selectionSummary}
          {explorationContent}
        </>
      )}

      <View style={styles.customPanel}>
        <Text style={styles.customTitle}>목록에 없는 내 표현</Text>
        <Text style={styles.customDescription}>내가 쓰는 말이 더 정확하다면 직접 남겨도 괜찮아요.</Text>
        <CustomInput kind="emotion" onAdd={onAdd} />
        <CustomInput kind="need" onAdd={onAdd} />
      </View>
    </View>
  );
}

interface ExplorationContentProps {
  view: EmotionExplorationView;
  selectedItemIds: ReadonlySet<string>;
  onDispatch: (action: EmotionExplorationAction) => void;
  onToggle: (item: VocabularyItem) => void;
}

function ExplorationContent({ view, selectedItemIds, onDispatch, onToggle }: ExplorationContentProps) {
  switch (view.mode) {
    case 'rooms':
      return (
        <View accessibilityLabel="마음 방 선택" style={styles.roomList}>
          {view.rooms.map((room) => (
            <RoomCard key={room.id} onPress={() => onDispatch({ type: 'enter-room', roomId: room.id })} room={room} />
          ))}
        </View>
      );
    case 'groups':
      return (
        <View accessibilityLabel={`${view.room.label}의 표현 묶음`} style={styles.roomInterior}>
          <RoomHeading roomId={view.room.id} title={view.room.label} />
          <Text style={styles.roomInstruction}>지금 마음에 가까운 묶음을 하나 열어보세요.</Text>
          <View style={styles.groupGrid}>
            {view.groups.map((group, index) => (
              <Pressable
                accessibilityLabel={`${group.label} 묶음 열기, ${group.itemCount}개`}
                accessibilityRole="button"
                key={group.id}
                onPress={() => onDispatch({ type: 'enter-group', groupId: group.id })}
                style={({ pressed }) => [
                  styles.groupCard,
                  { backgroundColor: groupPalette[view.room.id][index % groupPalette[view.room.id].length] },
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.groupLabel}>{group.label}</Text>
                <Text style={styles.groupCount}>{group.itemCount}개 표현</Text>
              </Pressable>
            ))}
          </View>
        </View>
      );
    case 'items':
      return (
        <View accessibilityLabel={`${view.group.label} 표현 선택`} style={styles.roomInterior}>
          <RoomHeading roomId={view.room.id} title={view.group.label} />
          <Text style={styles.roomInstruction}>읽다가 마음이 머무는 표현을 여러 개 골라도 괜찮아요.</Text>
          <WordCloud items={view.items} onToggle={onToggle} selectedItemIds={selectedItemIds} />
        </View>
      );
    case 'search':
      return (
        <View accessibilityLabel="전체 검색 결과" style={styles.searchResults}>
          <Text accessibilityRole="header" style={styles.contentTitle}>전체에서 찾은 표현</Text>
          <Text accessibilityLiveRegion="polite" style={styles.resultCount}>
            “{view.query.trim()}” 검색 결과 {view.items.length}개
          </Text>
          {view.items.length > 0
            ? <WordCloud items={view.items} onToggle={onToggle} selectedItemIds={selectedItemIds} />
            : <Text style={styles.emptyText}>가까운 표현을 찾지 못했어요. 다른 말로 검색하거나 직접 추가해 보세요.</Text>}
        </View>
      );
    case 'all-items':
      return (
        <View accessibilityLabel="전체 감정과 욕구 목록" style={styles.allItemsPanel}>
          <Text accessibilityRole="header" style={styles.contentTitle}>전체 감정과 욕구</Text>
          <Text style={styles.roomInstruction}>세 방과 19개 묶음 순서로 271개 표현을 모두 볼 수 있어요.</Text>
          {view.sections.map((section) => (
            <AllItemsSection
              key={`${section.room.id}-${section.group.id}`}
              onToggle={onToggle}
              section={section}
              selectedItemIds={selectedItemIds}
            />
          ))}
        </View>
      );
  }
}

function RoomCard({ room, onPress }: {
  room: Extract<EmotionExplorationView, { mode: 'rooms' }>['rooms'][number];
  onPress: () => void;
}) {
  const presentation = roomPresentation[room.id];
  const preview = room.previewLabels.length > 0 ? room.previewLabels.join(' · ') : presentation.preview;
  const accessibilityLabel = room.id === 'needs'
    ? `${room.label} 방 열기, ${room.itemCount}개 표현, 욕구 8개 영역: ${preview}`
    : `${room.label} 방 열기, ${room.itemCount}개 표현`;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.roomCard, { backgroundColor: presentation.backgroundColor }, pressed && styles.roomCardPressed]}
    >
      <View style={styles.roomTitleRow}>
        <Text style={styles.roomTitle}>{room.label}</Text>
        <Text style={styles.roomCount}>{room.itemCount}</Text>
      </View>
      <Text style={styles.roomEyebrow}>{presentation.eyebrow}</Text>
      <Text numberOfLines={room.id === 'needs' ? undefined : 2} style={styles.roomPreview}>{preview}</Text>
    </Pressable>
  );
}

function RoomHeading({ roomId, title }: { roomId: EmotionExplorationRoomId; title: string }) {
  return (
    <View style={[styles.roomHeading, { backgroundColor: roomPresentation[roomId].backgroundColor }]}>
      <Text style={styles.roomHeadingEyebrow}>{roomPresentation[roomId].eyebrow}</Text>
      <Text accessibilityRole="header" style={styles.contentTitle}>{title}</Text>
    </View>
  );
}

function WordCloud({ items, selectedItemIds, onToggle }: {
  items: readonly VocabularyItem[];
  selectedItemIds: ReadonlySet<string>;
  onToggle: (item: VocabularyItem) => void;
}) {
  return (
    <View style={styles.wordCloud}>
      {items.map((item, index) => {
        const selected = selectedItemIds.has(item.id);
        const shapeStyle = index % 3 === 0 ? styles.wordWide : index % 3 === 1 ? styles.wordRound : undefined;
        return (
          <Pressable
            accessibilityLabel={`${item.label} ${selected ? '선택 해제' : '선택'}`}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
            key={item.id}
            onPress={() => onToggle(item)}
            style={({ pressed }) => [styles.wordButton, shapeStyle, selected && styles.wordButtonSelected, pressed && styles.pressed]}
          >
            <Text style={[styles.wordText, selected && styles.wordTextSelected]}>
              {selected ? '✓ ' : ''}{item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function AllItemsSection({ section, selectedItemIds, onToggle }: {
  section: EmotionExplorationSection;
  selectedItemIds: ReadonlySet<string>;
  onToggle: (item: VocabularyItem) => void;
}) {
  return (
    <View accessibilityLabel={`${section.room.label}, ${section.group.label}`} style={styles.allItemsSection}>
      <Text style={styles.allItemsRoom}>{section.room.label}</Text>
      <Text style={styles.allItemsGroup}>{section.group.label} · {section.items.length}개</Text>
      <WordCloud items={section.items} onToggle={onToggle} selectedItemIds={selectedItemIds} />
    </View>
  );
}

function SelectionSummary({ count, labels, onReset }: { count: number; labels: readonly string[]; onReset: () => void }) {
  if (count === 0) return null;
  return (
    <View accessibilityLabel={`선택한 표현 ${count}개`} style={styles.selectionSummary}>
      <View style={styles.selectionHeading}>
        <Text accessibilityLiveRegion="polite" style={styles.selectionTitle}>지금 고른 표현 {count}개</Text>
        <Pressable accessibilityLabel="탐색과 선택 모두 초기화" accessibilityRole="button" onPress={onReset} style={({ pressed }) => [styles.resetButton, pressed && styles.pressed]}>
          <Text style={styles.resetText}>전체 초기화</Text>
        </Pressable>
      </View>
      <Text numberOfLines={3} style={styles.selectionLabels}>{labels.join(' · ')}</Text>
    </View>
  );
}

function SoftButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.softButton, pressed && styles.pressed]}>
      <Text style={styles.softButtonText}>{label}</Text>
    </Pressable>
  );
}

function CustomInput({ kind, onAdd }: { kind: VocabularyKind; onAdd: (kind: VocabularyKind, label: string) => void }) {
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
      <TextInput accessibilityLabel={`내 ${noun} 직접 추가`} onChangeText={setValue} onSubmitEditing={add} placeholder={`목록에 없는 ${noun}`} returnKeyType="done" style={styles.customInput} value={value} />
      <Pressable accessibilityLabel={`${noun} 직접 추가하기`} accessibilityRole="button" disabled={!value.trim()} onPress={add} style={({ pressed }) => [styles.addButton, !value.trim() && styles.disabled, pressed && styles.pressed]}>
        <Text style={styles.addButtonText}>추가</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  addButton: { alignItems: 'center', backgroundColor: '#F8F4EA', borderColor: '#8D887C', borderRadius: 14, borderWidth: borders.panel, justifyContent: 'center', minHeight: 48, minWidth: 64, paddingHorizontal: spacing.md },
  addButtonText: { color: colors.text, fontSize: typeScale.status, fontWeight: typography.statusWeight },
  allItemsGroup: { color: colors.text, fontSize: typeScale.body, fontWeight: typography.headingWeight },
  allItemsPanel: { gap: spacing.md },
  allItemsRoom: { color: colors.textMuted, fontSize: typeScale.status, fontWeight: typography.statusWeight },
  allItemsSection: { backgroundColor: '#FFFDF8', borderColor: '#D8D0C1', borderRadius: 18, borderWidth: borders.panel, gap: spacing.sm, padding: spacing.md },
  contentTitle: { color: colors.text, fontSize: typeScale.heading, fontWeight: typography.headingWeight, lineHeight: typeScale.headingLineHeight },
  customDescription: { color: colors.textMuted, fontSize: typeScale.status, lineHeight: 21 },
  customInput: { backgroundColor: '#FFFEFA', borderColor: '#AAA396', borderRadius: 14, borderWidth: borders.panel, color: colors.text, flex: 1, fontSize: typeScale.body, minHeight: 48, paddingHorizontal: spacing.md },
  customPanel: { backgroundColor: '#EFE6F2', borderColor: '#D4C7D8', borderRadius: 20, borderWidth: borders.panel, gap: spacing.sm, padding: spacing.md },
  customRow: { flexDirection: 'row', gap: spacing.sm },
  customTitle: { color: colors.text, fontSize: typeScale.body, fontWeight: typography.headingWeight },
  disabled: { opacity: 0.45 },
  emptyText: { color: colors.textMuted, fontSize: typeScale.body, lineHeight: typeScale.bodyLineHeight, paddingVertical: spacing.xl },
  explorer: { gap: spacing.lg },
  groupCard: { borderColor: '#FFFFFFAA', borderRadius: 22, borderWidth: borders.panel, flexBasis: '47%', flexGrow: 1, gap: spacing.xs, justifyContent: 'space-between', minHeight: 92, minWidth: 130, padding: spacing.md },
  groupCount: { color: colors.textMuted, fontSize: typeScale.status },
  groupGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  groupLabel: { color: colors.text, fontSize: typeScale.body, fontWeight: typography.headingWeight, lineHeight: 22 },
  guidePanel: { backgroundColor: '#F9F2E6', borderColor: '#D7CCBA', borderRadius: 22, borderWidth: borders.panel, gap: spacing.sm, padding: spacing.md },
  pressed: { opacity: 0.7, transform: [{ translateY: 1 }] },
  resetButton: { alignItems: 'center', backgroundColor: '#FFFDF8', borderColor: '#A39C90', borderRadius: 12, borderWidth: borders.panel, justifyContent: 'center', minHeight: 48, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  resetText: { color: colors.textMuted, fontSize: typeScale.status, fontWeight: typography.statusWeight },
  resultCount: { color: colors.textMuted, fontSize: typeScale.body },
  roomCard: { borderColor: '#FFFFFFAA', borderRadius: 30, borderWidth: borders.panel, gap: spacing.xs, minHeight: 96, padding: spacing.md, shadowColor: '#594F43', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.10, shadowRadius: 7 },
  roomCardPressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  roomCount: { color: colors.textMuted, fontSize: typeScale.status, fontWeight: typography.statusWeight },
  roomEyebrow: { color: colors.textMuted, fontSize: typeScale.status, fontWeight: typography.statusWeight },
  roomHeading: { borderRadius: 18, gap: spacing.xs, padding: spacing.md },
  roomHeadingEyebrow: { color: colors.textMuted, fontSize: typeScale.status },
  roomInterior: { gap: spacing.md },
  roomInstruction: { color: colors.textMuted, fontSize: typeScale.body, lineHeight: typeScale.bodyLineHeight },
  roomList: { gap: spacing.md },
  roomPreview: { color: colors.textMuted, fontSize: typeScale.status, lineHeight: 22 },
  roomTitle: { color: colors.text, fontSize: typeScale.heading, fontWeight: typography.headingWeight },
  roomTitleRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  searchInput: { backgroundColor: '#FFFEFA', borderColor: '#9F9789', borderRadius: 16, borderWidth: borders.panel, color: colors.text, fontSize: typeScale.body, minHeight: 50, paddingHorizontal: spacing.md },
  searchResults: { gap: spacing.md },
  selectionHeading: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' },
  selectionLabels: { color: colors.text, fontSize: typeScale.status, lineHeight: 21 },
  selectionSummary: { backgroundColor: '#FFF8CF', borderColor: '#E1D38B', borderRadius: 18, borderWidth: borders.panel, gap: spacing.xs, padding: spacing.md },
  selectionTitle: { color: colors.text, fontSize: typeScale.body, fontWeight: typography.headingWeight },
  softButton: { alignItems: 'center', backgroundColor: '#FFFEFA', borderColor: '#A69E91', borderRadius: 14, borderWidth: borders.panel, flexGrow: 1, justifyContent: 'center', minHeight: 48, paddingHorizontal: spacing.sm },
  softButtonText: { color: colors.text, fontSize: typeScale.status, fontWeight: typography.statusWeight },
  toolRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  unknownChoice: { backgroundColor: '#FFFEFA', borderColor: '#B0A89B', borderRadius: 16, borderWidth: borders.panel, minHeight: 48, padding: spacing.md },
  unknownChoiceSelected: { backgroundColor: '#E8E0F1', borderColor: colors.titleBar, borderWidth: borders.button },
  unknownChoiceText: { color: colors.text, fontSize: typeScale.body, fontWeight: typography.statusWeight },
  wordButton: { alignItems: 'center', backgroundColor: '#FFFDF8', borderColor: '#B2AA9D', borderRadius: 19, borderWidth: borders.panel, justifyContent: 'center', minHeight: 48, minWidth: 88, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  wordButtonSelected: { backgroundColor: '#F7E89E', borderColor: colors.titleBar, borderWidth: borders.button },
  wordCloud: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  wordRound: { borderRadius: 25, minHeight: 52 },
  wordText: { color: colors.text, fontSize: typeScale.status, fontWeight: typography.statusWeight, textAlign: 'center' },
  wordTextSelected: { color: '#1D3153' },
  wordWide: { minWidth: 118 },
});
