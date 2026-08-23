import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type {
  DailyEntry,
  DateKey,
  DateKeyPolicy,
  EntryRepository,
  MonthKey,
} from '@/src/core/contracts';
import { StatePanel } from '@/src/ui/states/StatePanel';
import { borders, colors, spacing, typography, typeScale } from '@/src/ui/tokens';

import {
  buildCalendarGrid,
  formatCalendarDayAccessibilityLabel,
  formatMonthTitle,
  moveMonth,
  representativeEmotionSummary,
} from './calendar-view-model';
import { RepresentativeEmotionFace } from './RepresentativeEmotionFace';

interface CalendarScreenProps {
  repository: EntryRepository;
  dateKeyPolicy: DateKeyPolicy;
  initialMonthKey: MonthKey;
  onOpenEntry: (dateKey: DateKey) => void;
}

type CalendarLoadState =
  | { status: 'loading' }
  | { status: 'ready'; entries: readonly DailyEntry[] }
  | { status: 'error'; message: string };

const weekdays = ['일', '월', '화', '수', '목', '금', '토'] as const;

export function CalendarScreen({
  repository,
  dateKeyPolicy,
  initialMonthKey,
  onOpenEntry,
}: CalendarScreenProps) {
  const [monthKey, setMonthKey] = useState(initialMonthKey);
  const [reloadSequence, setReloadSequence] = useState(0);
  const [loadState, setLoadState] = useState<CalendarLoadState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    setLoadState({ status: 'loading' });

    void repository.listByMonth(monthKey).then((result) => {
      if (!active) return;
      setLoadState(
        result.ok
          ? { status: 'ready', entries: result.value }
          : { status: 'error', message: result.error.safeMessage },
      );
    });

    return () => {
      active = false;
    };
  }, [monthKey, reloadSequence, repository]);

  const changeMonth = useCallback(
    (amount: -1 | 1) => {
      const nextMonth = moveMonth(monthKey, amount, dateKeyPolicy);
      if (nextMonth) setMonthKey(nextMonth);
    },
    [dateKeyPolicy, monthKey],
  );

  const cells = useMemo(
    () =>
      loadState.status === 'ready'
        ? buildCalendarGrid(monthKey, loadState.entries, dateKeyPolicy)
        : [],
    [dateKeyPolicy, loadState, monthKey],
  );

  if (loadState.status === 'loading') {
    return (
      <StatePanel
        description={`${formatMonthTitle(monthKey)} 기록을 불러오고 있어요.`}
        kind="loading"
        title="달력을 준비하고 있어요"
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
        title="달력을 불러오지 못했어요"
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <View style={styles.window}>
        <View style={styles.titleBar}>
          <Text accessibilityRole="header" style={styles.title}>
            감정 달력
          </Text>
        </View>

        <View style={styles.content}>
          <View style={styles.monthNavigation}>
            <Pressable
              accessibilityLabel="이전 달"
              accessibilityRole="button"
              onPress={() => changeMonth(-1)}
              style={({ pressed }) => [styles.navigationButton, pressed && styles.buttonPressed]}
            >
              <Text style={styles.navigationButtonText}>‹</Text>
            </Pressable>
            <Text accessibilityRole="header" style={styles.monthTitle}>
              {formatMonthTitle(monthKey)}
            </Text>
            <Pressable
              accessibilityLabel="다음 달"
              accessibilityRole="button"
              onPress={() => changeMonth(1)}
              style={({ pressed }) => [styles.navigationButton, pressed && styles.buttonPressed]}
            >
              <Text style={styles.navigationButtonText}>›</Text>
            </Pressable>
          </View>

          {loadState.entries.length === 0 ? (
            <View accessibilityLabel="이 달에는 아직 기록이 없어요. 빈 날짜도 괜찮아요." style={styles.emptyNotice}>
              <Text style={styles.emptyNoticeText}>이 달에는 아직 기록이 없어요. 빈 날짜도 괜찮아요.</Text>
            </View>
          ) : null}

          <View accessibilityRole="summary" style={styles.calendarGrid}>
            {weekdays.map((weekday) => (
              <View key={weekday} style={styles.cellOuter}>
                <Text style={styles.weekday}>{weekday}</Text>
              </View>
            ))}

            {cells.map((cell) => {
              if (cell.kind === 'blank') {
                return <View key={cell.id} style={styles.cellOuter} />;
              }

              const { entry } = cell.value;
              const representative = entry ? representativeEmotionSummary(entry) : null;
              return (
                <View key={cell.value.dateKey} style={styles.cellOuter}>
                  <Pressable
                    accessibilityLabel={formatCalendarDayAccessibilityLabel(cell.value)}
                    accessibilityRole="button"
                    disabled={!entry}
                    onPress={() => entry && onOpenEntry(cell.value.dateKey)}
                    style={({ pressed }) => [
                      styles.dayCell,
                      entry ? styles.dayCellWithEntry : styles.dayCellWithoutEntry,
                      pressed && styles.buttonPressed,
                    ]}
                    testID={`calendar-day-${cell.value.dateKey}`}
                  >
                    <Text style={styles.dayNumber}>{cell.value.day}</Text>
                    {representative ? (
                      <>
                        <RepresentativeEmotionFace
                          emotionId={representative.id}
                          testID={`representative-face-${cell.value.dateKey}`}
                        />
                        <Text numberOfLines={2} style={styles.emotionLabel}>
                          {representative.label}
                        </Text>
                        {representative.additionalEmotionCount > 0 ? (
                          <Text style={styles.additionalLabel}>
                            +{representative.additionalEmotionCount}
                          </Text>
                        ) : null}
                      </>
                    ) : entry ? (
                      <Text style={styles.unconfirmedLabel}>감정 미확정</Text>
                    ) : (
                      <Text accessibilityElementsHidden style={styles.noEntryMarker}>
                        ·
                      </Text>
                    )}
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </ScrollView>
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
    gap: spacing.md,
    padding: spacing.sm,
  },
  monthNavigation: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  monthTitle: {
    color: colors.text,
    fontSize: typeScale.heading,
    fontWeight: typography.headingWeight,
  },
  navigationButton: {
    alignItems: 'center',
    backgroundColor: colors.button,
    borderBottomColor: colors.buttonShadow,
    borderLeftColor: colors.buttonHighlight,
    borderRightColor: colors.buttonShadow,
    borderTopColor: colors.buttonHighlight,
    borderWidth: borders.button,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  navigationButtonText: {
    color: colors.text,
    fontSize: typeScale.heading,
    fontWeight: typography.headingWeight,
  },
  buttonPressed: {
    borderBottomColor: colors.buttonHighlight,
    borderLeftColor: colors.buttonShadow,
    borderRightColor: colors.buttonHighlight,
    borderTopColor: colors.buttonShadow,
    transform: [{ translateX: 1 }, { translateY: 1 }],
  },
  emptyNotice: {
    backgroundColor: colors.panel,
    borderColor: colors.panelBorder,
    borderWidth: borders.panel,
    padding: spacing.md,
  },
  emptyNoticeText: {
    color: colors.textMuted,
    fontSize: typeScale.status,
    lineHeight: typeScale.bodyLineHeight,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cellOuter: {
    padding: 2,
    width: '14.2857%',
  },
  weekday: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: typography.statusWeight,
    paddingVertical: spacing.xs,
    textAlign: 'center',
  },
  dayCell: {
    alignItems: 'center',
    borderWidth: borders.panel,
    minHeight: 94,
    paddingHorizontal: 2,
    paddingVertical: spacing.xs,
  },
  dayCellWithEntry: {
    backgroundColor: colors.panel,
    borderBottomColor: colors.windowShadow,
    borderLeftColor: colors.windowHighlight,
    borderRightColor: colors.windowShadow,
    borderTopColor: colors.windowHighlight,
  },
  dayCellWithoutEntry: {
    backgroundColor: colors.window,
    borderColor: colors.panelBorder,
  },
  dayNumber: {
    color: colors.text,
    fontSize: 13,
    fontWeight: typography.statusWeight,
  },
  emotionLabel: {
    color: colors.text,
    fontSize: 10,
    lineHeight: 12,
    marginTop: 2,
    maxWidth: '100%',
    textAlign: 'center',
  },
  additionalLabel: {
    color: colors.titleBar,
    fontSize: 11,
    fontWeight: typography.statusWeight,
  },
  unconfirmedLabel: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  noEntryMarker: {
    color: colors.panelBorder,
    fontSize: typeScale.heading,
    marginTop: spacing.sm,
  },
});
