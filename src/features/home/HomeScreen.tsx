import { Pressable, StyleSheet, Text, View } from 'react-native';

import { borders, colors, spacing, typography, typeScale } from '@/src/ui/tokens';

interface HomeScreenProps {
  onStartTextEntry?: () => void;
  onOpenCalendar?: () => void;
  persistentEntriesAvailable?: boolean;
}

export function HomeScreen({
  onStartTextEntry,
  onOpenCalendar,
  persistentEntriesAvailable = false,
}: HomeScreenProps) {
  return (
    <View style={styles.screen}>
      <View style={styles.window}>
        <View style={styles.titleBar}>
          <Text accessibilityRole="header" style={styles.title}>
            Inside Me
          </Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.heading}>나의 마음을 천천히 살펴봐요.</Text>
          <Text style={styles.body}>오늘 있었던 일을 적고, 내가 느낀 감정과 중요했던 욕구를 천천히 살펴보세요.</Text>

          <Pressable
            accessibilityHint="자유 글 작성 화면으로 이동합니다."
            accessibilityRole="button"
            disabled={!onStartTextEntry}
            onPress={onStartTextEntry}
            style={({ pressed }) => [
              styles.startButton,
              pressed && styles.startButtonPressed,
              !onStartTextEntry && styles.startButtonDisabled,
            ]}
          >
            <Text style={styles.startButtonText}>글로 기록하기</Text>
          </Pressable>

          <Pressable
            accessibilityHint="저장한 기록을 월별로 보는 화면으로 이동합니다."
            accessibilityRole="button"
            disabled={!onOpenCalendar}
            onPress={onOpenCalendar}
            style={({ pressed }) => [
              styles.startButton,
              pressed && styles.startButtonPressed,
              !onOpenCalendar && styles.startButtonDisabled,
            ]}
          >
            <Text style={styles.startButtonText}>감정 달력 보기</Text>
          </Pressable>

          <View
            accessibilityLabel={
              persistentEntriesAvailable
                ? '기록은 이 기기에 저장됩니다'
                : '웹 미리보기에서는 기록을 저장할 수 없습니다. Android Expo Go에서 확인해 주세요.'
            }
            style={styles.statusPanel}
          >
            <Text style={styles.statusText}>
              {persistentEntriesAvailable
                ? '● 기록은 이 기기에 저장돼요'
                : '● 웹 미리보기에서는 저장할 수 없어요'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    backgroundColor: colors.canvas,
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  window: {
    backgroundColor: colors.window,
    borderColor: colors.windowBorder,
    borderWidth: borders.window,
    maxWidth: 480,
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
    padding: spacing.xxl,
  },
  heading: {
    color: colors.text,
    fontSize: typeScale.heading,
    fontWeight: typography.headingWeight,
    lineHeight: typeScale.headingLineHeight,
  },
  body: {
    color: colors.textMuted,
    fontSize: typeScale.body,
    lineHeight: typeScale.bodyLineHeight,
  },
  statusPanel: {
    backgroundColor: colors.panel,
    borderColor: colors.panelBorder,
    borderWidth: borders.panel,
    marginTop: spacing.xs,
    padding: spacing.md,
  },
  statusText: {
    color: colors.status,
    fontSize: typeScale.status,
    fontWeight: typography.statusWeight,
  },
  startButton: {
    backgroundColor: colors.button,
    borderBottomColor: colors.buttonShadow,
    borderLeftColor: colors.buttonHighlight,
    borderRightColor: colors.buttonShadow,
    borderTopColor: colors.buttonHighlight,
    borderWidth: borders.button,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  startButtonDisabled: {
    opacity: 0.55,
  },
  startButtonPressed: {
    borderBottomColor: colors.buttonHighlight,
    borderLeftColor: colors.buttonShadow,
    borderRightColor: colors.buttonHighlight,
    borderTopColor: colors.buttonShadow,
  },
  startButtonText: {
    color: colors.text,
    fontSize: typeScale.body,
    fontWeight: typography.statusWeight,
    textAlign: 'center',
  },
});
