import { StyleSheet, Text, View } from 'react-native';

import { borders, colors, spacing, typography, typeScale } from '@/src/ui/tokens';

export default function HomeScreen() {
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
          <Text style={styles.body}>글 기록과 감정·욕구 탐색을 위한 기반을 준비했어요.</Text>

          <View accessibilityLabel="Inside Me 준비 중" style={styles.statusPanel}>
            <Text style={styles.statusText}>● Inside Me 준비 중</Text>
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
});
