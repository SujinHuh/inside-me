import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type {
  DailyEntry,
  DateKey,
  DateKeyPolicy,
  EntryRepository,
} from '@/src/core/contracts';
import { StatePanel } from '@/src/ui/states/StatePanel';
import { borders, colors, spacing, typography, typeScale } from '@/src/ui/tokens';

interface EntryDetailScreenProps {
  repository: EntryRepository;
  dateKeyPolicy: DateKeyPolicy;
  dateKey: string;
  onEdit: (dateKey: DateKey) => void;
  onDeleted: (dateKey: DateKey) => void;
  onRequestExport: () => void;
}

type EntryLoadState =
  | { status: 'invalid-date' }
  | { status: 'loading'; dateKey: DateKey }
  | { status: 'ready'; dateKey: DateKey; entry: DailyEntry | null }
  | { status: 'error'; dateKey: DateKey; message: string };

type DeleteState = 'idle' | 'confirming' | 'deleting';

function formatDateTitle(dateKey: DateKey): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  return `${year}년 ${month}월 ${day}일`;
}

export function EntryDetailScreen({
  repository,
  dateKeyPolicy,
  dateKey: unparsedDateKey,
  onEdit,
  onDeleted,
  onRequestExport,
}: EntryDetailScreenProps) {
  const parsedDate = dateKeyPolicy.parseDateKey(unparsedDateKey);
  const [reloadSequence, setReloadSequence] = useState(0);
  const [loadState, setLoadState] = useState<EntryLoadState>(() =>
    parsedDate.ok
      ? { status: 'loading', dateKey: parsedDate.value }
      : { status: 'invalid-date' },
  );
  const [deleteState, setDeleteState] = useState<DeleteState>('idle');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const currentDate = dateKeyPolicy.parseDateKey(unparsedDateKey);
    if (!currentDate.ok) {
      setLoadState({ status: 'invalid-date' });
      return;
    }

    let active = true;
    setLoadState({ status: 'loading', dateKey: currentDate.value });
    setDeleteState('idle');
    setDeleteError(null);

    void repository.getByDate(currentDate.value).then((result) => {
      if (!active) return;
      setLoadState(
        result.ok
          ? { status: 'ready', dateKey: currentDate.value, entry: result.value }
          : {
              status: 'error',
              dateKey: currentDate.value,
              message: result.error.safeMessage,
            },
      );
    });

    return () => {
      active = false;
    };
  }, [dateKeyPolicy, reloadSequence, repository, unparsedDateKey]);

  const confirmDelete = useCallback(async () => {
    if (loadState.status !== 'ready' || !loadState.entry) return;

    const deletingDate = loadState.dateKey;
    setDeleteState('deleting');
    setDeleteError(null);
    const result = await repository.deleteByDate(deletingDate);

    if (!result.ok) {
      setDeleteState('idle');
      setDeleteError(result.error.safeMessage);
      return;
    }

    setDeleteState('idle');
    setLoadState({ status: 'ready', dateKey: deletingDate, entry: null });
    onDeleted(deletingDate);
  }, [loadState, onDeleted, repository]);

  if (loadState.status === 'invalid-date') {
    return (
      <StatePanel
        description="달력에서 날짜를 다시 선택해 주세요."
        kind="error"
        title="날짜를 확인할 수 없어요"
      />
    );
  }

  if (loadState.status === 'loading') {
    return (
      <StatePanel
        description={`${formatDateTitle(loadState.dateKey)} 기록을 불러오고 있어요.`}
        kind="loading"
        title="기록을 준비하고 있어요"
      />
    );
  }

  if (loadState.status === 'error') {
    return (
      <StatePanel
        actionLabel="다시 시도"
        description={loadState.message}
        kind="error"
        onAction={() => setReloadSequence((value) => value + 1)}
        title="기록을 불러오지 못했어요"
      />
    );
  }

  if (!loadState.entry) {
    return (
      <StatePanel
        description={`${formatDateTitle(loadState.dateKey)}에는 저장된 기록이 없어요.`}
        kind="empty"
        title="이 날짜에는 기록이 없어요"
      />
    );
  }

  const { entry } = loadState;
  const emotions = entry.exploration.finalConfirmed.emotions;
  const needs = entry.exploration.finalConfirmed.needs;

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <View style={styles.window}>
        <View style={styles.titleBar}>
          <Text accessibilityRole="header" style={styles.title}>
            날짜 기록
          </Text>
        </View>

        <View style={styles.content}>
          <Text accessibilityRole="header" style={styles.dateTitle}>
            {formatDateTitle(entry.dateKey)}
          </Text>

          <Section title="이야기">
            <Text style={styles.body}>{entry.story}</Text>
          </Section>

          <Section title="감정과 강도">
            {emotions.status === 'confirmed' ? (
              emotions.items.map((emotion) => (
                <View key={emotion.id} style={styles.listRow}>
                  <Text style={styles.listLabel}>{emotion.label}</Text>
                  <Text
                    accessibilityLabel={`${emotion.label}, 감정 강도 5점 중 ${emotion.intensity}점`}
                    style={styles.listValue}
                  >
                    강도 {emotion.intensity}/5
                    {emotion.id === emotions.representativeEmotionId ? ' · 대표 감정' : ''}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.mutedBody}>아직 확정한 감정이 없어요.</Text>
            )}
          </Section>

          <Section title="욕구">
            {needs.status === 'confirmed' ? (
              needs.items.map((need) => (
                <Text key={need.id} style={styles.body}>
                  • {need.label}
                </Text>
              ))
            ) : (
              <Text style={styles.mutedBody}>아직 확정한 욕구가 없어요.</Text>
            )}
          </Section>

          {entry.summary ? (
            <Section title="핵심 문장">
              <Text style={styles.body}>{entry.summary}</Text>
            </Section>
          ) : null}

          <View style={styles.actionGroup}>
            <ActionButton
              disabled={deleteState !== 'idle'}
              label="이 기록 수정"
              onPress={() => onEdit(entry.dateKey)}
            />
            <ActionButton
              disabled={deleteState !== 'idle'}
              label="전체 기록 내보내기"
              onPress={onRequestExport}
            />
            <ActionButton
              danger
              disabled={deleteState !== 'idle'}
              label="이 기록 삭제"
              onPress={() => {
                setDeleteError(null);
                setDeleteState('confirming');
              }}
            />
          </View>

          <View
            accessibilityLabel="개인정보 안내. 내보낸 파일에는 민감한 기록이 포함될 수 있으니 보관하거나 공유할 위치를 직접 확인해 주세요."
            style={styles.privacyNotice}
          >
            <Text style={styles.privacyText}>
              내보낸 파일에는 민감한 기록이 포함될 수 있어요. 보관·공유할 위치를 직접 확인해 주세요.
            </Text>
          </View>

          {deleteError ? (
            <View accessibilityLabel={`삭제하지 못했어요. ${deleteError}`} accessibilityRole="alert" style={styles.errorNotice}>
              <Text style={styles.errorText}>삭제하지 못했어요. {deleteError}</Text>
            </View>
          ) : null}

          {deleteState === 'confirming' ? (
            <View
              accessibilityLabel="이 기록을 삭제할까요? 삭제한 기록은 되돌릴 수 없어요."
              accessibilityRole="alert"
              style={styles.confirmPanel}
            >
              <Text style={styles.confirmTitle}>이 기록을 삭제할까요?</Text>
              <Text style={styles.body}>삭제한 기록은 되돌릴 수 없어요.</Text>
              <View style={styles.confirmActions}>
                <ActionButton label="삭제 취소" onPress={() => setDeleteState('idle')} />
                <ActionButton danger label="삭제 확인" onPress={() => void confirmDelete()} />
              </View>
            </View>
          ) : null}

          {deleteState === 'deleting' ? (
            <Text accessibilityLiveRegion="polite" style={styles.mutedBody}>
              기록을 삭제하고 있어요.
            </Text>
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        {title}
      </Text>
      <View style={styles.insetPanel}>{children}</View>
    </View>
  );
}

interface ActionButtonProps {
  label: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
}

function ActionButton({
  label,
  onPress,
  danger = false,
  disabled = false,
}: ActionButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        danger && styles.dangerButton,
        disabled && styles.disabledButton,
        pressed && styles.buttonPressed,
      ]}
    >
      <Text style={[styles.actionButtonText, danger && styles.dangerButtonText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.canvas,
    flexGrow: 1,
    padding: spacing.md,
  },
  window: {
    backgroundColor: colors.window,
    borderColor: colors.windowBorder,
    borderWidth: borders.window,
    width: '100%',
  },
  titleBar: {
    backgroundColor: colors.titleBar,
    borderBottomColor: colors.windowBorder,
    borderBottomWidth: borders.window,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  title: {
    color: colors.titleText,
    fontSize: typeScale.title,
    fontWeight: typography.titleWeight,
    letterSpacing: typography.titleLetterSpacing,
  },
  content: {
    gap: spacing.lg,
    padding: spacing.lg,
  },
  dateTitle: {
    color: colors.text,
    fontSize: typeScale.heading,
    fontWeight: typography.headingWeight,
    lineHeight: typeScale.headingLineHeight,
  },
  section: {
    gap: spacing.xs,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typeScale.title,
    fontWeight: typography.headingWeight,
  },
  insetPanel: {
    backgroundColor: colors.panel,
    borderBottomColor: colors.windowHighlight,
    borderLeftColor: colors.windowShadow,
    borderRightColor: colors.windowHighlight,
    borderTopColor: colors.windowShadow,
    borderWidth: borders.panel,
    gap: spacing.sm,
    padding: spacing.md,
  },
  body: {
    color: colors.text,
    fontSize: typeScale.body,
    lineHeight: typeScale.bodyLineHeight,
  },
  mutedBody: {
    color: colors.textMuted,
    fontSize: typeScale.body,
    lineHeight: typeScale.bodyLineHeight,
  },
  listRow: {
    alignItems: 'flex-start',
    borderBottomColor: colors.panelBorder,
    borderBottomWidth: borders.panel,
    gap: spacing.xs,
    paddingBottom: spacing.sm,
  },
  listLabel: {
    color: colors.text,
    fontSize: typeScale.body,
    fontWeight: typography.statusWeight,
  },
  listValue: {
    color: colors.textMuted,
    fontSize: typeScale.status,
  },
  actionGroup: {
    gap: spacing.sm,
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: colors.button,
    borderBottomColor: colors.buttonShadow,
    borderLeftColor: colors.buttonHighlight,
    borderRightColor: colors.buttonShadow,
    borderTopColor: colors.buttonHighlight,
    borderWidth: borders.button,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  dangerButton: {
    backgroundColor: '#e5d3cd',
  },
  actionButtonText: {
    color: colors.text,
    fontSize: typeScale.body,
    fontWeight: typography.statusWeight,
  },
  dangerButtonText: {
    color: '#632a1f',
  },
  disabledButton: {
    opacity: 0.55,
  },
  buttonPressed: {
    borderBottomColor: colors.buttonHighlight,
    borderLeftColor: colors.buttonShadow,
    borderRightColor: colors.buttonHighlight,
    borderTopColor: colors.buttonShadow,
    transform: [{ translateX: 1 }, { translateY: 1 }],
  },
  privacyNotice: {
    backgroundColor: colors.panel,
    borderColor: colors.panelBorder,
    borderWidth: borders.panel,
    padding: spacing.md,
  },
  privacyText: {
    color: colors.textMuted,
    fontSize: typeScale.status,
    lineHeight: typeScale.bodyLineHeight,
  },
  errorNotice: {
    borderColor: '#632a1f',
    borderWidth: borders.panel,
    padding: spacing.md,
  },
  errorText: {
    color: '#632a1f',
    fontSize: typeScale.status,
  },
  confirmPanel: {
    backgroundColor: colors.panel,
    borderColor: colors.windowBorder,
    borderWidth: borders.window,
    gap: spacing.md,
    padding: spacing.lg,
  },
  confirmTitle: {
    color: colors.text,
    fontSize: typeScale.title,
    fontWeight: typography.headingWeight,
  },
  confirmActions: {
    gap: spacing.sm,
  },
});
